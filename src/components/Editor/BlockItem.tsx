"use client";

import { useRef, useEffect, useState, KeyboardEvent, Fragment, CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { BlockList } from "./BlockList";
import { BlockHandle } from "./BlockHandle";
import { BlockActionMenu } from "./BlockActionMenu";
import styles from "./BlockEditor.module.css";

interface BlockItemProps {
  block: Block;
  depth: number;
  listIndex: number;
  focusBlockId: string | null;
  onFocusBlock: (id: string | null) => void;
  menuBlockId: string | null;
  onMenuBlockIdChange: (id: string | null) => void;
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
  depth,
  listIndex,
  focusBlockId,
  onFocusBlock,
  menuBlockId,
  onMenuBlockIdChange,
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
  const handleRef = useRef<HTMLButtonElement | null>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);

  const menuOpen = menuBlockId === block.id;
  const def = BLOCK_DEF_BY_TYPE[block.type];
  const isDivider = block.type === "divider";
  const hasCustomBg = !!block.backgroundColor;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const rowStyle = getBlockRowStyle(block);
  const editableStyle = getEditableStyle(block);

  useEffect(() => {
    if (!def.editable || !editableRef.current) return;
    if (editableRef.current.textContent !== block.content) {
      editableRef.current.textContent = block.content;
    }
  }, [block.id, block.type, def.editable]);

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
      onHandleRef={(el) => {
        handleRef.current = el;
      }}
    />
  );

  const renderMenu = () =>
    menuOpen ? (
      <BlockActionMenu
        block={block}
        anchorEl={handleRef.current}
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
      <>
        <div
          ref={setNodeRef}
          style={{ ...sortableStyle, ...rowStyle }}
          className={`${styles.blockRow} ${styles.dividerRow} ${hasCustomBg ? styles.hasCustomBg : ""} ${isDragging ? styles.dragging : ""}`}
        >
          <div className={styles.blockControls}>
            <button
              type="button"
              className={styles.addBtn}
              onClick={handleAddBelow}
              title="아래에 블록 추가"
            >
              +
            </button>
            {renderHandle()}
          </div>
          <hr className={styles.divider} />
        </div>
        {renderMenu()}
      </>
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
    <Fragment>
      <div
        ref={setNodeRef}
        style={{ ...sortableStyle, ...rowStyle }}
        className={rowClass}
      >
        <div className={styles.blockControls}>
          <button
            type="button"
            className={styles.addBtn}
            onClick={handleAddBelow}
            title="아래에 블록 추가"
          >
            +
          </button>
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
      </div>

      {renderMenu()}

      {block.childIds.length > 0 &&
        (block.type !== "toggle" || !block.collapsed) && (
          <BlockList
            pageId={block.pageId}
            blockIds={block.childIds}
            parentId={block.id}
            depth={depth + 1}
            focusBlockId={focusBlockId}
            onFocusBlock={onFocusBlock}
            menuBlockId={menuBlockId}
            onMenuBlockIdChange={onMenuBlockIdChange}
          />
        )}
    </Fragment>
  );
}
