import { waitForActionCompletion, hasActiveAction, ensurePageStability, parseTaskRequirements } from "../../wizardry/operation";
import { AIResponseResult } from "../../wizardry/ai/surfgraph/parseResponse";
import { determineNextAction, determineNextActionStreaming, StreamingCallbacks } from "../../wizardry/ai/gateway";
import { getSimplifiedDom } from "../../wizardry/extraction/annotateDom";
import { formatPrompt } from "../../wizardry/ai/surfgraph/formatPrompt";
import { callDOMAction } from "../../wizardry/operation";

// ═══════════════════════════════════════════════════════════════════════════
// § TYPES
// ═══════════════════════════════════════════════════════════════════════════
export type TaskHistoryEntry = { prompt: string; context?: string; content: string; role: "user" | "ai" | "error"; action: { name: string; args: Record<string, string | number | string[] | boolean> } | null; usage: any; timestamp: string; streamingMessageId?: string; elementInfo?: string };
export interface TaskProgress { total: number; completed: number; type: string; validationRules?: { successIndicators: string[]; failureIndicators: string[]; pendingIndicators: string[] } }
export interface TaskState { tabId: number; status: "idle" | "running" | "completed" | "failed" | "error" | "success"; actionStatus: "idle" | "initializing" | "pulling-dom" | "performing-query" | "performing-action"; taskProgress: TaskProgress; taskTiming: { startTime: number | null; endTime: number | null; elapsedTime: number }; currentChatId: string | null; history: TaskHistoryEntry[] }
export interface TaskExecutorConfig { instructions: string; tabId?: number; chatId: string | null; streamingEnabled: boolean; selectedModel?: any }

