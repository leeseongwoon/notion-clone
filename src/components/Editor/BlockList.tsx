"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useNotionStore } from "@/store/useNotionStore";
import { BlockItem } from "./BlockItem";
import styles from "./BlockEditor.module.css";

interface BlockListProps {
  pageId: string;
  blockIds: string[];
  parentId: string | null;
  depth: number;
  focusBlockId: string | null;
  onFocusBlock: (id: string | null) => void;
  menuBlockId: string | null;
  onMenuBlockIdChange: (id: string | null) => void;
}

export function BlockList({
  pageId,
  blockIds,
  parentId,
  depth,
  focusBlockId,
  onFocusBlock,
  menuBlockId,
  onMenuBlockIdChange,
}: BlockListProps) {
  const blocks = useNotionStore((s) => s.blocks);
  const reorderBlocks = useNotionStore((s) => s.reorderBlocks);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderBlocks(pageId, parentId, String(active.id), String(over.id));
  };

  if (blockIds.length === 0) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={blockIds}
        strategy={verticalListSortingStrategy}
      >
        <div
          className={styles.blockList}
          style={{ marginLeft: depth > 0 ? 24 : 0 }}
        >
          {blockIds.map((id, index) => {
            const block = blocks[id];
            if (!block) return null;

            const numberedIndex =
              block.type === "numbered"
                ? blockIds
                    .slice(0, index + 1)
                    .filter((bid) => blocks[bid]?.type === "numbered").length
                : 0;

            return (
              <BlockItem
                key={id}
                block={block}
                depth={depth}
                listIndex={numberedIndex}
                focusBlockId={focusBlockId}
                onFocusBlock={onFocusBlock}
                menuBlockId={menuBlockId}
                onMenuBlockIdChange={onMenuBlockIdChange}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
