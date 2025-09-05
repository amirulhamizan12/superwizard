# Operations System

## Overview

The Operations System handles all DOM interactions and browser automation actions. It provides a robust, reliable interface for executing user commands through precise element targeting, intelligent action execution, and comprehensive error handling.

## Architecture

### Core Components

```typescript
interface ActionResult {
  success: boolean;
  actionId: string;
  duration: number;
  error?: string;
  details: {
    type: string;
    payload: any;
  };
}

type ActionName = "click" | "setValue" | "navigate" | "waiting";

interface ActionPayload<T extends ActionName> {
  click: { elementId: number };
  setValue: { elementId: number; value: string };
  navigate: { url: string };
  waiting: { seconds: number };
}
```

### Action State Management

```typescript
class ActionStateManager {
  private actionStates = new Map<string, ActionState>();
  private activeAction: string | null = null;
  
  startAction(actionId: string, type: string): void;
  setActionInProgress(actionId: string): void;
  completeAction(actionId: string): void;
  failAction(actionId: string, error: string): void;
  hasActiveAction(): boolean;
  waitForAllActions(): Promise<void>;
}
```

## DOM Element Targeting

### Data-ID Assignment System

The system assigns unique identifiers to interactive elements for reliable targeting:

```typescript
function assignDataIds(element: Element, counter: { value: number }): void {
  if (isInteractiveElement(element)) {
    element.setAttribute('data-superwizard-id', counter.value.toString());
    counter.value++;
  }
  
  Array.from(element.children).forEach(child => 
    assignDataIds(child, counter)
  );
}

function isInteractiveElement(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute('role');
  
  // Form elements
  if (['input', 'textarea', 'select', 'button'].includes(tag)) {
    return true;
  }
  
  // Clickable elements
  if (tag === 'a' || role === 'button' || role === 'link') {
    return true;
  }
  
  // Interactive ARIA elements
  if (['tab', 'menuitem', 'option', 'checkbox', 'radio'].includes(role || '')) {
    return true;
  }
  
  // Elements with event listeners
  if (element.hasAttribute('onclick') || element.hasAttribute('jsaction')) {
    return true;
  }
  
  return false;
}
```

### Element Resolution

```typescript
async function getElementByNodeId(elementId: number): Promise<{
  element: Element;
  uniqueId: string;
}> {
  return executeScript((id: number, selector: string) => {
    const element = document.querySelector(`[${selector}="${id}"]`);
    if (!element) {
      throw new Error(`Element with ID ${id} not found`);
    }
    
    return {
      element,
      uniqueId: element.getAttribute(selector) || '',
    };
  }, elementId, NODE_ID_SELECTOR);
}
```

## Action Implementations

### 1. Click Action

The click action provides multiple execution strategies for maximum compatibility:

```typescript
export async function click(payload: { elementId: number }): Promise<void> {
  const elementId = payload.elementId;
  
  try {
    // Primary method: Coordinate-based clicking with cursor movement
    const coordinates = await scrollWaitAndGetCoordinates(elementId, true);
    
    // Move cursor to element
    await executeWithCursor(coordinates.x, coordinates.y, "click");
    
    // Execute click at coordinates
    const clickSuccess = await executeScript(
      (x: number, y: number) => {
        const element = document.elementFromPoint(x, y);
        if (!element) return false;
        
        const eventOptions = {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y,
          detail: 1,
        };
        
        // Dispatch mouse events in sequence
        element.dispatchEvent(new MouseEvent("mousedown", eventOptions));
        element.dispatchEvent(new MouseEvent("click", eventOptions));
        element.dispatchEvent(new MouseEvent("mouseup", eventOptions));
        
        return true;
      },
      coordinates.x,
      coordinates.y
    );
    
    if (!clickSuccess) {
      throw new Error("No element found at coordinates");
    }
    
  } catch (primaryError) {
    // Backup method: Direct element interaction
    const { uniqueId } = await getElementByNodeId(elementId);
    
    const clickResult = await executeScript<ClickResult>(
      (uniqueId: string, selector: string) => {
        const element = document.querySelector(`[${selector}="${uniqueId}"]`);
        if (!element) return { success: false, reason: "Element not found" };
        
        try {
          // Handle special element types
          if (element.getAttribute("role") === "option") {
            return handleDropdownOption(element);
          }
          
          // Standard click methods
          if (element instanceof HTMLElement) {
            element.click();
            return { success: true, method: "native" };
          }
          
          // Event-based clicking
          element.dispatchEvent(new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
          }));
          
          return { success: true, method: "event" };
        } catch (error) {
          return {
            success: false,
            reason: error instanceof Error ? error.message : String(error),
          };
        }
      },
      uniqueId,
      NODE_ID_SELECTOR
    );
    
    if (!clickResult.success) {
      throw new Error(`Click failed: ${clickResult.reason}`);
    }
  }
  
  // Ensure cursor positioning after click
  await ensureCursorCentered(elementId);
}
```

