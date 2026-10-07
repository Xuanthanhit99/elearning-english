import type { Metadata } from "next";
import Link from "next/link";
import { siteUrl } from "@/src/seo/public-pages";

const skills = [
  {name:"Từ vựng",href:"/hoc-tu-vung-tieng-anh",copy:"Học từ trong ngữ cảnh, tạo câu và ôn bằng recall.",tag:"A1 → C1"},
  {name:"Ngữ pháp",href:"/ngu-phap-tieng-anh",copy:"Hiểu quy tắc ngắn rồi dùng ngay trong câu thật.",tag:"A1 → C1"},
  {name:"Nghe",href:"/luyen-nghe-tieng-anh",copy:"Bắt ý chính trước, nghe chi tiết sau và tăng độ khó dần.",tag:"A1 → C1"},
  {name:"Nói",href:"/luyen-noi-tieng-anh",copy:"Luyện prompt ngắn để biến kiến thức thành phản xạ.",tag:"A1 → C1"},
  {name:"Đọc",href:"/luyen-doc-tieng-anh",copy:"Đọc vừa sức, tìm main idea và học từ trong ngữ cảnh.",tag:"A1 → C1"},
  {name:"Viết",href:"/luyen-viet-tieng-anh",copy:"Đi từ câu rõ nghĩa tới đoạn văn có lý do và ví dụ.",tag:"A1 → C1"},
];

const levels = [
  {level:"A1–A2",title:"Xây nền tảng",copy:"Từ vựng thông dụng, câu ngắn, hội thoại quen thuộc và nội dung nghe/đọc vừa sức.",focus:"Từ vựng · Ngữ pháp · Nghe"},
  {level:"B1–B2",title:"Dùng tiếng Anh độc lập",copy:"Tăng độ dài bài đọc/nghe, diễn đạt ý kiến và luyện viết/nói có cấu trúc.",focus:"Đọc · Nghe · Nói · Viết"},
  {level:"C1",title:"Tăng độ chính xác",copy:"Tập trung sắc thái, lập luận, độ tự nhiên và nội dung phức tạp hơn.",focus:"Nói · Viết · Đọc"},
];

const goals = [
  {title:"Tôi chưa biết trình độ",copy:"Bắt đầu bằng CEFR để tránh học quá dễ hoặc quá khó.",href:"/kiem-tra-trinh-do-tieng-anh",cta:"Kiểm tra trình độ"},
  {title:"Tôi muốn học đều mỗi ngày",copy:"Xem cách chia một nhịp học ngắn giữa ôn, input và thực hành.",href:"/hoc-tieng-anh",cta:"Xem lộ trình mẫu"},
  {title:"Tôi muốn học thử ngay",copy:"Chọn một kỹ năng, làm mini lesson public rồi mới quyết định đăng ký.",href:"/luyen-viet-tieng-anh",cta:"Thử một bài viết"},
];

const sources = [
  {name:"British Council LearnEnglish",url:"https://learnenglish.britishcouncil.org/free-resources",meta:"A1–C1+ · 6 kỹ năng",note:"Kho bài học miễn phí được tổ chức theo trình độ và kỹ năng."},
  {name:"Cambridge English — Activities for Learners",url:"https://www.cambridgeenglish.org/learning-english/activities-for-learners/",meta:"A1–C2 · hoạt động ngắn",note:"Có thể lọc bài luyện theo trình độ, kỹ năng và thời lượng."},
  {name:"USA Learns",url:"https://www.usalearns.org/",meta:"Cơ bản → trung cấp",note:"Khóa miễn phí phù hợp người lớn và người cần củng cố nền tảng."},
  {name:"ELLLO",url:"https://elllo.org/",meta:"A1–C1 · Listening",note:"Hội thoại, transcript, vocabulary và quiz cho luyện nghe."},
];

