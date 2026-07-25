import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import ThemeInitializer, {
  themeAntiFlashScript,
} from "@/src/Components/ThemeInitializer";
import LanguageInitializer from "@/src/Components/LanguageInitializer";
import AuthInitializer from "@/src/Components/Auth/AuthInitializer";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://beaconvie.com",
  ),
  applicationName: "BeaconVie",
  title: "BeaconVie",
  description:
    "BeaconVie là nền tảng học tiếng Anh ứng dụng AI, cá nhân hóa lộ trình và đồng hành cùng người học mỗi ngày.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={beVietnamPro.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeAntiFlashScript }} />
      </head>
      <body className="BeaconVie-theme-compat min-h-screen antialiased">
        <ThemeInitializer />
        <LanguageInitializer />
        <AuthInitializer />
        {children}
      </body>
    </html>
  );
}
