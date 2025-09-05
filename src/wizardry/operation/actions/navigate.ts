/**
 * navigate.ts
 *
 * Navigation functionality for DOM operations
 */

import { CONFIG } from "../toolkit/config";
import { useAppState } from "../../../state";

/**
 * Navigate to a URL
 */
export async function navigate(payload: { url: string }): Promise<void> {
  const tabId = useAppState.getState().taskManager.tabId;
  const targetUrl = payload.url;

  return new Promise((resolve, reject) => {
    const { WAIT_AFTER_COMPLETE } = CONFIG.NAVIGATION;

    const listener = (
      updatedTabId: number,
      changeInfo: chrome.tabs.TabChangeInfo
    ) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(resolve, WAIT_AFTER_COMPLETE);
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    chrome.tabs.update(tabId, { url: targetUrl }, (tab) => {
      if (chrome.runtime.lastError) {
        chrome.tabs.onUpdated.removeListener(listener);
        reject(
          new Error(`Navigation failed: ${chrome.runtime.lastError.message}`)
        );
      }
    });
  });
}
