// positioning.ts - Advanced element positioning and scrolling with coordinate calculation

import { sleep } from "../shared/utils";
import { ElementCoordinates, ScrollResult } from "../shared/types";
import { executeScript, getElementByNodeId } from "./element";
import { NODE_ID_SELECTOR } from "../constants";

// ============================================================================
// Find and scroll scrollable parent containers for an element
// ============================================================================

async function scrollScrollableParents(elementId: number): Promise<void> {
  const { uniqueId } = await getElementByNodeId(elementId);
  
  await executeScript(
    (uid: string, sel: string) => {
      const el = document.querySelector(`[${sel}="${uid}"]`);
      if (!el) return;

      const rect = el.getBoundingClientRect();
      let parent = el.parentElement;

      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        const hasOverflow = 
          style.overflow === 'auto' || 
          style.overflow === 'scroll' ||
          style.overflowX === 'auto' || 
          style.overflowX === 'scroll' ||
          style.overflowY === 'auto' || 
          style.overflowY === 'scroll';
        
        // Check if it has scrollable content
        if (hasOverflow || parent.scrollWidth > parent.clientWidth || parent.scrollHeight > parent.clientHeight) {
          // Try to scroll the parent to reveal the element
          const parentRect = parent.getBoundingClientRect();
          
          // Calculate how much to scroll
          const scrollLeft = parent.scrollLeft;
          const scrollTop = parent.scrollTop;
          const elementOffsetLeft = rect.left - parentRect.left + parent.scrollLeft;
          const elementOffsetTop = rect.top - parentRect.top + parent.scrollTop;
          
          // If element is to the left of visible area
          if (elementOffsetLeft < scrollLeft) {
            parent.scrollTo({ left: elementOffsetLeft - parentRect.width / 2, behavior: 'smooth' });
          }
          // If element is to the right of visible area
          else if (elementOffsetLeft + rect.width > scrollLeft + parentRect.width) {
            parent.scrollTo({ left: elementOffsetLeft + rect.width - parentRect.width / 2, behavior: 'smooth' });
          }
          
          // If element is above visible area
          if (elementOffsetTop < scrollTop) {
            parent.scrollTo({ top: elementOffsetTop - parentRect.height / 2, behavior: 'smooth' });
          }
          // If element is below visible area
          else if (elementOffsetTop + rect.height > scrollTop + parentRect.height) {
            parent.scrollTo({ top: elementOffsetTop + rect.height - parentRect.height / 2, behavior: 'smooth' });
          }
        }
        
        parent = parent.parentElement;
      }
    },
    uniqueId,
    NODE_ID_SELECTOR
  );
}

// ============================================================================
// Scroll element into viewport with smooth scrolling and visibility detection
// Enhanced with horizontal scrolling support and multiple scroll strategies
// ============================================================================