// ═══════════════════════════════════════════════════════════════════════════
// § HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
export const createTaskError = (msg: string): Error => new Error(msg);
export const createHistoryEntry = (content: string, actionName: string, args: Record<string, any>): TaskHistoryEntry => ({ prompt: "", content, role: "error", action: { name: actionName, args }, usage: null, timestamp: new Date().toISOString() });
export const executeAction = async (action: Extract<AIResponseResult, { thought: string }>): Promise<{ success: boolean; message?: string; error?: string }> => {
  const { name, args } = action.parsedAction;
  if (["finish"].includes(name)) return { success: true, message: (args as any).message || "" };
  if (["click", "setValue", "navigate", "waiting"].includes(name)) return await callDOMAction(name as any, args as any);
  return { success: false, error: `Unknown action: ${name}` };
};
export const parseAIResponseTags = (content: string): { thought: string | null; action: string | null; memory: string | null } => {
  const thoughtMatch = content.match(/<thought>([\s\S]*?)<\/thought>/i);
  const actionMatch = content.match(/<action>([\s\S]*?)<\/action>/i);
  const memoryMatch = content.match(/<memory>([\s\S]*?)<\/memory>/i);
  return { thought: thoughtMatch ? thoughtMatch[1].trim() : null, action: actionMatch ? actionMatch[1].trim() : null, memory: memoryMatch ? memoryMatch[1].trim() : null };
};
export const extractElementIdFromParsedAction = (parsedAction: { name: string; args: Record<string, any> }): number | null => {
  if (parsedAction.args.elementId !== undefined) {
    const elementId = parsedAction.args.elementId;
    return typeof elementId === 'number' ? elementId : parseInt(String(elementId), 10);
  }
  return null;
};
export const findElementInPageContents = (elementId: number, pageContents: string): string | null => {
  const regex = new RegExp(`${elementId}<[^>]+>.*?</[^>]+>`, 'i');
  const match = pageContents.match(regex);
  if (match) return match[0];
  const selfClosingRegex = new RegExp(`${elementId}<[^>]+/>`, 'i');
  const selfClosingMatch = pageContents.match(selfClosingRegex);
  if (selfClosingMatch) return selfClosingMatch[0];
  return null;
};
export const convertHistoryToPreviousActions = (historyEntries: TaskHistoryEntry[]): Array<{ thought: string; action: string; memory: string; parsedAction: any }> => {
  return historyEntries.filter((entry: any) => entry.content && entry.action && entry.role === "ai").map((entry: any) => {
    const { thought, action, memory } = parseAIResponseTags(entry.content);
    if (thought && action && entry.action) return { thought, action, memory: memory || "n/a", parsedAction: entry.action };
    return null;
  }).filter((action): action is { thought: string; action: string; memory: string; parsedAction: any } => action !== null);
};
export const setTaskRunningState = async (isRunning: boolean, targetTabId?: number): Promise<void> => {
  await chrome.storage.local.set({ taskRunning: isRunning, taskTabId: isRunning ? targetTabId : null });
  if (targetTabId) { try { await chrome.tabs.sendMessage(targetTabId, { type: isRunning ? "TASK_STARTED" : "TASK_STOPPED" }); } catch {} }
};
export const validateAction = (actionType: string, result: any, validationRules?: { successIndicators: string[]; failureIndicators: string[]; pendingIndicators: string[] }): "success" | "pending" | "failure" => {
  if (!validationRules) return "success";
  const resultStr = JSON.stringify(result).toLowerCase();
  if (validationRules.successIndicators.some(indicator => resultStr.includes(indicator.toLowerCase()))) return "success";
  if (validationRules.failureIndicators.some(indicator => resultStr.includes(indicator.toLowerCase()))) return "failure";
  return "pending";
};
export const broadcastStateUpdate = (taskState: any) => {
  const message = { type: "TASK_STATE_UPDATE", state: { ...taskState, history: taskState.history || [] } };
  console.log(`[Broadcast] Sending TASK_STATE_UPDATE with ${taskState.history?.length || 0} history items, chatId: ${taskState.currentChatId}`);
  chrome.runtime.sendMessage(message).catch((error) => console.warn("[Broadcast] Failed to send message (UI may be closed):", error.message));
  chrome.storage.local.set({ backgroundTaskState: taskState }).catch((error) => console.error("[Broadcast] Failed to save to storage:", error));
};
export const addMessageToHistory = async (message: TaskHistoryEntry, taskState: any, updateTaskState: (updates: any) => void): Promise<void> => {
  console.log("[Background Task] Adding message to history:", { role: message.role, action: message.action?.name, contentLength: message.content?.length || 0, chatId: taskState.currentChatId });
  taskState.history.push(message);
  updateTaskState({ history: taskState.history });
  if (taskState.currentChatId) {
    try {
      const result = await chrome.storage.local.get([`superwizard_chat_${taskState.currentChatId}`]);
      const chat = result[`superwizard_chat_${taskState.currentChatId}`];
      if (chat) {
        chat.messages = [...taskState.history];
        chat.updatedAt = new Date().toISOString();
        await chrome.storage.local.set({ [`superwizard_chat_${taskState.currentChatId}`]: chat });
        console.log("[Background Task] Saved message to chat storage");
      } else {
        console.warn("[Background Task] Chat not found in storage, creating it");
        const newChat = { id: taskState.currentChatId, title: "Task Execution", messages: [message], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isPinned: false };
        await chrome.storage.local.set({ [`superwizard_chat_${taskState.currentChatId}`]: newChat });
        const chatsResult = await chrome.storage.local.get(['superwizard_chats']);
        const chatIds = chatsResult.superwizard_chats || [];
        if (!chatIds.includes(taskState.currentChatId)) {
          chatIds.unshift(taskState.currentChatId);
          await chrome.storage.local.set({ superwizard_chats: chatIds });
        }
        console.log("[Background Task] Created new chat in storage");
      }
    } catch (error) { console.error("[Background Task] Failed to save message to chat:", error); }
  } else { console.warn("[Background Task] No currentChatId set, message not saved to storage"); }
};

