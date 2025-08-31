import { MyStateCreator } from "./index";

// ============================================================================
// TYPES
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  full_name?: string;
  avatar_url?: string;
}

export interface AuthSession {
  user: AuthUser;
}

export interface AuthSlice {
  isAuthenticated: boolean;
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  lastSync: number | null;
  actions: {
    setAuthSession: (session: AuthSession | null) => Promise<void>;
    clearAuth: () => Promise<void>;
    loadAuthFromStorage: () => Promise<void>;
    saveAuthToStorage: (session: AuthSession | null) => Promise<void>;
  
    startAuthListener: () => void;
    stopAuthListener: () => void;
  };
}

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

const AUTH_STORAGE_KEYS = {
  SESSION: 'superwizard_auth_session',
  USER: 'superwizard_auth_user',
  LAST_SYNC: 'superwizard_auth_last_sync',
} as const;

const chromeStorageOp = (operation: 'get' | 'set' | 'remove', keysOrItems: any, items?: any): Promise<any> =>
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

const chromeStorageGet = (keys: string | string[]) => chromeStorageOp('get', keys);
const chromeStorageSet = (items: Record<string, any>) => chromeStorageOp('set', items);
const chromeStorageRemove = (keys: string | string[]) => chromeStorageOp('remove', keys);

// ============================================================================
// MAIN SLICE
// ============================================================================

