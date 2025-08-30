// Set up side panel behavior when extension is installed or updated
import { handleCaptureScreenshot } from "../../wizardry/extraction/captureScreenshot";
  
// Configure the side panel to open when the extension action is clicked
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// ============================================================================

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open the side panel for the current window
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Handle omnibox input entered
chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  console.log("Omnibox input entered:", text, "disposition:", disposition);

  // Get the current active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const tab = tabs[0];
      console.log("Active tab found:", tab.id, tab.url);

      // Open the side panel (harmless if already open)
      chrome.sidePanel.open({ windowId: tab.windowId });
      console.log("Side panel opened/ensured open for window:", tab.windowId);

      // Store the command in storage so the side panel can access it
      // Add a small delay to ensure side panel is ready
      if (text.trim()) {
        setTimeout(() => {
          const commandData = {
            omnibox_command: text.trim(),
            omnibox_timestamp: Date.now(),
          };

          chrome.storage.local.set(commandData, () => {
            console.log("Omnibox command stored (with delay):", commandData);
          });
        }, 100); // Small delay to ensure side panel listeners are ready
      }

      // Optional: Send message to content script or side panel
      chrome.tabs
        .sendMessage(tab.id, {
          type: "OMNIBOX_COMMAND",
          command: text.trim(),
        })
        .then(() => {
          console.log("Successfully sent message to content script");
        })
        .catch((error) => {
          console.log(
            "Content script message failed (expected if not ready):",
            error.message
          );
        });
    } else {
      console.error("No active tab found");
    }
  });
});

// Handle messages from external websites and applications
chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    console.log("External message received from:", sender.url, message);

    // Handle auth session sharing from web app
    if (message.type === "SET_AUTH_SESSION") {
      console.log("🔐 Received auth session from web app:", message.session?.user?.email);
      
      // Store auth session in chrome storage
      chrome.storage.local.set({
        superwizard_auth_session: message.session,
        superwizard_auth_user: message.session?.user,
        superwizard_auth_last_sync: Date.now()
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error saving auth session:", chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log("✅ Auth session saved successfully");
          
          // Broadcast to all extension contexts
          chrome.runtime.sendMessage({
            type: "AUTH_SESSION_UPDATED",
            session: message.session,
            user: message.session?.user,
            timestamp: Date.now()
          }).catch(() => {}); // Ignore if no listeners
          
          sendResponse({ success: true, message: "Auth session saved" });
        }
      });
      return true;
    }

    // Handle sign out from web app
    if (message.type === "SIGN_OUT") {
      console.log("🔐 Received sign out from web app");
      
      // Clear auth data from storage
      chrome.storage.local.remove([
        "superwizard_auth_session",
        "superwizard_auth_user", 
        "superwizard_auth_last_sync"
      ], () => {
        if (chrome.runtime.lastError) {
          console.error("Error clearing auth session:", chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log("✅ Auth session cleared successfully");
          
          // Broadcast sign out to all extension contexts
          chrome.runtime.sendMessage({
            type: "AUTH_SESSION_CLEARED",
            timestamp: Date.now()
          }).catch(() => {}); // Ignore if no listeners
          
          sendResponse({ success: true, message: "Auth session cleared" });
        }
      });
      return true;
    }

    // Handle auth status request
    if (message.type === "GET_AUTH_STATUS") {
      chrome.storage.local.get([
        "superwizard_auth_session",
        "superwizard_auth_user",
        "superwizard_auth_last_sync"
      ], (result) => {
        if (chrome.runtime.lastError) {
          console.error("Error getting auth status:", chrome.runtime.lastError);
          sendResponse({ 
            isAuthenticated: false, 
            user: null,
            error: chrome.runtime.lastError.message 
          });
        } else {
          const session = result.superwizard_auth_session;
          const user = result.superwizard_auth_user;
          
          sendResponse({
            isAuthenticated: !!session,
            user: user || null,
            lastSync: result.superwizard_auth_last_sync
          });
        }
      });
      return true;
    }

    if (message.type === "OPEN_SIDEBAR") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.sidePanel.open({ windowId: tabs[0].windowId });
          sendResponse({
            success: true,
            message: "Sidebar opened successfully",
          });
        } else {
          sendResponse({ success: false, message: "No active tab found" });
        }
      });
      return true; // Keep message channel open for async response
    }

    if (message.type === "RUN_COMMAND") {
      const command = message.command;
      if (!command || !command.trim()) {
        sendResponse({ success: false, message: "No command provided" });
        return true;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs[0]) {
          const currentTab = tabs[0];
          console.log(
            "Running command from website:",
            command,
            "current tab:",
            currentTab.id
          );

          try {
            // Step 1: Open the side panel first
            await chrome.sidePanel.open({ windowId: currentTab.windowId });
            console.log("Side panel opened for website command");

            // Step 2: Create a new tab for the command execution
            const newTab = await chrome.tabs.create({
              url: "https://www.google.com/",
              active: true,
            });

            if (!newTab.id) {
              throw new Error("Failed to create new tab");
            }

            console.log(
              "New tab created for website command (Google.com):",
              newTab.id
            );

            // Step 3: Wait a moment for the tab to be ready, then store the command
            setTimeout(() => {
              const commandData = {
                omnibox_command: command.trim(),
                omnibox_timestamp: Date.now(),
                website_new_tab: true, // Flag to indicate this came from website
                website_tab_id: newTab.id, // Store the new tab ID
              };

              chrome.storage.local.set(commandData, () => {
                console.log("Website command stored for new tab:", commandData);
              });

              // Send success response
              sendResponse({
                success: true,
                message: `Command "${command}" will run in new tab (ID: ${newTab.id})`,
              });
            }, 500); // Small delay to ensure tab is ready
          } catch (error) {
            console.error("Error handling website command:", error);
            sendResponse({
              success: false,
              message: `Failed to execute command: ${error.message}`,
            });
          }
        } else {
          sendResponse({ success: false, message: "No active tab found" });
        }
      });
      return true;
    }

    return true;
  }
);

