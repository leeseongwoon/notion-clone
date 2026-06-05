"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDefaultPageId } from "@/lib/pages";
import { useHydrateStore } from "@/hooks/useHydrateStore";
import { useNotionStore } from "@/store/useNotionStore";
import styles from "./page.module.css";

export default function HomePage() {
  const router = useRouter();
  const hydrated = useHydrateStore();
  const pages = useNotionStore((s) => s.pages);
  const rootPageIds = useNotionStore((s) => s.rootPageIds);
  const createPage = useNotionStore((s) => s.createPage);

  useEffect(() => {
    if (!hydrated) return;

    const defaultId = getDefaultPageId(pages, rootPageIds);
    if (defaultId) {
      router.replace(`/${defaultId}`);
      return;
    }

    const id = createPage(null);
    router.replace(`/${id}`);
  }, [hydrated, pages, rootPageIds, router, createPage]);

  return (
    <div className={styles.loading}>
      <span>불러오는 중…</span>
    </div>
  );
}