export const metadata: Metadata = {
  title:"Tài liệu học tiếng Anh miễn phí theo CEFR & kỹ năng | BeaconVie",
  description:"Resource Hub tiếng Anh miễn phí của BeaconVie: chọn tài liệu theo CEFR, 6 kỹ năng và mục tiêu, học thử không cần đăng nhập rồi tiếp tục theo lộ trình.",
  alternates:{canonical:`${siteUrl}/tai-lieu-tieng-anh`},
  openGraph:{title:"Resource Hub học tiếng Anh miễn phí | BeaconVie",description:"Chọn tài liệu theo CEFR, kỹ năng và mục tiêu học.",url:`${siteUrl}/tai-lieu-tieng-anh`,siteName:"BeaconVie",locale:"vi_VN",type:"website"},
};

export default function ResourcesPage(){
  const jsonLd={"@context":"https://schema.org","@graph":[
    {"@type":"CollectionPage",name:"Tài liệu học tiếng Anh miễn phí",url:`${siteUrl}/tai-lieu-tieng-anh`,inLanguage:"vi-VN",description:metadata.description,hasPart:skills.map(item=>({"@type":"WebPage",name:`Học ${item.name.toLowerCase()} tiếng Anh`,url:`${siteUrl}${item.href}`}))},
    {"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"BeaconVie",item:siteUrl},{"@type":"ListItem",position:2,name:"Tài liệu học tiếng Anh",item:`${siteUrl}/tai-lieu-tieng-anh`}]}
  ]};
  return <main className="min-h-screen bg-[var(--background)] text-[var(--BeaconVie-ink)]">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>
    <header className="border-b border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)]"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Link href="/" className="text-xl font-black text-[var(--BeaconVie-primary)]">BeaconVie</Link><Link href="/kiem-tra-trinh-do-tieng-anh" className="BeaconVie-button-soft">Kiểm tra trình độ</Link></div></header>
    <article>
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:py-20 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
        <div><p className="font-bold text-[var(--BeaconVie-primary)]">RESOURCE HUB · KHÔNG CẦN ĐĂNG NHẬP</p><h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">Học tiếng Anh đúng thứ bạn cần, ở đúng trình độ</h1><p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--BeaconVie-muted)]">Chọn theo CEFR, kỹ năng hoặc mục tiêu. Mỗi hướng đều có bài học thử public để bạn bắt đầu trước khi tạo tài khoản.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="#chon-theo-ky-nang" className="BeaconVie-button-primary">Khám phá tài liệu</Link><Link href="/kiem-tra-trinh-do-tieng-anh" className="BeaconVie-button-soft">Tôi chưa biết trình độ</Link></div></div>
        <aside className="BeaconVie-card p-7"><p className="text-sm font-black uppercase tracking-wider text-[var(--BeaconVie-primary)]">Bắt đầu trong 3 bước</p><ol className="mt-5 space-y-4">{["Chọn mức CEFR phù hợp","Chọn kỹ năng cần cải thiện","Học thử rồi tiếp tục theo lộ trình"].map((x,i)=><li key={x} className="flex gap-4"><span className="font-black text-[var(--BeaconVie-primary)]">0{i+1}</span><span className="font-semibold">{x}</span></li>)}</ol></aside>
      </section>

      <section id="chon-theo-trinh-do" data-seo-taxonomy="cefr" className="border-y border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)]"><div className="mx-auto max-w-6xl px-5 py-14"><p className="font-bold text-[var(--BeaconVie-primary)]">CEFR A1 → C1</p><h2 className="mt-2 text-2xl font-black md:text-3xl">Chọn theo trình độ</h2><div className="mt-7 grid gap-4 md:grid-cols-3">{levels.map(x=><article key={x.level} className="rounded-3xl border border-[var(--BeaconVie-border)] bg-[var(--background)] p-6"><p className="text-lg font-black text-[var(--BeaconVie-primary)]">{x.level}</p><h3 className="mt-2 text-xl font-black">{x.title}</h3><p className="mt-3 leading-7 text-[var(--BeaconVie-muted)]">{x.copy}</p><p className="mt-4 text-sm font-bold">{x.focus}</p></article>)}</div></div></section>

      <section id="chon-theo-ky-nang" data-seo-taxonomy="skills" className="mx-auto max-w-6xl px-5 py-16"><p className="font-bold text-[var(--BeaconVie-primary)]">6 KỸ NĂNG CỐT LÕI</p><h2 className="mt-2 text-2xl font-black md:text-3xl">Chọn kỹ năng bạn muốn cải thiện</h2><p className="mt-3 max-w-3xl leading-7 text-[var(--BeaconVie-muted)]">Mỗi trang dưới đây là nội dung public độc lập: có hướng dẫn, ví dụ và mini lesson trước khi bạn đi vào learning engine.</p><div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{skills.map(x=><Link data-resource-spoke href={x.href} key={x.href} className="BeaconVie-card group p-6"><div className="flex items-center justify-between"><h3 className="text-xl font-black">{x.name}</h3><span className="text-sm font-bold text-[var(--BeaconVie-primary)]">{x.tag}</span></div><p className="mt-3 leading-7 text-[var(--BeaconVie-muted)]">{x.copy}</p><p className="mt-5 font-black text-[var(--BeaconVie-primary)]">Học thử →</p></Link>)}</div></section>

      <section data-seo-taxonomy="goals" className="mx-auto max-w-6xl px-5 pb-16"><p className="font-bold text-[var(--BeaconVie-primary)]">ĐI THEO MỤC TIÊU</p><h2 className="mt-2 text-2xl font-black md:text-3xl">Nếu bạn chưa biết nên chọn kỹ năng nào</h2><div className="mt-7 grid gap-4 md:grid-cols-3">{goals.map(x=><article key={x.title} className="BeaconVie-card p-6"><h3 className="text-xl font-black">{x.title}</h3><p className="mt-3 leading-7 text-[var(--BeaconVie-muted)]">{x.copy}</p><Link href={x.href} className="BeaconVie-button-soft mt-5 inline-flex">{x.cta}</Link></article>)}</div></section>

      <section className="border-y border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)]"><div className="mx-auto max-w-6xl px-5 py-14"><p className="font-bold text-[var(--BeaconVie-primary)]">NGUỒN THAM KHẢO ĐƯỢC TUYỂN CHỌN</p><h2 className="mt-2 text-2xl font-black md:text-3xl">Học thêm từ các đơn vị uy tín</h2><p className="mt-3 max-w-3xl leading-7 text-[var(--BeaconVie-muted)]">BeaconVie dẫn tới nguồn gốc thay vì sao chép tài liệu có bản quyền. Hãy dùng chúng như input bổ sung cho lộ trình của bạn.</p><div className="mt-7 grid gap-4 md:grid-cols-2">{sources.map(x=><article key={x.name} className="rounded-3xl border border-[var(--BeaconVie-border)] bg-[var(--background)] p-6"><p className="text-sm font-bold text-[var(--BeaconVie-primary)]">{x.meta}</p><h3 className="mt-2 text-lg font-black">{x.name}</h3><p className="mt-2 text-sm leading-6 text-[var(--BeaconVie-muted)]">{x.note}</p><a href={x.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex font-black text-[var(--BeaconVie-primary)]">Mở nguồn chính thức ↗</a></article>)}</div></div></section>

      <section className="mx-auto max-w-6xl px-5 py-16"><div className="rounded-3xl bg-[var(--BeaconVie-primary)] p-7 text-white md:p-10"><p className="font-bold opacity-90">HỌC THỬ TRƯỚC, TẠO TÀI KHOẢN SAU</p><h2 className="mt-2 max-w-3xl text-2xl font-black md:text-4xl">Bắt đầu từ một bài nhỏ thay vì mở quá nhiều tài liệu</h2><p className="mt-3 max-w-2xl leading-7 opacity-90">Nếu chưa biết điểm bắt đầu, kiểm tra CEFR. Nếu đã có mục tiêu, chọn một kỹ năng ở trên và làm mini lesson public ngay.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/kiem-tra-trinh-do-tieng-anh" className="rounded-xl bg-white px-5 py-3 font-black text-[var(--BeaconVie-primary)]">Kiểm tra CEFR</Link><Link href="/luyen-viet-tieng-anh" className="rounded-xl border border-white/40 px-5 py-3 font-black text-white">Học thử Writing</Link></div></div></section>
    </article>
  </main>;
}
