"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import {resources,resourceLevels,resourceSkills} from "@/src/resources/catalog";

const topics=["Tất cả",...Array.from(new Set(resources.map(r=>r.topic)))];
const media=[
 "https://images.pexels.com/photos/8199257/pexels-photo-8199257.jpeg?auto=compress&cs=tinysrgb&w=1400",
 "https://images.pexels.com/photos/7777716/pexels-photo-7777716.jpeg?auto=compress&cs=tinysrgb&w=900",
 "https://images.pexels.com/photos/6281030/pexels-photo-6281030.jpeg?auto=compress&cs=tinysrgb&w=900",
 "https://images.pexels.com/photos/8199759/pexels-photo-8199759.jpeg?auto=compress&cs=tinysrgb&w=900"
];
const topicMeta:Record<string,{label:string;hint:string}>={
 "Phương pháp học":{label:"Học hiệu quả",hint:"Ghi nhớ và xây thói quen"},
 "Giao tiếp":{label:"Giao tiếp",hint:"Nghe, nói trong tình huống thật"},
 "Nền tảng":{label:"Nền tảng",hint:"Ngữ pháp và kiến thức cốt lõi"},
 "Kỹ năng học":{label:"Đọc & viết",hint:"Hiểu ý và diễn đạt rõ"},
 "Lộ trình":{label:"Lộ trình CEFR",hint:"Học đúng thứ tự, đúng mục tiêu"},
};

