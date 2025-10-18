// setValue.ts - Optimized version of the setValue function

import { sleep, executeWithCursor, isTaskStopped, ensureCursorCentered } from "../shared/utils";
import { getElementByNodeId, executeScript } from "../core/element";
import { getCenterCoordinates,scrollElementIntoView } from "../core/positioning";
import { click } from "./click";
import { NODE_ID_SELECTOR } from "../constants";

interface OpCtx {
  scrollOk?: boolean;
  clickOk?: boolean;
  elType?: string;
  err?: string;
  uniqueId?: string;
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export async function setValue(payload: {
  elementId: number;
  value: string;
}): Promise<void> {
  const { elementId, value } = payload;
  if (isTaskStopped()) throw new Error("Task was stopped");

  const processedValue = await addAutoClear(elementId, value);
  const val = processedValue
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\clear/g, "\u0001");
  const ctx: OpCtx = {};

  try {
    await prep(elementId, ctx);
    if (isTaskStopped()) throw new Error("Task was stopped");

    const coords = await getCenterCoordinates(elementId);
    await executeWithCursor(coords.x, coords.y, "simulateTyping");
    if (isTaskStopped()) throw new Error("Task was stopped");

    try {
      await click({ elementId });
      ctx.clickOk = true;
    } catch (e) {
      ctx.err = `Click failed: ${e instanceof Error ? e.message : String(e)}`;
    }

    if (ctx.uniqueId) {
      try {
        const focus = await executeScript(
          focusScript,
          ctx.uniqueId,
          NODE_ID_SELECTOR
        );
        if (focus.success) {
          ctx.elType = focus.type;
        } else {
          ctx.err = ctx.err
            ? `${ctx.err}; Focus failed: ${focus.reason}`
            : `Focus failed: ${focus.reason}`;
        }
      } catch (e) {
        ctx.err = ctx.err
          ? `${ctx.err}; Focus script error: ${
              e instanceof Error ? e.message : String(e)
            }`
          : `Focus script error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    await sleep(25);
    if (isTaskStopped()) throw new Error("Task was stopped");

    return new Promise<void>((res, rej) => {
      execMain(elementId, val, ctx)
        .then(async () => {
          await ensureCursorCentered(elementId);
          res();
        })
        .catch(async () => {
          try {
            await execFallback(elementId, val, ctx);
            await ensureCursorCentered(elementId);
            res();
          } catch {
            rej(
              new Error(
                `SetValue failed for element ${elementId}. ${ctx.err || ""}`
              )
            );
          }
        });
    });
  } catch (e) {
    throw new Error(
      `Failed to set value: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function prep(elId: number, ctx: OpCtx): Promise<void> {
  const scroll = await scrollElementIntoView(elId);
  ctx.scrollOk = scroll.success;
  if (!scroll.success) ctx.err = `Scroll: ${scroll.reason}`;

  const { uniqueId } = await getElementByNodeId(elId);
  ctx.uniqueId = uniqueId;
  await sleep(5);
}

async function execMain(elId: number, val: string, ctx: OpCtx): Promise<void> {
  const { uniqueId } = await getElementByNodeId(elId);
  return new Promise<void>((res, rej) => {
    const charDelay = 50;
    const typingDuration = val.length * charDelay;
    const totalDuration = typingDuration + 100;

    executeScript(typeScript, uniqueId, NODE_ID_SELECTOR, val)
      .then((r: any) => {
        if (!r?.success) {
          rej(new Error(`Primary failed: ${r?.reason || "Unknown"}`));
          return;
        }
        ctx.elType = r.type || "unknown";

        setTimeout(() => {
          if (isTaskStopped()) {
            rej(new Error("Task was stopped during typing"));
            return;
          }
          res();
        }, totalDuration);
      })
      .catch((e: any) => rej(e));
  });
}

async function execFallback(
  elId: number,
  val: string,
  ctx: OpCtx
): Promise<void> {
  const { uniqueId } = await getElementByNodeId(elId);
  const r = await executeScript(fbScript, uniqueId, NODE_ID_SELECTOR, val);
  if (!r?.success)
    throw new Error(`Fallback failed: ${r?.reason || "Unknown"}`);
  ctx.elType = r.type || "unknown";

  await sleep(100);
  if (isTaskStopped()) throw new Error("Task was stopped during fallback");
}

async function addAutoClear(elementId: number, value: string): Promise<string> {
  try {
    if (value.startsWith("\\clear") || value.startsWith("\\r")) return value;

    console.log(
      `🔄 Auto-clear: Always adding \\clear before typing in element ${elementId}`
    );
    return `\\clear${value}`;
  } catch (error) {
    console.warn(`⚠️ Auto-clear failed for element ${elementId}:`, error);
    return value;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const dispatchEvents = (el: HTMLElement, events: string[], eventInit?: any) => {
  events.forEach((type) => {
    const event = eventInit
      ? new (eventInit.constructor || Event)(type, eventInit)
      : new Event(type, { bubbles: true });
    el.dispatchEvent(event);
  });
};

const createKeyEvent = ( type: string, key: string, code: string, keyCode: number, options: any = {} ) =>
  new KeyboardEvent(type, {
    key,
    code,
    keyCode,
    which: keyCode,
    bubbles: true,
    cancelable: true,
    composed: true,
    ...options,
    }
);

const checkExistingContentScript = (id: string, sel: string) => {
  const el = document.querySelector(`[${sel}="${id}"]`) as HTMLElement;
  if (!el) return { hasContent: false, reason: "Element not found" };

  try {
    const tag = el.tagName.toLowerCase();

    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      return {
        hasContent: el.value.trim().length > 0,
        contentLength: el.value.length,
        type: "input",
      };
    }

    if (el.isContentEditable || el.contentEditable === "true") {
      const textContent = el.textContent || el.innerText || "";
      return {
        hasContent: textContent.trim().length > 0,
        contentLength: textContent.length,
        type: "contentEditable",
      };
    }

    if (el.hasAttribute("data-lexical-editor")) {
      const textContent = el.textContent || el.innerText || "";
      return {
        hasContent: textContent.trim().length > 0,
        contentLength: textContent.length,
        type: "lexical",
      };
    }

    return { hasContent: false, type: tag };
  } catch (error) {
    return {
      hasContent: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
};

// ============================================================================
// MAIN TYPING SCRIPT
// ============================================================================

const typeScript = (id: string, sel: string, val: string) => {
  const el = document.querySelector(`[${sel}="${id}"]`) as HTMLElement;
  if (!el) return { success: false, reason: "Element not found" };

  // Enhanced element detection for complex React components like GitHub
  const findActualInputElement = (element: HTMLElement): HTMLElement => {
    // If it's already an input or textarea, return it
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return element;
    }

    // Look for nested input elements in common React component patterns
    const inputSelectors = [
      'input[type="text"]',
      'input[type="email"]', 
      'input[type="password"]',
      'input[type="search"]',
      'input[type="url"]',
      'input:not([type])', // input without type defaults to text
      'textarea',
      '[contenteditable="true"]',
      '[contenteditable=""]',
      'input[data-component="input"]', // GitHub specific
      'input.prc-components-Input-Ic-y8', // GitHub specific
      'input[aria-required="true"]',
      'input[aria-describedby]'
    ];

    for (const selector of inputSelectors) {
      const inputEl = element.querySelector(selector) as HTMLElement;
      if (inputEl && isElementVisible(inputEl)) {
        return inputEl;
      }
    }

    // If no nested input found, check if the element itself is focusable
    if (element.tabIndex >= 0 || element.contentEditable === 'true' || element.contentEditable === '') {
      return element;
    }

    // Last resort: return the original element
    return element;
  };

  const isElementVisible = (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return !(
      rect.width === 0 ||
      rect.height === 0 ||
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0'
    );
  };

  // Find the actual input element
  const actualInput = findActualInputElement(el);
  const tag = actualInput.tagName.toLowerCase();
  const inpType = actualInput instanceof HTMLInputElement ? actualInput.type : "N/A";

  try {
    // Focus the actual input element, not the wrapper
    actualInput.focus();
    
    // For GitHub and other React components, ensure proper focus events
    if (actualInput !== el) {
      // Dispatch focus events on both the wrapper and the actual input
      ['focus', 'focusin'].forEach(type => {
        el.dispatchEvent(new FocusEvent(type, { bubbles: true, cancelable: true }));
        actualInput.dispatchEvent(new FocusEvent(type, { bubbles: true, cancelable: true }));
      });
    }
  } catch {
    return {
      success: false,
      reason: "Not focusable",
      type: tag,
      inputType: inpType,
    };
  }

  const isJsAction = (el: HTMLElement) =>
    el.hasAttribute("jsaction") ||
    el.hasAttribute("jsname") ||
    el.hasAttribute("jslog") ||  // Google's logging attribute
    el.hasAttribute("data-ved") ||  // Google's tracking attribute
    (el.getAttribute("role") === "combobox" &&
      el.hasAttribute("aria-autocomplete")) ||
    /II2One|j0Ppje|(zmMKJ.*LbIaRd)|gb_ye|afOp8c/.test(el.className);  // Added Google search classes

  const isDraftJs = (el: HTMLElement) =>
    el.classList.contains("public-DraftEditor-content") ||
    el.querySelector('[data-contents="true"]') ||
    el.querySelector('[data-text="true"]') ||
    (el.contentEditable === "true" && el.querySelector('[data-block="true"]'));

  // Check for GitHub-specific patterns
  const isGitHubInput = (el: HTMLElement) =>
    el.classList.contains('prc-components-Input-Ic-y8') ||
    el.hasAttribute('data-component') && el.getAttribute('data-component') === 'input' ||
    el.closest('.prc-components-TextInputWrapper-i1ofR') !== null ||
    el.classList.contains('FormControl-input') ||
    el.classList.contains('form-control') ||
    el.hasAttribute('data-test-selector') ||
    el.getAttribute('data-target')?.includes('primer-text-field');

  const handler = actualInput.hasAttribute("data-lexical-editor")
    ? "lexical"
    : isDraftJs(actualInput)
    ? "draftjs"
    : isJsAction(actualInput)
    ? "jsaction"
    : isGitHubInput(actualInput)
    ? "github"
    : "default";

  const handlers = {
    lexical: () => {
      if (actualInput.contentEditable !== "true") return { success: false };
      typeChars(actualInput, val, "lexical");
      return { success: true, type: "lexical-editor" };
    },
    draftjs: () => {
      try {
        if (actualInput.contentEditable !== "true")
          return { success: false, reason: "Not contentEditable" };

        actualInput.click();
        actualInput.focus();

        ["focus", "focusin"].forEach((type) =>
          actualInput.dispatchEvent(
            new FocusEvent(type, { bubbles: true, cancelable: true })
          )
        );

        const textSpan = actualInput.querySelector('[data-text="true"]');
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

        typeChars(actualInput, val, "draftjs");
        return { success: true, type: "draftjs-editor" };
      } catch (e) {
        return {
          success: false,
          reason: `Draft.js handling failed: ${
            e instanceof Error ? e.message : String(e)
          }`,
          type: "draftjs",
        };
      }
    },
    jsaction: () => {
      try {
        actualInput.click();
        actualInput.focus();

        // Dispatch comprehensive focus events for jsaction
        const jsactionValue = actualInput.getAttribute("jsaction");
        ["focus", "focusin"].forEach((type) =>
          actualInput.dispatchEvent(
            new FocusEvent(type, { bubbles: true, cancelable: true })
          )
        );

        // For Google search inputs, ensure proper event sequencing
        if (actualInput instanceof HTMLInputElement || actualInput instanceof HTMLTextAreaElement) {
          actualInput.setSelectionRange(actualInput.value.length, actualInput.value.length);
        }

        typeChars(actualInput, val, "jsaction");
        return { success: true, type: "jsaction-input" };
      } catch (e) {
        return {
          success: false,
          reason: `JsAction handling failed: ${
            e instanceof Error ? e.message : String(e)
          }`,
          type: "jsaction",
        };
      }
    },
    github: () => {
      try {
        // GitHub-specific handling for React components
        actualInput.click();
        actualInput.focus();

        // Ensure proper focus events for GitHub components
        ["focus", "focusin"].forEach((type) => {
          actualInput.dispatchEvent(
            new FocusEvent(type, { bubbles: true, cancelable: true })
          );
          // Also dispatch on the wrapper if it's different
          if (actualInput !== el) {
            el.dispatchEvent(
              new FocusEvent(type, { bubbles: true, cancelable: true })
            );
          }
        });

        // Use letter-by-letter typing for GitHub inputs to ensure proper React state updates
        typeChars(actualInput, val, "github");

        return { success: true, type: "github-input" };
      } catch (e) {
        return {
          success: false,
          reason: `GitHub handling failed: ${
            e instanceof Error ? e.message : String(e)
          }`,
          type: "github",
        };
      }
    },
    default: () => {
      typeChars(actualInput, val, "default");
      return { success: true, type: tag, inputType: inpType };
    },
  };

  return handlers[handler]();

  // ========================================================================
  // CHARACTER TYPING FUNCTIONS
  // ========================================================================

  function clearExistingText(el: HTMLElement, mode: string) {
    try {
      if (mode === "draftjs" && el.contentEditable === "true") {
        const textSpan = el.querySelector('[data-text="true"]');
        if (textSpan) {
          textSpan.textContent = "";

          if (
            !textSpan.firstChild ||
            textSpan.firstChild.nodeType !== Node.TEXT_NODE
          ) {
            const textNode = document.createTextNode("");
            textSpan.appendChild(textNode);
          }
        }
      } else if (mode === "lexical" && el.contentEditable === "true") {
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(el);
          selection.removeAllRanges();
          selection.addRange(range);
          range.deleteContents();
        }
      } else if (mode === "github") {
        // GitHub-specific clearing with enhanced React component support
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          // Clear validation state attributes that might prevent typing
          el.removeAttribute("invalid");
          el.removeAttribute("aria-invalid");
          
          // Clear the value
          el.value = "";
          
          // Dispatch comprehensive events for React state management
          el.dispatchEvent(new InputEvent("beforeinput", {
            bubbles: true,
            cancelable: true,
            data: "",
            inputType: "deleteContentBackward",
          }));
          
          el.dispatchEvent(new InputEvent("input", {
            bubbles: true,
            cancelable: true,
            data: "",
            inputType: "deleteContentBackward",
          }));
          
          ["input", "change"].forEach((type) =>
            el.dispatchEvent(new Event(type, { bubbles: true }))
          );
          
          // Update selection
          el.setSelectionRange(0, 0);
        } else if (el.isContentEditable) {
          el.textContent = "";
          // Dispatch input event for contentEditable elements
          el.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
          // Fallback for other element types
          el.textContent = "";
        }
      } else if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement
      ) {
        el.value = "";
        el.dispatchEvent(new Event("input", { bubbles: true }));
      } else if (el.isContentEditable) {
        el.textContent = "";
      }
    } catch (e) {
      try {
        const selection = window.getSelection();
        if (selection && el.isContentEditable) {
          const range = document.createRange();
          range.selectNodeContents(el);
          selection.removeAllRanges();
          selection.addRange(range);
          range.deleteContents();
        }
      } catch (fallbackError) {
        console.warn("Failed to clear existing text:", e, fallbackError);
      }
    }
  }

  function typeChars(el: HTMLElement, val: string, mode: string) {
    const timeouts: any[] = [];
    let stopped = false;
    let completedChars = 0;

    clearExistingText(el, mode);

    const charDelay = 50;

    val.split("").forEach((ch, i) => {
      const t = setTimeout(() => {
        chrome.runtime.sendMessage(
          { type: "CHECK_TASK_STATUS" },
          (response) => {
            if (stopped || !response?.isRunning) {
              stopped = true;
              timeouts.forEach(clearTimeout);
              return;
            }

            if (ch === "\n") {
              handleEnterKey(el, mode);
            } else if (ch === "\r") {
              handleShiftEnterKey(el, mode);
            } else if (ch === "\u0001") {
              handleClearContent(el, mode);
            } else {
              typeChar(el, ch, mode);
            }

            completedChars++;

            if (completedChars === val.length && !stopped) {
              setTimeout(() => {
                if (!stopped)
                  el.dispatchEvent(new Event("change", { bubbles: true }));
              }, charDelay);
            }
          }
        );
      }, i * charDelay);
      timeouts.push(t);
    });

    return () => {
      stopped = true;
      timeouts.forEach(clearTimeout);
    };
  }

  // ========================================================================
  // KEY EVENT HANDLERS
  // ========================================================================

  function submitForm(el: HTMLElement) {
    const form = el.closest("form");
    if (form) {
      try {
        const submitEvent = new Event("submit", {
          bubbles: true,
          cancelable: true,
        });
        if (form.dispatchEvent(submitEvent)) {
          form.submit();
        }
      } catch {
        const submitBtn = form.querySelector(
          'button[type="submit"], input[type="submit"], button:not([type])'
        ) as HTMLElement;
        if (submitBtn) submitBtn.click();
      }
      return true;
    }
    return false;
  }

  function findAndClickSubmitButton(el: HTMLElement) {
    const submitSelectors = [
      'button[type="submit"]',
      'button[data-testid*="send"]',
      'button[aria-label*="send" i]',
      'button[aria-label*="search" i]',  // Google search button
      'button[title*="send" i]',
      'button[title*="search" i]',  // Google search button
      '[role="button"][data-testid*="send"]',
      '[role="button"][aria-label*="search" i]',  // Google search button
      'button[jsname]',  // Google's jsaction buttons
      'button[data-ved]',  // Google's tracking attribute
    ];

    const checkVisible = (btn: HTMLElement): boolean => {
      const rect = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      return !(
        rect.width === 0 ||
        rect.height === 0 ||
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0'
      );
    };

    // First, try to find the button in the context of the input (for search forms)
    const form = el.closest("form");
    if (form) {
      for (const selector of submitSelectors) {
        const btn = form.querySelector(selector) as HTMLElement;
        if (btn && checkVisible(btn)) {
          btn.click();
          return true;
        }
      }
    }

    // Then try within common parent containers
    for (const selector of submitSelectors) {
      const btn =
        (el
          .closest(".form, .chat, .message, .input-container, .composer, .search-form, .searchform")
          ?.querySelector(selector) as HTMLElement) ||
        (document.querySelector(selector) as HTMLElement);
      if (btn && checkVisible(btn)) {
        btn.click();
        return true;
      }
    }

    // Find buttons by text content
    const allButtons = Array.from(document.querySelectorAll("button"));
    const textBasedBtn = allButtons.find((btn) => {
      if (!checkVisible(btn)) return false;
      const text = btn.textContent?.toLowerCase() || "";
      const ariaLabel = btn.getAttribute("aria-label")?.toLowerCase() || "";
      return (
        text.includes("send") || 
        text.includes("submit") || 
        text.includes("search") ||
        ariaLabel.includes("search") ||
        ariaLabel.includes("send") ||
        ariaLabel.includes("submit")
      );
    });

    if (textBasedBtn) {
      textBasedBtn.click();
      return true;
    }

    return false;
  }

  function handleEnterKey(el: HTMLElement, mode: string) {
    // For jsaction elements (like Google search), dispatch keyboard events FIRST
    // This allows Google's framework to handle the Enter key before any form submission
    const isJsActionElement = el.hasAttribute("jsaction") || 
                              el.hasAttribute("jsname") || 
                              el.hasAttribute("jslog") ||
                              (el.getAttribute("role") === "combobox" && el.hasAttribute("aria-autocomplete"));

    // Create enhanced keyboard events with all necessary properties
    const createEnterEvent = (type: string) => {
      return new KeyboardEvent(type, {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        charCode: type === "keypress" ? 13 : 0,
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window,
        detail: 0,
      });
    };

    // Dispatch keydown first
    const keydownEvent = createEnterEvent("keydown");
    const keydownNotPrevented = el.dispatchEvent(keydownEvent);

    // For jsaction elements, if keydown was handled (prevented), don't continue with form submission
    if (isJsActionElement) {
      // Always dispatch the full event sequence for jsaction
      const keypressEvent = createEnterEvent("keypress");
      el.dispatchEvent(keypressEvent);
      
      // Small delay before keyup to simulate real typing
      setTimeout(() => {
        const keyupEvent = createEnterEvent("keyup");
        el.dispatchEvent(keyupEvent);
        
        // Dispatch input event for frameworks that listen to it
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }, 10);

      // If keydown was prevented, don't try form submission
      if (!keydownNotPrevented) {
        return;
      }

      // For jsaction, also try to trigger form submission after events
      setTimeout(() => {
        if (!submitForm(el)) {
          findAndClickSubmitButton(el);
        }
      }, 50);
      return;
    }

    // For non-jsaction elements, try form submission after keydown
    if (keydownNotPrevented) {
      if (submitForm(el) || findAndClickSubmitButton(el)) {
        // Still dispatch keyup for completeness
        setTimeout(() => {
          el.dispatchEvent(createEnterEvent("keyup"));
        }, 10);
        return;
      }
    }

    // If we get here, dispatch the remaining keyboard events
    const keypressEvent = createEnterEvent("keypress");
    el.dispatchEvent(keypressEvent);
    
    const keyupEvent = createEnterEvent("keyup");
    el.dispatchEvent(keyupEvent);

    // Handle textarea and contentEditable line breaks
    if (el instanceof HTMLTextAreaElement) {
      const p = el.selectionStart || el.value.length;
      el.value = el.value.substring(0, p) + "\n" + el.value.substring(p);
      el.selectionStart = el.selectionEnd = p + 1;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (el.isContentEditable || mode !== "default") {
      document.execCommand?.("insertLineBreak", false) ||
        document.execCommand?.("insertHTML", false, "<br>");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function handleShiftEnterKey(el: HTMLElement, mode: string) {
    if (mode === "draftjs") {
      const keyboardInit = {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
        composed: true,
      };

      ["keydown", "keypress", "keyup"].forEach((t) => {
        el.dispatchEvent(new KeyboardEvent(t, keyboardInit));
      });

      if (el.isContentEditable) {
        document.execCommand?.("insertLineBreak", false) ||
          document.execCommand?.("insertHTML", false, "<br>");
      }

      el.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    if (el.hasAttribute("data-lexical-editor") || mode === "lexical") {
      const keyboardInit = {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
        composed: true,
      };

      ["keydown", "keypress", "keyup"].forEach((t) => {
        el.dispatchEvent(new KeyboardEvent(t, keyboardInit));
      });

      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const br = document.createElement("br");
        range.insertNode(br);
        range.setStartAfter(br);
        range.setEndAfter(br);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        const br = document.createElement("br");
        el.appendChild(br);

        if (sel) {
          const range = document.createRange();
          range.setStartAfter(br);
          range.setEndAfter(br);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }

      el.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    const evts = ["keydown", "keypress", "keyup"].map(
      (t) =>
        new KeyboardEvent(t, {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          shiftKey: true,
          bubbles: true,
          cancelable: true,
          composed: true,
        })
    );

    evts.forEach((e) => el.dispatchEvent(e));

    if (el instanceof HTMLTextAreaElement) {
      const p = el.selectionStart || el.value.length;
      el.value = el.value.substring(0, p) + "\n" + el.value.substring(p);
      el.selectionStart = el.selectionEnd = p + 1;
    } else if (el.isContentEditable || mode !== "default") {
      document.execCommand?.("insertLineBreak", false) ||
        document.execCommand?.("insertHTML", false, "<br>");
    }

    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function handleClearContent(el: HTMLElement, mode: string) {
    const mac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

    const selectAllEvent = new KeyboardEvent("keydown", {
      key: "a",
      code: "KeyA",
      keyCode: 65,
      which: 65,
      metaKey: mac,
      ctrlKey: !mac,
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    el.dispatchEvent(selectAllEvent);

    setTimeout(() => {
      const deleteEvent = new KeyboardEvent("keydown", {
        key: "Delete",
        code: "Delete",
        keyCode: 46,
        which: 46,
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      el.dispatchEvent(deleteEvent);

      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, 10);

    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.value = "";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (
      el.isContentEditable ||
      mode === "lexical" ||
      mode === "draftjs"
    ) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        if (mode === "draftjs") {
          const contentsDiv = el.querySelector('[data-contents="true"]');
          if (contentsDiv) {
            const blocks = contentsDiv.querySelectorAll('[data-block="true"]');

            for (let i = 1; i < blocks.length; i++) {
              blocks[i].remove();
            }

            const firstBlock = blocks[0];
            if (firstBlock) {
              const textSpan = firstBlock.querySelector('[data-text="true"]');
              if (textSpan) {
                textSpan.textContent = "";
                const textNode = document.createTextNode("");
                textSpan.appendChild(textNode);
                range.setStart(textNode, 0);
                range.setEnd(textNode, 0);
                selection?.removeAllRanges();
                selection?.addRange(range);
              }
            }
          }
        } else {
          range.selectNodeContents(el);
          range.deleteContents();
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function typeChar(el: HTMLElement, ch: string, mode: string) {
    const code = ch.charCodeAt(0);
    const upper = ch === ch.toUpperCase() && ch !== ch.toLowerCase();
    const init = {
      key: ch,
      code: `Key${ch.toUpperCase()}`,
      keyCode: code,
      which: code,
      shiftKey: upper,
      bubbles: true,
      cancelable: true,
      composed: true,
    };

    if (["lexical", "jsaction", "github"].includes(mode)) {
      if (mode === "jsaction") {
        // Enhanced jsaction handling for Google inputs
        el.focus();
        el.dispatchEvent(new FocusEvent("focusin", { bubbles: true, cancelable: true }));
        
        // Handle input elements with proper value insertion
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          const start = el.selectionStart || el.value.length;
          const end = el.selectionEnd || el.value.length;
          const beforeValue = el.value.substring(0, start);
          const afterValue = el.value.substring(end);
          
          // Dispatch beforeinput event
          el.dispatchEvent(new InputEvent("beforeinput", {
            bubbles: true,
            cancelable: true,
            data: ch,
            inputType: "insertText",
          }));
          
          // Dispatch keyboard events
          ["keydown", "keypress"].forEach((t) => {
            el.dispatchEvent(new KeyboardEvent(t, init));
          });
          
          // Set the new value
          el.value = beforeValue + ch + afterValue;
          
          // Update selection to after the inserted character
          const newPos = start + 1;
          el.setSelectionRange(newPos, newPos);
          
          // Dispatch input event
          el.dispatchEvent(new InputEvent("input", {
            bubbles: true,
            cancelable: true,
            data: ch,
            inputType: "insertText",
          }));
          
          // Dispatch keyup
          el.dispatchEvent(new KeyboardEvent("keyup", init));
          
          return;
        }
      }

      if (mode === "github") {
        // GitHub-specific typing with enhanced React component support
        el.focus();
        
        // Dispatch focus events for React components
        ["focus", "focusin"].forEach((type) => {
          el.dispatchEvent(new FocusEvent(type, { bubbles: true, cancelable: true }));
        });

        // Handle different input types for GitHub
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          // For standard input elements, append character and update selection
          const start = el.selectionStart || el.value.length;
          const end = el.selectionEnd || el.value.length;
          const beforeValue = el.value.substring(0, start);
          const afterValue = el.value.substring(end);
          
          // Set the new value
          el.value = beforeValue + ch + afterValue;
          
          // Update selection to after the inserted character
          const newPos = start + 1;
          el.setSelectionRange(newPos, newPos);
          
          // Use comprehensive event sequence for GitHub React components
          // Dispatch events in the correct order for React state management
          ["beforeinput"].forEach((t) => {
            const evt = new InputEvent(t, {
              bubbles: true,
              cancelable: true,
              data: ch,
              inputType: "insertText",
            });
            el.dispatchEvent(evt);
          });
          
          ["keydown", "keypress", "keyup"].forEach((t) => {
            el.dispatchEvent(new KeyboardEvent(t, init));
          });
          
          // Dispatch input event which is critical for React controlled components
          el.dispatchEvent(new InputEvent("input", {
            bubbles: true,
            cancelable: true,
            data: ch,
            inputType: "insertText",
          }));
          
          // Also dispatch a native change-like event for validation fields
          el.dispatchEvent(new Event("input", { bubbles: true }));
        } else if (el.isContentEditable) {
          // For contentEditable elements, use execCommand or manual insertion
          if (!document.execCommand("insertText", false, ch)) {
            const sel = window.getSelection();
            if (sel?.rangeCount) {
              const range = sel.getRangeAt(0);
              range.deleteContents();
              const txt = document.createTextNode(ch);
              range.insertNode(txt);
              range.setStartAfter(txt);
              range.setEndAfter(txt);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
        return;
      }

      if (mode === "draftjs") {
        const textSpan = el.querySelector('[data-text="true"]');
        if (textSpan) {
          ["beforeinput", "keydown", "keypress", "input", "keyup"].forEach(
            (t) => {
              const evt = ["beforeinput", "input"].includes(t)
                ? new InputEvent(t, {
                    bubbles: true,
                    cancelable: true,
                    data: ch,
                    inputType: "insertText",
                  })
                : new KeyboardEvent(t, init);
              el.dispatchEvent(evt);
            }
          );

          const currentText = textSpan.textContent || "";
          textSpan.textContent = currentText + ch;

          if (window.getSelection && textSpan.firstChild) {
            const sel = window.getSelection();
            if (sel) {
              const range = document.createRange();
              const textNode = textSpan.firstChild;
              const offset = textNode.textContent?.length || 0;
              range.setStart(textNode, offset);
              range.setEnd(textNode, offset);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }
        }
        return;
      } else {
        ["beforeinput", "keydown", "keypress", "input", "keyup"].forEach(
          (t) => {
            const evt = ["beforeinput", "input"].includes(t)
              ? new InputEvent(t, {
                  bubbles: true,
                  cancelable: true,
                  data: ch,
                  inputType: "insertText",
                })
              : new KeyboardEvent(t, init);
            el.dispatchEvent(evt);
          }
        );

        if (!document.execCommand("insertText", false, ch)) {
          const sel = window.getSelection();
          if (sel?.rangeCount) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const txt = document.createTextNode(ch);
            range.insertNode(txt);
            range.setStartAfter(txt);
            range.setEndAfter(txt);
            sel.removeAllRanges();
            sel.addRange(range);
          } else if (mode === "jsaction" && el instanceof HTMLInputElement) {
            el.value += ch;
            el.setSelectionRange(el.value.length, el.value.length);
            ["input", "change"].forEach((type) =>
              el.dispatchEvent(new Event(type, { bubbles: true }))
            );
          }
        }
      }
    } else {
      ["keydown", "keypress", "keyup"].forEach((t) => {
        el.dispatchEvent(new KeyboardEvent(t, init));
      });

      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.value += ch;
      } else if (el.isContentEditable) {
        document.execCommand("insertText", false, ch);
      }
    }

    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
};

// ============================================================================
// FALLBACK SCRIPT
// ============================================================================

const fbScript = (id: string, sel: string, val: string) => {
  const el = document.querySelector(`[${sel}="${id}"]`) as HTMLElement;
  if (!el) return { success: false, reason: "Not found" };

  // Enhanced element detection for complex React components like GitHub
  const findActualInputElement = (element: HTMLElement): HTMLElement => {
    // If it's already an input or textarea, return it
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return element;
    }

    // Look for nested input elements in common React component patterns
    const inputSelectors = [
      'input[type="text"]',
      'input[type="email"]', 
      'input[type="password"]',
      'input[type="search"]',
      'input[type="url"]',
      'input:not([type])', // input without type defaults to text
      'textarea',
      '[contenteditable="true"]',
      '[contenteditable=""]',
      'input[data-component="input"]', // GitHub specific
      'input.prc-components-Input-Ic-y8', // GitHub specific
      'input[aria-required="true"]',
      'input[aria-describedby]'
    ];

    for (const selector of inputSelectors) {
      const inputEl = element.querySelector(selector) as HTMLElement;
      if (inputEl && isElementVisible(inputEl)) {
        return inputEl;
      }
    }

    // If no nested input found, check if the element itself is focusable
    if (element.tabIndex >= 0 || element.contentEditable === 'true' || element.contentEditable === '') {
      return element;
    }

    // Last resort: return the original element
    return element;
  };

  const isElementVisible = (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return !(
      rect.width === 0 ||
      rect.height === 0 ||
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0'
    );
  };

  // Find the actual input element
  const actualInput = findActualInputElement(el);
  const tag = actualInput.tagName.toLowerCase();
  const inpType = actualInput instanceof HTMLInputElement ? actualInput.type : "N/A";

  try {
    actualInput.focus();

    if (actualInput instanceof HTMLInputElement || actualInput instanceof HTMLTextAreaElement) {
      actualInput.value = "";
      actualInput.dispatchEvent(new Event("input", { bubbles: true }));
      actualInput.value = val;

      if (actualInput.hasAttribute("jsaction") || actualInput.hasAttribute("jsname")) {
        ["focusin", "focus"].forEach((type) =>
          actualInput.dispatchEvent(new FocusEvent(type, { bubbles: true }))
        );
        ["keydown", "keypress", "keyup"].forEach((type) =>
          actualInput.dispatchEvent(
            new KeyboardEvent(type, { bubbles: true, cancelable: true })
          )
        );
        ["input", "change"].forEach((type) =>
          actualInput.dispatchEvent(new Event(type, { bubbles: true }))
        );
        actualInput.dispatchEvent(new FocusEvent("blur", { bubbles: true }));

        return {
          success: true,
          method: "direct-value-jsaction",
          type: tag,
          inputType: inpType,
        };
      } else {
        ["input", "change"].forEach((type) =>
          actualInput.dispatchEvent(new Event(type, { bubbles: true }))
        );
        return {
          success: true,
          method: "direct-value",
          type: tag,
          inputType: inpType,
        };
      }
    }

    // Check for GitHub-specific patterns first
    const isGitHubInput = (el: HTMLElement) =>
      el.classList.contains('prc-components-Input-Ic-y8') ||
      el.hasAttribute('data-component') && el.getAttribute('data-component') === 'input' ||
      el.closest('.prc-components-TextInputWrapper-i1ofR') !== null ||
      el.classList.contains('FormControl-input') ||
      el.classList.contains('form-control') ||
      el.hasAttribute('data-test-selector') ||
      el.getAttribute('data-target')?.includes('primer-text-field');

    if (isGitHubInput(actualInput)) {
      // Use GitHub-specific typing approach for fallback as well
      actualInput.click();
      actualInput.focus();

      // Ensure proper focus events for GitHub components
      ["focus", "focusin"].forEach((type) => {
        actualInput.dispatchEvent(
          new FocusEvent(type, { bubbles: true, cancelable: true })
        );
      });

      // Clear existing content
      if (actualInput instanceof HTMLInputElement || actualInput instanceof HTMLTextAreaElement) {
        actualInput.value = "";
        actualInput.dispatchEvent(new Event("input", { bubbles: true }));
      } else if (actualInput.isContentEditable) {
        actualInput.textContent = "";
        actualInput.dispatchEvent(new Event("input", { bubbles: true }));
      }

      // Set new value with proper event dispatching
      if (actualInput instanceof HTMLInputElement || actualInput instanceof HTMLTextAreaElement) {
        // For GitHub controlled inputs, we need to dispatch proper events
        // Dispatch beforeinput event
        actualInput.dispatchEvent(new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          data: val,
          inputType: "insertText",
        }));
        
        // Set the value
        actualInput.value = val;
        actualInput.setSelectionRange(val.length, val.length);
        
        // Dispatch input event with proper InputEvent interface
        actualInput.dispatchEvent(new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          data: val,
          inputType: "insertText",
        }));
        
        // Dispatch standard input event
        actualInput.dispatchEvent(new Event("input", { bubbles: true }));
        
        // Dispatch change event for form validation
        actualInput.dispatchEvent(new Event("change", { bubbles: true }));
        
        // Also dispatch blur to trigger any validation that might happen on blur
        setTimeout(() => {
          actualInput.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
          actualInput.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
        }, 50);
      } else if (actualInput.isContentEditable) {
        actualInput.textContent = val;
        actualInput.dispatchEvent(new Event("input", { bubbles: true }));
      }

      return {
        success: true,
        method: "github-fallback",
        type: tag,
        inputType: inpType,
      };
    }

    if (actualInput.isContentEditable) {
      const isDraftJs =
        actualInput.classList.contains("public-DraftEditor-content") ||
        actualInput.querySelector('[data-contents="true"]') ||
        actualInput.querySelector('[data-text="true"]') ||
        actualInput.querySelector('[data-block="true"]');

      if (isDraftJs) {
        try {
          const contentsDiv = actualInput.querySelector('[data-contents="true"]');
          if (!contentsDiv) {
            throw new Error("Draft.js contents div not found");
          }

          const blocks = contentsDiv.querySelectorAll('[data-block="true"]');
          for (let i = 1; i < blocks.length; i++) {
            blocks[i].remove();
          }

          let firstBlock = blocks[0];
          if (!firstBlock) {
            const blockDiv = document.createElement("div");
            blockDiv.setAttribute("data-block", "true");
            blockDiv.setAttribute("data-editor", "draft");
            blockDiv.setAttribute("data-offset-key", "draft-0-0");

            const styleDiv = document.createElement("div");
            styleDiv.setAttribute("data-offset-key", "draft-0-0");
            styleDiv.className =
              "public-DraftStyleDefault-block public-DraftStyleDefault-ltr";

            const spanDiv = document.createElement("div");
            spanDiv.setAttribute("data-offset-key", "draft-0-0");

            const textSpan = document.createElement("span");
            textSpan.setAttribute("data-text", "true");

            spanDiv.appendChild(textSpan);
            styleDiv.appendChild(spanDiv);
            blockDiv.appendChild(styleDiv);
            contentsDiv.appendChild(blockDiv);
            firstBlock = blockDiv;
          }

          const textSpan = firstBlock.querySelector('[data-text="true"]');
          if (!textSpan) {
            throw new Error("Draft.js text span not found");
          }

          let processedValue = val;
          if (val.startsWith("\u0001")) {
            processedValue = val.substring(1);
            textSpan.textContent = "";
          }

          const lines = processedValue.split("\\n");
          textSpan.textContent = lines[0] || "";

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];

            const blockDiv = document.createElement("div");
            blockDiv.setAttribute("data-block", "true");
            blockDiv.setAttribute("data-editor", "draft");
            blockDiv.setAttribute("data-offset-key", `draft-${i}-0`);

            const styleDiv = document.createElement("div");
            styleDiv.setAttribute("data-offset-key", `draft-${i}-0`);
            styleDiv.className =
              "public-DraftStyleDefault-block public-DraftStyleDefault-ltr";

            const spanDiv = document.createElement("div");
            spanDiv.setAttribute("data-offset-key", `draft-${i}-0`);

            const newTextSpan = document.createElement("span");
            newTextSpan.setAttribute("data-text", "true");
            newTextSpan.textContent = line;

            spanDiv.appendChild(newTextSpan);
            styleDiv.appendChild(spanDiv);
            blockDiv.appendChild(styleDiv);
            contentsDiv.appendChild(blockDiv);
          }

          const lastTextSpan = contentsDiv.querySelector(
            '[data-text="true"]:last-child'
          );
          if (lastTextSpan && lastTextSpan.firstChild) {
            const selection = window.getSelection();
            if (selection) {
              const range = document.createRange();
              const textNode = lastTextSpan.firstChild;
              const offset = textNode.textContent?.length || 0;
              range.setStart(textNode, offset);
              range.setEnd(textNode, offset);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }

          ["input", "change"].forEach((type) =>
            el.dispatchEvent(new Event(type, { bubbles: true }))
          );

          return { success: true, method: "direct-content-draftjs", type: tag };
        } catch (error) {
          return {
            success: false,
            reason: `Draft.js fallback failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
            type: tag,
          };
        }
      }

      actualInput.textContent = "";
      actualInput.dispatchEvent(new Event("input", { bubbles: true }));
      actualInput.textContent = val;
      ["input", "change"].forEach((type) =>
        actualInput.dispatchEvent(new Event(type, { bubbles: true }))
      );
      return { success: true, method: "direct-content", type: tag };
    }

    return {
      success: false,
      reason: "Type not supported",
      type: tag,
      inputType: inpType,
    };
  } catch (e) {
    return {
      success: false,
      reason: e instanceof Error ? e.message : String(e),
      type: tag,
    };
  }
};

// ============================================================================
// FOCUS SCRIPT
// ============================================================================

const focusScript = (id: string, sel: string) => {
  const el = document.querySelector(`[${sel}="${id}"]`) as HTMLElement;
  if (!el) return { success: false, reason: "Not found" };

  // Enhanced element detection for complex React components like GitHub
  const findActualInputElement = (element: HTMLElement): HTMLElement => {
    // If it's already an input or textarea, return it
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return element;
    }

    // Look for nested input elements in common React component patterns
    const inputSelectors = [
      'input[type="text"]',
      'input[type="email"]', 
      'input[type="password"]',
      'input[type="search"]',
      'input[type="url"]',
      'input:not([type])', // input without type defaults to text
      'textarea',
      '[contenteditable="true"]',
      '[contenteditable=""]',
      'input[data-component="input"]', // GitHub specific
      'input.prc-components-Input-Ic-y8', // GitHub specific
      'input[aria-required="true"]',
      'input[aria-describedby]'
    ];

    for (const selector of inputSelectors) {
      const inputEl = element.querySelector(selector) as HTMLElement;
      if (inputEl && isElementVisible(inputEl)) {
        return inputEl;
      }
    }

    // If no nested input found, check if the element itself is focusable
    if (element.tabIndex >= 0 || element.contentEditable === 'true' || element.contentEditable === '') {
      return element;
    }

    // Last resort: return the original element
    return element;
  };

  const isElementVisible = (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return !(
      rect.width === 0 ||
      rect.height === 0 ||
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0'
    );
  };

  // Find the actual input element
  const actualInput = findActualInputElement(el);
  const tag = actualInput.tagName.toLowerCase();
  const isEditable = actualInput.contentEditable === "true" || actualInput.isContentEditable;

  try {
    const isDraftJs =
      actualInput.classList.contains("public-DraftEditor-content") ||
      actualInput.querySelector('[data-contents="true"]') ||
      actualInput.querySelector('[data-text="true"]') ||
      actualInput.querySelector('[data-block="true"]');

    if (isEditable || actualInput.hasAttribute("data-lexical-editor") || isDraftJs) {
      actualInput.click();
      actualInput.focus();
      ["focusin", "focus"].forEach((type) => {
        actualInput.dispatchEvent(new FocusEvent(type, { bubbles: true }));
        // Also dispatch on the wrapper if it's different
        if (actualInput !== el) {
          el.dispatchEvent(new FocusEvent(type, { bubbles: true }));
        }
      });

      if (window.getSelection) {
        const sel = window.getSelection();
        const range = document.createRange();

        if (isDraftJs) {
          const textSpan = actualInput.querySelector('[data-text="true"]');
          if (textSpan) {
            let txt = textSpan.firstChild;
            if (!txt || txt.nodeType !== Node.TEXT_NODE) {
              txt = document.createTextNode("");
              textSpan.appendChild(txt);
            }
            const offset = txt.textContent?.length || 0;
            range.setStart(txt, offset);
            range.setEnd(txt, offset);
          } else {
            let txt = actualInput.firstChild;
            if (!txt || txt.nodeType !== Node.TEXT_NODE) {
              txt = document.createTextNode("");
              actualInput.appendChild(txt);
            }
            range.setStart(txt, 0);
            range.setEnd(txt, 0);
          }
        } else {
          let txt = actualInput.firstChild;
          if (!txt || txt.nodeType !== Node.TEXT_NODE) {
            txt = document.createTextNode("");
            actualInput.appendChild(txt);
          }
          range.setStart(txt, 0);
          range.setEnd(txt, 0);
        }

        sel?.removeAllRanges();
        sel?.addRange(range);
      }

      const active = document.activeElement;
      const focused = active === actualInput || actualInput.contains(active);
      return {
        success: focused,
        type: tag,
        method: isDraftJs ? "draftjs" : "enhanced",
      };
    } else {
      actualInput.click();
      actualInput.focus();

      if (
        "selectionStart" in actualInput &&
        (actualInput instanceof HTMLInputElement || actualInput instanceof HTMLTextAreaElement)
      ) {
        const len = actualInput.value?.length || 0;
        actualInput.selectionStart = actualInput.selectionEnd = len;
      }

      return {
        success: document.activeElement === actualInput,
        type: tag,
        method: "standard",
      };
    }
  } catch (e) {
    return {
      success: false,
      reason: e instanceof Error ? e.message : String(e),
      type: tag,
    };
  }
};
