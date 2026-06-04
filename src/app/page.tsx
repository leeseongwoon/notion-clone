"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHydrateStore } from "@/hooks/useHydrateStore";
import { useNotionStore } from "@/store/useNotionStore";
import styles from "./page.module.css";

export default function HomePage() {
  const router = useRouter();
  const hydrated = useHydrateStore();
  const rootPageIds = useNotionStore((s) => s.rootPageIds);
  const createPage = useNotionStore((s) => s.createPage);

  useEffect(() => {
    if (!hydrated) return;

    if (rootPageIds.length > 0) {
      router.replace(`/${rootPageIds[0]}`);
      return;
    }

    const id = createPage(null);
    router.replace(`/${id}`);
  }, [hydrated, rootPageIds, router, createPage]);

  return (
    <div className={styles.loading}>
      <span>불러오는 중…</span>
    </div>
  );
}
