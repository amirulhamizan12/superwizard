---
inclusion: fileMatch
fileMatchPattern: "src/**/*.ts"
---

# Chrome Extension Development Patterns for Superwizard AI

## Message Passing Architecture

### Content Script to Service Worker Communication
```typescript
// Always use proper typing for messages
interface ExtensionMessage {
  type: string;
  payload: any;
  tabId?: number;
  timestamp: number;
}

// Use consistent error handling
chrome.runtime.sendMessage(message, (response) => {
  if (chrome.runtime.lastError) {
    console.error('Message failed:', chrome.runtime.lastError);
    return;
  }
  // Handle response
});
```

### Service Worker Message Handling
```typescript
// Implement proper message routing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    switch (message.type) {
      case 'DOM_ACTION':
        handleDOMAction(message.payload, sender.tab?.id);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  } catch (error) {
    console.error('Message handling error:', error);
    sendResponse({ error: error.message });
  }
  return true; // Keep message channel open for async responses
});
```

## DOM Manipulation Best Practices

### Element Identification Strategy
- Always use data-superwizard-id attributes for reliable targeting
- Implement fallback identification methods (aria-label, text content)
- Validate element existence before interaction
- Use proper event simulation for natural interactions

### Page Stability Checks
```typescript
// Always ensure page stability before actions
async function ensurePageStability(): Promise<void> {
  return new Promise((resolve) => {
    const checkStability = () => {
      if (document.readyState === 'complete' && 
          !document.querySelector('.loading') &&
          window.performance.getEntriesByType('navigation')[0]?.loadEventEnd > 0) {
        resolve();
      } else {
        setTimeout(checkStability, 100);
      }
    };
    checkStability();
  });
}
```

## State Management Patterns

### Zustand Store Structure
- Separate concerns into logical slices (taskManager, settings, storage)
- Use Immer for immutable updates
- Implement proper persistence with Chrome storage
- Type all store interfaces explicitly

### Error State Management
```typescript
interface ErrorState {
  hasError: boolean;
  errorMessage: string;
  errorType: 'recoverable' | 'fatal';
  timestamp: number;
  context?: Record<string, any>;
}
```

## Security Implementation

### API Key Management
- Store API keys in Chrome's secure storage only
- Never log or expose API keys in console
- Implement key validation before usage
- Use environment-specific key management

### Content Security Policy
- Follow strict CSP guidelines for extension security
- Validate all external content before processing
- Sanitize user inputs before DOM manipulation
- Use proper CORS handling for API requests

## Performance Optimization

### DOM Query Optimization
```typescript
// Cache DOM queries when possible
const elementCache = new Map<string, Element>();

function getCachedElement(selector: string): Element | null {
  if (!elementCache.has(selector)) {
    const element = document.querySelector(selector);
    if (element) elementCache.set(selector, element);
  }
  return elementCache.get(selector) || null;
}
```

### Memory Management
- Clean up event listeners in content scripts
- Use WeakMap for element associations
- Implement proper cleanup in React components
- Monitor memory usage in background scripts

## Testing Patterns

### Chrome Extension Testing
```typescript
// Mock Chrome APIs for testing
const mockChrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

global.chrome = mockChrome;
```

### Integration Testing Strategy
- Test message passing between contexts
- Validate DOM manipulation accuracy
- Test error scenarios and recovery
- Verify permission handling

These patterns ensure robust, secure, and performant Chrome extension development following Superwizard AI's architectural standards.