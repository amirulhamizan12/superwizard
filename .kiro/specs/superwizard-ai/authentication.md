# Authentication System

## Overview

The Authentication System manages user identity, session handling, and access control for premium AI models through integration with an external web application. It provides seamless authentication flow, secure token management, and real-time synchronization across extension components.

## Architecture

### Core Components

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
  // Additional session data as needed
}
```

## Authentication Flow

### 1. Web Application Integration

The authentication system integrates with an external web application (`https://www.superwizard.ai`) through multiple communication channels:

#### External Messaging API
```typescript
// Background script handles external messages
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === "SET_AUTH_SESSION") {
    // Store auth session from web app
    chrome.storage.local.set({
      superwizard_auth_session: message.session,
      superwizard_auth_user: message.session?.user,
      superwizard_auth_last_sync: Date.now()
    });
    
    // Broadcast to extension components
    chrome.runtime.sendMessage({
      type: "AUTH_SESSION_UPDATED",
      session: message.session,
      user: message.session?.user
    });
  }
});
```

#### PostMessage Bridge
```typescript
// Content script bridges web app and extension
window.addEventListener("message", (event) => {
  if (event.data.type === "SUPERWIZARD_TO_EXTENSION") {
    const message = event.data.data;
    
    if (message.type === "SET_AUTH_SESSION") {
      chrome.runtime.sendMessage(message, (response) => {
        window.postMessage({
          type: "SUPERWIZARD_FROM_EXTENSION",
          responseId: message.id,
          response: response
        }, "*");
      });
    }
  }
});
```

### 2. Session Management

#### Session Storage
```typescript
const AUTH_STORAGE_KEYS = {
  SESSION: 'superwizard_auth_session',
  USER: 'superwizard_auth_user',
  LAST_SYNC: 'superwizard_auth_last_sync',
} as const;

// Secure storage operations
const chromeStorageSet = (items: Record<string, any>) => 
  new Promise((resolve) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError);
      }
      resolve(undefined);
    });
  });
```

#### Session Validation
```typescript
async function validateSession(session: AuthSession): Promise<boolean> {
  try {
    // Validate session structure
    if (!session || !session.user || !session.user.id) {
      return false;
    }
    
    // Check session expiry (if applicable)
    const lastSync = await getLastSyncTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (lastSync && (Date.now() - lastSync) > maxAge) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}
```

### 3. State Synchronization

#### Real-time Updates
```typescript
// Auth listener for cross-component synchronization
startAuthListener: () => {
  const authListener = (event: MessageEvent) => {
    if (event.data?.type === 'SUPERWIZARD_AUTH_BROADCAST') {
      const { data } = event.data;
      if (data.type === 'AUTH_STATE_CHANGED') {
        if (data.isAuthenticated && data.user) {
          // Handle authentication update
          setAuthSession(data.session);
        } else {
          // Handle sign out
          clearAuth();
        }
      }
    }
  };
  
  window.addEventListener('message', authListener);
  
  // Chrome runtime message handling
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'AUTH_SESSION_UPDATED') {
      setAuthSession(message.session);
    } else if (message.type === 'AUTH_SESSION_CLEARED') {
      clearAuth();
    }
  });
}
```

#### Cross-Window Broadcasting
```typescript
const broadcastAuthUpdate = (isAuthenticated: boolean, user: AuthUser | null) => {
  if (typeof window !== 'undefined') {
    window.postMessage({
      type: 'SUPERWIZARD_AUTH_UPDATE',
      data: { isAuthenticated, user, timestamp: Date.now() }
    }, '*');
  }
};
```

## Authentication Actions

### 1. Set Authentication Session

```typescript
setAuthSession: async (session: AuthSession | null) => {
  console.log('🔐 Setting auth session:', session ? `User: ${session.user.email}` : 'null');
  
  // Update state
  set((state) => {
    state.auth.session = session;
    state.auth.user = session?.user || null;
    state.auth.isAuthenticated = !!session;
    state.auth.lastSync = Date.now();
    state.auth.isLoading = false;
  });
  
  // Auto-select authenticated models
  if (session) {
    const authenticatedModels = getAuthenticatedModels();
    if (authenticatedModels.length > 0) {
      const currentSelectedModel = get().settings.selectedModel;
      const isCurrentModelAuthenticated = authenticatedModels.some(
        model => model.id === currentSelectedModel
      );
      
      if (!currentSelectedModel || !isCurrentModelAuthenticated) {
        get().settings.actions.update({ 
          selectedModel: authenticatedModels[0].id 
        });
      }
    }
  }
  
  // Persist to storage
  await saveAuthToStorage(session);
  
  // Broadcast update
  broadcastAuthUpdate(!!session, session?.user || null);
}
```

