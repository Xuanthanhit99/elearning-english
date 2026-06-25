// src/Components/Profile/ProfilePage.tsx
"use client";

import Image from "next/image";
import { useAuthStore } from "@/src/store/authStore";
import { useEffect, useState } from "react";
import { api } from "@/src/lib/axios";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const [userWordHistory, setUserHistory] = useState(null);
  const [userWritingHistory, setWritingHistory] = useState(null);
  useEffect(() => {
    const getMe = async () => {
      try {
        const resWords = await api.get("/words/history");
        const resWriting = await api.get("/writing/history");

        if (resWords.statusText === "OK") {
          setUserHistory(resWords.data);
        }

        if (resWriting.statusText === "OK") {
          setWritingHistory(resWriting.data);
        }
      } catch (error) {
        console.log("writing", error);
      }
    };

    getMe();
  }, [user]);

  return (
    <main className="min-h-screen bg-[#fff4e8] px-4 py-10">
      <section className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <ProfileCard user={user} />
          <PersonalInfo user={user} />
        </div>

        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <ProgressCard />
            <StatsCard />
          </div>

          <CoursesProgress />
          <ToolHistory
            userWordHistory={userWordHistory}
            userWritingHistory={userWritingHistory}
          />
        </div>
      </section>
    </main>
  );
}

function ProfileCard({ user }: { user: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [fullname, setFullname] = useState(user?.fullname || "");
  const [avatarPreview, setAvatarPreview] = useState(
    user?.avatar || "/cat-home.jpg",
  );

  useEffect(() => {
    setFullname(user?.fullname || "");
    setAvatarPreview(user?.avatar || "/cat-home.jpg");
  }, [user]);

  const handleChangeAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    // Sau này gọi API upload avatar ở đây
    // const formData = new FormData();
    // formData.append("avatar", file);
    // await api.patch("/users/me/avatar", formData);
  };

  const handleSaveName = async () => {
    setIsEditing(false);

    // Sau này gọi API update tên ở đây
    // await api.patch("/users/me", { fullname });
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1f2a44] to-[#6b5796] p-6 text-white shadow-xl">
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />

      <div className="relative z-10">
        <div className="relative h-28 w-28">
          <Image
            src={avatarPreview}
            alt={fullname || "User"}
            fill
            className="rounded-[24px] border-4 border-white object-cover"
          />

          <label className="absolute -right-2 bottom-2 cursor-pointer rounded-full bg-[#ff6b00] px-3 py-1 text-xs font-extrabold text-white shadow-lg">
            Sửa
            <input
              type="file"
              accept="image/*"
              onChange={handleChangeAvatar}
              className="hidden"
            />
          </label>
        </div>

        <div className="mt-5 flex items-center gap-2">
          {isEditing ? (
            <input
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              className="w-full rounded-xl bg-white px-3 py-2 font-extrabold text-[#1f2a44] outline-none"
            />
          ) : (
            <h1 className="text-2xl font-extrabold">
              {fullname || user?.email || "Người học MiuLingo"}
            </h1>
          )}

          {isEditing ? (
            <button
              type="button"
              onClick={handleSaveName}
              className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-extrabold text-white"
            >
              Lưu
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold text-white"
            >
              Sửa
            </button>
          )}
        </div>

        <p className="mt-2 text-sm leading-6 text-white/80">
          Học viên MiuLingo · mục tiêu giao tiếp tiếng Anh trong công việc.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Badge text="🔥 12 ngày" />
          <Badge text="⭐ Level 03" />
          <Badge text="🎯 A2 - B1" />
        </div>
      </div>
    </div>
  );
}

function PersonalInfo({ user }: { user: any }) {
  return (
    <Card title="Thông tin cá nhân">
      <InfoRow label="Email" value={user?.email || "xuanthanh@example.com"} />
      <InfoRow label="Số điện thoại" value="********89" />
      <InfoRow label="Trình độ" value="A2" />
      <InfoRow label="Mục tiêu" value="Speaking for work" />
    </Card>
  );
}

function ProgressCard() {
  return (
    <Card title="Tiến độ tổng quan" right="Tuần này">
      <div className="flex items-center gap-6">
        <div className="flex h-36 w-36 items-center justify-center rounded-full border-[14px] border-[#ff6b00]">
          <div className="text-center">
            <div className="text-3xl font-extrabold text-[#ff6b00]">76%</div>
            <p className="text-xs font-bold text-[#5b6b85]">hoàn thành</p>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <Progress label="Speaking" value={68} />
          <Progress label="Listening" value={81} />
          <Progress label="Grammar" value={74} />
          <Progress label="Vocabulary" value={86} />
        </div>
      </div>
    </Card>
  );
}

function StatsCard() {
  return (
    <Card title="Thống kê học tập" right="All time">
      <div className="grid grid-cols-2 gap-4">
        <Stat icon="📚" value="18" label="khóa học" />
        <Stat icon="✅" value="126" label="bài đã học" />
        <Stat icon="⭐" value="3.200" label="XP tích lũy" />
        <Stat icon="🏆" value="24" label="thành tích" />
      </div>
    </Card>
  );
}

function CoursesProgress() {
  return (
    <Card title="Khóa học đang học" right="3 khóa">
      <div className="space-y-4">
        <Course
          title="English Starter"
          desc="24/30 bài · còn 6 bài"
          value={82}
        />
        <Course
          title="Speaking Daily"
          desc="12/28 bài · luyện nói hằng ngày"
          value={48}
        />
        <Course
          title="Grammar Clear"
          desc="Hoàn thành · có thể xem lại"
          value={100}
        />
      </div>
    </Card>
  );
}

