// stability.ts - Advanced page stability checking with multiple verification methods

// ============================================================================
// Interface for tab loading state
// ============================================================================

interface TabLoadingState {
  isLoading: boolean;
  status: string;
  url?: string;
}

// ============================================================================
// Check if tab is currently loading using Chrome tabs API
// ============================================================================

async function getTabLoadingState(tabId: number): Promise<TabLoadingState> {
  return new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        resolve({ isLoading: true, status: "error" });
        return;
      }

      resolve({
        isLoading: tab.status === "loading",
        status: tab.status || "unknown",
        url: tab.url,
      });
    });
  });
}

// ============================================================================
// Wait for tab to finish loading using Chrome tabs API
// ============================================================================

async function waitForTabComplete(
  tabId: number,
  maxWaitTime: number
): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let isResolved = false;

    const listener = (
      updatedTabId: number,
      changeInfo: chrome.tabs.TabChangeInfo
    ) => {
      if (
        updatedTabId === tabId &&
        changeInfo.status === "complete" &&
        !isResolved
      ) {
        isResolved = true;
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(true);
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    // Check current status first
    getTabLoadingState(tabId).then((state) => {
      if (!state.isLoading && state.status === "complete" && !isResolved) {
        isResolved = true;
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(true);
      }
    });

    // Fallback timeout
    setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        chrome.tabs.onUpdated.removeListener(listener);
        console.warn(
          `Tab ${tabId} did not complete loading within ${maxWaitTime}ms, proceeding anyway`
        );
        resolve(false);
      }
    }, maxWaitTime);
  });
}

// ============================================================================
// Check DOM readiness by injecting a content script
// ============================================================================

async function checkDOMReadiness(tabId: number): Promise<boolean> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        return {
          readyState: document.readyState,
          hasContent: document.body && document.body.children.length > 0,
          isLoading: document.readyState === "loading",
        };
      },
    });

    if (results && results[0] && results[0].result) {
      const { readyState, hasContent, isLoading } = results[0].result;
      return readyState === "complete" && hasContent && !isLoading;
    }

    return false;
  } catch (error) {
    console.warn("DOM readiness check failed:", error);
    return true; // Assume ready if we can't check
  }
}

// ============================================================================
// Poll for DOM stability - wait for DOM to be ready and stable
// ============================================================================

async function pollForDOMStability(
  tabId: number,
  maxWaitTime: number
): Promise<void> {
  const POLL_INTERVAL = 100;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const isDOMReady = await checkDOMReadiness(tabId);
      if (isDOMReady) {
        return; // DOM is ready and stable
      }
    } catch (error) {
      console.warn("DOM stability check error:", error);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }

  console.warn(
    `DOM stability polling timed out after ${maxWaitTime}ms for tab ${tabId}`
  );
}

// ============================================================================
// Advanced page stability check with multiple verification methods
// 1. Wait for Chrome tab status to be 'complete'
// 2. Verify DOM readiness and content presence
// 3. Add additional buffer time for final stability
// ============================================================================

export async function ensurePageStability(tabId: number): Promise<void> {
  const MAX_WAIT_TIME = 5000;
  const ADDITIONAL_BUFFER = 1000;
  const FALLBACK_TIMEOUT = 2000;

  console.log(`Starting page stability check for tab ${tabId}`);

  try {
    // Step 1: Wait for tab loading to complete
    console.log("Waiting for tab loading to complete...");
    const tabCompleted = await waitForTabComplete(tabId, MAX_WAIT_TIME);

    if (!tabCompleted) {
      console.warn(
        "Tab did not complete loading within time limit, using fallback timeout"
      );
      await new Promise((resolve) => setTimeout(resolve, FALLBACK_TIMEOUT));
      return;
    }

    console.log("Tab loading completed, checking DOM readiness...");

    // Step 2: Poll for DOM readiness and stability
    await pollForDOMStability(tabId, 2000); // Give DOM time to stabilize

    console.log("DOM appears stable, adding buffer time...");

    // Step 3: Add additional buffer time for final stability
    await new Promise((resolve) => setTimeout(resolve, ADDITIONAL_BUFFER));

    console.log(`Page stability check completed for tab ${tabId}`);
  } catch (error) {
    console.error("Error during page stability check:", error);
    console.log("Falling back to simple timeout");

    // Fallback to simple timeout if advanced checks fail
    await new Promise((resolve) => setTimeout(resolve, FALLBACK_TIMEOUT));
  }
}