### 2. SetValue Action

The setValue action handles complex text input scenarios including rich text editors:

```typescript
export async function setValue(payload: {
  elementId: number;
  value: string;
}): Promise<void> {
  const { elementId, value } = payload;
  
  // Process special characters
  const processedValue = await addAutoClear(elementId, value);
  const val = processedValue
    .replace(/\\n/g, "\n")      // Enter key
    .replace(/\\r/g, "\r")      // Newline
    .replace(/\\clear/g, "\u0001"); // Clear command
  
  // Prepare element (scroll, focus)
  await prepareElement(elementId);
  
  // Move cursor to element
  const coords = await getCenterCoordinates(elementId);
  await executeWithCursor(coords.x, coords.y, "simulateTyping");
  
  // Click to focus
  await click({ elementId });
  
  // Execute typing with fallback
  try {
    await executeMainTyping(elementId, val);
  } catch (error) {
    await executeFallbackTyping(elementId, val);
  }
  
  await ensureCursorCentered(elementId);
}
```

#### Advanced Text Input Handling

```typescript
const typeScript = (id: string, sel: string, val: string) => {
  const el = document.querySelector(`[${sel}="${id}"]`) as HTMLElement;
  if (!el) return { success: false, reason: "Element not found" };
  
  // Detect editor type
  const handler = el.hasAttribute("data-lexical-editor")
    ? "lexical"
    : isDraftJs(el)
    ? "draftjs"
    : isJsAction(el)
    ? "jsaction"
    : "default";
  
  const handlers = {
    lexical: () => handleLexicalEditor(el, val),
    draftjs: () => handleDraftJsEditor(el, val),
    jsaction: () => handleJsActionInput(el, val),
    default: () => handleStandardInput(el, val),
  };
  
  return handlers[handler]();
};
```

#### Special Editor Support

```typescript
// Draft.js Editor Support
function handleDraftJsEditor(el: HTMLElement, val: string) {
  try {
    // Focus and setup selection
    el.click();
    el.focus();
    
    const textSpan = el.querySelector('[data-text="true"]');
    if (textSpan && window.getSelection) {
      const sel = window.getSelection();
      const range = document.createRange();
      
      let textNode = textSpan.firstChild;
      if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
        textNode = document.createTextNode("");
        textSpan.appendChild(textNode);
      }
      
      const offset = textNode.textContent?.length || 0;
      range.setStart(textNode, offset);
      range.setEnd(textNode, offset);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    
    typeChars(el, val, "draftjs");
    return { success: true, type: "draftjs-editor" };
  } catch (e) {
    return { success: false, reason: `Draft.js handling failed: ${e}` };
  }
}

// Lexical Editor Support
function handleLexicalEditor(el: HTMLElement, val: string) {
  if (el.contentEditable !== "true") {
    return { success: false, reason: "Not contentEditable" };
  }
  
  typeChars(el, val, "lexical");
  return { success: true, type: "lexical-editor" };
}
```

#### Character-by-Character Typing

```typescript
function typeChars(el: HTMLElement, val: string, mode: string) {
  const charDelay = 50;
  
  // Clear existing content first
  clearExistingText(el, mode);
  
  val.split("").forEach((ch, i) => {
    setTimeout(() => {
      if (ch === "\n") {
        handleEnterKey(el, mode);
      } else if (ch === "\r") {
        handleShiftEnterKey(el, mode);
      } else if (ch === "\u0001") {
        handleClearContent(el, mode);
      } else {
        typeChar(el, ch, mode);
      }
    }, i * charDelay);
  });
}
```

