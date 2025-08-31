# State Management System

## Overview

The State Management System provides centralized, persistent, and reactive state handling across all extension components. Built on Zustand with middleware for persistence, immutability, and development tools, it ensures consistent data flow and reliable state synchronization.

## Architecture

### Core Store Structure

```typescript
interface AppState {
  taskManager: TaskManagerSlice;
  settings: SettingsSlice;
  storage: StorageSlice;
  auth: AuthSlice;
}

type MyStateCreator<T> = StateCreator<
  AppState,
  [["zustand/immer", never]],
  [],
  T
>;
```

### Middleware Stack

```typescript
export const useAppState = create<AppState>()(
  persist(
    immer(
      devtools((...a) => ({
        taskManager: createTaskManagerSlice(...a),
        settings: createSettingsSlice(...a),
        storage: createStorageSlice(...a),
        auth: createAuthSlice(...a),
      }))
    ),
    {
      name: "app-state-v2",
      storage: createJSONStorage(() => chromeStorage),
      partialize: (state) => ({
        // Only persist specific slices
        settings: {
          instructions: state.settings.instructions,
          chatViewMode: state.settings.chatViewMode,
          screenVisionEnabled: state.settings.screenVisionEnabled,
          configuredProviders: state.settings.configuredProviders,
          selectedModel: state.settings.selectedModel,
        },
      }),
      merge: (persistedState: any, currentState: AppState) => {
        return merge(currentState, persistedState);
      },
    }
  )
);
```

## State Slices

### 1. Task Manager Slice

Manages automation execution state and progress tracking:

```typescript
interface TaskManagerSlice {
  tabId: number;
  status: TaskStatus;
  actionStatus: ActionStatus;
  taskProgress: TaskProgress;
  actions: TaskManagerActions;
}

type TaskStatus = "idle" | "running" | "completed" | "failed" | "error" | "success";
type ActionStatus = "idle" | "initializing" | "pulling-dom" | "performing-query" | "performing-action";

interface TaskProgress {
  total: number;
  completed: number;
  type: string;
  validationRules?: {
    successIndicators: string[];
    failureIndicators: string[];
    pendingIndicators: string[];
  };
}
```

#### Key Actions

```typescript
interface TaskManagerActions {
  runTask: (onError?: (error: string) => void) => Promise<void>;
  updateTaskProgress: (progress: Partial<TaskProgress>) => void;
  validateAction: (actionType: string, result: any) => "success" | "pending" | "failure";
  interrupt: () => Promise<void>;
  clearHistory: () => void;
}
```

#### State Updates

```typescript
const updateTaskState = (
  set: any, 
  updates: Partial<Pick<TaskManagerSlice, "status" | "actionStatus">>
) => {
  set((state: any) => {
    Object.keys(updates).forEach((key) => {
      state.taskManager[key] = updates[key as keyof typeof updates];
    });
  });
};
```

### 2. Settings Slice

Manages user preferences and AI provider configurations:

```typescript
interface SettingsSlice {
  // Provider and AI settings
  configuredProviders: UserConfiguredProvider[];
  selectedModel: string;
  
  // UI state
  instructions: string | null;
  currentView: ViewMode;
  chatViewMode: "dev" | "direct";
  screenVisionEnabled: boolean;
  
  actions: SettingsActions;
}

type ViewMode = 'chat' | 'apiConfig' | 'userInfo';

interface UserConfiguredProvider {
  id: string;
  name: string;
  apiKey: string;
  baseURL: string;
  models: UserConfiguredModel[];
}
```

#### Provider Management

```typescript
interface SettingsActions {
  update: (values: Partial<SettingsSlice>) => void;
  updateConfiguredProviders: (providers: UserConfiguredProvider[]) => void;
  addConfiguredProvider: (provider: UserConfiguredProvider) => void;
  removeConfiguredProvider: (providerId: string) => void;
  updateApiKey: (providerId: string, apiKey: string | null) => void;
  
  // UI actions
  setInstructions: (instructions: string) => void;
  setCurrentView: (view: ViewMode) => void;
  setChatViewMode: (mode: "dev" | "direct") => void;
  setScreenVisionEnabled: (enabled: boolean) => void;
}
```

#### Implementation Example

