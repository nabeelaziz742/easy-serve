// The dine-in table session lives in Redux while the guest browses and in
// localStorage so a refresh (or opening "My Orders") keeps it. Its token is
// what lets a guest order and pay without an account.

export const DINE_IN_STORAGE_KEY = "easyserve:dine-in-context";

export const readSavedDineIn = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DINE_IN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

export const getDineInToken = (state) => {
  const saved = readSavedDineIn();
  return (
    state?.dineIn?.sessionToken ||
    state?.dineIn?.session?.token ||
    saved?.sessionToken ||
    saved?.session?.token ||
    null
  );
};

export const clearSavedDineIn = () => {
  try {
    window.localStorage.removeItem(DINE_IN_STORAGE_KEY);
  } catch (_) {
    // Storage can be unavailable (private mode); nothing to clear then.
  }
};