### 2. Clear Authentication

```typescript
clearAuth: async () => {
  console.log('🔐 Clearing auth session');
  
  // Update state
  set((state) => {
    state.auth.isAuthenticated = false;
    state.auth.user = null;
    state.auth.session = null;
    state.auth.lastSync = Date.now();
    state.auth.isLoading = false;
  });
  
  // Clear storage
  await chromeStorageRemove([
    AUTH_STORAGE_KEYS.SESSION, 
    AUTH_STORAGE_KEYS.USER, 
    AUTH_STORAGE_KEYS.LAST_SYNC
  ]);
  
  // Broadcast update
  broadcastAuthUpdate(false, null);
}
```

### 3. Load from Storage

```typescript
loadAuthFromStorage: async () => {
  try {
    set((state) => { state.auth.isLoading = true; });
    
    const result = await chromeStorageGet([
      AUTH_STORAGE_KEYS.SESSION,
      AUTH_STORAGE_KEYS.USER,
      AUTH_STORAGE_KEYS.LAST_SYNC
    ]);
    
    const session = result[AUTH_STORAGE_KEYS.SESSION];
    const user = result[AUTH_STORAGE_KEYS.USER];
    
    if (session && user && await validateSession(session)) {
      set((state) => {
        state.auth.session = session;
        state.auth.user = session.user || user;
        state.auth.isAuthenticated = true;
        state.auth.lastSync = result[AUTH_STORAGE_KEYS.LAST_SYNC];
        state.auth.isLoading = false;
      });
    } else {
      // Clear invalid session
      await clearAuth();
    }
  } catch (error) {
    console.error('Error loading auth from storage:', error);
    set((state) => { state.auth.isLoading = false; });
  }
}
```

## Model Access Control

### Authenticated Models

```typescript
export const getAuthenticatedModels = (): UserConfiguredModel[] => {
  const serverTemplate = getProviderTemplate("server");
  if (!serverTemplate || !serverTemplate.defaultModels) {
    return [];
  }
  
  return serverTemplate.defaultModels.map((modelId) => ({
    id: modelId,
    displayName: generateDisplayName(modelId),
    maxTokens: 2048,
  }));
};
```

### Access Validation

```typescript
// In API Gateway - validate access before making requests
if (providerType === "server") {
  if (!isAuthenticated) {
    notifyError?.("Please sign in to use authenticated models.");
    return null;
  }
} else {
  if (!provider || !provider.apiKey?.trim()) {
    notifyError?.("API key not configured for this provider.");
    return null;
  }
}
```

### Auto-Model Selection

```typescript
// Automatically select first authenticated model when user signs in
if (session) {
  const authenticatedModels = getAuthenticatedModels();
  
  if (authenticatedModels.length > 0) {
    const currentSelectedModel = get().settings.selectedModel;
    const isCurrentModelAuthenticated = authenticatedModels.some(
      model => model.id === currentSelectedModel
    );
    
    // Select first authenticated model if none selected or current isn't authenticated
    if (!currentSelectedModel || 
        currentSelectedModel === "Select Model" || 
        !isCurrentModelAuthenticated) {
      get().settings.actions.update({ 
        selectedModel: authenticatedModels[0].id 
      });
    }
  }
}
```

## Security Implementation

### Storage Security

```typescript
// Chrome storage provides built-in encryption for local data
const secureStorage = {
  async set(key: string, value: any): Promise<void> {
    return chromeStorageSet({ [key]: value });
  },
  
  async get(key: string): Promise<any> {
    const result = await chromeStorageGet([key]);
    return result[key];
  },
  
  async remove(key: string): Promise<void> {
    return chromeStorageRemove([key]);
  }
};
```

### Communication Security

```typescript
// Validate message origins
const TRUSTED_ORIGINS = [
  "https://www.superwizard.ai",
  "http://localhost:3000", // Development
];

window.addEventListener("message", (event) => {
  const isTrusted = TRUSTED_ORIGINS.some(origin => 
    event.origin === origin || event.origin.startsWith(origin)
  );
  
  if (!isTrusted) {
    console.warn('Untrusted origin:', event.origin);
    return;
  }
  
  // Process trusted message
  handleTrustedMessage(event.data);
});
```

### Session Security

```typescript
// Session timeout handling
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

async function checkSessionExpiry(): Promise<void> {
  const lastSync = await getLastSyncTime();
  
  if (lastSync && (Date.now() - lastSync) > SESSION_TIMEOUT) {
    console.log('Session expired, clearing auth');
    await clearAuth();
  }
}
```

