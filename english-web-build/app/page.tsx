import type { Metadata } from "next";
import HomePage from "@/src/Components/HomePage/HomePage";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lumiverse.app";

export const metadata: Metadata = {
  title: "Lumiverse - Học tiếng Anh với lộ trình AI cá nhân hóa",
  description:
    "Lumiverse giúp bạn học tiếng Anh theo lộ trình AI: placement test, vocabulary SRS, listening, speaking, writing feedback, mission và dashboard tiến bộ.",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "Lumiverse - Học tiếng Anh với lộ trình AI cá nhân hóa",
    description:
      "Bắt đầu miễn phí với placement test, nhận lộ trình AI và luyện đủ kỹ năng tiếng Anh mỗi ngày.",
    url: siteUrl,
    siteName: "Lumiverse",
    locale: "vi_VN",
    type: "website",
    images: [{ url: "/loho/og-image.png", width: 1200, height: 630, alt: "Lumiverse" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumiverse - Học tiếng Anh với AI",
    description:
      "Học tiếng Anh cá nhân hóa với AI coach, SRS, mission, leaderboard và dashboard tiến bộ.",
    images: ["/loho/og-image.png"],
  },
};

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Lumiverse",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    description:
      "Nền tảng học tiếng Anh AI với placement test, lộ trình cá nhân hóa, SRS và phản hồi AI.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "VND",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HomePage />
    </>
  );
}
