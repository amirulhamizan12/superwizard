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


const Spinner = () => (
  <div style={{ 
    display: "inline-flex", 
    alignItems: "center", 
    gap: 6,
    height: 19, 
    minWidth: 38,
    padding: "4px 8px",
    borderRadius: 11,
    backgroundColor: colors.background.secondary,
    border: `1px solid ${colors.border.light}`,
  }}>
    <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.8);opacity:0.5}40%{transform:scale(1.2);opacity:1}}`}</style>
    {[0, 0.2, 0.4].map((d, i) => (
      <span
        key={i}
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${colors.primary.main}, ${colors.primary.light})`,
          verticalAlign: "middle",
          animation: `bounce 1.4s infinite ease-in-out both ${d}s`,
          boxShadow: "none",
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
          fontSize: 11,
          lineHeight: "1.4",
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
              transition: "transform 0.2s",
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
            padding: "4px 16px",
            fontSize: 11,
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
          <span style={{ letterSpacing: "0.02em" }}>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      {!collapsed && (
        <div
          style={{
            fontFamily: "Geist Mono, monospace",
            fontSize: 11,
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
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

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
        transform: isVisible ? "translateY(0)" : "translateY(-10px)",
        opacity: isVisible ? 1 : 0,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
          boxShadow: "none",
          position: "relative",
        }}
      >
        {/* Message content */}
        <div>
          {processedMessage}
        </div>
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
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = React.useState<number | null>(null);
  const dotRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [lineHeights, setLineHeights] = React.useState<number[]>([]);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    setIsVisible(true);
  }, []);

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
        marginTop: 11,
        marginBottom: 11,
        transform: isVisible ? "translateY(0)" : "translateY(-19px)",
        opacity: isVisible ? 1 : 0,
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {steps.map((step, idx) => {
        const isExpanded = expandedIdx === idx;
        const isHovered = hoveredIdx === idx;
        const isSelected = selectedIdx === idx;
        const isLast = idx === steps.length - 1;
        
        return (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "flex-start",
              position: "relative",
              marginBottom: isLast ? 0 : 8,
              padding: 0,
              borderRadius: 11,
              backgroundColor: step.hasError
                ? colors.stateBackground.error
                : (isHovered || isSelected)
                  ? colors.background.hover 
                  : "transparent",
              border: step.hasError
                ? `1px solid ${colors.state.error}`
                : (isHovered || isSelected)
                  ? `1px solid ${colors.border.light}`
                  : "1px solid transparent",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              cursor: "pointer",
            }}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => {
              setExpandedIdx(isExpanded ? null : idx);
              setSelectedIdx(isSelected ? null : idx);
            }}
          >
            <div
              style={{
                position: "relative",
                width: 30,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginRight: 15,
              }}
            >
              {/* Step indicator */}
              <div
                ref={(el) => {
                  dotRefs.current[idx] = el;
                }}
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: step.hasError
                    ? colors.state.error
                    : step.isStatusStep
                    ? `linear-gradient(135deg, ${colors.primary.main}, ${colors.primary.light})`
                    : colors.primary.main,
                  zIndex: 2,
                  position: "relative",
                  margin: 0,
                  marginTop: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "none",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: (isHovered || isSelected) ? "scale(1.1)" : "scale(1)",
                }}
              >
                {step.hasError && (
                  <div
                    style={{
                      fontSize: 8,
                      color: "white",
                      fontWeight: "bold",
                    }}
                  >
                    !
                  </div>
                )}
              </div>
              
              {/* Connecting line */}
              {!isLast && lineHeights[idx] > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: 19,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 2,
                    height: lineHeights[idx] - 8,
                    background: step.hasError
                      ? `linear-gradient(to bottom, ${colors.state.error}40, ${colors.state.error}20)`
                      : `linear-gradient(to bottom, ${colors.primary.main}40, ${colors.primary.main}20)`,
                    borderRadius: 1,
                    zIndex: 1,
                    opacity: (isHovered || isSelected) ? 1 : 0.6,
                    transition: "opacity 0.3s ease",
                  }}
                />
              )}
            </div>
            
            {/* Step content */}
            <div
              style={{
                flex: 1,
                minHeight: 42,
                minWidth: 0,
                overflow: "hidden",
                padding: "8px 0",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: step.hasError 
                    ? colors.state.error 
                    : step.isStatusStep
                    ? colors.primary.main
                    : colors.text.primary,
                  fontFamily: "Geist, sans-serif",
                  marginBottom: 4,
                  letterSpacing: "0.02em",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                  maxWidth: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>{step.title}</span>
              </div>
              
              <div
                style={{
                  color: step.hasError
                    ? colors.state.error
                    : colors.text.secondary,
                  fontSize: 13,
                  fontFamily: "Geist, sans-serif",
                  whiteSpace: "pre-line",
                  letterSpacing: "0.02em",
                  display: "-webkit-box",
                  WebkitLineClamp: isExpanded ? "unset" : 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  maxWidth: "100%",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                  lineHeight: 1.5,
                  paddingRight: 11,
                }}
              >
                {step.description}
                
                
              </div>
              
              {step.baseUrl && (
                <div
                  style={{
                    fontSize: 11,
                    color: colors.text.tertiary,
                    marginTop: 8,
                    wordBreak: "break-all",
                    overflowWrap: "break-word",
                    maxWidth: "100%",
                    hyphens: "auto",
                    fontFamily: "Geist Mono, monospace",
                    padding: "4px 12px 4px 8px",
                    backgroundColor: step.hasError 
                      ? colors.stateBackground.error 
                      : (isHovered || isSelected)
                        ? colors.background.hover 
                        : colors.background.secondary,
                    borderRadius: 6,
                    border: `1px solid ${colors.border.light}`,
                    transition: step.hasError ? "none" : "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  {step.baseUrl}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const getTaskStatusText = (taskStatus: string, actionStatus: string): string => {
  if (taskStatus === "running") {
    const statusMessages: Record<string, string> = {
      initializing: "Initializing Task",
      "pulling-dom": "Analyzing Page",
      "performing-query": "Planning Action",
      "performing-action": "Executing Action",
    };
    return statusMessages[actionStatus] || "Task in Progress";
  }
  
  const statusTexts: Record<string, string> = {
    idle: "Completed",
    completed: "Task Completed",
    success: "Task Successful",
    failed: "Task Failed",
    error: "Task Error",
  };
  
  return statusTexts[taskStatus] || "Task Execution";
};

const MessageCard = ({
  steps,
  timestamp,
  statusStep,
  currentUrl,
  taskStatus,
  actionStatus,
}: {
  steps: EnhancedHistoryEntry[];
  timestamp: string;
  statusStep?: { title: string; description: string };
  currentUrl: string;
  taskStatus: string;
  actionStatus: string;
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

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
      
      // Check if it's a Task Error action
      let title = "Task Interrupted";
      if (entry.action && "name" in entry.action && entry.action.name === "Task Error") {
        title = "Task Error";
      }
      
      return {
        title,
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
        backgroundColor: colors.background.card,
        border: `1px solid ${colors.border.primary}`,
        borderRadius: 19,
        marginBottom: 19,
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        alignSelf: "flex-start",
        marginRight: "auto",
        maxWidth: "min(570px, 100%)",
        width: "100%",
        boxSizing: "border-box",
        transform: isVisible ? "translateY(0)" : "translateY(-19px)",
        opacity: isVisible ? 1 : 0,
        boxShadow: "none",
        backdropFilter: "blur(10px)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Collapsible Header */}
      <div
        style={{
          padding: "16px",
          backgroundColor: colors.background.secondary,
          borderBottom: "none",
          position: "relative",
          cursor: "pointer",
          transition: "all 0.2s ease",
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
              gap: 11,
            }}
          >
            {taskStatus === "running" && <Spinner />}
            <span
              style={{
                fontFamily: "Geist, sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: colors.text.primary,
                letterSpacing: "0.02em",
              }}
            >
              {getTaskStatusText(taskStatus, actionStatus)}
            </span>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <ChevronDownIcon 
              boxSize="17px" 
              style={{
                transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
                color: colors.text.secondary,
              }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div style={{ padding: "12px" }}>
          <Stepper steps={stepperSteps} />
        </div>
      )}
    </div>
  );
};


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
    initializing: "Starting task",
    "pulling-dom": "Analyzing page content",
    "performing-query": "Planning next action",
    "performing-action": "Executing action",
  };

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
      <style>{`
        @keyframes spin{100%{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(1.05)}}
        @keyframes fadeInDown{0%{opacity:0;transform:translateY(-20px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes slideInRight{0%{opacity:0;transform:translateX(20px)}100%{opacity:1;transform:translateX(0)}}
        @keyframes slideInLeft{0%{opacity:0;transform:translateX(-20px)}100%{opacity:1;transform:translateX(0)}}
        @keyframes bounce{0%,80%,100%{transform:scale(0.8);opacity:0.5}40%{transform:scale(1.2);opacity:1}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
      `}</style>
      {sessionGroups.map((session, sessionIndex) => {
        const isLastSession = sessionIndex === sessionGroups.length - 1;
        const showStatusStep = isLastSession && taskStatus === "running";
        const filteredSteps = session.aiSteps.filter((step) => {
          const action = step.action as any;
          return !(action && action.name === "respond");
        });

        return (
          <div 
            key={`session-${sessionIndex}`}
            style={{
              animation: `fadeInDown 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${sessionIndex * 0.1}s both`,
            }}
          >
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
                taskStatus={taskStatus}
                actionStatus={actionStatus}
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
                  <MessageBubble 
                    key={idx} 
                    message={aiMessage} 
                    isUser={false} 
                  />
                );
              })}
          </div>
        );
      })}

    </div>
  );
};

export default TaskHistory;
