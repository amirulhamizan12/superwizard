import { AIResponseResult } from "./parseResponse";
import { getTaskTab } from "../../state";

// ============================================================================
// TYPES
// ============================================================================
type ActionWithThought = Extract<AIResponseResult, { thought: string }>;
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
  fullHistory: any[] = [],
  screenshotDataUrl?: string
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
  const promptContent = formatPromptContent(messageGroups, currentTaskIndex);
  const contextSection = await buildContextSection(
    screenshotDataUrl,
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

  // Add previous user messages
  if (fullHistory?.length > 0) {
    fullHistory
      .filter((entry) => entry.prompt && !entry.content)
      .forEach((entry) => {
        if (entry.prompt !== taskInstructions) {
          groups.push({ message: entry.prompt, actions: [] });
        }
      });
  }

  // Add or update current task
  const existingIndex = groups.findIndex((g) => g.message === taskInstructions);
  if (existingIndex !== -1) {
    groups[existingIndex].actions = previousActions;
  } else {
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
// PROMPT STRUCTURE
// ============================================================================
function formatPromptContent(
  groups: MessageGroup[],
  currentTaskIndex: number
): string {
  let content = "";
  let globalStepId = 1;

  groups.forEach((group, idx) => {
    const isCurrent = idx === currentTaskIndex;
    const showFullHistory = isCurrent || idx === currentTaskIndex - 1;
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
        if (showFullHistory)
          content += `<thought>${action.thought}</thought>\n`;
        content += `<action>${action.action}</action>\n`;
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
  screenshotDataUrl?: string,
  pageContents?: string
): Promise<string> {
  const taskTab = await getTaskTab();
  let context = `- Current Time: ${new Date().toLocaleString()}\n`;
  context += `- Page URL: ${taskTab?.url || "No URL available"}\n\n`;

  if (screenshotDataUrl) {
    context += `# Page Screenshot (data URL preview):\n${screenshotDataUrl.slice(
      0,
      256
    )}...[truncated]\n\n`;
  }

  context += `# Page Contents:\n${pageContents}`;
  return context;
}