### 3. Navigate Action

```typescript
export async function navigate(payload: { url: string }): Promise<void> {
  const tabId = useAppState.getState().taskManager.tabId;
  const targetUrl = payload.url;
  
  return new Promise((resolve, reject) => {
    const listener = (
      updatedTabId: number,
      changeInfo: chrome.tabs.TabChangeInfo
    ) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(resolve, CONFIG.NAVIGATION.WAIT_AFTER_COMPLETE);
      }
    };
    
    chrome.tabs.onUpdated.addListener(listener);
    
    chrome.tabs.update(tabId, { url: targetUrl }, (tab) => {
      if (chrome.runtime.lastError) {
        chrome.tabs.onUpdated.removeListener(listener);
        reject(new Error(`Navigation failed: ${chrome.runtime.lastError.message}`));
      }
    });
  });
}
```

### 4. Waiting Action

```typescript
export async function waiting(payload: { seconds: number }): Promise<void> {
  const seconds = Math.max(payload.seconds, 5); // Minimum 5 seconds
  
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}
```

## Page Stability Management

### Stability Checks

```typescript
async function ensurePageStability(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const checkStability = () => {
      chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // Document ready state
          if (document.readyState !== 'complete') return false;
          
          // Network activity check
          const navigation = window.performance.getEntriesByType('navigation')[0] as any;
          if (navigation?.loadEventEnd === 0) return false;
          
          // Animation check
          const animations = document.getAnimations();
          if (animations.some(anim => anim.playState === 'running')) return false;
          
          return true;
        }
      }, (results) => {
        if (results[0]?.result) {
          resolve();
        } else {
          setTimeout(checkStability, 100);
        }
      });
    };
    
    checkStability();
  });
}
```

### Element Positioning

```typescript
async function scrollWaitAndGetCoordinates(
  elementId: number,
  accuracyMode: boolean = false
): Promise<ElementCoordinates> {
  // Scroll element into view
  const scrollResult = await scrollElementIntoView(elementId);
  if (!scrollResult.success) {
    throw new Error(`Scroll failed: ${scrollResult.reason}`);
  }
  
  // Wait for stability
  const waitTime = accuracyMode 
    ? CONFIG.CLICK.WAIT_AFTER_SCROLL_ACCURACY 
    : CONFIG.CLICK.WAIT_AFTER_SCROLL;
  await sleep(waitTime);
  
  // Get precise coordinates
  return getCenterCoordinates(elementId);
}

async function getCenterCoordinates(elementId: number): Promise<ElementCoordinates> {
  return executeScript((id: number, selector: string) => {
    const element = document.querySelector(`[${selector}="${id}"]`) as HTMLElement;
    if (!element) {
      throw new Error(`Element ${id} not found for coordinates`);
    }
    
    const rect = element.getBoundingClientRect();
    
    return {
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2),
      width: rect.width,
      height: rect.height,
    };
  }, elementId, NODE_ID_SELECTOR);
}
```

## Visual Feedback System

### Cursor Simulation

```typescript
class CursorSimulator {
  private cursorElement: HTMLElement;
  private isVisible: boolean = false;
  
  constructor(private config: CursorConfig) {
    this.cursorElement = this.createCursorElement();
  }
  
  initialize(): void {
    if (!document.body.contains(this.cursorElement)) {
      document.body.appendChild(this.cursorElement);
    }
  }
  
  setVisibility(visible: boolean): void {
    this.isVisible = visible;
    this.cursorElement.style.display = visible ? 'block' : 'none';
  }
  
  moveTo(x: number, y: number, animationType?: string): void {
    if (!this.isVisible) return;
    
    this.cursorElement.style.left = `${x}px`;
    this.cursorElement.style.top = `${y}px`;
    
    if (animationType) {
      this.cursorElement.className = `superwizard-cursor ${animationType}`;
    }
  }
  
  private createCursorElement(): HTMLElement {
    const cursor = document.createElement('div');
    cursor.className = 'superwizard-cursor';
    cursor.style.cssText = `
      position: fixed;
      width: ${this.config.size}px;
      height: ${this.config.size}px;
      background: ${this.config.color};
      border-radius: 50%;
      pointer-events: none;
      z-index: ${this.config.zIndex};
      transition: all 0.2s ease;
    `;
    return cursor;
  }
}
```

