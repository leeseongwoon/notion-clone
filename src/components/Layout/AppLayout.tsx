"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHydrateStore } from "@/hooks/useHydrateStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import { getDefaultPageId } from "@/lib/pages";
import { useNotionStore } from "@/store/useNotionStore";
import { useSidebarLayout } from "@/hooks/useSidebarLayout";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { SidebarShell } from "@/components/Sidebar/SidebarShell";
import { BlockEditor } from "@/components/Editor/BlockEditor";
import styles from "./AppLayout.module.css";

interface AppLayoutProps {
  pageId: string;
}

export function AppLayout({ pageId }: AppLayoutProps) {
  const router = useRouter();
  const hydrated = useHydrateStore();
  const pages = useNotionStore((s) => s.pages);
  const rootPageIds = useNotionStore((s) => s.rootPageIds);
  const createPage = useNotionStore((s) => s.createPage);
  const { width, collapsed, toggleCollapsed, startResize } = useSidebarLayout();
  useAutoSave();

  const pageExists = !!pages[pageId];

  useEffect(() => {
    if (!hydrated) return;
    if (pageExists) return;

    const defaultId = getDefaultPageId(pages, rootPageIds);
    if (defaultId) {
      router.replace(`/${defaultId}`);
      return;
    }

    const id = createPage(null);
    router.replace(`/${id}`);
  }, [hydrated, pageExists, pages, rootPageIds, pageId, router, createPage]);

  if (!hydrated) {
    return (
      <div className={styles.loading}>
        <span>불러오는 중…</span>
      </div>
    );
  }

  if (!pageExists) {
    return (
      <div className={styles.loading}>
        <span>페이지로 이동 중…</span>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <SidebarShell
        width={width}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
        onResizeStart={startResize}
      >
        <Sidebar activePageId={pageId} />
      </SidebarShell>
      <main className={styles.main}>
        <BlockEditor pageId={pageId} />
      </main>
    </div>
  );
}
