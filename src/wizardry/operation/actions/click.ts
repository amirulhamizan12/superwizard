// click.ts - Click functionality for DOM operations

import { sleep, executeWithCursor, ensureCursorCentered } from "../shared/utils";
import { executeScript, getElementByNodeId } from "../core/element";
import { getCenterCoordinates, scrollWaitAndGetCoordinates, scrollElementIntoView } from "../core/positioning";
import { ClickResult, ElementCoordinates } from "../shared/types";
import { NODE_ID_SELECTOR } from "../constants";

interface ClickContext {
  scrollAttempted: boolean;
  scrollSuccess: boolean;
  scrollPartialSuccess: boolean;
  coordinatesObtained: boolean;
  coordinates: ElementCoordinates | null;
  cursorMoved: boolean;
  primaryClickAttempted: boolean;
  backupClickAttempted: boolean;
  lastError: string | null;
}

// ============================================================================
// Attempt cursor movement to element coordinates
// ============================================================================

async function attemptCursorMovement(
  elementId: number,
  ctx: ClickContext
): Promise<void> {
  try {
    if (ctx.coordinates) {
      ctx.cursorMoved = await executeWithCursor(
        ctx.coordinates.x,
        ctx.coordinates.y,
        "click"
      );
    }
  } catch (cursorError) {
    ctx.lastError = `Cursor movement failed: ${
      cursorError instanceof Error ? cursorError.message : String(cursorError)
    }`;
  }
}

// ============================================================================
// Click on an element
// ============================================================================

