import React from "react";
import { useAppState } from "../../state";
import { TaskHistoryEntry } from "../../state";
import { ChevronDownIcon } from "../styles/Icons";
import { useTheme } from "../styles/theme";
import StatusCard from "../components/StatusCards";

// ============================================================================
// TYPES
// ============================================================================

interface MessageCardProps {
  entry: TaskHistoryEntry;
  stepNumber?: number;
}

interface SectionProps {
  title: string;
  content: any;
  isExpanded: boolean;
  onToggle: () => void;
  type?: "prompt" | "response" | "action" | "usage" | "context" | "code" | "error";
}

interface CollapsibleCodeBlockProps {
  content: string;
  language?: string;
  title: string;
  maxHeight?: string;
  collapsedByDefault?: boolean;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getTypeColor = (type: string, colors: any) =>
  ({
    prompt: colors.brand.main,
    response: colors.brand.main,
    action: colors.brand.main,
    usage: colors.text.tertiary,
    context: colors.text.secondary,
    error: colors.state.error,
  }[type] || colors.text.secondary);

const copyToClipboard = async (content: any) => {
  const text = typeof content === "string" ? content : JSON.stringify(content, null, 2);
  await navigator.clipboard.writeText(text);
};

// ============================================================================
// COLLAPSIBLE CODE BLOCK
// ============================================================================

const CollapsibleCodeBlock: React.FC<CollapsibleCodeBlockProps> = ({
  content,
  language = "text",
  title,
  maxHeight = "300px",
  collapsedByDefault = false,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(!!collapsedByDefault);
  const { colors } = useTheme();

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await copyToClipboard(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 12px",
    backgroundColor: colors.app.secondary,
    borderBottom: `1px solid ${colors.border.primary}`,
    fontFamily: "Geist, sans-serif",
    fontSize: 10,
    lineHeight: "1.3",
    fontWeight: 500,
    color: colors.text.secondary,
    letterSpacing: "0.08em",
  };

  const buttonStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 12px",
    fontSize: 10,
    fontWeight: 500,
    border: "none",
    borderRadius: 4,
    backgroundColor: colors.app.primary,
    color: colors.text.secondary,
    cursor: "pointer",
    userSelect: "none" as const,
  };

  return (
    <div
      style={{
        backgroundColor: colors.app.primary,
        border: `1px solid ${colors.border.primary}`,
        borderRadius: 8,
        overflow: "hidden",
        marginTop: 8,
      }}
    >
      <div style={headerStyle} onClick={() => setCollapsed((c) => !c)}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
          <span style={{ fontWeight: 600, letterSpacing: "0.02em" }}>{title}</span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
              opacity: 0.7,
            }}
          >
            <ChevronDownIcon w="15px" h="15px" />
          </span>
        </div>
        <button style={buttonStyle} onClick={handleCopy}>
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
            backgroundColor: colors.app.primary,
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

// ============================================================================
// SECTION COMPONENT
// ============================================================================

const Section: React.FC<SectionProps> = React.memo(
  ({ title, content, isExpanded, onToggle, type = "response" }) => {
    const [copied, setCopied] = React.useState(false);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const { colors } = useTheme();

    const handleCopy = React.useCallback(
      async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
          await copyToClipboard(content);
          setCopied(true);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => setCopied(false), 1500);
        } catch {}
      },
      [content]
    );

    React.useEffect(() => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
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
          backgroundColor: colors.app.primary,
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
            backgroundColor: colors.app.secondary,
            borderBottom: isExpanded ? `1px solid ${isErrorType ? colors.state.error : colors.border.primary}` : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "Geist, sans-serif",
                fontSize: 12,
                fontWeight: 600,
                color: isErrorType ? colors.state.error : getTypeColor(type, colors),
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
                  backgroundColor: colors.app.primary,
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
                  backgroundColor: colors.app.primary,
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
                border: `1px solid ${colors.border.primary}`,
                borderRadius: 6,
                backgroundColor: colors.app.primary,
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
              <ChevronDownIcon w="14px" h="14px" />
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
              backgroundColor: colors.app.primary,
            maxHeight: "300px",
            overflowY: "auto",
            }}
          >
            {isCodeType ? (
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
                {typeof content === "string" ? content : JSON.stringify(content, null, 2)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

// ============================================================================
// MESSAGE BUBBLE
// ============================================================================

const MessageBubble: React.FC<{ message: string }> = ({ message }) => {
  const { colors } = useTheme();

  return (
    <div style={{ display: "flex", justifyContent: "flex-end", width: "100%", marginBottom: 24 }}>
      <div
        style={{
          maxWidth: "85%",
          background: colors.brand.main,
          color: "white",
          padding: "12px",
          borderRadius: 17,
          borderTopRightRadius: 6,
          borderTopLeftRadius: 17,
          fontSize: 14,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          border: "none",
          lineHeight: "1.5",
          fontFamily: "Geist",
          letterSpacing: "0.02em",
          boxShadow: "none",
          position: "relative",
        }}
      >
        {message}
      </div>
    </div>
  );
};

// ============================================================================
// MESSAGE CARD
// ============================================================================

const MessageCard: React.FC<MessageCardProps> = React.memo(({ entry, stepNumber }) => {
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({ action: true });
  const [copiedAll, setCopiedAll] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const { colors } = useTheme();

  const toggleSection = React.useCallback((sectionKey: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  }, []);

  const handleCopyAll = React.useCallback(async () => {
    try {
      await copyToClipboard(entry);
      setCopiedAll(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopiedAll(false), 1500);
    } catch {}
  }, [entry]);

  const sections = React.useMemo(
    () =>
      [
        { key: "context", data: entry.context, type: "context" as const },
        { key: "response", data: entry.content, type: "response" as const },
        { key: "action", data: entry.action, type: "action" as const },
      ].filter((s) => s.data),
    [entry]
  );

  const hasErrors = sections.some((s) => s.data && typeof s.data === "object" && "error" in s.data);

  React.useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return (
    <div
      style={{
        backgroundColor: colors.app.primary,
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
      <div
        style={{
          padding: "12px",
          backgroundColor: colors.app.secondary,
          borderBottom: "none",
          position: "relative",
          cursor: "pointer",
        }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                  backgroundColor: colors.app.primary,
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
                border: `1px solid ${colors.border.primary}`,
                borderRadius: 6,
                backgroundColor: colors.app.primary,
                color: colors.text.secondary,
                cursor: "pointer",
                fontFamily: "Geist, sans-serif",
              }}
            >
              {copiedAll ? "Copied" : "Copy All"}
            </button>
            <ChevronDownIcon
              w="17px"
              h="17px"
              style={{
                transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                color: colors.text.secondary,
              }}
            />
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <div style={{ padding: "8px 8px 4px 8px" }}>
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
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DeveloperView: React.FC = () => {
  const taskHistory = useAppState((s) => s.storage.actions.getCurrentChatMessages());
  const { colors } = useTheme();

  const containerStyle = {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "stretch" as const,
    width: "100%",
    maxWidth: 665,
    margin: "0 auto",
    padding: "32px 20px",
    backgroundColor: colors.app.primary,
    overflowY: "auto" as const,
    minHeight: 0,
    position: "relative" as const,
  };

  if (!taskHistory || taskHistory.length === 0) {
    return (
      <div style={containerStyle}>
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
      </div>
    );
  }

  let aiStepCounter = 0;

  return (
    <div style={containerStyle}>
      {taskHistory.map((entry: TaskHistoryEntry, index: number) => {
        const hasAiContent = entry.content || entry.action || entry.usage || entry.context;
        const isCompleteAiContent = hasAiContent;

        if (isCompleteAiContent) aiStepCounter++;

        return (
          <div key={`${entry.timestamp}-${index}`}>
            {entry.prompt && <MessageBubble message={entry.prompt} />}
            {isCompleteAiContent && <MessageCard entry={entry} stepNumber={aiStepCounter} />}
          </div>
        );
      })}
      <StatusCard />
    </div>
  );
};

export default DeveloperView;