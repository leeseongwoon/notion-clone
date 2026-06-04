# Notion Clone

TypeScript · React · Next.js · CSS Modules · Zustand로 만든 Notion 스타일 문서 에디터입니다.

## 기능

- **Notion 스타일 블록** — 텍스트, 제목(H1–H3), 글머리/번호 목록, 할 일, 인용, 코드, 구분선, 토글, 콜아웃
- **슬래시 메뉴** — `/` 입력 후 블록 유형 검색·선택
- **마크다운 단축** — `# `, `- `, `1. `, `> `, `[] `, `---` 등
- **중첩 블록** — `Tab` / `Shift+Tab` 들여쓰기·내어쓰기, 토글 하위 블록
- **드래그 앤 드롭** — 블록·페이지 순서 변경 (⠿ 핸들)
- **중첩 페이지** — 사이드바 트리
- **실시간 저장** — localStorage 자동 저장

## 시작하기

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

## 단축키 · 조작

| 동작 | 방법 |
|------|------|
| 블록 메뉴 | `/` |
| 새 블록 | `Enter` |
| 아래 블록 추가 | 행 왼쪽 `+` |
| 들여쓰기 | `Tab` |
| 내어쓰기 | `Shift+Tab` |
| 빈 블록 삭제 | `Backspace` |
| 마크다운 | `# `, `## `, `- `, `1. `, `> `, `---` |
| 페이지 추가 | 사이드바 **+ 새 페이지** |
| 순서 변경 | ⠿ 드래그 |

## 기술 스택

- Next.js (App Router)
- React 19
- TypeScript
- CSS Modules
- Zustand
- @dnd-kit (드래그 앤 드롭)

## 프로젝트 구조

```
src/
├── app/              # 라우팅 (/, /[pageId])
├── components/       # Sidebar, BlockEditor, Layout
├── hooks/            # hydrate, auto-save
├── lib/              # storage, 초기 데이터
├── store/            # Zustand 스토어
└── types/            # 공통 타입
```

데이터는 브라우저 `localStorage` 키 `notion-clone-data`에 저장됩니다.
