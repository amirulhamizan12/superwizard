// ═══════════════════════════════════════════════════════════════════════════
// § CURSOR SIMULATOR
// ═══════════════════════════════════════════════════════════════════════════
interface CursorOptions { size?: number; color?: string; zIndex?: number }
const SVG_NS = "http://www.w3.org/2000/svg";
const setStyles = (el: HTMLElement | SVGElement, styles: Record<string, string>) => Object.assign(el.style, styles);
const createSVG = <T extends SVGElement>(tag: string, attrs: Record<string, string> = {}, styles: Record<string, string> = {}): T => {
  const el = document.createElementNS(SVG_NS, tag) as T;
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  setStyles(el, styles);
  return el;
};

export class CursorSimulator {
  private container: HTMLDivElement | null = null;
  private svgElement: SVGElement | null = null;
  private cursorCircle: SVGPathElement | null = null;
  private clickRipple: SVGCircleElement | null = null;
  private currentX = 0;
  private currentY = 0;
  private options: Required<CursorOptions>;
  constructor(options: CursorOptions = {}) { this.options = { size: options.size || 14, color: options.color || "var(--superwizard-brand-primary, #1D7BA7)", zIndex: options.zIndex || 2147483647 }; }
  public initialize(): void {
    if (this.container) return;
    this.container = document.createElement("div");
    this.container.id = "superwizard-cursor-container";
    setStyles(this.container, { position: "fixed", top: "0", left: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: `${this.options.zIndex}` });
    this.svgElement = createSVG("svg", { id: "superwizard-cursor-svg", viewBox: "0 0 349 385", fill: "none" }, { position: "absolute", width: `${this.options.size * 1.32}px`, height: `${this.options.size * 1.452}px`, transform: "translate(0, 0)", transformOrigin: "2.2px 2.2px", opacity: "0", transition: "transform 150ms ease-out, opacity 300ms ease-out", pointerEvents: "none", overflow: "visible" });
    const defs = createSVG<SVGDefsElement>("defs");
    const filter = createSVG<SVGFilterElement>("filter", { id: "cursor-shadow", x: "-50%", y: "-50%", width: "200%", height: "200%" });
    filter.appendChild(createSVG<SVGFEDropShadowElement>("feDropShadow", { dx: "2", dy: "2", stdDeviation: "3", "flood-color": "rgba(0, 0, 0, 0.4)" }));
    defs.appendChild(filter);
    this.svgElement.appendChild(defs);
    this.cursorCircle = createSVG<SVGPathElement>("path", { d: "M10.765 39.684C6.524 19.414 28.223 3.648 46.19 13.946l280.329 160.66c18.26 10.465 15.166 37.691-4.977 43.791l-127.896 38.736a4.006 4.006 0 0 0-2.152 1.584l-71.318 105.216c-11.889 17.541-39.018 12.192-43.358-8.55l-66.053-315.7Z", fill: "#1D7BA7", stroke: "#fff", "stroke-width": "20", filter: "url(#cursor-shadow)" });
    if (this.cursorCircle) setStyles(this.cursorCircle, { transition: "transform 150ms ease-out" });
    this.clickRipple = createSVG<SVGCircleElement>("circle", { cx: "16.5", cy: "16.5", r: "8.8", fill: "none", stroke: this.options.color, "stroke-width": "3" }, { opacity: "0", transition: "transform 300ms ease-out, opacity 300ms ease-out", transformOrigin: "center" });
    if (this.cursorCircle) this.svgElement.appendChild(this.cursorCircle);
    if (this.clickRipple) this.svgElement.appendChild(this.clickRipple);
    this.container.appendChild(this.svgElement);
    document.body.appendChild(this.container);
    this.currentX = window.innerWidth / 2;
    this.currentY = window.innerHeight / 2;
    this.updateCursorPosition(this.currentX, this.currentY);
  }
  public destroy(): void { if (this.container?.parentNode) { this.container.parentNode.removeChild(this.container); this.container = this.svgElement = this.cursorCircle = this.clickRipple = null; } }
  public async moveTo(x: number, y: number, duration = 500): Promise<void> {
    if (!this.svgElement || (this.currentX === x && this.currentY === y)) return;
    this.svgElement.style.transition = `left ${duration}ms ease-out, top ${duration}ms ease-out`;
    this.updateCursorPosition(x, y);
    return new Promise((res) => setTimeout(res, duration));
  }
  public async click(animationDuration = 300): Promise<void> {
    if (!this.cursorCircle || !this.clickRipple) return;
    setStyles(this.clickRipple, { transition: "none", transform: "scale(1)", opacity: "0" });
    setStyles(this.clickRipple, { transition: `transform ${animationDuration}ms ease-out, opacity ${animationDuration}ms ease-out` });
    this.clickRipple.style.opacity = "0.6";
    this.clickRipple.style.transform = "scale(2.5)";
    this.cursorCircle.style.transform = "scale(0.9)";
    setTimeout(() => this.clickRipple && (this.clickRipple.style.opacity = "0"), animationDuration / 2);
    return new Promise((res) => setTimeout(() => { if (this.cursorCircle) this.cursorCircle.style.transform = "scale(1)"; if (this.clickRipple) this.clickRipple.style.transform = "scale(1)"; res(); }, animationDuration));
  }
  public async simulateTyping(): Promise<void> {}
  public setVisibility(visible: boolean): void { if (!this.svgElement) return; this.svgElement.style.opacity = visible ? "1" : "0"; }
  private updateCursorPosition(x: number, y: number): void { if (!this.svgElement) return; this.currentX = x; this.currentY = y; this.svgElement.style.left = `${x}px`; this.svgElement.style.top = `${y}px`; }
}