```typescript
export const createSettingsSlice: MyStateCreator<SettingsSlice> = (set) => ({
  // Default state
  configuredProviders: [],
  selectedModel: "Select Model",
  instructions: null,
  currentView: 'chat',
  chatViewMode: "direct",
  screenVisionEnabled: false,

  actions: {
    update: (values) =>
      set((state) => {
        Object.entries(values).forEach(([key, value]) => {
          if (value !== undefined && key in state.settings) {
            (state.settings as any)[key] = value;
          }
        });
      }),

    updateApiKey: (providerId, apiKey) =>
      set((state) => {
        const providers = state.settings.configuredProviders;
        const index = providers.findIndex((p) => p.id === providerId);

        if (apiKey && PROVIDER_TEMPLATES[providerId]) {
          const provider = createProviderFromTemplate(providerId, apiKey);
          if (index >= 0) providers[index] = provider;
          else providers.push(provider);
        } else if (index >= 0) {
          providers.splice(index, 1);
        }
      }),
  },
});
```

### 3. Storage Slice

Manages chat history, conversations, and persistent data:

```typescript
interface StorageSlice {
  chats: Chat[];
  currentChatId: string | null;
  isLoading: boolean;
  actions: StorageActions;
}

interface Chat {
  id: string;
  title: string;
  messages: TaskHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

interface TaskHistoryEntry {
  prompt: string;
  context?: string;
  content: string;
  role: "user" | "ai" | "error";
  action: {
    name: string;
    args: Record<string, any>;
  } | null;
  usage: any;
  timestamp: string;
  screenshotDataUrl?: string;
}
```

#### Chat Management

```typescript
interface StorageActions {
  // Chat operations
  loadChatsFromStorage: () => Promise<void>;
  createNewChat: (title?: string) => string;
  deleteChat: (chatId: string) => void;
  setCurrentChat: (chatId: string) => void;
  
  // Message operations
  addMessageToCurrentChat: (message: TaskHistoryEntry) => Promise<void>;
  getCurrentChatMessages: () => TaskHistoryEntry[];
  clearCurrentChatMessages: () => void;
  
  // Utility operations
  prepareNewChatSession: () => void;
  updateChatTitle: (chatId: string, title: string) => void;
}
```

#### Implementation Highlights

```typescript
addMessageToCurrentChat: async (message) => {
  set((state) => {
    const currentChat = state.storage.chats.find(
      (chat) => chat.id === state.storage.currentChatId
    );
    
    if (currentChat) {
      currentChat.messages.push(message);
      currentChat.updatedAt = new Date().toISOString();
      
      // Auto-generate title from first user message
      if (currentChat.messages.length === 1 && message.role === "user") {
        currentChat.title = generateChatTitle(message.prompt);
      }
    }
  });
  
  // Persist to Chrome storage
  await get().storage.actions.saveChatsToStorage();
},

saveChatsToStorage: async () => {
  try {
    const chats = get().storage.chats;
    await chromeStorage.setItem("chats", chats);
  } catch (error) {
    console.error("Failed to save chats to storage:", error);
  }
}
```

### 4. Authentication Slice

Manages user authentication and session state:

```typescript
interface AuthSlice {
  isAuthenticated: boolean;
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  lastSync: number | null;
  actions: AuthActions;
}

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  full_name?: string;
  avatar_url?: string;
}

interface AuthSession {
  user: AuthUser;
}
```

#### Authentication Actions

```typescript
interface AuthActions {
  setAuthSession: (session: AuthSession | null) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadAuthFromStorage: () => Promise<void>;
  saveAuthToStorage: (session: AuthSession | null) => Promise<void>;
  startAuthListener: () => void;
  stopAuthListener: () => void;
}
```

## Chrome Storage Integration

### Custom Storage Adapter

```typescript
const chromeStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const result = await chrome.storage.local.get([name]);
      return result[name] ? JSON.stringify(result[name]) : null;
    } catch (error) {
      console.error(`Failed to get item ${name}:`, error);
      return null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const parsedValue = JSON.parse(value);
      await chrome.storage.local.set({ [name]: parsedValue });
    } catch (error) {
      console.error(`Failed to set item ${name}:`, error);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      await chrome.storage.local.remove([name]);
    } catch (error) {
      console.error(`Failed to remove item ${name}:`, error);
    }
  },
};
```

### Storage Operations

