"use client";

import { useHydrateStore } from "@/hooks/useHydrateStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { BlockEditor } from "@/components/Editor/BlockEditor";
import styles from "./AppLayout.module.css";

interface AppLayoutProps {
  pageId: string;
}

export function AppLayout({ pageId }: AppLayoutProps) {
  const hydrated = useHydrateStore();
  useAutoSave();

  if (!hydrated) {
    return (
      <div className={styles.loading}>
        <span>불러오는 중…</span>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <Sidebar activePageId={pageId} />
      <main className={styles.main}>
        <BlockEditor pageId={pageId} />
      </main>
    </div>
  );
}
