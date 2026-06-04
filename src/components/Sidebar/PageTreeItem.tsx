"use client";

import Link from "next/link";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useNotionStore } from "@/store/useNotionStore";
import styles from "./Sidebar.module.css";

interface PageTreeItemProps {
  pageId: string;
  depth: number;
  activePageId: string;
}

export function PageTreeItem({
  pageId,
  depth,
  activePageId,
}: PageTreeItemProps) {
  const page = useNotionStore((s) => s.pages[pageId]);
  const expandedPageIds = useNotionStore((s) => s.expandedPageIds);
  const toggleExpanded = useNotionStore((s) => s.toggleExpanded);
  const createPage = useNotionStore((s) => s.createPage);
  const reorderChildPages = useNotionStore((s) => s.reorderChildPages);

  const childSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleChildDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderChildPages(pageId, String(active.id), String(over.id));
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pageId });

  if (!page) return null;

  const isExpanded = expandedPageIds.includes(pageId);
  const hasChildren = page.childIds.length > 0;
  const isActive = activePageId === pageId;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: `${12 + depth * 16}px`,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.treeItemWrap}>
      <div
        className={`${styles.treeItem} ${isActive ? styles.active : ""} ${isDragging ? styles.dragging : ""}`}
      >
        <button
          type="button"
          className={styles.expandBtn}
          onClick={() => toggleExpanded(pageId)}
          aria-label={isExpanded ? "접기" : "펼치기"}
          style={{ visibility: hasChildren ? "visible" : "hidden" }}
        >
          {isExpanded ? "▾" : "▸"}
        </button>
        <span
          className={styles.dragHandle}
          {...attributes}
          {...listeners}
          title="드래그하여 이동"
        >
          ⠿
        </span>
        <Link href={`/${pageId}`} className={styles.pageLink}>
          <span className={styles.pageIcon}>{page.icon}</span>
          <span className={styles.pageTitle}>{page.title || "제목 없음"}</span>
        </Link>
        <button
          type="button"
          className={styles.addChildBtn}
          onClick={() => createPage(pageId)}
          title="하위 페이지 추가"
        >
          +
        </button>
      </div>
      {isExpanded && page.childIds.length > 0 && (
        <DndContext
          sensors={childSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleChildDragEnd}
        >
          <SortableContext
            items={page.childIds}
            strategy={verticalListSortingStrategy}
          >
            {page.childIds.map((childId) => (
              <PageTreeItem
                key={childId}
                pageId={childId}
                depth={depth + 1}
                activePageId={activePageId}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
