"use client";

import { FormEvent, useState } from "react";
import { useNotionStore } from "@/store/useNotionStore";
import { isPasswordValid } from "@/lib/pagePassword";
import styles from "./PageLock.module.css";

interface PageSecurityPanelProps {
  pageId: string;
  onClose: () => void;
}

export function PageSecurityPanel({ pageId, onClose }: PageSecurityPanelProps) {
  const page = useNotionStore((s) => s.pages[pageId]);
  const setPagePassword = useNotionStore((s) => s.setPagePassword);
  const unlockPage = useNotionStore((s) => s.unlockPage);
  const lockPage = useNotionStore((s) => s.lockPage);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [removePassword, setRemovePassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!page) return null;

  const hasPassword = !!page.passwordHash;

  const handleSetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid(password)) {
      setError("비밀번호는 4자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setBusy(true);
    try {
      await setPagePassword(pageId, password);
      setPassword("");
      setConfirm("");
      onClose();
    } catch {
      setError("비밀번호 설정에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemovePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!removePassword) {
      setError("현재 비밀번호를 입력하세요.");
      return;
    }

    setBusy(true);
    const ok = await unlockPage(pageId, removePassword);
    if (!ok) {
      setBusy(false);
      setError("비밀번호가 올바르지 않습니다.");
      return;
    }

    try {
      await setPagePassword(pageId, null);
      setRemovePassword("");
      onClose();
    } catch {
      setError("비밀번호 해제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.panelBackdrop} onClick={onClose} role="presentation">
      <div
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="page-security-title"
      >
        <div className={styles.panelHeader}>
          <h3 id="page-security-title" className={styles.panelTitle}>
            페이지 보안
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

        <p className={styles.panelDesc}>
          비밀번호는 선택 사항입니다. 설정하면 이 페이지를 편집하기 전에
          비밀번호가 필요합니다.
        </p>

        {hasPassword ? (
          <div className={styles.panelSection}>
            <p className={styles.panelStatus}>🔒 비밀번호가 설정되어 있습니다.</p>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => lockPage(pageId)}
            >
              다시 잠금
            </button>
          </div>
        ) : (
          <p className={styles.panelStatusOpen}>🔓 비밀번호 없음 — 누구나 편집 가능</p>
        )}

        <form className={styles.panelForm} onSubmit={handleSetPassword}>
          <label className={styles.label}>
            {hasPassword ? "새 비밀번호" : "비밀번호 (선택)"}
            <input
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="4자 이상"
              autoComplete="new-password"
            />
          </label>
          <label className={styles.label}>
            비밀번호 확인
            <input
              type="password"
              className={styles.input}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <button
            type="submit"
            className={styles.primaryBtn}
            disabled={busy || !password}
          >
            {hasPassword ? "비밀번호 변경" : "비밀번호 설정"}
          </button>
        </form>

        {hasPassword ? (
          <form className={styles.panelForm} onSubmit={handleRemovePassword}>
            <label className={styles.label}>
              비밀번호 제거 (현재 비밀번호 입력)
              <input
                type="password"
                className={styles.input}
                value={removePassword}
                onChange={(e) => setRemovePassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <button
              type="submit"
              className={styles.dangerBtn}
              disabled={busy || !removePassword}
            >
              비밀번호 제거
            </button>
          </form>
        ) : null}

        {error ? <p className={styles.panelError}>{error}</p> : null}
      </div>
    </div>
  );
}
