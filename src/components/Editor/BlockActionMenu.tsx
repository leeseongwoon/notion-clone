"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Block, BlockType } from "@/types";
import { BLOCK_DEFINITIONS } from "@/lib/blocks";
import {
  BLOCK_BACKGROUND_COLORS,
  BLOCK_TEXT_COLORS,
} from "@/lib/blockColors";
import styles from "./BlockActionMenu.module.css";

interface BlockActionMenuProps {
  block: Block;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onBackgroundColor: (color: string | null) => void;
  onTextColor: (color: string | null) => void;
  onConvertType: (type: BlockType) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function BlockActionMenu({
  block,
  anchorEl,
  onClose,
  onBackgroundColor,
  onTextColor,
  onConvertType,
  onDuplicate,
  onDelete,
}: BlockActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showTypes, setShowTypes] = useState(false);

  useEffect(() => {
    if (!anchorEl) return;
    const update = () => {
      const rect = anchorEl.getBoundingClientRect();
      const menuWidth = 280;
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - 12) {
        left = window.innerWidth - menuWidth - 12;
      }
      setPosition({ top: rect.bottom + 6, left: Math.max(12, left) });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorEl]);

  useEffect(() => {
    const handlePointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current?.contains(target) ||
        anchorEl?.contains(target)
      ) {
        return;
      }
      onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [anchorEl, onClose]);

  if (!anchorEl || typeof document === "undefined") return null;

  const formatTypes = BLOCK_DEFINITIONS.filter((d) => d.editable);

  return createPortal(
    <div
      ref={menuRef}
      className={styles.menu}
      style={{ top: position.top, left: position.left }}
      role="dialog"
      aria-label="블록 메뉴"
    >
      <section className={styles.section}>
        <div className={styles.sectionTitle}>블록 색</div>
        <div className={styles.colorRow}>
          {BLOCK_BACKGROUND_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              title={c.label}
              className={`${styles.colorSwatch} ${styles.bgSwatch} ${
                (block.backgroundColor ?? null) === c.value
                  ? styles.colorActive
                  : ""
              }`}
              style={
                c.value
                  ? { backgroundColor: c.value }
                  : undefined
              }
              data-default={c.value === null ? true : undefined}
              onClick={() => onBackgroundColor(c.value)}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>글자 색</div>
        <div className={styles.colorRow}>
          {BLOCK_TEXT_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              title={c.label}
              className={`${styles.colorSwatch} ${styles.textSwatch} ${
                (block.textColor ?? null) === c.value ? styles.colorActive : ""
              }`}
              style={c.value ? { color: c.value } : undefined}
              data-default={c.value === null ? true : undefined}
              onClick={() => onTextColor(c.value)}
            >
              A
            </button>
          ))}
        </div>
      </section>

      <div className={styles.divider} />

      <section className={styles.section}>
        <button
          type="button"
          className={styles.expandRow}
          onClick={() => setShowTypes((v) => !v)}
        >
          <span>블록으로 전환</span>
          <span>{showTypes ? "▾" : "▸"}</span>
        </button>
        {showTypes && (
          <div className={styles.typeList}>
            {formatTypes.map((item) => (
              <button
                key={item.type}
                type="button"
                className={`${styles.typeItem} ${
                  block.type === item.type ? styles.typeActive : ""
                }`}
                onClick={() => {
                  onConvertType(item.type);
                  onClose();
                }}
              >
                <span className={styles.typeIcon}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className={styles.divider} />

      <section className={styles.actions}>
        <button type="button" className={styles.actionBtn} onClick={onDuplicate}>
          <span className={styles.actionIcon}>⧉</span>
          복제
        </button>
        <button
          type="button"
          className={`${styles.actionBtn} ${styles.actionDanger}`}
          onClick={onDelete}
        >
          <span className={styles.actionIcon}>🗑</span>
          삭제
        </button>
      </section>
    </div>,
    document.body
  );
}
