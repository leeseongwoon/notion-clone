import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notion Clone",
  description: "블록 에디터 · 중첩 페이지 · 실시간 저장",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
