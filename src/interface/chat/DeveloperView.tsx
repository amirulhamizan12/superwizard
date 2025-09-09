import React from "react";
import { useAppState } from "../../state";
import { TaskHistoryEntry } from "../../state";
import { ChevronDownIcon } from "../styles/Icons";
import { colors } from "../styles/theme";

// ===== TYPES =====
interface MessageCardProps {
  entry: TaskHistoryEntry;
  stepNumber?: number;
}

interface SectionProps {
  title: string;
  content: any;
  isExpanded: boolean;
  onToggle: () => void;
  type?: "prompt" | "response" | "action" | "usage" | "context" | "screenshot" | "code" | "error";
}

interface EnhancedHistoryEntry extends TaskHistoryEntry {
  userInput?: string;
  aiResponse?: string;
  role: "user" | "ai" | "error";
  error?: string;
  timestamp: string;
}

// ===== UTILITIES =====
const getTypeColor = (type: string) =>
  ({
    prompt: colors.primary.main,
    response: colors.primary.main,
    action: colors.primary.main,
    usage: colors.text.tertiary,
    context: colors.text.secondary,
    screenshot: colors.text.secondary,
    code: colors.primary.light,
    error: colors.state.error,
  }[type] || colors.text.secondary);

const LoadingBar = () => (
  <div style={{ 
    width: "100%",
    height: 3,
    backgroundColor: colors.background.secondary,
    borderRadius: 2,
    overflow: "hidden",
    position: "relative",
  }}>
    <div
      style={{
        position: "absolute",
        top: 0,
        left: "-100%",
        width: "100%",
        height: "100%",
        background: `linear-gradient(90deg, transparent, ${colors.primary.main}, transparent)`,
        animation: "loading 1.5s infinite linear",
      }}
    />
    <style>{`
      @keyframes loading {
        0% { left: -100%; }
        100% { left: 100%; }
      }
    `}</style>
  </div>
);