export async function click(payload: { elementId: number }): Promise<void> {
  const elementId = payload.elementId;
  const ctx: ClickContext = {
    scrollAttempted: false,
    scrollSuccess: false,
    scrollPartialSuccess: false,
    coordinatesObtained: false,
    coordinates: null,
    cursorMoved: false,
    primaryClickAttempted: false,
    backupClickAttempted: false,
    lastError: null,
  };

  try {
    let useBackupMethod = false;

    try {
      // Use the reliable scroll-wait-calculate approach for consistent coordinates
      ctx.scrollAttempted = true;
      ctx.coordinates = await scrollWaitAndGetCoordinates(
        elementId,
        true // Always use accuracy mode
      );
      ctx.coordinatesObtained = true;
      ctx.scrollSuccess = true;
      ctx.scrollPartialSuccess = true;

      console.log(
        `Coordinates obtained: (${ctx.coordinates.x}, ${ctx.coordinates.y}) for element ${elementId}`
      );
    } catch (coordError) {
      ctx.lastError = `Coordinate calculation failed: ${
        coordError instanceof Error ? coordError.message : String(coordError)
      }`;

      // If scroll-wait-coordinate fails, try manual scroll + coordinate approach
      try {
        console.log(
          `Falling back to manual scroll approach for element ${elementId}`
        );
        const scrollResult = await scrollElementIntoView(elementId);
        ctx.scrollSuccess = scrollResult.success;
        ctx.scrollPartialSuccess = scrollResult.isPartiallyVisible || false;

        if (scrollResult.success || scrollResult.isPartiallyVisible) {
          // Wait for stability and get coordinates
          await sleep(1000);
          ctx.coordinates = await getCenterCoordinates(elementId);
          ctx.coordinatesObtained = true;
        } else {
          ctx.lastError = `Scroll failed: ${scrollResult.reason}`;
          useBackupMethod = true;
        }
      } catch (fallbackError) {
        ctx.lastError = `Fallback coordinate calculation failed: ${
          fallbackError instanceof Error
            ? fallbackError.message
            : String(fallbackError)
        }`;
        useBackupMethod = true;
      }
    }

    // **PRIMARY METHOD: Move cursor to coordinates and perform click**
    if (ctx.coordinates && !useBackupMethod) {
      try {
        // Move cursor to the element coordinates first
        await attemptCursorMovement(elementId, ctx);

        ctx.primaryClickAttempted = true;

        // Perform the click using standard DOM events at the cursor location
        const clickSuccess = await executeScript(
          (x: number, y: number) => {
            // Set global flag to indicate AI click is in progress
            (window as any).__superwizardAIClickInProgress = true;
            
            const element = document.elementFromPoint(x, y);
            if (!element) {
              (window as any).__superwizardAIClickInProgress = false;
              return false;
            }

            const eventOptions = {
              bubbles: true,
              cancelable: true,
              view: window,
              clientX: x,
              clientY: y,
              detail: 1,
            };

            // Dispatch all relevant mouse events in sequence
            const mousedownEvent = new MouseEvent("mousedown", eventOptions);
            const clickEvent = new MouseEvent("click", eventOptions);
            const mouseupEvent = new MouseEvent("mouseup", eventOptions);
            
            // Mark these events as AI-initiated to prevent task interruption
            (mousedownEvent as any).__superwizardAIClick = true;
            (clickEvent as any).__superwizardAIClick = true;
            (mouseupEvent as any).__superwizardAIClick = true;
            
            element.dispatchEvent(mousedownEvent);
            element.dispatchEvent(clickEvent);
            element.dispatchEvent(mouseupEvent);

            // Clear the flag after a short delay to ensure all event handlers have processed
            setTimeout(() => {
              (window as any).__superwizardAIClickInProgress = false;
            }, 100);

            return true;
          },
          ctx.coordinates.x,
          ctx.coordinates.y
        );

        if (!clickSuccess) {
          throw new Error("No element found at the specified coordinates");
        }

        await sleep(10); // Reduced from CONFIG.CLICK.WAIT_AFTER_CLICK (50ms) to 10ms for faster response

        // Ensure cursor is perfectly centered after click completion
        await ensureCursorCentered(elementId);

        return; // If successful, return early
      } catch (clickError) {
        ctx.lastError = `Primary click failed: ${
          clickError instanceof Error ? clickError.message : String(clickError)
        }`;
        useBackupMethod = true;
      }
    }

    // Backup click method - used when scroll fails, coordinates fail, or primary click fails
    ctx.backupClickAttempted = true;

    // Minimal delay to allow any animations or state changes to complete
    await sleep(10); // Reduced from 50ms to 10ms for faster response

    // Get element reference for backup method
    let uniqueId: string;
    try {
      const elementRef = await getElementByNodeId(elementId);
      uniqueId = elementRef.uniqueId;
    } catch (elementError) {
      ctx.lastError = `Element lookup failed in backup method: ${
        elementError instanceof Error
          ? elementError.message
          : String(elementError)
      }`;
      throw new Error(buildClickErrorMessage(elementId, ctx));
    }

    // Execute backup click operation in the context of the page
    const clickResult = await executeScript<ClickResult>(
      (uniqueId: string, selector: string) => {
        // Set global flag to indicate AI click is in progress
        (window as any).__superwizardAIClickInProgress = true;
        
        const element = document.querySelector(`[${selector}="${uniqueId}"]`);
        if (!element) {
          (window as any).__superwizardAIClickInProgress = false;
          return { success: false, reason: "Element not found" };
        }

        // Enhanced element detection for complex React components like GitHub
        const findActualInputElement = (el: HTMLElement): HTMLElement => {
          // If it's already an input or textarea, return it
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            return el;
          }

          // Look for nested input elements in common React component patterns
          const inputSelectors = [
            'input[type="text"]',
            'input[type="email"]', 
            'input[type="password"]',
            'input[type="search"]',
            'input[type="url"]',
            'input:not([type])', // input without type defaults to text
            'textarea',
            '[contenteditable="true"]',
            '[contenteditable=""]',
            'input[data-component="input"]', // GitHub specific
            'input.prc-components-Input-Ic-y8', // GitHub specific
            'input[aria-required="true"]',
            'input[aria-describedby]'
          ];

          for (const selector of inputSelectors) {
            const inputEl = el.querySelector(selector) as HTMLElement;
            if (inputEl && isElementVisible(inputEl)) {
              return inputEl;
            }
          }

          // If no nested input found, check if the element itself is focusable
          if (el.tabIndex >= 0 || el.contentEditable === 'true' || el.contentEditable === '') {
            return el;
          }

          // Last resort: return the original element
          return el;
        };

        const isElementVisible = (el: HTMLElement): boolean => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return !(
            rect.width === 0 ||
            rect.height === 0 ||
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0'
          );
        };

        // Find the actual input element for clicking
        const actualElement = findActualInputElement(element as HTMLElement) as HTMLElement;

        try {
          // Special handling for dropdown/combobox/select elements
          const role = actualElement.getAttribute("role");
          const tagName = actualElement.tagName.toLowerCase();
          const ariaLabel = actualElement.getAttribute("aria-label");

          // Check if this is a dropdown option or combobox element
          if (
            role === "option" ||
            tagName === "option" ||
            (role === "combobox" && element.getAttribute("aria-expanded")) ||
            ariaLabel?.includes("option:")
          ) {
            // Method 1: Handle select dropdown options
            if (
              tagName === "option" &&
              element.parentElement?.tagName.toLowerCase() === "select"
            ) {
              const select = element.parentElement as HTMLSelectElement;
              const option = element as HTMLOptionElement;
              option.selected = true;
              select.value = option.value;

              // Dispatch change events
              select.dispatchEvent(
                new Event("change", { bubbles: true, cancelable: true })
              );
              select.dispatchEvent(
                new Event("input", { bubbles: true, cancelable: true })
              );
              
              // Clear the flag after a short delay
              setTimeout(() => {
                (window as any).__superwizardAIClickInProgress = false;
              }, 100);
              
              return { success: true, method: "select-option" };
            }

            // Method 2: Handle ARIA combobox pattern
            if (role === "option") {
              // Look for parent combobox or listbox
              const combobox =
                element.closest('[role="combobox"]') ||
                document.querySelector('[aria-controls][aria-expanded="true"]');

              if (combobox) {
                // Set the value if it's an input
                if (combobox.tagName.toLowerCase() === "input") {
                  (combobox as HTMLInputElement).value =
                    element.textContent?.trim() || "";
                  combobox.dispatchEvent(
                    new Event("input", { bubbles: true, cancelable: true })
                  );
                  combobox.dispatchEvent(
                    new Event("change", { bubbles: true, cancelable: true })
                  );
                }

                // Set aria-selected on the option
                element.setAttribute("aria-selected", "true");

                // Remove aria-selected from siblings
                const siblings =
                  element.parentElement?.querySelectorAll('[role="option"]');
                siblings?.forEach((sibling) => {
                  if (sibling !== element) {
                    sibling.setAttribute("aria-selected", "false");
                  }
                });

                // Close the dropdown
                combobox.setAttribute("aria-expanded", "false");
              }

              // Always try clicking the option as well
              (element as HTMLElement).click();
              
              // Clear the flag after a short delay
              setTimeout(() => {
                (window as any).__superwizardAIClickInProgress = false;
              }, 100);
              
              return { success: true, method: "aria-option" };
            }

            // Method 3: Handle custom dropdown patterns
            if (role === "combobox" || element.getAttribute("aria-haspopup")) {
              // If this is the combobox trigger, we need to find and click the specific option
              const expanded = element.getAttribute("aria-expanded") === "true";

              if (!expanded) {
                // First open the dropdown
                (element as HTMLElement).click();
                
                // Clear the flag after a short delay
                setTimeout(() => {
                  (window as any).__superwizardAIClickInProgress = false;
                }, 100);
                
                return { success: true, method: "combobox-open" };
              }
            }
          }

          // Try multiple click methods in sequence for maximum compatibility

          // Method 1: Native click() for standard elements
          if (actualElement instanceof HTMLElement) {
            actualElement.click();
            // Clear the flag after a short delay
            setTimeout(() => {
              (window as any).__superwizardAIClickInProgress = false;
            }, 100);
            return { success: true, method: "native" };
          }

          // Method 2: Dispatch click event
          const clickEvent = new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
          });
          // Mark as AI-initiated to prevent task interruption
          (clickEvent as any).__superwizardAIClick = true;
          (actualElement as HTMLElement).dispatchEvent(clickEvent);

          // Method 3: Try mousedown + mouseup sequence (more realistic)
          const mouseDownEvent = new MouseEvent("mousedown", {
            bubbles: true,
            cancelable: true,
            view: window,
          });
          const mouseUpEvent = new MouseEvent("mouseup", {
            bubbles: true,
            cancelable: true,
            view: window,
          });
          // Mark as AI-initiated to prevent task interruption
          (mouseDownEvent as any).__superwizardAIClick = true;
          (mouseUpEvent as any).__superwizardAIClick = true;
          (actualElement as HTMLElement).dispatchEvent(mouseDownEvent);
          (actualElement as HTMLElement).dispatchEvent(mouseUpEvent);

          // Method 4: Try jQuery click if available
          if (
            (window as any).jQuery &&
            (window as any).jQuery(actualElement).trigger
          ) {
            (window as any).jQuery(actualElement).trigger("click");
          }

          // Method 5: Try invoking onclick handler directly
          if (typeof (actualElement as any).onclick === "function") {
            (actualElement as any).onclick();
          }

          // Clear the flag after a short delay
          setTimeout(() => {
            (window as any).__superwizardAIClickInProgress = false;
          }, 100);
          
          return { success: true, method: "fallback" };
        } catch (error) {
          // Clear the flag on error
          setTimeout(() => {
            (window as any).__superwizardAIClickInProgress = false;
          }, 100);
          
          return {
            success: false,
            reason: error instanceof Error ? error.message : String(error),
            method: "failed",
          };
        }
      },
      uniqueId,
      NODE_ID_SELECTOR
    );

    if (!clickResult.success) {
      ctx.lastError = `Backup click method failed: ${clickResult.reason}`;
      throw new Error(buildClickErrorMessage(elementId, ctx));
    }

    await sleep(50);

    // Ensure cursor is perfectly centered after backup click completion
    await ensureCursorCentered(elementId);
  } catch (error: any) {
    // If it's already our detailed error, re-throw it
    if (
      error.message &&
      error.message.includes("Click operation failed for element")
    ) {
      throw error;
    }

    // Otherwise, build a detailed error message
    ctx.lastError = error.message || String(error);
    throw new Error(buildClickErrorMessage(elementId, ctx));
  }
}

