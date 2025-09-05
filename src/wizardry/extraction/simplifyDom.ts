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
    "aria-labelledby",
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
  const allElements = await executeScript(() => {
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
    const elementSignatures = new Map<
      string,
      { element: Element; isVisible: boolean; cloned: Element; id: number }
    >();
    let idCounter = 0;

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

    const getElementSignature = (el: Element, tagName: string) => {
      const attrs = [
        "role",
        "type",
        "placeholder",
        "aria-label",
        "aria-expanded",
        "title",
        "for",
        "contenteditable",
      ];
      const attrStr = attrs
        .map((attr) => `${attr}:${el.getAttribute(attr) || ""}`)
        .join("|");
      const textContent = Array.from(el.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join("")
        .trim();
      return `${tagName}|${attrStr}|${textContent}`;
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

      if (isVisible || dropdown) {
        processedElements.add(el);
        const signature = getElementSignature(el, tagName);
        const existing = elementSignatures.get(signature);

        // If we already have this signature, prefer visible over invisible
        if (existing && existing.isVisible && !isVisible) {
          return; // Skip this invisible element as we already have a visible one
        }

        const cloned = el.cloneNode(false) as Element;
        cloned.setAttribute("data-id", idCounter.toString());

        if (dropdown && !isVisible)
          cloned.setAttribute("data-invisible-dropdown", "true");

        const directText = Array.from(el.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent)
          .join("")
          .trim();

        if (directText) cloned.textContent = directText;

        const elementData = { element: el, isVisible, cloned, id: idCounter++ };

        // If this is a visible element replacing an invisible one, remove the old one
        if (existing && !existing.isVisible && isVisible) {
          const index = elements.findIndex((item) => item.id === existing.id);
          if (index !== -1) elements.splice(index, 1);
        }

        elementSignatures.set(signature, elementData);
        elements.push(elementData);
      }
    });

    (window as any).__superwizard_elements = elements.map(
      (item) => item.element
    );
    const container = document.createElement("div");
    elements.forEach((item) => container.appendChild(item.cloned));
    return container.innerHTML;
  });

  if (!allElements) return "No visible content available";

  const dom = new DOMParser().parseFromString(
    `<div>${allElements}</div>`,
    "text/html"
  );
  const container = dom.querySelector("div");
  if (!container) return "No content to process";

  return Array.from(container.children)
    .map((el) => processElement(el as Element))
    .filter(Boolean)
    .map((el) => elementToHtml(el!))
    .filter((html) => html.trim())
    .join("\n");
}

const processElement = (e: Element): LayerElement | null => {
  const tag = e.tagName.toLowerCase();
  if (C.skip.includes(tag)) return null;

  const attrs: Record<string, string> = {};
  Array.from(e.attributes).forEach(
    (a) => C.attrs.includes(a.name.toLowerCase()) && (attrs[a.name] = a.value)
  );

  return {
    id: e.id || attrs["data-id"] || Math.random().toString(36).substr(2, 9),
    tagName: tag,
    attributes: attrs,
    textContent: e.textContent?.trim() || undefined,
    children: [],
  };
};

const elementToHtml = (el: LayerElement): string => {
  if (
    el.tagName === "input" &&
    el.attributes["type"] === "hidden" &&
    !el.textContent
  )
    return "";

  const filteredAttrs = Object.entries(el.attributes).filter(
    ([k, v]) => C.attrs.includes(k.toLowerCase()) && v
  );
  const dataIdAttr = filteredAttrs.find(([k]) => k === "data-id");
  const otherAttrs = filteredAttrs.filter(([k]) => k !== "data-id");

  // Filter out elements with no content and only role attribute
  if (!el.textContent && otherAttrs.length === 1 && otherAttrs[0][0] === "role")
    return "";

  if (dataIdAttr && otherAttrs.length === 0 && !el.textContent) return "";

  const attrString = otherAttrs.map(([k, v]) => `${k}="${v}"`).join(" ");
  const dataIdPrefix = dataIdAttr ? `${dataIdAttr[1]}` : "";
  const htmlElement = `${dataIdPrefix}<${el.tagName}${
    attrString ? ` ${attrString}` : ""
  }>${el.textContent || ""}</${el.tagName}>`;

  return htmlElement;
};
