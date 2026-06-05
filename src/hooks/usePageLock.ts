import { useShallow } from "zustand/react/shallow";
import {
  computeIsPageLocked,
  getPageLockSourceId,
  getPageSecurityBadge,
  type PageSecurityBadge,
} from "@/lib/pageLock";
import { useNotionStore } from "@/store/useNotionStore";

export function useIsPageLocked(pageId: string): boolean {
  return useNotionStore((s) =>
    computeIsPageLocked(s.pages, s.unlockedPageIds, pageId)
  );
}

export function usePageLockSourceId(pageId: string): string | null {
  return useNotionStore((s) => getPageLockSourceId(s.pages, pageId));
}

export function usePageSecurityBadge(pageId: string): PageSecurityBadge | null {
  return useNotionStore(
    useShallow((s) =>
      getPageSecurityBadge(s.pages, s.unlockedPageIds, pageId)
    )
  );
}
