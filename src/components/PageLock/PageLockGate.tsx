"use client";

import { FormEvent, useState } from "react";
import { getPageLockSourceId, isPageLockInherited } from "@/lib/pageLock";
import { isFolderPage } from "@/lib/pages";
import { useIsPageLocked } from "@/hooks/usePageLock";
import { useNotionStore } from "@/store/useNotionStore";
import styles from "./PageLock.module.css";

interface PageLockGateProps {
  pageId: string;
  children: React.ReactNode;
}

export function PageLockGate({ pageId, children }: PageLockGateProps) {
  const page = useNotionStore((s) => s.pages[pageId]);
  const pages = useNotionStore((s) => s.pages);
  const isPageLocked = useIsPageLocked(pageId);
  const unlockPage = useNotionStore((s) => s.unlockPage);

  const lockSourceId = getPageLockSourceId(pages, pageId);
  const lockSource = lockSourceId ? pages[lockSourceId] : null;
  const inheritedLock = isPageLockInherited(pages, pageId);

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!page) return null;

  if (!isPageLocked) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const ok = await unlockPage(pageId, password);
    setSubmitting(false);
    if (ok) {
      setPassword("");
      return;
    }
    setError("비밀번호가 올바르지 않습니다.");
  };

  return (
    <div className={styles.lockScreen}>
      <div className={styles.lockCard}>
        <span className={styles.lockIcon} aria-hidden>
          🔒
        </span>
        <h2 className={styles.lockTitle}>{page.title || "제목 없음"}</h2>
        <p className={styles.lockDesc}>
          {inheritedLock && lockSource
            ? `상위 ${isFolderPage(lockSource) ? "폴더" : "페이지"} 「${
                lockSource.title || (isFolderPage(lockSource) ? "새 폴더" : "제목 없음")
              }」이(가) 비밀번호로 보호됩니다. 편집하려면 비밀번호를 입력하세요.`
            : "이 페이지는 비밀번호로 보호됩니다. 편집하려면 비밀번호를 입력하세요."}
        </p>
        <form className={styles.lockForm} onSubmit={handleSubmit}>
          <input
            type="password"
            className={styles.lockInput}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            autoComplete="current-password"
            autoFocus
          />
          {error ? <p className={styles.lockError}>{error}</p> : null}
          <button
            type="submit"
            className={styles.lockSubmit}
            disabled={submitting || password.length === 0}
          >
            {submitting ? "확인 중…" : "잠금 해제"}
          </button>
        </form>
        <p className={styles.lockNote}>
          같은 브라우저 탭에서는 잠금 해제 상태가 유지됩니다.
        </p>
      </div>
    </div>
  );
}
