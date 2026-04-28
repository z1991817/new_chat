import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://artimg.pro"),
  title: "AI 图片生成器 | artImg Pro",
  description: "输入提示词，快速生成海报、封面、电商图和创意视觉。",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AI 图片生成器 | artImg Pro",
    description: "输入提示词，快速生成海报、封面、电商图和创意视觉。",
    type: "website",
    url: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${bodyFont.variable} ${headingFont.variable}`}>
      <body className="font-[family-name:var(--font-body)] antialiased">{children}</body>
    </html>
  );
}
