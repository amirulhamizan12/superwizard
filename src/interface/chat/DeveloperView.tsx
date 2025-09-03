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
  type?: "prompt" | "response" | "action" | "usage" | "context" | "screenshot";
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
  }[type] || colors.text.secondary);

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

    return (
      <div
        style={{
          border: `1px solid ${colors.border.light}`,
          borderRadius: 8,
          marginBottom: 0,
          overflow: "hidden",
          backgroundColor: colors.background.primary,
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
            backgroundColor: colors.background.hover,
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "Geist, sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: getTypeColor(type),
                textTransform: "capitalize",
              }}
            >
              {title}
            </span>
            {type === "usage" && content.total_tokens && (
              <span
                style={{
                  fontSize: 11,
                  color: colors.text.tertiary,
                  backgroundColor: colors.background.primary,
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontFamily: "Geist Mono, monospace",
                }}
              >
                {content.total_tokens} tokens
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={handleCopy}
              style={{
                padding: "2px 6px",
                fontSize: 10,
                fontWeight: 500,
                border: `1px solid ${colors.border.light}`,
                borderRadius: 4,
                backgroundColor: colors.background.primary,
                color: colors.text.secondary,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <span
              style={{
                transition: "transform 0.2s ease",
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
              fontFamily: "Geist Mono, monospace",
              fontSize: 11,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: colors.text.primary,
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
            ) : (
              <div
                style={{
                  fontFamily: "Geist Mono, monospace",
                  fontSize: 11,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: colors.text.primary,
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

const MessageCard: React.FC<MessageCardProps> = React.memo(
  ({ entry, stepNumber }) => {
    const [expandedSections, setExpandedSections] = React.useState<
      Record<string, boolean>
    >({});
    const [copiedAll, setCopiedAll] = React.useState(false);
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
          backgroundColor: colors.background.hover,
          border: `1px solid ${colors.border.light}`,
          borderRadius: 12,
          marginBottom: 16,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: colors.background.hover,
            padding: "12px 16px",
            borderBottom: `1px solid ${colors.border.light}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div>
              <div
                style={{
                  fontFamily: "Geist, sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.text.primary,
                }}
              >
                Step {stepNumber}
              </div>
            </div>
          </div>
          <button
            onClick={handleCopyAll}
            style={{
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 500,
              border: `1px solid ${colors.border.light}`,
              borderRadius: 6,
              backgroundColor: colors.background.primary,
              color: colors.text.secondary,
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontFamily: "Geist, sans-serif",
            }}
          >
            {copiedAll ? "Copied" : "Copy All"}
          </button>
        </div>

        {/* Content Sections */}
        <div style={{ padding: "12px 16px" }}>
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
        backgroundColor: colors.background.hover,
        border: `1px solid ${colors.border.light}`,
        borderRadius: 12,
        marginBottom: 16,
        padding: "12px 16px",
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
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              border: `2px solid ${colors.primary.main}`,
              borderTopColor: "transparent",
              animation: "spin 1s linear infinite",
            }}
          />
          <span>{statusMessages[actionStatus] || "Task in progress..."}</span>
        </div>
        <div
          style={{
            fontFamily:
              "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace",
            fontSize: 12,
            color: colors.text.secondary,
            marginLeft: 28,
            minWidth: "50px",
            whiteSpace: "nowrap",
            letterSpacing: "0.5px",
          }}
        >
          {(elapsedTime / 1000).toFixed(2)}s
        </div>
      </div>
      <style>{`@keyframes spin{100%{transform:rotate(360deg)}}`}</style>
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
          maxWidth: 600,
          margin: "0 auto",
          padding: "24px 16px",
          backgroundColor: colors.background.primary,
          overflowY: "auto",
          minHeight: 0,
        }}
      >
        <div
          style={{
            padding: 24,
            textAlign: "center",
            color: colors.text.tertiary,
            fontFamily: "Geist, sans-serif",
            fontSize: 14,
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
        maxWidth: 600,
        margin: "0 auto",
        padding: "24px 16px",
        backgroundColor: colors.background.primary,
        overflowY: "auto",
        minHeight: 0,
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
          <React.Fragment key={`${entry.timestamp}-${index}`}>
            {entry.prompt && (
              <MessageBubble message={entry.prompt} isUser={true} />
            )}
            {hasAiContent && (
              <MessageCard entry={entry} stepNumber={aiStepCounter} />
            )}
            {/* Show status messages after the last AI response */}
            {isLast && hasAiContent && <StatusMessageCard />}
          </React.Fragment>
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