// ═══════════════════════════════════════════════════════════════════════════
// § STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════
let taskState: TaskState = { tabId: 0, status: "idle", actionStatus: "idle", taskProgress: { total: 1, completed: 0, type: "general" }, taskTiming: { startTime: null, endTime: null, elapsedTime: 0 }, currentChatId: null, history: [] };
let shouldStopTask = false;
let globalUseAppState: any = null;
const broadcastStateUpdateWrapper = () => broadcastStateUpdate(taskState);
const updateTaskState = (updates: Partial<TaskState>) => { taskState = { ...taskState, ...updates }; broadcastStateUpdateWrapper(); };
const updateTaskStatus = (status: TaskState["status"], actionStatus?: TaskState["actionStatus"]) => {
  taskState.status = status;
  if (actionStatus !== undefined) taskState.actionStatus = actionStatus;
  if (globalUseAppState) {
    globalUseAppState.setState((state: any) => { state.taskManager.status = status; if (actionStatus !== undefined) state.taskManager.actionStatus = actionStatus; });
    console.log(`[Task Status] Updated useAppState.taskManager.status to "${status}"${actionStatus ? `, actionStatus to "${actionStatus}"` : ''}`);
  }
  broadcastStateUpdateWrapper();
};
const addMessageToHistoryWrapper = async (message: TaskHistoryEntry) => await addMessageToHistory(message, taskState, updateTaskState);

