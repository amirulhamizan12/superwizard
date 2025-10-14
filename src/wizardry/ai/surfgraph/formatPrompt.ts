import { AIResponseResult } from "./parseResponse";
import { getTaskTab } from "../../../state";
import { getWebsiteRules } from "./retrieval";

// ============================================================================
// TYPES
// ============================================================================
type ActionWithThought = Extract<AIResponseResult, { thought: string }> & {
  elementInfo?: string; // Stored element HTML from when action was executed
  memory?: string; // Stored memory information from the action
};
type MessageGroup = {
  message: string;
  actions: ActionWithThought[];
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================
export async function formatPrompt(
  taskInstructions: string,
  previousActions: ActionWithThought[],
  pageContents: string,
  fullHistory: any[] = []
) {
  const messageGroups = buildMessageGroups(
    taskInstructions,
    previousActions,
    fullHistory
  );
  const currentTaskIndex = findCurrentTaskIndex(
    messageGroups,
    taskInstructions
  );
  const promptContent = formatPromptContent(messageGroups, currentTaskIndex, pageContents);
  const contextSection = await buildContextSection(
    pageContents
  );

  return promptContent + contextSection;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function buildMessageGroups(
  taskInstructions: string,
  previousActions: ActionWithThought[],
  fullHistory: any[]
): MessageGroup[] {
  const groups: MessageGroup[] = [];

  if (fullHistory?.length > 0) {
    let currentGroup: MessageGroup | null = null;

    // Iterate through history and group AI actions with their user prompts
    fullHistory.forEach((entry) => {
      // This is a user message (has prompt field filled and role === "user")
      if (entry.prompt && entry.role === "user") {
        // Save previous group if it exists
        if (currentGroup) {
          groups.push(currentGroup);
        }
        // Start new group for this user prompt
        currentGroup = {
          message: entry.prompt,
          actions: []
        };
      }
      // This is an AI action (has role === "ai" and has action)
      else if (entry.role === "ai" && entry.action && currentGroup) {
        // Extract thought/action/memory from the AI response content
        const thoughtMatch = entry.content?.match(/<thought>([\s\S]*?)<\/thought>/i);
        const actionMatch = entry.content?.match(/<action>([\s\S]*?)<\/action>/i);
        const memoryMatch = entry.content?.match(/<memory>([\s\S]*?)<\/memory>/i);

        if (thoughtMatch && actionMatch) {
          currentGroup.actions.push({
            thought: thoughtMatch[1].trim(),
            action: actionMatch[1].trim(),
            memory: memoryMatch ? memoryMatch[1].trim() : "n/a",
            parsedAction: entry.action,
            elementInfo: entry.elementInfo,
          });
        }
      }
    });

    // Add the last group if it exists
    if (currentGroup) {
      groups.push(currentGroup);
    }
  }

  // Ensure current task is in groups (add if not present)
  const existingIndex = groups.findIndex((g) => g.message === taskInstructions);
  if (existingIndex === -1) {
    groups.push({ message: taskInstructions, actions: previousActions });
  }

  return groups;
}

function findCurrentTaskIndex(
  groups: MessageGroup[],
  taskInstructions: string
): number {
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i].message === taskInstructions) return i;
  }
  return groups.length - 1;
}

// ============================================================================
// HELPER FUNCTIONS FOR ELEMENT EXTRACTION
// ============================================================================

// Extract element ID from action string
// Supports: click(49), setValue(49, "text"), and other action formats
function extractElementIdFromAction(actionString: string): number | null {
  // Match patterns like: click(49), setValue(49, ...), etc.
  const match = actionString.match(/^(\w+)\((\d+)/);
  if (match && match[2]) {
    return parseInt(match[2], 10);
  }
  return null;
}

// Find element info from page contents by element ID
// Returns the full element HTML string (e.g., "49<div aria-label='...'></div>")
function findElementInPageContents(
  elementId: number,
  pageContents: string
): string | null {
  // Look for pattern: {elementId}<tagname ...>
  const regex = new RegExp(`${elementId}<[^>]+>.*?</[^>]+>`, 'i');
  const match = pageContents.match(regex);
  
  if (match) {
    return match[0];
  }
  
  // Try self-closing tags
  const selfClosingRegex = new RegExp(`${elementId}<[^>]+/>`, 'i');
  const selfClosingMatch = pageContents.match(selfClosingRegex);
  
  if (selfClosingMatch) {
    return selfClosingMatch[0];
  }
  
  return null;
}

// ============================================================================
// PROMPT STRUCTURE
// ============================================================================
function formatPromptContent(
  groups: MessageGroup[],
  currentTaskIndex: number,
  pageContents?: string
): string {
  let content = "";
  let globalStepId = 1;

  groups.forEach((group, idx) => {
    const isCurrent = idx === currentTaskIndex;
    const priority = isCurrent
      ? "(Current Task, High Priority)"
      : "(Previous Task, Low Priority)";

    // User prompt section
    content += `\n# User Prompt ${idx + 1} ${priority}:\n<user_query>${
      group.message
    }</user_query>\n\n`;

    // Actions history section
    content += "## Actions History:\n";
    if (group.actions.length > 0) {
      group.actions.forEach((action) => {
        content += `<step>${globalStepId}</step>\n`;
        content += `<thought>${action.thought}</thought>\n`;
        content += `<action>${action.action}</action>\n`;
        
        // Add element info if available (only for element interaction actions)
        let elementInfo = "";

        // Extract action name from action string (e.g., "click(49)" -> "click")
        const actionNameMatch = action.action.match(/^(\w+)\(/);
        const actionName = actionNameMatch ? actionNameMatch[1] : null;
        const isElementInteractionAction = actionName && ["click", "setValue"].includes(actionName);

        if (isElementInteractionAction) {
          if (action.elementInfo) {
            // Use stored element info from when action was executed
            elementInfo = action.elementInfo;
          } else if (pageContents) {
            // Fallback: try to find in current page contents (for backward compatibility)
            const elementId = extractElementIdFromAction(action.action);
            if (elementId !== null) {
              const foundElement = findElementInPageContents(elementId, pageContents);
              if (foundElement) {
                elementInfo = foundElement;
              }
            }
          }

          if (elementInfo) {
            content += `element: ${elementInfo}\n`;
          }
        }
        
        globalStepId++;
      });
      content += "\n";
    } else {
      content +=
        "- No previous actions for this task yet. Begin with first action.\n\n";
    }
  });

  return content;
}

async function buildContextSection(
  pageContents?: string
): Promise<string> {
  const taskTab = await getTaskTab();
  const pageUrl = taskTab?.url || "No URL available";
  
  let context = `- Current Time: ${new Date().toLocaleString()}\n`;
  context += `- Page URL: ${pageUrl}\n\n`;

  context += `# Page Contents:\n${pageContents}\n\n`;
  
  // Add website-specific rules if available
  const websiteRules = getWebsiteRules(pageUrl);
  if (websiteRules) {
    context += `----\n\n${websiteRules}`;
  }
  
  return context;
}
