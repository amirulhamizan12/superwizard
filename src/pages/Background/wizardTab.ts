// ═══════════════════════════════════════════════════════════════════════════
// § WIZARD TAB UTILITY
// ═══════════════════════════════════════════════════════════════════════════
const CUSTOM_FAVICON_URL = chrome.runtime.getURL("icon-128.png");
const DEFAULT_WIZARD_TAB_URL = "https://www.google.com/";
const CHECK_INTERVAL_MS = 100;

// ═══════════════════════════════════════════════════════════════════════════
// § STORAGE HELPERS
// ═══════════════════════════════════════════════════════════════════════════
async function getWizardTabIds(): Promise<number[]> { const { wizardTabIds = [] } = await chrome.storage.local.get(['wizardTabIds']); return wizardTabIds; }
async function setWizardTabIds(ids: number[]): Promise<void> { await chrome.storage.local.set({ wizardTabIds: ids }); }

// ═══════════════════════════════════════════════════════════════════════════
// § WIZARD TAB IDENTIFICATION
// ═══════════════════════════════════════════════════════════════════════════
async function isWizardTab(tabId: number): Promise<boolean> { try { return (await getWizardTabIds()).includes(tabId); } catch { return false; } }
async function addWizardTabId(tabId: number): Promise<void> {
  const ids = await getWizardTabIds();
  if (!ids.includes(tabId)) { ids.push(tabId); await setWizardTabIds(ids); console.log(`Tab ${tabId} added to wizard tabs list. Total: ${ids.length}`); }
}
async function removeWizardTabId(tabId: number): Promise<void> {
  const ids = (await getWizardTabIds()).filter(id => id !== tabId);
  await setWizardTabIds(ids);
  console.log(`Tab ${tabId} removed from wizard tabs list. Remaining: ${ids.length}`);
}
async function findWizardTabInWindow(windowId?: number): Promise<number | null> {
  try {
    const wizardTabIds = await getWizardTabIds();
    if (!wizardTabIds.length) return null;
    const tabs = await chrome.tabs.query(windowId ? { windowId } : {});
    for (const tab of tabs) {
      if (tab.id && wizardTabIds.includes(tab.id)) {
        try { await chrome.tabs.get(tab.id); return tab.id; } catch { await removeWizardTabId(tab.id); }
      }
    }
    return null;
  } catch (error) { console.error("Error finding wizard tab in window:", error); return null; }
}

// ═══════════════════════════════════════════════════════════════════════════
// § FAVICON MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════
const faviconScript = (faviconUrl: string) => {
  const applyFavicon = () => {
    if (!document?.head) return false;
    document.querySelectorAll("link[rel*='icon']").forEach((link: Element) => { if ((link as HTMLLinkElement).href !== faviconUrl) link.remove(); });
    if (!document.querySelector(`link[href="${faviconUrl}"]`)) {
      const link = document.createElement('link');
      link.type = 'image/x-icon'; link.rel = 'shortcut icon'; link.href = faviconUrl; link.id = 'superwizard-custom-favicon';
      document.head.insertBefore(link, document.head.firstChild);
    }
    document.querySelectorAll("link[rel*='icon']").forEach((link: Element) => { (link as HTMLLinkElement).href = faviconUrl; });
    return true;
  };
  if (!applyFavicon()) {
    const observer = new MutationObserver(() => { if (applyFavicon()) observer.disconnect(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => { applyFavicon(); observer.disconnect(); }, { once: true });
    }
  }
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName: string, options?: any) {
    const element = originalCreateElement.call(document, tagName, options);
    if (tagName.toLowerCase() === 'link') {
      const link = element as HTMLLinkElement;
      const originalSetAttribute = link.setAttribute.bind(link);
      link.setAttribute = function(name: string, value: string) {
        originalSetAttribute(name, value);
        if (name === 'rel' && value.includes('icon')) { setTimeout(() => link.href = faviconUrl, 0); }
      };
    }
    return element;
  };
};

async function injectFaviconScript(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({ target: { tabId }, func: faviconScript, args: [CUSTOM_FAVICON_URL], world: 'MAIN' } as any);
}

export async function changeFaviconForTab(tabId: number, faviconUrl: string = CUSTOM_FAVICON_URL, retries: number = 3): Promise<void> {
  try { await chrome.tabs.sendMessage(tabId, { type: "CHANGE_FAVICON", faviconUrl }); }
  catch (error) {
    if (retries > 0) { await new Promise(resolve => setTimeout(resolve, 800)); await changeFaviconForTab(tabId, faviconUrl, retries - 1); }
    else { console.error(`Failed to change favicon for tab ${tabId}:`, error); }
  }
}

