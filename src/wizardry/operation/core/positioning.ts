import { sleep } from "../toolkit/utils";
import { CONFIG } from "../toolkit/config";
import { ElementCoordinates, ScrollResult } from "../toolkit/types";
import { executeScript, getElementByNodeId } from "./element";
import { NODE_ID_SELECTOR } from "../constants";

export async function scrollElementIntoView(
  elementId: number,
  smooth = true
): Promise<ScrollResult> {
  const { uniqueId } = await getElementByNodeId(elementId);
  const timeout = CONFIG.POSITIONING.ELEMENT_TIMEOUT;

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
      const isPartiallyVisible =
        rect.top < vh && rect.bottom > 0 && rect.left < vw && rect.right > 0;

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

export async function scrollWaitAndGetCoordinates(
  elementId: number,
  useAccuracyMode = true
): Promise<ElementCoordinates> {
  console.log(
    `Starting scroll-wait-calculate for element ${elementId} with accuracy mode: ${useAccuracyMode}`
  );

  const scrollResult = await scrollElementIntoView(elementId);
  if (!scrollResult.success && !scrollResult.madeProgress) {
    console.warn(
      `Scroll failed for element ${elementId}, but continuing with coordinate calculation`
    );
  }

  console.log(
    `Waiting ${CONFIG.CLICK.WAIT_AFTER_SCROLL_ACCURACY}ms for page stability after scroll...`
  );
  await sleep(CONFIG.CLICK.WAIT_AFTER_SCROLL_ACCURACY);

  const coordinates = await getCenterCoordinates(elementId);
  console.log(
    `Coordinates calculated: (${coordinates.x}, ${coordinates.y}) for element ${elementId}`
  );
  return coordinates;
}

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

        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
          const style = window.getComputedStyle(el);
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

    if (
      isNaN(coordinates.x) ||
      isNaN(coordinates.y) ||
      coordinates.x < 0 ||
      coordinates.y < 0
    ) {
      throw new Error(
        `Failed to get coordinates for element ${elementId}: Computed invalid coordinates (${
          coordinates.x
        }, ${coordinates.y}). Element rect: ${JSON.stringify(
          coordinates.rect
        )}, viewport: ${JSON.stringify(coordinates.viewport)}`
      );
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
    `Waiting ${CONFIG.POSITIONING.coordinate_Wait}ms for scroll stability before calculating coordinates for element ${elementId}`
  );
  await sleep(CONFIG.POSITIONING.coordinate_Wait);

  const coordinates = await calculateCoordinatesCore(elementId);
  console.log(
    `Coordinates successfully calculated for element ${elementId}: (${coordinates.x}, ${coordinates.y})`
  );
  return coordinates;
}