## Error Handling

### Authentication Errors

```typescript
interface AuthError {
  code: string;
  message: string;
  recoverable: boolean;
}

const AUTH_ERRORS = {
  INVALID_SESSION: {
    code: 'INVALID_SESSION',
    message: 'Session is invalid or expired',
    recoverable: true
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network error during authentication',
    recoverable: true
  },
  STORAGE_ERROR: {
    code: 'STORAGE_ERROR',
    message: 'Failed to access secure storage',
    recoverable: false
  }
};
```

### Error Recovery

```typescript
async function handleAuthError(error: AuthError): Promise<void> {
  console.error('Authentication error:', error);
  
  if (error.recoverable) {
    // Attempt to recover by clearing and reloading
    await clearAuth();
    
    // Notify user to re-authenticate
    notifyUser('Please sign in again to continue using authenticated features.');
  } else {
    // Critical error - may require extension restart
    notifyUser('Authentication system error. Please restart the extension.');
  }
}
```

## Integration Points

### With UI Components

```typescript
// Authentication status in UI
const AuthStatus: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAppState(state => state.auth);
  
  if (isLoading) return <LoadingSpinner />;
  
  if (isAuthenticated && user) {
    return (
      <div className="auth-status">
        <Avatar src={user.avatar_url} />
        <span>{user.full_name || user.email}</span>
        <SignOutButton />
      </div>
    );
  }
  
  return <SignInPrompt />;
};
```

### With Model Selection

```typescript
// Filter available models based on auth status
const getAvailableModels = (isAuthenticated: boolean, configuredProviders: any[]) => {
  const models = [];
  
  // Add authenticated models if signed in
  if (isAuthenticated) {
    models.push(...getAuthenticatedModels());
  }
  
  // Add configured provider models
  configuredProviders.forEach(provider => {
    models.push(...provider.models);
  });
  
  return models;
};
```

### With API Gateway

```typescript
// Authentication check in API requests
export async function determineNextAction(/* ... */): Promise<ActionResponse | null> {
  const providerType = getProviderTypeFromModel(selectedModel);
  
  if (providerType === "server") {
    const authState = useAppState.getState().auth;
    
    if (!authState.session?.user) {
      throw new Error("No valid authentication available. Please sign in to continue.");
    }
    
    // Use session-based authentication
    return callServerAPI(selectedModel, messages, maxTokens);
  }
  
  // Use API key authentication for other providers
  return callProviderAPI(/* ... */);
}
```

## Monitoring and Analytics

### Authentication Events

```typescript
interface AuthEvent {
  type: 'sign_in' | 'sign_out' | 'session_refresh' | 'session_expire';
  timestamp: string;
  userId?: string;
  source: 'web_app' | 'extension' | 'auto';
}

// Track authentication events (locally only)
function trackAuthEvent(event: AuthEvent): void {
  console.log('Auth event:', event);
  
  // Store recent events for debugging
  const recentEvents = getRecentAuthEvents();
  recentEvents.push(event);
  
  // Keep only last 10 events
  if (recentEvents.length > 10) {
    recentEvents.shift();
  }
  
  storeRecentAuthEvents(recentEvents);
}
```

### Health Monitoring

```typescript
// Monitor authentication system health
async function checkAuthHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'down';
  issues: string[];
}> {
  const issues: string[] = [];
  
  // Check storage access
  try {
    await chromeStorageGet(['test']);
  } catch (error) {
    issues.push('Storage access failed');
  }
  
  // Check message passing
  try {
    await chrome.runtime.sendMessage({ type: 'PING' });
  } catch (error) {
    issues.push('Message passing failed');
  }
  
  return {
    status: issues.length === 0 ? 'healthy' : 'degraded',
    issues
  };
}
```

## Future Enhancements

### Planned Features
1. **Token Refresh**: Automatic session renewal
2. **Multi-Account**: Support for multiple user accounts
3. **SSO Integration**: Single sign-on with external providers
4. **Offline Mode**: Limited functionality without authentication
5. **Account Linking**: Link multiple authentication methods

### Advanced Security
1. **Biometric Auth**: Fingerprint/face recognition where available
2. **2FA Support**: Two-factor authentication integration
3. **Device Trust**: Device-based authentication
4. **Session Analytics**: Detailed session monitoring
5. **Audit Logging**: Comprehensive authentication audit trail

This Authentication System provides secure, seamless user identity management while maintaining privacy and enabling premium feature access through proper authorization controls.