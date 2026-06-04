import type { Block } from "@/types";

type BlocksMap = Record<string, Block>;
type RootIds = string[];

export function getSiblingIds(
  blocks: BlocksMap,
  rootIds: RootIds,
  block: Block
): string[] {
  if (block.parentId === null) return rootIds;
  return blocks[block.parentId]?.childIds ?? [];
}

export function collectDescendantBlockIds(
  blocks: BlocksMap,
  blockId: string
): string[] {
  const block = blocks[blockId];
  if (!block) return [];
  return block.childIds.flatMap((cid) => [
    cid,
    ...collectDescendantBlockIds(blocks, cid),
  ]);
}

export function removeFromSiblingList(
  list: string[],
  blockId: string
): string[] {
  return list.filter((id) => id !== blockId);
}

export function insertAfterInList(
  list: string[],
  afterId: string | undefined,
  newId: string
): string[] {
  const next = [...list];
  if (!afterId) {
    next.push(newId);
    return next;
  }
  const idx = next.indexOf(afterId);
  next.splice(idx === -1 ? next.length : idx + 1, 0, newId);
  return next;
}
