"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { getAllPageIds } from "@/lib/pageTreeDnD";
import {
  getDefaultPageId,
  isFolderPage,
  getPageDisplayIcon,
} from "@/lib/pages";
import { useNotionStore } from "@/store/useNotionStore";
import { SaveIndicator } from "@/components/SaveIndicator/SaveIndicator";
import { PageSidebarDropProvider } from "./PageSidebarDropContext";
import { PageTreeItem } from "./PageTreeItem";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  activePageId: string;
}

const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length > 0) return hits;
  return closestCenter(args);
};

export function Sidebar({ activePageId }: SidebarProps) {
  const router = useRouter();
  const pages = useNotionStore((s) => s.pages);
  const rootPageIds = useNotionStore((s) => s.rootPageIds);
  const createPage = useNotionStore((s) => s.createPage);
  const createFolder = useNotionStore((s) => s.createFolder);
  const dragPageInSidebar = useNotionStore((s) => s.dragPageInSidebar);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [folderDropTargetId, setFolderDropTargetId] = useState<string | null>(
    null
  );

  const allPageIds = useMemo(
    () => getAllPageIds(pages, rootPageIds),
    [pages, rootPageIds]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateFolderDropTarget = (overId: string | null) => {
    if (!overId) {
      setFolderDropTargetId(null);
      return;
    }
    const over = pages[overId];
    setFolderDropTargetId(isFolderPage(over) ? overId : null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over ? String(event.over.id) : null;
    updateFolderDropTarget(overId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setFolderDropTargetId(null);
    if (!over || active.id === over.id) return;
    dragPageInSidebar(String(active.id), String(over.id));
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    setFolderDropTargetId(null);
  };

  const activePage = activeDragId ? pages[activeDragId] : null;
  const defaultPageId = getDefaultPageId(pages, rootPageIds);
  const homeHref = defaultPageId ? `/${defaultPageId}` : "/";

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <Link href={homeHref} className={styles.logo} title="처음으로">
          📝 Notion Clone
        </Link>
        <SaveIndicator />
      </div>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>워크스페이스</div>
        <div className={styles.newBtnRow}>
          <button
            type="button"
            className={styles.newPageBtn}
            onClick={() => {
              const id = createPage(null);
              router.push(`/${id}`);
            }}
          >
            + 페이지
          </button>
          <button
            type="button"
            className={styles.newFolderBtn}
            onClick={() => {
              const id = createFolder(null);
              router.push(`/${id}`);
            }}
          >
            + 폴더
          </button>
        </div>
      </div>
      <nav className={styles.nav}>
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={allPageIds}
            strategy={verticalListSortingStrategy}
          >
            <PageSidebarDropProvider folderDropTargetId={folderDropTargetId}>
              {rootPageIds.map((pageId) => (
                <PageTreeItem
                  key={pageId}
                  pageId={pageId}
                  depth={0}
                  activePageId={activePageId}
                />
              ))}
            </PageSidebarDropProvider>
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {activePage ? (
              <div className={styles.dragOverlayItem}>
                <span>{getPageDisplayIcon(activePage)}</span>
                <span>{activePage.title || "제목 없음"}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </nav>
    </aside>
  );
}
