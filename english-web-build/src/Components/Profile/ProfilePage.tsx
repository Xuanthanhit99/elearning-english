// src/Components/Profile/ProfilePage.tsx
"use client";

import Image from "next/image";
import { useAuthStore } from "@/src/store/authStore";
import { useEffect, useState } from "react";
import { api } from "@/src/lib/axios";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface WordHistory {
  id: string;
  userId: string;
  wordId: string;
  createdAt: string;
  word: {
    id: string;
    word: string;
    sourceLanguage: string;
    targetLanguage: string;
    level: string;
    ipa: string;
    audio: string;
    partOfSpeech: string;
    definition: string;
    mainMeaning: string;
    shortExplanation: string;
    synonyms: {
      word: string;
      meaning: string;
    }[];
    phrases: {
      phrase: string;
      meaning: string;
    }[];
    examples: {
      source: string;
      target: string;
    }[];
  };
}

export interface WritingHistory {
  id: string;
  userId: string;
  originalText: string;
  detectedLanguage: string;
  style: string;
  level: string;
  score: number;
  grammarScore: number;
  vocabularyScore: number;
  clarityScore: number;
  meaningScore: number;
  summary: string | null;
  corrections: {
    type: string;
    level: string;
    wrong: string;
    correct: string;
    explanation: string;
  }[];
  suggestedVersion: string;
  phrases: string[];
  learningTips: string[];
  miuNote: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const [userWordHistory, setUserHistory] = useState<WordHistory[]>([]);
  const [userWritingHistory, setWritingHistory] = useState<WritingHistory[]>(
    [],
  );
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
  const setUser = useAuthStore((state) => state.setUser);

