import { CursorSimulator } from "./cursor";
import { BorderEffectSimulator } from "./border";
import { faviconManager } from "./tab";
import "./content.styles.css";

// ═══════════════════════════════════════════════════════════════════════════
// § TASK STATUS CHECKER
// ═══════════════════════════════════════════════════════════════════════════
const checkIfTaskIsRunning = async (): Promise<boolean> => {
  try {
    const response = await chrome.runtime.sendMessage({ type: "CHECK_TASK_STATUS" });
    return (response?.isRunning && response?.isTaskTab) || false;
  } catch (error) { console.log("Could not check task status:", error); return false; }
};

// ═══════════════════════════════════════════════════════════════════════════
// § TASK INTERRUPTION HANDLER
// ═══════════════════════════════════════════════════════════════════════════
class TaskInterruptionHandler {
  private isTaskRunning = false;
  private clickHandler: ((event: MouseEvent) => void) | null = null;
  constructor() { this.setupEventHandlers(); }
  private setupEventHandlers() {
    this.clickHandler = (event: MouseEvent) => {
      const isAIClick = (event as any).__superwizardAIClick === true;
      const isAIClickInProgress = (window as any).__superwizardAIClickInProgress === true;
      if (this.isTaskRunning && event.isTrusted && !isAIClick && !isAIClickInProgress) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        chrome.runtime.sendMessage({ type: "STOP_TASK" }).catch(error => console.error("Failed to send stop task message:", error));
        console.log("🛑 Task stopped by user click");
      }
    };
    document.addEventListener('click', this.clickHandler, true);
  }
  public setTaskRunning(isRunning: boolean) {
    this.isTaskRunning = isRunning;
  }
  public destroy() {
    if (this.clickHandler) document.removeEventListener('click', this.clickHandler, true);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// § INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════
(async () => {
  try {
    if (document.readyState !== "complete") { await new Promise<void>((resolve) => window.addEventListener("load", () => resolve(), { once: true })); }
    const w = window as any;
    if (w.__superwizardCursor) w.__superwizardCursor.destroy();
    if (w.__superwizardBorderEffect) w.__superwizardBorderEffect.destroy();
    if (w.__superwizardTaskInterruptionHandler) w.__superwizardTaskInterruptionHandler.destroy();
    const cursor = new CursorSimulator({ size: 14, color: "var(--superwizard-brand-primary, #1D7BA7)", zIndex: 2147483647 });
    cursor.initialize();
    w.__superwizardCursor = cursor;
    const borderEffect = new BorderEffectSimulator({ color: "#1D7BA7", zIndex: 2147483646, opacity: 0.1, glowIntensity: 0.6, pulseSpeed: 2 });
    borderEffect.initialize();
    w.__superwizardBorderEffect = borderEffect;
    w.__superwizardTaskInterruptionHandler = new TaskInterruptionHandler();
    const updateCursorVisibility = async () => {
      const isTaskRunning = await checkIfTaskIsRunning();
      if (w.__superwizardCursor) w.__superwizardCursor.setVisibility(isTaskRunning);
      if (w.__superwizardBorderEffect) w.__superwizardBorderEffect.setVisibility(isTaskRunning);
      if (w.__superwizardTaskInterruptionHandler) w.__superwizardTaskInterruptionHandler.setTaskRunning(isTaskRunning);
    };
    await updateCursorVisibility();
    w.__superwizardVisibilityInterval = setInterval(updateCursorVisibility, 2000);
    ["visibilitychange", "focus"].forEach((eventType) => {
      const target = eventType === "visibilitychange" ? document : window;
      target.addEventListener(eventType, async () => {
        if (eventType !== "visibilitychange" || document.visibilityState === "visible") {
          if (w.__superwizardCursor) { w.__superwizardCursor.initialize(); await updateCursorVisibility(); }
          if (w.__superwizardBorderEffect) w.__superwizardBorderEffect.initialize();
          if (w.__superwizardTaskInterruptionHandler) w.__superwizardTaskInterruptionHandler.setTaskRunning(await checkIfTaskIsRunning());
        }
      });
    });
    // Hover detection to change border color from blue to red
    const defaultBorderColor = "#1D7BA7";
    const hoverBorderColor = "#FF0000";
    let hoverTimeout: NodeJS.Timeout | null = null;
    let isHovering = false;
    const handleMouseMove = () => {
      if (!isHovering) {
        isHovering = true;
        if (hoverTimeout) clearTimeout(hoverTimeout);
        if (w.__superwizardBorderEffect) w.__superwizardBorderEffect.setColor(hoverBorderColor);
      }
    };
    const handleMouseLeave = () => {
      isHovering = false;
      if (hoverTimeout) clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => {
        if (w.__superwizardBorderEffect) w.__superwizardBorderEffect.setColor(defaultBorderColor);
      }, 100);
    };
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("mouseleave", handleMouseLeave, true);
  } catch (error) { console.error("Failed to initialize cursor:", error); }
})();

