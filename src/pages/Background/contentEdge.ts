import { createWizardTab } from "./wizardTab";
import { handleOpenSidebar } from "./externalCommand";
import { MessageResponse } from "./authSession";
import { startTask, TaskExecutorConfig } from "./taskEngine";

// ═══════════════════════════════════════════════════════════════════════════
// § TYPES
// ═══════════════════════════════════════════════════════════════════════════
interface CommandData { omnibox_command: string; omnibox_timestamp: number; website_new_tab?: boolean; website_tab_id?: number }

// ═══════════════════════════════════════════════════════════════════════════
// § HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
const generateChatId = (): string => `chat_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

async function getSettingsFromStorage(): Promise<{ streamingEnabled: boolean; selectedModel: any }> {
  try {
    const storageData = await chrome.storage.local.get(['app-state-v2']);
    if (storageData['app-state-v2']) {
      const savedState = JSON.parse(storageData['app-state-v2']);
      const settings = savedState.state?.settings || {};
      return { streamingEnabled: settings.streamingEnabled !== undefined ? settings.streamingEnabled : true, selectedModel: settings.selectedModel || null };
    }
  } catch (error) { console.error("Failed to get settings from storage:", error); }
  return { streamingEnabled: true, selectedModel: null };
}

async function getOrCreateChatId(command: string): Promise<string> {
  try {
    const result = await chrome.storage.local.get(['superwizard_current_chat_id']);
    if (result.superwizard_current_chat_id) {
      const chatKey = `superwizard_chat_${result.superwizard_current_chat_id}`;
      const chatData = await chrome.storage.local.get([chatKey]);
      if (chatData[chatKey]) return result.superwizard_current_chat_id;
    }
    const chatId = generateChatId();
    const chatTitle = command.trim().slice(0, 50) || "New Chat";
    const title = chatTitle.length < command.trim().length ? `${chatTitle}...` : chatTitle;
    const now = new Date().toISOString();
    const newChat = { id: chatId, title: title, messages: [], createdAt: now, updatedAt: now, isPinned: false };
    await chrome.storage.local.set({ [`superwizard_chat_${chatId}`]: newChat, superwizard_current_chat_id: chatId });
    const chatsResult = await chrome.storage.local.get(['superwizard_chats']);
    const chatIds: string[] = chatsResult.superwizard_chats || [];
    if (!chatIds.includes(chatId)) {
      chatIds.unshift(chatId);
      await chrome.storage.local.set({ superwizard_chats: chatIds });
    }
    return chatId;
  } catch (error) {
    console.error("Failed to get or create chat ID:", error);
    return generateChatId();
  }
}

async function addUserMessageToChat(chatId: string, instructions: string): Promise<void> {
  try {
    const userMessage = { prompt: instructions, content: "", role: "user" as const, action: null, usage: null, timestamp: new Date().toISOString() };
    const chatKey = `superwizard_chat_${chatId}`;
    const result = await chrome.storage.local.get([chatKey]);
    let chat = result[chatKey];
    if (!chat) {
      const chatTitle = instructions.trim().slice(0, 50) || "New Chat";
      const title = chatTitle.length < instructions.trim().length ? `${chatTitle}...` : chatTitle;
      const now = new Date().toISOString();
      chat = { id: chatId, title: title, messages: [], createdAt: now, updatedAt: now, isPinned: false };
    }
    chat.messages.push(userMessage);
    chat.updatedAt = new Date().toISOString();
    await chrome.storage.local.set({ [chatKey]: chat });
  } catch (error) { console.error("Failed to add user message to chat:", error); }
}

// ═══════════════════════════════════════════════════════════════════════════
// § INTERNAL MESSAGE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════
export function handleOpenSidebarInternal(sendResponse: (response: MessageResponse) => void): boolean {
  return handleOpenSidebar(sendResponse) as unknown as boolean;
}

export async function handleRunCommandFromWebsite(command: string, sendResponse: (response: MessageResponse) => void): Promise<void> {
  if (!command?.trim()) { sendResponse({ success: false, message: "No command provided" }); return; }
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs: chrome.tabs.Tab[]) => {
    if (!tabs[0]) { sendResponse({ success: false, message: "No active tab found" }); return; }
    const currentTab = tabs[0];
    console.log("Running command from website via postMessage:", command, "current tab:", currentTab.id);
    try {
      await (chrome as any).sidePanel.open({ windowId: currentTab.windowId });
      console.log("Side panel opened for website command (postMessage)");
      await new Promise(resolve => setTimeout(resolve, 250));
      const newTab = await chrome.tabs.create({ url: "https://www.google.com/", active: true });
      if (!newTab.id) throw new Error("Failed to create new tab");
      console.log("New tab created for website command (Google.com via postMessage):", newTab.id);
      await new Promise(resolve => setTimeout(resolve, 250));
      const { streamingEnabled, selectedModel } = await getSettingsFromStorage();
      const chatId = await getOrCreateChatId(command.trim());
      await addUserMessageToChat(chatId, command.trim());
      const config: TaskExecutorConfig = { instructions: command.trim(), tabId: newTab.id, chatId: chatId, streamingEnabled: streamingEnabled, selectedModel: selectedModel };
      await startTask(config);
      console.log("Task started successfully in new tab (postMessage):", newTab.id);
      sendResponse({ success: true, message: `Command "${command}" is running in new tab (ID: ${newTab.id}) via postMessage` });
    } catch (error) {
      console.error("Error handling website command (postMessage):", error);
      sendResponse({ success: false, message: `Failed to execute command: ${(error as Error).message}` });
    }
  });
}

export async function handleRunWizardFromWebsite(command: string, sendResponse: (response: MessageResponse) => void): Promise<void> {
  if (!command?.trim()) { sendResponse({ success: false, message: "No command provided" }); return; }
  try {
    console.log("Running wizard command from website via postMessage:", command);
    const wizardTabId = await createWizardTab(false);
    console.log("Wizard tab ready (ID:", wizardTabId, "), starting task in background (postMessage)");
    await new Promise(resolve => setTimeout(resolve, 500));
    const { streamingEnabled, selectedModel } = await getSettingsFromStorage();
    const chatId = await getOrCreateChatId(command.trim());
    await addUserMessageToChat(chatId, command.trim());
    const config: TaskExecutorConfig = { instructions: command.trim(), tabId: wizardTabId, chatId: chatId, streamingEnabled: streamingEnabled, selectedModel: selectedModel };
    await startTask(config);
    console.log("Task started successfully in wizard tab (postMessage):", wizardTabId);
    sendResponse({ success: true, message: `Command "${command}" is running in wizard tab (ID: ${wizardTabId}) via postMessage` });
  } catch (error) {
    console.error("Error handling wizard command (postMessage):", error);
    sendResponse({ success: false, message: `Failed to execute wizard command: ${(error as Error).message}` });
  }
}

export async function handleOpenWizardTabFromWebsite(sendResponse: (response: MessageResponse) => void): Promise<void> {
  try {
    const tabId = await createWizardTab(true);
    sendResponse({ success: true, message: `Wizard tab created successfully (ID: ${tabId})` });
  } catch (error) {
    console.error("Error creating wizard tab from website:", error);
    sendResponse({ success: false, message: `Failed to create wizard tab: ${(error as Error).message}` });
  }
}
