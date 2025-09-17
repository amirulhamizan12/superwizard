import { MyStateCreator } from "./index";
import { TaskHistoryEntry, TaskProgress, createTaskError, createHistoryEntry } from "../pages/Background/taskEngine";

// ═════════════════════════════════════════════════════════════════════════════
// § TYPES
// ═════════════════════════════════════════════════════════════════════════════
export type { TaskHistoryEntry, TaskProgress };
export interface TaskManagerSlice {
  tabId: number;
  status: "idle" | "running" | "completed" | "failed" | "error" | "success";
  actionStatus: "idle" | "initializing" | "pulling-dom" | "performing-query" | "performing-action";
  taskProgress: TaskProgress;
  taskTiming: { startTime: number | null; endTime: number | null; elapsedTime: number };
  actions: {
    runTask: (onError?: (error: string) => void) => Promise<void>;
    updateTaskProgress: (progress: Partial<TaskProgress>) => void;
    validateAction: (actionType: string, result: any) => "success" | "pending" | "failure";
    interrupt: () => Promise<void>;
    clearHistory: () => void;
    updateTaskTiming: (timing: Partial<{ startTime: number | null; endTime: number | null; elapsedTime: number }>) => void;
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// § UTILITIES
// ═════════════════════════════════════════════════════════════════════════════
const updateTaskState = (set: any, updates: Partial<Pick<TaskManagerSlice, "status" | "actionStatus">>) => {
  set((state: any) => { Object.keys(updates).forEach((key) => { state.taskManager[key] = updates[key as keyof typeof updates]; }); });
};
export const getTaskTab = async (): Promise<chrome.tabs.Tab | undefined> => {
  const { useAppState } = await import("./index");
  const taskTabId = useAppState.getState().taskManager.tabId;
  if (!taskTabId) return undefined;
  return new Promise((resolve) => {
    chrome.tabs.get(taskTabId, (tab) => {
      if (chrome.runtime.lastError) { console.warn("Task tab not found:", chrome.runtime.lastError.message); resolve(undefined); return; }
      resolve(tab);
    });
  });
};

// ═════════════════════════════════════════════════════════════════════════════
// § MAIN SLICE IMPLEMENTATION
// ═════════════════════════════════════════════════════════════════════════════
export const createTaskManagerSlice: MyStateCreator<TaskManagerSlice> = (set, get) => ({
  tabId: 0, status: "idle", actionStatus: "idle",
  taskProgress: { total: 1, completed: 0, type: "general" },
  taskTiming: { startTime: null, endTime: null, elapsedTime: 0 },
  actions: {
    runTask: async (onError?: (error: string) => void) => {
      try {
        const instructions = get().settings.instructions;
        if (!instructions) throw createTaskError("No instructions provided");
        const selectedTab = get().settings.selectedTab;
        const tabId = selectedTab?.id;
        let currentChatId = get().storage.currentChatId;
        const streamingEnabled = get().settings.streamingEnabled;
        const selectedModel = get().settings.selectedModel;

        if (!currentChatId) {
          console.log("[TaskManager] No current chat - creating new chat for task");
          const chatTitle = instructions.trim().slice(0, 50) || "New Chat";
          const title = chatTitle.length < instructions.trim().length ? `${chatTitle}...` : chatTitle;
          currentChatId = await get().storage.actions.createNewChat(title);
          console.log("[TaskManager] Created new chat:", currentChatId);
        }

        const userMessage = { prompt: instructions, content: "", role: "user" as const, action: null, usage: null, timestamp: new Date().toISOString() };
        try {
          await get().storage.actions.addMessageToCurrentChat(userMessage);
          console.log("[TaskManager] User message added to chat:", currentChatId);
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) { console.error("Failed to add user message to chat:", error); }

        const response = await chrome.runtime.sendMessage({ type: "START_TASK", instructions, tabId, chatId: currentChatId, streamingEnabled, selectedModel });
        if (!response.success) throw new Error(response.error || "Failed to start task in background");
        console.log("Task started in background worker");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Failed to start background task:", error);
        onError?.(errorMessage);
        const errorEntry = createHistoryEntry(`<status>Task Error("${errorMessage}")</status>`, "Task Error", { message: errorMessage });
        try { await get().storage.actions.addMessageToCurrentChat(errorEntry); }
        catch (storageError) { console.error("Failed to add error message to chat:", storageError); }
        updateTaskState(set, { status: "error", actionStatus: "idle" });
      }
    },
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
      try {
        updateTaskState(set, { status: "idle", actionStatus: "idle" });
        const response = await chrome.runtime.sendMessage({ type: "STOP_TASK" });
        if (!response.success) console.error("Failed to stop background task:", response.error);
      } catch (error) {
        console.error("Failed to send stop task message:", error);
        updateTaskState(set, { status: "idle", actionStatus: "idle" });
      }
    },
    clearHistory: () => {
      try {
        get().storage.actions.clearCurrentChatMessages();
        chrome.runtime.sendMessage({ type: "CLEAR_TASK_HISTORY" }).catch((error) => console.error("Failed to clear background task history:", error));
      } catch (error) { console.error("Failed to clear chat history:", error); }
    },
    updateTaskTiming: (timing) => {
      set((state) => {
        if (timing.startTime !== undefined) state.taskManager.taskTiming.startTime = timing.startTime;
        if (timing.endTime !== undefined) state.taskManager.taskTiming.endTime = timing.endTime;
        if (timing.elapsedTime !== undefined) state.taskManager.taskTiming.elapsedTime = timing.elapsedTime;
      });
    },
  },
});
