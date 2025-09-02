import React, { useState, useEffect } from "react";
import { useAppState } from "../../state";
import { SidebarIcon, SearchIcon, PinIcon, DeleteIcon } from "../styles/Icons";
import { colors, shadows } from "../styles/theme";
import { Chat } from "../../state/storage";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  // Animation state
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Add custom scrollbar styles
  React.useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Double RAF for smoothness (like OptionMenu)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setIsAnimating(true))
      );
    } else if (isVisible) {
      setIsAnimating(false);
      setTimeout(() => setIsVisible(false), 300); // match transition duration
    }
  }, [isOpen, isVisible]);

  const state = useAppState((state) => ({
    // Storage state
    chats: state.storage.chats,
    currentChatId: state.storage.currentChatId,
    isLoading: state.storage.isLoading,

    // Task manager state
    taskStatus: state.taskManager.status,

    // Actions
    prepareNewChatSession: state.storage.actions.prepareNewChatSession,
    deleteChat: state.storage.actions.deleteChat,
    switchToChat: state.storage.actions.switchToChat,
    pinChat: state.storage.actions.pinChat,
    searchChats: state.storage.actions.searchChats,
    interrupt: state.taskManager.actions.interrupt,
    clearHistory: state.taskManager.actions.clearHistory,
    setInstructions: state.settings.actions.setInstructions,
  }));

  const handleNewChat = () => {
    // Stop any running task first
    if (state.taskStatus === "running") {
      state.interrupt();
    }

    // Use prepareNewChatSession instead of createNewChat
    // This will only prepare for a new chat without actually creating it
    state.prepareNewChatSession();
    state.clearHistory();
    state.setInstructions("");
    onClose();
  };

  const handleSwitchToChat = async (chatId: string) => {
    if (state.taskStatus === "running") {
      state.interrupt();
    }

    await state.switchToChat(chatId);
    state.setInstructions("");
    onClose();
  };

  const handleDeleteChat = async (chatId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (state.taskStatus === "running" && state.currentChatId === chatId) {
      state.interrupt();
    }

    await state.deleteChat(chatId);
  };

  const handlePinChat = async (
    chatId: string,
    isPinned: boolean,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    await state.pinChat(chatId, !isPinned);
  };

  // Helper function to get time-based sections
  const getTimeSection = (date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const chatDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const diffTime = today.getTime() - chatDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays <= 7) return "This Week";
    if (diffDays <= 30) return "This Month";
    if (diffDays <= 365) return "This Year";
    return "Past Year";
  };

  // Group chats by time sections
  const groupChatsByTime = (chats: Chat[]) => {
    const pinned = chats.filter((chat) => chat.isPinned);
    const unpinned = chats.filter((chat) => !chat.isPinned);

    const sections: { [key: string]: Chat[] } = {};

    // Add pinned section first (sorted by most recent updatedAt)
    if (pinned.length > 0) {
      sections["Pinned"] = pinned.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }

    // Group unpinned chats by time
    unpinned.forEach((chat) => {
      const lastInteraction = new Date(chat.updatedAt);
      const section = getTimeSection(lastInteraction);

      if (!sections[section]) {
        sections[section] = [];
      }
      sections[section].push(chat);
    });

    // Sort each section by most recent updatedAt
    Object.keys(sections).forEach((sectionName) => {
      if (sectionName !== "Pinned") {
        sections[sectionName].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }
    });

    return sections;
  };

  // Get filtered chats based on search
  const filteredChats = searchQuery.trim()
    ? state.searchChats(searchQuery)
    : state.chats;

  // Group the filtered chats
  const groupedChats = groupChatsByTime(filteredChats);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.background.overlay,
        backdropFilter: "blur(4px)",
        zIndex: 998,
        opacity: isAnimating ? 1 : 0,
        transition: "opacity 0.3s ease, backdrop-filter 0.3s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: "320px",
          backgroundColor: colors.background.primary,
          // borderRight: `1px solid ${colors.border.primary}`,
          borderTopRightRadius: "24px",
          borderBottomRightRadius: "24px",
          zIndex: 999,
          boxShadow: shadows.xl,
          display: "flex",
          flexDirection: "column",
          transform: `translateX(${isAnimating ? 0 : -100}%)`,
          opacity: isAnimating ? 1 : 0.7,
          transition:
            "transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
          <div
            style={{ height: "170px", padding: "16px", position: "relative" }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <p
                  style={{
                    fontFamily: "'Roca One', sans-serif",
                    fontSize: "20px",
                    fontWeight: "500",
                    color: colors.text.accent,
                    margin: 0,
                    WebkitTextStroke: `0.4px ${colors.text.accent}`,
                    textShadow: `0.2px 0.2px 0 ${colors.text.accent}, -0.2px -0.2px 0 ${colors.text.accent}, 0.2px -0.2px 0 ${colors.text.accent}, -0.2px 0.2px 0 ${colors.text.accent}`,
                    transform: "translateY(2px)",
                    letterSpacing: "0.06em",
                  }}
                >
                  Chat History
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: colors.text.placeholder,
                    cursor: "pointer",
                    paddingLeft: "12px",
                    paddingRight: "12px",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform 0.2s",
                  }}
                  aria-label="Close sidebar"
                  onMouseDown={(e) =>
                    (e.currentTarget.style.transform = "scale(0.9)")
                  }
                  onMouseUp={(e) =>
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                >
                  <SidebarIcon style={{ width: "20px", height: "20px" }} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleNewChat}
                style={{
                  fontFamily: "Geist, sans-serif",
                  width: "100%",
                  backgroundColor: colors.primary.main,
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  letterSpacing: "0.06em",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "Geist, sans-serif",
                      fontSize: "18px",
                      margin: 0,
                      lineHeight: 1,
                      letterSpacing: "0.06em",
                    }}
                  >
                    +
                  </p>
                </span>
                New Chat
              </button>

              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    zIndex: 1,
                    pointerEvents: "none",
                  }}
                >
                  <SearchIcon
                    style={{
                      color: colors.text.placeholder,
                      width: "16px",
                      height: "16px",
                    }}
                  />
                </div>
                <input
                  placeholder="Search your threads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    fontFamily: "Geist, sans-serif",
                    width: "100%",
                    paddingLeft: "40px",
                    paddingRight: "16px",
                    paddingTop: "12px",
                    paddingBottom: "12px",
                    border: `1.5px solid ${colors.border.primary}`,
                    borderRadius: "9999px",
                    fontSize: "14px",
                    backgroundColor: colors.background.primary,
                    outline: "none",
                    letterSpacing: "0.06em",
                  }}
                />
              </div>
            </div>
          </div>
          <div
            style={{
              height: "1px",
              backgroundColor: colors.border.primary,
              marginLeft: "16px",
              marginRight: "16px",
            }}
          ></div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px",
              // Firefox scrollbar styles
              scrollbarWidth: "thin",
              scrollbarColor: "#c1c1c1 transparent",
            }}
            className="custom-scrollbar"
          >
            {state.isLoading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "32px",
                  color: colors.text.placeholder,
                }}
              >
                <div
                  style={{ fontSize: "14px", fontFamily: "Geist, sans-serif" }}
                >
                  Loading chats...
                </div>
              </div>
            ) : Object.keys(groupedChats).length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {Object.entries(groupedChats).map(
                  ([sectionName, sectionChats]) => (
                    <div key={sectionName}>
                      {/* Section Header */}
                      <div
                        style={{
                          padding: "8px 12px",
                          marginBottom: "4px",
                        }}
                      >
                        <h3
                          style={{
                            fontFamily: "Geist, sans-serif",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: colors.text.placeholder,
                            margin: 0,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                          }}
                        >
                          {sectionName}
                        </h3>
                      </div>

                      {/* Section Chats */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                      >
                        {sectionChats.map((chat: Chat) => {
                          const isCurrentChat = chat.id === state.currentChatId;
                          const isPinned = chat.isPinned;

                          return (
                            <div
                              key={chat.id}
                              onClick={() => handleSwitchToChat(chat.id)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "8px 4px 8px 12px",
                                cursor: "pointer",
                                borderRadius: "8px",
                                height: "36px",
                                border: "none",
                                borderLeft: "none",
                                background: isCurrentChat
                                  ? "#f0f0f0"
                                  : "#fafafa",
                                boxShadow: "none",
                                transition: "background-color 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                if (!isCurrentChat) {
                                  e.currentTarget.style.backgroundColor =
                                    "#f0f0f0";
                                }
                                // Show buttons on hover
                                const buttonContainer =
                                  e.currentTarget.querySelector(
                                    "[data-button-container]"
                                  ) as HTMLElement;
                                if (buttonContainer) {
                                  buttonContainer.style.opacity = "1";
                                  buttonContainer.style.maxWidth = "60px";
                                  buttonContainer.style.paddingRight = "0px";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isCurrentChat) {
                                  e.currentTarget.style.backgroundColor =
                                    "#fafafa";
                                }
                                // Hide buttons when not hovering (unless it's the current chat)
                                const buttonContainer =
                                  e.currentTarget.querySelector(
                                    "[data-button-container]"
                                  ) as HTMLElement;
                                if (buttonContainer && !isCurrentChat) {
                                  buttonContainer.style.opacity = "0";
                                  buttonContainer.style.maxWidth = "0px";
                                  buttonContainer.style.paddingRight = "10px";
                                }
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "stretch",
                                  justifyContent: "flex-start",
                                  flexDirection: "column",
                                  flex: "1 1 0%",
                                  minWidth: "0px",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "flex-start",
                                    width: "100%",
                                    minWidth: "0px",
                                    lineHeight: "20px",
                                    gap: "6px",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "14px",
                                      color: "rgb(45, 55, 72)",
                                      fontWeight: isCurrentChat ? "600" : "500",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      flex: "1 1 0%",
                                      minWidth: "0px",
                                    }}
                                  >
                                    {chat.title}
                                  </span>
                                </div>
                              </div>
                              <div
                                data-button-container
                                style={{
                                  display: "flex",
                                  gap: "4px",
                                  alignItems: "center",
                                  flexShrink: 0,
                                  opacity: isCurrentChat ? 1 : 0,
                                  maxWidth: isCurrentChat ? "60px" : "0px",
                                  overflow: "hidden",
                                  paddingRight: isCurrentChat ? "0px" : "10px",
                                  transition:
                                    "opacity 0.2s ease, max-width 0.2s ease, padding-right 0.2s ease",
                                }}
                              >
                                <button
                                  onClick={(e) =>
                                    handlePinChat(chat.id, isPinned, e)
                                  }
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRadius: "6px",
                                    padding: "4px",
                                    color: "rgb(113, 128, 150)",
                                    width: "26px",
                                    height: "26px",
                                  }}
                                >
                                  <PinIcon
                                    filled={isPinned}
                                    style={{ width: "16px", height: "16px" }}
                                  />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteChat(chat.id, e)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRadius: "6px",
                                    padding: "4px",
                                    color: "rgb(239, 68, 68)",
                                    width: "26px",
                                    height: "26px",
                                    transition:
                                      "background-color 0.2s ease, color 0.2s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      "rgb(239, 68, 68)";
                                    e.currentTarget.style.color = "white";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      "transparent";
                                    e.currentTarget.style.color =
                                      "rgb(239, 68, 68)";
                                  }}
                                >
                                  <DeleteIcon
                                    style={{ width: "16px", height: "16px" }}
                                  />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: "16px",
                  paddingTop: "32px",
                  paddingBottom: "32px",
                  color: colors.text.placeholder,
                }}
              >
                <p
                  style={{
                    fontFamily: "Geist, sans-serif",
                    fontSize: "48px",
                    margin: 0,
                    opacity: 0.3,
                    letterSpacing: "0.06em",
                  }}
                >
                  💬
                </p>
                <p
                  style={{
                    fontFamily: "Geist, sans-serif",
                    fontSize: "14px",
                    margin: 0,
                    fontWeight: "500",
                    letterSpacing: "0.06em",
                  }}
                >
                  {searchQuery.trim() ? "No matching chats" : "No chats yet"}
                </p>
                <p
                  style={{
                    fontFamily: "Geist, sans-serif",
                    fontSize: "12px",
                    margin: 0,
                    opacity: 0.7,
                    lineHeight: "1.5",
                    letterSpacing: "0.06em",
                  }}
                >
                  {searchQuery.trim()
                    ? "Try a different search term"
                    : "Start a new chat to begin your conversation"}
                </p>
              </div>
            )}
          </div>
          <div
            style={{
              height: "1px",
              backgroundColor: colors.border.primary,
              marginLeft: "16px",
              marginRight: "16px",
            }}
          ></div>

          <div style={{ padding: "16px" }}>
            <p
              style={{
                fontFamily: "Geist, sans-serif",
                fontSize: "12px",
                color: colors.text.placeholder,
                textAlign: "center",
                margin: 0,
                letterSpacing: "0.06em",
              }}
            >
              {state.chats.length > 0
                ? `${state.chats.length} chat${
                    state.chats.length === 1 ? "" : "s"
                  }`
                : "No chats"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
