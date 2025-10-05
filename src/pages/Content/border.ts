// ═══════════════════════════════════════════════════════════════════════════
// § BORDER EFFECT SIMULATOR
// ═══════════════════════════════════════════════════════════════════════════
interface BorderEffectOptions { color?: string; zIndex?: number; opacity?: number; animationDuration?: number; glowIntensity?: number; pulseSpeed?: number }
const hexToRgb = (hex: string) => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : null;
};
const setStyles = (el: HTMLElement, styles: Record<string, string>) => Object.assign(el.style, styles);

export class BorderEffectSimulator {
  private container: HTMLDivElement | null = null;
  private overlay: HTMLDivElement | null = null;
  private options: Required<BorderEffectOptions>;
  constructor(options: BorderEffectOptions = {}) {
    this.options = { color: options.color || "#1D7BA7", zIndex: options.zIndex || 2147483646, opacity: options.opacity || 0.1, animationDuration: options.animationDuration || 10, glowIntensity: options.glowIntensity || 0.6, pulseSpeed: options.pulseSpeed || 4 };
  }
  public initialize(): void {
    if (this.container) return;
    this.container = document.createElement("div");
    this.container.id = "superwizard-border-effect-container";
    setStyles(this.container, { position: "fixed", top: "0", left: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: `${this.options.zIndex}`, opacity: "0", transition: "opacity 600ms ease-in-out" });
    this.overlay = this.createOverlay();
    this.container.appendChild(this.overlay);
    document.body.appendChild(this.container);
  }
  private createOverlay(): HTMLDivElement {
    const overlay = document.createElement("div");
    overlay.className = "superwizard-overlay";
    const rgb = hexToRgb(this.options.color);
    const { r = 29, g = 123, b = 167 } = rgb || {};
    const { glowIntensity: gi, pulseSpeed: ps } = this.options;
    setStyles(overlay, { position: "absolute", top: "0", left: "0", width: "100%", height: "100%", background: `linear-gradient(to right,rgba(${r},${g},${b},${gi}) 0%,transparent 60px,transparent calc(100% - 60px),rgba(${r},${g},${b},${gi}) 100%),linear-gradient(to bottom,rgba(${r},${g},${b},${gi}) 0%,transparent 60px,transparent calc(100% - 60px),rgba(${r},${g},${b},${gi}) 100%)`, opacity: "1", boxSizing: "border-box", animation: `superwizard-glow-pulse ${ps}s ease-in-out infinite alternate` });
    return overlay;
  }
  public setVisibility(visible: boolean): void { if (!this.container) return; this.container.style.opacity = visible ? "1" : "0"; }
  public setColor(color: string): void {
    if (!this.overlay) return;
    this.options.color = color;
    const rgb = hexToRgb(color);
    const { r = 29, g = 123, b = 167 } = rgb || {};
    const { glowIntensity: gi, pulseSpeed: ps } = this.options;
    setStyles(this.overlay, { background: `linear-gradient(to right,rgba(${r},${g},${b},${gi}) 0%,transparent 60px,transparent calc(100% - 60px),rgba(${r},${g},${b},${gi}) 100%),linear-gradient(to bottom,rgba(${r},${g},${b},${gi}) 0%,transparent 60px,transparent calc(100% - 60px),rgba(${r},${g},${b},${gi}) 100%)` });
  }
  public destroy(): void { if (this.container?.parentNode) { this.container.parentNode.removeChild(this.container); this.container = null; this.overlay = null; } }
}
