"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { EMPTY_IDS } from "@/lib/constants";
import {
  computeCanvasHeight,
  getVisibleBlockIds,
  type BlockLayoutHeights,
} from "@/lib/blockLayout";
import { useNotionStore } from "@/store/useNotionStore";
import { BlockItem } from "./BlockItem";
import styles from "./BlockEditor.module.css";

interface BlockCanvasProps {
  pageId: string;
  focusBlockId: string | null;
  onFocusBlock: (id: string | null) => void;
  menuBlockId: string | null;
  onMenuBlockIdChange: (id: string | null) => void;
}

export function BlockCanvas({
  pageId,
  focusBlockId,
  onFocusBlock,
  menuBlockId,
  onMenuBlockIdChange,
}: BlockCanvasProps) {
  const blocks = useNotionStore((s) => s.blocks);
  const rootIds = useNotionStore((s) => s.blockIdsByPage[pageId] ?? EMPTY_IDS);
  const ensureBlockPositions = useNotionStore((s) => s.ensureBlockPositions);
  const resolvePageBlockOverlaps = useNotionStore(
    (s) => s.resolvePageBlockOverlaps
  );
  const moveBlockByDelta = useNotionStore((s) => s.moveBlockByDelta);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [layoutHeights, setLayoutHeights] = useState<BlockLayoutHeights>({});
  const layoutHeightsRef = useRef<BlockLayoutHeights>({});
  const resolveRafRef = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const visibleIds = useMemo(
    () => getVisibleBlockIds(blocks, rootIds),
    [blocks, rootIds]
  );

  useEffect(() => {
    layoutHeightsRef.current = {};
    setLayoutHeights({});
  }, [pageId]);

  useEffect(() => {
    ensureBlockPositions(pageId);
  }, [pageId, ensureBlockPositions]);

  const scheduleLayoutResolve = useCallback(
    (heights: BlockLayoutHeights) => {
      if (resolveRafRef.current != null) {
        cancelAnimationFrame(resolveRafRef.current);
      }
      resolveRafRef.current = requestAnimationFrame(() => {
        resolveRafRef.current = null;
        resolvePageBlockOverlaps(pageId, heights);
      });
    },
    [pageId, resolvePageBlockOverlaps]
  );

  const handleLayoutHeightChange = useCallback(
    (blockId: string, height: number) => {
      const prev = layoutHeightsRef.current[blockId];
      if (prev != null && Math.abs(prev - height) < 2) return;

      layoutHeightsRef.current[blockId] = height;
      const next = { ...layoutHeightsRef.current };
      setLayoutHeights(next);
      scheduleLayoutResolve(next);
    },
    [scheduleLayoutResolve]
  );

  const canvasHeight = useMemo(
    () => computeCanvasHeight(blocks, visibleIds, layoutHeights),
    [blocks, visibleIds, layoutHeights]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    onMenuBlockIdChange(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (delta.x !== 0 || delta.y !== 0) {
      moveBlockByDelta(
        String(active.id),
        { x: delta.x, y: delta.y },
        layoutHeightsRef.current
      );
    }
    setActiveId(null);
  };

  const activeBlock = activeId ? blocks[activeId] : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className={styles.canvas}
        style={{ minHeight: canvasHeight }}
        data-page-canvas={pageId}
      >
        <p className={styles.canvasHint}>
          ⠿ 자유 그리드 — 상하좌우 드래그 · 28px 격자에 맞춤
        </p>
        {visibleIds.map((id, index) => {
          const block = blocks[id];
          if (!block) return null;

          const numberedIndex =
            block.type === "numbered"
              ? visibleIds
                  .slice(0, index + 1)
                  .filter((bid) => blocks[bid]?.type === "numbered").length
              : 0;

          return (
            <BlockItem
              key={id}
              block={block}
              listIndex={numberedIndex}
              focusBlockId={focusBlockId}
              onFocusBlock={onFocusBlock}
              menuBlockId={menuBlockId}
              onMenuBlockIdChange={onMenuBlockIdChange}
              isDragOverlay={false}
              onLayoutHeightChange={handleLayoutHeightChange}
            />
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeBlock ? (
          <div className={styles.dragOverlay}>
            <BlockItem
              block={activeBlock}
              listIndex={0}
              focusBlockId={null}
              onFocusBlock={() => {}}
              menuBlockId={null}
              onMenuBlockIdChange={() => {}}
              isDragOverlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
