import type { Page, PersistedState } from "@/types";

export function isFolderPage(page: Page | undefined): boolean {
  return !!page?.isFolder;
}

export function getPageDisplayIcon(page: Page): string {
  if (page.isFolder) return page.icon || "📁";
  return page.icon || "📄";
}

/** URL·로고용 — 존재하는 첫 루트 페이지 */
export function getDefaultPageId(
  pages: Record<string, Page>,
  rootPageIds: string[]
): string | null {
  for (const id of rootPageIds) {
    if (pages[id]) return id;
  }
  const roots = Object.values(pages).filter((p) => p.parentId === null);
  return roots[0]?.id ?? Object.keys(pages)[0] ?? null;
}

/** localStorage 데이터 정합성 복구 */
export function sanitizePersistedState(data: PersistedState): PersistedState {
  const pages: Record<string, Page> = {};

  for (const [id, raw] of Object.entries(data.pages)) {
    if (!raw) continue;
    pages[id] = {
      ...raw,
      parentId: raw.parentId ?? null,
      childIds: (raw.childIds ?? []).filter((cid) => data.pages[cid]),
    };
  }

  let rootPageIds = (data.rootPageIds ?? []).filter((id) => pages[id]);

  if (rootPageIds.length === 0) {
    rootPageIds = Object.values(pages)
      .filter((p) => p.parentId === null)
      .map((p) => p.id);
  }

  const blockIdsByPage: Record<string, string[]> = {};
  for (const [pageId, ids] of Object.entries(data.blockIdsByPage ?? {})) {
    if (!pages[pageId]) continue;
    blockIdsByPage[pageId] = (ids ?? []).filter((bid) => data.blocks[bid]);
  }

  for (const pageId of Object.keys(pages)) {
    if (!blockIdsByPage[pageId]) {
      blockIdsByPage[pageId] = [];
    }
  }

  return {
    ...data,
    pages,
    rootPageIds,
    blockIdsByPage,
  };
}
