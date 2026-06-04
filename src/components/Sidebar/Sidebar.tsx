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
import { SaveIndicator } from "@/components/SaveIndicator/SaveIndicator";
import { PageTreeItem } from "./PageTreeItem";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  activePageId: string;
}

export function Sidebar({ activePageId }: SidebarProps) {
  const rootPageIds = useNotionStore((s) => s.rootPageIds);
  const createPage = useNotionStore((s) => s.createPage);
  const reorderRootPages = useNotionStore((s) => s.reorderRootPages);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderRootPages(String(active.id), String(over.id));
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.logo}>📝 Notion Clone</span>
        <SaveIndicator />
      </div>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>페이지</div>
        <button
          type="button"
          className={styles.newPageBtn}
          onClick={() => createPage(null)}
        >
          + 새 페이지
        </button>
      </div>
      <nav className={styles.nav}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rootPageIds}
            strategy={verticalListSortingStrategy}
          >
            {rootPageIds.map((pageId) => (
              <PageTreeItem
                key={pageId}
                pageId={pageId}
                depth={0}
                activePageId={activePageId}
              />
            ))}
          </SortableContext>
        </DndContext>
      </nav>
    </aside>
  );
}
