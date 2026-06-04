export interface ColorOption {
  id: string;
  label: string;
  value: string | null;
}

export const BLOCK_BACKGROUND_COLORS: ColorOption[] = [
  { id: "default", label: "기본", value: null },
  { id: "gray", label: "회색", value: "#f1f1ef" },
  { id: "brown", label: "갈색", value: "#f4eeee" },
  { id: "orange", label: "주황", value: "#fbecdd" },
  { id: "yellow", label: "노랑", value: "#fbf3db" },
  { id: "green", label: "초록", value: "#edf3ec" },
  { id: "blue", label: "파랑", value: "#e7f3f8" },
  { id: "purple", label: "보라", value: "#f6f3f9" },
  { id: "pink", label: "분홍", value: "#faf1f5" },
  { id: "red", label: "빨강", value: "#fdebec" },
];

export const BLOCK_TEXT_COLORS: ColorOption[] = [
  { id: "default", label: "기본", value: null },
  { id: "gray", label: "회색", value: "#787774" },
  { id: "brown", label: "갈색", value: "#9f6b53" },
  { id: "orange", label: "주황", value: "#d9730d" },
  { id: "yellow", label: "노랑", value: "#cb912f" },
  { id: "green", label: "초록", value: "#448361" },
  { id: "blue", label: "파랑", value: "#337ea9" },
  { id: "purple", label: "보라", value: "#9065b0" },
  { id: "pink", label: "분홍", value: "#c14c8a" },
  { id: "red", label: "빨강", value: "#d44c47" },
];
