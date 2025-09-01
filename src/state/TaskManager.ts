import { callDOMAction, waitForActionCompletion, hasActiveAction, ensurePageStability, parseTaskRequirements } from "../wizardry/operation";
import { AIResponseResult } from "../wizardry/ai/parseResponse";
import { determineNextAction } from "../wizardry/ai/terminalGateway";
import { getSimplifiedDom } from "../wizardry/extraction/simplifyDom";
import { setTaskRunningState } from "./storage";
import { MyStateCreator } from "./index";

// ════════════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════════════

export type TaskHistoryEntry = {
  prompt: string;
  context?: string;
  content: string;
  role: "user" | "ai" | "error";
  action: {
    name: string;
    args: Record<string, string | number | string[] | boolean>;
  } | null;
  usage: any;
  timestamp: string;
  screenshotDataUrl?: string;
};

export interface TaskProgress {
  total: number;
  completed: number;
  type: string;
  validationRules?: {
    successIndicators: string[];
    failureIndicators: string[];
    pendingIndicators: string[];
  };
}

export interface TaskManagerSlice {
  tabId: number;
  status: "idle" | "running" | "completed" | "failed" | "error" | "success";
  actionStatus:
    | "idle"
    | "initializing"
    | "pulling-dom"
    | "performing-query"
    | "performing-action";
  taskProgress: TaskProgress;
  actions: {
    runTask: (onError?: (error: string) => void) => Promise<void>;
    updateTaskProgress: (progress: Partial<TaskProgress>) => void;
    validateAction: (
      actionType: string,
      result: any
    ) => "success" | "pending" | "failure";
    interrupt: () => Promise<void>;
    clearHistory: () => void;
  };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════════════════════════════

const createTaskError = (msg: string) => new Error(msg);

const updateTaskState = (set: any, updates: Partial<Pick<TaskManagerSlice, "status" | "actionStatus">>) => {
  set((state: any) => {
    Object.keys(updates).forEach((key) => {
      state.taskManager[key] = updates[key as keyof typeof updates];
    });
  });
};

const executeAction = async (action: Extract<AIResponseResult, { thought: string }>) => {
  const { name, args } = action.parsedAction;
  if (["finish", "fail", "respond"].includes(name))
    return { success: name !== "fail", message: (args as any).message || "" };
  if (["click", "setValue", "navigate", "waiting"].includes(name))
    return await callDOMAction(name as any, args as any);
  return { success: false, error: `Unknown action: ${name}` };
};

const createHistoryEntry = (content: string, actionName: string, args: Record<string, any>): TaskHistoryEntry => ({
  prompt: "",
  content,
  role: "error",
  action: { name: actionName, args },
  usage: null,
  timestamp: new Date().toISOString(),
});

// ════════════════════════════════════════════════════════════════════════════════════════
// TAB MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════════════════

export const getTaskTab = async (): Promise<chrome.tabs.Tab | undefined> => {
  const { useAppState } = await import("./index");
  const taskTabId = useAppState.getState().taskManager.tabId;
  if (!taskTabId) return undefined;
  return new Promise((resolve) => {
    chrome.tabs.get(taskTabId, (tab) => {
      if (chrome.runtime.lastError) {
        console.warn("Task tab not found:", chrome.runtime.lastError.message);
        resolve(undefined);
        return;
      }
      resolve(tab);
    });
  });
};

// ════════════════════════════════════════════════════════════════════════════════════════
// MAIN SLICE IMPLEMENTATION
// ════════════════════════════════════════════════════════════════════════════════════════

export const createTaskManagerSlice: MyStateCreator<TaskManagerSlice> = (
  set,
  get
) => ({
  tabId: 0,
  status: "idle",
  actionStatus: "idle",
  taskProgress: { total: 1, completed: 0, type: "general" },

  actions: {
    // ──────────────────────────────────────────────────────────────────────────────────
    // TASK EXECUTION
    // ──────────────────────────────────────────────────────────────────────────────────
    runTask: async (onError?: (error: string) => void) => {
      const wasStopped = () => get().taskManager.status !== "running";
      const setActionStatus = (status: TaskManagerSlice["actionStatus"]) => {
        if (!wasStopped()) updateTaskState(set, { actionStatus: status });
      };

      const handleError = async (error: Error | string | unknown, tabId?: number) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Task execution error:", error);
        onError?.(errorMessage);

        const errorEntry = createHistoryEntry(
          `<Action>Task Error("${errorMessage}")</Action>`,
          "Task Error",
          { message: errorMessage }
        );

        try {
          await get().storage.actions.addMessageToCurrentChat(errorEntry);
        } catch (storageError) {
          console.error("Failed to add error message to chat:", storageError);
        }

        updateTaskState(set, { status: "error", actionStatus: "idle" });
        if (tabId) {
          try {
            await setTaskRunningState(false, tabId);
          } catch {}
        }
      };

      try {
        const instructions = get().settings.instructions;
        if (!instructions) throw createTaskError("No instructions provided");

        const userMessage = {
          prompt: instructions,
          content: "",
          role: "user" as const,
          action: null,
          usage: null,
          timestamp: new Date().toISOString(),
        };

        set((state: any) => {
          const taskConfig = parseTaskRequirements(instructions);
          state.taskManager.taskProgress = {
            total: taskConfig.total,
            completed: 0,
            type: taskConfig.type,
            validationRules: taskConfig.validationRules,
          };
        });

        try {
          await get().storage.actions.addMessageToCurrentChat(userMessage);
        } catch (error) {
          console.error("Failed to add user message to chat:", error);
        }

        updateTaskState(set, {
          status: "running",
          actionStatus: "initializing",
        });

        const activeTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
        if (!activeTab.id) throw createTaskError("No active tab found");

        const tabId = activeTab.id;
        const restrictedPrefixes = ["chrome://", "chrome-extension://", "https://chrome.google.com/webstore", "edge://", "about:"];
        const isRestrictedUrl = restrictedPrefixes.some(prefix => activeTab.url?.startsWith(prefix));

        if (isRestrictedUrl) {
          console.log("Detected restricted URL, navigating to Google:", activeTab.url);
          try {
            await chrome.tabs.update(tabId, { url: "https://www.google.com" });
            await new Promise((resolve) => {
              const listener = (tabIdChanged: number, changeInfo: chrome.tabs.TabChangeInfo) => {
                if (tabIdChanged === tabId && changeInfo.status === "complete") {
                  chrome.tabs.onUpdated.removeListener(listener);
                  resolve(void 0);
                }
              };
              chrome.tabs.onUpdated.addListener(listener);
              setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve(void 0);
              }, 5000);
            });
            console.log("Successfully navigated to Google");
          } catch (navigationError) {
            console.error("Failed to navigate from restricted URL:", navigationError);
            throw createTaskError("Cannot interact with Chrome system pages and failed to navigate to Google");
          }
        }

        set((state: any) => {
          state.taskManager.tabId = tabId;
        });
        await setTaskRunningState(true, tabId);

        // Main execution loop
        let shouldContinue = true, stepCounter = 0;
        while (shouldContinue && !wasStopped()) {
          stepCounter++;
          try {
            if (hasActiveAction()) await waitForActionCompletion();
            setActionStatus("pulling-dom");
            await ensurePageStability(tabId);

            const pageDOM = await getSimplifiedDom();
            const currentDom = typeof pageDOM === "string" ? pageDOM : (pageDOM as { content: string }).content;
            if (wasStopped()) break;

            const previousActions = get()
              .storage.actions.getCurrentChatMessages()
              .filter((entry: any) => entry.content && entry.action && entry.role === "ai")
              .map((entry: any) => {
                const thoughtMatch = entry.content.match(/<thought>([\s\S]*?)<\/thought>/i);
                const actionMatch = entry.content.match(/<Action>([\s\S]*?)<\/Action>/i);
                if (thoughtMatch && actionMatch && entry.action) {
                  return {
                    thought: thoughtMatch[1].trim(),
                    action: actionMatch[1].trim(),
                    parsedAction: entry.action,
                  };
                }
                return null;
              })
              .filter((action: any): action is Extract<AIResponseResult, { thought: string }> => action != null);

            setActionStatus("performing-query");

            const { formatPrompt } = await import("../wizardry/ai/formatPrompt");
            const { captureScreenshot } = await import("../wizardry/extraction/captureScreenshot");
            const screenVisionEnabled = get().settings.screenVisionEnabled;
            const captured = screenVisionEnabled ? await captureScreenshot(tabId) : null;
            const screenshotDataUrl = captured?.dataUrl;
            const allHistory = get().storage.actions.getCurrentChatMessages();
            const filteredActions = previousActions.filter((pa: any) => !("error" in pa));
            const fullFormattedPrompt = await formatPrompt(instructions, filteredActions, currentDom, allHistory, screenshotDataUrl);

            const actionResponse = await determineNextAction(instructions, filteredActions, currentDom, undefined, screenshotDataUrl, fullFormattedPrompt);

            if (wasStopped() || !actionResponse) break;

            const action = actionResponse.actions?.[0] || actionResponse;
            const aiMessage = {
              prompt: "",
              context: fullFormattedPrompt,
              content: actionResponse.rawResponse || "",
              role: "ai" as const,
              action: action && "parsedAction" in action ? action.parsedAction : null,
              usage: actionResponse.usage,
              timestamp: new Date().toISOString(),
              screenshotDataUrl,
            };

            try {
              await get().storage.actions.addMessageToCurrentChat(aiMessage);
            } catch (error) {
              console.error("Failed to add AI message to chat:", error);
            }

            if (!action || "error" in action) {
              throw createTaskError(action?.error || "Invalid action received");
            }

            setActionStatus("performing-action");

            const { name, args } = action.parsedAction;
            const actionResult = await executeAction(action);
            const success = actionResult?.success === true;

            if (!success) {
              const errorMessage = actionResult?.error || "Action failed";
              const actionFailureEntry = createHistoryEntry(
                `<Action>Action Failed("${name}: ${errorMessage}")</Action>`,
                "action_failure",
                { actionName: name, error: errorMessage, message: `Action "${name}" failed: ${errorMessage}` }
              );

              try {
                await get().storage.actions.addMessageToCurrentChat(actionFailureEntry);
              } catch (storageError) {
                console.error("Failed to add action failure message to chat:", storageError);
              }

              console.error(`Action "${name}" failed: ${errorMessage}`);
              updateTaskState(set, { status: "failed", actionStatus: "idle" });
              shouldContinue = false;
              await setTaskRunningState(false, tabId);
              break;
            }

            if (success) {
              const validationResult = get().taskManager.actions.validateAction(name, actionResult);
              if (validationResult === "success") {
                set((state: any) => { state.taskManager.taskProgress.completed += 1; });
              }
              shouldContinue = !["finish", "fail", "respond"].includes(name);
            }

            if (!shouldContinue) {
              const finalStatus = name === "finish" ? "completed" : name === "fail" ? "failed" : "success";

              if (name === "fail") {
                const failureMessage = (args as any)?.message || "Task failed as determined by AI";
                const failureEntry = createHistoryEntry(
                  `<Action>Task Failed("${failureMessage}")</Action>`,
                  "Task Failed",
                  { message: failureMessage }
                );

                try {
                  await get().storage.actions.addMessageToCurrentChat(failureEntry);
                } catch (storageError) {
                  console.error("Failed to add task failure message to chat:", storageError);
                }
              }

              updateTaskState(set, { status: finalStatus, actionStatus: "idle" });
              await setTaskRunningState(false, tabId);
              break;
            }

            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (stepError) {
            console.error(`Error in task step ${stepCounter}:`, stepError);
            await handleError(stepError, tabId);
            return;
          }
        }
      } catch (error) {
        await handleError(error, get().taskManager.tabId);
      }
    },

    // ──────────────────────────────────────────────────────────────────────────────────
    // UTILITY ACTIONS
    // ──────────────────────────────────────────────────────────────────────────────────
    updateTaskProgress: (progress) => {
      set((state) => {
        if (progress.total !== undefined) state.taskManager.taskProgress.total = progress.total;
        if (progress.completed !== undefined) state.taskManager.taskProgress.completed = progress.completed;
        if (progress.type !== undefined) state.taskManager.taskProgress.type = progress.type;
        if (progress.validationRules !== undefined) state.taskManager.taskProgress.validationRules = progress.validationRules;
      });
    },

    validateAction: (actionType, result) => {
      const { validationRules: rules } = get().taskManager.taskProgress;
      if (!rules) return "success";

      const resultStr = JSON.stringify(result).toLowerCase();
      if (rules.successIndicators.some(indicator => resultStr.includes(indicator.toLowerCase()))) return "success";
      if (rules.failureIndicators.some(indicator => resultStr.includes(indicator.toLowerCase()))) return "failure";
      return "pending";
    },

    interrupt: async () => {
      const tabId = get().taskManager.tabId;
      const interruptionMessage = "The task was stopped before completion. This happens when you click the stop button or close the extension.";
      const interruptionEntry = createHistoryEntry(
        `<Action>Task Interrupted("${interruptionMessage}")</Action>`,
        "Task Interrupted",
        { message: interruptionMessage }
      );

      try {
        await get().storage.actions.addMessageToCurrentChat(interruptionEntry);
      } catch (error) {
        console.error("Failed to add interruption message to chat:", error);
      }

      updateTaskState(set, { status: "idle", actionStatus: "idle" });
      if (tabId) {
        try {
          await setTaskRunningState(false, tabId);
        } catch (error) {
          console.error("Failed to update task running state:", error);
        }
      }
    },

    clearHistory: () => {
      try {
        get().storage.actions.clearCurrentChatMessages();
      } catch (error) {
        console.error("Failed to clear chat history:", error);
      }
    },
  },
});
