import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "../../App";
import { useAppState, StoreType } from "../../state";

// ═══════════════════════════════════════════════════════════════════════════
// § TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════
interface TaskStateMessage { type: "GET_TASK_STATE" }
interface TaskStateUpdateMessage { type: "TASK_STATE_UPDATE"; state: BackgroundTaskState }
interface BackgroundTaskState { status: "idle" | "running" | "completed" | "failed" | "error" | "success"; actionStatus: "idle" | "initializing" | "pulling-dom" | "performing-query" | "performing-action"; tabId: number; taskProgress: any; taskTiming: any; history?: any[]; currentChatId?: string }
interface TaskStateResponse { success: boolean; state?: BackgroundTaskState }
type ChromeMessage = TaskStateMessage | TaskStateUpdateMessage;

// ═══════════════════════════════════════════════════════════════════════════
// § HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
const syncTaskManagerState = (state: StoreType, backgroundState: BackgroundTaskState): void => {
  state.taskManager.status = backgroundState.status;
  state.taskManager.actionStatus = backgroundState.actionStatus;
  state.taskManager.tabId = backgroundState.tabId;
  state.taskManager.taskProgress = backgroundState.taskProgress;
  state.taskManager.taskTiming = backgroundState.taskTiming;
};

const syncChatHistory = (state: StoreType, backgroundState: BackgroundTaskState): void => {
  if (!backgroundState.currentChatId) { console.log("[Sidepanel] No currentChatId set"); return; }
  const currentChat = state.storage.chats.find(c => c.id === backgroundState.currentChatId);
  if (!currentChat) {
    console.warn(`[Sidepanel] Chat ${backgroundState.currentChatId} not found, reloading chats`);
    setTimeout(() => useAppState.getState().storage.actions.loadChatsFromStorage(), 100);
    return;
  }
  if (backgroundState.history?.length) {
    currentChat.messages = [...backgroundState.history];
    currentChat.updatedAt = new Date().toISOString();
    state.storage.chats = [...state.storage.chats];
    console.log(`[Sidepanel] Synced ${backgroundState.history.length} messages to chat ${backgroundState.currentChatId}`);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// § MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const Sidepanel: React.FC = () => {
  useEffect(() => {
    const loadInitialData = async (): Promise<void> => {
      await useAppState.getState().storage.actions.loadChatsFromStorage();
      console.log("[Sidepanel] Loaded chats from storage");
    };
    loadInitialData();
    const syncStateFromBackground = async (): Promise<void> => {
      try {
        console.log("[Sidepanel] Requesting task state from background...");
        const response = await chrome.runtime.sendMessage<TaskStateMessage, TaskStateResponse>({ type: "GET_TASK_STATE" });
        if (response.success && response.state) {
          const backgroundState = response.state;
          console.log("[Sidepanel] Received task state:", { status: backgroundState.status, historyLength: backgroundState.history?.length || 0, currentChatId: backgroundState.currentChatId });
          useAppState.setState((state: StoreType) => { syncTaskManagerState(state, backgroundState); syncChatHistory(state, backgroundState); });
          console.log("[Sidepanel] Synced state from background worker");
        } else { console.log("[Sidepanel] No task state available from background"); }
      } catch (error) { console.error("[Sidepanel] Failed to sync state from background:", error); }
    };
    const handleBackgroundMessage = (message: ChromeMessage, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): boolean => {
      if (message.type === "TASK_STATE_UPDATE" && 'state' in message) {
        const backgroundState = message.state;
        console.log("[Sidepanel] Received TASK_STATE_UPDATE:", { status: backgroundState.status, actionStatus: backgroundState.actionStatus, historyLength: backgroundState.history?.length || 0, currentChatId: backgroundState.currentChatId });
        useAppState.setState((state: StoreType) => { syncTaskManagerState(state, backgroundState); syncChatHistory(state, backgroundState); });
        sendResponse({ success: true });
      }
      return true;
    };
    syncStateFromBackground();
    chrome.runtime.onMessage.addListener(handleBackgroundMessage);
    return () => { chrome.runtime.onMessage.removeListener(handleBackgroundMessage); };
  }, []);
  return (<div className="sidepanel-container"><main className="main-content"><App /></main></div>);
};

// ═══════════════════════════════════════════════════════════════════════════
// § INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════
const container = window.document.querySelector("#app-container");
if (!container) { throw new Error("#app-container element not found"); }
const root = createRoot(container);
root.render(<Sidepanel />);
declare const module: { hot?: { accept(): void } };
if (module.hot) module.hot.accept();
