import React, { useState, useEffect } from "react";
import { useAppState } from "../../state";
import { SidebarIcon, SearchIcon, PinIcon, DeleteIcon, LogoutIcon, LoginIcon } from "../styles/Icons";
import { useTheme } from "../styles/theme";
import { Chat } from "../../state/storage";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToProfile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigateToProfile }) => {
  const [searchQuery, setSearchQuery] = useState("");
  // Animation state
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { colors, shadows } = useTheme();

  // Add custom scrollbar styles
  React.useEffect(() => {
    const styleId = "sidebar-scrollbar-style";
    let style = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: ${colors.app.scrollbarThumb};
        border-radius: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: ${colors.text.primary};
      }
    `;
  }, [colors.app.scrollbarThumb, colors.text.primary]);

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

    // Auth state
    user: state.auth.user,
    isAuthenticated: state.auth.isAuthenticated,

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

  const handleLogout = () => {
    // Open the web app logout page which will handle the sign out
    // and automatically notify the extension
    window.open('https://www.superwizard.ai/auth/logout', '_blank');
    onClose();
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
        backgroundColor: "rgba(0,0,0,0.6)",
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
          backgroundColor: colors.app.primary,
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
            style={{ padding: "16px", position: "relative" }}
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
                    fontWeight: "normal",
                    color: colors.text.primary,
                    margin: 0,
                    WebkitTextStroke: `0.25px ${colors.text.primary}`,
                    textShadow: 'none',
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
                    color: colors.text.secondary,
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
                  backgroundColor: colors.brand.main,
                  color: colors.text.white,
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
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.brand.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.brand.main;
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
                      color: colors.text.secondary,
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
                    height: "38px",
                    paddingLeft: "40px",
                    paddingRight: "16px",
                    paddingTop: "0px",
                    paddingBottom: "0px",
                    border: `1.5px solid ${colors.border.primary}`,
                    borderRadius: "9999px",
                    fontSize: "14px",
                    backgroundColor: colors.app.primary,
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
              opacity: 0.6,
            }}
          ></div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px",
              // Firefox scrollbar styles
              scrollbarWidth: "thin",
                  scrollbarColor: `${colors.app.scrollbarThumb} transparent`,
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
                  color: colors.text.secondary,
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
                            color: colors.text.secondary,
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
                                  ? colors.app.hover
                                  : colors.app.primary,
                                boxShadow: "none",
                                transition: "background-color 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                if (!isCurrentChat) {
                                  e.currentTarget.style.backgroundColor =
                                    colors.app.hover;
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
                                    colors.app.primary;
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
                                      color: colors.text.primary,
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
                                    color: colors.text.secondary,
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
                                    color: colors.state.error,
                                    width: "26px",
                                    height: "26px",
                                    transition:
                                      "background-color 0.2s ease, color 0.2s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      colors.state.error;
                                    e.currentTarget.style.color = colors.app.primary;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      "transparent";
                                    e.currentTarget.style.color =
                                      colors.state.error;
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
                  color: colors.text.secondary,
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
              opacity: 0.6,
            }}
          ></div>

          {/* User Profile Section */}
          <div style={{ padding: "8px 16px 16px 16px" }}>
            {state.isAuthenticated && state.user ? (
              <div 
                style={{
                  background: colors.app.primary,
                  borderRadius: '12px',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background-color 0.2s ease',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  onClose();
                  onNavigateToProfile?.();
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.app.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.app.primary;
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  position: 'relative',
                  overflow: 'hidden',
                  border: `2px solid ${colors.border.primary}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: state.user.avatar_url ? 'transparent' : colors.brand.main,
                  flexShrink: 0
                }}>
                  {state.user.avatar_url ? (
                    <img
                      src={state.user.avatar_url}
                      alt="Profile"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center',
                      }}
                      onError={(e) => {
                        // Fallback if image fails to load
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.style.background = colors.brand.main;
                          parent.innerHTML = (state.user?.full_name || state.user?.email || 'U').charAt(0).toUpperCase();
                          parent.style.fontSize = '12px';
                          parent.style.fontWeight = '600';
                          parent.style.color = colors.app.primary;
                        }
                      }}
                    />
                  ) : (
                    <span style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: colors.app.primary
                    }}>
                      {(state.user?.full_name || state.user?.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                
                {/* Name and Email */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    margin: '0 0 2px 0',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: colors.text.primary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {state.user.full_name || 'No name provided'}
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: '12px',
                    color: colors.text.muted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {state.user.email}
                  </p>
                </div>

                {/* Logout Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogout();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    padding: '6px',
                    color: colors.state.error, // Brand red color
                    width: '32px',
                    height: '32px',
                    transition: 'background-color 0.2s ease, color 0.2s ease',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.state.error;
                    e.currentTarget.style.color = colors.app.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = colors.state.error;
                  }}
                  aria-label="Logout"
                >
                  <LogoutIcon style={{ width: '18px', height: '18px' }} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  // Open the web app login page
                  window.open('https://www.superwizard.ai/auth/login', '_blank');
                }}
                style={{
                  background: colors.app.primary,
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                }}
              >
                <LoginIcon style={{ 
                  width: '18px', 
                  height: '18px',
                  color: colors.text.primary
                }} />
                <span style={{
                  fontFamily: "Geist, sans-serif",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: colors.text.primary,
                  letterSpacing: "0.06em",
                }}>
                  Login
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
