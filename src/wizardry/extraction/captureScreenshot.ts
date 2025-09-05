/**
 * Screenshot meta for
 */

export interface ScreenshotData {
  dataUrl: string;
  timestamp: string;
  tabId: number;
  url?: string;
}

export async function captureScreenshot(
  targetTabId?: number
): Promise<ScreenshotData | null> {
  try {
    const resp: any = await chrome.runtime.sendMessage({
      type: "CAPTURE_SCREENSHOT",
      tabId: targetTabId,
    });
    if (!resp || resp.success !== true) {
      return null;
    }

    let tabInfo: chrome.tabs.Tab | undefined;
    if (typeof targetTabId === "number") {
      try {
        tabInfo = await new Promise<chrome.tabs.Tab | undefined>((resolve) => {
          chrome.tabs.get(targetTabId, (tab) => resolve(tab));
        });
      } catch {}
    } else {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      tabInfo = tabs && tabs[0];
    }

    return {
      dataUrl: resp.dataUrl,
      timestamp: resp.timestamp,
      tabId: (tabInfo && tabInfo.id) || 0,
      url: tabInfo?.url,
    } as ScreenshotData;
  } catch {
    return null;
  }
}

export function handleCaptureScreenshot(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): boolean {
  const targetTabId = (message && (message as any).tabId) as number | undefined;

  const doCapture = (windowId: number, onFinalize?: () => void) => {
    try {
      chrome.tabs.captureVisibleTab(
        windowId,
        { format: "png", quality: 85 },
        (dataUrl) => {
          const finalize = () => {
            try {
              typeof onFinalize === "function" && onFinalize();
            } catch {}
          };
          if (chrome.runtime.lastError || !dataUrl) {
            finalize();
            sendResponse({
              success: false,
              error: chrome.runtime.lastError?.message || "Capture failed",
            });
          } else {
            finalize();
            sendResponse({
              success: true,
              dataUrl,
              timestamp: new Date().toISOString(),
            });
          }
        }
      );
    } catch (e: any) {
      try {
        typeof onFinalize === "function" && onFinalize();
      } catch {}
      sendResponse({ success: false, error: e?.message || "Unexpected error" });
    }
  };

  if (typeof targetTabId === "number") {
    chrome.tabs.get(targetTabId, (targetTab) => {
      if (chrome.runtime.lastError || !targetTab) {
        sendResponse({
          success: false,
          error: chrome.runtime.lastError?.message || "Target tab not found",
        });
        return;
      }

      const url = targetTab.url || "";
      const isRestrictedUrl =
        url.startsWith("chrome://") ||
        url.startsWith("chrome-extension://") ||
        url.startsWith("edge://") ||
        url.startsWith("about:") ||
        url.startsWith("https://chrome.google.com/webstore");
      if (isRestrictedUrl) {
        sendResponse({
          success: false,
          error: "Cannot capture screenshots on browser internal pages",
        });
        return;
      }

      chrome.windows.getLastFocused((prevFocusedWindow) => {
        const prevFocusedWindowId = prevFocusedWindow?.id;
        chrome.tabs.query(
          { active: true, windowId: targetTab.windowId! },
          (activeTabsInTargetWindow) => {
            const prevActiveInTarget =
              activeTabsInTargetWindow && activeTabsInTargetWindow[0];
            const needsSwitch =
              !prevActiveInTarget || prevActiveInTarget.id !== targetTab.id;

            const switchToTarget = (cb: () => void) => {
              if (!needsSwitch) {
                cb();
                return;
              }
              try {
                chrome.windows.update(
                  targetTab.windowId!,
                  { focused: true },
                  () => {
                    let done = false;
                    const onActivated = (
                      activeInfo: chrome.tabs.TabActiveInfo
                    ) => {
                      if (activeInfo.tabId === targetTab.id && !done) {
                        done = true;
                        chrome.tabs.onActivated.removeListener(onActivated);
                        cb();
                      }
                    };
                    chrome.tabs.onActivated.addListener(onActivated);
                    chrome.tabs.update(targetTab.id!, { active: true }, () => {
                      setTimeout(() => {
                        if (!done) {
                          done = true;
                          try {
                            chrome.tabs.onActivated.removeListener(onActivated);
                          } catch {}
                          cb();
                        }
                      }, 50);
                    });
                  }
                );
              } catch {
                cb();
              }
            };

            const restorePrevious = () => {
              if (!needsSwitch) return;
              try {
                if (
                  prevActiveInTarget &&
                  prevActiveInTarget.id !== targetTab.id
                ) {
                  chrome.tabs.update(prevActiveInTarget.id!, { active: true });
                }
                if (
                  typeof prevFocusedWindowId === "number" &&
                  prevFocusedWindowId !== targetTab.windowId
                ) {
                  chrome.windows.update(prevFocusedWindowId, { focused: true });
                }
              } catch {}
            };

            switchToTarget(() => {
              doCapture(targetTab.windowId!, restorePrevious);
            });
          }
        );
      });
    });
    return true; // async response
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const currentTab = tabs[0];
      const url = currentTab.url || "";
      const isRestrictedUrl =
        url.startsWith("chrome://") ||
        url.startsWith("chrome-extension://") ||
        url.startsWith("edge://") ||
        url.startsWith("about:") ||
        url.startsWith("https://chrome.google.com/webstore");

      if (isRestrictedUrl) {
        sendResponse({
          success: false,
          error: "Cannot capture screenshots on browser internal pages",
        });
        return;
      }

      doCapture(currentTab.windowId!);
    } else {
      sendResponse({ success: false, error: "No active tab" });
    }
  });
  return true; // async response
}
