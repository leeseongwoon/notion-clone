import type { PersistedState } from "@/types";

export const STORAGE_KEY = "notion-clone-data";

export function loadFromStorage(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

export function saveToStorage(state: PersistedState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
