import type { Metadata } from "next";
import Link from "next/link";
import { siteUrl } from "@/src/seo/public-pages";

const resources = [
 {name:"British Council LearnEnglish",url:"https://learnenglish.britishcouncil.org/free-resources",levels:"A1–C1+",skills:"Nghe · Nói · Đọc · Viết · Ngữ pháp · Từ vựng",note:"Kho bài học tự học miễn phí, nhiều nội dung được tổ chức theo CEFR."},
 {name:"Cambridge English — Activities for Learners",url:"https://www.cambridgeenglish.org/learning-english/activities-for-learners/",levels:"A1–C2",skills:"7 nhóm kỹ năng",note:"Bài luyện ngắn có thể lọc theo trình độ, kỹ năng và thời lượng."},
 {name:"USA Learns",url:"https://www.usalearns.org/",levels:"Cơ bản → trung cấp",skills:"Nghe · Nói · Đọc · Viết · Từ vựng · Phát âm · Ngữ pháp",note:"Các khóa tiếng Anh miễn phí, phù hợp người lớn và người học cần nền tảng."},
 {name:"ELLLO",url:"https://elllo.org/",levels:"A1–C1",skills:"Listening · Vocabulary · Grammar",note:"Thư viện nghe lớn với hội thoại, transcript, vocabulary và quiz ở nhiều bài."},
];

export const metadata: Metadata = {
 title:"Tài liệu học tiếng Anh miễn phí theo trình độ | BeaconVie",
 description:"Kho tài liệu học tiếng Anh miễn phí được BeaconVie tuyển chọn từ các nguồn uy tín, phân loại theo CEFR và kỹ năng để bạn biết nên học gì trước.",
 alternates:{canonical:`${siteUrl}/tai-lieu-tieng-anh`},
 openGraph:{title:"Tài liệu học tiếng Anh miễn phí | BeaconVie",description:"Nguồn học tiếng Anh miễn phí, uy tín, được phân loại theo trình độ và kỹ năng.",url:`${siteUrl}/tai-lieu-tieng-anh`,siteName:"BeaconVie",locale:"vi_VN",type:"website"},
};

export default function ResourcesPage(){
 const jsonLd={"@context":"https://schema.org","@type":"CollectionPage",name:"Tài liệu học tiếng Anh miễn phí",url:`${siteUrl}/tai-lieu-tieng-anh`,inLanguage:"vi-VN",description:metadata.description};
 return <main className="min-h-screen bg-[var(--background)] text-[var(--BeaconVie-ink)]">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>
  <header className="border-b border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)]"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Link href="/" className="text-xl font-black text-[var(--BeaconVie-primary)]">BeaconVie</Link><Link href="/kiem-tra-trinh-do-tieng-anh" className="BeaconVie-button-soft">Kiểm tra trình độ</Link></div></header>
  <article>
   <section className="mx-auto max-w-6xl px-5 py-16 md:py-24"><p className="font-bold text-[var(--BeaconVie-primary)]">Thư viện học tập · Không cần đăng nhập</p><h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">Tài liệu học tiếng Anh miễn phí, chọn đúng theo trình độ</h1><p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--BeaconVie-muted)]">BeaconVie tuyển chọn các nguồn học đáng tin cậy và giúp bạn chọn theo CEFR, kỹ năng và mục tiêu. Nội dung của nguồn bên ngoài vẫn thuộc đơn vị xuất bản; chúng tôi dẫn bạn tới trang gốc thay vì sao chép tài liệu.</p></section>
   <section className="mx-auto max-w-6xl px-5 pb-16"><h2 className="text-2xl font-black md:text-3xl">Nguồn miễn phí được tuyển chọn</h2><div className="mt-7 grid gap-5 md:grid-cols-2">{resources.map(r=><article key={r.name} className="BeaconVie-card p-6"><p className="text-sm font-bold text-[var(--BeaconVie-primary)]">{r.levels}</p><h3 className="mt-2 text-xl font-black">{r.name}</h3><p className="mt-2 font-semibold">{r.skills}</p><p className="mt-3 leading-7 text-[var(--BeaconVie-muted)]">{r.note}</p><a href={r.url} target="_blank" rel="noopener noreferrer" className="BeaconVie-button-soft mt-5 inline-flex">Mở nguồn chính thức ↗</a></article>)}</div></section>
   <section className="border-y border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)]"><div className="mx-auto max-w-6xl px-5 py-14"><h2 className="text-2xl font-black md:text-3xl">Chọn tài liệu theo kỹ năng</h2><p className="mt-3 max-w-3xl text-[var(--BeaconVie-muted)]">Nếu chưa biết bắt đầu ở đâu, kiểm tra trình độ trước. Sau đó dùng các trang hướng dẫn của BeaconVie để học thử và chọn nguồn phù hợp.</p><nav className="mt-6 flex flex-wrap gap-3">{[["Từ vựng","/hoc-tu-vung-tieng-anh"],["Ngữ pháp","/ngu-phap-tieng-anh"],["Nghe","/luyen-nghe-tieng-anh"],["Nói","/luyen-noi-tieng-anh"],["Đọc","/luyen-doc-tieng-anh"],["Viết","/luyen-viet-tieng-anh"]].map(([n,h])=><Link key={h} href={h} className="BeaconVie-button-soft">{n}</Link>)}</nav></div></section>
  </article>
 </main>
}
