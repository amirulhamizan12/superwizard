// validation.ts - Task validation and requirement parsing with configurable rules

import { TaskProgress } from "../../../state";

const DEFAULT_RULES = {
  successIndicators: ["success", "completed", "done"],
  pendingIndicators: ["pending", "processing", "waiting"],
  failureIndicators: ["failed", "error", "unable"],
};

export function parseTaskRequirements(instructions: string): {
  total: number;
  type: string;
  validationRules: NonNullable<TaskProgress["validationRules"]>;
} {
  const [, total, type] = instructions.match(/(\d+)\s+(\w+)/i) || [];

  return {
    total: parseInt(total) || 0,
    type: type?.toLowerCase() || "generic",
    validationRules: DEFAULT_RULES,
  };
}
