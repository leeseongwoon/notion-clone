import type { Page } from "@/types";
import { isFolderPage } from "@/lib/pages";

type PagesMap = Record<string, Page>;

export function collectPageDescendantIds(
  pages: PagesMap,
  pageId: string
): string[] {
  const page = pages[pageId];
  if (!page) return [];
  return page.childIds.flatMap((childId) => [
    childId,
    ...collectPageDescendantIds(pages, childId),
  ]);
}

export function getAllPageIds(
  pages: PagesMap,
  rootPageIds: string[]
): string[] {
  const result: string[] = [];

  function walk(ids: string[]) {
    for (const id of ids) {
      const page = pages[id];
      if (!page) continue;
      result.push(id);
      walk(page.childIds);
    }
  }

  walk(rootPageIds);
  return result;
}

/** 사이드바 드래그 결과: 폴더 안 / 형제 재정렬 / 다른 목록으로 이동 */
export function resolveSidebarPageDrop(
  pages: PagesMap,
  rootPageIds: string[],
  activeId: string,
  overId: string
):
  | { type: "none" }
  | { type: "into-folder"; folderId: string; index: number }
  | { type: "reorder-root"; activeId: string; overId: string }
  | {
      type: "reorder-child";
      parentId: string;
      activeId: string;
      overId: string;
    }
  | { type: "move-to-parent"; parentId: string | null; index: number } {
  const active = pages[activeId];
  const over = pages[overId];
  if (!active || !over || activeId === overId) {
    return { type: "none" };
  }

  if (collectPageDescendantIds(pages, activeId).includes(overId)) {
    return { type: "none" };
  }

  if (isFolderPage(over)) {
    const index = over.childIds.filter((id) => id !== activeId).length;
    return { type: "into-folder", folderId: overId, index };
  }

  const targetParentId = over.parentId;
  const siblings =
    targetParentId === null
      ? rootPageIds
      : pages[targetParentId]?.childIds ?? [];
  const targetIndex = siblings.indexOf(overId);
  if (targetIndex === -1) return { type: "none" };

  if (active.parentId === targetParentId) {
    if (targetParentId === null) {
      return { type: "reorder-root", activeId, overId };
    }
    return { type: "reorder-child", parentId: targetParentId, activeId, overId };
  }

  return { type: "move-to-parent", parentId: targetParentId, index: targetIndex };
}
