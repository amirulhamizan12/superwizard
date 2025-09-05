/**
 * setValue.ts - Optimized version
 */

import {
  sleep,
  executeWithCursor,
  isTaskStopped,
  ensureCursorCentered,
} from "../toolkit/utils";
import { getElementByNodeId, executeScript } from "../core/element";
import {
  getCenterCoordinates,
  scrollElementIntoView,
} from "../core/positioning";
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

const createKeyEvent = (
  type: string,
  key: string,
  code: string,
  keyCode: number,
  options: any = {}
) =>
  new KeyboardEvent(type, {
    key,
    code,
    keyCode,
    which: keyCode,
    bubbles: true,
    cancelable: true,
    composed: true,
    ...options,
  });

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

  const tag = el.tagName.toLowerCase();
  const inpType = el instanceof HTMLInputElement ? el.type : "N/A";

  try {
    el.focus();
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
    (el.getAttribute("role") === "combobox" &&
      el.hasAttribute("aria-autocomplete")) ||
    /II2One|j0Ppje|(zmMKJ.*LbIaRd)/.test(el.className);

  const isDraftJs = (el: HTMLElement) =>
    el.classList.contains("public-DraftEditor-content") ||
    el.querySelector('[data-contents="true"]') ||
    el.querySelector('[data-text="true"]') ||
    (el.contentEditable === "true" && el.querySelector('[data-block="true"]'));

  const handler = el.hasAttribute("data-lexical-editor")
    ? "lexical"
    : isDraftJs(el)
    ? "draftjs"
    : isJsAction(el)
    ? "jsaction"
    : "default";

  const handlers = {
    lexical: () => {
      if (el.contentEditable !== "true") return { success: false };
      typeChars(el, val, "lexical");
      return { success: true, type: "lexical-editor" };
    },
    draftjs: () => {
      try {
        if (el.contentEditable !== "true")
          return { success: false, reason: "Not contentEditable" };

        el.click();
        el.focus();

        ["focus", "focusin"].forEach((type) =>
          el.dispatchEvent(
            new FocusEvent(type, { bubbles: true, cancelable: true })
          )
        );

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
        el.click();
        el.focus();

        const jsactionValue = el.getAttribute("jsaction");
        if (jsactionValue?.includes("focus:")) {
          ["focus", "focusin"].forEach((type) =>
            el.dispatchEvent(
              new FocusEvent(type, { bubbles: true, cancelable: true })
            )
          );
        }

        typeChars(el, val, "jsaction");
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
    default: () => {
      typeChars(el, val, "default");
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
      'button[title*="send" i]',
      '[role="button"][data-testid*="send"]',
    ];

    for (const selector of submitSelectors) {
      const btn =
        (el
          .closest(".form, .chat, .message, .input-container, .composer")
          ?.querySelector(selector) as HTMLElement) ||
        (document.querySelector(selector) as HTMLElement);
      if (btn) {
        btn.click();
        return true;
      }
    }

    const allButtons = Array.from(document.querySelectorAll("button"));
    const textBasedBtn = allButtons.find((btn) => {
      const text = btn.textContent?.toLowerCase() || "";
      return text.includes("send") || text.includes("submit");
    });

    if (textBasedBtn) {
      textBasedBtn.click();
      return true;
    }

    return false;
  }

  function handleEnterKey(el: HTMLElement, mode: string) {
    if (submitForm(el) || findAndClickSubmitButton(el)) {
      return;
    }

    const evts = ["keydown", "keypress", "keyup"].map(
      (t) =>
        new KeyboardEvent(t, {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
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

    if (["lexical", "jsaction"].includes(mode)) {
      if (mode === "jsaction") {
        el.focus();
        el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
        if (el instanceof HTMLInputElement) {
          el.setSelectionRange(el.value.length, el.value.length);
        }
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

  const tag = el.tagName.toLowerCase();
  const inpType = el instanceof HTMLInputElement ? el.type : "N/A";

  try {
    el.focus();

    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.value = "";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.value = val;

      if (el.hasAttribute("jsaction") || el.hasAttribute("jsname")) {
        ["focusin", "focus"].forEach((type) =>
          el.dispatchEvent(new FocusEvent(type, { bubbles: true }))
        );
        ["keydown", "keypress", "keyup"].forEach((type) =>
          el.dispatchEvent(
            new KeyboardEvent(type, { bubbles: true, cancelable: true })
          )
        );
        ["input", "change"].forEach((type) =>
          el.dispatchEvent(new Event(type, { bubbles: true }))
        );
        el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));

        return {
          success: true,
          method: "direct-value-jsaction",
          type: tag,
          inputType: inpType,
        };
      } else {
        ["input", "change"].forEach((type) =>
          el.dispatchEvent(new Event(type, { bubbles: true }))
        );
        return {
          success: true,
          method: "direct-value",
          type: tag,
          inputType: inpType,
        };
      }
    }

    if (el.isContentEditable) {
      const isDraftJs =
        el.classList.contains("public-DraftEditor-content") ||
        el.querySelector('[data-contents="true"]') ||
        el.querySelector('[data-text="true"]') ||
        el.querySelector('[data-block="true"]');

      if (isDraftJs) {
        try {
          const contentsDiv = el.querySelector('[data-contents="true"]');
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

      el.textContent = "";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.textContent = val;
      ["input", "change"].forEach((type) =>
        el.dispatchEvent(new Event(type, { bubbles: true }))
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

  const tag = el.tagName.toLowerCase();
  const isEditable = el.contentEditable === "true" || el.isContentEditable;

  try {
    const isDraftJs =
      el.classList.contains("public-DraftEditor-content") ||
      el.querySelector('[data-contents="true"]') ||
      el.querySelector('[data-text="true"]') ||
      el.querySelector('[data-block="true"]');

    if (isEditable || el.hasAttribute("data-lexical-editor") || isDraftJs) {
      el.click();
      el.focus();
      ["focusin", "focus"].forEach((type) =>
        el.dispatchEvent(new FocusEvent(type, { bubbles: true }))
      );

      if (window.getSelection) {
        const sel = window.getSelection();
        const range = document.createRange();

        if (isDraftJs) {
          const textSpan = el.querySelector('[data-text="true"]');
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
            let txt = el.firstChild;
            if (!txt || txt.nodeType !== Node.TEXT_NODE) {
              txt = document.createTextNode("");
              el.appendChild(txt);
            }
            range.setStart(txt, 0);
            range.setEnd(txt, 0);
          }
        } else {
          let txt = el.firstChild;
          if (!txt || txt.nodeType !== Node.TEXT_NODE) {
            txt = document.createTextNode("");
            el.appendChild(txt);
          }
          range.setStart(txt, 0);
          range.setEnd(txt, 0);
        }

        sel?.removeAllRanges();
        sel?.addRange(range);
      }

      const active = document.activeElement;
      const focused = active === el || el.contains(active);
      return {
        success: focused,
        type: tag,
        method: isDraftJs ? "draftjs" : "enhanced",
      };
    } else {
      el.click();
      el.focus();

      if (
        "selectionStart" in el &&
        (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
      ) {
        const len = el.value?.length || 0;
        el.selectionStart = el.selectionEnd = len;
      }

      return {
        success: document.activeElement === el,
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
