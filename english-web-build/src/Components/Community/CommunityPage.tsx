"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuthStore } from "@/src/store/authStore";
import SpiritPetAvatar from "@/src/Components/Pets/SpiritPetAvatar";
import CommunityComposerBox from "./CommunityComposerBox";
import { AppIcon, LegacyIcon } from "@/src/Components/UI/AppIcon";
import AppLogo from "@/src/Components/UI/AppLogo";

type ComposerMode = "post" | "speaking" | "writing" | "word" | "question" | "image" | "poll";

const leftMenu = [
  { icon: "⌂", label: "Bảng tin", active: true },
  { icon: "⌕", label: "Khám phá" },
  { icon: "✣", label: "Bài viết của bạn" },
  { icon: "👥", label: "Bạn bè" },
  { icon: "●", label: "Nhóm" },
  { icon: "▣", label: "Sự kiện" },
  { icon: "?", label: "Hỏi đáp" },
];

const topNav = [
  { label: "Trang chủ", href: "/" },
  { label: "Học tập", href: "/courses" },
  { label: "Đấu trường", href: "/arena" },
  { label: "AI Tutor", href: "/check-writing" },
  { label: "Thư viện", href: "/courses" },
  { label: "Cộng đồng", href: "/community", active: true },
  { label: "Shop", href: "/pet" },
];

const posts = [
  {
    author: "Lan Phương",
    level: "B1",
    time: "2 giờ trước",
    text: "Mình vừa học xong 50 từ vựng chủ đề “Environment”. Chia sẻ với mọi người một số từ mình thấy thú vị nhé! 🌍💚",
    tags: "#Vocabulary #Environment",
    words: [
      ["sustainable", "/səˈsteɪnəbl/", "bền vững, có thể duy trì"],
      ["recycle", "/riːˈsaɪkl/", "tái chế"],
      ["pollution", "/pəˈluːʃn/", "ô nhiễm"],
      ["conserve", "/kənˈsɜːv/", "bảo tồn"],
    ],
    reactions: 128,
    comments: 32,
    shares: 12,
  },
  {
    author: "Hoàng Nam",
    level: "A2",
    time: "4 giờ trước",
    text: "Ai có tips để cải thiện kỹ năng Listening không ạ? Mình nghe mà toàn miss ý chính 🥺",
    tags: "#Listening",
    reactions: 45,
    comments: 21,
  },
  {
    author: "English With Me",
    level: "Giáo viên",
    time: "6 giờ trước",
    text: "🎯 5 cấu trúc câu hữu ích cho người học tiếng Anh mỗi ngày! Lưu lại và luyện tập nhé các bạn ❤️",
    tags: "",
    image: true,
    reactions: 256,
    comments: 18,
    shares: 45,
  },
];

