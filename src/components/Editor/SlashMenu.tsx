"use client";

import { useEffect, useRef } from "react";
import type { BlockType } from "@/types";
import { BLOCK_DEFINITIONS, filterSlashCommands } from "@/lib/blocks";
import styles from "./SlashMenu.module.css";

interface SlashMenuProps {
  query: string;
  selectedIndex: number;
  onSelect: (type: BlockType) => void;
  onIndexChange: (index: number) => void;
}

export function SlashMenu({
  query,
  selectedIndex,
  onSelect,
  onIndexChange,
}: SlashMenuProps) {
  const items = filterSlashCommands(query);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, items.length]);

  useEffect(() => {
    if (selectedIndex >= items.length && items.length > 0) {
      onIndexChange(items.length - 1);
    }
  }, [items.length, selectedIndex, onIndexChange]);

  if (items.length === 0) {
    return (
      <div className={styles.menu}>
        <div className={styles.empty}>일치하는 블록 없음</div>
      </div>
    );
  }

  return (
    <div className={styles.menu} ref={listRef} role="listbox">
      <div className={styles.menuTitle}>기본 블록</div>
      {items.map((item, index) => (
        <button
          key={item.type}
          type="button"
          role="option"
          aria-selected={index === selectedIndex}
          className={`${styles.item} ${index === selectedIndex ? styles.selected : ""}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(item.type);
          }}
          onMouseEnter={() => onIndexChange(index)}
        >
          <span className={styles.itemIcon}>{item.icon}</span>
          <span className={styles.itemText}>
            <span className={styles.itemLabel}>{item.label}</span>
            <span className={styles.itemDesc}>{item.description}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function getSlashMenuItemCount(query: string): number {
  return filterSlashCommands(query).length;
}

export function getSlashMenuItemType(
  query: string,
  index: number
): BlockType | null {
  const items = filterSlashCommands(query);
  return items[index]?.type ?? null;
}

export { BLOCK_DEFINITIONS };
