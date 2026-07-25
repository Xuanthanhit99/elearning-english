import type { Metadata } from "next";
import HomePage from "@/src/Components/HomePage/HomePage";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://beaconvie.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "BeaconVie - Nền tảng học tiếng Anh ứng dụng AI",
  description:
    "Học thông minh hơn với AI, xây dựng thói quen mỗi ngày, kết nối cộng đồng và theo dõi sự tiến bộ của bạn trên một nền tảng duy nhất.",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "BeaconVie - Nền tảng học tiếng Anh ứng dụng AI",
    description:
      "BeaconVie dẫn đường cho hành trình học tiếng Anh hiện đại: kiểm tra trình độ, lộ trình cá nhân hóa, gia sư AI, nhiệm vụ hằng ngày và cộng đồng học tập.",
    url: siteUrl,
    siteName: "BeaconVie",
    locale: "vi_VN",
    type: "website",
    images: [
      {
        url: "/brand/beaconvie-hero-banner.png",
        width: 1200,
        height: 630,
        alt: "BeaconVie",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BeaconVie - Học tiếng Anh cùng AI",
    description:
      "Cá nhân hóa lộ trình, luyện tập mỗi ngày, kết nối cộng đồng và phát triển bản thân cùng BeaconVie.",
    images: ["/brand/beaconvie-hero-banner.png"],
  },
};

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "BeaconVie",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    description:
      "Nền tảng học tiếng Anh ứng dụng AI với bài kiểm tra trình độ, lộ trình cá nhân hóa, gia sư AI, nhiệm vụ hằng ngày và cộng đồng học tập.",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HomePage />
    </>
  );
}
