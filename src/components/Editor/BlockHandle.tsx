"use client";

import { useRef, useEffect } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import styles from "./BlockEditor.module.css";

interface BlockHandleProps {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  isDragging: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onHandleRef: (el: HTMLButtonElement | null) => void;
}

export function BlockHandle({
  attributes,
  listeners,
  isDragging,
  menuOpen,
  onToggleMenu,
  onHandleRef,
}: BlockHandleProps) {
  const didDragRef = useRef(false);

  useEffect(() => {
    if (isDragging) didDragRef.current = true;
  }, [isDragging]);

  useEffect(() => {
    if (!isDragging && didDragRef.current) {
      const t = setTimeout(() => {
        didDragRef.current = false;
      }, 0);
      return () => clearTimeout(t);
    }
  }, [isDragging]);

  const handleClick = () => {
    if (didDragRef.current) return;
    onToggleMenu();
  };

  return (
    <button
      ref={onHandleRef}
      type="button"
      className={`${styles.handleBtn} ${menuOpen ? styles.handleActive : ""}`}
      title="클릭: 메뉴 · 드래그: 이동"
      aria-label="블록 메뉴 및 이동"
      aria-expanded={menuOpen}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      <span className={styles.handleDots} aria-hidden>
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </span>
    </button>
  );
}