export async function scrollElementIntoView(
  elementId: number,
  smooth = true
): Promise<ScrollResult> {
  const { uniqueId } = await getElementByNodeId(elementId);
  const timeout = 500; // Increased for better visibility detection

  // Try scrolling parent containers first for off-screen elements
  try {
    await scrollScrollableParents(elementId);
    await sleep(200); // Wait for parent scroll to take effect
  } catch (err) {
    console.log('Failed to scroll parent containers:', err);
  }

  return await executeScript<Promise<ScrollResult>>(
    (uid: string, sel: string, smooth: boolean, timeout: number) => {
      const el = document.querySelector(`[${sel}="${uid}"]`);
      if (!el)
        return Promise.resolve({ success: false, reason: "Element not found" });

      const rect = el.getBoundingClientRect();
      const pos = {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      };

      if (rect.width <= 0 || rect.height <= 0) {
        return Promise.resolve({
          success: false,
          reason: "Element has no dimensions",
          position: pos,
        });
      }

      const { innerHeight: vh, innerWidth: vw } = window;
      const isFullyVisible =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= vh &&
        rect.right <= vw;

      // Check if element is already visible (fully or partially)
      // Enhanced to handle negative coordinates (off-screen elements)
      const isPartiallyVisible =
        rect.top < vh && rect.bottom > 0 && rect.left < vw && rect.right > 0;

      // Check if element is completely outside viewport in any direction
      const isCompletelyOffscreen = 
        rect.right < 0 || 
        rect.left > vw || 
        rect.bottom < 0 || 
        rect.top > vh;

      if (isFullyVisible) {
        return Promise.resolve({
          success: true,
          reason: "Already fully visible",
          position: pos,
          isFullyVisible: true,
          isPartiallyVisible: true,
          madeProgress: false,
        });
      }

      if (isPartiallyVisible) {
        return Promise.resolve({
          success: true,
          reason: "Already partially visible",
          position: pos,
          isFullyVisible: false,
          isPartiallyVisible: true,
          madeProgress: false,
        });
      }

      // If element is completely off-screen, try multiple scroll strategies
      if (isCompletelyOffscreen) {
        console.log('Element is completely off-screen, trying multiple scroll strategies');
        
        // Strategy 1: Try scrollIntoView with different options
        try {
          el.scrollIntoView({
            behavior: smooth ? "smooth" : "auto",
            block: "center",
            inline: "nearest", // Changed from "center" to "nearest" for better horizontal handling
          });
        } catch (error) {
          console.log('scrollIntoView failed, trying alternative');
        }

        // Wait a bit to see if first scroll worked
        return new Promise((resolve) => {
          setTimeout(() => {
            const newRect = el.getBoundingClientRect();
            const newFull =
              newRect.top >= 0 &&
              newRect.left >= 0 &&
              newRect.bottom <= vh &&
              newRect.right <= vw;
            const newPartial =
              newRect.top < vh &&
              newRect.bottom > 0 &&
              newRect.left < vw &&
              newRect.right > 0;
            const progress =
              Math.abs(newRect.top - rect.top) > 5 ||
              Math.abs(newRect.left - rect.left) > 5;

            // If first attempt didn't work well, try more aggressive scrolling
            if (!newFull && !newPartial && !progress) {
              try {
                // Strategy 2: Try scrolling inline to start (for left-offscreen elements)
                if (rect.right < 0 || rect.left < 0) {
                  el.scrollIntoView({
                    behavior: smooth ? "smooth" : "auto",
                    block: "nearest",
                    inline: "start",
                  });
                }
                // Strategy 3: Try scrolling inline to end (for right-offscreen elements)
                else if (rect.left > vw || rect.right > vw) {
                  el.scrollIntoView({
                    behavior: smooth ? "smooth" : "auto",
                    block: "nearest",
                    inline: "end",
                  });
                }
              } catch (err) {
                console.log('Alternative scroll strategies failed');
              }
            }

            // Wait again and check final result
            setTimeout(() => {
              const finalRect = el.getBoundingClientRect();
              const finalFull =
                finalRect.top >= 0 &&
                finalRect.left >= 0 &&
                finalRect.bottom <= vh &&
                finalRect.right <= vw;
              const finalPartial =
                finalRect.top < vh &&
                finalRect.bottom > 0 &&
                finalRect.left < vw &&
                finalRect.right > 0;
              const finalProgress =
                Math.abs(finalRect.top - rect.top) > 5 ||
                Math.abs(finalRect.left - rect.left) > 5;

              const scrollSuccess = finalFull || finalPartial || finalProgress;

              resolve({
                success: scrollSuccess,
                position: {
                  x: finalRect.left,
                  y: finalRect.top,
                  width: finalRect.width,
                  height: finalRect.height,
                },
                isFullyVisible: finalFull,
                isPartiallyVisible: finalPartial,
                madeProgress: finalProgress,
                reason: finalFull
                  ? "Fully visible after scroll"
                  : finalPartial
                  ? "Partially visible after scroll"
                  : finalProgress
                  ? "Made progress scrolling"
                  : "Still not visible - element may be in different content area",
              });
            }, timeout / 2);
          }, timeout / 2);
        });
      }

      // For elements that are not completely off-screen, use standard approach
      try {
        el.scrollIntoView({
          behavior: smooth ? "smooth" : "auto",
          block: "center",
          inline: "center",
        });
      } catch (error) {
        return Promise.resolve({
          success: false,
          reason: "ScrollIntoView failed",
        });
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          const newRect = el.getBoundingClientRect();
          const newFull =
            newRect.top >= 0 &&
            newRect.left >= 0 &&
            newRect.bottom <= vh &&
            newRect.right <= vw;
          const newPartial =
            newRect.top < vh &&
            newRect.bottom > 0 &&
            newRect.left < vw &&
            newRect.right > 0;
          const progress =
            Math.abs(newRect.top - rect.top) > 5 ||
            Math.abs(newRect.left - rect.left) > 5;

          // Consider scroll successful if element is visible OR made significant progress
          const scrollSuccess = newFull || newPartial || progress;

          resolve({
            success: scrollSuccess,
            position: {
              x: newRect.left,
              y: newRect.top,
              width: newRect.width,
              height: newRect.height,
            },
            isFullyVisible: newFull,
            isPartiallyVisible: newPartial,
            madeProgress: progress,
            reason: newFull
              ? "Fully visible"
              : newPartial
              ? "Partially visible"
              : progress
              ? "Made progress, element should be clickable"
              : "Still not visible",
          });
        }, timeout);
      });
    },
    uniqueId,
    NODE_ID_SELECTOR,
    smooth,
    timeout
  );
}

