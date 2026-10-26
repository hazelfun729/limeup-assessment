import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "自主学习力测评 | 青柠伴学",
  description:
    "Growth OS 通过自主学习力测评，帮助孩子探索成长优势，获得属于自己的成长升级方案。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
