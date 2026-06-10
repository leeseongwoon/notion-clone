"use client";

import {
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  KeyboardEvent,
  CSSProperties,
} from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  BLOCK_DEFAULT_WIDTH,
  getBlockCollisionHeight,
} from "@/lib/blockLayout";
import type { Block, BlockType } from "@/types";
import {
  BLOCK_DEF_BY_TYPE,
  detectMarkdownType,
  parseSlashCommand,
} from "@/lib/blocks";
import { useNotionStore } from "@/store/useNotionStore";
import {
  SlashMenu,
  getSlashMenuItemCount,
  getSlashMenuItemType,
} from "./SlashMenu";
import { BlockHandle } from "./BlockHandle";
import { BlockActionMenu } from "./BlockActionMenu";
import styles from "./BlockEditor.module.css";

interface BlockItemProps {
  block: Block;
  listIndex: number;
  focusBlockId: string | null;
  onFocusBlock: (id: string | null) => void;
  menuBlockId: string | null;
  onMenuBlockIdChange: (id: string | null) => void;
  isDragOverlay?: boolean;
  onLayoutHeightChange?: (blockId: string, height: number) => void;
}

function getBlockRowStyle(block: Block): CSSProperties {
  if (!block.backgroundColor) return {};
  return { backgroundColor: block.backgroundColor };
}

function getEditableStyle(block: Block): CSSProperties {
  if (!block.textColor) return {};
  return { color: block.textColor };
}

