import type { Block, BlockType } from "@/types";
import {
  collectDescendantBlockIds,
  getSiblingIds,
} from "@/lib/blockTree";

export const BLOCK_ROW_HEIGHT = 40;
export const BLOCK_INDENT = 28;
/** 최대 들여쓰기 열 (0 ~ 8) */
export const MAX_BLOCK_INDENT_COLUMNS = 8;
/** 캔버스 점 그리드 · Y 스냅 간격 */
export const BLOCK_GRID_SIZE = 28;
export const BLOCK_MIN_WIDTH = 280;
export const BLOCK_DEFAULT_WIDTH = 520;
/** 블록 사이 시각적 행간 (px) — 모든 블록 동일 */
export const BLOCK_ROW_GAP = 12;
/** 겹침 판정·밀어내기 최소 간격 */
export const BLOCK_COLLISION_GAP = BLOCK_ROW_GAP;
/** 겹침 해소 시 추가 여유 (px) */
export const BLOCK_COLLISION_BUFFER = 4;
export const BLOCK_MAX_RESOLVE_ITER = 120;

type BlocksMap = Record<string, Block>;

export interface BlockBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type BlockLayoutHeights = Record<string, number>;

/**
 * 캔버스 절대 배치용 슬롯 높이 — CSS 실제 높이(패딩·아이콘·제목)와 맞춤
 */
export function getBlockCollisionHeight(block: Block): number {
  const heights: Record<BlockType, number> = {
    heading1: 88,
    heading2: 76,
    heading3: 68,
    code: 84,
    callout: 96,
    divider: 44,
    quote: 64,
    paragraph: 60,
    bullet: 60,
    numbered: 60,
    todo: 60,
    toggle: 60,
  };
  return heights[block.type] ?? 60;
}

/** DOM 측정값 우선, 없으면 타입별 최소 높이 */
export function getBlockLayoutHeight(
  block: Block,
  layoutHeights?: BlockLayoutHeights
): number {
  const measured = layoutHeights?.[block.id];
  if (measured != null && measured > 0) {
    return Math.ceil(measured);
  }
  return getBlockCollisionHeight(block);
}

export function getBlockStackOffset(
  block: Block,
  layoutHeights?: BlockLayoutHeights
): number {
  return getBlockLayoutHeight(block, layoutHeights) + BLOCK_ROW_GAP;
}

export function getBlockBounds(
  block: Block,
  layoutHeights?: BlockLayoutHeights
): BlockBounds {
  return {
    x: block.positionX ?? 0,
    y: block.positionY ?? 0,
    width: BLOCK_DEFAULT_WIDTH,
    height: getBlockLayoutHeight(block, layoutHeights),
  };
}

export function boundsOverlap(a: BlockBounds, b: BlockBounds, gap = BLOCK_COLLISION_GAP): boolean {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  );
}

export function blocksOverlap(
  blocks: BlocksMap,
  idA: string,
  idB: string,
  gap = BLOCK_COLLISION_GAP,
  layoutHeights?: BlockLayoutHeights
): boolean {
  const a = blocks[idA];
  const b = blocks[idB];
  if (!a || !b) return false;
  return boundsOverlap(
    getBlockBounds(a, layoutHeights),
    getBlockBounds(b, layoutHeights),
    gap
  );
}

export function getBlockDepth(blocks: BlocksMap, blockId: string): number {
  let depth = 0;
  let current = blocks[blockId];
  while (current?.parentId) {
    depth++;
    current = blocks[current.parentId];
  }
  return depth;
}

/** 들여쓰기 단계에 맞춘 왼쪽 정렬 X */
export function getAlignedX(blocks: BlocksMap, blockId: string): number {
  return getBlockDepth(blocks, blockId) * BLOCK_INDENT;
}

export function snapXToIndentGrid(x: number): number {
  const maxX = MAX_BLOCK_INDENT_COLUMNS * BLOCK_INDENT;
  const snapped = Math.round(x / BLOCK_INDENT) * BLOCK_INDENT;
  return Math.max(0, Math.min(maxX, snapped));
}

export function snapYToGrid(y: number): number {
  return Math.max(0, Math.round(y / BLOCK_GRID_SIZE) * BLOCK_GRID_SIZE);
}

/** 자유 그리드 X 스냅 (28px) */
export function snapXToGrid(x: number): number {
  return Math.max(0, Math.round(x / BLOCK_GRID_SIZE) * BLOCK_GRID_SIZE);
}

export function snapBlockPosition(x: number, y: number): { x: number; y: number } {
  return { x: snapXToGrid(x), y: snapYToGrid(y) };
}