// Handle messages from content script (for postMessage fallback)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CHECK_TASK_STATUS") {
    // Check if there's currently a task running and if this is the task tab
    chrome.storage.local.get(["taskRunning", "taskTabId"], (result) => {
      const isRunning = result.taskRunning === true;
      const isTaskTab = sender.tab?.id === result.taskTabId;
      sendResponse({ isRunning, isTaskTab });
    });
    return true; // Keep message channel open for async response
  }

  // Capture screenshot request from other parts of the extension
  if (message.type === "CAPTURE_SCREENSHOT") {
    return handleCaptureScreenshot(message, sender, sendResponse);
  }

  if (message.type === "OPEN_SIDEBAR_FROM_WEBSITE") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.sidePanel.open({ windowId: tabs[0].windowId });
        sendResponse({ success: true, message: "Sidebar opened from website" });
      }
    });
    return true;
  }

  // Handle auth messages from content script (web app bridge)
  if (message.type === "SET_AUTH_SESSION") {
    console.log("🔐 Received auth session from content script:", message.session?.user?.email);
    
    // Store auth session in chrome storage
    chrome.storage.local.set({
      superwizard_auth_session: message.session,
      superwizard_auth_user: message.session?.user,
      superwizard_auth_last_sync: Date.now()
    }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error saving auth session:", chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log("✅ Auth session saved successfully via content script");
        
        // Broadcast to all extension contexts
        chrome.runtime.sendMessage({
          type: "AUTH_SESSION_UPDATED",
          session: message.session,
          user: message.session?.user,
          timestamp: Date.now()
        }).catch(() => {}); // Ignore if no listeners
        
        sendResponse({ success: true, message: "Auth session saved" });
      }
    });
    return true;
  }

  if (message.type === "SIGN_OUT") {
    console.log("🔐 Received sign out from content script");
    
    // Clear auth data from storage
    chrome.storage.local.remove([
      "superwizard_auth_session",
      "superwizard_auth_user", 
      "superwizard_auth_last_sync"
    ], () => {
      if (chrome.runtime.lastError) {
        console.error("Error clearing auth session:", chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log("✅ Auth session cleared successfully via content script");
        
        // Broadcast sign out to all extension contexts
        chrome.runtime.sendMessage({
          type: "AUTH_SESSION_CLEARED",
          timestamp: Date.now()
        }).catch(() => {}); // Ignore if no listeners
        
        sendResponse({ success: true, message: "Auth session cleared" });
      }
    });
    return true;
  }

  if (message.type === "GET_AUTH_STATUS") {
    chrome.storage.local.get([
      "superwizard_auth_session",
      "superwizard_auth_user",
      "superwizard_auth_last_sync"
    ], (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error getting auth status:", chrome.runtime.lastError);
        sendResponse({ 
          isAuthenticated: false, 
          user: null, 
          
          error: chrome.runtime.lastError.message 
        });
      } else {
        const session = result.superwizard_auth_session;
        const user = result.superwizard_auth_user;
        
        sendResponse({
          isAuthenticated: !!session,
          user: user || null,
          
          lastSync: result.superwizard_auth_last_sync
        });
      }
    });
    return true;
  }

  if (message.type === "RUN_COMMAND_FROM_WEBSITE") {
    const command = message.command;
    if (!command || !command.trim()) {
      sendResponse({ success: false, message: "No command provided" });
      return true;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const currentTab = tabs[0];
        console.log(
          "Running command from website via postMessage:",
          command,
          "current tab:",
          currentTab.id
        );

        try {
          // Step 1: Open the side panel first
          await chrome.sidePanel.open({ windowId: currentTab.windowId });
          console.log("Side panel opened for website command (postMessage)");

          // Step 2: Create a new tab for the command execution
          const newTab = await chrome.tabs.create({
            url: "https://www.google.com/",
            active: true,
          });

          if (!newTab.id) {
            throw new Error("Failed to create new tab");
          }

          console.log(
            "New tab created for website command (Google.com via postMessage):",
            newTab.id
          );

          // Step 3: Wait a moment for the tab to be ready, then store the command
          setTimeout(() => {
            const commandData = {
              omnibox_command: command.trim(),
              omnibox_timestamp: Date.now(),
              website_new_tab: true, // Flag to indicate this came from website
              website_tab_id: newTab.id, // Store the new tab ID
            };

            chrome.storage.local.set(commandData, () => {
              console.log(
                "Website command stored for new tab (postMessage):",
                commandData
              );
            });

            sendResponse({
              success: true,
              message: `Command "${command}" will run in new tab (ID: ${newTab.id}) via postMessage`,
            });
          }, 500); // Small delay to ensure tab is ready
        } catch (error) {
          console.error("Error handling website command (postMessage):", error);
          sendResponse({
            success: false,
            message: `Failed to execute command: ${error.message}`,
          });
        }
      } else {
        sendResponse({ success: false, message: "No active tab found" });
      }
    });
    return true;
  }
});