```typescript
const chromeStorageOp = (
  operation: 'get' | 'set' | 'remove', 
  keysOrItems: any, 
  items?: any
): Promise<any> =>
  new Promise((resolve) => {
    try {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        const callback = (result?: any) => {
          if (chrome.runtime.lastError) {
            console.error(`Chrome storage ${operation} error:`, chrome.runtime.lastError);
            resolve(operation === 'get' ? {} : undefined);
          } else {
            resolve(operation === 'get' ? (result || {}) : undefined);
          }
        };
        
        if (operation === 'get') chrome.storage.local.get(keysOrItems, callback);
        else if (operation === 'set') chrome.storage.local.set(keysOrItems, callback);
        else chrome.storage.local.remove(keysOrItems, callback);
      } else {
        resolve(operation === 'get' ? {} : undefined);
      }
    } catch (error) {
      console.error(`Storage ${operation} error:`, error);
      resolve(operation === 'get' ? {} : undefined);
    }
  });
```

## State Synchronization

### Cross-Component Communication

```typescript
// Task running state synchronization
export const setTaskRunningState = async (
  isRunning: boolean, 
  tabId: number
): Promise<void> => {
  try {
    await chrome.storage.local.set({
      taskRunning: isRunning,
      taskTabId: tabId,
    });
    
    // Notify content script
    chrome.tabs.sendMessage(tabId, {
      type: isRunning ? "TASK_STARTED" : "TASK_STOPPED",
    }).catch(() => {
      // Ignore if content script not ready
    });
  } catch (error) {
    console.error("Failed to set task running state:", error);
  }
};

export const getTaskRunningState = async (): Promise<{
  isRunning: boolean;
  tabId: number | null;
}> => {
  try {
    const result = await chrome.storage.local.get(["taskRunning", "taskTabId"]);
    return {
      isRunning: result.taskRunning || false,
      tabId: result.taskTabId || null,
    };
  } catch (error) {
    console.error("Failed to get task running state:", error);
    return { isRunning: false, tabId: null };
  }
};
```

### Real-time Updates

```typescript
// Listen for storage changes across extension components
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    Object.keys(changes).forEach(key => {
      const change = changes[key];
      
      if (key === 'taskRunning') {
        // Update UI based on task state
        updateTaskIndicators(change.newValue);
      }
      
      if (key === 'app-state-v2') {
        // Handle state synchronization
        synchronizeState(change.newValue);
      }
    });
  }
});
```

## Performance Optimization

### Selective Persistence

```typescript
// Only persist essential data to reduce storage overhead
const partialize = (state: AppState) => ({
  settings: {
    // UI settings
    instructions: state.settings.instructions,
    chatViewMode: state.settings.chatViewMode,
    screenVisionEnabled: state.settings.screenVisionEnabled,
    
    // Provider settings
    configuredProviders: state.settings.configuredProviders,
    selectedModel: state.settings.selectedModel,
  },
  // Exclude runtime-only data like taskManager
});
```

### State Merging Strategy

```typescript
const merge = (persistedState: any, currentState: AppState): AppState => {
  // Deep merge with lodash to handle nested objects
  return lodashMerge(currentState, persistedState);
};
```

### Memory Management

```typescript
class StateMemoryManager {
  private readonly maxHistoryEntries = 100;
  private readonly maxChatMessages = 500;
  
  cleanupState(state: AppState): void {
    // Limit chat history size
    state.storage.chats.forEach(chat => {
      if (chat.messages.length > this.maxChatMessages) {
        chat.messages = chat.messages.slice(-this.maxChatMessages);
      }
    });
    
    // Remove old chats (keep last 20)
    if (state.storage.chats.length > 20) {
      state.storage.chats.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      state.storage.chats = state.storage.chats.slice(0, 20);
    }
  }
  
  optimizeScreenshots(messages: TaskHistoryEntry[]): TaskHistoryEntry[] {
    // Remove screenshot data from old messages to save memory
    return messages.map((message, index) => {
      if (index < messages.length - 10 && message.screenshotDataUrl) {
        return { ...message, screenshotDataUrl: undefined };
      }
      return message;
    });
  }
}
```

## Error Handling

### State Recovery

```typescript
class StateRecoveryManager {
  async recoverFromCorruption(): Promise<void> {
    try {
      // Attempt to load state
      const state = await this.loadState();
      
      if (!this.validateState(state)) {
        throw new Error('State validation failed');
      }
    } catch (error) {
      console.error('State corruption detected, recovering:', error);
      
      // Clear corrupted state
      await chrome.storage.local.clear();
      
      // Initialize with default state
      await this.initializeDefaultState();
      
      // Notify user
      this.notifyStateRecovery();
    }
  }
  
  private validateState(state: any): boolean {
    // Validate state structure
    const requiredSlices = ['taskManager', 'settings', 'storage', 'auth'];
    
    return requiredSlices.every(slice => 
      state && typeof state[slice] === 'object'
    );
  }
  
  private async initializeDefaultState(): Promise<void> {
    const defaultState = {
      settings: {
        configuredProviders: [],
        selectedModel: "Select Model",
        chatViewMode: "direct",
        screenVisionEnabled: false,
      }
    };
    
    await chrome.storage.local.set({ 'app-state-v2': defaultState });
  }
}
```

