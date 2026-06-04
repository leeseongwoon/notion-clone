"use client";

import { useState } from "react";
import { useNotionStore } from "@/store/useNotionStore";
import { PageLockGate } from "@/components/PageLock/PageLockGate";
import { PageSecurityPanel } from "@/components/PageLock/PageSecurityPanel";
import { BlockCanvas } from "./BlockCanvas";
import styles from "./BlockEditor.module.css";

interface BlockEditorProps {
  pageId: string;
}

export function BlockEditor({ pageId }: BlockEditorProps) {
  const page = useNotionStore((s) => s.pages[pageId]);
  const isPageLocked = useNotionStore((s) => s.isPageLocked(pageId));
  const lockPage = useNotionStore((s) => s.lockPage);
  const updatePageTitle = useNotionStore((s) => s.updatePageTitle);
  const addBlock = useNotionStore((s) => s.addBlock);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const [menuBlockId, setMenuBlockId] = useState<string | null>(null);
  const [securityOpen, setSecurityOpen] = useState(false);

  if (!page) {
    return (
      <div className={styles.empty}>페이지를 찾을 수 없습니다.</div>
    );
  }

  return (
    <PageLockGate pageId={pageId}>
      <article className={styles.editor}>
        <div className={styles.pageHeader}>
          <span className={styles.pageEmoji}>{page.icon}</span>
          <input
            className={styles.pageTitleInput}
            value={page.title}
            onChange={(e) => updatePageTitle(pageId, e.target.value)}
            placeholder="제목 없음"
            disabled={isPageLocked}
          />
          <div className={styles.pageHeaderActions}>
            {page.passwordHash ? (
              <button
                type="button"
                className={styles.securityBtn}
                onClick={() => lockPage(pageId)}
                title="페이지 잠금"
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
          </div>
        </div>

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
      </article>

      {securityOpen ? (
        <PageSecurityPanel
          pageId={pageId}
          onClose={() => setSecurityOpen(false)}
        />
      ) : null}
    </PageLockGate>
  );
}
