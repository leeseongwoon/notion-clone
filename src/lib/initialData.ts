import { v4 as uuidv4 } from "uuid";
import type { Block, Page, PersistedState } from "@/types";
import { computeTreeLayout } from "@/lib/blockLayout";

export function createDefaultState(): PersistedState {
  const pageId = uuidv4();
  const b1 = uuidv4();
  const b2 = uuidv4();
  const b3 = uuidv4();
  const b4 = uuidv4();
  const b5 = uuidv4();
  const b6 = uuidv4();

  const page: Page = {
    id: pageId,
    title: "시작하기",
    parentId: null,
    childIds: [],
    icon: "📄",
  };

  const blocks: Record<string, Block> = {
    [b1]: {
      id: b1,
      pageId,
      parentId: null,
      childIds: [],
      type: "heading1",
      content: "Notion 스타일 블록 에디터",
    },
    [b2]: {
      id: b2,
      pageId,
      parentId: null,
      childIds: [],
      type: "paragraph",
      content:
        "⠿ 핸들을 드래그해 블록을 상·하·좌·우 어디로든 옮길 수 있습니다.",
    },
    [b3]: {
      id: b3,
      pageId,
      parentId: null,
      childIds: [b4, b5],
      type: "toggle",
      content: "토글 · 하위 블록",
      collapsed: false,
    },
    [b4]: {
      id: b4,
      pageId,
      parentId: b3,
      childIds: [],
      type: "bullet",
      content: "글머리 블록",
    },
    [b5]: {
      id: b5,
      pageId,
      parentId: b3,
      childIds: [],
      type: "bullet",
      content: "Tab 으로 들여쓰기도 가능",
    },
    [b6]: {
      id: b6,
      pageId,
      parentId: null,
      childIds: [],
      type: "todo",
      content: "할 일 체크",
      checked: false,
    },
  };

  const rootIds = [b1, b2, b3, b6];
  const layout = computeTreeLayout(blocks, rootIds);
  for (const id of Object.keys(blocks)) {
    const pos = layout[id];
    if (pos) {
      blocks[id] = { ...blocks[id], positionX: pos.x, positionY: pos.y };
    }
  }

  return {
    pages: { [pageId]: page },
    blocks,
    blockIdsByPage: { [pageId]: rootIds },
    rootPageIds: [pageId],
    expandedPageIds: [pageId],
  };
}