// ═══════════════════════════════════════════════════════════════════════════
// § MAIN TASK EXECUTION
// ═══════════════════════════════════════════════════════════════════════════
export const executeTask = async (config: TaskExecutorConfig): Promise<void> => {
  shouldStopTask = false;
  const { instructions, tabId: configTabId, chatId, streamingEnabled, selectedModel } = config;
  const { useAppState } = await import("../../state");
  globalUseAppState = useAppState;
  try {
    const storageData = await chrome.storage.local.get(['app-state-v2']);
    if (storageData['app-state-v2']) {
      const savedState = JSON.parse(storageData['app-state-v2']);
      console.log("[Background Task] Loaded settings from storage:", savedState.state?.settings);
      if (savedState.state?.settings) {
        useAppState.setState((state) => { state.settings.selectedModel = savedState.state.settings.selectedModel || selectedModel; state.settings.configuredProviders = savedState.state.settings.configuredProviders || []; });
        console.log("[Background Task] Synced settings to useAppState");
      }
    }
    const authData = await chrome.storage.local.get(['superwizard_auth_session', 'superwizard_auth_user', 'superwizard_auth_last_sync']);
    console.log("[Background Task] Loaded auth data from storage:", { hasSession: !!authData.superwizard_auth_session, hasUser: !!authData.superwizard_auth_user, user: authData.superwizard_auth_user });
    if (authData.superwizard_auth_user) {
      useAppState.setState((state) => { state.auth.isAuthenticated = true; state.auth.user = authData.superwizard_auth_user; state.auth.session = authData.superwizard_auth_session || null; state.auth.lastSync = authData.superwizard_auth_last_sync || null; });
      console.log("[Background Task] Synced auth state to useAppState - User is authenticated");
    } else {
      useAppState.setState((state) => { state.auth.isAuthenticated = false; state.auth.user = null; state.auth.session = null; });
      console.log("[Background Task] No auth session found - User is NOT authenticated");
    }
  } catch (error) { console.error("[Background Task] Failed to load settings from storage:", error); }
  const handleError = async (error: Error | string | unknown, tabId?: number) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Background task execution error:", error);
    const errorEntry = createHistoryEntry(`<status>Task Error("${errorMessage}")</status>`, "Task Error", { message: errorMessage });
    await addMessageToHistoryWrapper(errorEntry);
    updateTaskStatus("error", "idle");
    const endTime = Date.now();
    taskState.taskTiming.endTime = endTime;
    if (taskState.taskTiming.startTime) taskState.taskTiming.elapsedTime = endTime - taskState.taskTiming.startTime;
    broadcastStateUpdateWrapper();
    if (tabId) { try { await setTaskRunningState(false, tabId); } catch {} }
  };
  try {
    if (!instructions) throw createTaskError("No instructions provided");
    const userMessage: TaskHistoryEntry = { prompt: instructions, content: "", role: "user", action: null, usage: null, timestamp: new Date().toISOString() };
    const taskConfig = parseTaskRequirements(instructions);
    taskState.taskProgress = { total: taskConfig.total, completed: 0, type: taskConfig.type, validationRules: taskConfig.validationRules };
    taskState.currentChatId = chatId;
    let userMessageAlreadyInHistory = false;
    if (chatId) {
      try {
        const result = await chrome.storage.local.get([`superwizard_chat_${chatId}`]);
        const existingChat = result[`superwizard_chat_${chatId}`];
        if (existingChat && existingChat.messages && existingChat.messages.length > 0) {
          taskState.history = [...existingChat.messages];
          userMessageAlreadyInHistory = taskState.history.some((msg: TaskHistoryEntry) => msg.role === "user" && msg.prompt === instructions && Math.abs(new Date(msg.timestamp).getTime() - new Date(userMessage.timestamp).getTime()) < 5000);
          console.log(`[Background Task] Loaded ${taskState.history.length} existing messages from chat ${chatId}, user message already present: ${userMessageAlreadyInHistory}`);
        } else { taskState.history = []; console.log(`[Background Task] Starting new chat ${chatId} with empty history`); }
      } catch (error) { console.error("[Background Task] Failed to load chat history:", error); taskState.history = []; }
    } else { taskState.history = []; }
    if (!userMessageAlreadyInHistory) { await addMessageToHistoryWrapper(userMessage); console.log("[Background Task] Added user message to history"); }
    else { console.log("[Background Task] Skipped adding user message (already in history)"); }
    updateTaskStatus("running", "initializing");
    useAppState.setState((state) => { state.taskManager.status = "running"; state.taskManager.actionStatus = "initializing"; });
    console.log("[Background Task] Set useAppState.taskManager.status to 'running'");
    const startTime = Date.now();
    taskState.taskTiming = { startTime, endTime: null, elapsedTime: 0 };
    broadcastStateUpdateWrapper();
    let activeTab: chrome.tabs.Tab;
    if (configTabId) { try { activeTab = await chrome.tabs.get(configTabId); if (!activeTab) throw createTaskError("Selected tab no longer exists"); } catch (error) { activeTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0]; } }
    else { activeTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0]; }
    if (!activeTab.id) throw createTaskError("No active tab found");
    const tabId = activeTab.id;
    taskState.tabId = tabId;
    useAppState.setState((state) => { state.taskManager.tabId = tabId; });
    console.log("[Background Task] Synced tabId to useAppState:", tabId);
    broadcastStateUpdateWrapper();
    await setTaskRunningState(true, tabId);
    let shouldContinue = true;
    let stepCounter = 0;
    while (shouldContinue && !shouldStopTask) {
      stepCounter++;
      try {
        if (hasActiveAction()) await waitForActionCompletion();
        updateTaskStatus("running", "pulling-dom");
        await ensurePageStability(tabId);
        console.log("[Background Task] Extracting DOM from tab:", tabId);
        const pageDOM = await getSimplifiedDom();
        console.log("[Background Task] DOM extraction result:", { type: typeof pageDOM, length: typeof pageDOM === "string" ? pageDOM.length : JSON.stringify(pageDOM).length, preview: typeof pageDOM === "string" ? pageDOM.substring(0, 200) : JSON.stringify(pageDOM).substring(0, 200) });
        const currentDom = typeof pageDOM === "string" ? pageDOM : (pageDOM as { content: string }).content;
        console.log("[Background Task] Current DOM length:", currentDom.length);
        if (shouldStopTask) break;
        const previousActions = convertHistoryToPreviousActions(taskState.history);
        updateTaskStatus("running", "performing-query");
        const filteredActions = previousActions.filter((pa: any) => !("error" in pa)) as Extract<AIResponseResult, { thought: string }>[];
        const fullFormattedPrompt = await formatPrompt(instructions, filteredActions, currentDom, taskState.history);
        console.log("=".repeat(80));
        console.log("[Background Task] FULL FORMATTED PROMPT BEING SENT TO AI:");
        console.log("=".repeat(80));
        console.log(fullFormattedPrompt);
        console.log("=".repeat(80));
        console.log(`Prompt length: ${fullFormattedPrompt.length} characters`);
        console.log("=".repeat(80));
        const streamingMessageId = `streaming_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        let currentStreamingContent = "";
        let fullResponse = "";
        let capturedUsage: any = null;
        const streamingCallbacks: StreamingCallbacks = {
          onChunk: (chunk: string) => {
            currentStreamingContent += chunk;
            console.log("[Background Task] Received chunk:", chunk);
            const messageIndex = taskState.history.findIndex(msg => (msg as any).streamingMessageId === streamingMessageId);
            if (messageIndex !== -1) { taskState.history[messageIndex] = { ...taskState.history[messageIndex], content: currentStreamingContent }; broadcastStateUpdateWrapper(); }
          },
          onComplete: (completeResponse: string) => {
            fullResponse = completeResponse;
            currentStreamingContent = completeResponse;
            console.log("=".repeat(80));
            console.log("[Background Task] STREAMING COMPLETE - FULL AI RESPONSE:");
            console.log("=".repeat(80));
            console.log(completeResponse);
            console.log("=".repeat(80));
            console.log(`Response length: ${completeResponse.length} characters`);
            console.log("=".repeat(80));
          },
          onError: (error: string) => { console.error("=".repeat(80)); console.error("[Background Task] Streaming error:", error); console.error("=".repeat(80)); },
          onUsage: (usage: any) => { capturedUsage = usage; console.log("[Background Task] Token usage:", usage); }
        };
        const initialAiMessage: TaskHistoryEntry = { prompt: "", context: fullFormattedPrompt, content: "", role: "ai", action: null, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, timestamp: new Date().toISOString(), streamingMessageId };
        await addMessageToHistoryWrapper(initialAiMessage);
        let actionResponse;
        try {
          console.log("[Background Task] Calling AI to determine next action...");
          if (streamingEnabled) {
            console.log("[Background Task] Using streaming mode");
            actionResponse = await determineNextActionStreaming(instructions, filteredActions, currentDom, streamingCallbacks, fullFormattedPrompt);
            console.log("[Background Task] Streaming response received:", actionResponse);
          } else {
            console.log("[Background Task] Using non-streaming mode");
            actionResponse = await determineNextAction(instructions, filteredActions, currentDom, undefined, fullFormattedPrompt);
            if (actionResponse) {
              console.log("[Background Task] Received AI response:", actionResponse);
              console.log("=".repeat(80));
              console.log("[Background Task] FULL AI RESPONSE (Non-streaming):");
              console.log("=".repeat(80));
              console.log(actionResponse.rawResponse || "");
              console.log("=".repeat(80));
              console.log(`Response length: ${(actionResponse.rawResponse || "").length} characters`);
              console.log("Token usage:", actionResponse.usage);
              console.log("=".repeat(80));
              const regularAiMessage: TaskHistoryEntry = { prompt: "", context: fullFormattedPrompt, content: actionResponse.rawResponse || "", role: "ai", action: actionResponse.actions?.[0] && "parsedAction" in actionResponse.actions[0] ? actionResponse.actions[0].parsedAction : null, usage: actionResponse.usage, timestamp: new Date().toISOString(), elementInfo: undefined };
              await addMessageToHistoryWrapper(regularAiMessage);
              console.log("[Background Task] Added AI message to history");
            } else { console.error("[Background Task] AI response is null or undefined"); }
          }
          if (!actionResponse) { console.error("[Background Task] No action response received from AI"); throw createTaskError("No response received from AI"); }
          console.log("[Background Task] AI response received successfully");
        } catch (aiError) { console.error("[Background Task] Error calling AI:", aiError); throw aiError; }
        if (shouldStopTask) break;
        const action = actionResponse.actions?.[0] || actionResponse;
        console.log("=".repeat(80));
        console.log("[Background Task] EXTRACTED ACTION FROM AI RESPONSE:");
        console.log("=".repeat(80));
        console.log(JSON.stringify(action, null, 2));
        console.log("=".repeat(80));
        if (streamingEnabled) {
          const messageIndex = taskState.history.findIndex(msg => (msg as any).streamingMessageId === streamingMessageId);
          if (messageIndex !== -1) {
            taskState.history[messageIndex] = { prompt: "", context: fullFormattedPrompt, content: fullResponse || actionResponse.rawResponse || "", role: "ai", action: action && "parsedAction" in action ? action.parsedAction : null, usage: capturedUsage || actionResponse.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, timestamp: new Date().toISOString(), streamingMessageId, elementInfo: undefined };
            if (taskState.currentChatId) {
              try {
                const result = await chrome.storage.local.get([`superwizard_chat_${taskState.currentChatId}`]);
                const chat = result[`superwizard_chat_${taskState.currentChatId}`];
                if (chat) { chat.messages = [...taskState.history]; chat.updatedAt = new Date().toISOString(); await chrome.storage.local.set({ [`superwizard_chat_${taskState.currentChatId}`]: chat }); console.log("[Background Task] Saved final streaming message to storage"); }
              } catch (error) { console.error("[Background Task] Failed to save final streaming message:", error); }
            }
            broadcastStateUpdateWrapper();
            console.log("[Background Task] Updated final streaming message");
          }
        }
        if (!action || "error" in action) { console.error("[Background Task] Invalid action or error in action:", action); throw createTaskError(action?.error || "Invalid action received"); }
        if (!action.parsedAction) { console.error("[Background Task] Action missing parsedAction field:", action); throw createTaskError("Action missing parsedAction field"); }
        updateTaskStatus("running", "performing-action");
        const { name, args } = action.parsedAction;
        console.log("=".repeat(80));
        console.log(`[Background Task] EXECUTING ACTION: ${name}`);
        console.log("=".repeat(80));
        console.log("Action arguments:");
        console.log(JSON.stringify(args, null, 2));
        console.log("Current tabId in useAppState:", useAppState.getState().taskManager.tabId);
        console.log("=".repeat(80));
        let capturedElementInfo: string | null = null;
        const isElementInteractionAction = ["click", "setValue"].includes(name);
        if (isElementInteractionAction) {
          const elementId = extractElementIdFromParsedAction(action.parsedAction);
          if (elementId !== null) {
            capturedElementInfo = findElementInPageContents(elementId, currentDom);
            console.log(`[Background Task] Captured element info for ID ${elementId}:`, capturedElementInfo);
          }
        } else { console.log(`[Background Task] Skipping element capture for non-element action: ${name}`); }
        const actionResult = await executeAction(action);
        console.log("=".repeat(80));
        console.log(`[Background Task] ACTION "${name}" EXECUTION RESULT:`);
        console.log("=".repeat(80));
        console.log(JSON.stringify(actionResult, null, 2));
        console.log("=".repeat(80));
        if (capturedElementInfo) {
          const lastAiMessageIndex = taskState.history.length - 1;
          if (lastAiMessageIndex >= 0 && taskState.history[lastAiMessageIndex].role === "ai") {
            taskState.history[lastAiMessageIndex].elementInfo = capturedElementInfo;
            console.log(`[Background Task] Updated history entry with elementInfo: ${capturedElementInfo}`);
            if (taskState.currentChatId) {
              try {
                const result = await chrome.storage.local.get([`superwizard_chat_${taskState.currentChatId}`]);
                const chat = result[`superwizard_chat_${taskState.currentChatId}`];
                if (chat) {
                  chat.messages = [...taskState.history];
                  chat.updatedAt = new Date().toISOString();
                  await chrome.storage.local.set({ [`superwizard_chat_${taskState.currentChatId}`]: chat });
                  console.log("[Background Task] Saved elementInfo to chat storage");
                }
              } catch (error) { console.error("[Background Task] Failed to save elementInfo to storage:", error); }
            }
            broadcastStateUpdateWrapper();
          }
        }
        if (!actionResult) { console.error("[Background Task] Action result is null/undefined"); throw createTaskError(`Action "${name}" returned no result`); }
        const success = actionResult?.success === true;
        if (!success) {
          const errorMessage = actionResult?.error || "Action failed";
          const actionFailureEntry = createHistoryEntry(`<status>Action Failed("${name}: ${errorMessage}")</status>`, "action_failure", { actionName: name, error: errorMessage, message: `Action "${name}" failed: ${errorMessage}` });
          await addMessageToHistoryWrapper(actionFailureEntry);
          console.error(`Action "${name}" failed: ${errorMessage}`);
          updateTaskStatus("failed", "idle");
          shouldContinue = false;
          await setTaskRunningState(false, tabId);
          break;
        }
        if (success) {
          const validationResult = validateAction(name, actionResult, taskState.taskProgress.validationRules);
          if (validationResult === "success") { taskState.taskProgress.completed += 1; broadcastStateUpdateWrapper(); }
          shouldContinue = !["finish"].includes(name);
        }
        if (!shouldContinue) {
          const finalStatus = name === "finish" ? "completed" : "success";
          updateTaskStatus(finalStatus, "idle");
          const endTime = Date.now();
          taskState.taskTiming.endTime = endTime;
          if (taskState.taskTiming.startTime) taskState.taskTiming.elapsedTime = endTime - taskState.taskTiming.startTime;
          broadcastStateUpdateWrapper();
          await setTaskRunningState(false, tabId);
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (stepError) { console.error(`Error in task step ${stepCounter}:`, stepError); await handleError(stepError, tabId); return; }
    }
    if (shouldStopTask) {
      const interruptionMessage = "The task was stopped before completion.";
      const interruptionEntry = createHistoryEntry(`<status>Task Interrupted("${interruptionMessage}")</status>`, "Task Interrupted", { message: interruptionMessage });
      await addMessageToHistoryWrapper(interruptionEntry);
      updateTaskStatus("idle", "idle");
      const endTime = Date.now();
      taskState.taskTiming.endTime = endTime;
      if (taskState.taskTiming.startTime) taskState.taskTiming.elapsedTime = endTime - taskState.taskTiming.startTime;
      broadcastStateUpdateWrapper();
      if (taskState.tabId) { try { await setTaskRunningState(false, taskState.tabId); } catch (error) { console.error("Failed to update task running state:", error); } }
    }
  } catch (error) { await handleError(error, taskState.tabId); }
  finally { globalUseAppState = null; }
};

// ═══════════════════════════════════════════════════════════════════════════
// § PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════
export const startTask = async (config: TaskExecutorConfig): Promise<void> => {
  if (taskState.status === "running") throw new Error("A task is already running");
  executeTask(config).catch((error) => console.error("Task execution failed:", error));
};
export const stopTask = async (): Promise<void> => {
  shouldStopTask = true;
  try { if (taskState.tabId) { await setTaskRunningState(false, taskState.tabId); } else { await setTaskRunningState(false); } } catch (e) {}
  updateTaskStatus("idle", "idle");
  broadcastStateUpdateWrapper();
};
export const getTaskState = (): TaskState => ({ ...taskState });
export const clearTaskHistory = (): void => { taskState.history = []; broadcastStateUpdateWrapper(); };
export const initializeTaskExecutor = async (): Promise<void> => {
  try {
    const result = await chrome.storage.local.get(["backgroundTaskState"]);
    if (result.backgroundTaskState) { taskState = { ...result.backgroundTaskState, status: "idle", actionStatus: "idle" }; broadcastStateUpdateWrapper(); }
  } catch (error) { console.error("Failed to initialize task executor:", error); }
};