export function getDefaultFaviconUrl(): string { return CUSTOM_FAVICON_URL; }

// ═══════════════════════════════════════════════════════════════════════════
// § WINDOW MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════
async function checkAndCloseWindowIfOnlyWizardTab(windowId: number): Promise<boolean> {
  try {
    const tabs = await chrome.tabs.query({ windowId });
    if (!tabs.length) return false;
    const wizardTabIds = await getWizardTabIds();
    const wizardTabs = tabs.filter(tab => tab.id && wizardTabIds.includes(tab.id));
    if (wizardTabs.length === tabs.length && wizardTabs.length > 0) {
      const tabToClose = wizardTabs[0];
      if (tabToClose.id) {
        console.log(` Window ${windowId} only contains wizard tab(s), closing wizard tab ${tabToClose.id}`);
        try { await chrome.tabs.remove(tabToClose.id); await removeWizardTabId(tabToClose.id); console.log(`✅ Closed wizard tab ${tabToClose.id}`); return true; }
        catch (error) { console.error(`Error closing wizard tab ${tabToClose.id}:`, error); }
      }
    }
    return false;
  } catch (error) { console.error(`Error checking window ${windowId}:`, error); return false; }
}

async function checkAllWindowsForSingleWizardTabs(): Promise<void> {
  try {
    const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
    for (const window of windows) { if (window.id) await checkAndCloseWindowIfOnlyWizardTab(window.id); }
  } catch (error) { console.error('Error checking all windows:', error); }
}

let periodicCheckInterval: NodeJS.Timeout | null = null;
function startPeriodicCheck(): void {
  if (periodicCheckInterval) clearInterval(periodicCheckInterval);
  periodicCheckInterval = setInterval(checkAllWindowsForSingleWizardTabs, CHECK_INTERVAL_MS);
  console.log(` Started periodic wizard tab check (every ${CHECK_INTERVAL_MS}ms)`);
}
function stopPeriodicCheck(): void {
  if (periodicCheckInterval) { clearInterval(periodicCheckInterval); periodicCheckInterval = null; console.log(' Stopped periodic wizard tab check'); }
}

// ═══════════════════════════════════════════════════════════════════════════
// § WIZARD TAB CREATION
// ═══════════════════════════════════════════════════════════════════════════
export async function createWizardTab(openSidebar: boolean = true): Promise<number> {
  let windowId: number | undefined;
  try { windowId = (await chrome.windows.getCurrent()).id; }
  catch {
    try {
      const windows = await chrome.windows.getAll();
      windowId = (windows.find(w => w.focused) || windows[0])?.id;
    } catch (error) { console.error("Error getting windows:", error); }
  }
  let existingWizardTabId: number | null = null;
  if (windowId !== undefined) { existingWizardTabId = await findWizardTabInWindow(windowId); }
  if (existingWizardTabId) {
    console.log(`Wizard tab exists in window ${windowId}: ${existingWizardTabId}. Reusing.`);
    if (openSidebar && windowId) {
      try { await (chrome as any).sidePanel.open({ windowId }); console.log(`Sidebar opened for existing wizard tab ${existingWizardTabId}`); }
      catch (error) { console.error("Failed to open sidebar:", error); }
    }
    return existingWizardTabId;
  }
  console.log(`No wizard tab in window ${windowId}, creating new...`);
  const newTab = await chrome.tabs.create({ url: DEFAULT_WIZARD_TAB_URL, active: false });
  if (!newTab.id) throw new Error("Failed to create wizard tab");
  const tabId = newTab.id;
  console.log(`Wizard tab created: ${tabId}, URL: ${DEFAULT_WIZARD_TAB_URL}`);
  try { await chrome.tabs.update(tabId, { pinned: true }); console.log(`Wizard tab ${tabId} pinned`); }
  catch (error) { console.error(`Failed to pin wizard tab ${tabId}:`, error); }
  await addWizardTabId(tabId);
  await chrome.storage.local.set({ wizardTabId: tabId, wizardTabCreatedAt: Date.now() });
  const tryInjectFavicon = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    try { await injectFaviconScript(tabId); console.log(`Favicon script injected for wizard tab ${tabId}`); }
    catch { tryChangeFaviconImmediately(); }
  };
  const tryChangeFaviconImmediately = async () => {
    for (let i = 0; i < 5; i++) {
      try { await changeFaviconForTab(tabId, CUSTOM_FAVICON_URL, 2); console.log(`Favicon changed immediately (attempt ${i + 1})`); break; }
      catch { if (i < 4) await new Promise(resolve => setTimeout(resolve, 200 * (i + 1))); }
    }
  };
  tryInjectFavicon();
  const tabLoadListener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
    if (updatedTabId !== tabId) return;
    if (changeInfo.status === "loading") {
      setTimeout(async () => {
        try { await injectFaviconScript(tabId); await changeFaviconForTab(tabId, CUSTOM_FAVICON_URL, 2); console.log(`Favicon changed during loading for wizard tab ${tabId}`); } catch {}
      }, 50);
    }
    if (changeInfo.status === "complete") {
      setTimeout(async () => {
        await changeFaviconForTab(tabId, CUSTOM_FAVICON_URL, 3);
        console.log(`Favicon changed after completion for wizard tab ${tabId}`);
        if (openSidebar && newTab.windowId) {
          setTimeout(async () => {
            try { await (chrome as any).sidePanel.open({ windowId: newTab.windowId }); console.log(`Sidebar opened for wizard tab ${tabId} (in background)`); }
            catch (error) { console.error("Failed to open sidebar:", error); }
          }, 300);
        }
        chrome.tabs.onUpdated.removeListener(tabLoadListener);
      }, 200);
    }
  };
  chrome.tabs.onUpdated.addListener(tabLoadListener);
  if (newTab.status === "complete") {
    setTimeout(async () => {
      await changeFaviconForTab(tabId, CUSTOM_FAVICON_URL, 3);
      if (openSidebar && newTab.windowId) {
        try { await (chrome as any).sidePanel.open({ windowId: newTab.windowId }); console.log(`Sidebar opened for wizard tab ${tabId} (in background)`); }
        catch (error) { console.error("Failed to open sidebar:", error); }
      }
      chrome.tabs.onUpdated.removeListener(tabLoadListener);
    }, 200);
  }
  return tabId;
}

