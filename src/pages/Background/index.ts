import { setupOmniboxListeners } from "./omniboxCommand";
import { setupExternalMessageListeners } from "./externalCommand";
import { handleAuthMessage, MessageResponse } from "./authSession";
import { initializeTaskExecutor, startTask, stopTask, getTaskState, clearTaskHistory, TaskExecutorConfig } from "./taskEngine";
import { setupWizardTabNavigationListener } from "./wizardTab";
import { handleOpenSidebarInternal, handleRunCommandFromWebsite, handleRunWizardFromWebsite, handleOpenWizardTabFromWebsite } from "./contentEdge";

export type { TaskExecutorConfig } from "./taskEngine";

// ═══════════════════════════════════════════════════════════════════════════
// § TYPES
// ═══════════════════════════════════════════════════════════════════════════
interface TaskStatus { taskRunning?: boolean; taskTabId?: number }

// ═══════════════════════════════════════════════════════════════════════════
// § INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════
setupOmniboxListeners();
setupExternalMessageListeners();
setupWizardTabNavigationListener();
initializeTaskExecutor().then(() => console.log("Task executor initialized"));

// ═══════════════════════════════════════════════════════════════════════════
// § RUNTIME MESSAGE LISTENER
// ═══════════════════════════════════════════════════════════════════════════
chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: MessageResponse) => void) => {
  if (message.type === "START_TASK") {
    const config: TaskExecutorConfig = { instructions: message.instructions, tabId: message.tabId, chatId: message.chatId, streamingEnabled: message.streamingEnabled || false, selectedModel: message.selectedModel };
    startTask(config).then(() => sendResponse({ success: true, message: "Task started in background" })).catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
  if (message.type === "STOP_TASK") {
    stopTask().then(() => sendResponse({ success: true, message: "Task stopped" })).catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
  if (message.type === "GET_TASK_STATE") {
    const state = getTaskState();
    sendResponse({ success: true, state });
    return true;
  }
  if (message.type === "CLEAR_TASK_HISTORY") {
    clearTaskHistory();
    sendResponse({ success: true, message: "Task history cleared" });
    return true;
  }
  if (message.type === "CHECK_TASK_STATUS") {
    chrome.storage.local.get(["taskRunning", "taskTabId"], (result: TaskStatus) => {
      const isRunning = result.taskRunning === true;
      const isTaskTab = sender.tab?.id === result.taskTabId;
      sendResponse({ success: true, isRunning, isTaskTab });
    });
    return true;
  }
  if (message.type === "OPEN_SIDEBAR_FROM_WEBSITE") return handleOpenSidebarInternal(sendResponse);
  if (message.type === "OPEN_WIZARD_TAB_FROM_WEBSITE") { handleOpenWizardTabFromWebsite(sendResponse); return true; }
  if (message.type === "SET_AUTH_SESSION" || message.type === "SIGN_OUT" || message.type === "GET_AUTH_STATUS") return handleAuthMessage(message, sender, sendResponse);
  if (message.type === "RUN_COMMAND_FROM_WEBSITE") { handleRunCommandFromWebsite(message.command, sendResponse); return true; }
  if (message.type === "RUN_WIZARD_FROM_WEBSITE") { handleRunWizardFromWebsite(message.command, sendResponse); return true; }
});
