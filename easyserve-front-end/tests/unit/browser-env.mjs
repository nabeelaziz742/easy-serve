// Minimal browser globals for the auth modules: one shared localStorage per
// "browser" and one sessionStorage per "tab". switchTab() swaps which tab
// the code under test is running in.
class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

export const browser = {
  localStorage: new MemoryStorage(),
  tabs: new Map(),
};

export const switchTab = (name) => {
  if (!browser.tabs.has(name)) browser.tabs.set(name, new MemoryStorage());
  globalThis.window.sessionStorage = browser.tabs.get(name);
  return globalThis.window.sessionStorage;
};

export const resetBrowser = () => {
  browser.localStorage.clear();
  browser.tabs.clear();
  globalThis.window = {
    localStorage: browser.localStorage,
    sessionStorage: null,
    // RTK Query's setupListeners subscribes to focus/online events.
    addEventListener() {},
    removeEventListener() {},
  };
  switchTab('A');
};

resetBrowser();
