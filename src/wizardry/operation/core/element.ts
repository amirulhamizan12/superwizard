// element.ts - Core element management utilities for browser automation

import { useAppState } from "../../../state";
import { NODE_ID_SELECTOR } from "../constants";

// ============================================================================
// Execute a function in the context of the active tab with timeout protection
// ============================================================================

export async function executeScript<T>(
  func: (...args: any[]) => T,
  ...args: any[]
): Promise<T> {
  const tabId = useAppState.getState().taskManager.tabId;
  console.log(`[executeScript] Attempting to execute script on tab: ${tabId}`);

  if (!tabId || tabId === 0) {
    console.error("[executeScript] Invalid tabId:", tabId);
    console.error("[executeScript] Current taskManager state:", useAppState.getState().taskManager);
    throw new Error("Invalid tab ID - tab not set in state");
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Script execution timed out after 5 seconds`)),
        5000
      );
    });

    console.log(`[executeScript] Executing script on tab ${tabId}...`);
    const result = await Promise.race([
      chrome.scripting.executeScript({ target: { tabId }, func, args }),
      timeoutPromise,
    ]);

    if (!result?.[0]) {
      console.error("[executeScript] Script execution returned no result");
      throw new Error("Script execution returned no result");
    }

    console.log(`[executeScript] Script executed successfully on tab ${tabId}`);
    return result[0].result as T;
  } catch (error) {
    console.error(`[executeScript] Error executing script on tab ${tabId}:`, error);

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

// ============================================================================
// Retrieve element from storage, ensure unique ID, and get from DOM
// ============================================================================

export async function getElementByNodeId(
  elementId: number
): Promise<{ uniqueId: string; element: any }> {
  const uniqueId = await executeScript((elementId: number) => {
    const NODE_ID_SELECTOR = "data-node-id";
    const currentElements = (window as any).__superwizard_elements;
    
    // Handle both Map and Array for backward compatibility
    let element;
    if (currentElements instanceof Map) {
      element = currentElements.get(elementId);
      console.log(`Looking for element ID ${elementId} in Map, found:`, element ? element.tagName : 'null');
    } else if (Array.isArray(currentElements)) {
      element = currentElements[elementId];
      console.log(`Looking for element ID ${elementId} in Array (length: ${currentElements.length}), found:`, element ? element.tagName : 'null');
    } else {
      console.log(`No elements found, currentElements:`, currentElements);
      return null;
    }

    if (!element) {
      console.warn(`Element ${elementId} not found in storage`);
      return null;
    }

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
