"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isFolderPage } from "@/lib/pages";
import {
  useIsPageLocked,
  usePageLockSourceId,
  usePageSecurityBadge,
} from "@/hooks/usePageLock";
import { useNotionStore } from "@/store/useNotionStore";
import { PageLockGate } from "@/components/PageLock/PageLockGate";
import { PageSecurityPanel } from "@/components/PageLock/PageSecurityPanel";
import { PageDeleteConfirm } from "@/components/Page/PageDeleteConfirm";
import { PageSecurityBadgeIcon } from "@/components/Page/PageSecurityBadgeIcon";
import { FolderView } from "@/components/Folder/FolderView";
import { BlockCanvas } from "./BlockCanvas";
import styles from "./BlockEditor.module.css";

interface BlockEditorProps {
  pageId: string;
}

export function BlockEditor({ pageId }: BlockEditorProps) {
  const router = useRouter();
  const page = useNotionStore((s) => s.pages[pageId]);
  const isPageLocked = useIsPageLocked(pageId);
  const lockSourceId = usePageLockSourceId(pageId);
  const securityBadge = usePageSecurityBadge(pageId);
  const lockPage = useNotionStore((s) => s.lockPage);
  const deletePage = useNotionStore((s) => s.deletePage);
  const updatePageTitle = useNotionStore((s) => s.updatePageTitle);
  const addBlock = useNotionStore((s) => s.addBlock);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const [menuBlockId, setMenuBlockId] = useState<string | null>(null);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDeletePage = () => {
    const fallback = deletePage(pageId);
    setDeleteOpen(false);
    if (fallback) {
      router.push(`/${fallback}`);
    } else {
      router.push("/");
    }
  };

  if (!page) {
    return (
      <div className={styles.empty}>페이지를 찾을 수 없습니다.</div>
    );
  }

  const isFolder = isFolderPage(page);
  const hasOwnPassword = !!page.passwordHash;
  const hasInheritedLock =
    lockSourceId !== null && lockSourceId !== pageId;

  const handleLock = () => {
    const targetId = lockSourceId ?? pageId;
    lockPage(targetId);
  };

  return (
    <PageLockGate pageId={pageId}>
      <article className={styles.editor}>
        <div className={styles.pageHeader}>
          <span className={styles.pageEmojiWrap}>
            <span className={styles.pageEmoji}>{page.icon}</span>
            {securityBadge && !isPageLocked ? (
              <PageSecurityBadgeIcon
                badge={securityBadge}
                size="md"
                className={styles.pageSecurityBadge}
              />
            ) : null}
          </span>
          <input
            className={styles.pageTitleInput}
            value={page.title}
            onChange={(e) => updatePageTitle(pageId, e.target.value)}
            placeholder={isFolder ? "폴더 이름" : "제목 없음"}
            disabled={isPageLocked}
          />
          <div className={styles.pageHeaderActions}>
            {(hasOwnPassword || hasInheritedLock) && !isPageLocked ? (
              <button
                type="button"
                className={styles.securityBtn}
                onClick={handleLock}
                title={hasInheritedLock ? "상위 폴더 잠금" : "페이지 잠금"}
              >
                🔒 잠금
              </button>
            ) : null}
            <button
              type="button"
              className={styles.securityBtn}
              onClick={() => setSecurityOpen(true)}
              title="비밀번호 설정 (선택)"
            >
              {page.passwordHash ? "🔐 보안" : "🔓 보안"}
            </button>
            <button
              type="button"
              className={styles.deletePageBtn}
              onClick={() => setDeleteOpen(true)}
              title={isFolder ? "폴더 삭제" : "페이지 삭제"}
              disabled={isPageLocked}
            >
              🗑 삭제
            </button>
          </div>
        </div>

        {isFolder ? (
          <FolderView folderId={pageId} />
        ) : (
          <>
            <BlockCanvas
              pageId={pageId}
              focusBlockId={focusBlockId}
              onFocusBlock={setFocusBlockId}
              menuBlockId={menuBlockId}
              onMenuBlockIdChange={setMenuBlockId}
            />

            <button
              type="button"
              className={styles.addBlockHint}
              onClick={() => {
                const id = addBlock(pageId);
                setFocusBlockId(id);
              }}
            >
              + 블록을 클릭하거나 Enter로 계속 작성
            </button>
          </>
        )}
      </article>

      {securityOpen ? (
        <PageSecurityPanel
          pageId={pageId}
          onClose={() => setSecurityOpen(false)}
        />
      ) : null}

      {deleteOpen ? (
        <PageDeleteConfirm
          pageId={pageId}
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleDeletePage}
        />
      ) : null}
    </PageLockGate>
  );
}
