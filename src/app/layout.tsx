import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LOCAL FRESH 365 — 산지직송 농수산물",
  description:
    "LOCAL FRESH 365 는 산지 생산자와 소비자를 잇는 농수산물 위탁판매 플랫폼입니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
