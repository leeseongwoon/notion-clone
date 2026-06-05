import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { Block, BlockType, Page, PersistedState, SaveStatus } from "@/types";
import { EMPTY_IDS } from "@/lib/constants";
import type { BlockDropIntent } from "@/lib/blockDrag";
import { isBlockDescendantOf } from "@/lib/blockDrag";
import {
  collectDescendantBlockIds,
  getSiblingIds,
  insertAfterInList,
  removeFromSiblingList,
} from "@/lib/blockTree";
import {
  applyGridDragDelta,
  BLOCK_INDENT,
  findFreePosition,
  getPlacementBelowBlock,
  initMissingGridPositions,
  resolveNewBlockPosition,
  snapBlockPosition,
} from "@/lib/blockLayout";
import {
  computeIsPageLocked,
  getPageLockRevokeIds,
  getPageLockSourceId,
} from "@/lib/pageLock";
import { hashPagePassword, verifyPagePassword } from "@/lib/pagePassword";
import {
  loadUnlockedPageIds,
  saveUnlockedPageIds,
} from "@/lib/pageUnlockSession";
import { migratePersistedState } from "@/lib/migrateBlocks";
import { resolveSidebarPageDrop } from "@/lib/pageTreeDnD";
import { saveToStorage } from "@/lib/storage";
import { createDefaultState } from "@/lib/initialData";

function persistStoreNow(): void {
  saveToStorage(getPersistedSnapshot(useNotionStore.getState()));
}

function getPersistedSnapshot(state: NotionStore): PersistedState {
  return {
    pages: state.pages,
    blocks: state.blocks,
    blockIdsByPage: state.blockIdsByPage,
    rootPageIds: state.rootPageIds,
    expandedPageIds: state.expandedPageIds,
  };
}

interface NotionStore extends PersistedState {
  hydrated: boolean;
  saveStatus: SaveStatus;
  /** 세션 동안 잠금 해제된 페이지 (localStorage에 저장하지 않음) */
  unlockedPageIds: string[];
  hydrate: (data: PersistedState | null) => void;
  setSaveStatus: (status: SaveStatus) => void;
  createPage: (parentId?: string | null) => string;
  createFolder: (parentId?: string | null) => string;
  updatePageTitle: (pageId: string, title: string) => void;
  isPageLocked: (pageId: string) => boolean;
  unlockPage: (pageId: string, password: string) => Promise<boolean>;
  lockPage: (pageId: string) => void;
  setPagePassword: (pageId: string, password: string | null) => Promise<void>;
  deletePage: (pageId: string) => string | null;
  toggleExpanded: (pageId: string) => void;
  reorderRootPages: (activeId: string, overId: string) => void;
  reorderChildPages: (
    parentId: string,
    activeId: string,
    overId: string
  ) => void;
  movePageToParent: (
    pageId: string,
    newParentId: string | null,
    index: number
  ) => void;
  dragPageInSidebar: (activeId: string, overId: string) => void;
  addBlock: (
    pageId: string,
    options?: {
      afterBlockId?: string;
      type?: BlockType;
      parentId?: string | null;
    }
  ) => string;
  updateBlock: (
    blockId: string,
    updates: Partial<
      Pick<
        Block,
        | "content"
        | "type"
        | "checked"
        | "collapsed"
        | "parentId"
        | "childIds"
        | "backgroundColor"
        | "textColor"
        | "positionX"
        | "positionY"
      >
    >
  ) => void;
  ensureBlockPositions: (pageId: string) => void;
  moveBlockByDelta: (
    blockId: string,
    delta: { x: number; y: number }
  ) => void;
  convertBlockType: (blockId: string, type: BlockType) => void;
  duplicateBlock: (blockId: string) => string;
  deleteBlock: (blockId: string) => string | null;
  indentBlock: (blockId: string) => void;
  outdentBlock: (blockId: string) => void;
  toggleBlockCollapsed: (blockId: string) => void;
  reorderBlocks: (
    pageId: string,
    parentId: string | null,
    activeId: string,
    overId: string
  ) => void;
  dropBlockOnTarget: (
    activeId: string,
    overId: string,
    intent: BlockDropIntent
  ) => void;
  getBlockIds: (pageId: string) => string[];
}

