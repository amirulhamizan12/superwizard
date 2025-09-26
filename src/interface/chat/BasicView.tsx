import React from "react";
import { useAppState } from "../../state";
import { TaskHistoryEntry } from "../../state";
import { useTheme } from "../styles/theme";
import StatusCard from "../components/StatusCards";
import MarkdownRenderer from "../components/MarkdownRenderer";

// ===== TYPES =====
interface MessageBubbleProps {
  message: string;
  isUser: boolean;
}


// ===== COMPONENTS =====
const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isUser }) => {
  const { colors } = useTheme();
  
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        width: "100%",
        marginTop: isUser ? 12 : 0,
        marginBottom: isUser ? 24 : 0,
      }}
    >
      <div
        style={{
          maxWidth: isUser ? "85%" : "100%", // Full width for AI responses
          width: isUser ? "auto" : "100%", // Explicit width for AI responses
          minWidth: 0, // Prevent flexbox constraints
          background: isUser 
            ? colors.brand.main
            : "transparent", // No background for AI responses
          color: isUser ? "white" : colors.text.primary,
          padding: isUser ? "12px" : "0", // No padding for AI responses
          borderRadius: isUser ? 17 : 0, // No border radius for AI responses
          borderTopRightRadius: isUser ? 6 : 0,
          borderTopLeftRadius: isUser ? 17 : 0,
          fontSize: 14,
          whiteSpace: isUser ? "pre-wrap" : "normal", // Only pre-wrap for user messages
          wordBreak: "break-word",
          border: "none", // No border for AI responses
          lineHeight: "1.5",
          fontFamily: "Geist",
          letterSpacing: "0.02em",
          boxShadow: "none",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {isUser ? (
          message
        ) : (
          // AI responses: Markdown rendering
          <MarkdownRenderer content={message} />
        )}
      </div>
    </div>
  );
};


// ===== MAIN COMPONENT =====
const BasicView: React.FC = () => {
  const taskHistory = useAppState((s) =>
    s.storage.actions.getCurrentChatMessages()
  );
  const { colors } = useTheme();

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
          backgroundColor: colors.app.primary,
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
            fontFamily: "Geist",
            fontSize: 14,
            letterSpacing: "0.02em",
          }}
        >
          No messages yet. Start a conversation!
        </div>
        {/* Show status messages even when no history */}
        <StatusCard />
      </div>
    );
  }

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
        backgroundColor: colors.app.primary,
        overflowY: "auto",
        minHeight: 0,
        position: "relative",
      }}
    >
      {taskHistory.map((entry: TaskHistoryEntry, index: number) => {
        const isLast = index === taskHistory.length - 1;
        const hasAiContent = entry.content;

        return (
          <div key={`${entry.timestamp}-${index}`}>
            {/* User message */}
            {entry.prompt && (
              <MessageBubble message={entry.prompt} isUser={true} />
            )}
            
            {/* AI response - plain text without bubble */}
            {entry.content && (
              <MessageBubble 
                message={entry.content} 
                isUser={false} 
              />
            )}
            
            {/* Show status messages after the last AI response */}
            {isLast && hasAiContent && <StatusCard />}
          </div>
        );
      })}

      {/* Show status messages if the last entry was a user prompt without AI response */}
      {taskHistory.length > 0 &&
        !taskHistory[taskHistory.length - 1].content && <StatusCard />}
    </div>
  );
};

export default BasicView;