### Cursor Integration

```typescript
async function executeWithCursor(
  x: number,
  y: number,
  animationType: string
): Promise<boolean> {
  try {
    const cursor = (window as any).__superwizardCursor;
    if (cursor) {
      cursor.moveTo(x, y, animationType);
      await sleep(200); // Animation time
    }
    return true;
  } catch (error) {
    console.warn('Cursor movement failed:', error);
    return false;
  }
}
```

## Error Handling and Recovery

### Action Error Classification

```typescript
interface ActionError {
  type: 'element_not_found' | 'scroll_failed' | 'click_failed' | 'typing_failed' | 'navigation_failed';
  message: string;
  recoverable: boolean;
  retryable: boolean;
}

const classifyError = (error: Error, actionType: string): ActionError => {
  const message = error.message.toLowerCase();
  
  if (message.includes('element') && message.includes('not found')) {
    return {
      type: 'element_not_found',
      message: error.message,
      recoverable: true,
      retryable: true
    };
  }
  
  if (message.includes('scroll')) {
    return {
      type: 'scroll_failed',
      message: error.message,
      recoverable: true,
      retryable: true
    };
  }
  
  return {
    type: actionType as any,
    message: error.message,
    recoverable: false,
    retryable: false
  };
};
```

### Retry Logic

```typescript
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      const actionError = classifyError(lastError, 'unknown');
      if (!actionError.retryable || attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = backoffMs * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
  
  throw lastError!;
}
```

## Configuration System

### Action Configuration

```typescript
export const CONFIG = {
  CLICK: {
    WAIT_AFTER_SCROLL: 100,
    WAIT_AFTER_SCROLL_ACCURACY: 300,
    WAIT_AFTER_CLICK: 50,
    MAX_SCROLL_ATTEMPTS: 3,
  },
  TYPING: {
    CHAR_DELAY: 50,
    CLEAR_DELAY: 100,
    FOCUS_DELAY: 25,
  },
  NAVIGATION: {
    WAIT_AFTER_COMPLETE: 500,
    MAX_WAIT_TIME: 30000,
  },
  STABILITY: {
    CHECK_INTERVAL: 100,
    MAX_WAIT_TIME: 5000,
    ANIMATION_SETTLE_TIME: 200,
  }
};
```

### Performance Optimization

```typescript
// Debounced DOM queries
const debouncedQueries = new Map<string, Promise<any>>();

async function optimizedElementQuery(selector: string): Promise<Element | null> {
  if (debouncedQueries.has(selector)) {
    return debouncedQueries.get(selector);
  }
  
  const promise = executeScript((sel: string) => {
    return document.querySelector(sel);
  }, selector);
  
  debouncedQueries.set(selector, promise);
  
  // Clear cache after short delay
  setTimeout(() => {
    debouncedQueries.delete(selector);
  }, 1000);
  
  return promise;
}
```

## Integration Points

### With Task Manager
- Provides action execution capabilities
- Reports action results and progress
- Handles task interruption signals

### With AI System
- Receives parsed action commands
- Provides execution feedback for AI learning
- Handles action validation and error reporting

### With DOM Extraction
- Coordinates with DOM simplification
- Ensures element availability before actions
- Provides element state feedback

### With Visual Feedback
- Integrates cursor movement with actions
- Provides real-time action visualization
- Coordinates with screenshot capture

## Future Enhancements

### Planned Features
1. **Smart Element Detection**: ML-based element identification
2. **Action Recording**: Record user actions for replay
3. **Parallel Execution**: Multi-element actions
4. **Advanced Gestures**: Drag, drop, swipe operations
5. **Cross-Frame Support**: Actions in iframes and shadow DOM

### Performance Improvements
1. **Action Batching**: Group related actions
2. **Predictive Loading**: Pre-load likely next elements
3. **Caching Strategy**: Intelligent element caching
4. **Resource Monitoring**: Memory and CPU optimization
5. **Network Awareness**: Adapt to connection quality

This Operations System provides the foundation for reliable, intelligent browser automation while maintaining flexibility for complex web application interactions and future enhancements.