// ============================================================================
// Scroll element into view, wait for stability, then get center coordinates
// Enhanced with retry logic and better handling of off-screen elements
// ============================================================================

export async function scrollWaitAndGetCoordinates(
  elementId: number,
  useAccuracyMode = true
): Promise<ElementCoordinates> {
  console.log(
    `Starting scroll-wait-calculate for element ${elementId} with accuracy mode: ${useAccuracyMode}`
  );

  // Try scrolling with increasing timeout for stubborn off-screen elements
  let scrollResult = await scrollElementIntoView(elementId);
  
  // If scroll failed and no progress was made, retry with non-smooth scrolling
  if (!scrollResult.success && !scrollResult.madeProgress) {
    console.warn(
      `Initial scroll failed for element ${elementId}, trying non-smooth scroll as fallback`
    );
    scrollResult = await scrollElementIntoView(elementId, false); // Try without smooth scrolling
  }

  if (!scrollResult.success && !scrollResult.madeProgress) {
    console.warn(
      `Scroll still failed for element ${elementId} after retry. This element may be in a different content area (e.g., behind a modal, in a different view, or requires user interaction to load)`
    );
  }

  console.log(
    `Waiting 1000ms for page stability after scroll...`
  );
  await sleep(1000);

  let coordinates: ElementCoordinates;
  try {
    coordinates = await getCenterCoordinates(elementId);
  } catch (error) {
    // If getting coordinates fails, it might be because element is still off-screen
    // Retry scrolling once more with a longer delay
    console.warn(
      `Failed to get coordinates for element ${elementId} after scroll: ${error}. Retrying scroll...`
    );
    
    await sleep(500);
    scrollResult = await scrollElementIntoView(elementId, false);
    await sleep(1500); // Longer wait for content to stabilize
    
    coordinates = await getCenterCoordinates(elementId);
  }

  console.log(
    `Coordinates calculated: (${coordinates.x}, ${coordinates.y}) for element ${elementId}`
  );
  return coordinates;
}

// ============================================================================
// Core coordinate calculation with enhanced React component detection
// ============================================================================