export default function ResourceLibrary(){
 const [query,setQuery]=useState(""); const [skill,setSkill]=useState("Tất cả"); const [level,setLevel]=useState("Tất cả"); const [topic,setTopic]=useState("Tất cả");
 const visible=useMemo(()=>resources.filter(r=>(skill==="Tất cả"||r.skill===skill)&&(level==="Tất cả"||r.level===level)&&(topic==="Tất cả"||r.topic===topic)&&(!query||[r.title,r.description,r.topic,...r.keywords].join(" ").toLowerCase().includes(query.toLowerCase()))),[query,skill,level,topic]);
 const featured=resources.filter(r=>r.featured).slice(0,4);
 const reset=()=>{setQuery("");setSkill("Tất cả");setLevel("Tất cả");setTopic("Tất cả")};
 return <div className="bg-white text-slate-950">
  <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-5 md:pt-14">
   <div className="relative overflow-hidden rounded-[28px] border border-blue-100 bg-[radial-gradient(circle_at_85%_20%,rgba(14,165,233,.16),transparent_28%),linear-gradient(135deg,#eff6ff_0%,#fff_54%,#ecfeff_100%)] px-5 py-9 shadow-[0_24px_70px_rgba(30,94,255,.10)] sm:px-8 md:rounded-[36px] md:px-12 md:py-14">
    <div className="relative z-10 max-w-4xl">
     <div className="inline-flex rounded-full border border-blue-200 bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[.14em] text-blue-700">BeaconVie Resource Library</div>
     <h1 className="mt-4 text-[36px] font-black leading-[1.05] tracking-[-.035em] sm:text-5xl md:text-[64px]">Học đúng tài liệu.<br/><span className="text-[var(--BeaconVie-primary)]">Tiến bộ đúng mục tiêu.</span></h1>
     <p className="mt-5 max-w-xl text-base leading-7 text-slate-700 md:text-lg md:leading-8">Kho tài liệu tiếng Anh được tuyển chọn cho người Việt theo CEFR, kỹ năng và mục tiêu học. Đọc miễn phí, rồi tiếp tục luyện tập ngay trên BeaconVie.</p>
     <label className="mt-7 flex max-w-3xl items-center gap-2 rounded-2xl border border-blue-100 bg-white p-2 shadow-[0_12px_35px_rgba(37,99,235,.12)]" aria-label="Tìm tài liệu">
      <span className="pl-3 text-lg text-slate-400" aria-hidden="true">⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm outline-none sm:text-base" placeholder="Tìm: luyện nghe A2, phrasal verbs, Present Simple…"/>
      <button type="button" className="rounded-xl bg-[var(--BeaconVie-primary)] px-4 py-3 text-sm font-black text-white sm:px-6">Tìm tài liệu</button>
     </label>
     <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-slate-600 sm:text-sm"><span>✓ Theo chuẩn CEFR</span><span>✓ Học ngay trên BeaconVie</span><span>✓ Nguồn tham khảo rõ ràng</span></div>
    </div>
   </div>
  </section>

  <section className="mx-auto max-w-7xl px-4 py-9 sm:px-5 md:py-12">
   <div className="grid gap-3 sm:grid-cols-3">
    {[["01","Chọn đúng trình độ","A1 → C1, không học lan man"],["02","Tập trung đúng kỹ năng","Nghe, nói, đọc, viết, từ vựng"],["03","Học rồi thực hành","Nối tài liệu vào bài luyện BeaconVie"]].map(([n,t,d])=><div key={n} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:p-5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-xs font-black text-blue-700">{n}</span><div><h2 className="font-black">{t}</h2><p className="mt-1 text-sm leading-5 text-slate-500">{d}</p></div></div>)}
   </div>
  </section>

  <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-5">
   <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-sm font-black text-blue-700">KHÁM PHÁ THEO MỤC TIÊU</p><h2 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">Chủ đề nổi bật</h2></div><button onClick={()=>setTopic("Tất cả")} className="hidden text-sm font-bold text-blue-700 sm:block">Xem tất cả</button></div>
   <div className="flex snap-x gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-5 md:overflow-visible">
    {topics.filter(x=>x!=="Tất cả").map((x,i)=>{const m=topicMeta[x]||{label:x,hint:"Tài liệu được tuyển chọn"}; return <button key={x} onClick={()=>setTopic(x)} className={"min-w-[210px] snap-start rounded-3xl border p-5 text-left transition md:min-w-0 "+(topic===x?"border-blue-500 bg-blue-50 shadow-sm":"border-slate-200 bg-white hover:border-blue-200")}><span className="text-xs font-black text-blue-700">0{i+1}</span><h3 className="mt-6 text-lg font-black">{m.label}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{m.hint}</p></button>})}
   </div>
  </section>

  <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-5">
   <div className="mb-5 flex items-end justify-between"><div><p className="text-sm font-black text-blue-700">BẮT ĐẦU NHANH</p><h2 className="mt-1 text-2xl font-black md:text-3xl">Tài liệu nổi bật</h2></div><span className="text-sm text-slate-500">{resources.length} tài liệu tuyển chọn</span></div>
   <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{featured.map((r,i)=><Link href={"/tai-lieu-tieng-anh/"+r.slug} key={r.slug} className="group flex min-h-[255px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-xl">
    <div className={"h-2 "+(i%2===0?"bg-blue-500":"bg-cyan-500")}/><div className="flex flex-1 flex-col p-5"><div className="flex items-center justify-between text-xs font-black"><span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{r.skill}</span><span className="text-slate-500">{r.level} · {r.minutes} phút</span></div><h3 className="mt-4 text-lg font-black leading-snug group-hover:text-blue-700">{r.title}</h3><p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{r.description}</p><p className="mt-auto pt-5 text-sm font-black text-blue-700">Đọc tiếp miễn phí →</p></div>
   </Link>)}</div>
  </section>

  <section className="border-y border-slate-200 bg-slate-50/80"><div className="mx-auto max-w-7xl px-4 py-10 sm:px-5 md:py-12">
   <div className="mb-6 flex items-end justify-between gap-3"><div><p className="text-sm font-black text-blue-700">THƯ VIỆN</p><h2 className="mt-1 text-2xl font-black md:text-3xl">Tất cả tài liệu</h2></div><span className="text-sm font-bold text-slate-500">{visible.length} kết quả</span></div>
   <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
    <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible"><span className="hidden self-center pr-1 text-xs font-black uppercase tracking-wide text-slate-400 lg:inline">CEFR</span>{resourceLevels.map(x=><button key={x} onClick={()=>setLevel(x)} className={"shrink-0 rounded-xl border px-3 py-2 text-sm font-bold "+(level===x?"border-blue-600 bg-blue-600 text-white":"border-slate-200 bg-white text-slate-700")}>{x}</button>)}</div>
    <div className="mt-3 flex gap-2 overflow-x-auto border-t border-slate-100 pt-3 lg:flex-wrap lg:overflow-visible"><span className="hidden self-center pr-1 text-xs font-black uppercase tracking-wide text-slate-400 lg:inline">Kỹ năng</span>{resourceSkills.map(x=><button key={x} onClick={()=>setSkill(x)} className={"shrink-0 rounded-xl border px-3 py-2 text-sm font-bold "+(skill===x?"border-blue-600 bg-blue-600 text-white":"border-slate-200 bg-white text-slate-700")}>{x}</button>)}</div>
   </div>
   <div className="grid gap-5 lg:grid-cols-[1fr_270px]">
    <div className="grid gap-4 md:grid-cols-2">{visible.map(r=><article key={r.slug} className="group flex min-h-[245px] flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-lg md:p-6"><div className="flex items-center justify-between gap-3"><div className="flex gap-2 text-xs font-black text-blue-700"><span className="rounded-full bg-blue-50 px-2.5 py-1">{r.level}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{r.skill}</span></div><span className="text-xs font-bold text-slate-400">{r.minutes} phút đọc</span></div><h3 className="mt-4 text-xl font-black leading-snug group-hover:text-blue-700">{r.title}</h3><p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{r.description}</p><div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500"><span>Nguồn: <b className="text-slate-700">{r.sourceName}</b></span><Link href={"/tai-lieu-tieng-anh/"+r.slug} className="text-sm font-black text-blue-700">Xem chi tiết →</Link></div></article>)}</div>
    <aside className="order-first lg:order-last"><div className="rounded-3xl bg-[#0f2f68] p-6 text-white lg:sticky lg:top-6"><span className="text-xs font-black uppercase tracking-[.14em] text-blue-200">BeaconVie Learning</span><h3 className="mt-3 text-xl font-black">Đọc xong, hãy biến kiến thức thành kỹ năng.</h3><p className="mt-3 text-sm leading-6 text-blue-100">Đăng nhập để lưu tài liệu, luyện tập và nối nội dung vào lộ trình cá nhân.</p><Link href="/login?redirect=%2Ftai-lieu-tieng-anh" className="mt-5 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-black text-blue-800">Đăng nhập để học tiếp →</Link></div></aside>
   </div>
   {visible.length===0&&<div className="rounded-3xl border bg-white p-10 text-center"><b>Chưa tìm thấy tài liệu phù hợp.</b><p className="mt-2 text-sm text-slate-500">Thử đổi từ khóa hoặc bỏ bớt bộ lọc.</p><button onClick={reset} className="mt-4 font-black text-blue-700">Xóa bộ lọc</button></div>}
  </div></section>
 </div>
}