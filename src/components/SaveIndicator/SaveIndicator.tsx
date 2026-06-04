"use client";

import { useNotionStore } from "@/store/useNotionStore";
import styles from "./SaveIndicator.module.css";

export function SaveIndicator() {
  const status = useNotionStore((s) => s.saveStatus);

  const label =
    status === "saving"
      ? "저장 중…"
      : status === "saved"
        ? "저장됨"
        : "";

  if (!label) return null;

  return (
    <span className={styles.indicator} data-status={status}>
      {label}
    </span>
  );
}
