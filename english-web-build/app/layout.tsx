import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeInitializer, {
  themeAntiFlashScript,
} from "@/src/Components/ThemeInitializer";
import LanguageInitializer from "@/src/Components/LanguageInitializer";
import AuthInitializer from "@/src/Components/Auth/AuthInitializer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lumiverse",
  description: "Học ngôn ngữ cùng Lumi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeAntiFlashScript }}
        />
      </head>
      <body className="lumiverse-theme-compat min-h-screen antialiased">
        <ThemeInitializer />
        <LanguageInitializer />
        <AuthInitializer />
        {children}
      </body>
    </html>
  );
}
