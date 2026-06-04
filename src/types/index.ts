export type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bullet"
  | "numbered"
  | "todo"
  | "quote"
  | "code"
  | "divider"
  | "toggle"
  | "callout";

export type SaveStatus = "idle" | "saving" | "saved";

export interface Block {
  id: string;
  pageId: string;
  parentId: string | null;
  childIds: string[];
  type: BlockType;
  content: string;
  checked?: boolean;
  collapsed?: boolean;
  backgroundColor?: string | null;
  textColor?: string | null;
  /** 캔버스 상 절대 위치 (px) */
  positionX?: number;
  positionY?: number;
}

export interface Page {
  id: string;
  title: string;
  parentId: string | null;
  childIds: string[];
  icon: string;
  /** SHA-256 해시 — 없으면 비밀번호 미설정 */
  passwordHash?: string;
}

export interface PersistedState {
  pages: Record<string, Page>;
  blocks: Record<string, Block>;
  blockIdsByPage: Record<string, string[]>;
  rootPageIds: string[];
  expandedPageIds: string[];
}
