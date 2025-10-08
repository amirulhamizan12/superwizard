// Extract and filter visible/interactive DOM elements into a simplified structure for AI analysis

import { executeScript } from "../operation";

export interface LayerElement {
  id: string;
  tagName: string;
  attributes: Record<string, string>;
  textContent?: string;
  children: (LayerElement | null)[];
}

const C = {
  attrs: [
    "data-id",
    "role",
    "type",
    "placeholder",
    "aria-label",
    "aria-expanded",
    "title",
    "for",
    "contenteditable",
    "rtrvr-framework",
  ],
  skip: [
    "script",
    "style",
    "link",
    "meta",
    "noscript",
    "head",
    "title",
    "base",
  ],
};

export async function getSimplifiedDom() {
  console.log("[DOM Extraction] Starting DOM extraction...");

  try {
    const result = await executeScript(() => {
      console.log("[DOM Extraction - Content Script] Executing in page context");
    const elements: any[] = [],
      skip = [
        "script",
        "style",
        "link",
        "meta",
        "noscript",
        "head",
        "title",
        "base",
      ];
    const processedElements = new Set<Element>();
    let idCounter = 0;
    const elementMap = new Map<number, Element>(); // Stable element ID mapping

    const attrs = [
      "data-id",
      "role",
      "type",
      "placeholder",
      "aria-label",
      "aria-expanded",
      "title",
      "for",
      "contenteditable",
      "rtrvr-framework",
    ];

    const isDropdown = (el: Element, tag: string) => {
      const role = el.getAttribute("role")?.toLowerCase(),
        type = el.getAttribute("type")?.toLowerCase();
      return (
        ["select", "option", "optgroup"].includes(tag) ||
        ["listbox", "combobox", "menu", "menuitem"].includes(role || "") ||
        (tag === "input" && type === "combobox") ||
        el.getAttribute("aria-haspopup") ||
        ["dropdown", "select", "combobox", "menu"].some((cls) =>
          el.classList.contains(cls)
        )
      );
    };

    const isInputElement = (el: Element, tag: string) => {
      // Check if it's a direct input element
      if (["input", "textarea"].includes(tag)) {
        return true;
      }

      // Check for contentEditable elements
      if (el.getAttribute("contenteditable") === "true" || el.getAttribute("contenteditable") === "") {
        return true;
      }

      // Check for GitHub-specific input patterns
      if (el.classList.contains("prc-components-Input-Ic-y8") ||
          el.hasAttribute("data-component") && el.getAttribute("data-component") === "input" ||
          el.closest(".prc-components-TextInputWrapper-i1ofR") !== null) {
        return true;
      }

      // Check for nested input elements
      const hasNestedInput = el.querySelector('input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="url"], input:not([type]), textarea, [contenteditable="true"], [contenteditable=""]');
      return hasNestedInput !== null;
    };

    const processElement = (e: Element): any => {
      const tag = e.tagName.toLowerCase();
      if (skip.includes(tag)) return null;

      const elementAttrs: Record<string, string> = {};
      Array.from(e.attributes).forEach(
        (a) => attrs.includes(a.name.toLowerCase()) && (elementAttrs[a.name] = a.value)
      );

      return {
        id: e.id || elementAttrs["data-id"] || Math.random().toString(36).substr(2, 9),
        tagName: tag,
        attributes: elementAttrs,
        textContent: e.textContent?.trim() || undefined,
        children: [],
      };
    };

    const elementToHtml = (el: any): string => {
      if (
        el.tagName === "input" &&
        el.attributes["type"] === "hidden" &&
        !el.textContent
      )
        return "";

      // Avoid array destructuring to prevent Babel helper issues in injected scripts
      const filteredAttrs = Object.entries(el.attributes).filter(
        (entry) => attrs.includes(entry[0].toLowerCase()) && entry[1]
      );
      const dataIdAttr = filteredAttrs.find((entry) => entry[0] === "data-id");
      const otherAttrs = filteredAttrs.filter((entry) => entry[0] !== "data-id");

      // Filter out elements with no content and only role attribute
      if (!el.textContent && otherAttrs.length === 1 && otherAttrs[0][0] === "role")
        return "";

      if (dataIdAttr && otherAttrs.length === 0 && !el.textContent) return "";

      const attrString = otherAttrs.map((entry) => `${entry[0]}="${entry[1]}"`).join(" ");
      const dataIdPrefix = dataIdAttr ? `${dataIdAttr[1]}` : "";
      const htmlElement = `${dataIdPrefix}<${el.tagName}${
        attrString ? ` ${attrString}` : ""
      }>${el.textContent || ""}</${el.tagName}>`;

      return htmlElement;
    };

    Array.from(document.querySelectorAll("*")).forEach((el) => {
      const tagName = el.tagName.toLowerCase();
      if (skip.includes(tagName) || processedElements.has(el)) return;

      const rect = el.getBoundingClientRect(),
        style = window.getComputedStyle(el);
      const isVisible = !(
        rect.width === 0 ||
        rect.height === 0 ||
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0"
      );
      const dropdown = isDropdown(el, tagName);
      const isInput = isInputElement(el, tagName);

      if (isVisible || dropdown || isInput) {
        processedElements.add(el);

        const cloned = el.cloneNode(false) as Element;
        const currentId = idCounter++;
        cloned.setAttribute("data-id", currentId.toString());

        if (dropdown && !isVisible)
          cloned.setAttribute("data-invisible-dropdown", "true");

        const directText = Array.from(el.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent)
          .join("")
          .trim();

        if (directText) cloned.textContent = directText;

        const elementData = { element: el, isVisible, cloned, id: currentId };

        // Store in stable element mapping
        elementMap.set(currentId, el);
        elements.push(elementData);

        // Debug logging for input elements
        if (isInput) {
          console.log(`Stored input element ID ${currentId}: ${el.tagName} with classes: ${el.className}`);
        }
      }
    });

    // Store elements in a stable Map where key is element ID
    (window as any).__superwizard_elements = elementMap;
    console.log(`[DOM Extraction - Content Script] Found ${elements.length} visible elements`);

    const container = document.createElement("div");
    elements.forEach((item) => container.appendChild(item.cloned));
    const allElements = container.innerHTML;
    console.log(`[DOM Extraction - Content Script] Container HTML length: ${allElements.length}`);

    if (!allElements) {
      console.warn("[DOM Extraction - Content Script] No elements found");
      return "No visible content available";
    }

    // Parse and process DOM in content script context (where DOMParser is available)
    const dom = new DOMParser().parseFromString(
      `<div>${allElements}</div>`,
      "text/html"
    );
    const parsedContainer = dom.querySelector("div");
    if (!parsedContainer) {
      console.warn("[DOM Extraction - Content Script] Failed to parse container");
      return "No content to process";
    }

    const processed = Array.from(parsedContainer.children)
      .map((el) => processElement(el as Element))
      .filter(Boolean)
      .map((el) => elementToHtml(el!))
      .filter((html) => html.trim())
      .join("\n");

    console.log(`[DOM Extraction - Content Script] Processed DOM length: ${processed.length}`);
    return processed;
  });

  console.log("[DOM Extraction] Result received:", result ? `${result.length} characters` : "null/empty");
  return result || "No visible content available";

  } catch (error) {
    console.error("[DOM Extraction] Error during extraction:", error);
    return "No visible content available";
  }
}
