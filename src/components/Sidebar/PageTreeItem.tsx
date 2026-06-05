"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePageSecurityBadge } from "@/hooks/usePageLock";
import { PageSecurityBadgeIcon } from "@/components/Page/PageSecurityBadgeIcon";
import { getPageDisplayIcon, isFolderPage } from "@/lib/pages";
import { useNotionStore } from "@/store/useNotionStore";
import { PageDeleteConfirm } from "@/components/Page/PageDeleteConfirm";
import { useFolderDropTarget } from "./PageSidebarDropContext";
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
  const router = useRouter();
  const page = useNotionStore((s) => s.pages[pageId]);
  const securityBadge = usePageSecurityBadge(pageId);
  const expandedPageIds = useNotionStore((s) => s.expandedPageIds);
  const toggleExpanded = useNotionStore((s) => s.toggleExpanded);
  const createPage = useNotionStore((s) => s.createPage);
  const createFolder = useNotionStore((s) => s.createFolder);
  const deletePage = useNotionStore((s) => s.deletePage);

  const isDropTarget = useFolderDropTarget(pageId);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const pageMenuRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pageId });

  useEffect(() => {
    if (!addMenuOpen && !pageMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (
        addMenuRef.current &&
        !addMenuRef.current.contains(e.target as Node)
      ) {
        setAddMenuOpen(false);
      }
      if (
        pageMenuRef.current &&
        !pageMenuRef.current.contains(e.target as Node)
      ) {
        setPageMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [addMenuOpen, pageMenuOpen]);

  if (!page) return null;

  const isFolder = isFolderPage(page);
  const isExpanded = expandedPageIds.includes(pageId);
  const hasChildren = page.childIds.length > 0;
  const isActive = activePageId === pageId;
  const showExpand = hasChildren || isFolder;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: `${12 + depth * 16}px`,
  };

  const handleAddPage = () => {
    const id = createPage(pageId);
    setAddMenuOpen(false);
    router.push(`/${id}`);
  };

  const handleAddFolder = () => {
    const id = createFolder(pageId);
    setAddMenuOpen(false);
    router.push(`/${id}`);
  };

  const handleDeletePage = () => {
    const fallback = deletePage(pageId);
    setDeleteOpen(false);
    setPageMenuOpen(false);
    if (activePageId !== pageId) return;
    if (fallback) {
      router.push(`/${fallback}`);
    } else {
      router.push("/");
    }
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.treeItemWrap}>
      <div
        className={[
          styles.treeItem,
          isFolder ? styles.treeItemFolder : "",
          isActive ? styles.active : "",
          isDragging ? styles.dragging : "",
          isDropTarget ? styles.treeItemDropTarget : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <button
          type="button"
          className={styles.expandBtn}
          onClick={() => toggleExpanded(pageId)}
          aria-label={isExpanded ? "접기" : "펼치기"}
          style={{ visibility: showExpand ? "visible" : "hidden" }}
        >
          {isExpanded ? "▾" : "▸"}
        </button>
        <span
          className={styles.dragHandle}
          {...attributes}
          {...listeners}
          title="드래그하여 이동 · 폴더에 놓기"
        >
          ⠿
        </span>
        <Link href={`/${pageId}`} className={styles.pageLink}>
          <span className={styles.pageIcon}>{getPageDisplayIcon(page)}</span>
          <span
            className={`${styles.pageTitle} ${isFolder ? styles.pageTitleFolder : ""}`}
          >
            {page.title || (isFolder ? "새 폴더" : "제목 없음")}
          </span>
          {securityBadge ? (
            <PageSecurityBadgeIcon badge={securityBadge} />
          ) : null}
        </Link>
        <div className={styles.addChildWrap} ref={addMenuRef}>
          <button
            type="button"
            className={styles.addChildBtn}
            onClick={() => {
              setPageMenuOpen(false);
              setAddMenuOpen((o) => !o);
            }}
            title="하위에 추가"
            aria-expanded={addMenuOpen}
          >
            +
          </button>
          {addMenuOpen ? (
            <div className={styles.addChildMenu}>
              <button type="button" onClick={handleAddPage}>
                📄 페이지
              </button>
              <button type="button" onClick={handleAddFolder}>
                📁 폴더
              </button>
            </div>
          ) : null}
        </div>
        <div className={styles.pageMenuWrap} ref={pageMenuRef}>
          <button
            type="button"
            className={styles.pageMenuBtn}
            onClick={() => {
              setAddMenuOpen(false);
              setPageMenuOpen((o) => !o);
            }}
            title="페이지 메뉴"
            aria-expanded={pageMenuOpen}
          >
            ⋯
          </button>
          {pageMenuOpen ? (
            <div className={styles.addChildMenu}>
              <button
                type="button"
                className={styles.menuDanger}
                onClick={() => {
                  setPageMenuOpen(false);
                  setDeleteOpen(true);
                }}
              >
                🗑 삭제
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {isExpanded && page.childIds.length > 0
        ? page.childIds.map((childId) => (
            <PageTreeItem
              key={childId}
              pageId={childId}
              depth={depth + 1}
              activePageId={activePageId}
            />
          ))
        : null}

      {deleteOpen ? (
        <PageDeleteConfirm
          pageId={pageId}
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleDeletePage}
        />
      ) : null}
    </div>
  );
}