function removeBlockFromParent(
  blocks: Record<string, Block>,
  blockIdsByPage: Record<string, string[]>,
  blockId: string
): { blocks: Record<string, Block>; blockIdsByPage: Record<string, string[]> } {
  const block = blocks[blockId];
  if (!block) return { blocks, blockIdsByPage };

  if (block.parentId === null) {
    return {
      blocks,
      blockIdsByPage: {
        ...blockIdsByPage,
        [block.pageId]: removeFromSiblingList(
          blockIdsByPage[block.pageId] ?? [],
          blockId
        ),
      },
    };
  }

  const parent = blocks[block.parentId];
  if (!parent) return { blocks, blockIdsByPage };

  return {
    blocks: {
      ...blocks,
      [block.parentId]: {
        ...parent,
        childIds: removeFromSiblingList(parent.childIds, blockId),
      },
    },
    blockIdsByPage,
  };
}

function removePageFromTree(
  pages: Record<string, Page>,
  rootPageIds: string[],
  pageId: string
): { pages: Record<string, Page>; rootPageIds: string[] } {
  const page = pages[pageId];
  if (!page) return { pages, rootPageIds };

  const nextPages = { ...pages };
  delete nextPages[pageId];

  if (page.parentId === null) {
    return {
      pages: nextPages,
      rootPageIds: rootPageIds.filter((id) => id !== pageId),
    };
  }

  const parent = nextPages[page.parentId];
  if (parent) {
    nextPages[page.parentId] = {
      ...parent,
      childIds: parent.childIds.filter((id) => id !== pageId),
    };
  }

  return { pages: nextPages, rootPageIds };
}

function collectPageDescendantIds(
  pages: Record<string, Page>,
  pageId: string
): string[] {
  const page = pages[pageId];
  if (!page) return [];
  return page.childIds.flatMap((childId) => [
    childId,
    ...collectPageDescendantIds(pages, childId),
  ]);
}

function deleteBlocksFromState(
  state: NotionStore,
  blockIds: string[]
): Pick<NotionStore, "blocks" | "blockIdsByPage"> {
  const blocks = { ...state.blocks };
  const blockIdsByPage = { ...state.blockIdsByPage };

  for (const id of blockIds) {
    const block = blocks[id];
    if (!block) continue;

    const rootIds = blockIdsByPage[block.pageId] ?? [];
    if (block.parentId === null) {
      blockIdsByPage[block.pageId] = removeFromSiblingList(rootIds, id);
    } else {
      const parent = blocks[block.parentId];
      if (parent) {
        blocks[block.parentId] = {
          ...parent,
          childIds: removeFromSiblingList(parent.childIds, id),
        };
      }
    }
    delete blocks[id];
  }

  return { blocks, blockIdsByPage };
}

