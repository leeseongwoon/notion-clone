"use client";

import { useState } from "react";
import { useNotionStore } from "@/store/useNotionStore";
import { BlockCanvas } from "./BlockCanvas";
import styles from "./BlockEditor.module.css";

interface BlockEditorProps {
  pageId: string;
}

export function BlockEditor({ pageId }: BlockEditorProps) {
  const page = useNotionStore((s) => s.pages[pageId]);
  const updatePageTitle = useNotionStore((s) => s.updatePageTitle);
  const addBlock = useNotionStore((s) => s.addBlock);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const [menuBlockId, setMenuBlockId] = useState<string | null>(null);

  if (!page) {
    return (
      <div className={styles.empty}>페이지를 찾을 수 없습니다.</div>
    );
  }

  return (
    <article className={styles.editor}>
      <div className={styles.pageHeader}>
        <span className={styles.pageEmoji}>{page.icon}</span>
        <input
          className={styles.pageTitleInput}
          value={page.title}
          onChange={(e) => updatePageTitle(pageId, e.target.value)}
          placeholder="제목 없음"
        />
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
  );
}
