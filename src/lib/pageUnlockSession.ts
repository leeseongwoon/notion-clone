const UNLOCK_KEY = "notion-clone-unlocked-pages";

export function loadUnlockedPageIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(UNLOCK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function saveUnlockedPageIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(UNLOCK_KEY, JSON.stringify(ids));
}

export function addUnlockedPageId(pageId: string): string[] {
  const ids = loadUnlockedPageIds();
  if (ids.includes(pageId)) return ids;
  const next = [...ids, pageId];
  saveUnlockedPageIds(next);
  return next;
}

export function removeUnlockedPageId(pageId: string): string[] {
  const next = loadUnlockedPageIds().filter((id) => id !== pageId);
  saveUnlockedPageIds(next);
  return next;
}