export default function CommunityPage() {
  const user = useAuthStore((state) => state.user);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [mode, setMode] = useState<ComposerMode>("post");
  const displayName = user?.fullname || "Minh Anh";
  const avatar = user?.avatar || "/avatar-default.png";

  if (isComposerOpen) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[#f8f7ff] text-[#121735]">
        <div className="mx-auto flex max-w-[1920px]">
          <ComposerSidebar onPost={() => setIsComposerOpen(false)} />
          <section className="min-w-0 flex-1">
            <TopBar displayName={displayName} avatar={avatar} />
            <div className="grid gap-5 p-4 lg:p-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
              <CommunityComposerBox mode={mode} setMode={setMode} onClose={() => setIsComposerOpen(false)} />
              <ComposerRightPanel displayName={displayName} avatar={avatar} />
            </div>
          </section>
        </div>
      </main>
    );
  }

  const openComposer = (nextMode: ComposerMode = "post") => {
    setMode(nextMode);
    setIsComposerOpen(true);
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f7ff] text-[#121735]">
      <div className="mx-auto flex max-w-[1920px]">
        <CommunitySidebar onPost={() => openComposer("post")} />
        <section className="min-w-0 flex-1">
          <TopBar displayName={displayName} avatar={avatar} />
          <div className="grid gap-5 p-4 lg:p-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="min-w-0 space-y-4">
              <ComposerPreview avatar={avatar} onOpen={openComposer} />
              <FeedTabs />
              {posts.map((post, index) => <PostCard key={`${post.author}-${index}`} post={post} />)}
            </section>
            <aside className="space-y-5">
              <TrendingPanel />
              <GroupsPanel />
              <EventPanel />
              <SuggestionsPanel />
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function CommunitySidebar({ onPost }: { onPost: () => void }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[270px] shrink-0 overflow-y-auto border-r border-[#e7e8f3] bg-white px-4 py-5 2xl:block">
      <AppLogo />
      <nav className="mt-7 space-y-1">
        {leftMenu.map((item) => (
          <button key={item.label} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-black ${item.active ? "bg-[#efe9ff] text-[#652cff]" : "text-[#69708b] hover:bg-[#f5f2ff]"}`}>
            <LegacyIcon icon={item.icon} label={item.label} tone={item.active ? "purple" : "slate"} className="h-8 w-8" size={16} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <button onClick={onPost} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#6d35ff] px-4 py-3 font-black text-white shadow-[0_16px_32px_rgba(109,53,255,0.24)]">
        <AppIcon name="plus" tone="purple" size={18} bare /> Tạo bài viết
      </button>
      <section className="mt-5 rounded-2xl bg-[#f4f0ff] p-4 text-center shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-black">Foxy</h3>
          <span className="rounded-lg bg-[#e0d4ff] px-2 py-1 text-xs font-black text-[#6d35ff]">Lv.12</span>
        </div>
        <SpiritPetAvatar petType="fox" level={12} size="md" showLevelBadge={false} />
        <div className="mt-2 h-1.5 rounded-full bg-[#e4e6f2]"><div className="h-1.5 w-[55%] rounded-full bg-[#6d35ff]" /></div>
        <Link href="/pet" className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-[#d9ceff] bg-white px-4 py-3 text-sm font-black text-[#6d35ff]">Vào nhà Foxy <AppIcon name="home" tone="purple" size={14} bare /></Link>
      </section>
      <OnlineFriends />
    </aside>
  );
}

function ComposerSidebar({ onPost }: { onPost: () => void }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[270px] shrink-0 overflow-y-auto border-r border-[#e7e8f3] bg-white px-4 py-5 2xl:block">
      <AppLogo />
      <nav className="mt-7 space-y-1">
        {[
          ["⌂", "Bảng tin"],
          ["⌕", "Khám phá"],
          ["✣", "Bài viết của bạn"],
          ["👥", "Nhóm của bạn"],
          ["👥", "Khám phá nhóm"],
          ["+", "Tạo nhóm mới"],
          ["▣", "Sự kiện"],
          ["?", "Sự kiện của bạn"],
        ].map(([icon, label]) => (
          <button key={label} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-black text-[#69708b] hover:bg-[#f5f2ff]">
            <LegacyIcon icon={icon} label={label} tone="slate" className="h-8 w-8" size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <button onClick={onPost} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#6d35ff] px-4 py-3 font-black text-white shadow-[0_16px_32px_rgba(109,53,255,0.24)]">
        <AppIcon name="plus" tone="purple" size={18} bare /> Tạo bài viết
      </button>
      <section className="mt-8 rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-[#e8e9f5]">
        <div className="mx-auto flex justify-center"><AppIcon name="paw" tone="orange" className="h-24 w-24 rounded-[28px]" size={52} /></div>
        <h3 className="mt-4 font-black">Chia sẻ để lan tỏa</h3>
        <p className="mt-3 text-sm font-bold leading-6 text-[#69708b]">Kiến thức của bạn hôm nay có thể giúp ai đó tiến bộ!</p>
      </section>
    </aside>
  );
}

function ComposerRightPanel({ displayName, avatar }: { displayName: string; avatar: string }) {
  return (
    <aside className="space-y-5">
      <RightPanel title="💡 Mẹo đăng bài">
        {["Tiêu đề rõ ràng, hấp dẫn", "Nội dung hữu ích, dễ hiểu", "Sử dụng chủ đề phù hợp", "Tôn trọng mọi thành viên", "Kiểm tra lỗi chính tả trước khi đăng"].map((tip) => (
          <div key={tip} className="flex items-center gap-3 py-2 text-sm font-bold text-[#59627f]">
            <span className="text-[#6d35ff]">ⓘ</span>
            {tip}
          </div>
        ))}
      </RightPanel>
      <RightPanel title="Xem trước bài viết">
        <div className="flex items-center gap-3">
          <img src={avatar} alt={displayName} className="h-12 w-12 rounded-full object-cover" />
          <div>
            <h3 className="font-black">{displayName}</h3>
            <p className="text-xs font-bold text-[#69708b]">🌐 Công khai · vừa xong</p>
          </div>
        </div>
        <h3 className="mt-5 font-black">Tiêu đề bài viết của bạn</h3>
        <p className="mt-3 text-sm font-bold leading-6 text-[#59627f]">Đây là nội dung bài viết của bạn sẽ hiển thị trên bảng tin cộng đồng...</p>
        <div className="mt-5 flex h-36 items-center justify-center rounded-2xl bg-[#f1eaff] text-6xl text-[#c7b9ff]">▧</div>
        <div className="mt-5 flex items-center justify-between text-sm font-bold text-[#59627f]">
          <span>♡ 128</span>
          <span>▢ 32</span>
          <span>↗ Chia sẻ</span>
        </div>
      </RightPanel>
      <RightPanel title="🛡 Quy định cộng đồng">
        <p className="text-sm font-bold leading-7 text-[#69708b]">Hãy cùng xây dựng một môi trường học tập lành mạnh và tích cực.</p>
        <button className="mt-4 font-black text-[#6d35ff]">Xem chi tiết quy định →</button>
      </RightPanel>
    </aside>
  );
}

function TopBar({ displayName, avatar }: { displayName: string; avatar: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e7e8f3] bg-white/90 px-4 py-2.5 backdrop-blur">
      <div className="flex items-center gap-3">
        <AppLogo compact className="2xl:hidden" />
        <nav className="hidden flex-1 items-center justify-center gap-1.5 xl:flex">
          {topNav.map((item) => <Link key={item.label} href={item.href} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black ${item.active ? "bg-[#efe9ff] text-[#652cff]" : "text-[#303956] hover:bg-[#f5f2ff]"}`}>{item.label}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <TopPill icon="🔥" value={18} label="Streak" />
          <TopPill icon="💎" value="5.230" label="Xu" />
          <TopPill icon="🪙" value="2.450" label="Coins" />
          <button className="hidden rounded-xl border border-[#e5e7f2] bg-white px-3 py-2 text-xs font-black sm:block"><AppIcon name="gift" tone="purple" size={16} bare /></button>
          <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e7f2] bg-white text-sm"><AppIcon name="bell" tone="yellow" size={16} bare /><span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white">3</span></button>
          <Link href="/profile" className="hidden items-center gap-2 rounded-2xl px-2 py-1.5 hover:bg-[#f5f2ff] sm:flex">
            <img src={avatar} alt={displayName} className="h-9 w-9 rounded-full object-cover" />
            <span className="leading-tight"><span className="block text-[13px] font-black">{displayName}</span><span className="block text-[11px] font-bold text-[#69708b]">Level 18</span></span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function TopPill({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return <div className="hidden items-center gap-2 rounded-xl border border-[#e8e9f5] bg-white px-3 py-2 shadow-sm lg:flex"><LegacyIcon icon={icon} label={label} tone={label === "Streak" ? "orange" : label === "Xu" ? "cyan" : "yellow"} size={16} /><span className="leading-tight"><span className="block text-xs font-black">{value}</span><span className="block text-[10px] font-bold text-[#69708b]">{label}</span></span></div>;
}

function ComposerPreview({ avatar, onOpen }: { avatar: string; onOpen: (mode?: ComposerMode) => void }) {
  return (
    <section className="rounded-2xl border border-[#e8e9f5] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <img src={avatar} alt="Bạn" className="h-14 w-14 rounded-full object-cover" />
        <button onClick={() => onOpen("post")} className="flex-1 rounded-2xl border border-[#e8e9f5] px-5 py-4 text-left font-bold text-[#8b91aa] hover:border-[#6d35ff]">Bạn muốn chia sẻ điều gì hôm nay?</button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {[
          ["✎ Viết bài", "post"],
          ["🖼 Ảnh", "image"],
          ["✦ Từ mới", "word"],
          ["☑ Check bài", "writing"],
          ["⊕ Hỏi đáp", "question"],
          ["▥ Thăm dò", "poll"],
        ].map(([label, itemMode]) => <button key={label} onClick={() => onOpen(itemMode as ComposerMode)} className="rounded-xl px-3 py-2 text-sm font-black text-[#59627f] hover:bg-[#f5f2ff]">{label}</button>)}
        <button className="ml-auto rounded-xl border border-[#e8e9f5] px-4 py-2 text-sm font-black">🌐 Công khai</button>
        <button onClick={() => onOpen("post")} className="rounded-xl bg-[#6d35ff] px-5 py-3 text-sm font-black text-white">Đăng bài</button>
      </div>
    </section>
  );
}

function FeedTabs() {
  return <section className="flex items-center rounded-2xl border border-[#e8e9f5] bg-white p-2 shadow-sm"><div className="grid flex-1 grid-cols-4 text-center text-sm font-black text-[#69708b]">{["Tất cả", "Đang theo dõi", "Thịnh hành", "Gần đây"].map((tab, index) => <button key={tab} className={`rounded-xl px-4 py-3 ${index === 0 ? "bg-[#efe9ff] text-[#652cff]" : "hover:bg-[#f5f2ff]"}`}>{tab}</button>)}</div><button className="ml-2 rounded-xl border border-[#e8e9f5] px-4 py-3">☷</button></section>;
}

function PostCard({ post }: { post: any }) {
  return (
    <article className="rounded-2xl border border-[#e8e9f5] bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#dbeafe] to-[#fde68a] text-2xl">👩</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><h3 className="font-black">{post.author}</h3><span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-700">{post.level}</span></div>
          <p className="text-xs font-bold text-[#69708b]">{post.time}</p>
        </div>
        <button className="text-[#69708b]">•••</button>
      </div>
      <p className="mt-4 whitespace-pre-line text-[15px] font-bold leading-7">{post.text}</p>
      {post.tags && <p className="mt-3 font-black text-[#4f20dc]">{post.tags}</p>}
      {post.words && <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{post.words.map((word: string[]) => <div key={word[0]} className="rounded-xl border border-[#e8e9f5] p-4"><h4 className="font-black text-emerald-700">{word[0]} ✦</h4><p className="mt-1 text-sm font-bold text-[#69708b]">{word[1]}</p><p className="mt-1 text-sm font-bold">{word[2]}</p></div>)}</div>}
      {post.image && <div className="mt-4 overflow-hidden rounded-2xl bg-[#ffdfad] p-5"><div className="flex items-center gap-4"><div className="text-7xl">👩‍🏫</div><div className="flex-1"><h3 className="text-3xl font-black text-[#b45309]">5 USEFUL SENTENCE PATTERNS</h3><div className="mt-4 grid grid-cols-5 gap-2 text-center text-sm font-black">{["It's + adj + to V", "I used to + V", "I wish + ...", "The more + ...", "Not only + ..."].map((item, index) => <div key={item} className="rounded-xl bg-white p-3">{index + 1}. {item}</div>)}</div></div></div></div>}
      <div className="mt-5 flex items-center gap-4 text-sm font-bold text-[#59627f]"><span>🔵 ❤️ 😄 {post.reactions}</span><span className="ml-auto">{post.comments} bình luận</span>{post.shares && <span>{post.shares} chia sẻ</span>}</div>
    </article>
  );
}

function RightPanel({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#e8e9f5] bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="font-black">{title}</h2>{action && <button className="text-xs font-black text-[#6d35ff]">{action}</button>}</div>{children}</section>;
}

function TrendingPanel() {
  const items = ["Cách ghi nhớ từ vựng hiệu quả", "Tips luyện Speaking mỗi ngày", "Tài liệu IELTS miễn phí", "Ngữ pháp: Thì hiện tại hoàn thành", "Ứng dụng học tiếng Anh tốt nhất"];
  return <RightPanel title="🔥 Thịnh hành" action="Xem tất cả">{items.map((item, index) => <div key={item} className="flex gap-3 py-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-black text-amber-700">{index + 1}</span><div><h3 className="text-sm font-black">{item}</h3><p className="text-xs font-bold text-[#69708b]">{123 - index * 12} bài viết</p></div></div>)}</RightPanel>;
}

function GroupsPanel() {
  const groups = [["IELTS Fighter", "12.6K thành viên"], ["English Speaking Club", "8.3K thành viên"], ["Từ vựng mỗi ngày", "15.2K thành viên"], ["Exam Preparation", "6.7K thành viên"]];
  return <RightPanel title="Nhóm nổi bật" action="Xem tất cả">{groups.map(([name, count], index) => <div key={name} className="flex items-center gap-3 py-2"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f4f0ff] text-2xl">{["🏅", "🎙", "📚", "🧾"][index]}</span><div className="min-w-0 flex-1"><h3 className="text-sm font-black">{name}</h3><p className="text-xs font-bold text-[#69708b]">{count}</p></div><button className="rounded-xl border border-[#d9ceff] px-4 py-2 text-xs font-black text-[#6d35ff]">Tham gia</button></div>)}</RightPanel>;
}

function EventPanel() {
  return <RightPanel title="Sự kiện sắp diễn ra" action="Xem tất cả"><div className="flex items-center gap-4"><div className="flex-1"><h3 className="font-black">Arena Championship #12</h3><p className="mt-1 text-sm font-bold text-[#69708b]">Thi đấu & nhận thưởng hấp dẫn!</p><p className="mt-3 text-xs font-bold text-[#69708b]">📅 25/06/2026 • 20:00</p><p className="mt-1 text-xs font-bold text-[#69708b]">👥 1.2K người tham gia</p><button className="mt-4 rounded-xl border border-[#6d35ff] px-5 py-2 text-sm font-black text-[#6d35ff]">Đăng ký ngay</button></div><div className="text-7xl">🏆</div></div></RightPanel>;
}

function SuggestionsPanel() {
  return <RightPanel title="Gợi ý cho bạn" action="Xem tất cả">{[["Quốc Bảo", "B1 • 356 bài viết"], ["Thảo Vy", "A2 • 278 bài viết"], ["Mr. David", "Giáo viên • 1.3K bài viết"]].map(([name, desc], index) => <div key={name} className="flex items-center gap-3 py-2"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#dbeafe] to-[#fde68a] text-xl">{["👩", "👨", "👨‍🏫"][index]}</span><div className="min-w-0 flex-1"><h3 className="text-sm font-black">{name}</h3><p className="text-xs font-bold text-[#69708b]">{desc}</p></div><button className="rounded-xl border border-[#d9ceff] px-4 py-2 text-xs font-black text-[#6d35ff]">Theo dõi</button></div>)}</RightPanel>;
}

function OnlineFriends() {
  const friends = [["Lan Phương", "Đang học"], ["Hoàng Nam", "Trong phòng Arena"], ["Tuấn Kiệt", "Đang luyện Speaking"], ["Khánh Linh", "Online"]];
  return <section className="mt-5"><div className="flex items-center justify-between text-sm font-black"><h3>Bạn bè online • <span className="text-emerald-600">12</span></h3><button className="text-xs text-[#6d35ff]">Xem tất cả</button></div><div className="mt-3 space-y-3">{friends.map(([name, status], index) => <div key={name} className="flex items-center gap-3"><span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#dbeafe] to-[#fde68a] text-xl">{["👩", "👨", "👨", "👩"][index]}<span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" /></span><div><p className="text-xs font-black">{name}</p><p className="text-[11px] font-bold text-[#69708b]">{status}</p></div></div>)}</div></section>;
}