/** 드래그·저장된 X를 들여쓰기 열(28px)에 스냅 */
export function getBlockColumnX(blocks: BlocksMap, blockId: string): number {
  const block = blocks[blockId];
  if (!block) return 0;
  if (block.positionX != null) {
    return snapXToIndentGrid(block.positionX);
  }
  return getAlignedX(blocks, blockId);
}

/** 드래그 Y 기준으로 형제 블록 순서만 맞춤 (트리 구조·parentId 유지) */
export function reorderSiblingsByDropY(
  blocks: BlocksMap,
  blockIdsByPage: Record<string, string[]>,
  blockId: string,
  rootIds: string[]
): { blocks: BlocksMap; blockIdsByPage: Record<string, string[]> } {
  const block = blocks[blockId];
  if (!block) return { blocks, blockIdsByPage };

  const siblings = getSiblingIds(blocks, rootIds, block);
  const ordered = [...siblings].sort(
    (a, b) => (blocks[a]?.positionY ?? 0) - (blocks[b]?.positionY ?? 0)
  );

  if (block.parentId === null) {
    return {
      blocks,
      blockIdsByPage: {
        ...blockIdsByPage,
        [block.pageId]: ordered,
      },
    };
  }

  const parent = blocks[block.parentId];
  if (!parent) return { blocks, blockIdsByPage };

  return {
    blocks: {
      ...blocks,
      [block.parentId]: { ...parent, childIds: ordered },
    },
    blockIdsByPage,
  };
}

/** 트리 순서대로 (x, y) 일괄 적용 — 겹침 없음 */
export function applyTreeLayoutToPage(
  blocks: BlocksMap,
  pageId: string,
  rootIds: string[]
): BlocksMap {
  const layout = computeTreeLayout(blocks, rootIds);
  const next = { ...blocks };
  for (const [id, pos] of Object.entries(layout)) {
    const b = next[id];
    if (!b || b.pageId !== pageId) continue;
    next[id] = { ...b, positionX: pos.x, positionY: pos.y };
  }
  return next;
}

/** 드래그 Y 기준 형제 순서 변경 (같은 parentId / 루트 목록만) */
export function reorderSiblingsByDragDelta(
  blocks: BlocksMap,
  blockIdsByPage: Record<string, string[]>,
  blockId: string,
  deltaY: number,
  rootIds: string[]
): { blocks: BlocksMap; blockIdsByPage: Record<string, string[]> } {
  const block = blocks[blockId];
  if (!block) return { blocks, blockIdsByPage };

  const siblings = getSiblingIds(blocks, rootIds, block);
  const oldIds = [...siblings];
  if (!oldIds.includes(blockId)) return { blocks, blockIdsByPage };

  const dragMid =
    (block.positionY ?? 0) +
    deltaY +
    getBlockCollisionHeight(block) / 2;

  const others = oldIds
    .filter((id) => id !== blockId)
    .map((id) => {
      const b = blocks[id];
      return {
        id,
        mid:
          (b?.positionY ?? 0) + getBlockCollisionHeight(b ?? block) / 2,
      };
    })
    .sort((a, b) => a.mid - b.mid);

  let insertAt = others.length;
  for (let i = 0; i < others.length; i++) {
    if (dragMid < others[i].mid) {
      insertAt = i;
      break;
    }
  }

  const newIds = others.map((o) => o.id);
  newIds.splice(insertAt, 0, blockId);

  if (newIds.join(",") === oldIds.join(",")) {
    return { blocks, blockIdsByPage };
  }

  if (block.parentId === null) {
    return {
      blocks,
      blockIdsByPage: {
        ...blockIdsByPage,
        [block.pageId]: newIds,
      },
    };
  }

  const parent = blocks[block.parentId];
  if (!parent) return { blocks, blockIdsByPage };

  return {
    blocks: {
      ...blocks,
      [block.parentId]: { ...parent, childIds: newIds },
    },
    blockIdsByPage,
  };
}

/** 자유 그리드 드래그 종료 — 좌표만 이동·스냅 (트리/전체 재배치 없음) */
export function applyGridDragDelta(
  blocks: BlocksMap,
  blockId: string,
  delta: { x: number; y: number },
  rootIds: string[],
  layoutHeights?: BlockLayoutHeights
): BlocksMap {
  let next = moveGroupWithCollision(
    blocks,
    blockId,
    delta,
    rootIds,
    layoutHeights
  );
  const pageId = blocks[blockId]?.pageId;
  if (!pageId) return next;

  const visible = getVisibleBlockIds(next, rootIds).filter(
    (id) => next[id]?.pageId === pageId
  );
  for (const id of visible) {
    const b = next[id];
    if (!b) continue;
    const snapped = snapBlockPosition(b.positionX ?? 0, b.positionY ?? 0);
    next[id] = { ...b, positionX: snapped.x, positionY: snapped.y };
  }
  return next;
}

