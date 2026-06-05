export const SIDEBAR_WIDTH_MIN = 200;
export const SIDEBAR_WIDTH_MAX = 420;
export const SIDEBAR_WIDTH_DEFAULT = 260;

const STORAGE_KEY = "notion-clone-sidebar";

export interface SidebarPrefs {
  width: number;
  collapsed: boolean;
}

export function clampSidebarWidth(width: number): number {
  return Math.max(
    SIDEBAR_WIDTH_MIN,
    Math.min(SIDEBAR_WIDTH_MAX, Math.round(width))
  );
}

export function loadSidebarPrefs(): SidebarPrefs {
  if (typeof window === "undefined") {
    return { width: SIDEBAR_WIDTH_DEFAULT, collapsed: false };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { width: SIDEBAR_WIDTH_DEFAULT, collapsed: false };
    const parsed = JSON.parse(raw) as Partial<SidebarPrefs>;
    return {
      width: clampSidebarWidth(parsed.width ?? SIDEBAR_WIDTH_DEFAULT),
      collapsed: !!parsed.collapsed,
    };
  } catch {
    return { width: SIDEBAR_WIDTH_DEFAULT, collapsed: false };
  }
}

export function saveSidebarPrefs(prefs: SidebarPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