export const createAuthSlice: MyStateCreator<AuthSlice> = (set, get) => {
  let authListener: ((event: MessageEvent) => void) | null = null;
  
  const broadcastAuthUpdate = (isAuthenticated: boolean, user: AuthUser | null) => {
    if (typeof window !== 'undefined') {
      window.postMessage({
        type: 'SUPERWIZARD_AUTH_UPDATE',
        data: { isAuthenticated, user, timestamp: Date.now() }
      }, '*');
    }
  };

  return {
    isAuthenticated: false,
    user: null,
    session: null,
    isLoading: true,
    lastSync: null,
    actions: {
      // ========================================================================
      // AUTH MANAGEMENT
      // ========================================================================

      setAuthSession: async (session: AuthSession | null) => {
        console.log('🔐 Setting auth session:', session ? `User: ${session.user.email}` : 'null');
        if (session?.user) {
          console.log('📝 User data received:', JSON.stringify(session.user, null, 2));
        }
        
        set((state) => {
          state.auth.session = session;
          state.auth.user = session?.user || null;
          state.auth.isAuthenticated = !!session;
          state.auth.lastSync = Date.now();
          state.auth.isLoading = false;
        });

        // Auto-select first authenticated model when user signs in
        if (session) {
          try {
            const { getAuthenticatedModels } = await import('../wizardry/ai/providers/userConfig');
            const authenticatedModels = getAuthenticatedModels();
            
            if (authenticatedModels.length > 0) {
              const currentSelectedModel = get().settings.selectedModel;
              const isCurrentModelAuthenticated = authenticatedModels.some(model => model.id === currentSelectedModel);
              
              // If no model is selected or current model is not an authenticated model, select the first one
              if (!currentSelectedModel || currentSelectedModel === "Select Model" || !isCurrentModelAuthenticated) {
                get().settings.actions.update({ selectedModel: authenticatedModels[0].id });
                console.log('🎯 Auto-selected first authenticated model:', authenticatedModels[0].id);
              }
            }
          } catch (error) {
            console.log('Could not auto-select authenticated model:', error);
          }
        }

        await get().auth.actions.saveAuthToStorage(session);
        broadcastAuthUpdate(!!session, session?.user || null);
      },

      clearAuth: async () => {
        console.log('🔐 Clearing auth session');
        
        set((state) => {
          state.auth.isAuthenticated = false;
          state.auth.user = null;
          state.auth.session = null;
          state.auth.lastSync = Date.now();
          state.auth.isLoading = false;
        });

        await chromeStorageRemove([AUTH_STORAGE_KEYS.SESSION, AUTH_STORAGE_KEYS.USER, AUTH_STORAGE_KEYS.LAST_SYNC]);
        broadcastAuthUpdate(false, null);
      },

      // ========================================================================
      // STORAGE OPERATIONS
      // ========================================================================

      loadAuthFromStorage: async () => {
        try {
          console.log('📂 Loading auth from storage...');
          set((state) => { state.auth.isLoading = true; });

          const result = await chromeStorageGet([AUTH_STORAGE_KEYS.SESSION, AUTH_STORAGE_KEYS.USER, AUTH_STORAGE_KEYS.LAST_SYNC]);
          const session = result[AUTH_STORAGE_KEYS.SESSION];
          const user = result[AUTH_STORAGE_KEYS.USER];
          const lastSync = result[AUTH_STORAGE_KEYS.LAST_SYNC];

          if (session && user) {
            const isValidSession = session && session.user;
            
            if (isValidSession) {
              console.log('📂 Loading existing auth session');
              
              // Set the session without token refresh
              set((state) => {
                state.auth.session = session;
                state.auth.user = session.user || user;
                state.auth.isAuthenticated = true;
                state.auth.lastSync = lastSync;
                state.auth.isLoading = false;
              });
            } else {
              console.log('⚠️ Invalid session structure found, clearing...');
              await get().auth.actions.clearAuth();
            }
          } else {
            set((state) => { state.auth.isLoading = false; });
            console.log('📂 No auth session found in storage');
          }
        } catch (error) {
          console.error('Error loading auth from storage:', error);
          set((state) => { state.auth.isLoading = false; });
        }
      },

      saveAuthToStorage: async (session: AuthSession | null) => {
        try {
          if (session) {
            await chromeStorageSet({
              [AUTH_STORAGE_KEYS.SESSION]: session,
              [AUTH_STORAGE_KEYS.USER]: session.user,
              [AUTH_STORAGE_KEYS.LAST_SYNC]: Date.now()
            });
            console.log('💾 Auth session saved to storage');
          } else {
            await chromeStorageRemove([AUTH_STORAGE_KEYS.SESSION, AUTH_STORAGE_KEYS.USER, AUTH_STORAGE_KEYS.LAST_SYNC]);
            console.log('💾 Auth session removed from storage');
          }
        } catch (error) {
          console.error('Error saving auth to storage:', error);
        }
      },

      // ========================================================================
      // REAL-TIME SYNC
      // ========================================================================

      startAuthListener: () => {
        if (authListener) return;

        console.log('🎧 Starting auth listener for real-time sync');

        authListener = (event: MessageEvent) => {
          if (event.data?.type === 'SUPERWIZARD_AUTH_BROADCAST') {
            const { data } = event.data;
            if (data.type === 'AUTH_STATE_CHANGED') {
              console.log('🔄 Received auth state change from web app:', data);
              if (data.isAuthenticated && data.user) {
                const currentValid = !!get().auth.session;
                if (!currentValid) {
                  // Auth state will be handled by the session update
                }
              } else {
                get().auth.actions.clearAuth();
              }
            }
          }
        };

        if (typeof window !== 'undefined') {
          window.addEventListener('message', authListener);
        }

        if (typeof chrome !== 'undefined' && chrome.runtime) {
          const handleRuntimeMessage = (message: any) => {
            if (message.type === 'AUTH_SESSION_UPDATED') {
              console.log('🔄 Received auth session update from background:', message.user?.email);
              if (message.session) get().auth.actions.setAuthSession(message.session);
            } else if (message.type === 'AUTH_SESSION_CLEARED') {
              console.log('🔄 Received auth session clear from background');
              get().auth.actions.clearAuth();
            }
          };
          chrome.runtime.onMessage.addListener(handleRuntimeMessage);
        }
      },

      stopAuthListener: () => {
        if (authListener && typeof window !== 'undefined') {
          window.removeEventListener('message', authListener);
          authListener = null;
        }
        console.log('🔇 Stopped auth listener');
      },
    },
  };
};
