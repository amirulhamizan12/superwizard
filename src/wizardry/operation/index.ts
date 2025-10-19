// Core utilities
export * from "./core/element";
export * from "./core/positioning";
export * from "./core/stability";
export * from "./core/validation";

// Action operations
export * from "./actions/click";
export * from "./actions/setValue";
export * from "./actions/navigate";
export * from "./actions/waiting";

// Configuration and types
export * from "./shared/types";
export * from "./shared/utils";

import { click } from "./actions/click";
import { setValue } from "./actions/setValue";
import { navigate } from "./actions/navigate";
import { waiting } from "./actions/waiting";
import { executeScript } from "./core/element";
import {
  ActionName,
  ActionPayload,
  ActionResult,
  ActionState,
} from "./shared/types";

// =============================================
// Action State Manager
// =============================================

class ActionStateManager {
  private actionStates = new Map<string, ActionState>();
  private activeAction: string | null = null;

  startAction(actionId: string, type: string): void {
    this.actionStates.set(actionId, {
      id: actionId,
      type: type as any,
      status: "pending",
      startTime: Date.now(),
    });
    this.activeAction = actionId;
  }

  setActionInProgress(actionId: string): void {
    const state = this.actionStates.get(actionId);
    if (state) {
      state.status = "in-progress";
    }
  }

  completeAction(actionId: string): void {
    const state = this.actionStates.get(actionId);
    if (state) {
      state.status = "completed";
      state.endTime = Date.now();
      if (this.activeAction === actionId) {
        this.activeAction = null;
      }
    }
  }

  failAction(actionId: string, error: string): void {
    const state = this.actionStates.get(actionId);
    if (state) {
      state.status = "failed";
      state.endTime = Date.now();
      state.error = error;
      if (this.activeAction === actionId) {
        this.activeAction = null;
      }
    }
  }

  hasActiveAction(): boolean {
    return this.activeAction !== null;
  }

  waitForAllActions(): Promise<void> {
    return new Promise((resolve) => {
      const checkComplete = () => {
        if (!this.hasActiveAction()) {
          resolve();
          return;
        }
        setTimeout(checkComplete, 50);
      };
      checkComplete();
    });
  }
}

const actionStateManager = new ActionStateManager();
const actionMap = { click, setValue, navigate, waiting } as const;

export async function callDOMAction<T extends ActionName>(
  type: T,
  payload: ActionPayload<T>
): Promise<ActionResult> {
  const actionId = `${type}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  const startTime = Date.now();

  actionStateManager.startAction(actionId, type);

  try {
    actionStateManager.setActionInProgress(actionId);
    const action = actionMap[type as keyof typeof actionMap] as (
      payload: ActionPayload<T>
    ) => Promise<void>;

    if (!action) {
      throw new Error(`Unknown action type: ${type}`);
    }

    await action(payload);
    actionStateManager.completeAction(actionId);

    return {
      success: true,
      actionId,
      duration: Date.now() - startTime,
      details: { type, payload },
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    actionStateManager.failAction(actionId, errorMessage);

    return {
      success: false,
      actionId,
      duration: Date.now() - startTime,
      error: errorMessage,
      details: { type, payload },
    };
  }
}

export async function waitForActionCompletion(): Promise<void> {
  return actionStateManager.waitForAllActions();
}

export function hasActiveAction(): boolean {
  return actionStateManager.hasActiveAction();
}

export type { ActionName, ActionPayload, ActionResult };
export { executeScript };
