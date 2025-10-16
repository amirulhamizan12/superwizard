import { useAppState } from "../../../state";

// ===============================================================================================
// Execute a DOM action with cursor movement if needed
// ===============================================================================================

export async function executeWithCursor(
  x: number,
  y: number,
  action?: "click" | "simulateTyping",
  duration = 500
): Promise<boolean> {
  try {
    if (isTaskStopped()) return false;

    // Import executeScript here to avoid circular dependency
    const { executeScript } = await import("../core/element");

    const result = await executeScript(
      (x: number, y: number, action?: string, duration?: number) => {
        const cursor = (window as any).__superwizardCursor;
        if (!cursor || typeof cursor.moveTo !== "function") {
          console.log("Cursor not available for movement");
          return false;
        }

        return cursor
          .moveTo(x, y, duration || 500)
          .then(() => {
            if (action && typeof cursor[action] === "function") {
              return cursor[action]()
                .then(() => true)
                .catch(() => false);
            } else {
              return true;
            }
          })
          .catch(() => false);
      },
      x,
      y,
      action,
      duration
    );

    return result || false;
  } catch (error) {
    console.error("Cursor movement failed:", error);
    return false;
  }
}

// ===============================================================================================
// Ensure cursor is centered on element after operations complete
// ===============================================================================================

export async function ensureCursorCentered(
  elementId: number,
  duration = 500
): Promise<boolean> {
  try {
    if (isTaskStopped()) return false;

    // Import here to avoid circular dependency
    const { getCenterCoordinates } = await import("../core/positioning");
    const { executeScript } = await import("../core/element");

    // Recalculate the element's center coordinates
    const coords = await getCenterCoordinates(elementId);

    // Move cursor to the center without any action
    const result = await executeScript(
      (x: number, y: number, duration?: number) => {
        const cursor = (window as any).__superwizardCursor;
        if (!cursor || typeof cursor.moveTo !== "function") {
          console.log("Cursor not available for centering");
          return false;
        }

        return cursor
          .moveTo(x, y, duration || 500)
          .then(() => true)
          .catch(() => false);
      },
      coords.x,
      coords.y,
      duration
    );

    return result || false;
  } catch (error) {
    console.error("Cursor centering failed:", error);
    return false;
  }
}

// ===============================================================================================
// Creates a delay for the specified number of milliseconds
// ===============================================================================================

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ===============================================================================================
// Check if task was stopped/interrupted
// ===============================================================================================

export function isTaskStopped(): boolean {
  const state = useAppState.getState();
  return state.taskManager.status !== "running";
}