  const [isEditing, setIsEditing] = useState(false);
  const [fullname, setFullname] = useState(user?.fullname || "");
  const [avatarPreview, setAvatarPreview] = useState(
    user?.avatar || "/cat-home.jpg",
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullname(user?.fullname || "");
    setAvatarPreview(user?.avatar || "/cat-home.jpg");
    setAvatarFile(null);
  }, [user]);

  const handleChangeAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    const oldUser = user;
    const oldFullname = user?.fullname || "";
    const oldAvatar = user?.avatar || "/cat-home.jpg";

    try {
      setSaving(true);

      let updatedUser = oldUser;

      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);

        const avatarRes = await api.patch("/auth/me/avatar", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        updatedUser = {
          ...updatedUser,
          ...avatarRes.data,
        };
      }

      const profileRes = await api.patch("/auth/me/profile", {
        fullname,
      });

      updatedUser = {
        ...updatedUser,
        ...profileRes.data,
      };

      setUser(updatedUser);
      setFullname(updatedUser.fullname || "");
      setAvatarPreview(updatedUser.avatar || "/cat-home.jpg");
      setAvatarFile(null);
      setIsEditing(false);
    } catch (error) {
      console.error(error);

      setUser(oldUser);
      setFullname(oldFullname);
      setAvatarPreview(oldAvatar);
      setAvatarFile(null);

      alert("Cập nhật hồ sơ thất bại. Thông tin đã được giữ nguyên.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFullname(user?.fullname || "");
    setAvatarPreview(user?.avatar || "/cat-home.jpg");
    setAvatarFile(null);
    setIsEditing(false);
  };

  return (
    <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#1f2a44] via-[#4d4378] to-[#6b5796] p-6 text-white shadow-xl">
      {saving && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#1f2a44]/70 backdrop-blur-sm">
          <div className="rounded-2xl bg-white px-5 py-4 text-center font-extrabold text-[#1f2a44] shadow-xl">
            <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[#ff6b00]/30 border-t-[#ff6b00]" />
            Đang cập nhật...
          </div>
        </div>
      )}

      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <div className="absolute right-10 top-16 h-20 w-20 rounded-full bg-[#ff6b00]/20 blur-2xl" />

      <div className="relative z-10">
        <div className="relative mx-auto h-32 w-32">
          <div className="absolute inset-0 animate-pulse rounded-[32px] bg-[#ff6b00]/30 blur-xl" />

          <div className="relative h-full w-full overflow-hidden rounded-[32px] border-4 border-white bg-white shadow-2xl">
            <Image
              src={avatarPreview}
              alt={fullname || "User"}
              fill
              className="object-cover"
            />
          </div>

          {isEditing && (
            <label className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 cursor-pointer items-center gap-1 rounded-full bg-[#ff6b00] px-4 py-2 text-xs font-extrabold text-white shadow-lg transition hover:scale-105">
              📷 Đổi ảnh
              <input
                type="file"
                accept="image/*"
                onChange={handleChangeAvatar}
                disabled={saving}
                className="hidden"
              />
            </label>
          )}
        </div>

        <div className="mt-8 text-center">
          {isEditing ? (
            <input
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              disabled={saving}
              className="w-full rounded-2xl bg-white px-4 py-3 text-center text-xl font-extrabold text-[#1f2a44] outline-none disabled:opacity-70"
              placeholder="Nhập tên của bạn"
            />
          ) : (
            <h1 className="text-2xl font-extrabold">
              {fullname || user?.email || "Người học MiuLingo"}
            </h1>
          )}

          <p className="mt-2 text-sm leading-6 text-white/80">
            Học viên MiuLingo · mục tiêu giao tiếp tiếng Anh trong công việc.
          </p>

          <div className="mt-4 flex justify-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving || !fullname.trim()}
                  className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Đang lưu..." : "Lưu"}
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="rounded-full bg-white/20 px-5 py-2 text-sm font-extrabold text-white disabled:opacity-60"
                >
                  Hủy
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-full bg-white/20 px-5 py-2 text-sm font-extrabold text-white transition hover:bg-white/30"
              >
                ✏️ Sửa hồ sơ
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Badge text="🔥 12 ngày" />
          <Badge text="⭐ Level 03" />
          <Badge text="🎯 A2 - B1" />
        </div>
      </div>
    </div>
  );
}

function PersonalInfo({ user }: { user: any }) {
  const setUser = useAuthStore((state) => state.setUser);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [form, setForm] = useState({
    phone: user?.phone || "",
    englishLevel: user?.englishLevel || "Beginner",
    learningGoal: user?.learningGoal || "General English",
  });

  useEffect(() => {
    setForm({
      phone: user?.phone || "",
      englishLevel: user?.englishLevel || "Beginner",
      learningGoal: user?.learningGoal || "General English",
    });
  }, [user]);

  const handleCancel = () => {
    setForm({
      phone: user?.phone || "",
      englishLevel: user?.englishLevel || "Beginner",
      learningGoal: user?.learningGoal || "General English",
    });
    setEditing(false);
  };

  const handleSave = async () => {
    const oldUser = user;

    try {
      setSaving(true);
      setErrorMessage("");

      const res = await api.patch("/auth/me/profile", form);

      setUser({
        ...oldUser,
        ...res.data,
      });

      setEditing(false);
    } catch (error) {
      console.error(error);

      setUser(oldUser);
      setForm({
        phone: oldUser?.phone || "",
        englishLevel: oldUser?.englishLevel || "Beginner",
        learningGoal: oldUser?.learningGoal || "General English",
      });

      setErrorMessage("Cập nhật thông tin thất bại. Dữ liệu đã được giữ nguyên.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#ead8c2] bg-white p-6 shadow-[0_24px_70px_rgba(31,42,68,0.08)]">
      {saving && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/75 backdrop-blur-sm">
          <div className="rounded-2xl bg-[#1f2a44] px-5 py-4 text-center font-extrabold text-white shadow-xl">
            <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Đang cập nhật...
          </div>
        </div>
      )}

      <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#fff0dc]" />
      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-[#f7f1fb]" />

      <div className="relative z-10">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-extrabold text-[#ff6b00]">
              👤 Hồ sơ học viên
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-[#1f2a44]">
              Thông tin cá nhân
            </h2>
          </div>

          <div className="flex gap-2">
            {editing && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="rounded-full bg-slate-100 px-4 py-2 text-xs font-extrabold text-[#1f2a44] disabled:opacity-60"
              >
                Hủy
              </button>
            )}

            <button
              type="button"
              onClick={() => (editing ? handleSave() : setEditing(true))}
              disabled={saving}
              className="rounded-full bg-[#ff6b00] px-4 py-2 text-xs font-extrabold text-white shadow-lg shadow-orange-200 disabled:opacity-60"
            >
              {editing ? "Lưu" : "Sửa"}
            </button>
          </div>
        </div>

<div className="space-y-3 rounded-[24px] bg-white/50 p-3">
          <PrettyInfoRow
            icon="📧"
            label="Email"
            value={user?.email || "--"}
            readonly
          />

          <PrettyEditableRow
            icon="📱"
            label="Số điện thoại"
            value={form.phone}
            editing={editing}
            placeholder="Chưa cập nhật"
            onChange={(value) => setForm({ ...form, phone: value })}
          />

          <PrettyEditableRow
            icon="📈"
            label="Trình độ"
            value={form.englishLevel}
            editing={editing}
            placeholder="Beginner"
            onChange={(value) => setForm({ ...form, englishLevel: value })}
          />

          <PrettyEditableRow
            icon="🎯"
            label="Mục tiêu"
            value={form.learningGoal}
            editing={editing}
            placeholder="General English"
            onChange={(value) => setForm({ ...form, learningGoal: value })}
          />
        </div>
      </div>

      {errorMessage && (
        <ErrorModal
          message={errorMessage}
          onClose={() => setErrorMessage("")}
        />
      )}
    </div>
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
  const [writingHistory, setWritingHistory] = useState<any>(null);
  const [openAllHistory, setOpenAllHistory] = useState(false);
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
          <WritingHistoryColumn
            title="📝 Lịch sử check bài"
            items={userWritingHistory}
            onSelect={setWritingHistory}
          />
        )}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setOpenAllHistory(true)}
          className="rounded-full bg-[#1f2a44] px-5 py-3 font-extrabold text-white transition hover:scale-105 hover:bg-[#111827]"
        >
          Xem toàn bộ lịch sử
        </button>

        <button
          type="button"
          onClick={async () => {
            try {
              await api.post("/auth/export-report-email");
              alert("Miu đã gửi báo cáo Excel vào email của bạn!");
            } catch (error) {
              console.error(error);
              alert("Gửi báo cáo thất bại. Vui lòng thử lại.");
            }
          }}
          className="rounded-full border border-[#ff6b00] px-5 py-3 font-extrabold text-[#ff6b00] transition hover:scale-105 hover:bg-[#fff4e8]"
        >
          Xuất báo cáo
        </button>
      </div>

      {openAllHistory && (
        <AllHistoryModal
          wordHistory={userWordHistory}
          writingHistory={userWritingHistory}
          onClose={() => setOpenAllHistory(false)}
          onSelect={(item) => {
            setSelectedItem(item);
            setOpenAllHistory(false);
          }}
        />
      )}

      {selectedItem?.word && (
        <HistoryModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
      {writingHistory && (
        <WritingHistoryModal
          item={writingHistory}
          onClose={() => setWritingHistory(null)}
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
  items = [],
  onSelect,
}: {
  title: string;
  items?: WordHistory[];
  onSelect: (item: WordHistory) => void;
}) {
  const type = title.includes("từ") ? "word" : "writing";

  return (
    <div>
      <h3 className="mb-3 font-extrabold text-[#1f2a44]">{title}</h3>

      <div className="space-y-3">
        {items.length === 0 ? (
          <EmptyHistory type={type} />
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-left transition hover:bg-[#fff4e8] hover:shadow"
            >
              <div>
                <p className="font-extrabold text-[#1f2a44]">
                  {item.word.word}
                </p>

                <p className="text-xs font-bold text-[#5b6b85]">
                  {item.word.ipa || "/"} · {item.word.mainMeaning}
                </p>
              </div>

              <span className="rounded-full bg-[#fff0dc] px-3 py-1 text-xs font-extrabold text-[#ff6b00]">
                {item.word.level}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function WritingHistoryColumn({
  title,
  items = [],
  onSelect,
}: {
  title: string;
  items?: WritingHistory[];
  onSelect: (item: WritingHistory) => void;
}) {
  return (
    <div>
      <h3 className="mb-3 font-extrabold text-[#1f2a44]">{title}</h3>

      <div className="space-y-3">
        {items.length === 0 ? (
          <EmptyHistory type="writing" />
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-left transition hover:bg-[#fff4e8] hover:shadow"
            >
              <div className="min-w-0">
                <p className="truncate font-extrabold text-[#1f2a44]">
                  {item.originalText}
                </p>

                <p className="text-xs font-bold text-[#5b6b85]">
                  {item.corrections?.length ?? 0} lỗi · {item.level} ·{" "}
                  {item.style}
                </p>
              </div>

              <span className="ml-3 shrink-0 rounded-full bg-[#fff0dc] px-3 py-1 text-xs font-extrabold text-[#ff6b00]">
                {item.score}/100
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function HistoryModal({
  item,
  onClose,
}: {
  item: WordHistory;
  onClose: () => void;
}) {
  const word = item.word;

  const playAudio = () => {
    if (!word.audio) return;
    new Audio(word.audio).play();
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold text-[#ff6b00]">
              🔤 Lịch sử check từ
            </p>

            <h2 className="mt-2 text-4xl font-extrabold text-[#1f2a44]">
              {word.word}
            </h2>

            <p className="mt-2 font-bold text-[#5b6b85]">
              {word.ipa || "/"} · {word.partOfSpeech || "word"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-4 py-2 font-extrabold text-[#1f2a44]"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-[#ead8c2] bg-[#fffaf5] p-5">
          <h3 className="font-extrabold text-[#1f2a44]">Nghĩa chính</h3>

          <p className="mt-2 text-xl font-extrabold text-[#ff6b00]">
            {word.mainMeaning || "Chưa có nghĩa chính."}
          </p>

          <p className="mt-2 leading-7 text-[#5b6b85]">
            {word.shortExplanation || word.definition || "Chưa có giải thích."}
          </p>
        </div>

        {word.audio && (
          <button
            type="button"
            onClick={playAudio}
            className="mt-5 rounded-full bg-[#1f2a44] px-5 py-3 font-extrabold text-white transition hover:bg-[#ff6b00]"
          >
            🔊 Nghe phát âm
          </button>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <InfoList
            title="Từ đồng nghĩa"
            items={
              word.synonyms?.map((item) => `${item.word} - ${item.meaning}`) ||
              []
            }
          />

          <InfoList
            title="Cụm từ hay dùng"
            items={
              word.phrases?.map((item) => `${item.phrase} - ${item.meaning}`) ||
              []
            }
          />
        </div>

        <div className="mt-5">
          <h3 className="font-extrabold text-[#1f2a44]">Ví dụ</h3>

          <div className="mt-3 space-y-3">
            {word.examples?.length ? (
              word.examples.map((example, index) => (
                <div key={index} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-extrabold text-[#1f2a44]">
                    {example.source}
                  </p>
                  <p className="mt-1 text-[#5b6b85]">{example.target}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 font-bold text-[#5b6b85]">
                Chưa có ví dụ.
              </div>
            )}
          </div>
        </div>
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
  right?: React.ReactNode;
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

function EmptyHistory({ type }: { type: "word" | "writing" }) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#ead8c2] bg-[#fffaf5] px-6 py-10 text-center">
      <div className="mb-4 text-6xl animate-bounce">
        {type === "word" ? "📚" : "📝"}
      </div>

      <h3 className="text-lg font-extrabold text-[#1f2a44]">Chưa có lịch sử</h3>

      <p className="mt-2 max-w-xs leading-7 text-[#5b6b85]">
        {type === "word"
          ? "Bạn chưa tra từ nào. Hãy thử Check từ để Miu giúp bạn học từ vựng."
          : "Bạn chưa kiểm tra bài viết nào. Hãy thử Check bài để Miu sửa lỗi ngữ pháp."}
      </p>

      <button
        type="button"
        onClick={() =>
          router.push(type === "word" ? "/check-word" : "/check-writing")
        }
        className="mt-6 rounded-full bg-[#ff6b00] px-6 py-3 font-extrabold text-white shadow-lg transition hover:scale-105"
      >
        {type === "word" ? "Đi tới Check từ" : "Đi tới Check bài"}
      </button>
    </div>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-[#ead8c2] bg-white p-4">
      <h3 className="font-extrabold text-[#1f2a44]">{title}</h3>

      <div className="mt-3 space-y-2">
        {items.length ? (
          items.map((item) => (
            <div
              key={item}
              className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-[#5b6b85]"
            >
              {item}
            </div>
          ))
        ) : (
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-[#5b6b85]">
            Chưa có dữ liệu.
          </div>
        )}
      </div>
    </div>
  );
}

function WritingHistoryModal({
  item,
  onClose,
}: {
  item: WritingHistory;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold text-[#ff6b00]">
              📝 Lịch sử check bài
            </p>

            <h2 className="mt-2 text-3xl font-extrabold text-[#1f2a44]">
              Điểm {item.score}/100
            </h2>

            <p className="mt-2 font-bold text-[#5b6b85]">
              {item.level} · {item.style} · {item.detectedLanguage}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-4 py-2 font-extrabold text-[#1f2a44]"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-[#ead8c2] bg-[#fffaf5] p-5">
          <h3 className="font-extrabold text-[#1f2a44]">Bài gốc</h3>
          <p className="mt-2 leading-7 text-[#5b6b85]">{item.originalText}</p>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="font-extrabold text-[#1f2a44]">Phiên bản Miu gợi ý</h3>
          <p className="mt-2 font-bold leading-7 text-[#1f2a44]">
            {item.suggestedVersion}
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <HistoryScore label="Grammar" value={item.grammarScore} />
          <HistoryScore label="Vocabulary" value={item.vocabularyScore} />
          <HistoryScore label="Clarity" value={item.clarityScore} />
          <HistoryScore label="Meaning" value={item.meaningScore} />
        </div>

        <div className="mt-5">
          <h3 className="font-extrabold text-[#1f2a44]">Lỗi đã sửa</h3>

          <div className="mt-3 space-y-3">
            {item.corrections?.map((correction, index) => (
              <div key={index} className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-extrabold text-[#1f2a44]">
                    {correction.type}
                  </h4>
                  <span className="rounded-full bg-[#fff0dc] px-3 py-1 text-xs font-extrabold text-[#ff6b00]">
                    {correction.level}
                  </span>
                </div>

                <p className="font-bold text-red-500">{correction.wrong}</p>
                <p className="font-bold text-emerald-600">
                  → {correction.correct}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#5b6b85]">
                  {correction.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <InfoList title="Cụm từ nên học" items={item.phrases || []} />
          <InfoList title="Mẹo học" items={item.learningTips || []} />
        </div>

        {item.miuNote && (
          <div className="mt-5 rounded-2xl bg-[#f7f1fb] p-5 font-bold leading-7 text-[#6b5796]">
            💡 {item.miuNote}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#ead8c2] bg-[#fffaf5] p-4 text-center">
      <div className="text-xl font-extrabold text-[#ff6b00]">{value}</div>
      <p className="mt-1 text-xs font-extrabold text-[#5b6b85]">{label}</p>
    </div>
  );
}

function AllHistoryModal({
  wordHistory,
  writingHistory,
  onClose,
  onSelect,
}: {
  wordHistory: WordHistory[];
  writingHistory: WritingHistory[];
  onClose: () => void;
  onSelect: (item: WordHistory | WritingHistory) => void;
}) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-extrabold text-[#ff6b00]">
              📚 Hồ sơ học tập
            </p>
            <h2 className="text-3xl font-extrabold text-[#1f2a44]">
              Toàn bộ lịch sử
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-4 py-2 font-extrabold text-[#1f2a44]"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 font-extrabold text-[#1f2a44]">🔤 Check từ</h3>

            <div className="space-y-3">
              {wordHistory.length ? (
                wordHistory.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item)}
                    className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-left hover:bg-[#fff4e8]"
                  >
                    <div>
                      <p className="font-extrabold text-[#1f2a44]">
                        {item.word.word}
                      </p>
                      <p className="text-xs font-bold text-[#5b6b85]">
                        {item.word.mainMeaning}
                      </p>
                    </div>

                    <span className="rounded-full bg-[#fff0dc] px-3 py-1 text-xs font-extrabold text-[#ff6b00]">
                      {item.word.level}
                    </span>
                  </button>
                ))
              ) : (
                <EmptyHistory type="word" />
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-extrabold text-[#1f2a44]">📝 Check bài</h3>

            <div className="space-y-3">
              {writingHistory.length ? (
                writingHistory.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item)}
                    className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-left hover:bg-[#fff4e8]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-[#1f2a44]">
                        {item.originalText}
                      </p>
                      <p className="text-xs font-bold text-[#5b6b85]">
                        {item.corrections?.length ?? 0} lỗi · {item.level}
                      </p>
                    </div>

                    <span className="ml-3 shrink-0 rounded-full bg-[#fff0dc] px-3 py-1 text-xs font-extrabold text-[#ff6b00]">
                      {item.score}/100
                    </span>
                  </button>
                ))
              ) : (
                <EmptyHistory type="writing" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditableRow({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#ead8c2] py-3 text-sm font-bold last:border-0">
      <span className="text-[#5b6b85]">{label}</span>

      {editing ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-56 rounded-xl border border-[#ead8c2] bg-white px-3 py-2 text-right font-extrabold text-[#1f2a44] outline-none focus:border-[#ff6b00]"
        />
      ) : (
        <span className="text-right text-[#1f2a44]">
          {value || "Chưa cập nhật"}
        </span>
      )}
    </div>
  );
}

function PrettyInfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-[#ead8c2]/70">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff4e8] text-xl">
        {icon}
      </span>

<div className="min-w-0 flex-1 overflow-hidden">
  <p className="text-xs font-extrabold text-[#8a94a8]">{label}</p>

  <p
    className="
      mt-1
      break-all
      text-[17px]
      font-extrabold
      leading-6
      text-[#1f2a44]
    "
  >
    {value}
  </p>
</div>
    </div>
  );
}

function PrettyEditableRow({
  icon,
  label,
  value,
  editing,
  placeholder,
  onChange,
}: {
  icon: string;
  label: string;
  value: string;
  editing: boolean;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm transition ${
        editing
          ? "border-2 border-[#ff6b00] bg-white shadow-orange-100"
          : "border border-[#ead8c2] bg-white/80"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl shadow-sm ${
          editing
            ? "bg-[#fff0dc] ring-2 ring-[#ff6b00]/20"
            : "bg-gradient-to-br from-[#fff4e8] to-[#f7f1fb]"
        }`}
      >
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-extrabold text-[#8a94a8]">{label}</p>

        {editing ? (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="mt-1 w-full rounded-xl bg-[#fffaf5] px-3 py-2 font-extrabold text-[#1f2a44] outline-none focus:bg-white"
          />
        ) : (
          <p className="mt-1 break-all text-[16px] font-extrabold leading-5 text-[#1f2a44]">
            {value || "Chưa cập nhật"}
          </p>
        )}
      </div>
    </div>
  );
}


function ErrorModal({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">
          😿
        </div>

        <h2 className="mt-4 text-2xl font-extrabold text-[#1f2a44]">
          Cập nhật thất bại
        </h2>

        <p className="mt-3 leading-7 text-[#5b6b85]">{message}</p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-[#ff6b00] py-4 font-extrabold text-white"
        >
          Đã hiểu
        </button>
      </div>
    </div>
  );
}