// ═══════════════════════════════════════════════════════════════════════════
// § NAVIGATION LISTENER SETUP
// ═══════════════════════════════════════════════════════════════════════════
export function setupWizardTabNavigationListener(): void {
  startPeriodicCheck();
  chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    if (await isWizardTab(tabId)) await removeWizardTabId(tabId);
    if (removeInfo.windowId && !removeInfo.isWindowClosing) {
      setTimeout(async () => {
        try { await checkAndCloseWindowIfOnlyWizardTab(removeInfo.windowId!); }
        catch (error) { console.error(`Error checking window ${removeInfo.windowId}:`, error); }
      }, 100);
    }
  });
  chrome.tabs.onUpdated.addListener(async (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo, updatedTab: chrome.tabs.Tab) => {
    if (!(await isWizardTab(updatedTabId))) return;
    if (changeInfo.url || changeInfo.status === "loading") {
      console.log(` Wizard tab ${updatedTabId} navigating to: ${changeInfo.url || updatedTab.url}`);
      setTimeout(async () => {
        try { await injectFaviconScript(updatedTabId); } catch {}
        try { await changeFaviconForTab(updatedTabId, CUSTOM_FAVICON_URL, 2); } catch {}
      }, 100);
    }
    if (changeInfo.status === "complete") {
      console.log(` Wizard tab ${updatedTabId} navigation complete, ensuring custom favicon...`);
      setTimeout(async () => {
        try { await changeFaviconForTab(updatedTabId, CUSTOM_FAVICON_URL, 3); console.log(`✅ Custom favicon applied to wizard tab ${updatedTabId}`); }
        catch {
          setTimeout(async () => {
            try { await changeFaviconForTab(updatedTabId, CUSTOM_FAVICON_URL, 2); }
            catch (error) { console.error(`Failed to apply favicon to wizard tab ${updatedTabId}:`, error); }
          }, 500);
        }
      }, 200);
    }
  });
  const checkWindowAfterDelay = async (windowId: number) => {
    setTimeout(async () => {
      try { await checkAndCloseWindowIfOnlyWizardTab(windowId); }
      catch (error) { console.error(`Error checking window:`, error); }
    }, 100);
  };
  chrome.tabs.onMoved.addListener(async (tabId) => {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.windowId) await checkWindowAfterDelay(tab.windowId);
    } catch {}
  });
  chrome.tabs.onAttached.addListener(async (tabId, attachInfo) => { await checkWindowAfterDelay(attachInfo.newWindowId); });
  chrome.tabs.onDetached.addListener(async (tabId, detachInfo) => { await checkWindowAfterDelay(detachInfo.oldWindowId); });
  chrome.runtime.onSuspend.addListener(() => { console.log('Extension suspending, stopping periodic wizard tab checks'); stopPeriodicCheck(); });
  console.log(" Wizard tab navigation listener initialized");
}

export { isWizardTab };
