import type { MetadataRoute } from "next";
import { seoPages, siteUrl } from "@/src/seo/public-pages";
import { resources } from "@/src/resources/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/tai-lieu-tieng-anh`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    ...resources.map(({slug})=>({url:`${siteUrl}/tai-lieu-tieng-anh/${slug}`,lastModified:new Date(),changeFrequency:"monthly" as const,priority:0.75})),
    ...seoPages.map(({ slug }) => ({
      url: `${siteUrl}/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: slug === "hoc-tieng-anh" || slug === "kiem-tra-trinh-do-tieng-anh" ? 0.9 : 0.8,
    })),
  ];
}