const CollapsibleCodeBlock = ({
  content,
  language = "text",
  title,
  maxHeight = "300px",
  collapsedByDefault = false,
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
          padding: "6px 12px",
          backgroundColor: colors.background.secondary,
          borderBottom: `1px solid ${colors.border.primary}`,
          fontFamily: "Geist, sans-serif",
          fontSize: 10,
          lineHeight: "1.3",
          fontWeight: 500,
          color: colors.text.secondary,
          letterSpacing: "0.08em",
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
          <span style={{ fontWeight: 600, letterSpacing: "0.02em" }}>{title}</span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
              opacity: 0.7,
            }}
          >
            <ChevronDownIcon boxSize="15px" />
          </span>
        </div>
        <button
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 12px",
            fontSize: 10,
            fontWeight: 500,
            border: "none",
            borderRadius: 4,
            backgroundColor: colors.background.primary,
            color: colors.text.secondary,
            cursor: "pointer",
            userSelect: "none",
          }}
          onClick={handleCopy}
        >
          <span style={{ letterSpacing: "0.02em" }}>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      {!collapsed && (
        <div
          style={{
            fontFamily: "Geist Mono, monospace",
            fontSize: 10,
            lineHeight: "1.4",
            letterSpacing: "0.06em",
            padding: 12,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            backgroundColor: colors.background.primary,
            color: colors.text.primary,
            overflow: "auto",
            position: "relative",
            maxHeight,
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

// ===== COMPONENTS =====
const Section: React.FC<SectionProps> = React.memo(
  ({ title, content, isExpanded, onToggle, type = "response" }) => {
    const [copied, setCopied] = React.useState(false);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleCopy = React.useCallback(
      async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(
            typeof content === "string"
              ? content
              : JSON.stringify(content, null, 2)
          );
          setCopied(true);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => setCopied(false), 1500);
        } catch {}
      },
      [content]
    );

    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    if (!content) return null;

    const isCodeType = type === "code" || (typeof content === "string" && content.includes("```"));
    const isErrorType = type === "error" || (content && typeof content === "object" && "error" in content);

    return (
      <div
        style={{
          border: `1px solid ${isErrorType ? colors.state.error : colors.border.primary}`,
          borderRadius: 8,
          marginBottom: 6,
          overflow: "hidden",
          backgroundColor: isErrorType ? colors.stateBackground.error : colors.background.primary,
        }}
      >
        <div
          onClick={onToggle}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            cursor: "pointer",
            backgroundColor: isErrorType ? colors.stateBackground.error : colors.background.secondary,
            borderBottom: isExpanded ? `1px solid ${isErrorType ? colors.state.error : colors.border.primary}` : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "Geist, sans-serif",
              fontSize: 12,
              fontWeight: 600,
                color: isErrorType ? colors.state.error : getTypeColor(type),
                textTransform: "capitalize",
                letterSpacing: "0.02em",
              }}
            >
              {title}
            </span>
            {type === "usage" && content.total_tokens && (
              <span
                style={{
                  fontSize: 10,
                  color: colors.text.tertiary,
                  backgroundColor: colors.background.primary,
                  padding: "3px 6px",
                  borderRadius: 4,
                  fontFamily: "Geist Mono, monospace",
                  fontWeight: 500,
                }}
              >
                {content.total_tokens} tokens
              </span>
            )}
            {isErrorType && (
              <span
                style={{
                  fontSize: 8,
                  color: colors.state.error,
                  backgroundColor: colors.stateBackground.error,
                  padding: "1px 3px",
                  borderRadius: 3,
                  fontFamily: "Geist Mono, monospace",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                ERROR
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={handleCopy}
              style={{
              padding: "3px 8px",
              fontSize: 10,
              fontWeight: 500,
                border: `1px solid ${colors.border.light}`,
                borderRadius: 6,
                backgroundColor: colors.background.primary,
                color: colors.text.secondary,
              cursor: "pointer",
              fontFamily: "Geist, sans-serif",
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <span
              style={{
                transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                color: colors.text.secondary,
              }}
            >
              <ChevronDownIcon boxSize="14px" />
            </span>
          </div>
        </div>
        {isExpanded && (
          <div
            style={{
              padding: 12,
              fontFamily: isCodeType ? "Geist Mono, monospace" : "Geist, sans-serif",
              fontSize: 10,
              lineHeight: 1.4,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: isErrorType ? colors.state.error : colors.text.primary,
              backgroundColor: colors.background.primary,
              maxHeight: type === "screenshot" ? "none" : "300px",
              overflowY: type === "screenshot" ? "visible" : "auto",
            }}
          >
            {type === "screenshot" ? (
              <img
                src={content}
                alt="Step screenshot"
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  borderRadius: 6,
                  border: `1px solid ${colors.border.primary}`,
                }}
              />
            ) : isCodeType ? (
              <CollapsibleCodeBlock
                content={typeof content === "string" ? content : JSON.stringify(content, null, 2)}
                title={`${title} Code`}
                language="javascript"
                collapsedByDefault={false}
                maxHeight="300px"
              />
            ) : (
              <div
                style={{
                  fontFamily: "Geist Mono, monospace",
                  fontSize: 10,
                  lineHeight: 1.4,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: isErrorType ? colors.state.error : colors.text.primary,
                }}
              >
                {typeof content === "string"
                  ? content
                  : JSON.stringify(content, null, 2)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

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
        marginBottom: 23,
      }}
    >
      <div
        style={{
          maxWidth: "85%",
          background: isUser 
            ? colors.primary.main
            : colors.background.card,
          color: isUser ? "white" : colors.text.primary,
          padding: "16px 20px",
          borderRadius: 23,
          borderTopRightRadius: isUser ? 8 : 23,
          borderTopLeftRadius: isUser ? 23 : 8,
          fontSize: 13,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          border: isUser 
            ? "none" 
            : `1px solid ${colors.border.primary}`,
          lineHeight: "1.5",
          fontFamily: "Geist, sans-serif",
          letterSpacing: "0.02em",
          position: "relative",
        }}
      >
        {processedMessage}
      </div>
    </div>
  );
};

const MessageCard: React.FC<MessageCardProps> = React.memo(
  ({ entry, stepNumber }) => {
    const [expandedSections, setExpandedSections] = React.useState<
      Record<string, boolean>
    >({ action: true });
    const [copiedAll, setCopiedAll] = React.useState(false);
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const toggleSection = React.useCallback((sectionKey: string) => {
      setExpandedSections((prev) => ({
        ...prev,
        [sectionKey]: !prev[sectionKey],
      }));
    }, []);

    const handleCopyAll = React.useCallback(async () => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
        setCopiedAll(true);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => setCopiedAll(false), 1500);
      } catch {}
    }, [entry]);

    const sections = React.useMemo(
      () =>
        [
          { key: "context", data: entry.context, type: "context" as const },
          { key: "response", data: entry.content, type: "response" as const },
          { key: "action", data: entry.action, type: "action" as const },
          { key: "usage", data: entry.usage, type: "usage" as const },
          {
            key: "screenshot",
            data: entry.screenshotDataUrl,
            type: "screenshot" as const,
          },
        ].filter((s) => s.data),
      [entry]
    );

    const hasErrors = sections.some(s => (s.data && typeof s.data === "object" && "error" in s.data));

    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return (
      <div
        style={{
          backgroundColor: colors.background.card,
          border: `1px solid ${hasErrors ? colors.state.error : colors.border.primary}`,
          borderRadius: 19,
          marginBottom: 19,
          overflow: "hidden",
          alignSelf: "flex-start",
          marginRight: "auto",
          maxWidth: "min(570px, 100%)",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Collapsible Header */}
        <div
          style={{
            padding: "12px",
            backgroundColor: hasErrors ? colors.stateBackground.error : colors.background.secondary,
            borderBottom: "none",
            position: "relative",
            cursor: "pointer",
          }}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "Geist, sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: hasErrors ? colors.state.error : colors.text.primary,
                  letterSpacing: "0.02em",
                }}
              >
                Step {stepNumber} {hasErrors && "⚠️"}
              </span>
              {hasErrors && (
                <span
                  style={{
                    fontSize: 10,
                    color: colors.state.error,
                    backgroundColor: colors.stateBackground.error,
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontFamily: "Geist Mono, monospace",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  ERROR
                </span>
              )}
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyAll();
                }}
                style={{
                padding: "4px 8px",
                fontSize: 10,
                fontWeight: 500,
                  border: `1px solid ${colors.border.light}`,
                  borderRadius: 6,
                  backgroundColor: colors.background.primary,
                  color: colors.text.secondary,
              cursor: "pointer",
              fontFamily: "Geist, sans-serif",
                }}
              >
                {copiedAll ? "Copied" : "Copy All"}
              </button>
              <ChevronDownIcon 
                boxSize="17px" 
                style={{
                  transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                  color: colors.text.secondary,
                }}
              />
            </div>
          </div>
        </div>

        {/* Content Sections */}
        {!isCollapsed && (
          <div style={{ padding: "8px" }}>
            {sections.map(({ key, data, type }) => (
              <Section
                key={key}
                title={key.charAt(0).toUpperCase() + key.slice(1)}
                content={data}
                isExpanded={expandedSections[key] || false}
                onToggle={() => toggleSection(key)}
                type={type}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

// ===== STATUS MESSAGE CARD COMPONENT =====
const StatusMessageCard = () => {
  const taskStatus = useAppState((s) => s.taskManager.status);
  const actionStatus = useAppState((s) => s.taskManager.actionStatus);
  const [prevActionStatus, setPrevActionStatus] =
    React.useState<string>(actionStatus);
  const [phaseStartTime, setPhaseStartTime] = React.useState<number>(
    Date.now()
  );
  const [elapsedTime, setElapsedTime] = React.useState<number>(0);

  // Track phase changes and reset timer
  React.useEffect(() => {
    if (actionStatus !== prevActionStatus && taskStatus === "running") {
      setPhaseStartTime(Date.now());
      setElapsedTime(0);
    }
    setPrevActionStatus(actionStatus);
  }, [actionStatus, prevActionStatus, taskStatus]);

  // Update elapsed time every 10ms for smooth animation
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (taskStatus === "running") {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - phaseStartTime);
      }, 10);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [taskStatus, phaseStartTime]);

  const statusMessages: Record<string, string> = {
    initializing: "Starting task...",
    "pulling-dom": "Analyzing page content...",
    "performing-query": "Planning next action...",
    "performing-action": "Executing action...",
  };

  const showRunningStatus = taskStatus === "running";

  if (!showRunningStatus) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: colors.background.card,
        border: `1px solid ${colors.border.primary}`,
        borderRadius: 19,
        marginBottom: 19,
        padding: "16px 20px",
        alignSelf: "flex-start",
        marginRight: "auto",
        maxWidth: "min(500px, 100%)",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Running Status */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "Geist, sans-serif",
            fontSize: 14,
            fontWeight: 500,
            color: colors.primary.main,
            marginBottom: 8,
          }}
        >
          <span>{statusMessages[actionStatus] || "Task in progress..."}</span>
        </div>
        <div
          style={{
            fontFamily: "Geist Mono, monospace",
            fontSize: 12,
            color: colors.text.secondary,
            marginLeft: 0,
            minWidth: "50px",
            whiteSpace: "nowrap",
            letterSpacing: "0.5px",
            marginBottom: 8,
          }}
        >
          {(elapsedTime / 1000).toFixed(2)}s
        </div>
        <LoadingBar />
      </div>
    </div>
  );
};

// ===== MAIN COMPONENT =====
const TaskHistory = () => {
  const taskHistory = useAppState((s) =>
    s.storage.actions.getCurrentChatMessages()
  );

  if (!taskHistory || taskHistory.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          width: "100%",
          maxWidth: 665,
          margin: "0 auto",
          padding: "32px 20px",
          backgroundColor: colors.background.primary,
          overflowY: "auto",
          minHeight: 0,
          position: "relative",
        }}
      >
        <div
          style={{
            padding: 24,
            textAlign: "center",
            color: colors.text.tertiary,
            fontFamily: "Geist, sans-serif",
            fontSize: 14,
            letterSpacing: "0.02em",
          }}
        >
          No task history available
        </div>
        {/* Show status messages even when no history */}
        <StatusMessageCard />
      </div>
    );
  }

  let aiStepCounter = 0;
  const isLastEntry = (index: number) => index === taskHistory.length - 1;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        width: "100%",
        maxWidth: 665,
        margin: "0 auto",
        padding: "32px 20px",
        backgroundColor: colors.background.primary,
        overflowY: "auto",
        minHeight: 0,
        position: "relative",
      }}
    >
      {taskHistory.map((entry: TaskHistoryEntry, index: number) => {
        const hasAiContent =
          entry.content ||
          entry.action ||
          entry.usage ||
          entry.context ||
          entry.screenshotDataUrl;
        if (hasAiContent) aiStepCounter++;
        const isLast = isLastEntry(index);

        return (
          <div 
            key={`${entry.timestamp}-${index}`}
          >
            {entry.prompt && (
              <MessageBubble message={entry.prompt} isUser={true} />
            )}
            {hasAiContent && (
              <MessageCard entry={entry} stepNumber={aiStepCounter} />
            )}
            {/* Show status messages after the last AI response */}
            {isLast && hasAiContent && <StatusMessageCard />}
          </div>
        );
      })}

      {/* Show status messages if the last entry was a user prompt without AI response */}
      {taskHistory.length > 0 &&
        !taskHistory[taskHistory.length - 1].content &&
        !taskHistory[taskHistory.length - 1].action && <StatusMessageCard />}
    </div>
  );
};

export default TaskHistory;
