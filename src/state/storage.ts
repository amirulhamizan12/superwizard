import { MyStateCreator } from "./index";
import { TaskHistoryEntry } from "./tasks";
import { StateStorage } from "zustand/middleware";

// ═════════════════════════════════════════════════════════════════════════════
// § TYPES
// ═════════════════════════════════════════════════════════════════════════════
export interface Chat {
  id: string;
  title: string;
  messages: TaskHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
}
export interface StorageSlice {
  chats: Chat[];
  currentChatId: string | null;
  isLoading: boolean;
  actions: {
    createNewChat: (title?: string) => Promise<string>;
    prepareNewChatSession: () => void;
    deleteChat: (chatId: string) => Promise<void>;
    switchToChat: (chatId: string) => Promise<void>;
    updateChatTitle: (chatId: string, title: string) => Promise<void>;
    pinChat: (chatId: string, isPinned: boolean) => Promise<void>;
    addMessageToCurrentChat: (message: TaskHistoryEntry) => Promise<void>;
    clearCurrentChatMessages: () => Promise<void>;
    loadChatsFromStorage: () => Promise<void>;
    saveChatToStorage: (chat: Chat) => Promise<void>;
    deleteChatFromStorage: (chatId: string) => Promise<void>;
    getCurrentChat: () => Chat | null;
    getCurrentChatMessages: () => TaskHistoryEntry[];
    searchChats: (query: string) => Chat[];
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// § UTILITIES
// ═════════════════════════════════════════════════════════════════════════════
const generateChatId = (): string => `chat_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
const generateChatTitle = (msg?: string): string => {
  if (!msg) return "New Chat";
  const cleaned = msg.trim().slice(0, 50);
  return cleaned.length < msg.trim().length ? `${cleaned}...` : cleaned;
};
const KEYS = { CHATS: "superwizard_chats", CURRENT_CHAT_ID: "superwizard_current_chat_id", CHAT_PREFIX: "superwizard_chat_" };

// ═════════════════════════════════════════════════════════════════════════════
// § TASK STATE STORAGE
// ═════════════════════════════════════════════════════════════════════════════
export const setTaskRunningState = async (isRunning: boolean, targetTabId?: number): Promise<void> => {
  await chromeStorageSet({ taskRunning: isRunning, taskTabId: isRunning ? targetTabId : null });
  if (targetTabId) {
    try {
      await chrome.tabs.sendMessage(targetTabId, { type: isRunning ? "TASK_STARTED" : "TASK_STOPPED" });
    } catch { }
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// § STORAGE ADAPTERS
// ═════════════════════════════════════════════════════════════════════════════
const isChrome = () => typeof chrome !== "undefined" && chrome.storage?.local;
const storageOp = (operation: string, ...args: any[]): Promise<any> => new Promise((resolve) => {
  try {
    if (!isChrome()) { console.error("Chrome storage not available"); resolve(operation === "get" ? {} : undefined); return; }
    const callback = (result?: any) => {
      if (chrome.runtime.lastError) console.error(`Chrome storage ${operation} error:`, chrome.runtime.lastError);
      resolve(operation === "get" ? result || {} : undefined);
    };
    switch (operation) {
      case "get": chrome.storage.local.get(args[0], callback); break;
      case "set": chrome.storage.local.set(args[0], () => callback()); break;
      case "remove": chrome.storage.local.remove(args[0], () => callback()); break;
      default: throw new Error(`Unknown storage operation: ${operation}`);
    }
  } catch (error) { console.error(`Storage ${operation} error:`, error); resolve(operation === "get" ? {} : undefined); }
});

const chromeStorageGet = (keys: string | string[]): Promise<any> => storageOp("get", keys);
const chromeStorageSet = (items: Record<string, any>): Promise<void> => storageOp("set", items);
const chromeStorageRemove = (keys: string | string[]): Promise<void> => storageOp("remove", keys);

export const chromeStorage: StateStorage = {
  getItem: (name: string) => chromeStorageGet(name).then((result) => result[name] || null),
  setItem: (name: string, value: string) => chromeStorageSet({ [name]: value }),
  removeItem: (name: string) => chromeStorageRemove(name),
};

// ═════════════════════════════════════════════════════════════════════════════
// § EXPORTED CHROME STORAGE UTILITIES
// ═════════════════════════════════════════════════════════════════════════════
export async function getChromeStorage<T = any>(keys: string | string[] | Record<string, any>): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        console.error("[ChromeStorage] Error getting storage:", chrome.runtime.lastError);
        reject(new Error(chrome.runtime.lastError.message));
      } else { resolve(result as T); }
    });
  });
}
export async function setChromeStorage(items: Record<string, any>): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        console.error("[ChromeStorage] Error setting storage:", chrome.runtime.lastError);
        reject(new Error(chrome.runtime.lastError.message));
      } else { resolve(); }
    });
  });
}
export async function removeChromeStorage(keys: string | string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) {
        console.error("[ChromeStorage] Error removing storage:", chrome.runtime.lastError);
        reject(new Error(chrome.runtime.lastError.message));
      } else { resolve(); }
    });
  });
}
export async function clearChromeStorage(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.clear(() => {
      if (chrome.runtime.lastError) {
        console.error("[ChromeStorage] Error clearing storage:", chrome.runtime.lastError);
        reject(new Error(chrome.runtime.lastError.message));
      } else { resolve(); }
    });
  });
}
export async function getStorageValue<T = any>(key: string, defaultValue?: T): Promise<T | undefined> {
  const result = await getChromeStorage<Record<string, T>>([key]);
  return result[key] !== undefined ? result[key] : defaultValue;
}
export async function setStorageValue(key: string, value: any): Promise<void> {
  return setChromeStorage({ [key]: value });
}
export async function removeStorageValue(key: string): Promise<void> {
  return removeChromeStorage(key);
}
export async function hasStorageKey(key: string): Promise<boolean> {
  const result = await getChromeStorage([key]);
  return result[key] !== undefined;
}

// ═════════════════════════════════════════════════════════════════════════════
// § MAIN SLICE
// ═════════════════════════════════════════════════════════════════════════════
export const createStorageSlice: MyStateCreator<StorageSlice> = (set, get) => ({
  chats: [], currentChatId: null, isLoading: false,
  actions: {
    // § CHAT OPERATIONS
    createNewChat: async (title?: string) => {
      const chatId = generateChatId();
      const now = new Date().toISOString();
      const newChat: Chat = { id: chatId, title: title || "New Chat", messages: [], createdAt: now, updatedAt: now, isPinned: false };
      set((state) => { state.storage.chats.unshift(newChat); state.storage.currentChatId = chatId; });
      await get().storage.actions.saveChatToStorage(newChat);
      await chromeStorageSet({ [KEYS.CURRENT_CHAT_ID]: chatId });
      return chatId;
    },
    prepareNewChatSession: () => {
      set((state) => { state.storage.currentChatId = null; });
      chromeStorageSet({ [KEYS.CURRENT_CHAT_ID]: null });
    },
    deleteChat: async (chatId: string) => {
      set((state) => {
        state.storage.chats = state.storage.chats.filter((chat) => chat.id !== chatId);
        if (state.storage.currentChatId === chatId) {
          const remaining = state.storage.chats;
          state.storage.currentChatId = remaining.length > 0 ? remaining[0].id : null;
        }
      });
      await get().storage.actions.deleteChatFromStorage(chatId);
      await chromeStorageSet({ [KEYS.CURRENT_CHAT_ID]: get().storage.currentChatId });
    },
    switchToChat: async (chatId: string) => {
      const chat = get().storage.chats.find((c) => c.id === chatId);
      if (!chat) return;
      set((state) => { state.storage.currentChatId = chatId; });
      await chromeStorageSet({ [KEYS.CURRENT_CHAT_ID]: chatId });
    },
    updateChatTitle: async (chatId: string, title: string) => {
      set((state) => {
        const chat = state.storage.chats.find((c) => c.id === chatId);
        if (chat) { chat.title = title; chat.updatedAt = new Date().toISOString(); }
      });
      const chat = get().storage.chats.find((c) => c.id === chatId);
      if (chat) await get().storage.actions.saveChatToStorage(chat);
    },
    pinChat: async (chatId: string, isPinned: boolean) => {
      set((state) => {
        const chat = state.storage.chats.find((c) => c.id === chatId);
        if (chat) { chat.isPinned = isPinned; chat.updatedAt = new Date().toISOString(); }
        state.storage.chats.sort((a, b) =>
          a.isPinned && !b.isPinned ? -1 : !a.isPinned && b.isPinned ? 1 : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
      const chat = get().storage.chats.find((c) => c.id === chatId);
      if (chat) await get().storage.actions.saveChatToStorage(chat);
    },

    // § MESSAGE OPERATIONS
    addMessageToCurrentChat: async (message: TaskHistoryEntry) => {
      const currentChatId = get().storage.currentChatId;
      if (!currentChatId) {
        if ((message as any).role === "user") {
          const title = generateChatTitle(message.prompt);
          const newChatId = await get().storage.actions.createNewChat(title);
          set((state) => {
            const newChat = state.storage.chats.find((c) => c.id === newChatId);
            if (newChat) { newChat.messages.push(message); newChat.updatedAt = new Date().toISOString(); }
          });
          const newChat = get().storage.chats.find((c) => c.id === newChatId);
          if (newChat) await get().storage.actions.saveChatToStorage(newChat);
        }
        return;
      }
      set((state) => {
        const chat = state.storage.chats.find((c) => c.id === currentChatId);
        if (chat) {
          chat.messages.push(message);
          chat.updatedAt = new Date().toISOString();
          const isFirstUserMsg = (message as any).role === "user" && chat.messages.length === 1;
          if (isFirstUserMsg) chat.title = generateChatTitle(message.prompt);
        }
      });
      const chat = get().storage.chats.find((c) => c.id === currentChatId);
      if (chat) await get().storage.actions.saveChatToStorage(chat);
    },
    clearCurrentChatMessages: async () => {
      const currentChatId = get().storage.currentChatId;
      if (!currentChatId) return;
      set((state) => {
        const chat = state.storage.chats.find((c) => c.id === currentChatId);
        if (chat) { chat.messages = []; chat.updatedAt = new Date().toISOString(); }
      });
      const chat = get().storage.chats.find((c) => c.id === currentChatId);
      if (chat) await get().storage.actions.saveChatToStorage(chat);
    },

    // § STORAGE OPERATIONS
    loadChatsFromStorage: async () => {
      set((state) => { state.storage.isLoading = true; });
      try {
        const result = await chromeStorageGet([KEYS.CHATS, KEYS.CURRENT_CHAT_ID]);
        const chatIds: string[] = result[KEYS.CHATS] || [];
        const currentChatId: string | null = result[KEYS.CURRENT_CHAT_ID] || null;
        const chatKeys = chatIds.map((id) => `${KEYS.CHAT_PREFIX}${id}`);
        const chatsData = await chromeStorageGet(chatKeys);
        const chats: Chat[] = [];
        for (const chatId of chatIds) {
          const chatData = chatsData[`${KEYS.CHAT_PREFIX}${chatId}`];
          if (chatData) chats.push(chatData);
        }
        chats.sort((a, b) =>
          a.isPinned && !b.isPinned ? -1 : !a.isPinned && b.isPinned ? 1 : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        set((state) => { state.storage.chats = chats; state.storage.currentChatId = currentChatId; });
      } catch (error) { console.error("Failed to load chats from storage:", error); }
      finally { set((state) => { state.storage.isLoading = false; }); }
    },
    saveChatToStorage: async (chat: Chat) => {
      try {
        const chatToPersist: Chat = { ...chat, messages: chat.messages.map((m) => m) } as Chat;
        await chromeStorageSet({ [`${KEYS.CHAT_PREFIX}${chat.id}`]: chatToPersist });
        const result = await chromeStorageGet(KEYS.CHATS);
        const chatIds: string[] = result[KEYS.CHATS] || [];
        if (!chatIds.includes(chat.id)) { chatIds.unshift(chat.id); await chromeStorageSet({ [KEYS.CHATS]: chatIds }); }
      } catch (error) { console.error("Failed to save chat to storage:", error); }
    },
    deleteChatFromStorage: async (chatId: string) => {
      try {
        await chromeStorageRemove(`${KEYS.CHAT_PREFIX}${chatId}`);
        const result = await chromeStorageGet(KEYS.CHATS);
        const chatIds: string[] = result[KEYS.CHATS] || [];
        const updatedChatIds = chatIds.filter((id) => id !== chatId);
        await chromeStorageSet({ [KEYS.CHATS]: updatedChatIds });
      } catch (error) { console.error("Failed to delete chat from storage:", error); }
    },

    // § UTILITY FUNCTIONS
    getCurrentChat: () => {
      const currentChatId = get().storage.currentChatId;
      if (!currentChatId) return null;
      return get().storage.chats.find((c) => c.id === currentChatId) || null;
    },
    getCurrentChatMessages: () => {
      const currentChat = get().storage.actions.getCurrentChat();
      return currentChat?.messages || [];
    },
    searchChats: (query: string) => {
      if (!query.trim()) return get().storage.chats;
      const q = query.toLowerCase();
      return get().storage.chats.filter((chat) =>
        chat.title.toLowerCase().includes(q) ||
        chat.messages.some((msg) =>
          msg.prompt?.toLowerCase().includes(q) ||
          msg.content?.toLowerCase().includes(q) ||
          (msg as any).context?.toLowerCase().includes(q)
        )
      );
    },
  },
});