### Graceful Degradation

```typescript
const createResilientSlice = <T>(
  createSlice: MyStateCreator<T>,
  defaultState: T
): MyStateCreator<T> => {
  return (set, get, api) => {
    try {
      return createSlice(set, get, api);
    } catch (error) {
      console.error('Slice creation failed, using default:', error);
      return defaultState;
    }
  };
};
```

## Development Tools

### State Debugging

```typescript
// Development-only state inspector
if (process.env.NODE_ENV === 'development') {
  (window as any).__SUPERWIZARD_STATE__ = {
    getState: () => useAppState.getState(),
    setState: (updates: Partial<AppState>) => useAppState.setState(updates),
    subscribe: (callback: (state: AppState) => void) => useAppState.subscribe(callback),
    
    // Debug helpers
    dumpState: () => console.log(JSON.stringify(useAppState.getState(), null, 2)),
    clearStorage: () => chrome.storage.local.clear(),
    resetState: () => useAppState.setState(getDefaultState()),
  };
}
```

### State Monitoring

```typescript
class StateMonitor {
  private subscribers: Map<string, (state: AppState) => void> = new Map();
  
  subscribe(key: string, callback: (state: AppState) => void): () => void {
    this.subscribers.set(key, callback);
    
    return () => {
      this.subscribers.delete(key);
    };
  }
  
  notifySubscribers(state: AppState): void {
    this.subscribers.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('State subscriber error:', error);
      }
    });
  }
  
  trackStateChanges(): void {
    useAppState.subscribe((state, prevState) => {
      const changes = this.detectChanges(prevState, state);
      if (changes.length > 0) {
        console.log('State changes:', changes);
        this.notifySubscribers(state);
      }
    });
  }
  
  private detectChanges(prev: AppState, current: AppState): string[] {
    const changes: string[] = [];
    
    // Compare task manager status
    if (prev.taskManager.status !== current.taskManager.status) {
      changes.push(`taskManager.status: ${prev.taskManager.status} → ${current.taskManager.status}`);
    }
    
    // Compare auth state
    if (prev.auth.isAuthenticated !== current.auth.isAuthenticated) {
      changes.push(`auth.isAuthenticated: ${prev.auth.isAuthenticated} → ${current.auth.isAuthenticated}`);
    }
    
    return changes;
  }
}
```

## Integration Points

### With UI Components

```typescript
// React hook for component state access
const useTaskStatus = () => {
  return useAppState(state => ({
    status: state.taskManager.status,
    actionStatus: state.taskManager.actionStatus,
    progress: state.taskManager.taskProgress,
  }));
};

// Component example
const TaskStatusIndicator: React.FC = () => {
  const { status, actionStatus, progress } = useTaskStatus();
  
  return (
    <div className="task-status">
      <span>Status: {status}</span>
      <span>Action: {actionStatus}</span>
      <progress value={progress.completed} max={progress.total} />
    </div>
  );
};
```

### With Background Scripts

```typescript
// Background script state access
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATE') {
    const state = useAppState.getState();
    sendResponse({ state });
  }
  
  if (message.type === 'UPDATE_STATE') {
    useAppState.setState(message.updates);
    sendResponse({ success: true });
  }
});
```

## Future Enhancements

### Planned Features
1. **State Versioning**: Migration system for state schema changes
2. **Conflict Resolution**: Handle concurrent state modifications
3. **Offline Support**: Queue state changes when offline
4. **State Analytics**: Track state usage patterns
5. **Performance Metrics**: Monitor state operation performance

### Advanced Capabilities
1. **Time Travel Debugging**: Undo/redo state changes
2. **State Snapshots**: Save/restore specific state configurations
3. **Cross-Device Sync**: Synchronize state across devices
4. **State Validation**: Runtime schema validation
5. **Optimistic Updates**: Immediate UI updates with rollback

This State Management System provides a robust, scalable foundation for managing complex application state while ensuring data consistency, performance, and developer experience across all extension components.