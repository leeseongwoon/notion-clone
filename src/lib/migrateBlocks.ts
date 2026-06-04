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

  return { ...data, blocks };
}
