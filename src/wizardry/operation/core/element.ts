import { useAppState } from "../../../state";
import { NODE_ID_SELECTOR } from "../constants";

/**
 * Execute a function in the context of the active tab with timeout protection
 */
export async function executeScript<T>(
  func: (...args: any[]) => T,
  ...args: any[]
): Promise<T> {
  const tabId = useAppState.getState().taskManager.tabId;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Script execution timed out after 10 seconds`)),
        10000
      );
    });

    const result = await Promise.race([
      chrome.scripting.executeScript({ target: { tabId }, func, args }),
      timeoutPromise,
    ]);

    if (!result?.[0]) throw new Error("Script execution returned no result");
    return result[0].result as T;
  } catch (error) {
    console.error("Error executing script:", error);

    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("timed out"))
      throw new Error("Script execution timed out - page may be unresponsive");
    if (message.includes("Cannot access"))
      throw new Error("Cannot access tab - page may have navigated");
    if (message.includes("No tab with id"))
      throw new Error("Tab no longer exists");

    throw new Error(`Script execution failed: ${message}`);
  }
}

/**
 * Get element by its unique node ID
 */
export async function getElementByNodeId(
  elementId: number
): Promise<{ uniqueId: string; element: any }> {
  const uniqueId = await executeScript((elementId: number) => {
    const NODE_ID_SELECTOR = "data-node-id";
    const currentElements = (window as any).__superwizard_elements || [];
    const element = currentElements[elementId];

    if (!element) return null;

    let uniqueId = element.getAttribute(NODE_ID_SELECTOR);
    if (uniqueId) return uniqueId;

    uniqueId = Math.random().toString(36).substring(2, 10);
    element.setAttribute(NODE_ID_SELECTOR, uniqueId);
    return uniqueId;
  }, elementId);

  if (!uniqueId) {
    throw new Error(`Element ${elementId} not found or removed from page`);
  }

  const element = await executeScript(
    (uniqueId: string, selector: string) => {
      return document.querySelector(`[${selector}="${uniqueId}"]`);
    },
    uniqueId,
    NODE_ID_SELECTOR
  );

  if (!element) {
    throw new Error(`Element with ID ${elementId} not found in DOM`);
  }

  return { uniqueId, element };
}
