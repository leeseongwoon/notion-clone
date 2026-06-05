import type { Page } from "@/types";
import { collectPageDescendantIds } from "@/lib/pageTreeDnD";

type PagesMap = Record<string, Page>;

export function computeIsPageLocked(
  pages: PagesMap,
  unlockedPageIds: string[],
  pageId: string
): boolean {
  const lockSourceId = getPageLockSourceId(pages, pageId);
  if (!lockSourceId) return false;
  return !unlockedPageIds.includes(lockSourceId);
}

/** 폴더 잠금 시 세션에서 제거할 페이지 ID (폴더 + 하위 전체) */
export function getPageLockRevokeIds(
  pages: PagesMap,
  pageId: string
): string[] {
  const page = pages[pageId];
  if (!page) return [pageId];

  const ids = new Set<string>([pageId]);
  if (page.isFolder) {
    for (const descendantId of collectPageDescendantIds(pages, pageId)) {
      ids.add(descendantId);
    }
  }
  return [...ids];
}

/** 비밀번호로 잠금을 거는 실제 페이지(본인 또는 가장 가까운 상위 폴더) */
export function getPageLockSourceId(
  pages: PagesMap,
  pageId: string
): string | null {
  for (
    let id: string | null = pageId;
    id;
    id = pages[id]?.parentId ?? null
  ) {
    const page: Page | undefined = pages[id];
    if (!page) return null;
    if (page.passwordHash) return id;
  }

  return null;
}

export function isPageLockInherited(
  pages: PagesMap,
  pageId: string
): boolean {
  const sourceId = getPageLockSourceId(pages, pageId);
  return sourceId !== null && sourceId !== pageId;
}

export function isPagePasswordProtected(
  pages: PagesMap,
  pageId: string
): boolean {
  return getPageLockSourceId(pages, pageId) !== null;
}

export interface PageSecurityBadge {
  emoji: string;
  label: string;
  title: string;
  locked: boolean;
}

/** 보안 설정 여부와 현재 잠금 상태에 따른 표시 이모지 */
export function getPageSecurityBadge(
  pages: PagesMap,
  unlockedPageIds: string[],
  pageId: string
): PageSecurityBadge | null {
  if (!isPagePasswordProtected(pages, pageId)) return null;

  const locked = computeIsPageLocked(pages, unlockedPageIds, pageId);
  const inherited = isPageLockInherited(pages, pageId);

  if (locked) {
    return {
      emoji: "🔒",
      label: "잠김",
      title: inherited
        ? "상위 폴더 비밀번호 보호 (잠김)"
        : "비밀번호 보호 (잠김)",
      locked: true,
    };
  }

  return {
    emoji: "🔓",
    label: "열림",
    title: inherited
      ? "상위 폴더 보안 (이 탭에서 잠금 해제됨)"
      : "비밀번호 설정됨 (이 탭에서 잠금 해제됨)",
    locked: false,
  };
}
