import { v4 as uuidv4 } from "uuid";
import type { Block, Page, PersistedState } from "@/types";

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
        "각 줄이 독립된 블록입니다. / 로 유형을 바꾸고, Tab 으로 들여쓰기, 마크다운(#, -, >, 1.)도 지원합니다.",
    },
    [b3]: {
      id: b3,
      pageId,
      parentId: null,
      childIds: [b4, b5],
      type: "toggle",
      content: "토글 펼치기 · 하위 블록",
      collapsed: false,
    },
    [b4]: {
      id: b4,
      pageId,
      parentId: b3,
      childIds: [],
      type: "bullet",
      content: "글머리 기호 블록",
    },
    [b5]: {
      id: b5,
      pageId,
      parentId: b3,
      childIds: [],
      type: "bullet",
      content: "Enter 로 같은 목록 이어 쓰기",
    },
    [b6]: {
      id: b6,
      pageId,
      parentId: null,
      childIds: [],
      type: "todo",
      content: "할 일 블록 체크하기",
      checked: false,
    },
  };

  return {
    pages: { [pageId]: page },
    blocks,
    blockIdsByPage: { [pageId]: [b1, b2, b3, b6] },
    rootPageIds: [pageId],
    expandedPageIds: [pageId],
  };
}
