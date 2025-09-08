import { CursorSimulator } from "./cursor";
import "./content.styles.css";

const checkIfTaskIsRunning = async (): Promise<boolean> => {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "CHECK_TASK_STATUS",
    });
    // Only show cursor if task is running AND this is the task tab
    return (response?.isRunning && response?.isTaskTab) || false;
  } catch (error) {
    console.log("Could not check task status:", error);
    return false;
  }
};

(async () => {
  try {
    if (document.readyState !== "complete") {
      await new Promise<void>((resolve) => {
        window.addEventListener("load", () => resolve(), { once: true });
      });
    }

    const existingCursor = (window as any).__superwizardCursor;
    if (existingCursor) existingCursor.destroy();

    const cursor = new CursorSimulator({
      size: 14,
      color: "var(--superwizard-brand-primary, #1D7BA7)",
      zIndex: 2147483647,
    });
    cursor.initialize();
    (window as any).__superwizardCursor = cursor;

    const updateCursorVisibility = async () => {
      const isTaskRunning = await checkIfTaskIsRunning();
      const cursorInstance = (window as any).__superwizardCursor;
      if (cursorInstance) cursorInstance.setVisibility(isTaskRunning);
    };

    await updateCursorVisibility();
    (window as any).__superwizardVisibilityInterval = setInterval(
      updateCursorVisibility,
      2000
    );

    ["visibilitychange", "focus"].forEach((eventType) => {
      const target = eventType === "visibilitychange" ? document : window;
      target.addEventListener(eventType, async () => {
        if (
          eventType !== "visibilitychange" ||
          document.visibilityState === "visible"
        ) {
          const cursorInstance = (window as any).__superwizardCursor;
          if (cursorInstance) {
            cursorInstance.initialize();
            await updateCursorVisibility();
          }
        }
      });
    });
  } catch (error) {
    console.error("Failed to initialize cursor:", error);
  }
})();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TASK_STARTED" || message.type === "TASK_STOPPED") {
    // Only respond to cursor visibility changes if this message is targeted at this tab
    // The TaskManager sends these messages specifically to the task tab
    const cursor = (window as any).__superwizardCursor;
    const isStarted = message.type === "TASK_STARTED";
    if (cursor) cursor.setVisibility(isStarted);
    sendResponse({ success: true });
  }
  return true;
});

window.addEventListener("message", (event) => {
  const trustedOrigins = [
    "file://",
    "https://www.superwizard.ai/*",
    "https://lockheed-web.vercel.app", // Production server
  ];
  const isTrusted = trustedOrigins.some(
    (origin) => event.origin === origin || event.origin.startsWith(origin)
  );

  if (!isTrusted) return;

  if (event.data.type === "SUPERWIZARD_OPEN_SIDEBAR") {
    chrome.runtime.sendMessage({
      type: "OPEN_SIDEBAR_FROM_WEBSITE",
      source: event.data.source,
    });
  } else if (event.data.type === "SUPERWIZARD_RUN_COMMAND") {
    chrome.runtime.sendMessage({
      type: "RUN_COMMAND_FROM_WEBSITE",
      command: event.data.command,
      source: event.data.source,
    });
  } else if (event.data.type === "SUPERWIZARD_TO_EXTENSION") {
    // Forward messages from web app to extension
    const message = event.data.data;
    
    // Add response handling
    if (message.type === "PING") {
      window.postMessage({
        type: "SUPERWIZARD_FROM_EXTENSION",
        responseId: message.id,
        response: {
          success: true,
          extensionId: chrome.runtime.id,
          version: chrome.runtime.getManifest().version
        }
      }, "*");
    } else if (message.type === "SET_AUTH_SESSION" || 
               message.type === "SIGN_OUT" || 
               message.type === "GET_AUTH_STATUS") {
      // Forward auth messages to background script via internal messaging
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Failed to send message to background:", chrome.runtime.lastError);
          window.postMessage({
            type: "SUPERWIZARD_FROM_EXTENSION",
            responseId: message.id,
            response: { success: false, error: chrome.runtime.lastError.message }
          }, "*");
        } else {
          window.postMessage({
            type: "SUPERWIZARD_FROM_EXTENSION",
            responseId: message.id,
            response: response || { success: false, error: "No response" }
          }, "*");
        }
      });
    }
  }
});
