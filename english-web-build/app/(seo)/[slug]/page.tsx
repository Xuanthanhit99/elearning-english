import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { seoPageBySlug, seoPages, siteUrl } from "@/src/seo/public-pages";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return seoPages.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = seoPageBySlug.get(slug);
  if (!page) return {};
  const url = `${siteUrl}/${page.slug}`;
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: { title: page.title, description: page.description, url, siteName: "BeaconVie", locale: "vi_VN", type: "website" },
  };
}

export default async function SeoLandingPage({ params }: Props) {
  const { slug } = await params;
  const page = seoPageBySlug.get(slug);
  if (!page) notFound();
  const url = `${siteUrl}/${page.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", name: page.title, description: page.description, url, inLanguage: "vi-VN", isPartOf: { "@type": "WebSite", name: "BeaconVie", url: siteUrl } },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "BeaconVie", item: siteUrl }, { "@type": "ListItem", position: 2, name: page.heading, item: url }] },
    ],
  };
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--BeaconVie-ink)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="border-b border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="text-xl font-black text-[var(--BeaconVie-primary)]">BeaconVie</Link>
          <Link href="/login" className="BeaconVie-button-soft">Đăng nhập</Link>
        </div>
      </header>
      <article>
        <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:py-24 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <div>
            <p className="mb-4 font-bold text-[var(--BeaconVie-primary)]">{page.eyebrow}</p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">{page.heading}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--BeaconVie-muted)]">{page.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/login?redirect=${encodeURIComponent(page.appPath)}`} className="BeaconVie-button-primary">Bắt đầu miễn phí</Link>
              <Link href="/kiem-tra-trinh-do-tieng-anh" className="BeaconVie-button-soft">Kiểm tra trình độ</Link>
            </div>
          </div>
          <div className="BeaconVie-card p-7 md:p-9">
            <p className="text-sm font-black uppercase tracking-wider text-[var(--BeaconVie-primary)]">Bạn sẽ tập trung vào</p>
            <ul className="mt-6 space-y-4">
              {page.outcomes.map((item) => <li key={item} className="flex gap-3 text-base font-semibold"><span aria-hidden>✓</span><span>{item}</span></li>)}
            </ul>
          </div>
        </section>
        <section className="border-y border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)]">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <h2 className="text-2xl font-black md:text-3xl">Khám phá các kỹ năng khác</h2>
            <nav className="mt-6 flex flex-wrap gap-3" aria-label="Nội dung học tiếng Anh">
              {seoPages.filter((item) => item.slug !== page.slug).map((item) => <Link key={item.slug} href={`/${item.slug}`} className="BeaconVie-button-soft">{item.eyebrow}</Link>)}
            </nav>
          </div>
        </section>
      </article>
    </main>
  );
}
