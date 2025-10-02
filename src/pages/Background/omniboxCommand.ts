// ═══════════════════════════════════════════════════════════════════════════
// § TYPES
// ═══════════════════════════════════════════════════════════════════════════
export interface CommandData { omnibox_command: string; omnibox_timestamp: number; website_new_tab?: boolean; website_tab_id?: number }

// ═══════════════════════════════════════════════════════════════════════════
// § OMNIBOX LISTENERS
// ═══════════════════════════════════════════════════════════════════════════
export function setupOmniboxListeners(): void {
  chrome.action.onClicked.addListener((tab: chrome.tabs.Tab) => { (chrome as any).sidePanel.open({ windowId: tab.windowId }); });
  chrome.omnibox.onInputEntered.addListener((text: string, disposition: chrome.omnibox.OnInputEnteredDisposition) => {
    console.log("Omnibox input entered:", text, "disposition:", disposition);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
      if (!tabs[0]) { console.error("No active tab found"); return; }
      const tab = tabs[0];
      console.log("Active tab found:", tab.id, tab.url);
      (chrome as any).sidePanel.open({ windowId: tab.windowId });
      console.log("Side panel opened/ensured open for window:", tab.windowId);
      if (text.trim()) {
        setTimeout(() => {
          const commandData: CommandData = { omnibox_command: text.trim(), omnibox_timestamp: Date.now() };
          chrome.storage.local.set(commandData, () => { console.log("Omnibox command stored (with delay):", commandData); });
        }, 100);
      }
      chrome.tabs.sendMessage(tab.id!, { type: "OMNIBOX_COMMAND", command: text.trim() })
        .then(() => console.log("Successfully sent message to content script"))
        .catch((error: Error) => console.log("Content script message failed (expected if not ready):", error.message));
    });
  });
}
