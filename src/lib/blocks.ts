import type { BlockType } from "@/types";

export interface BlockDefinition {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
  placeholder: string;
  editable: boolean;
  /** Enter 키로 생성되는 다음 블록 타입 */
  enterType: BlockType;
  slashKeywords: string[];
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: "paragraph",
    label: "텍스트",
    description: "일반 문단",
    icon: "¶",
    placeholder: "'/' 입력으로 블록 추가",
    editable: true,
    enterType: "paragraph",
    slashKeywords: ["text", "p", "문단", "텍스트"],
  },
  {
    type: "heading1",
    label: "제목 1",
    description: "큰 제목",
    icon: "H1",
    placeholder: "제목 1",
    editable: true,
    enterType: "paragraph",
    slashKeywords: ["h1", "제목1", "heading1"],
  },
  {
    type: "heading2",
    label: "제목 2",
    description: "중간 제목",
    icon: "H2",
    placeholder: "제목 2",
    editable: true,
    enterType: "paragraph",
    slashKeywords: ["h2", "제목2", "heading2"],
  },
  {
    type: "heading3",
    label: "제목 3",
    description: "작은 제목",
    icon: "H3",
    placeholder: "제목 3",
    editable: true,
    enterType: "paragraph",
    slashKeywords: ["h3", "제목3", "heading3"],
  },
  {
    type: "bullet",
    label: "글머리 기호",
    description: "글머리 목록",
    icon: "•",
    placeholder: "목록",
    editable: true,
    enterType: "bullet",
    slashKeywords: ["bullet", "ul", "목록", "글머리"],
  },
  {
    type: "numbered",
    label: "번호 매기기",
    description: "번호 목록",
    icon: "1.",
    placeholder: "목록",
    editable: true,
    enterType: "numbered",
    slashKeywords: ["numbered", "ol", "번호"],
  },
  {
    type: "todo",
    label: "할 일",
    description: "체크리스트",
    icon: "☐",
    placeholder: "할 일",
    editable: true,
    enterType: "todo",
    slashKeywords: ["todo", "checkbox", "할일", "체크"],
  },
  {
    type: "quote",
    label: "인용",
    description: "인용 블록",
    icon: "❝",
    placeholder: "인용",
    editable: true,
    enterType: "paragraph",
    slashKeywords: ["quote", "인용"],
  },
  {
    type: "code",
    label: "코드",
    description: "코드 블록",
    icon: "</>",
    placeholder: "코드를 입력하세요",
    editable: true,
    enterType: "paragraph",
    slashKeywords: ["code", "코드"],
  },
  {
    type: "toggle",
    label: "토글",
    description: "접을 수 있는 목록",
    icon: "▸",
    placeholder: "토글",
    editable: true,
    enterType: "paragraph",
    slashKeywords: ["toggle", "토글"],
  },
  {
    type: "callout",
    label: "콜아웃",
    description: "강조 박스",
    icon: "💡",
    placeholder: "콜아웃 내용",
    editable: true,
    enterType: "paragraph",
    slashKeywords: ["callout", "콜아웃"],
  },
  {
    type: "divider",
    label: "구분선",
    description: "수평선",
    icon: "—",
    placeholder: "",
    editable: false,
    enterType: "paragraph",
    slashKeywords: ["divider", "hr", "구분", "선"],
  },
];

export const BLOCK_DEF_BY_TYPE = Object.fromEntries(
  BLOCK_DEFINITIONS.map((d) => [d.type, d])
) as Record<BlockType, BlockDefinition>;

export function filterSlashCommands(query: string): BlockDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return BLOCK_DEFINITIONS;
  return BLOCK_DEFINITIONS.filter(
    (d) =>
      d.label.toLowerCase().includes(q) ||
      d.type.includes(q) ||
      d.slashKeywords.some((k) => k.includes(q))
  );
}

export function detectMarkdownType(
  text: string
): { type: BlockType; content: string } | null {
  if (text === "---" || text === "***") {
    return { type: "divider", content: "" };
  }
  const rules: [string, BlockType][] = [
    ["### ", "heading3"],
    ["## ", "heading2"],
    ["# ", "heading1"],
    ["> ", "quote"],
    ["- ", "bullet"],
    ["* ", "bullet"],
    ["1. ", "numbered"],
    ["[] ", "todo"],
    ["[ ] ", "todo"],
  ];
  for (const [prefix, type] of rules) {
    if (text.startsWith(prefix)) {
      return { type, content: text.slice(prefix.length) };
    }
  }
  if (text.startsWith("```")) {
    const content = text.startsWith("``` ")
      ? text.slice(4)
      : text.length > 3
        ? text.slice(3)
        : "";
    return { type: "code", content };
  }
  return null;
}

export function parseSlashCommand(
  text: string
): { query: string; active: boolean } | null {
  if (!text.startsWith("/")) return null;
  return { query: text.slice(1), active: true };
}
