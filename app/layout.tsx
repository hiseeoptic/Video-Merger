import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cutflow-video-studio.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Cutflow — Cắt, nối & tăng tốc video hàng loạt",
  description:
    "Không gian dựng video hàng loạt ngay trên trình duyệt: cắt clip, nối video, đổi tốc độ và xuất nhiều dự án trong một hàng đợi.",
  applicationName: "Cutflow",
  openGraph: {
    title: "Cutflow — Video batch studio",
    description: "Cắt, nối và tăng tốc 3–5 dự án video trong một hàng đợi.",
    type: "website",
    locale: "vi_VN",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Cutflow video batch studio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cutflow — Video batch studio",
    description: "Cắt, nối và tăng tốc nhiều dự án video ngay trên trình duyệt.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b10",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
