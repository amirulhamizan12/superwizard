import React from "react";
import { useAppState } from "../../state";
import { TaskHistoryEntry, getTaskTab } from "../../state";
import { ChevronDownIcon } from "../styles/Icons";
import { colors } from "../styles/theme";

interface EnhancedHistoryEntry extends TaskHistoryEntry {
  userInput?: string;
  aiResponse?: string;
  role: "user" | "ai" | "error";
  error?: string;
  timestamp: string;
}

// ============================================================================
// ERROR STATUS CARD COMPONENT
// ============================================================================

interface ErrorStatusCardProps {
  taskHistory: EnhancedHistoryEntry[];
}

const ErrorStatusCard: React.FC<ErrorStatusCardProps> = ({ taskHistory }) => {
  const getErrorInfo = () => {
    // Get all error entries from task history
    const errorEntries = taskHistory.filter((entry) => entry.role === "error");

    if (errorEntries.length === 0) {
      return null;
    }

    // Get the latest error entry to determine the primary error type
    const latestError = errorEntries[errorEntries.length - 1];

    // Extract error details from the latest error entry
    let title = "Task Error";
    let message = "An error occurred during task execution.";
    let type: "error" | "warning" = "error";

    if (latestError.action && "name" in latestError.action) {
      const parsedAction = latestError.action as any;

      // Handle different error types based on action name
      if (parsedAction.name === "interrupt") {
        title = "Task Interrupted";
        type = "warning";
        message =
          parsedAction.args?.message ||
          "The task was stopped before completion. This happens when you click the stop button or close the extension.";
      } else if (parsedAction.name === "consecutive_failures") {
        title = "Task Failed - Too Many Consecutive Failures";
        message =
          parsedAction.args?.message ||
          "Task stopped after multiple consecutive failed actions. This usually indicates the page structure has changed or the task requires manual intervention.";
      } else if (parsedAction.name === "action_failure") {
        title = "Task Failed - Action Error";
        message =
          parsedAction.args?.message ||
          `Action "${parsedAction.args?.actionName || "unknown"}" failed: ${
            parsedAction.args?.error || "Unknown error"
          }`;
      } else if (parsedAction.name === "ai_failure") {
        title = "Task Failed";
        message =
          parsedAction.args?.message ||
          "The task was marked as failed by the AI assistant. This usually means the task couldn't be completed as requested.";
      } else if (parsedAction.name === "system_error") {
        title = "System Error";
        message =
          parsedAction.args?.message ||
          "A system error occurred during task execution.";
      }
    }

    // Collect all error details for the details section
    const details: string[] = [];
    errorEntries.forEach((entry, index) => {
      if (entry.action && "name" in entry.action) {
        const parsedAction = entry.action as any;
        const timestamp = new Date(entry.timestamp).toLocaleTimeString();

        if (parsedAction.name === "action_failure") {
          details.push(
            `${timestamp} - Action "${
              parsedAction.args?.actionName || "unknown"
            }" failed: ${parsedAction.args?.error || "Unknown error"}`
          );
        } else if (parsedAction.name === "consecutive_failures") {
          details.push(
            `${timestamp} - Too many consecutive failures: ${
              parsedAction.args?.message ||
              "Multiple actions failed in sequence"
            }`
          );
        } else if (parsedAction.name === "system_error") {
          details.push(
            `${timestamp} - System error: ${
              parsedAction.args?.message || "Unknown system error"
            }`
          );
        } else if (parsedAction.name === "ai_failure") {
          details.push(
            `${timestamp} - AI determined failure: ${
              parsedAction.args?.message || "Task marked as failed"
            }`
          );
        } else if (parsedAction.name !== "interrupt") {
          details.push(
            `${timestamp} - Error: ${
              parsedAction.args?.message || "Unknown error"
            }`
          );
        }
      }
    });

    return {
      title,
      message,
      details: details.length > 0 ? details : [],
      type,
    };
  };

  const errorInfo = getErrorInfo();
  if (!errorInfo) return null;

  const isError = errorInfo.type === "error";
  const bgColor = isError
    ? colors.stateBackground.error
    : colors.stateBackground.info;
  const borderColor = isError ? colors.state.error : colors.state.warning;
  const textColor = isError ? colors.state.error : colors.state.warning;

  return (
    <div
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "16px 16px 12px",
          borderBottom: `1px solid ${borderColor}20`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
            fontFamily: "Geist,sans-serif",
            fontSize: 14,
            lineHeight: 1.5,
            fontWeight: 600,
            color: textColor,
          }}
        >
          <span>⚠️</span>
          <span>{errorInfo.title}</span>
        </div>

        <div
          style={{
            fontFamily: "Geist,sans-serif",
            fontSize: 13,
            lineHeight: 1.5,
            color: colors.text.primary,
            marginBottom: 12,
          }}
        >
          {errorInfo.message}
        </div>

        {errorInfo.details && errorInfo.details.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontFamily: "Geist,sans-serif",
                fontSize: 12,
                lineHeight: 1.4,
                fontWeight: 600,
                color: colors.text.secondary,
                marginBottom: 6,
                textTransform: "uppercase" as const,
                letterSpacing: ".05em",
              }}
            >
              Error Details
            </div>
            <div
              style={{
                backgroundColor: colors.background.secondary,
                border: `1px solid ${colors.border.light}`,
                borderRadius: 6,
                padding: 10,
                maxHeight: "200px",
                overflowY: "auto" as const,
              }}
            >
              {errorInfo.details.map((detail, index) => (
                <div
                  key={index}
                  style={{
                    fontFamily: "Geist Mono,monospace",
                    fontSize: 11,
                    lineHeight: 1.4,
                    color: colors.text.primary,
                    marginBottom: index < errorInfo.details.length - 1 ? 6 : 0,
                    paddingBottom: index < errorInfo.details.length - 1 ? 6 : 0,
                    borderBottom:
                      index < errorInfo.details.length - 1
                        ? `1px solid ${colors.border.light}`
                        : "none",
                  }}
                >
                  {detail}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Spinner = () => (
  <div style={{ display: "inline-block", height: 18, minWidth: 36 }}>
    <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.8);opacity:0.5}40%{transform:scale(1.2);opacity:1}}`}</style>
    {[0, 0.2, 0.4].map((d, i) => (
      <span
        key={i}
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          marginRight: i < 2 ? 4 : 0,
          borderRadius: "50%",
          background: colors.primary.main,
          verticalAlign: "middle",
          animation: `bounce 1.4s infinite ease-in-out both ${d}s`,
        }}
      />
    ))}
  </div>
);

const CollapsibleCodeBlock = ({
  content,
  language = "text",
  title,
  maxHeight,
  collapsedByDefault,
}: {
  content: string;
  language?: string;
  title: string;
  maxHeight?: string;
  collapsedByDefault?: boolean;
}) => {
  const [copied, setCopied] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(!!collapsedByDefault);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div
      style={{
        backgroundColor: colors.background.tertiary,
        border: `1px solid ${colors.border.primary}`,
        borderRadius: 8,
        overflow: "hidden",
        marginTop: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          backgroundColor: colors.background.secondary,
          borderBottom: `1px solid ${colors.border.primary}`,
          fontFamily: "Geist, sans-serif",
          fontSize: 12,
          lineHeight: "1.4",
          fontWeight: 500,
          color: colors.text.secondary,
          letterSpacing: "0.06em",
        }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
          }}
        >
          <span style={{ fontWeight: 600 }}>{title}</span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              transition: "transform 0.2s",
              transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
              opacity: 0.7,
            }}
          >
            <ChevronDownIcon boxSize="16px" />
          </span>
        </div>
        <button
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 16px",
            fontSize: 12,
            fontWeight: 500,
            border: "none",
            borderRadius: 4,
            backgroundColor: colors.background.primary,
            color: colors.text.secondary,
            cursor: "pointer",
            transition: "all 0.15s ease",
            userSelect: "none",
          }}
          onClick={handleCopy}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {!collapsed && (
        <div
          style={{
            fontFamily: "Geist Mono, monospace",
            fontSize: 12,
            lineHeight: "1.5",
            letterSpacing: "0.06em",
            padding: 16,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            backgroundColor: colors.background.primary,
            color: colors.text.primary,
            overflow: "auto",
            position: "relative",
            ...(maxHeight && { maxHeight }),
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

const extractUserMessage = (prompt: string, context?: string): string => {
  if (!context) {
    const userMatch = prompt.match(/User message \d+: ([\s\S]*?)(?=\n\n|$)/);
    if (userMatch) return userMatch[1].trim();
    const taskMatch = prompt.match(
      /The user requests the following task:\s*\n\n([\s\S]*?)(?=\n\n|$)/
    );
    return taskMatch ? taskMatch[1].trim() : prompt;
  }
  return prompt;
};

const MessageBubble = ({
  message,
  isUser,
}: {
  message: string;
  isUser: boolean;
}) => {
  const processedMessage = isUser
    ? message
    : message.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        width: "100%",
        marginBottom: 20,
      }}
    >
      <div
        style={{
          maxWidth: "77%",
          background: isUser ? colors.primary.main : colors.background.hover,
          color: isUser ? "white" : colors.text.primary,
          padding: "13px 18px",
          borderRadius: 20,
          borderTopRightRadius: isUser ? 7 : 20,
          borderTopLeftRadius: isUser ? 20 : 7,
          fontSize: 14,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          border: isUser ? "none" : `1px solid ${colors.border.primary}`,
          lineHeight: "1.4",
          fontFamily: "Geist, sans-serif",
          letterSpacing: "0.06em",
        }}
      >
        {processedMessage}
      </div>
    </div>
  );
};

const Stepper = ({
  steps,
}: {
  steps: {
    title: string;
    description: string;
    baseUrl?: string;
    isStatusStep?: boolean;
    hasError?: boolean;
    errorMessage?: string;
  }[];
}) => {
  const [expandedIdx, setExpandedIdx] = React.useState<number | null>(null);
  const dotRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [lineHeights, setLineHeights] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const heights: number[] = [];
    for (let i = 0; i < steps.length - 1; i++) {
      const thisDot = dotRefs.current[i];
      const nextDot = dotRefs.current[i + 1];
      if (thisDot && nextDot) {
        const thisRect = thisDot.getBoundingClientRect();
        const nextRect = nextDot.getBoundingClientRect();
        heights[i] =
          nextRect.top +
          nextRect.height / 2 -
          (thisRect.top + thisRect.height / 2);
      } else {
        heights[i] = 0;
      }
    }
    setLineHeights(heights);
  }, [
    steps.length,
    steps.map((s) => s.title + s.description).join("|"),
    expandedIdx,
  ]);

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        marginTop: 8,
        marginBottom: 8,
      }}
    >
      {steps.map((step, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            alignItems: "flex-start",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "relative",
              width: 24,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              ref={(el) => {
                dotRefs.current[idx] = el;
              }}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: step.hasError
                  ? colors.state.error
                  : colors.primary.main,
                zIndex: 1,
                position: "relative",
                margin: 0,
                marginTop: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            />
            {idx < steps.length - 1 && lineHeights[idx] > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 2,
                  height: lineHeights[idx],
                  background: step.hasError
                    ? colors.state.error
                    : colors.primary.main,
                  opacity: step.hasError ? 0.3 : 0.13,
                  borderRadius: 2,
                  zIndex: 0,
                }}
              />
            )}
          </div>
          <div
            style={{
              marginLeft: 0,
              paddingBottom: step.isStatusStep ? 0 : 12,
              flex: 1,
              minHeight: 44,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontWeight: 500,
                fontSize: 15,
                color: step.hasError ? colors.state.error : colors.primary.main,
                fontFamily: "Geist, sans-serif",
                marginBottom: 2,
                letterSpacing: "0.06em",
                wordWrap: "break-word",
                overflowWrap: "break-word",
                maxWidth: "100%",
              }}
            >
              {step.title}
              {step.hasError && (
                <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.8 }}>
                  ⚠️
                </span>
              )}
            </div>
            <div
              style={{
                color: step.hasError
                  ? colors.state.error
                  : colors.text.secondary,
                fontSize: 14,
                fontFamily: "Geist, sans-serif",
                whiteSpace: "pre-line",
                letterSpacing: "0.06em",
                cursor: "default",
                display: "-webkit-box",
                WebkitLineClamp: expandedIdx === idx ? "unset" : 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
                transition: "all 0.2s",
                maxWidth: "100%",
                wordWrap: "break-word",
                overflowWrap: "break-word",
              }}
              onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            >
              {step.description}
              {step.hasError && step.errorMessage && (
                <div
                  style={{
                    marginTop: 8,
                    padding: 8,
                    backgroundColor: colors.stateBackground.error,
                    borderRadius: 6,
                    border: `1px solid ${colors.state.error}`,
                    fontSize: 12,
                    color: colors.state.error,
                    fontFamily: "Geist Mono, monospace",
                  }}
                >
                  Error: {step.errorMessage}
                </div>
              )}
              {step.isStatusStep && (
                <div
                  style={{
                    width: "100%",
                    height: 3,
                    backgroundColor: colors.border.light,
                    borderRadius: 2,
                    overflow: "hidden",
                    marginTop: 16,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      backgroundColor: colors.primary.main,
                      borderRadius: 2,
                      animation: "progress 1.5s ease-in-out infinite",
                    }}
                  />
                </div>
              )}
            </div>
            {step.baseUrl && (
              <div
                style={{
                  fontSize: 12,
                  color: colors.text.tertiary,
                  marginTop: 4,
                  wordBreak: "break-all",
                  overflowWrap: "break-word",
                  maxWidth: "100%",
                  hyphens: "auto",
                }}
              >
                {step.baseUrl}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const MessageCard = ({
  steps,
  timestamp,
  statusStep,
  currentUrl,
}: {
  steps: EnhancedHistoryEntry[];
  timestamp: string;
  statusStep?: { title: string; description: string };
  currentUrl: string;
}) => {
  const stepperSteps: {
    title: string;
    description: string;
    baseUrl?: string;
    isStatusStep?: boolean;
    hasError?: boolean;
    errorMessage?: string;
  }[] = steps.map((entry) => {
    let description = "";
    let hasError = false;
    let errorMessage = "";

    // Handle error role entries (task interruptions)
    if (entry.role === "error") {
      hasError = true;
      errorMessage = entry.content || "Task was interrupted";
      description = errorMessage;
      return {
        title: "Task Interrupted",
        description,
        baseUrl: currentUrl,
        hasError,
        errorMessage,
      };
    }

    // Check for errors in action
    if (entry.action && "error" in entry.action) {
      hasError = true;
      errorMessage = (entry.action as { error: string }).error;
    }

    if (entry.action && "name" in entry.action) {
      const parsedAction = entry.action;
      if (parsedAction.args && typeof parsedAction.args === "object") {
        const args = parsedAction.args as any;
        if (parsedAction.name === "navigate" && args.url) {
          description = `Navigating to ${args.url}`;
        } else if (args.message) {
          description = args.message;
        } else {
          description = Object.entries(args)
            .map(([key, value]) => `${key}: ${value}`)
            .join(", ");
        }
      } else if (typeof parsedAction.args === "string") {
        description = parsedAction.args;
      }
    }
    if (!description && entry.content) description = entry.content;

    return {
      title:
        entry.action && "name" in entry.action && entry.action.name
          ? entry.action.name.charAt(0).toUpperCase() +
            entry.action.name.slice(1)
          : "Action",
      description,
      baseUrl: currentUrl, // Use currentUrl instead of entry.baseUrl
      hasError,
      errorMessage,
    };
  });

  if (statusStep) stepperSteps.push({ ...statusStep, isStatusStep: true });

  const hasAnyErrors = stepperSteps.some((step) => step.hasError);

  return (
    <div
      style={{
        backgroundColor: colors.background.hover,
        border: `1px solid ${
          hasAnyErrors ? colors.state.error : colors.border.primary
        }`,
        borderRadius: 12,
        marginBottom: 16,
        overflow: "hidden",
        transition: "all 0.2s ease-in-out",
        alignSelf: "flex-start",
        marginRight: "auto",
        maxWidth: "min(500px, 100%)",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {hasAnyErrors && (
        <div
          style={{
            padding: "8px 13px",
            backgroundColor: colors.stateBackground.error,
            borderBottom: `1px solid ${colors.state.error}`,
            fontSize: 12,
            color: colors.state.error,
            fontWeight: 500,
            fontFamily: "Geist, sans-serif",
          }}
        >
          ⚠️ Some steps encountered errors
        </div>
      )}
      <div style={{ padding: "13px 13px 6px 13px" }}>
        <Stepper steps={stepperSteps} />
      </div>
    </div>
  );
};

const SessionDivider = ({ timestamp }: { timestamp?: string }) => (
  <div
    style={{ display: "flex", alignItems: "center", margin: "32px 0", gap: 16 }}
  >
    <div
      style={{ flex: 1, height: 1, backgroundColor: colors.border.primary }}
    />
    {timestamp && (
      <div
        style={{
          fontFamily: "Geist, sans-serif",
          fontSize: 12,
          lineHeight: "1.4",
          fontWeight: 500,
          color: colors.text.tertiary,
          backgroundColor: colors.background.primary,
          padding: "0 16px",
          letterSpacing: "0.06em",
        }}
      >
        {new Date(timestamp).toLocaleString()}
      </div>
    )}
    <div
      style={{ flex: 1, height: 1, backgroundColor: colors.border.primary }}
    />
  </div>
);

const TaskHistory = () => {
  const taskHistory = useAppState((state) =>
    state.storage.actions.getCurrentChatMessages()
  );
  const taskStatus = useAppState((state) => state.taskManager.status);
  const actionStatus = useAppState((state) => state.taskManager.actionStatus);

  const [currentUrl, setCurrentUrl] = React.useState<string>("");

  // Fetch current URL using getTaskTab
  React.useEffect(() => {
    const fetchCurrentUrl = async () => {
      try {
        const taskTab = await getTaskTab();
        if (taskTab?.url) {
          const url = new URL(taskTab.url);
          setCurrentUrl(url.origin + "/");
        } else {
          setCurrentUrl("");
        }
      } catch (error) {
        console.warn("Failed to get task tab URL:", error);
        setCurrentUrl("");
      }
    };

    // Fetch URL when task status changes or component mounts
    if (
      taskStatus === "running" ||
      taskStatus === "completed" ||
      taskStatus === "success"
    ) {
      fetchCurrentUrl();
    }

    // Set up interval to update URL while task is running
    let interval: NodeJS.Timeout | null = null;
    if (taskStatus === "running") {
      interval = setInterval(fetchCurrentUrl, 2000); // Update every 2 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [taskStatus]);

  if (taskHistory.length === 0) return null;

  const enhancedHistory: EnhancedHistoryEntry[] = [];
  let currentUserEntry: EnhancedHistoryEntry | null = null;
  let aiResponses: EnhancedHistoryEntry[] = [];

  taskHistory.forEach((entry) => {
    if (!entry.content && !entry.action) {
      if (currentUserEntry)
        enhancedHistory.push(currentUserEntry, ...aiResponses);
      currentUserEntry = {
        ...entry,
        userInput: entry.prompt,
        role: "user" as const,
        timestamp: entry.timestamp || new Date().toISOString(),
      };
      aiResponses = [];
    } else if (currentUserEntry) {
      aiResponses.push({
        ...entry,
        aiResponse: entry.content,
        role: entry.role || ("ai" as const),
        error: undefined,
        timestamp: entry.timestamp || new Date().toISOString(),
      });
    }
  });

  if (currentUserEntry) enhancedHistory.push(currentUserEntry, ...aiResponses);

  const sessionGroups: {
    user: EnhancedHistoryEntry;
    aiSteps: EnhancedHistoryEntry[];
  }[] = [];
  let currentSessionUser: EnhancedHistoryEntry | null = null;
  let currentSessionAI: EnhancedHistoryEntry[] = [];

  enhancedHistory.forEach((entry, index) => {
    if (entry.role === "user") {
      if (currentSessionUser && currentSessionAI.length > 0) {
        sessionGroups.push({
          user: currentSessionUser,
          aiSteps: currentSessionAI,
        });
      } else if (currentSessionUser && currentSessionAI.length === 0) {
        sessionGroups.push({ user: currentSessionUser, aiSteps: [] });
      }
      currentSessionUser = entry;
      currentSessionAI = [];
    } else if (entry.role === "ai" || entry.role === "error") {
      currentSessionAI.push(entry);
    }
    if (index === enhancedHistory.length - 1 && currentSessionUser) {
      sessionGroups.push({
        user: currentSessionUser,
        aiSteps: currentSessionAI,
      });
    }
  });

  const statusMessages: Record<string, string> = {
    initializing: "Starting task...",
    "pulling-dom": "Analyzing page content...",
    "performing-query": "Planning next action...",
    "performing-action": "Executing action...",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        width: "100%",
        maxWidth: 600,
        margin: "0 auto",
        padding: "24px 16px",
        backgroundColor: colors.background.primary,
        overflowY: "auto",
        minHeight: 0,
      }}
    >
      <style>{`@keyframes spin{100%{transform:rotate(360deg)}}@keyframes progress{0%{width:0%;margin-left:0%}50%{width:75%;margin-left:25%}100%{width:0%;margin-left:100%}}`}</style>
      {sessionGroups.map((session, sessionIndex) => {
        const isLastSession = sessionIndex === sessionGroups.length - 1;
        const showStatusStep = isLastSession && taskStatus === "running";
        const filteredSteps = session.aiSteps.filter((step) => {
          const action = step.action as any;
          return !(action && action.name === "respond");
        });

        return (
          <div key={`session-${sessionIndex}`}>
            {sessionIndex > 0 && (
              <SessionDivider timestamp={session.user.timestamp} />
            )}
            <MessageBubble
              message={extractUserMessage(
                session.user.prompt,
                session.user.context
              )}
              isUser={true}
            />
            {(filteredSteps.length > 0 || showStatusStep) && (
              <MessageCard
                steps={filteredSteps}
                timestamp={
                  session.aiSteps[0]?.timestamp || session.user.timestamp
                }
                statusStep={
                  showStatusStep
                    ? {
                        title:
                          statusMessages[actionStatus] || "Task in progress...",
                        description: "",
                      }
                    : undefined
                }
                currentUrl={currentUrl}
              />
            )}
            {session.aiSteps
              .filter((step) => {
                const action = step.action as any;
                return action && action.name === "respond";
              })
              .map((step, idx) => {
                let aiMessage = "";
                const action = step.action as any;
                const args = action?.args;
                if (typeof args === "string") aiMessage = args;
                else if (args && typeof args === "object")
                  aiMessage = args.message || Object.values(args).join(" ");
                if (!aiMessage && step.aiResponse) aiMessage = step.aiResponse;
                return (
                  <MessageBubble key={idx} message={aiMessage} isUser={false} />
                );
              })}
          </div>
        );
      })}

      {/* Show error status at the bottom if there are errors or interruptions */}
      {enhancedHistory.some((entry) => entry.role === "error") && (
        <ErrorStatusCard taskHistory={enhancedHistory} />
      )}
    </div>
  );
};

export default TaskHistory;
