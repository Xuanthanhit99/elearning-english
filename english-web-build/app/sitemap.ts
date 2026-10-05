import type { MetadataRoute } from "next";
import { seoPages, siteUrl } from "@/src/seo/public-pages";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/tai-lieu-tieng-anh`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    ...seoPages.map(({ slug }) => ({
      url: `${siteUrl}/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: slug === "hoc-tieng-anh" || slug === "kiem-tra-trinh-do-tieng-anh" ? 0.9 : 0.8,
    })),
  ];
}
