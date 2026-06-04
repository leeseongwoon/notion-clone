import type { Block, PersistedState } from "@/types";

export function migratePersistedState(data: PersistedState): PersistedState {
  const blocks: Record<string, Block> = {};

  for (const [id, raw] of Object.entries(data.blocks)) {
    const block = raw as Block & { parentId?: string | null; childIds?: string[] };
    blocks[id] = {
      ...block,
      parentId: block.parentId ?? null,
      childIds: block.childIds ?? [],
    };
  }

  const pages: PersistedState["pages"] = {};
  for (const [id, raw] of Object.entries(data.pages)) {
    const page = raw as PersistedState["pages"][string];
    pages[id] = {
      ...page,
      parentId: page.parentId ?? null,
      childIds: page.childIds ?? [],
    };
  }

  return { ...data, blocks, pages };
}
