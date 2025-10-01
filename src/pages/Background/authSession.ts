// ═══════════════════════════════════════════════════════════════════════════
// § TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
export interface AuthSession { user?: { email?: string; [key: string]: any }; [key: string]: any }
export interface MessageResponse { success?: boolean; message?: string; error?: string; isAuthenticated?: boolean; user?: any; lastSync?: number; isRunning?: boolean; isTaskTab?: boolean; version?: string; timestamp?: number; state?: any }

// ═══════════════════════════════════════════════════════════════════════════
// § STORAGE CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
export const AUTH_STORAGE_KEYS = { SESSION: 'superwizard_auth_session', USER: 'superwizard_auth_user', LAST_SYNC: 'superwizard_auth_last_sync' } as const;

// ═══════════════════════════════════════════════════════════════════════════
// § CORE AUTH OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════
function saveAuthSession(session: any, source: string): Promise<MessageResponse> {
  return new Promise((resolve) => {
    console.log(`Received auth session from ${source}:`, session?.user?.email);
    chrome.storage.local.set({ [AUTH_STORAGE_KEYS.SESSION]: session, [AUTH_STORAGE_KEYS.USER]: session?.user, [AUTH_STORAGE_KEYS.LAST_SYNC]: Date.now() }, () => {
      if (chrome.runtime.lastError) {
        console.error(`Error saving auth session from ${source}:`, chrome.runtime.lastError);
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log(`Auth session saved successfully from ${source}`);
        chrome.runtime.sendMessage({ type: "AUTH_SESSION_UPDATED", session, user: session?.user, timestamp: Date.now() }).catch(() => {});
        resolve({ success: true, message: `Auth session saved from ${source}` });
      }
    });
  });
}

function clearAuthSession(source: string): Promise<MessageResponse> {
  return new Promise((resolve) => {
    console.log(`Received sign out from ${source}`);
    chrome.storage.local.remove([AUTH_STORAGE_KEYS.SESSION, AUTH_STORAGE_KEYS.USER, AUTH_STORAGE_KEYS.LAST_SYNC], () => {
      if (chrome.runtime.lastError) {
        console.error(`Error clearing auth session from ${source}:`, chrome.runtime.lastError);
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log(`Auth session cleared successfully from ${source}`);
        chrome.runtime.sendMessage({ type: "AUTH_SESSION_CLEARED", timestamp: Date.now() }).catch(() => {});
        resolve({ success: true, message: `Auth session cleared from ${source}` });
      }
    });
  });
}

function getAuthStatus(source: string): Promise<MessageResponse> {
  return new Promise((resolve) => {
    chrome.storage.local.get([AUTH_STORAGE_KEYS.SESSION, AUTH_STORAGE_KEYS.USER, AUTH_STORAGE_KEYS.LAST_SYNC], (result: { [key: string]: any }) => {
      if (chrome.runtime.lastError) {
        console.error(`Error getting auth status from ${source}:`, chrome.runtime.lastError);
        resolve({ success: false, isAuthenticated: false, user: null, error: chrome.runtime.lastError.message });
      } else {
        const session = result[AUTH_STORAGE_KEYS.SESSION];
        const user = result[AUTH_STORAGE_KEYS.USER];
        resolve({ success: true, isAuthenticated: !!session, user: user || null, lastSync: result[AUTH_STORAGE_KEYS.LAST_SYNC] });
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// § MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════════════════
export function handleAuthMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: MessageResponse) => void): boolean {
  const source = sender.tab ? 'content script' : 'external';
  console.log(`Auth message received from ${source}:`, message);
  switch (message.type) {
    case "SET_AUTH_SESSION": saveAuthSession(message.session, source).then(sendResponse); return true;
    case "SIGN_OUT": clearAuthSession(source).then(sendResponse); return true;
    case "GET_AUTH_STATUS": getAuthStatus(source).then(sendResponse); return true;
    default: return false;
  }
}