/** 좌표 없는 블록만 그리드에 초기 배치 */
export function initMissingGridPositions(
  blocks: BlocksMap,
  pageId: string,
  rootIds: string[]
): BlocksMap {
  const visible = getVisibleBlockIds(blocks, rootIds).filter(
    (id) => blocks[id]?.pageId === pageId
  );
  let next = { ...blocks };

  for (const id of visible) {
    const b = next[id];
    if (!b || (b.positionX != null && b.positionY != null)) continue;

    const proposed = resolveNewBlockPosition(next, pageId, rootIds, null, b.parentId);
    const snapped = snapBlockPosition(proposed.x, proposed.y);
    next[id] = { ...b, positionX: snapped.x, positionY: snapped.y };
  }

  return next;
}

/** 페이지 블록 Y 그리드 스냅 + X 열 스냅 (드래그한 좌우 위치 유지) */
export function alignPageBlocksToGrid(
  blocks: BlocksMap,
  pageId: string,
  rootIds: string[]
): BlocksMap {
  const visible = getVisibleBlockIds(blocks, rootIds).filter(
    (id) => blocks[id]?.pageId === pageId
  );
  const next = { ...blocks };
  for (const id of visible) {
    const b = next[id];
    if (!b) continue;
    next[id] = {
      ...b,
      positionX: getBlockColumnX(next, id),
      positionY: snapYToGrid(b.positionY ?? 0),
    };
  }
  return next;
}

/**
 * 페이지 전체를 한 줄로 세로 쌓기 (열이 달라도 Y가 겹치지 않음)
 * 드래그 Y 순서 → 문서 순서, X는 들여쓰기 열만 유지
 */
export function normalizePageVerticalSpacing(
  blocks: BlocksMap,
  pageId: string,
  rootIds: string[]
): BlocksMap {
  const visible = getVisibleBlockIds(blocks, rootIds).filter(
    (id) => blocks[id]?.pageId === pageId
  );
  const next = { ...blocks };

  const sorted = [...visible].sort((a, b) => {
    const yA = next[a].positionY ?? 0;
    const yB = next[b].positionY ?? 0;
    if (yA !== yB) return yA - yB;
    return getBlockColumnX(next, a) - getBlockColumnX(next, b);
  });

  let y = 0;

  for (const id of sorted) {
    const b = next[id];
    if (!b) continue;
    next[id] = {
      ...b,
      positionX: getBlockColumnX(next, id),
      positionY: snapYToGrid(y),
    };
    y += getBlockCollisionHeight(b) + BLOCK_ROW_GAP;
  }

  return next;
}

/** 페이지 블록 좌표를 트리 레이아웃과 동기화 */
export function finalizePageLayout(
  blocks: BlocksMap,
  pageId: string,
  rootIds: string[]
): BlocksMap {
  return applyTreeLayoutToPage(blocks, pageId, rootIds);
}

export function getVisibleBlockIds(
  blocks: BlocksMap,
  rootIds: string[]
): string[] {
  const result: string[] = [];

  function walk(ids: string[]) {
    for (const id of ids) {
      const block = blocks[id];
      if (!block) continue;
      result.push(id);
      if (block.type === "toggle" && block.collapsed) continue;
      walk(block.childIds);
    }
  }

  walk(rootIds);
  return result;
}

/** 트리 순서대로 기본 (x, y) 배치 — 겹침 없음 */
export function computeTreeLayout(
  blocks: BlocksMap,
  rootIds: string[]
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  let y = 0;

  function walk(ids: string[], depth: number) {
    for (const id of ids) {
      const block = blocks[id];
      if (!block) continue;
      positions[id] = { x: depth * BLOCK_INDENT, y };
      y += getBlockStackOffset(block);
      if (block.type === "toggle" && block.collapsed) continue;
      walk(block.childIds, depth + 1);
    }
  }

  walk(rootIds, 0);
  return positions;
}

export function needsPositionInit(blocks: BlocksMap, ids: string[]): boolean {
  return ids.some((id) => {
    const b = blocks[id];
    return b && (b.positionX == null || b.positionY == null);
  });
}