// ═══════════════════════════════════════════════════════════════════════════
// § MESSAGE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const w = window as any;
  if (message.type === "TASK_STARTED" || message.type === "TASK_STOPPED") {
    const isStarted = message.type === "TASK_STARTED";
    if (w.__superwizardCursor) w.__superwizardCursor.setVisibility(isStarted);
    if (w.__superwizardBorderEffect) w.__superwizardBorderEffect.setVisibility(isStarted);
    if (w.__superwizardTaskInterruptionHandler) w.__superwizardTaskInterruptionHandler.setTaskRunning(isStarted);
    sendResponse({ success: true });
  }
  if (message.type === "CHANGE_FAVICON") {
    try { faviconManager.changeFavicon(message.faviconUrl); sendResponse({ success: true }); }
    catch (error) { console.error('Error changing favicon:', error); sendResponse({ success: false, error: (error as Error).message }); }
  }
  if (message.type === "PING") { sendResponse({ success: true, ready: true }); }
  return true;
});

// ═══════════════════════════════════════════════════════════════════════════
// § WINDOW MESSAGE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════
window.addEventListener("message", (event) => {
  const trustedOrigins = ["https://www.superwizard.ai"];
  const isTrusted = trustedOrigins.some(origin => event.origin === origin || event.origin.startsWith(origin));
  if (!isTrusted) return;
  if (event.data.type === "SUPERWIZARD_OPEN_SIDEBAR") { chrome.runtime.sendMessage({ type: "OPEN_SIDEBAR_FROM_WEBSITE", source: event.data.source }); }
  else if (event.data.type === "SUPERWIZARD_RUN_COMMAND") { chrome.runtime.sendMessage({ type: "RUN_COMMAND_FROM_WEBSITE", command: event.data.command, source: event.data.source }); }
  else if (event.data.type === "SUPERWIZARD_RUN_WIZARD") { chrome.runtime.sendMessage({ type: "RUN_WIZARD_FROM_WEBSITE", command: event.data.command, source: event.data.source }); }
  else if (event.data.type === "SUPERWIZARD_OPEN_WIZARD_TAB") { chrome.runtime.sendMessage({ type: "OPEN_WIZARD_TAB_FROM_WEBSITE", url: event.data.url, source: event.data.source }); }
  else if (event.data.type === "SUPERWIZARD_TO_EXTENSION") {
    const message = event.data.data;
    if (message.type === "PING") {
      window.postMessage({ type: "SUPERWIZARD_FROM_EXTENSION", responseId: message.id, response: { success: true, extensionId: chrome.runtime.id, version: chrome.runtime.getManifest().version } }, "*");
    } else if (message.type === "SET_AUTH_SESSION" || message.type === "SIGN_OUT" || message.type === "GET_AUTH_STATUS") {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Failed to send message to background:", chrome.runtime.lastError);
          window.postMessage({ type: "SUPERWIZARD_FROM_EXTENSION", responseId: message.id, response: { success: false, error: chrome.runtime.lastError.message } }, "*");
        } else { window.postMessage({ type: "SUPERWIZARD_FROM_EXTENSION", responseId: message.id, response: response || { success: false, error: "No response" } }, "*"); }
      });
    }
  }
});
