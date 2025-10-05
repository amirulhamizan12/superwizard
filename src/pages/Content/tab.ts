// ═══════════════════════════════════════════════════════════════════════════
// § FAVICON MANAGER
// ═══════════════════════════════════════════════════════════════════════════
export class FaviconManager {
  private observer: MutationObserver | null = null;
  private customFaviconUrl = '';
  private originalCreateElement: typeof document.createElement | null = null;
  private isIntercepting = false;
  private applyCustomFavicon(): void {
    if (!document || !document.head) {
      if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => this.applyCustomFavicon(), { once: true }); return; }
      return;
    }
    document.querySelectorAll("link[rel*='icon']").forEach(link => { if (link.getAttribute('href') !== this.customFaviconUrl) link.remove(); });
    const existingCustom = document.querySelector(`link[href="${this.customFaviconUrl}"]`);
    if (!existingCustom) {
      const link = document.createElement('link');
      link.type = 'image/x-icon'; link.rel = 'shortcut icon'; link.href = this.customFaviconUrl; link.id = 'superwizard-custom-favicon';
      document.head.insertBefore(link, document.head.firstChild);
      console.log('✅ Superwizard custom favicon applied:', this.customFaviconUrl);
    }
    const favicon = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
    if (favicon && favicon.getAttribute('href') !== this.customFaviconUrl) { (favicon as HTMLLinkElement).href = this.customFaviconUrl; }
    this.startFaviconInterception();
  }
  private startFaviconInterception(): void {
    if (this.isIntercepting || !this.customFaviconUrl) return;
    this.isIntercepting = true;
    if (!this.originalCreateElement) {
      this.originalCreateElement = document.createElement.bind(document);
      const self = this;
      document.createElement = function(tagName: string, options?: any) {
        const element = self.originalCreateElement!.call(document, tagName, options);
        if (tagName.toLowerCase() === 'link') {
          const link = element as HTMLLinkElement;
          const originalSetAttribute = link.setAttribute.bind(link);
          link.setAttribute = function(name: string, value: string) {
            originalSetAttribute(name, value);
            if (name === 'rel' && value.includes('icon') && link.href !== self.customFaviconUrl) { setTimeout(() => { link.href = self.customFaviconUrl; }, 0); }
          };
        }
        return element;
      } as typeof document.createElement;
    }
  }
  private startObserver(): void {
    if (this.observer) return;
    const startObserving = () => {
      if (!document || !document.head) {
        if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', startObserving, { once: true }); return; }
        return;
      }
      this.observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeName === 'LINK') {
                const link = node as HTMLLinkElement;
                if (link.rel && link.rel.includes('icon') && link.href !== this.customFaviconUrl) {
                  console.log('⚠️ Page tried to change favicon, reapplying custom favicon');
                  this.applyCustomFavicon();
                }
              }
            });
          }
          if (mutation.type === 'attributes' && mutation.target.nodeName === 'LINK') {
            const link = mutation.target as HTMLLinkElement;
            if (link.rel && link.rel.includes('icon') && link.href !== this.customFaviconUrl) {
              console.log('⚠️ Favicon link modified, reapplying custom favicon');
              this.applyCustomFavicon();
            }
          }
        }
      });
      this.observer.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'rel'] });
      console.log('🔍 Favicon observer started');
    };
    startObserving();
  }
  private handleVisibilityChange = (): void => { if (document.visibilityState === 'visible') this.applyCustomFavicon(); };
  private setupVisibilityListener(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }
  public changeFavicon(faviconUrl: string): void { this.customFaviconUrl = faviconUrl; this.applyCustomFavicon(); this.startObserver(); this.setupVisibilityListener(); }
  public destroy(): void { if (this.observer) { this.observer.disconnect(); this.observer = null; } document.removeEventListener('visibilitychange', this.handleVisibilityChange); }
}

export const faviconManager = new FaviconManager();
