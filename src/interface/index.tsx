import React, { useRef, useEffect, useState, useCallback } from "react";
import Header from "./layout/Header";
import Body from "./layout/Body";
import Bottom, { BottomRef } from "./layout/Bottom";
import { OptionMenu, OptionMenuContent } from "./layout/Menu";
import Onboarding from "./section/Onboarding";
import UserInfo from "./section/UserInfo";
import SetAPIKey from "./section/ConfigureAPI";
import { useAppState } from "../state";
import { getUserConfiguredProviders, getAuthenticatedModels } from "../wizardry/ai/endpoint/userConfig";
import "./styles/fonts";

const Interface: React.FC = () => {
  // Consolidated state subscription
  const state = useAppState();
  const {
    taskManager: { status: taskStatus, actions: taskActions },
    settings: {
      instructions,
      configuredProviders,
      currentView,
      actions: settingsActions,
    },
    storage: { actions: chatActions },
    auth: { isAuthenticated, user, actions: authActions },
  } = state;

  const devHistory = state.storage.actions.getCurrentChatMessages();

  // Local UI state
  const [prevTaskStatus, setPrevTaskStatus] = useState(taskStatus);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastHistoryLength, setLastHistoryLength] = useState(0);

  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<BottomRef>(null);

  const hasValidProvider = configuredProviders.length > 0;

  // Initialize chat manager and auth
  useEffect(() => {
    chatActions.loadChatsFromStorage();
    authActions.loadAuthFromStorage();
    authActions.startAuthListener();

    return () => {
      authActions.stopAuthListener();
    };
  }, [chatActions, authActions]);

  // Consolidated handlers
  const handleClearChat = useCallback(() => {
    if (taskStatus === "running") {
      taskActions.interrupt();
    }
    taskActions.clearHistory();
    settingsActions.setInstructions("");
  }, [taskStatus, taskActions, settingsActions]);

  const handleNewChat = useCallback(() => {
    if (taskStatus === "running") {
      taskActions.interrupt();
    }
    // Use prepareNewChatSession instead of createNewChat
    // This will only prepare for a new chat without actually creating it
    chatActions.prepareNewChatSession();
    taskActions.clearHistory();
    settingsActions.setInstructions("");
  }, [taskStatus, taskActions, chatActions, settingsActions]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const btn = document.querySelector(
        '[aria-label="Send message"]'
      ) as HTMLButtonElement;
      if (btn && !btn.disabled) btn.click();
    }
  }, []);

  // Simplified omnibox command processing
  const processOmniboxCommand = useCallback(
    (command: string) => {
      console.log("Processing omnibox command:", command);

      const currentInstructions = instructions || "";
      settingsActions.setInstructions(command);

      // Execute task directly if available
      if (taskActions.runTask) {
        taskActions.runTask((msg: string) => console.error("Task error:", msg));
        setTimeout(
          () => settingsActions.setInstructions(currentInstructions),
          1
        );
        return;
      }

      // Fallback: trigger send button
      setTimeout(() => {
        const sendBtn = document.querySelector(
          '[aria-label="Send message"]'
        ) as HTMLButtonElement;
        if (sendBtn && !sendBtn.disabled) {
          sendBtn.click();
          setTimeout(
            () => settingsActions.setInstructions(currentInstructions),
            100
          );
        }
      }, 10);
    },
    [instructions, taskActions, settingsActions]
  );

  // Task status change effect
  useEffect(() => {
    if (
      prevTaskStatus === "running" &&
      (taskStatus === "completed" ||
        taskStatus === "success" ||
        taskStatus === "error")
    ) {
      // Task completion handling if needed
    }
    setPrevTaskStatus(taskStatus);
  }, [taskStatus, prevTaskStatus]);

  // Auto-scroll to very bottom whenever a new message (AI or user) arrives
  useEffect(() => {
    const currentLength = devHistory.length;
    const hasNewHistory = currentLength > lastHistoryLength;

    if (hasNewHistory) {
      // Defer to next frame to ensure DOM/layout is updated
      requestAnimationFrame(() => {
        const el = chatContainerRef.current;
        if (!el) return;
        // Smooth scroll to the absolute bottom of the container
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
        // Ensure images/content that load late don't prevent reaching the bottom
        requestAnimationFrame(() => {
          el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
        });
      });
    }

    setLastHistoryLength(currentLength);
  }, [devHistory, taskStatus, lastHistoryLength]);

  // Consolidated omnibox handling
  useEffect(() => {
    const handleOmniboxCommand = (event: CustomEvent) => {
      const command = event.detail?.command;
      if (command && typeof command === "string") {
        processOmniboxCommand(command);
      }
    };

    const handleStorageCommand = async (command: string, tabId?: number) => {
      if (tabId) {
        useAppState.setState((appState) => {
          appState.taskManager.tabId = tabId;
        });
      }
      processOmniboxCommand(command);
    };

    const checkStorageForCommands = async () => {
      try {
        const result = await chrome.storage.local.get([
          "omnibox_command",
          "omnibox_timestamp",
          "website_new_tab",
          "website_tab_id",
        ]);

        if (result.omnibox_command && result.omnibox_timestamp) {
          const timeDiff = Date.now() - result.omnibox_timestamp;

          if (timeDiff < 5000) {
            await handleStorageCommand(
              result.omnibox_command,
              result.website_new_tab && result.website_tab_id
                ? result.website_tab_id
                : undefined
            );

            await chrome.storage.local.remove([
              "omnibox_command",
              "omnibox_timestamp",
              "website_new_tab",
              "website_tab_id",
            ]);
          }
        }
      } catch (error) {
        console.error("Storage check failed:", error);
      }
    };

    const storageListener = (changes: {
      [key: string]: chrome.storage.StorageChange;
    }) => {
      if (changes.omnibox_command?.newValue) {
        const command = changes.omnibox_command.newValue;
        const timestamp = changes.omnibox_timestamp?.newValue || Date.now();
        const timeDiff = Date.now() - timestamp;

        if (timeDiff < 5000) {
          const tabId =
            changes.website_new_tab?.newValue &&
            changes.website_tab_id?.newValue
              ? changes.website_tab_id.newValue
              : undefined;

          handleStorageCommand(command, tabId);

          setTimeout(() => {
            chrome.storage.local.remove([
              "omnibox_command",
              "omnibox_timestamp",
              "website_new_tab",
              "website_tab_id",
            ]);
          }, 100);
        }
      }
    };

    // Event listeners
    const eventListener = handleOmniboxCommand as EventListener;
    window.addEventListener("omnibox-command", eventListener);
    document.addEventListener("omnibox-command", eventListener);
    chrome?.storage?.onChanged?.addListener(storageListener);

    // Initial check for commands
    setTimeout(checkStorageForCommands, 100);

    return () => {
      window.removeEventListener("omnibox-command", eventListener);
      document.removeEventListener("omnibox-command", eventListener);
      chrome?.storage?.onChanged?.removeListener(storageListener);
    };
  }, [processOmniboxCommand]);

  // Routing logic
  if (currentView === 'apiConfig') {
    return <SetAPIKey onBack={() => settingsActions.setCurrentView('chat')} />;
  }

  if (currentView === 'userInfo') {
    return <UserInfo onBack={() => settingsActions.setCurrentView('chat')} />;
  }

  // Show Onboarding if neither authenticated nor has valid providers
  // Users can access chat interface if they are either:
  // 1. Authenticated (access to Server API models)
  // 2. Have configured at least one provider (access to their API models)
  if (!isAuthenticated && !hasValidProvider) {
    return <Onboarding />;
  }

  // If authenticated OR has valid providers, show main chat interface

  // Main interface
  return (
    <div
      className="main-flex"
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
        maxWidth: "100vw",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="main-vstack"
          style={{ display: "flex", flexDirection: "column", height: "100vh" }}
        >
          <Header
            onClearChat={handleClearChat}
            onNewChat={handleNewChat}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
          <Body
            chatContainerRef={chatContainerRef}
            sidebarOpen={sidebarOpen}
            onCloseSidebar={() => setSidebarOpen(false)}
            onNavigateToProfile={() => settingsActions.setCurrentView('userInfo')}
          />
          <Bottom
            ref={bottomRef}
            handleKeyDown={handleKeyDown}
            onOpenOptionsMenu={() => setIsOptionsMenuOpen(true)}
          />
        </div>
      </div>
      <OptionMenu
        isOpen={isOptionsMenuOpen}
        onClose={() => setIsOptionsMenuOpen(false)}
      >
        <OptionMenuContent onClose={() => setIsOptionsMenuOpen(false)} />
      </OptionMenu>
    </div>
  );
};

export default Interface;