export function pageHasOverlaps(
  blocks: BlocksMap,
  pageId: string,
  rootIds: string[]
): boolean {
  const visible = getVisibleBlockIds(blocks, rootIds).filter(
    (id) => blocks[id]?.pageId === pageId
  );
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      if (blocksOverlap(blocks, visible[i], visible[j])) return true;
    }
  }
  return false;
}

function setGroupRootPosition(
  blocks: BlocksMap,
  rootId: string,
  rootX: number,
  rootY: number
): BlocksMap {
  const root = blocks[rootId];
  if (!root) return blocks;

  const ids = [rootId, ...collectDescendantBlockIds(blocks, rootId)];
  const baseX = root.positionX ?? 0;
  const baseY = root.positionY ?? 0;
  const dx = rootX - baseX;
  const dy = rootY - baseY;

  const next = { ...blocks };
  for (const id of ids) {
    const b = next[id];
    if (!b) continue;
    next[id] = {
      ...b,
      positionX: Math.max(0, (b.positionX ?? 0) + dx),
      positionY: Math.max(0, (b.positionY ?? 0) + dy),
    };
  }
  return next;
}

function findFirstOverlapWithGroup(
  blocks: BlocksMap,
  groupRootId: string,
  otherIds: string[],
  layoutHeights?: BlockLayoutHeights
): string | null {
  const groupIds = new Set([
    groupRootId,
    ...collectDescendantBlockIds(blocks, groupRootId),
  ]);

  for (const otherId of otherIds) {
    if (groupIds.has(otherId)) continue;
    if (blocksOverlap(blocks, groupRootId, otherId, BLOCK_COLLISION_GAP, layoutHeights)) {
      return otherId;
    }
  }
  return null;
}

/** 드래그 후 겹치지 않는 위치로 그룹 이동 */
export function moveGroupWithCollision(
  blocks: BlocksMap,
  blockId: string,
  delta: { x: number; y: number },
  rootIds: string[],
  layoutHeights?: BlockLayoutHeights
): BlocksMap {
  const block = blocks[blockId];
  if (!block) return blocks;

  const visible = getVisibleBlockIds(blocks, rootIds);
  const groupSet = new Set([
    blockId,
    ...collectDescendantBlockIds(blocks, blockId),
  ]);
  const others = visible.filter((id) => !groupSet.has(id));

  let rootX = Math.max(0, (block.positionX ?? 0) + delta.x);
  let rootY = Math.max(0, (block.positionY ?? 0) + delta.y);

  for (let i = 0; i < BLOCK_MAX_RESOLVE_ITER; i++) {
    const next = setGroupRootPosition(blocks, blockId, rootX, rootY);
    const hit = findFirstOverlapWithGroup(
      next,
      blockId,
      others,
      layoutHeights
    );
    if (!hit) {
      const snapped = snapBlockPosition(rootX, rootY);
      return setGroupRootPosition(next, blockId, snapped.x, snapped.y);
    }

    const obstacle = getBlockBounds(next[hit], layoutHeights);
    const moved = getBlockBounds(next[blockId], layoutHeights);
    const pushDown = obstacle.y + obstacle.height + BLOCK_ROW_GAP - moved.y;
    const pushRight = obstacle.x + obstacle.width + BLOCK_ROW_GAP - moved.x;

    if (pushDown > 0 && pushDown <= pushRight) {
      rootY += pushDown;
    } else if (pushRight > 0) {
      rootX += pushRight;
    } else {
      rootY += getBlockStackOffset(block, layoutHeights);
    }
  }

  const snapped = snapBlockPosition(rootX, rootY);
  return setGroupRootPosition(blocks, blockId, snapped.x, snapped.y);
}

/** 페이지 내 모든 블록 겹침 해소 */
export function resolvePageCollisions(
  blocks: BlocksMap,
  pageId: string,
  rootIds: string[],
  layoutHeights?: BlockLayoutHeights
): BlocksMap {
  let next = { ...blocks };
  const visible = getVisibleBlockIds(next, rootIds).filter(
    (id) => next[id]?.pageId === pageId
  );

  for (let pass = 0; pass < visible.length * 3; pass++) {
    let changed = false;
    const sorted = [...visible].sort((a, b) => {
      const ba = next[a];
      const bb = next[b];
      const ya = ba?.positionY ?? 0;
      const yb = bb?.positionY ?? 0;
      if (ya !== yb) return ya - yb;
      return (ba?.positionX ?? 0) - (bb?.positionX ?? 0);
    });

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const idA = sorted[i];
        const idB = sorted[j];
        if (!blocksOverlap(next, idA, idB, BLOCK_COLLISION_GAP, layoutHeights)) {
          continue;
        }

        const boundsA = getBlockBounds(next[idA], layoutHeights);
        const bBlock = next[idB];
        if (!bBlock) continue;

        next[idB] = {
          ...bBlock,
          positionY: snapYToGrid(
            boundsA.y + boundsA.height + BLOCK_COLLISION_GAP + BLOCK_COLLISION_BUFFER
          ),
        };
        changed = true;
      }
    }
    if (!changed) break;
  }

  return next;
}

