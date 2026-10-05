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
      { "@type": "FAQPage", mainEntity: page.faqs?.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) },
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
        <section className="mx-auto max-w-6xl px-5 pb-16 md:pb-24">
          <div className="BeaconVie-card p-7 md:p-10">
            <p className="font-bold text-[var(--BeaconVie-primary)]">Học thử không cần đăng nhập</p>
            <h2 className="mt-2 text-2xl font-black md:text-3xl">{page.lesson.title}</h2>
            <p className="mt-4 max-w-3xl leading-7 text-[var(--BeaconVie-muted)]">{page.lesson.explanation}</p>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {page.lesson.examples.map((example) => <div key={example} className="rounded-2xl border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card-soft)] p-4 font-semibold">{example}</div>)}
            </div>
            <div className="mt-7 rounded-2xl border border-[var(--BeaconVie-border)] p-5">
              <p className="font-black">Thử ngay</p><p className="mt-2">{page.lesson.practice}</p>
              <details className="mt-4"><summary className="cursor-pointer font-bold text-[var(--BeaconVie-primary)]">Xem đáp án / gợi ý</summary><p className="mt-3 text-[var(--BeaconVie-muted)]">{page.lesson.answer}</p></details>
            </div>
            <p className="mt-6 text-sm text-[var(--BeaconVie-muted)]">Không cần tài khoản để đọc và làm bài mẫu. Đăng nhập khi bạn muốn lưu tiến độ, nhận lộ trình cá nhân hóa hoặc dùng phản hồi AI.</p>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-5 pb-16 md:pb-24">
          <div className="grid gap-8 lg:grid-cols-2">
            <div><p className="font-bold text-[var(--BeaconVie-primary)]">Học thế nào để không bị lan man?</p><h2 className="mt-2 text-2xl font-black md:text-3xl">Một cách học bạn có thể áp dụng ngay hôm nay</h2><ol className="mt-6 space-y-4">{page.guide?.map((item,index)=><li key={item} className="BeaconVie-card flex gap-4 p-5"><span className="font-black text-[var(--BeaconVie-primary)]">0{index+1}</span><span className="leading-7">{item}</span></li>)}</ol></div>
            <div><p className="font-bold text-[var(--BeaconVie-primary)]">CEFR A1 → C1</p><h2 className="mt-2 text-2xl font-black md:text-3xl">Chọn độ khó trước khi học nhiều hơn</h2><p className="mt-4 leading-7 text-[var(--BeaconVie-muted)]">A1–A2 ưu tiên nền tảng và tình huống quen thuộc. B1–B2 tăng khả năng hiểu và diễn đạt độc lập. C1 tập trung độ chính xác, sắc thái và nội dung phức tạp.</p><Link href="/kiem-tra-trinh-do-tieng-anh" className="BeaconVie-button-primary mt-6 inline-flex">Xem bài kiểm tra CEFR</Link><Link href="/tai-lieu-tieng-anh" className="BeaconVie-button-soft ml-3 mt-6 inline-flex">Kho tài liệu miễn phí</Link></div>
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
        <section className="mx-auto max-w-6xl px-5 py-16 md:py-20"><h2 className="text-2xl font-black md:text-3xl">Câu hỏi thường gặp</h2><div className="mt-6 grid gap-4">{page.faqs?.map(item=><details key={item.q} className="BeaconVie-card p-5"><summary className="cursor-pointer font-black">{item.q}</summary><p className="mt-3 leading-7 text-[var(--BeaconVie-muted)]">{item.a}</p></details>)}</div><div className="mt-10 rounded-3xl bg-[var(--BeaconVie-primary)] p-7 text-white md:p-10"><p className="font-bold opacity-90">Đã học thử xong?</p><h2 className="mt-2 text-2xl font-black md:text-4xl">Tiếp tục theo lộ trình và lưu tiến độ của bạn</h2><p className="mt-3 max-w-2xl opacity-90">Tạo tài khoản khi bạn muốn BeaconVie nhớ trình độ, bài đã học, streak và gợi ý bài tiếp theo.</p><Link href={`/login?redirect=${encodeURIComponent(page.appPath)}`} className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 font-black text-[var(--BeaconVie-primary)]">Tiếp tục học miễn phí</Link></div></section>
      </article>
    </main>
  );
}