// ============================================================================
// Build a detailed error message for click failures
// ============================================================================

function buildClickErrorMessage(elementId: number, ctx: ClickContext): string {
  let message = `Click operation failed for element ${elementId}. `;

  // Add scroll information
  if (ctx.scrollAttempted) {
    if (ctx.scrollSuccess) {
      message += "Scroll: ✓ Successful. ";
    } else if (ctx.scrollPartialSuccess) {
      message += "Scroll: ⚠ Partially successful. ";
    } else {
      message += "Scroll: ✗ Failed. ";
    }
  } else {
    message += "Scroll: Not attempted. ";
  }

  // Add coordinate information
  if (ctx.coordinatesObtained) {
    message += `Coordinates: ✓ Obtained (${ctx.coordinates?.x}, ${ctx.coordinates?.y}). `;
  } else {
    message += "Coordinates: ✗ Failed to obtain. ";
  }

  // Add cursor movement information
  message += `Cursor: ${ctx.cursorMoved ? "✓ Moved" : "✗ Not moved"}. `;

  // Add click method information
  if (ctx.primaryClickAttempted && ctx.backupClickAttempted) {
    message += "Methods: Both primary and backup failed. ";
  } else if (ctx.primaryClickAttempted) {
    message += "Methods: Primary failed, backup not attempted. ";
  } else if (ctx.backupClickAttempted) {
    message += "Methods: Primary skipped, backup failed. ";
  } else {
    message += "Methods: Neither primary nor backup attempted. ";
  }

  // Add the last error
  if (ctx.lastError) {
    message += `Last error: ${ctx.lastError}`;
  }

  return message;
}