export function findFreePosition(
  blocks: BlocksMap,
  pageId: string,
  rootIds: string[],
  proposed: { x: number; y: number },
  excludeIds: string[] = [],
  layoutHeights?: BlockLayoutHeights
): { x: number; y: number } {
  const exclude = new Set(excludeIds);
  const visible = getVisibleBlockIds(blocks, rootIds).filter(
    (id) => blocks[id]?.pageId === pageId && !exclude.has(id)
  );

  let x = Math.max(0, proposed.x);
  let y = Math.max(0, proposed.y);

  for (let i = 0; i < BLOCK_MAX_RESOLVE_ITER; i++) {
    const probe: Block = {
      id: "__probe__",
      pageId,
      parentId: null,
      childIds: [],
      type: "paragraph",
      content: "",
      positionX: x,
      positionY: y,
    };
    const probeBounds = getBlockBounds(probe, layoutHeights);
    let hit: BlockBounds | null = null;

    for (const id of visible) {
      const other = blocks[id];
      if (!other) continue;
      const ob = getBlockBounds(other, layoutHeights);
      if (boundsOverlap(probeBounds, ob)) {
        hit = ob;
        break;
      }
    }

    if (!hit) return { x, y };

    y = hit.y + hit.height + BLOCK_COLLISION_GAP + BLOCK_COLLISION_BUFFER;
  }

  return { x, y };
}

export function computeCanvasHeight(
  blocks: BlocksMap,
  visibleIds: string[],
  layoutHeights?: BlockLayoutHeights
): number {
  let max = 320;
  for (const id of visibleIds) {
    const b = blocks[id];
    if (!b) continue;
    max = Math.max(
      max,
      (b.positionY ?? 0) + getBlockLayoutHeight(b, layoutHeights) + 48
    );
  }
  return max;
}

export function getPlacementBelowBlock(
  block: Block,
  layoutHeights?: BlockLayoutHeights
): { x: number; y: number } {
  return {
    x: block.positionX ?? 0,
    y: (block.positionY ?? 0) + getBlockStackOffset(block, layoutHeights),
  };
}

export function applyPositionDelta(
  blocks: BlocksMap,
  blockId: string,
  delta: { x: number; y: number }
): BlocksMap {
  const ids = [blockId, ...collectDescendantBlockIds(blocks, blockId)];
  const next = { ...blocks };
  for (const id of ids) {
    const b = next[id];
    if (!b) continue;
    next[id] = {
      ...b,
      positionX: Math.max(0, (b.positionX ?? 0) + delta.x),
      positionY: Math.max(0, (b.positionY ?? 0) + delta.y),
    };
  }
  return next;
}

export function resolveNewBlockPosition(
  blocks: BlocksMap,
  pageId: string,
  rootIds: string[],
  refBlock: Block | null,
  parentId: string | null,
  layoutHeights?: BlockLayoutHeights
): { x: number; y: number } {
  let proposed: { x: number; y: number };

  if (refBlock) {
    proposed = getPlacementBelowBlock(refBlock, layoutHeights);
  } else if (parentId) {
    const parent = blocks[parentId];
    proposed = parent
      ? {
          x: (parent.positionX ?? 0) + BLOCK_INDENT,
          y: (parent.positionY ?? 0) + getBlockStackOffset(parent, layoutHeights),
        }
      : { x: 0, y: 0 };
  } else {
    const visible = getVisibleBlockIds(blocks, rootIds);
    let maxY = 0;
    for (const id of visible) {
      const b = blocks[id];
      if (b?.pageId === pageId) {
        maxY = Math.max(
          maxY,
          (b.positionY ?? 0) + getBlockStackOffset(b, layoutHeights)
        );
      }
    }
    proposed = { x: 0, y: maxY };
  }

  const aligned = {
    x: refBlock
      ? getBlockColumnX(blocks, refBlock.id)
      : parentId
        ? getBlockColumnX(blocks, parentId) + BLOCK_INDENT
        : 0,
    y: proposed.y,
  };
  return findFreePosition(blocks, pageId, rootIds, aligned, [], layoutHeights);
}