export function BlockItem({
  block,
  listIndex,
  focusBlockId,
  onFocusBlock,
  menuBlockId,
  onMenuBlockIdChange,
  isDragOverlay = false,
  onLayoutHeightChange,
}: BlockItemProps) {
  const updateBlock = useNotionStore((s) => s.updateBlock);
  const convertBlockType = useNotionStore((s) => s.convertBlockType);
  const duplicateBlock = useNotionStore((s) => s.duplicateBlock);
  const addBlock = useNotionStore((s) => s.addBlock);
  const deleteBlock = useNotionStore((s) => s.deleteBlock);
  const indentBlock = useNotionStore((s) => s.indentBlock);
  const outdentBlock = useNotionStore((s) => s.outdentBlock);
  const toggleBlockCollapsed = useNotionStore((s) => s.toggleBlockCollapsed);

  const editableRef = useRef<HTMLDivElement>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);
  const [isMultiLine, setIsMultiLine] = useState(false);
  const menuOpen = menuBlockId === block.id;
  const def = BLOCK_DEF_BY_TYPE[block.type];
  const isDivider = block.type === "divider";
  const hasCustomBg = !!block.backgroundColor;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: block.id,
    disabled: isDragOverlay,
  });

  const dragX = isDragOverlay ? 0 : (transform?.x ?? 0);
  const dragY = isDragOverlay ? 0 : (transform?.y ?? 0);
  const minBlockHeight = getBlockCollisionHeight(block);

  const setRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (!isDragOverlay) setNodeRef(node);
    },
    [isDragOverlay, setNodeRef]
  );

  const clearAlignMargins = useCallback((row: HTMLElement) => {
    row
      .querySelectorAll<HTMLElement>(
        `.${styles.blockControls}, .${styles.listMarker}, .${styles.calloutIcon}, .${styles.toggleBtn}, .${styles.todoCheck}`
      )
      .forEach((el) => {
        el.style.marginTop = "";
      });
  }, []);

  const syncRowAlign = useCallback(() => {
    const row = rootRef.current;
    const editable = editableRef.current;
    const controls = controlsRef.current;
    if (!row || !editable || !controls || isDivider) return;

    const style = getComputedStyle(editable);
    const lineHeight = parseFloat(style.lineHeight);
    const paddingTop = parseFloat(style.paddingTop);
    const paddingBottom = parseFloat(style.paddingBottom);
    const safeLineHeight = Number.isFinite(lineHeight) ? lineHeight : 26;
    const singleLineMax = safeLineHeight + paddingTop + paddingBottom + 4;
    const multi = editable.scrollHeight > singleLineMax;

    setIsMultiLine(multi);

    if (!multi) {
      clearAlignMargins(row);
      return;
    }

    const rowRect = row.getBoundingClientRect();
    const editableRect = editable.getBoundingClientRect();
    const firstLineTop = editableRect.top - rowRect.top + paddingTop;
    const firstLineCenter = firstLineTop + safeLineHeight / 2;

    const setMarginTop = (el: HTMLElement | null, height: number) => {
      if (!el) return;
      el.style.marginTop = `${Math.max(0, firstLineCenter - height / 2)}px`;
    };

    controls.style.marginTop = "10px";

    row.querySelectorAll<HTMLElement>(`.${styles.listMarker}`).forEach((el) => {
      el.style.marginTop = `${firstLineTop}px`;
    });

    row.querySelectorAll<HTMLElement>(`.${styles.calloutIcon}`).forEach((el) => {
      setMarginTop(el, el.offsetHeight || 20);
    });

    row.querySelectorAll<HTMLElement>(`.${styles.toggleBtn}`).forEach((el) => {
      setMarginTop(el, el.offsetHeight || 24);
    });

    row.querySelectorAll<HTMLElement>(`.${styles.todoCheck}`).forEach((el) => {
      setMarginTop(el, 16);
    });
  }, [clearAlignMargins, isDivider]);

  useEffect(() => {
    if (isDragOverlay) return;
    const el = rootRef.current;
    if (!el) return;

    const report = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      if (height > 0) onLayoutHeightChange?.(block.id, height);
      syncRowAlign();
    };

    report();
    const observer = new ResizeObserver(() => report());
    observer.observe(el);
    const editable = editableRef.current;
    if (editable) observer.observe(editable);
    return () => observer.disconnect();
  }, [
    block.id,
    block.content,
    block.type,
    isDragOverlay,
    onLayoutHeightChange,
    syncRowAlign,
  ]);

  const canvasStyle: CSSProperties = isDragOverlay
    ? {
        position: "relative",
        width: BLOCK_DEFAULT_WIDTH,
        minHeight: minBlockHeight,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        borderRadius: 6,
        boxSizing: "border-box",
      }
    : {
        position: "absolute",
        left: (block.positionX ?? 0) + dragX,
        top: (block.positionY ?? 0) + dragY,
        width: BLOCK_DEFAULT_WIDTH,
        maxWidth: "calc(100% - 40px)",
        minHeight: minBlockHeight,
        boxSizing: "border-box",
        zIndex: isDragging ? 30 : 1,
        opacity: isDragging ? 0.35 : 1,
      };

  const rowStyle = getBlockRowStyle(block);
  const editableStyle = getEditableStyle(block);

  useEffect(() => {
    if (!def.editable || !editableRef.current) return;
    if (editableRef.current.textContent !== block.content) {
      editableRef.current.textContent = block.content;
    }
  }, [block.id, block.type, def.editable]);

  useLayoutEffect(() => {
    if (!isDragOverlay && !isDivider) {
      syncRowAlign();
    }
  }, [
    block.content,
    block.type,
    block.checked,
    isDragOverlay,
    isDivider,
    syncRowAlign,
  ]);

  useEffect(() => {
    if (focusBlockId !== block.id || !def.editable || !editableRef.current) {
      return;
    }
    editableRef.current.focus();
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(editableRef.current);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
    onFocusBlock(null);
  }, [focusBlockId, block.id, def.editable, onFocusBlock]);

  const syncContent = (text: string) => {
    updateBlock(block.id, { content: text });
  };

  const applySlashSelection = (type: BlockType) => {
    convertBlockType(block.id, type);
    syncContent("");
    setSlashOpen(false);
    setSlashQuery("");
    setSlashIndex(0);
    requestAnimationFrame(() => editableRef.current?.focus());
  };

  const handleInput = () => {
    const text = editableRef.current?.textContent ?? "";

    const md = detectMarkdownType(text);
    if (md && md.type !== block.type) {
      convertBlockType(block.id, md.type);
      syncContent(md.content);
      if (editableRef.current) {
        editableRef.current.textContent = md.content;
      }
      setSlashOpen(false);
      return;
    }

    const slash = parseSlashCommand(text);
    if (slash?.active) {
      setSlashOpen(true);
      setSlashQuery(slash.query);
      setSlashIndex(0);
    } else {
      setSlashOpen(false);
      setSlashQuery("");
    }

    syncContent(slash?.active ? "" : text);
    requestAnimationFrame(syncRowAlign);
  };

  const handleAddBelow = () => {
    const newId = addBlock(block.pageId, {
      afterBlockId: block.id,
      type: def.enterType,
    });
    onFocusBlock(newId);
  };

  const handleToggleMenu = () => {
    onMenuBlockIdChange(menuOpen ? null : block.id);
  };

  const handleMenuDelete = () => {
    onMenuBlockIdChange(null);
    const focusId = deleteBlock(block.id);
    if (focusId) onFocusBlock(focusId);
  };

  const handleMenuDuplicate = () => {
    onMenuBlockIdChange(null);
    const newId = duplicateBlock(block.id);
    onFocusBlock(newId);
  };

  const renderHandle = () => (
    <BlockHandle
      attributes={attributes}
      listeners={listeners}
      isDragging={isDragging}
      menuOpen={menuOpen}
      onToggleMenu={handleToggleMenu}
      onHandleRef={setMenuAnchorEl}
    />
  );

  const actionMenu =
    menuOpen && menuAnchorEl ? (
      <BlockActionMenu
        block={block}
        anchorEl={menuAnchorEl}
        onClose={() => onMenuBlockIdChange(null)}
        onBackgroundColor={(color) =>
          updateBlock(block.id, { backgroundColor: color })
        }
        onTextColor={(color) => updateBlock(block.id, { textColor: color })}
        onConvertType={(type) => convertBlockType(block.id, type)}
        onDuplicate={handleMenuDuplicate}
        onDelete={handleMenuDelete}
      />
    ) : null;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const text = editableRef.current?.textContent ?? "";

    if (slashOpen) {
      const count = getSlashMenuItemCount(slashQuery);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => (count ? (i + 1) % count : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => (count ? (i - 1 + count) % count : 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const type = getSlashMenuItemType(slashQuery, slashIndex);
        if (type) applySlashSelection(type);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlashOpen(false);
        syncContent("");
        if (editableRef.current) editableRef.current.textContent = "";
        return;
      }
    }

    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) outdentBlock(block.id);
      else indentBlock(block.id);
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (block.type === "toggle") {
        const newId = addBlock(block.pageId, {
          parentId: block.id,
          type: "paragraph",
        });
        onFocusBlock(newId);
        return;
      }
      const newId = addBlock(block.pageId, {
        afterBlockId: block.id,
        type: def.enterType,
      });
      onFocusBlock(newId);
      return;
    }

    if (e.key === "Backspace" && text === "") {
      e.preventDefault();
      if (block.parentId) {
        outdentBlock(block.id);
        onFocusBlock(block.id);
        return;
      }
      if (block.type !== "paragraph" && block.type !== "divider") {
        convertBlockType(block.id, "paragraph");
        return;
      }
      const focusId = deleteBlock(block.id);
      if (focusId) onFocusBlock(focusId);
    }
  };

  if (isDivider) {
    return (
      <div
        ref={isDragOverlay ? undefined : setRootRef}
        style={{ ...canvasStyle, ...rowStyle }}
        className={`${styles.canvasBlock} ${styles.blockRow} ${styles.dividerRow} ${hasCustomBg ? styles.hasCustomBg : ""}`}
      >
        <div ref={controlsRef} className={styles.blockControls}>
          {!isDragOverlay && (
            <button
              type="button"
              className={styles.addBtn}
              onClick={handleAddBelow}
              title="아래에 블록 추가"
            >
              +
            </button>
          )}
          {renderHandle()}
        </div>
        <hr className={styles.divider} />
        {actionMenu}
      </div>
    );
  }

  const rowClass = [
    styles.blockRow,
    styles[`type_${block.type}`],
    hasCustomBg ? styles.hasCustomBg : "",
    isDragging ? styles.dragging : "",
    block.checked ? styles.todoDone : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={isDragOverlay ? undefined : setRootRef}
      style={{ ...canvasStyle, ...rowStyle }}
      className={`${styles.canvasBlock} ${isMultiLine ? styles.multiLine : ""} ${rowClass}`}
    >
      <div ref={controlsRef} className={styles.blockControls}>
        {!isDragOverlay && (
          <button
            type="button"
            className={styles.addBtn}
            onClick={handleAddBelow}
            title="아래에 블록 추가"
          >
            +
          </button>
        )}
        {renderHandle()}
      </div>

      {block.type === "toggle" && (
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => toggleBlockCollapsed(block.id)}
            aria-label={block.collapsed ? "펼치기" : "접기"}
          >
            {block.collapsed ? "▸" : "▾"}
          </button>
        )}

        {block.type === "bullet" && (
          <span className={styles.listMarker} style={editableStyle}>
            •
          </span>
        )}
        {block.type === "numbered" && (
          <span className={styles.listMarker} style={editableStyle}>
            {listIndex}.
          </span>
        )}
        {block.type === "todo" && (
          <input
            type="checkbox"
            className={styles.todoCheck}
            checked={!!block.checked}
            onChange={(e) =>
              updateBlock(block.id, { checked: e.target.checked })
            }
          />
        )}
        {block.type === "callout" && !hasCustomBg && (
          <span className={styles.calloutIcon}>💡</span>
        )}

        <div className={styles.blockBody}>
          <div
            ref={editableRef}
            className={styles.editable}
            style={editableStyle}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            data-placeholder={def.placeholder}
          />
          {slashOpen && (
            <SlashMenu
              query={slashQuery}
              selectedIndex={slashIndex}
              onSelect={applySlashSelection}
              onIndexChange={setSlashIndex}
            />
          )}
        </div>
      {actionMenu}
    </div>
  );
}
