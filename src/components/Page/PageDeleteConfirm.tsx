"use client";

import { useNotionStore } from "@/store/useNotionStore";
import { isFolderPage } from "@/lib/pages";
import { collectPageDescendantIds } from "@/lib/pageTreeDnD";
import styles from "@/components/PageLock/PageLock.module.css";

interface PageDeleteConfirmProps {
  pageId: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function PageDeleteConfirm({
  pageId,
  onClose,
  onConfirm,
}: PageDeleteConfirmProps) {
  const page = useNotionStore((s) => s.pages[pageId]);
  const pages = useNotionStore((s) => s.pages);

  if (!page) return null;

  const isFolder = isFolderPage(page);
  const descendantCount = collectPageDescendantIds(pages, pageId).length;
  const title = page.title || (isFolder ? "새 폴더" : "제목 없음");

  return (
    <div className={styles.panelBackdrop} onClick={onClose} role="presentation">
      <div
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-labelledby="page-delete-title"
        aria-describedby="page-delete-desc"
      >
        <div className={styles.panelHeader}>
          <h3 id="page-delete-title" className={styles.panelTitle}>
            {isFolder ? "폴더 삭제" : "페이지 삭제"}
          </h3>
          <button
            type="button"
            className={styles.panelClose}
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <p id="page-delete-desc" className={styles.panelDesc}>
          <strong>{title}</strong>
          {isFolder && descendantCount > 0
            ? `과(와) 하위 ${descendantCount}개 페이지가 모두 삭제됩니다.`
            : descendantCount > 0
              ? `과(와) 하위 ${descendantCount}개 페이지가 함께 삭제됩니다.`
              : "을(를) 삭제합니다."}{" "}
          이 작업은 되돌릴 수 없습니다.
        </p>

        <div className={styles.panelActions}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose}>
            취소
          </button>
          <button type="button" className={styles.dangerBtn} onClick={onConfirm}>
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