async function calculateCoordinatesCore(
  elementId: number
): Promise<ElementCoordinates> {
  try {
    const { uniqueId } = await getElementByNodeId(elementId);
    const coordinates = await executeScript(
      (uid: string, sel: string) => {
        const el = document.querySelector(`[${sel}="${uid}"]`);
        if (!el)
          return {
            error: "Element not found in DOM",
            elementExists: false,
            selector: `[${sel}="${uid}"]`,
          };

        // Enhanced element detection for complex React components like GitHub
        const findActualInputElement = (element: HTMLElement): HTMLElement => {
          // If it's already an input or textarea, return it
          if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            return element;
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
            const inputEl = element.querySelector(selector) as HTMLElement;
            if (inputEl && isElementVisible(inputEl)) {
              return inputEl;
            }
          }

          // If no nested input found, check if the element itself is focusable
          if (element.tabIndex >= 0 || element.contentEditable === 'true' || element.contentEditable === '') {
            return element;
          }

          // Last resort: return the original element
          return element;
        };

        const isElementVisible = (element: HTMLElement): boolean => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return !(
            rect.width === 0 ||
            rect.height === 0 ||
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0'
          );
        };

        // Find the actual input element for coordinate calculation
        const actualInput = findActualInputElement(el as HTMLElement);
        const rect = actualInput.getBoundingClientRect();
        
        if (rect.width <= 0 || rect.height <= 0) {
          const style = window.getComputedStyle(actualInput);
          return {
            error: "Element has no dimensions",
            elementExists: true,
            rect: {
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            },
            computedStyle: {
              display: style.display,
              visibility: style.visibility,
              opacity: style.opacity,
            },
          };
        }

        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          rect: {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          },
          viewport: { width: window.innerWidth, height: window.innerHeight },
          elementExists: true,
        };
      },
      uniqueId,
      NODE_ID_SELECTOR
    );

    if (coordinates && "error" in coordinates) {
      const base = `Failed to get coordinates for element ${elementId}: ${
        coordinates.error || ""
      }. `;
      const details = !coordinates.elementExists
        ? `Element not found using selector [${NODE_ID_SELECTOR}="${uniqueId}"]. `
        : coordinates.rect
        ? `Element found but has dimensions ${coordinates.rect.width}x${
            coordinates.rect.height
          } at position (${coordinates.rect.left}, ${coordinates.rect.top}). ${
            coordinates.computedStyle
              ? `Computed styles: display="${coordinates.computedStyle.display}", visibility="${coordinates.computedStyle.visibility}", opacity="${coordinates.computedStyle.opacity}". `
              : ""
          }`
        : "";
      throw new Error(base + details);
    }

    if (!coordinates) {
      throw new Error(
        `Failed to get coordinates for element ${elementId}: Script execution returned null. Element may have been removed or script context lost.`
      );
    }

    // Enhanced validation - allow negative coordinates but check if element is actually visible
    if (
      isNaN(coordinates.x) ||
      isNaN(coordinates.y)
    ) {
      throw new Error(
        `Failed to get coordinates for element ${elementId}: Computed invalid coordinates (${
          coordinates.x
        }, ${coordinates.y}). Element rect: ${JSON.stringify(
          coordinates.rect
        )}, viewport: ${JSON.stringify(coordinates.viewport)}`
      );
    }

    // Check if coordinates are outside the viewport (indicating element is off-screen)
    const isOffScreen = 
      coordinates.x < 0 || 
      coordinates.y < 0 ||
      coordinates.x > coordinates.viewport.width ||
      coordinates.y > coordinates.viewport.height;
    
    if (isOffScreen) {
      console.warn(`Element ${elementId} appears to be off-screen (${coordinates.x}, ${coordinates.y}). This may indicate the element is not visible.`);
      // Don't throw error, but log warning - the scroll logic should have handled this
    }

    return { x: coordinates.x, y: coordinates.y };
  } catch (error) {
    throw new Error(
      `Failed to get element coordinates for element ${elementId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// ============================================================================
// Get center coordinates with scroll preparation and stability waiting
// ============================================================================

export async function getCenterCoordinates(
  elementId: number
): Promise<ElementCoordinates> {
  console.log(
    `Getting coordinates for element ${elementId} with scroll-wait-calculate approach`
  );

  try {
    const scrollResult = await scrollElementIntoView(elementId, true);
    if (scrollResult.success || scrollResult.madeProgress) {
      console.log(
        `Element ${elementId} scrolled successfully or made progress`
      );
    } else {
      console.warn(
        `Scroll failed for element ${elementId}, but continuing with coordinate calculation. Reason: ${scrollResult.reason}`
      );
    }
  } catch (scrollError) {
    console.warn(
      `Scroll error for element ${elementId}: ${scrollError}, but continuing with coordinate calculation`
    );
  }

  console.log(
    `Waiting 300ms for scroll stability before calculating coordinates for element ${elementId}`
  );
  await sleep(300);

  const coordinates = await calculateCoordinatesCore(elementId);
  console.log(
    `Coordinates successfully calculated for element ${elementId}: (${coordinates.x}, ${coordinates.y})`
  );
  return coordinates;
}
