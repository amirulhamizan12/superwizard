import { availableTools } from "./availableTools";

// TYPES
export type AIActionPayload = {
  name: string;
  args: Record<string, string | number | string[] | boolean>;
};
type AvailableAction = (typeof availableTools)[number];
export type AIResponseResult =
  | { thought: string; action: string; parsedAction: AIActionPayload }
  | { error: string };

// UTILITIES
const parseArguments = (argsString: string): string[] => {
  if (!argsString.trim()) return [];
  const args: string[] = [];
  let inQuote = false,
    quoteChar = "",
    currentArg = "";
  for (const char of argsString) {
    if (
      (char === '"' || char === "'" || char === "`") &&
      (!inQuote || char === quoteChar)
    ) {
      inQuote = !inQuote;
      quoteChar = inQuote ? char : "";
      currentArg += char;
    } else if (char === "," && !inQuote) {
      if (currentArg.trim()) args.push(currentArg.trim());
      currentArg = "";
    } else currentArg += char;
  }
  if (currentArg.trim()) args.push(currentArg.trim());
  return args;
};

// MAIN PARSER
export function parseAIResponse(text: string): AIResponseResult {
  const sections = {
    thought: text
      .match(/<\s*thought\s*>([\s\S]*?)<\/\s*thought\s*>/i)?.[1]
      ?.trim(),
    action: text
      .match(/<\s*action\s*>([\s\S]*?)<\/\s*action\s*>/i)?.[1]
      ?.trim(),
  };

  for (const key of ["thought", "action"] as const) {
    if (!sections[key])
      return {
        error: `Invalid response: ${key} not found in the model response.`,
      };
  }

  const actionParts = sections.action!.match(/(\w+)\(([^]*)\)/);
  if (!actionParts)
    return {
      error:
        "Invalid action format: Action should be in the format functionName(arg1, arg2, ...).",
    };

  const [, actionName, actionArgsString] = actionParts;
  const availableAction = availableTools.find(
    (action) => action.name === actionName
  );
  if (!availableAction)
    return { error: `Invalid action: "${actionName}" is not a valid action.` };

  const argsArray = parseArguments(actionArgsString);
  const parsedArgs: Record<string, number | string | string[] | boolean> = {};

  // Validate and parse arguments
  {
    const requiredArgs = availableAction.args.filter(
      (arg) => !("optional" in arg && arg.optional)
    );
    if (
      argsArray.length < requiredArgs.length ||
      argsArray.length > availableAction.args.length
    ) {
      return {
        error: `Invalid number of arguments: Expected between ${requiredArgs.length} and ${availableAction.args.length} for action "${actionName}", but got ${argsArray.length}.`,
      };
    }
    for (let i = 0; i < argsArray.length; i++) {
      const arg = argsArray[i],
        { name, type } = availableAction.args[i];
      if (type === "number") {
        const num = Number(arg);
        if (isNaN(num))
          return {
            error: `Invalid argument type: Expected a number for argument "${name}", but got "${arg}".`,
          };
        parsedArgs[name] = num;
      } else if (type === "string") {
        if (!/^["'`][\s\S]*["'`]$/.test(arg))
          return {
            error: `Invalid argument type: Expected a string for argument "${name}", but got "${arg}".`,
          };
        parsedArgs[name] = arg.slice(1, -1);
      } else if (type === "boolean") {
        if (arg !== "true" && arg !== "false")
          return {
            error: `Invalid argument type: Expected a boolean (true/false) for argument "${name}", but got "${arg}".`,
          };
        parsedArgs[name] = arg === "true";
      } else
        return {
          error: `Invalid argument type: Unknown type "${type}" for argument "${name}".`,
        };
    }
  }

  return {
    thought: sections.thought!,
    action: sections.action!,
    parsedAction: {
      name: availableAction.name,
      args: parsedArgs,
    } as AIActionPayload,
  };
}