function ToolHistory({ userWritingHistory, userWordHistory }: any) {
  const [activeTab, setActiveTab] = useState<"all" | "word" | "writing">("all");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [writingHistory, setWritingHistory] = useState<any>([]);

  useEffect(() => {
    const convert = userWritingHistory.map((item: any) => 
       ({ type: item.word.ipa, title: item.word.word, desc: item.word.mainMeaning, tag: "82/100" }),
    )
    // setWritingHistory(convert)
  }, [userWritingHistory])


  const showWord = activeTab === "all" || activeTab === "word";
  const showWriting = activeTab === "all" || activeTab === "writing";

  return (
    <Card title="Lịch sử công cụ" right="Gần đây">
      <div className="mb-5 flex gap-2">
        <TabButton
          active={activeTab === "all"}
          onClick={() => setActiveTab("all")}
        >
          Tất cả
        </TabButton>
        <TabButton
          active={activeTab === "word"}
          onClick={() => setActiveTab("word")}
        >
          Check từ
        </TabButton>
        <TabButton
          active={activeTab === "writing"}
          onClick={() => setActiveTab("writing")}
        >
          Check bài
        </TabButton>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {showWord && (
          <HistoryColumn
            title="🔤 Lịch sử check từ"
            items={userWordHistory}
            onSelect={setSelectedItem}
          />
        )}

        {showWriting && (
          <HistoryColumn
            title="📝 Lịch sử check bài"
            items={userWritingHistory}
            onSelect={setSelectedItem}
          />
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <button className="rounded-full bg-[#1f2a44] px-5 py-3 font-extrabold text-white">
          Xem toàn bộ lịch sử
        </button>
        <button className="rounded-full border border-[#ff6b00] px-5 py-3 font-extrabold text-[#ff6b00]">
          Xuất báo cáo
        </button>
      </div>

      {selectedItem && (
        <HistoryModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </Card>
  );
}
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-5 py-3 font-extrabold ${
        active
          ? "bg-[#1f2a44] text-white"
          : "border border-[#ead8c2] bg-white text-[#1f2a44]"
      }`}
    >
      {children}
    </button>
  );
}

function HistoryColumn({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: any[];
  onSelect: (item: any) => void;
}) {

  return (
    <div>
      <h3 className="mb-3 font-extrabold text-[#1f2a44]">{title}</h3>

      <div className="space-y-3">
        {items?.map((item) => (
          <button
            key={item.word}
            type="button"
            onClick={() => onSelect(item)}
            className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-left transition hover:bg-[#fff4e8] hover:shadow"
          >
            <div>
              <p className="font-extrabold text-[#1f2a44]">{item.word.word}</p>
              <p className="text-xs font-bold text-[#5b6b85]">
                {item.word.ipa}
              </p>
            </div>

            <span className="rounded-full bg-[#fff0dc] px-3 py-1 text-xs font-extrabold text-[#ff6b00]">
              {item.word.mainMeaning}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function HistoryModal({ item, onClose }: { item: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-extrabold text-[#ff6b00]">
              {item.type === "word" ? "Lịch sử check từ" : "Lịch sử check bài"}
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-[#1f2a44]">
              {item.title}
            </h2>
            <p className="mt-2 font-bold text-[#5b6b85]">{item.desc}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-4 py-2 font-extrabold text-[#1f2a44]"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-[#fffaf5] p-5">
          <p className="font-extrabold text-[#1f2a44]">Chi tiết</p>
          <p className="mt-2 leading-7 text-[#5b6b85]">
            Sau này bạn map dữ liệu chi tiết từ API vào đây: nghĩa từ, ví dụ,
            lỗi sai, phiên bản đã sửa, điểm số.
          </p>
        </div>

        <button
          type="button"
          className="mt-6 w-full rounded-2xl bg-[#ff6b00] py-4 font-extrabold text-white"
        >
          Xem lại chi tiết
        </button>
      </div>
    </div>
  );
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[26px] border border-[#ead8c2] bg-white p-6 shadow-[0_24px_70px_rgba(31,42,68,0.06)]">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-[#1f2a44]">{title}</h2>
        {right && (
          <span className="text-xs font-extrabold text-[#5b6b85]">{right}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="rounded-full bg-white/15 px-3 py-2 text-xs font-extrabold">
      {text}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-[#ead8c2] py-3 text-sm font-bold last:border-0">
      <span className="text-[#5b6b85]">{label}</span>
      <span className="text-[#1f2a44]">{value}</span>
    </div>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm font-extrabold text-[#1f2a44]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-[#ff6b00]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-[#ead8c2] bg-[#fffaf5] p-4">
      <div className="text-2xl">{icon}</div>
      <div className="mt-3 text-2xl font-extrabold text-[#ff6b00]">{value}</div>
      <p className="mt-1 text-xs font-extrabold text-[#5b6b85]">{label}</p>
    </div>
  );
}

function Course({
  title,
  desc,
  value,
}: {
  title: string;
  desc: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-[#ead8c2] bg-[#fffaf5] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-[#1f2a44]">{title}</h3>
          <p className="text-xs font-bold text-[#5b6b85]">{desc}</p>
        </div>
        <button className="rounded-full bg-[#1f2a44] px-4 py-2 text-xs font-extrabold text-white">
          Tiếp tục
        </button>
      </div>

      <div className="h-2 rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-[#ff6b00]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
