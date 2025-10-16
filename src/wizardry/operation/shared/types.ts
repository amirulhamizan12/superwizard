export type ActionName = "click" | "setValue" | "navigate" | "waiting";

export type ActionPayload<T extends ActionName> = T extends "click"
  ? { elementId: number }
  : T extends "setValue"
  ? { elementId: number; value: string }
  : T extends "navigate"
  ? { url: string }
  : T extends "waiting"
  ? { seconds: number }
  : never;

// Action completion callback type
export type ActionCompletionCallback = (
  success: boolean,
  error?: string
) => void;

// Action state tracking
export interface ActionState {
  id: string;
  type: ActionName;
  status: "pending" | "in-progress" | "completed" | "failed";
  startTime: number;
  endTime?: number;
  error?: string;
}

// Enhanced action result
export interface ActionResult {
  success: boolean;
  actionId: string;
  duration: number;
  error?: string;
  details?: any;
}

export interface ElementCoordinates {
  x: number;
  y: number;
}

export interface ClickResult {
  success: boolean;
  reason?: string;
  method?: string;
}

export interface ScrollResult {
  success: boolean;
  reason?: string;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isFullyVisible?: boolean;
  isPartiallyVisible?: boolean;
  madeProgress?: boolean;
}