export const useNotionStore = create<NotionStore>((set, get) => {
  const defaults = createDefaultState();

  return {
    ...defaults,
    hydrated: false,
    saveStatus: "idle",
    unlockedPageIds: [],

    hydrate: (data) => {
      if (get().hydrated) return;

      const rawUnlocked = loadUnlockedPageIds();
      const unlockedPageIds = data
        ? rawUnlocked.filter((id) => data.pages[id]?.passwordHash)
        : rawUnlocked;
      if (data) {
        const migrated = migratePersistedState(data);
        set({
          ...migrated,
          hydrated: true,
          saveStatus: "saved",
          unlockedPageIds,
        });
      } else {
        set({
          ...createDefaultState(),
          hydrated: true,
          saveStatus: "saved",
          unlockedPageIds,
        });
      }
    },

    setSaveStatus: (saveStatus) => set({ saveStatus }),

    createPage: (parentId = null) => {
      const id = uuidv4();
      const blockId = uuidv4();
      const page: Page = {
        id,
        title: "새 페이지",
        parentId,
        childIds: [],
        icon: "📄",
      };

      const block: Block = {
        id: blockId,
        pageId: id,
        parentId: null,
        childIds: [],
        type: "paragraph",
        content: "",
      };

      set((state) => {
        const pages = { ...state.pages, [id]: page };
        let rootPageIds = [...state.rootPageIds];
        let expandedPageIds = [...state.expandedPageIds];

        if (parentId && pages[parentId]) {
          pages[parentId] = {
            ...pages[parentId],
            childIds: [...pages[parentId].childIds, id],
          };
          if (!expandedPageIds.includes(parentId)) {
            expandedPageIds = [...expandedPageIds, parentId];
          }
        } else {
          rootPageIds = [...rootPageIds, id];
        }

        return {
          pages,
          rootPageIds,
          expandedPageIds,
          blocks: { ...state.blocks, [blockId]: block },
          blockIdsByPage: { ...state.blockIdsByPage, [id]: [blockId] },
        };
      });

      persistStoreNow();
      return id;
    },

    createFolder: (parentId = null) => {
      const id = uuidv4();
      const page: Page = {
        id,
        title: "새 폴더",
        parentId,
        childIds: [],
        icon: "📁",
        isFolder: true,
      };

      set((state) => {
        const pages = { ...state.pages, [id]: page };
        let rootPageIds = [...state.rootPageIds];
        let expandedPageIds = [...state.expandedPageIds];

        if (parentId && pages[parentId]) {
          pages[parentId] = {
            ...pages[parentId],
            childIds: [...pages[parentId].childIds, id],
          };
          if (!expandedPageIds.includes(parentId)) {
            expandedPageIds = [...expandedPageIds, parentId];
          }
        } else {
          rootPageIds = [...rootPageIds, id];
        }

        if (!expandedPageIds.includes(id)) {
          expandedPageIds = [...expandedPageIds, id];
        }

        return {
          pages,
          rootPageIds,
          expandedPageIds,
          blockIdsByPage: { ...state.blockIdsByPage, [id]: [] },
        };
      });

      persistStoreNow();
      return id;
    },

    updatePageTitle: (pageId, title) => {
      set((state) => {
        const page = state.pages[pageId];
        if (!page) return state;
        return {
          pages: { ...state.pages, [pageId]: { ...page, title } },
        };
      });
    },

    isPageLocked: (pageId) => {
      const state = get();
      return computeIsPageLocked(state.pages, state.unlockedPageIds, pageId);
    },

    unlockPage: async (pageId, password) => {
      const state = get();
      const lockSourceId = getPageLockSourceId(state.pages, pageId);
      if (!lockSourceId) return true;

      const lockSource = state.pages[lockSourceId];
      if (!lockSource?.passwordHash) return true;

      const ok = await verifyPagePassword(password, lockSource.passwordHash);
      if (!ok) return false;

      set((current) => {
        const unlockedPageIds = current.unlockedPageIds.includes(lockSourceId)
          ? current.unlockedPageIds
          : [...current.unlockedPageIds, lockSourceId];
        saveUnlockedPageIds(unlockedPageIds);
        return { unlockedPageIds };
      });
      return true;
    },

    lockPage: (pageId) => {
      set((state) => {
        const revokeIds = new Set(getPageLockRevokeIds(state.pages, pageId));
        const unlockedPageIds = state.unlockedPageIds.filter(
          (id) => !revokeIds.has(id)
        );
        saveUnlockedPageIds(unlockedPageIds);
        return { unlockedPageIds };
      });
    },

    setPagePassword: async (pageId, password) => {
      if (password === null) {
        set((state) => {
          const page = state.pages[pageId];
          if (!page) return state;
          const { passwordHash: _removed, ...rest } = page;
          const revokeIds = new Set(getPageLockRevokeIds(state.pages, pageId));
          const unlockedPageIds = state.unlockedPageIds.filter(
            (id) => !revokeIds.has(id)
          );
          saveUnlockedPageIds(unlockedPageIds);
          return {
            pages: { ...state.pages, [pageId]: rest },
            unlockedPageIds,
          };
        });
        return;
      }

      const passwordHash = await hashPagePassword(password);
      set((state) => {
        const page = state.pages[pageId];
        if (!page) return state;
        const revokeIds = new Set(getPageLockRevokeIds(state.pages, pageId));
        const unlockedPageIds = state.unlockedPageIds.filter(
          (id) => !revokeIds.has(id)
        );
        saveUnlockedPageIds(unlockedPageIds);
        return {
          pages: {
            ...state.pages,
            [pageId]: { ...page, passwordHash },
          },
          unlockedPageIds,
        };
      });
    },

    deletePage: (pageId) => {
      const state = get();
      const allIds = [pageId, ...collectPageDescendantIds(state.pages, pageId)];
      const { pages, rootPageIds } = removePageFromTree(
        state.pages,
        state.rootPageIds,
        pageId
      );

      let next = { ...state, pages, rootPageIds };
      for (const id of allIds) {
        const blockIds = next.blockIdsByPage[id] ?? [];
        const toDelete = blockIds.flatMap((bid) =>
          [bid, ...collectDescendantBlockIds(next.blocks, bid)]
        );
        next = { ...next, ...deleteBlocksFromState(next, toDelete) };
        const { [id]: _, ...restPages } = next.blockIdsByPage;
        next.blockIdsByPage = restPages;
      }

      const fallback =
        rootPageIds[0] ??
        Object.keys(pages).find((id) => pages[id].parentId === null) ??
        null;

      const unlockedPageIds = state.unlockedPageIds.filter(
        (id) => !allIds.includes(id)
      );
      saveUnlockedPageIds(unlockedPageIds);

      set({
        ...next,
        unlockedPageIds,
        expandedPageIds: state.expandedPageIds.filter(
          (id) => !allIds.includes(id)
        ),
      });

      return fallback;
    },

    toggleExpanded: (pageId) => {
      set((state) => {
        const expanded = state.expandedPageIds.includes(pageId);
        return {
          expandedPageIds: expanded
            ? state.expandedPageIds.filter((id) => id !== pageId)
            : [...state.expandedPageIds, pageId],
        };
      });
    },

    reorderRootPages: (activeId, overId) => {
      if (activeId === overId) return;
      set((state) => {
        const ids = [...state.rootPageIds];
        const oldIndex = ids.indexOf(activeId);
        const newIndex = ids.indexOf(overId);
        if (oldIndex === -1 || newIndex === -1) return state;
        ids.splice(oldIndex, 1);
        ids.splice(newIndex, 0, activeId);
        return { rootPageIds: ids };
      });
    },

    reorderChildPages: (parentId, activeId, overId) => {
      if (activeId === overId) return;
      set((state) => {
        const parent = state.pages[parentId];
        if (!parent) return state;
        const ids = [...parent.childIds];
        const oldIndex = ids.indexOf(activeId);
        const newIndex = ids.indexOf(overId);
        if (oldIndex === -1 || newIndex === -1) return state;
        ids.splice(oldIndex, 1);
        ids.splice(newIndex, 0, activeId);
        return {
          pages: {
            ...state.pages,
            [parentId]: { ...parent, childIds: ids },
          },
        };
      });
    },

    movePageToParent: (pageId, newParentId, index) => {
      set((state) => {
        const page = state.pages[pageId];
        if (!page || pageId === newParentId) return state;

        let pages = { ...state.pages };
        let rootPageIds = [...state.rootPageIds];

        if (page.parentId === null) {
          rootPageIds = rootPageIds.filter((id) => id !== pageId);
        } else {
          const oldParent = pages[page.parentId];
          if (oldParent) {
            pages[page.parentId] = {
              ...oldParent,
              childIds: oldParent.childIds.filter((id) => id !== pageId),
            };
          }
        }

        const updated: Page = { ...page, parentId: newParentId };

        if (newParentId === null) {
          rootPageIds = [...rootPageIds];
          rootPageIds.splice(Math.min(index, rootPageIds.length), 0, pageId);
        } else {
          const parent = pages[newParentId];
          if (!parent) return state;
          const childIds = parent.childIds.filter((id) => id !== pageId);
          childIds.splice(Math.min(index, childIds.length), 0, pageId);
          pages[newParentId] = { ...parent, childIds };
          if (!state.expandedPageIds.includes(newParentId)) {
            return {
              pages: { ...pages, [pageId]: updated },
              rootPageIds,
              expandedPageIds: [...state.expandedPageIds, newParentId],
            };
          }
        }

        pages[pageId] = updated;
        return { pages, rootPageIds };
      });
      persistStoreNow();
    },

    dragPageInSidebar: (activeId, overId) => {
      const state = get();
      const action = resolveSidebarPageDrop(
        state.pages,
        state.rootPageIds,
        activeId,
        overId
      );

      switch (action.type) {
        case "into-folder":
          get().movePageToParent(activeId, action.folderId, action.index);
          break;
        case "reorder-root":
          get().reorderRootPages(action.activeId, action.overId);
          persistStoreNow();
          break;
        case "reorder-child":
          get().reorderChildPages(
            action.parentId,
            action.activeId,
            action.overId
          );
          persistStoreNow();
          break;
        case "move-to-parent":
          get().movePageToParent(
            activeId,
            action.parentId,
            action.index
          );
          break;
        default:
          break;
      }
    },

    addBlock: (pageId, options = {}) => {
      const { afterBlockId, type = "paragraph", parentId: explicitParent } =
        options;
      const id = uuidv4();
      const state = get();
      const refBlock = afterBlockId ? state.blocks[afterBlockId] : null;
      const parentId =
        explicitParent !== undefined
          ? explicitParent
          : refBlock
            ? refBlock.parentId
            : null;

      const rootIds = state.blockIdsByPage[pageId] ?? [];
      const pos = resolveNewBlockPosition(
        state.blocks,
        pageId,
        rootIds,
        refBlock,
        parentId
      );
      const snapped = snapBlockPosition(pos.x, pos.y);

      const block: Block = {
        id,
        pageId,
        parentId,
        childIds: [],
        type,
        content: "",
        positionX: snapped.x,
        positionY: snapped.y,
        ...(type === "todo" ? { checked: false } : {}),
        ...(type === "toggle" ? { collapsed: false } : {}),
      };

      set((s) => {
        const blocks = { ...s.blocks, [id]: block };
        let blockIdsByPage = { ...s.blockIdsByPage };

        if (parentId === null) {
          const rootIds = blockIdsByPage[pageId] ?? [];
          blockIdsByPage[pageId] = insertAfterInList(
            rootIds,
            afterBlockId,
            id
          );
        } else {
          const parent = blocks[parentId];
          if (parent) {
            blocks[parentId] = {
              ...parent,
              childIds: insertAfterInList(
                parent.childIds,
                afterBlockId,
                id
              ),
            };
          }
        }

        return { blocks, blockIdsByPage };
      });

      return id;
    },

    updateBlock: (blockId, updates) => {
      set((state) => {
        const block = state.blocks[blockId];
        if (!block) return state;
        return {
          blocks: { ...state.blocks, [blockId]: { ...block, ...updates } },
        };
      });
    },

    ensureBlockPositions: (pageId) => {
      set((state) => {
        const rootIds = state.blockIdsByPage[pageId] ?? [];
        const blocks = initMissingGridPositions(
          state.blocks,
          pageId,
          rootIds
        );
        return { blocks };
      });
    },

    moveBlockByDelta: (blockId, delta) => {
      if (delta.x === 0 && delta.y === 0) return;

      set((state) => {
        const block = state.blocks[blockId];
        if (!block) return state;

        const rootIds = state.blockIdsByPage[block.pageId] ?? [];
        const blocks = applyGridDragDelta(
          state.blocks,
          blockId,
          delta,
          rootIds
        );

        return { blocks };
      });
    },

    convertBlockType: (blockId, type) => {
      set((state) => {
        const block = state.blocks[blockId];
        if (!block) return state;
        const next: Block = {
          ...block,
          type,
          content: type === "divider" ? "" : block.content,
          checked: type === "todo" ? block.checked ?? false : undefined,
          collapsed: type === "toggle" ? block.collapsed ?? false : undefined,
        };
        return { blocks: { ...state.blocks, [blockId]: next } };
      });
    },

    duplicateBlock: (blockId) => {
      const state = get();
      const source = state.blocks[blockId];
      if (!source) return blockId;

      const id = uuidv4();
      const below = getPlacementBelowBlock(source);
      const copy: Block = {
        ...source,
        id,
        childIds: [],
        parentId: source.parentId,
        positionX: below.x,
        positionY: below.y,
      };

      set((s) => {
        const rootIds = s.blockIdsByPage[source.pageId] ?? [];
        const free = findFreePosition(
          s.blocks,
          source.pageId,
          rootIds,
          below,
          [id]
        );
        const snapped = snapBlockPosition(free.x, free.y);
        let blocks = {
          ...s.blocks,
          [id]: { ...copy, positionX: snapped.x, positionY: snapped.y },
        };
        let blockIdsByPage = { ...s.blockIdsByPage };

        if (source.parentId === null) {
          const rootIds = blockIdsByPage[source.pageId] ?? [];
          blockIdsByPage[source.pageId] = insertAfterInList(
            rootIds,
            blockId,
            id
          );
        } else {
          const parent = blocks[source.parentId];
          if (parent) {
            blocks[source.parentId] = {
              ...parent,
              childIds: insertAfterInList(parent.childIds, blockId, id),
            };
          }
        }

        return { blocks, blockIdsByPage };
      });

      return id;
    },

    deleteBlock: (blockId) => {
      const state = get();
      const block = state.blocks[blockId];
      if (!block) return null;

      const toDelete = [
        blockId,
        ...collectDescendantBlockIds(state.blocks, blockId),
      ];
      const rootIds = state.blockIdsByPage[block.pageId] ?? [];
      const siblings = getSiblingIds(state.blocks, rootIds, block);
      const idx = siblings.indexOf(blockId);
      const focusId = siblings[Math.max(0, idx - 1)] ?? null;

      const next = deleteBlocksFromState(state, toDelete);

      set(next);

      const remaining = get().blockIdsByPage[block.pageId] ?? [];
      if (remaining.length === 0) {
        const newId = get().addBlock(block.pageId);
        return newId;
      }

      if (focusId && get().blocks[focusId]) return focusId;
      return remaining[0] ?? null;
    },

    indentBlock: (blockId) => {
      set((state) => {
        const block = state.blocks[blockId];
        if (!block) return state;

        const rootIds = state.blockIdsByPage[block.pageId] ?? [];
        const siblings = getSiblingIds(state.blocks, rootIds, block);
        const idx = siblings.indexOf(blockId);
        if (idx <= 0) return state;

        const prevId = siblings[idx - 1];
        const prev = state.blocks[prevId];
        if (!prev) return state;

        let blocks = { ...state.blocks };
        let blockIdsByPage = { ...state.blockIdsByPage };

        if (block.parentId === null) {
          blockIdsByPage[block.pageId] = removeFromSiblingList(
            rootIds,
            blockId
          );
        } else {
          const parent = blocks[block.parentId];
          if (parent) {
            blocks[block.parentId] = {
              ...parent,
              childIds: removeFromSiblingList(parent.childIds, blockId),
            };
          }
        }

        blocks[prevId] = {
          ...prev,
          childIds: [...prev.childIds, blockId],
        };
        const snapped = snapBlockPosition(
          (block.positionX ?? 0) + BLOCK_INDENT,
          block.positionY ?? 0
        );
        blocks[blockId] = {
          ...block,
          parentId: prevId,
          positionX: snapped.x,
          positionY: snapped.y,
        };

        return { blocks, blockIdsByPage };
      });
    },

    outdentBlock: (blockId) => {
      set((state) => {
        const block = state.blocks[blockId];
        if (!block || block.parentId === null) return state;

        const parent = state.blocks[block.parentId];
        if (!parent) return state;

        let blocks = { ...state.blocks };
        let blockIdsByPage = { ...state.blockIdsByPage };
        const rootIds = blockIdsByPage[block.pageId] ?? [];

        blocks[block.parentId] = {
          ...parent,
          childIds: removeFromSiblingList(parent.childIds, blockId),
        };

        const newParentId = parent.parentId;
        const snapped = snapBlockPosition(
          Math.max(0, (block.positionX ?? 0) - BLOCK_INDENT),
          block.positionY ?? 0
        );
        blocks[blockId] = {
          ...block,
          parentId: newParentId,
          positionX: snapped.x,
          positionY: snapped.y,
        };

        if (newParentId === null) {
          const parentIdx = rootIds.indexOf(parent.id);
          const nextRoot = [...rootIds];
          nextRoot.splice(parentIdx + 1, 0, blockId);
          blockIdsByPage[block.pageId] = nextRoot;
        } else {
          const grandparent = blocks[newParentId];
          if (grandparent) {
            const gpChildren = [...grandparent.childIds];
            const parentIdx = gpChildren.indexOf(parent.id);
            gpChildren.splice(parentIdx + 1, 0, blockId);
            blocks[newParentId] = { ...grandparent, childIds: gpChildren };
          }
        }

        return { blocks, blockIdsByPage };
      });
    },

    toggleBlockCollapsed: (blockId) => {
      set((state) => {
        const block = state.blocks[blockId];
        if (!block || block.type !== "toggle") return state;
        return {
          blocks: {
            ...state.blocks,
            [blockId]: { ...block, collapsed: !block.collapsed },
          },
        };
      });
    },

    reorderBlocks: (pageId, parentId, activeId, overId) => {
      if (activeId === overId) return;
      set((state) => {
        let blocks = { ...state.blocks };
        let blockIdsByPage = { ...state.blockIdsByPage };

        const getList = (): string[] =>
          parentId === null
            ? blockIdsByPage[pageId] ?? []
            : blocks[parentId]?.childIds ?? [];

        const ids = [...getList()];
        const oldIndex = ids.indexOf(activeId);
        const newIndex = ids.indexOf(overId);
        if (oldIndex === -1 || newIndex === -1) return state;

        ids.splice(oldIndex, 1);
        ids.splice(newIndex, 0, activeId);

        if (parentId === null) {
          blockIdsByPage[pageId] = ids;
        } else {
          const parent = blocks[parentId];
          if (parent) blocks[parentId] = { ...parent, childIds: ids };
        }

        return { blocks, blockIdsByPage };
      });
    },

    dropBlockOnTarget: (activeId, overId, intent) => {
      if (activeId === overId) return;

      set((state) => {
        const active = state.blocks[activeId];
        const over = state.blocks[overId];
        if (!active || !over || active.pageId !== over.pageId) return state;

        if (intent === "outdent") {
          if (active.parentId === null) return state;
          const parent = state.blocks[active.parentId];
          if (!parent) return state;

          let blocks = { ...state.blocks };
          let blockIdsByPage = { ...state.blockIdsByPage };
          const rootIds = blockIdsByPage[active.pageId] ?? [];

          blocks[active.parentId] = {
            ...parent,
            childIds: removeFromSiblingList(parent.childIds, activeId),
          };

          const newParentId = parent.parentId;
          blocks[activeId] = { ...active, parentId: newParentId };

          if (newParentId === null) {
            const parentIdx = rootIds.indexOf(parent.id);
            const nextRoot = [...rootIds];
            nextRoot.splice(parentIdx + 1, 0, activeId);
            blockIdsByPage[active.pageId] = nextRoot;
          } else {
            const grandparent = blocks[newParentId];
            if (grandparent) {
              const gpChildren = [...grandparent.childIds];
              const parentIdx = gpChildren.indexOf(parent.id);
              gpChildren.splice(parentIdx + 1, 0, activeId);
              blocks[newParentId] = { ...grandparent, childIds: gpChildren };
            }
          }

          return { blocks, blockIdsByPage };
        }

        if (intent === "nest") {
          if (isBlockDescendantOf(state.blocks, activeId, overId)) return state;

          let blocks = { ...state.blocks };
          let blockIdsByPage = { ...state.blockIdsByPage };

          const removed = removeBlockFromParent(blocks, blockIdsByPage, activeId);
          blocks = removed.blocks;
          blockIdsByPage = removed.blockIdsByPage;

          const target = blocks[overId];
          if (!target) return state;

          blocks[overId] = {
            ...target,
            childIds: [...target.childIds, activeId],
          };
          blocks[activeId] = { ...active, parentId: overId };

          return { blocks, blockIdsByPage };
        }

        // reorder: over와 같은 형제 목록에 놓기 (다른 깊이에서도 가능)
        let blocks = { ...state.blocks };
        let blockIdsByPage = { ...state.blockIdsByPage };

        const removed = removeBlockFromParent(blocks, blockIdsByPage, activeId);
        blocks = removed.blocks;
        blockIdsByPage = removed.blockIdsByPage;

        const targetParentId = over.parentId;
        const list =
          targetParentId === null
            ? [...(blockIdsByPage[over.pageId] ?? [])]
            : [...(blocks[targetParentId]?.childIds ?? [])];

        const insertAt = list.indexOf(overId);
        if (insertAt === -1) return state;

        list.splice(insertAt, 0, activeId);
        blocks[activeId] = { ...active, parentId: targetParentId };

        if (targetParentId === null) {
          blockIdsByPage[over.pageId] = list;
        } else {
          const parent = blocks[targetParentId];
          if (parent) {
            blocks[targetParentId] = { ...parent, childIds: list };
          }
        }

        return { blocks, blockIdsByPage };
      });
    },

    getBlockIds: (pageId) => get().blockIdsByPage[pageId] ?? EMPTY_IDS,
  };
});

export function getSnapshotForSave(): PersistedState {
  return getPersistedSnapshot(useNotionStore.getState());
}
