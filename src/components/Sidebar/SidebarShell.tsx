"use client";

import styles from "./SidebarShell.module.css";

interface SidebarShellProps {
  width: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onResizeStart: (clientX: number) => void;
  children: React.ReactNode;
}

export function SidebarShell({
  width,
  collapsed,
  onToggleCollapse,
  onResizeStart,
  children,
}: SidebarShellProps) {
  if (collapsed) {
    return (
      <button
        type="button"
        className={styles.expandBtn}
        onClick={onToggleCollapse}
        title="사이드바 펼치기"
        aria-label="사이드바 펼치기"
      >
        ☰
      </button>
    );
  }

  return (
    <div className={styles.shell} style={{ width }}>
      {children}
      <button
        type="button"
        className={styles.collapseBtn}
        onClick={onToggleCollapse}
        title="사이드바 접기"
        aria-label="사이드바 접기"
      >
        «
      </button>
      <div
        className={styles.resizeHandle}
        onMouseDown={(e) => {
          e.preventDefault();
          onResizeStart(e.clientX);
        }}
        title="너비 조절"
        role="separator"
        aria-orientation="vertical"
        aria-label="사이드바 너비 조절"
      />
    </div>
  );
}
