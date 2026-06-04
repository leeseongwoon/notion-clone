import type { Block } from "@/types";
import { collectDescendantBlockIds } from "@/lib/blockTree";

export type BlockDropIntent = "reorder" | "nest" | "outdent";

const HORIZONTAL_THRESHOLD = 28;

export function getDragIntent(delta: { x: number; y: number }): BlockDropIntent {
  if (
    Math.abs(delta.x) > Math.abs(delta.y) &&
    Math.abs(delta.x) >= HORIZONTAL_THRESHOLD
  ) {
    return delta.x > 0 ? "nest" : "outdent";
  }
  return "reorder";
}

export function isBlockDescendantOf(
  blocks: Record<string, Block>,
  ancestorId: string,
  blockId: string
): boolean {
  return collectDescendantBlockIds(blocks, ancestorId).includes(blockId);
}
