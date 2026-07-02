"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { api } from "@/src/lib/axios";
import { useAuthStore } from "@/src/store/authStore";
import { AppIcon, AppIconName } from "@/src/Components/UI/AppIcon";
import AppLogo from "@/src/Components/UI/AppLogo";
import { X, Gift, BookOpen, Star, Target, RotateCcw } from "lucide-react";

type VocabularyWord = {
  id: string;
  word: string;
  phonetic?: string | null;
  audio?: string | null;
  partOfSpeech?: string | null;
  meaningVi?: string | null;
  meaningEn?: string | null;
  example?: string | null;
  synonyms?: string[];
  antonyms?: string[];
  topic?: { id: string; name: string } | null;
  progress?: { status: string } | null;
};

type DailyWordItem = {
  id: string;
  wordId: string;
  order: number;
  word: VocabularyWord;
  inNotebook?: boolean;
  progress?: { status: string } | null;
};

type TodayVocabulary = {
  locked?: boolean;
  reason?: string;
  id?: string;
  status?: string;
  topic?: { id: string; name: string; description?: string | null };
  words?: DailyWordItem[];
};

type WeeklyPlan = {
  days?: Array<{
    id: string;
    date: string;
    status: string;
    dayOfWeek: number;
    topic?: { name: string };
    words?: Array<{ word: VocabularyWord }>;
  }>;
};

type VocabStats = {
  totalWords: number;
  learnedWords: number;
  masteredWords: number;
  reviewDue: number;
  notebookWords: number;
  testsTaken: number;
  memoryRate: number;
};

type TodayChallenge = {
  locked?: boolean;
  reason?: string;
  challengeId?: string;
  type?: string;
  title?: string;
  total?: number;
  prompt?: string;
  word?: string;
  hint?: string | null;
  questions?: Array<{ wordId: string; prompt: string; options: string[] }>;
};

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
const fallbackWeakWords = ["pollution", "recycle", "conserve"];

export default function VocabularyPage() {
  const user = useAuthStore((state) => state.user);
  const displayName = user?.fullname || "Minh Anh";
  const avatar = user?.avatar || "/avatar-default.png";

  const [today, setToday] = useState<TodayVocabulary | null>(null);
  const [dailyWords, setDailyWords] = useState<DailyWordItem[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [stats, setStats] = useState<VocabStats | null>(null);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [challenge, setChallenge] = useState<TodayChallenge | null>(null);
  const [notebookCount, setNotebookCount] = useState(0);
  const [level, setLevel] = useState("A1");
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState<VocabularyWord | null>(null);
  const [relations, setRelations] = useState<any>(null);
  const [flashcard, setFlashcard] = useState<any>(null);
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeAnswers, setChallengeAnswers] = useState<
    Record<string, string>
  >({});
  const [challengeSentence, setChallengeSentence] = useState("");
  const [challengeResult, setChallengeResult] = useState<any>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareContent, setShareContent] = useState("");
  const [openModalProgress, setOpenModalProgress] = useState(true);

  const currentItem = dailyWords[activeIndex] || today?.words?.[0] || null;
  const currentWord = currentItem?.word || null;
  const learnedCount = dailyWords.filter((item) =>
    ["KNOWN", "MASTERED"].includes(item.progress?.status || ""),
  ).length;
  const totalWords = dailyWords.length || today?.words?.length || 10;
  const progressPercent = totalWords
    ? Math.round((learnedCount / totalWords) * 100)
    : 0;

  const loadVocabulary = async () => {
    setLoading(true);
    setMessage("");

    const [
      profileRes,
      todayRes,
      planRes,
      statsRes,
      suggestionsRes,
      notebookRes,
      challengeRes,
    ] = await Promise.allSettled([
      api.get("/vocabulary/profile"),
      api.get("/vocabulary/today"),
      api.get("/vocabulary/weekly-plan"),
      api.get("/vocabulary/me/stats"),
      api.get("/vocabulary/review/suggestions"),
      api.get("/vocabulary/notebook"),
      api.get("/vocabulary/challenge/today"),
    ]);

    if (profileRes.status === "fulfilled")
      setLevel(profileRes.value.data?.level || "A1");
    if (planRes.status === "fulfilled" && !planRes.value.data?.locked)
      setWeeklyPlan(planRes.value.data);
    if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
    if (suggestionsRes.status === "fulfilled")
      setSuggestions(suggestionsRes.value.data);
    if (notebookRes.status === "fulfilled")
      setNotebookCount(notebookRes.value.data?.length || 0);
    if (challengeRes.status === "fulfilled")
      setChallenge(challengeRes.value.data);
    if (todayRes.status === "fulfilled" && todayRes.value.data?.completed) {
      setOpenModalProgress(true);
    }

    if (todayRes.status === "fulfilled") {
      const data = todayRes.value.data;
      setToday(data);
      if (data?.id && !data?.locked) {
        try {
          const wordsRes = await api.get(`/vocabulary/daily/${data.id}/words`);
          setDailyWords(wordsRes.data?.words || []);
          setActiveIndex(0);
        } catch {
          setDailyWords([]);
          setMessage(
            "Không tải được danh sách từ hôm nay. Hãy đăng nhập lại hoặc tải lại trang.",
          );
        }
      } else {
        setDailyWords([]);
      }
    } else {
      setToday(null);
      setDailyWords([]);
      setMessage(
        "Chưa tải được bài học từ vựng. Hãy kiểm tra đăng nhập rồi thử lại.",
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    loadVocabulary();
  }, []);

  const updateLevel = async (nextLevel: string) => {
    setLevel(nextLevel);
    await api.patch("/vocabulary/profile", { level: nextLevel });
    await loadVocabulary();
  };

  const markProgress = async (status: "KNOWN" | "REVIEW" | "LEARNING") => {
    if (!currentWord?.id || today?.locked) {
      setMessage(
        "Chưa có từ vựng hợp lệ để lưu tiến độ. Hãy đăng nhập và tải lại bài học.",
      );
      return;
    }
    try {
      await api.post(`/vocabulary/words/${currentWord.id}/progress`, {
        status,
      });
      setDailyWords((items) =>
        items.map((item) =>
          item.wordId === currentWord.id
            ? { ...item, progress: { status } }
            : item,
        ),
      );
      setMessage(
        status === "KNOWN"
          ? "Đã lưu: bạn đã biết từ này."
          : "Đã đưa từ vào lịch ôn tập.",
      );
    } catch {
      setMessage("Không lưu được tiến độ. Hãy đăng nhập lại rồi thử tiếp.");
    }
  };
  const toggleNotebook = async () => {
    if (!currentWord?.id) {
      setMessage("Chưa có từ vựng hợp lệ để lưu sổ tay.");
      return;
    }
    const isSaved = Boolean(currentItem?.inNotebook);
    try {
      if (isSaved) {
        await api.delete(`/vocabulary/words/${currentWord.id}/notebook`);
        setMessage("Đã bỏ từ khỏi sổ tay.");
      } else {
        await api.post(`/vocabulary/words/${currentWord.id}/notebook`, {
          note: "Lưu từ từ trang học hôm nay",
        });
        setMessage("Đã thêm từ vào sổ tay.");
      }
      setDailyWords((items) =>
        items.map((item) =>
          item.wordId === currentWord.id
            ? { ...item, inNotebook: !isSaved }
            : item,
        ),
      );
      const notebookRes = await api.get("/vocabulary/notebook");
      setNotebookCount(notebookRes.data?.length || 0);
    } catch {
      setMessage("Không cập nhật được sổ tay. Hãy đăng nhập lại rồi thử tiếp.");
    }
  };
  const openDetail = async () => {
    if (!currentWord?.id) return;
    await openWordDetail(currentWord.id);
  };

  const openWordDetail = async (wordId: string) => {
    const [detailRes, relationsRes] = await Promise.all([
      api.get(`/vocabulary/words/${wordId}/detail`),
      api.get(`/vocabulary/words/${wordId}/relations`),
    ]);
    setDetail(detailRes.data);
    setRelations(relationsRes.data);
  };

  const openFlashcard = async () => {
    if (today?.id) {
      const res = await api.get(`/vocabulary/daily/${today.id}/flashcards`);
      const firstCard = res.data?.cards?.[0];
      if (firstCard)
        setFlashcard({ ...firstCard, session: res.data, cardIndex: 0 });
      return;
    }
    if (currentWord?.id) {
      const res = await api.get(
        `/vocabulary/words/${currentWord.id}/flashcard`,
      );
      setFlashcard(res.data);
    }
  };

  const reviewFlashcard = async (
    rating: "AGAIN" | "HARD" | "GOOD" | "EASY",
  ) => {
    if (!flashcard?.wordId) return;
    await api.post(`/vocabulary/flashcards/${flashcard.wordId}/review`, {
      rating,
    });
    const cards = flashcard.session?.cards || [];
    const nextIndex = (flashcard.cardIndex || 0) + 1;
    if (cards[nextIndex]) {
      setFlashcard({
        ...cards[nextIndex],
        session: flashcard.session,
        cardIndex: nextIndex,
      });
    } else {
      setFlashcard(null);
      setMessage(
        "Đã hoàn thành bộ flashcard hôm nay. Foxy đã cập nhật lịch ôn cho bạn.",
      );
    }
    await loadVocabulary();
  };

  const playAudio = () => {
    if (!currentWord?.audio) {
      setMessage(
        "Từ này chưa có audio. Backend có thể bổ sung TTS sau để tự sinh file phát âm.",
      );
      return;
    }
    new Audio(currentWord.audio).play();
  };

  const nextWord = async () => {
    if (!today?.id || !currentWord?.id) return;
    const res = await api.get(
      `/vocabulary/daily/${today.id}/words/${currentWord.id}/navigation`,
    );
    if (res.data?.next) setActiveIndex(res.data.currentIndex + 1);
    else
      setMessage(
        "Bạn đã xem hết danh sách từ hôm nay. Có thể bấm hoàn thành bài học.",
      );
  };

  const completeToday = async () => {
    if (!today?.id || today.locked) return;
    await api.post(`/vocabulary/daily/${today.id}/complete`);
    setOpenModalProgress(true);
    setMessage(
      "Đã hoàn thành bài học hôm nay. Các từ sẽ được đưa vào lịch ôn tập.",
    );
    await loadVocabulary();
  };

  const shareWord = async () => {
    if (!currentWord?.id) return;
    const res = await api.post(`/vocabulary/words/${currentWord.id}/share`, {
      content: shareContent,
    });
    setShareOpen(false);
    setShareContent("");
    setMessage(
      res.data?.post?.id
        ? "Đã đăng bài từ vựng sang cộng đồng."
        : "Đã tạo nội dung chia sẻ.",
    );
  };

  const submitChallenge = async () => {
    if (!challenge?.challengeId) return;
    const answers = Object.entries(challengeAnswers).map(
      ([wordId, answer]) => ({ wordId, answer }),
    );
    const res = await api.post(
      `/vocabulary/challenge/${challenge.challengeId}/submit`,
      { answers, sentence: challengeSentence },
    );
    setChallengeResult(res.data);
    await loadVocabulary();
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbfbff] text-[#101733]">
      <div className="mx-auto flex min-h-screen max-w-[1920px]">
        <VocabularySidebar />
        <section className="min-w-0 flex-1">
          <TopBar displayName={displayName} avatar={avatar} />

          <div className="grid gap-7 px-4 py-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="min-w-0 space-y-6">
              <div className="flex items-center gap-4">
                <Link
                  href="/courses"
                  className="text-2xl font-black text-[#4f5790]"
                >
                  <AppIcon name="chevronLeft" bare size={24} />
                </Link>
                <h1 className="text-2xl font-black">Từ vựng</h1>
              </div>

              {today?.locked ? (
                <LockedNotice reason={today.reason} />
              ) : (
                <>
                  <TopicHero
                    level={level}
                    onLevelChange={updateLevel}
                    today={today}
                  />
                  <ActionRow onOpenChallenge={() => setShowChallenge(true)} />
                  <FoxyNote loading={loading} suggestions={suggestions} />
                  <WordCard
                    activeIndex={activeIndex}
                    item={currentItem}
                    locked={false}
                    total={dailyWords.length}
                    word={currentWord}
                    onDetail={openDetail}
                    onFlashcard={openFlashcard}
                    onKnown={() => markProgress("KNOWN")}
                    onLearning={() => markProgress("LEARNING")}
                    onNext={nextWord}
                    onNotebook={toggleNotebook}
                    onReview={() => markProgress("REVIEW")}
                    onShare={() => setShareOpen(true)}
                    onAudio={playAudio}
                  />
                  {message && (
                    <div className="rounded-xl bg-[#ecfdf5] px-5 py-4 font-bold text-[#15803d]">
                      {message}
                    </div>
                  )}
                  <ProgressCard
                    learned={learnedCount}
                    percent={progressPercent}
                    total={totalWords}
                    onComplete={completeToday}
                  />
                </>
              )}
            </section>

            <aside className="space-y-6">
              <WeeklyTopics plan={weeklyPlan} />
              <StatsPanel
                stats={stats}
                fallbackLearned={
                  weeklyPlan?.days?.flatMap((day) => day.words || []).length ||
                  totalWords
                }
                notebookCount={notebookCount}
              />
              <TodayHint
                suggestions={suggestions}
                onSelectWord={openWordDetail}
              />
              <ChallengeCard
                challenge={challenge}
                onOpen={() => setShowChallenge(true)}
              />
              <LearningTip />
            </aside>
          </div>
        </section>
      </div>

      {detail && (
        <DetailModal
          detail={detail}
          relations={relations}
          onClose={() => setDetail(null)}
        />
      )}
      {flashcard && (
        <FlashcardModal
          flashcard={flashcard}
          onClose={() => setFlashcard(null)}
          onReview={reviewFlashcard}
        />
      )}
      {shareOpen && (
        <ShareModal
          content={shareContent}
          word={currentWord}
          setContent={setShareContent}
          onClose={() => setShareOpen(false)}
          onSubmit={shareWord}
        />
      )}
      {showChallenge && (
        <ChallengeModal
          answers={challengeAnswers}
          challenge={challenge}
          sentence={challengeSentence}
          result={challengeResult}
          setAnswers={setChallengeAnswers}
          setSentence={setChallengeSentence}
          onClose={() => setShowChallenge(false)}
          onSubmit={submitChallenge}
        />
      )}
      <LessonCompletedModal
        open={openModalProgress}
        onClose={() => setOpenModalProgress(false)}
      />
    </main>
  );
}

function LockedNotice({ reason }: { reason?: string }) {
  return (
    <section className="rounded-2xl border border-[#fed7aa] bg-[#fff7ed] p-5">
      <h2 className="text-xl font-black text-[#c2410c]">
        Tuần học mới đang bị khóa
      </h2>
      <p className="mt-2 font-bold text-[#9a3412]">
        {reason || "Bạn cần hoàn thành bài kiểm tra tuần trước để tiếp tục."}
      </p>
      <Link
        href="/vocabulary/test"
        className="mt-4 inline-flex rounded-xl bg-[#6d35ff] px-5 py-3 font-black text-white"
      >
        Làm bài kiểm tra
      </Link>
    </section>
  );
}

export function VocabularySidebar() {
  const menu = [
    { icon: "home", label: "Trang chủ", href: "/" },
    { icon: "book", label: "Học tập", href: "/courses" },
    { icon: "arena", label: "Đấu trường", href: "/arena" },
    { icon: "bot", label: "AI Tutor", href: "/check-writing" },
    { icon: "graduation", label: "Khóa học", href: "/courses" },
    { icon: "users", label: "Cộng đồng", href: "/community" },
    { icon: "shop", label: "Shop", href: "/pet" },
    { icon: "paw", label: "Hồ sơ", href: "/profile" },
  ] satisfies Array<{ icon: AppIconName; label: string; href: string }>;

  return (
    <aside className="sticky top-0 hidden h-screen w-[286px] shrink-0 overflow-y-auto border-r border-[#e8e9f5] bg-white px-4 py-6 xl:block">
      <AppLogo />
      <nav className="mt-9 space-y-1">
        {menu.map(({ icon, label, href }) => (
          <Link
            key={label}
            href={href}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-black transition ${label === "Học tập" ? "bg-[#efe9ff] text-[#652cff]" : "text-[#5d6587] hover:bg-[#f5f2ff] hover:text-[#652cff]"}`}
          >
            <AppIcon
              name={icon}
              tone={label === "Học tập" ? "purple" : "slate"}
              bare
              size={18}
            />
            <span className="min-w-0 flex-1">{label}</span>
          </Link>
        ))}
        <div className="ml-[27px] border-l-2 border-[#e2ddff] py-1 pl-6">
          {[
            "Tổng quan",
            "Từ vựng",
            "Nghe",
            "Nói",
            "Ngữ pháp",
            "Đọc hiểu",
            "Viết",
            "Flashcards",
          ].map((label) => (
            <Link
              href={label === "Từ vựng" ? "/vocabulary" : "/courses"}
              key={label}
              className={`relative block rounded-xl px-4 py-2.5 text-sm font-black ${label === "Từ vựng" ? "bg-[#f1ecff] text-[#652cff]" : "text-[#101733] hover:bg-[#f7f5ff]"}`}
            >
              {label === "Từ vựng" && (
                <span className="absolute -left-[31px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#6d35ff]" />
              )}
              {label}
            </Link>
          ))}
        </div>
        <p className="px-4 pt-5 text-xs font-black uppercase text-[#8b91aa]">
          Ôn tập & kiểm tra
        </p>
        <Link
          href="/vocabulary/test"
          className="flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-black text-[#5d6587] hover:bg-[#f5f2ff] hover:text-[#652cff]"
        >
          <AppIcon name="shield" tone="purple" bare size={17} /> Kiểm tra{" "}
          <span className="rounded-lg bg-[#efe9ff] px-2 py-1 text-xs text-[#6d35ff]">
            Mới
          </span>
        </Link>
      </nav>
      <section className="mt-8 rounded-2xl bg-[#f4f0ff] p-5">
        <AppIcon name="crown" tone="yellow" />
        <h3 className="mt-2 font-black text-[#652cff]">Nâng cấp Premium</h3>
        <p className="mt-3 text-sm font-bold leading-6 text-[#69708b]">
          Học không giới hạn, nhận nhiều đặc quyền hấp dẫn!
        </p>
        <button className="mt-5 w-full rounded-xl bg-[#6d35ff] px-4 py-3 text-sm font-black text-white">
          Nâng cấp ngay
        </button>
      </section>
    </aside>
  );
}

export function TopBar({
  displayName,
  avatar,
}: {
  displayName: string;
  avatar: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e8e9f5] bg-white/95 px-4 py-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-4">
        <label className="relative hidden w-full max-w-[480px] md:block">
          <AppIcon
            name="search"
            bare
            size={19}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b91aa]"
          />
          <input
            placeholder="Tìm bài học, từ vựng, ngữ pháp..."
            className="h-14 w-full rounded-xl border border-[#dfe2f3] bg-white pl-12 pr-4 text-sm font-bold outline-none placeholder:text-[#8b91aa] focus:border-[#6d35ff]"
          />
        </label>
        <div className="ml-auto flex items-center gap-3">
          <TopMetric icon="fire" value="18" label="Streak" tone="orange" />
          <TopMetric
            icon="star"
            value="2,450"
            label="XP hôm nay"
            tone="yellow"
          />
          <TopMetric icon="diamond" value="5,230" label="Xu" tone="cyan" />
          <button className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#e8e9f5] bg-white text-xl">
            <AppIcon name="bell" bare size={20} className="text-[#6d35ff]" />
            <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white">
              3
            </span>
          </button>
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-[#f5f2ff]"
          >
            <img
              src={avatar}
              alt={displayName}
              className="h-11 w-11 rounded-full object-cover"
            />
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-black">{displayName}</span>
              <span className="block text-xs font-bold text-[#69708b]">
                Level 18
              </span>
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function TopMetric({
  icon,
  value,
  label,
  tone = "purple",
}: {
  icon: AppIconName;
  value: string;
  label: string;
  tone?: "orange" | "yellow" | "cyan" | "purple";
}) {
  return (
    <div className="hidden items-center gap-2 lg:flex">
      <AppIcon name={icon} tone={tone} />
      <span className="leading-tight">
        <span className="block text-sm font-black">{value}</span>
        <span className="block text-[11px] font-bold text-[#69708b]">
          {label}
        </span>
      </span>
    </div>
  );
}

function TopicHero({
  level,
  onLevelChange,
  today,
}: {
  level: string;
  onLevelChange: (level: string) => void;
  today: TodayVocabulary | null;
}) {
  const topicName = today?.topic?.name || "Environment";
  const description =
    today?.topic?.description ||
    "Học từ vựng theo chủ đề mỗi ngày giúp bạn ghi nhớ tốt hơn và áp dụng dễ dàng hơn.";
  const wordCount = today?.words?.length || 10;
  return (
    <section className="relative overflow-hidden rounded-2xl bg-[#f1edff] p-8 shadow-sm">
      <div className="relative z-10 grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm font-black text-[#4f2bd8]">
              <AppIcon name="calendar" bare size={16} /> Chủ đề hôm nay
            </span>
            <select
              value={level}
              onChange={(event) => onLevelChange(event.target.value)}
              className="rounded-lg border border-[#d9ceff] bg-white/90 px-3 py-2 text-sm font-black text-[#4f2bd8] outline-none"
            >
              {levels.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <h2 className="mt-5 text-4xl font-black leading-tight">
            {topicName} <AppIcon name="leaf" tone="emerald" />
          </h2>
          <p className="mt-4 max-w-2xl text-base font-bold leading-7 text-[#303956]">
            {description}
          </p>
          <div className="mt-7 flex flex-wrap gap-8 text-sm font-black text-[#59627f]">
            <span className="inline-flex items-center gap-2">
              <AppIcon name="shield" bare size={16} /> {wordCount} từ mới
            </span>
            <span className="inline-flex items-center gap-2">
              <AppIcon name="target" bare size={16} /> {level} - Theo trình độ
            </span>
            <span className="inline-flex items-center gap-2">
              <AppIcon name="calendar" bare size={16} /> Cập nhật mỗi ngày
            </span>
          </div>
        </div>
        <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
          <span className="absolute h-40 w-40 rounded-full bg-[#8fd4ff] blur-2xl" />
          <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-[#4aa3ff] to-[#0f7d55] text-[92px] shadow-[0_24px_70px_rgba(59,130,246,0.28)]">
            <AppIcon name="globe" bare size={88} className="text-white" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ActionRow({ onOpenChallenge }: { onOpenChallenge: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <button className="inline-flex items-center gap-2 rounded-xl bg-[#6d35ff] px-6 py-3 text-sm font-black text-white">
        <AppIcon name="sparkles" bare size={17} /> Theo chủ đề mỗi ngày
      </button>
      <button className="rounded-xl border border-[#dfe2f3] bg-white px-6 py-3 text-sm font-black text-[#303956]">
        Ngẫu nhiên
      </button>
      <button
        onClick={onOpenChallenge}
        className="ml-auto inline-flex items-center gap-2 rounded-xl border border-[#dfe2f3] bg-white px-6 py-3 text-sm font-black text-[#303956]"
      >
        <AppIcon name="zap" bare size={17} className="text-amber-500" /> Thử
        thách hôm nay
      </button>
    </div>
  );
}

function FoxyNote({
  loading,
  suggestions,
}: {
  loading: boolean;
  suggestions: any;
}) {
  const due = suggestions?.dueToday || 0;
  return (
    <section className="flex items-center justify-between gap-4 overflow-hidden rounded-xl bg-[#f1edff] px-6 py-4">
      <p className="max-w-3xl text-sm font-bold leading-6 text-[#303956]">
        {loading
          ? "✨ Foxy đang tải kế hoạch từ vựng của bạn..."
          : due
            ? `✨ Bạn có ${due} từ cần ôn hôm nay. Foxy đã chuẩn bị gợi ý bên phải rồi nhé.`
            : "Chủ đề hôm nay đã sẵn sàng. Học từng từ, lưu vào sổ tay hoặc mở flashcard để ôn lại."}
      </p>
      <AppIcon name="paw" tone="orange" className="h-16 w-16" size={34} />
    </section>
  );
}

function WordCard(props: {
  locked: boolean;
  activeIndex: number;
  total: number;
  word: VocabularyWord | null;
  item: DailyWordItem | null;
  onKnown: () => void;
  onReview: () => void;
  onLearning: () => void;
  onNotebook: () => void;
  onDetail: () => void;
  onFlashcard: () => void;
  onNext: () => void;
  onShare: () => void;
  onAudio: () => void;
}) {
  const { locked, activeIndex, total, word, item } = props;
  const displayWord = word?.word || "environment";
  const meaning =
    word?.meaningVi || word?.meaningEn || "Môi trường, hoàn cảnh xung quanh";
  const example =
    word?.example ||
    "We should protect the environment for future generations.";
  return (
    <section className="rounded-2xl border border-[#e8e9f5] bg-white p-6 shadow-sm">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px_42px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={props.onDetail}
              className="inline-flex items-center gap-2 rounded-lg bg-[#efe9ff] px-3 py-2 text-sm font-black text-[#6d35ff]"
            >
              <AppIcon name="book" bare size={15} />
              Chi tiết
            </button>
            <button
              onClick={props.onFlashcard}
              className="inline-flex items-center gap-2 rounded-lg bg-[#eef6ff] px-3 py-2 text-sm font-black text-[#2563eb]"
            >
              <AppIcon name="notebook" bare size={15} />
              Flashcard
            </button>
            <button
              onClick={props.onShare}
              className="inline-flex items-center gap-2 rounded-lg bg-[#fff7ed] px-3 py-2 text-sm font-black text-[#f97316]"
            >
              <AppIcon name="message" bare size={15} />
              Chia sẻ
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-4xl font-black">{displayWord}</h2>
            <button
              onClick={props.onAudio}
              className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#efe9ff] text-2xl text-[#6d35ff]"
            >
              <AppIcon name="volume" bare size={24} />
            </button>
          </div>
          <p className="text-xl font-bold text-[#59627f]">
            {word?.phonetic || "/ɪnˈvaɪrənmənt/"}
          </p>
          <span className="inline-flex rounded-lg bg-[#dff8e8] px-3 py-2 text-sm font-black text-[#16a34a]">
            {word?.partOfSpeech || "Danh từ"}
          </span>
          <h3 className="text-xl font-black">{meaning}</h3>
          <div className="border-l-4 border-[#d9ceff] pl-4">
            <p className="text-sm font-black text-[#6d35ff]">Ví dụ</p>
            <p className="mt-3 font-bold text-[#303956]">{example}</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl bg-gradient-to-br from-[#bde7ff] to-[#2f7d45]">
          <div className="flex h-full min-h-[260px] items-center justify-center text-[118px]">
            <AppIcon name="leaf" bare size={92} className="text-white/95" />
          </div>
        </div>
        <button
          onClick={props.onNext}
          className="self-center rounded-full border border-[#e8e9f5] bg-white px-4 py-5 text-3xl font-black text-[#101733] shadow-sm"
        >
          <AppIcon name="chevronRight" bare size={28} />
        </button>
      </div>
      <div className="mt-8 flex justify-center gap-2">
        {Array.from({ length: Math.max(total, 1) })
          .slice(0, 10)
          .map((_, index) => (
            <span
              key={index}
              className={`h-2 rounded-full ${index === activeIndex ? "w-6 bg-[#6d35ff]" : "w-2 bg-[#e1e4f2]"}`}
            />
          ))}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <StatusButton
          tone="green"
          icon="check"
          label="Đã biết"
          onClick={props.onKnown}
          disabled={locked}
        />
        <StatusButton
          tone="orange"
          icon="calendar"
          label="Cần ôn lại"
          onClick={props.onReview}
          disabled={locked}
        />
        <StatusButton
          tone="red"
          icon="x"
          label="Chưa biết"
          onClick={props.onLearning}
          disabled={locked}
        />
        <StatusButton
          tone="purple"
          icon="notebook"
          label={item?.inNotebook ? "Bỏ sổ tay" : "Thêm vào sổ tay"}
          onClick={props.onNotebook}
          disabled={locked}
        />
      </div>
    </section>
  );
}

function StatusButton({
  disabled,
  icon,
  label,
  onClick,
  tone,
}: {
  disabled?: boolean;
  icon: AppIconName;
  label: string;
  onClick?: () => void;
  tone: "green" | "orange" | "red" | "purple";
}) {
  const tones = {
    green: "text-[#22c55e]",
    orange: "text-[#f97316]",
    red: "text-[#ef4444]",
    purple: "text-[#6d35ff]",
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl border border-[#e8e9f5] bg-white px-5 py-4 text-sm font-black text-[#101733] shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
    >
      <AppIcon name={icon} bare size={17} className={`mr-3 ${tones[tone]}`} />
      {label}
    </button>
  );
}

function ProgressCard({
  learned,
  percent,
  total,
  onComplete,
}: {
  learned: number;
  percent: number;
  total: number;
  onComplete: () => void;
}) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl bg-[#f1edff] p-6 sm:flex-row sm:items-center">
      <AppIcon
        name="target"
        tone="purple"
        className="h-14 w-14 rounded-full"
        size={28}
      />
      <div className="min-w-0 flex-1">
        <h3 className="font-black">Tiến độ chủ đề hôm nay</h3>
        <p className="mt-1 text-sm font-bold text-[#69708b]">
          Bạn đã học {learned}/{total} từ
        </p>
      </div>
      <div className="h-2 w-full rounded-full bg-[#e1e4f2] sm:w-80">
        <div
          className="h-2 rounded-full bg-[#6d35ff]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="font-black text-[#59627f]">{percent}%</span>
      <button
        onClick={onComplete}
        className="rounded-xl bg-[#6d35ff] px-8 py-4 font-black text-white"
      >
        Hoàn thành
      </button>
    </section>
  );
}

function WeeklyTopics({ plan }: { plan: WeeklyPlan | null }) {
  const fallback = [
    ["T2", "leaf", "Environment", true],
    ["T3", "bot", "Technology", false],
    ["T4", "book", "Education", false],
    ["T5", "heart", "Health", false],
    ["T6", "globe", "Travel", false],
    ["T7", "library", "Culture", false],
    ["CN", "target", "Review", false],
  ] as const;

  const dayLabelMap: Record<number, string> = {
  0: "Chủ nhật",
  2: "Thứ 2",
  3: "Thứ 3",
  4: "Thứ 4",
  5: "Thứ 5",
  6: "Thứ 6",
  7: "Thứ 7",
};

const getDayLabel = (dayOfWeek: number) => {
  return dayLabelMap[dayOfWeek] || `T${dayOfWeek}`;
};

  const days = plan?.days?.length
    ? plan.days.map(
        (day) =>
          [
            `${getDayLabel(day.dayOfWeek)}`,
            "leaf",
            day.topic?.name || "Topic",
            day.status === "AVAILABLE",
          ] as const,
      )
    : fallback;
  return (
    <Panel title="Chủ đề trong tuần" action="Xem lịch">
      <div className="space-y-2">
        {days.map(([day, icon, label, active]) => (
          <div
            key={String(day)}
            className={`grid grid-cols-[38px_28px_1fr] items-center rounded-xl px-3 py-2.5 text-sm font-black ${active ? "bg-[#efe9ff] text-[#101733]" : "text-[#69708b]"}`}
          >
            <span className={active ? "text-[#6d35ff]" : ""}>{day}</span>
            <AppIcon
              name={icon as AppIconName}
              bare
              size={17}
              className={active ? "text-[#6d35ff]" : "text-[#8b91aa]"}
            />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function StatsPanel({
  stats,
  fallbackLearned,
  notebookCount,
}: {
  stats: VocabStats | null;
  fallbackLearned: number;
  notebookCount: number;
}) {
  return (
    <Panel title="Thống kê của bạn" action="Xem chi tiết">
      <div className="grid grid-cols-3 gap-3 py-3 text-center">
        <MiniStat
          icon="book"
          value={String(stats?.learnedWords || fallbackLearned)}
          label="Từ đã học"
        />
        <MiniStat
          icon="check"
          value={`${stats?.memoryRate || 0}%`}
          label="Tỷ lệ ghi nhớ"
        />
        <MiniStat
          icon="notebook"
          value={String(stats?.notebookWords || notebookCount)}
          label="Sổ tay"
        />
      </div>
    </Panel>
  );
}

function TodayHint({
  suggestions,
  onSelectWord,
}: {
  suggestions: any;
  onSelectWord: (wordId: string) => void;
}) {
  const words = suggestions?.weakWords?.length
    ? suggestions.weakWords.slice(0, 3)
    : fallbackWeakWords.map((word) => ({ word, wordId: "" }));
  return (
    <Panel title="Gợi ý hôm nay">
      <h3 className="font-black">Ôn lại các từ dễ nhầm</h3>
      <p className="mt-2 text-sm font-bold text-[#69708b]">
        {suggestions?.dueToday
          ? `Bạn có ${suggestions.dueToday} từ cần ôn hôm nay`
          : "Chưa có từ cần ôn, hãy học bài hôm nay trước nhé."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {words.map((item: any) => (
          <button
            key={item.word}
            disabled={!item.wordId}
            onClick={() => onSelectWord(item.wordId)}
            className="rounded-lg bg-[#efe9ff] px-3 py-2 text-sm font-black text-[#6d35ff] disabled:cursor-default"
          >
            {item.word}
          </button>
        ))}
      </div>
      <Link
        href="/vocabulary/test"
        className="mt-5 inline-block font-black text-[#6d35ff]"
      >
        Ôn ngay →
      </Link>
    </Panel>
  );
}

function ChallengeCard({
  challenge,
  onOpen,
}: {
  challenge: TodayChallenge | null;
  onOpen: () => void;
}) {
  return (
    <Panel title="Thử thách hôm nay">
      <p className="text-sm font-bold text-[#69708b]">
        {challenge?.locked
          ? challenge.reason
          : `${challenge?.total || 0} câu hỏi từ bài học hôm nay`}
      </p>
      <button
        onClick={onOpen}
        className="mt-4 w-full rounded-xl bg-[#6d35ff] px-5 py-3 font-black text-white"
      >
        Bắt đầu thử thách
      </button>
    </Panel>
  );
}

function LearningTip() {
  return (
    <Panel title="Mẹo học từ vựng">
      <div className="flex items-center gap-5">
        <p className="text-sm font-bold leading-6 text-[#69708b]">
          Học từ theo chủ đề giúp não bộ liên kết thông tin tốt hơn và nhớ lâu
          hơn.
        </p>
        <AppIcon name="leaf" tone="emerald" className="h-14 w-14" size={26} />
      </div>
    </Panel>
  );
}

function DetailModal({
  detail,
  relations,
  onClose,
}: {
  detail: VocabularyWord;
  relations: any;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <h2 className="text-3xl font-black">{detail.word}</h2>
      <p className="mt-2 text-lg font-bold text-[#69708b]">
        {detail.phonetic} · {detail.partOfSpeech || "Từ vựng"}
      </p>
      <div className="mt-6 rounded-2xl bg-[#f8f6ff] p-5">
        <h3 className="font-black">Nghĩa</h3>
        <p className="mt-2 font-bold">{detail.meaningVi || detail.meaningEn}</p>
        <p className="mt-3 text-sm font-bold text-[#69708b]">
          {detail.example}
        </p>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <InfoList title="Đồng nghĩa" items={relations?.synonyms || []} />
        <InfoList title="Trái nghĩa" items={relations?.antonyms || []} />
      </div>
      <div className="mt-5">
        <h3 className="font-black">Cùng chủ đề</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {(relations?.sameTopic || [])
            .slice(0, 8)
            .map((item: VocabularyWord) => (
              <span
                key={item.id}
                className="rounded-lg bg-[#efe9ff] px-3 py-2 text-sm font-black text-[#6d35ff]"
              >
                {item.word}
              </span>
            ))}
        </div>
      </div>
    </Modal>
  );
}

function FlashcardModal({
  flashcard,
  onClose,
  onReview,
}: {
  flashcard: any;
  onClose: () => void;
  onReview: (rating: "AGAIN" | "HARD" | "GOOD" | "EASY") => void;
}) {
  const total = flashcard.session?.cards?.length || 1;
  const index = (flashcard.cardIndex || 0) + 1;
  return (
    <Modal onClose={onClose}>
      <div className="text-center">
        <p className="text-sm font-black uppercase text-[#6d35ff]">
          Flashcard {index}/{total}
        </p>
        <h2 className="mt-3 text-5xl font-black">{flashcard.front}</h2>
        <p className="mt-3 text-xl font-bold text-[#69708b]">
          {flashcard.phonetic}
        </p>
        <div className="mt-8 rounded-3xl bg-[#f8f6ff] p-8">
          <p className="text-2xl font-black">{flashcard.back}</p>
          <p className="mt-4 font-bold text-[#69708b]">{flashcard.example}</p>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-4">
          <button
            onClick={() => onReview("AGAIN")}
            className="rounded-xl border border-[#fecaca] bg-white px-4 py-4 font-black text-[#ef4444]"
          >
            Again
          </button>
          <button
            onClick={() => onReview("HARD")}
            className="rounded-xl border border-[#fed7aa] bg-white px-4 py-4 font-black text-[#f97316]"
          >
            Hard
          </button>
          <button
            onClick={() => onReview("GOOD")}
            className="rounded-xl bg-[#22c55e] px-4 py-4 font-black text-white"
          >
            Good
          </button>
          <button
            onClick={() => onReview("EASY")}
            className="rounded-xl bg-[#6d35ff] px-4 py-4 font-black text-white"
          >
            Easy
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ShareModal({
  content,
  word,
  setContent,
  onSubmit,
  onClose,
}: {
  content: string;
  word: VocabularyWord | null;
  setContent: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <h2 className="text-3xl font-black">Chia sẻ từ vựng</h2>
      <p className="mt-2 font-bold text-[#69708b]">
        Tạo bài viết cộng đồng cho từ{" "}
        <span className="text-[#6d35ff]">{word?.word}</span>
      </p>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={`Hôm nay mình học từ "${word?.word}". ${word?.meaningVi || word?.meaningEn || ""}`}
        className="mt-6 min-h-40 w-full rounded-2xl border border-[#e8e9f5] p-4 font-bold outline-none focus:border-[#6d35ff]"
      />
      <button
        onClick={onSubmit}
        className="mt-5 w-full rounded-xl bg-[#6d35ff] px-5 py-4 font-black text-white"
      >
        Đăng lên cộng đồng
      </button>
    </Modal>
  );
}

function ChallengeModal({
  challenge,
  answers,
  sentence,
  setAnswers,
  setSentence,
  result,
  onSubmit,
  onClose,
}: {
  challenge: TodayChallenge | null;
  answers: Record<string, string>;
  sentence: string;
  setAnswers: (answers: Record<string, string>) => void;
  setSentence: (value: string) => void;
  result: any;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const isSentenceMode =
    challenge?.type === "WRITE_SENTENCE" || Boolean(challenge?.prompt);
  return (
    <Modal onClose={onClose}>
      <h2 className="text-3xl font-black">
        {challenge?.title || "Thử thách hôm nay"}
      </h2>
      {result && (
        <div className="mt-4 rounded-xl bg-[#ecfdf5] p-4 font-black text-[#15803d]">
          {result.feedback ||
            `Kết quả: ${result.correct}/${result.total} câu đúng · ${result.score}%`}
        </div>
      )}
      {isSentenceMode ? (
        <div className="mt-6 rounded-2xl border border-[#e8e9f5] p-5">
          <h3 className="font-black">{challenge?.prompt}</h3>
          {challenge?.hint && (
            <p className="mt-2 text-sm font-bold text-[#69708b]">
              Gợi ý: {challenge.hint}
            </p>
          )}
          <textarea
            value={sentence}
            onChange={(event) => setSentence(event.target.value)}
            placeholder="Ví dụ: We should protect the environment every day."
            className="mt-4 min-h-36 w-full rounded-2xl border border-[#e8e9f5] p-4 font-bold outline-none focus:border-[#6d35ff]"
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {(challenge?.questions || []).map((question, index) => (
            <div
              key={question.wordId}
              className="rounded-2xl border border-[#e8e9f5] p-4"
            >
              <h3 className="font-black">
                Câu {index + 1}: {question.prompt}
              </h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {question.options.map((option) => (
                  <button
                    key={option}
                    onClick={() =>
                      setAnswers({ ...answers, [question.wordId]: option })
                    }
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-black ${answers[question.wordId] === option ? "border-[#6d35ff] bg-[#efe9ff] text-[#6d35ff]" : "border-[#e8e9f5] bg-white"}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={onSubmit}
        className="mt-6 w-full rounded-xl bg-[#6d35ff] px-5 py-4 font-black text-white"
      >
        Nộp bài
      </button>
    </Modal>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-[#e8e9f5] p-4">
      <h3 className="font-black">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <span
              key={item}
              className="rounded-lg bg-[#f1f5f9] px-3 py-2 text-sm font-bold"
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm font-bold text-[#8b91aa]">
            Chưa có dữ liệu
          </span>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: AppIconName;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="mx-auto flex justify-center">
        <AppIcon name={icon} tone="purple" />
      </div>
      <div className="mt-2 text-2xl font-black">{value}</div>
      <p className="mt-1 text-xs font-bold text-[#69708b]">{label}</p>
    </div>
  );
}

function Panel({
  action,
  children,
  title,
}: {
  action?: string;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-[#e8e9f5] bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-xl font-black">{title}</h2>
        {action && (
          <button className="text-sm font-black text-[#6d35ff]">
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101733]/45 p-4 backdrop-blur-sm">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl md:p-8">
        <button
          onClick={onClose}
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#efe9ff] text-2xl font-black text-[#6d35ff]"
        >
          ×
        </button>
        {children}
      </section>
    </div>
  );
}

function LessonCompletedModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const CONFETTI = Array.from({ length: 42 }, (_, i) => ({
    left: `${(i * 37) % 100}%`,
    top: `${(i * 19) % 55}%`,
    rotate: `rotate(${(i * 23) % 90}deg)`,
    color: ["#8b5cf6", "#22c55e", "#f59e0b", "#06b6d4", "#ef4444"][i % 5],
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-[520px] overflow-hidden rounded-[28px] bg-white shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md hover:bg-slate-100"
        >
          <X size={18} className="text-slate-500" />
        </button>

        {/* Confetti background */}
        <div className="absolute inset-0 pointer-events-none">
          {CONFETTI.map((item, i) => (
            <span
              key={i}
              className="absolute h-2 w-1 rounded-full"
              style={{
                left: item.left,
                top: item.top,
                backgroundColor: item.color,
                transform: item.rotate,
              }}
            />
          ))}
        </div>

        {/* Header */}
        <div className="relative px-8 pt-10 text-center">
          <h2 className="text-3xl font-extrabold leading-tight text-violet-600">
            🎉 Đã hoàn thành <br /> bài học hôm nay!
          </h2>

          <p className="mt-3 text-sm text-slate-500">
            Tuyệt vời! Bạn đã hoàn thành tất cả bài học <br />
            và từ vựng của ngày hôm nay.
          </p>

          <img
            src="/mascots/foxy-happy.png"
            alt="Foxy"
            className="mx-auto mt-5 h-48 object-contain"
          />
        </div>

        {/* Content */}
        <div className="relative px-6 pb-7">
          {/* Stats */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="mb-4 text-center text-xs font-bold text-slate-600">
              Thành tích của bạn hôm nay
            </p>

            <div className="grid grid-cols-3 gap-3">
              <StatItem
                icon={<BookOpen size={22} />}
                value="24"
                label="Từ vựng đã học"
                color="text-violet-600"
                bg="bg-violet-100"
              />

              <StatItem
                icon={<Star size={22} />}
                value="320"
                label="XP nhận được"
                color="text-amber-500"
                bg="bg-amber-100"
              />

              <StatItem
                icon={<Target size={22} />}
                value="100%"
                label="Hoàn thành mục tiêu"
                color="text-emerald-500"
                bg="bg-emerald-100"
              />
            </div>
          </div>

          {/* Reward */}
          <div className="mt-4 flex items-center gap-4 rounded-2xl border border-violet-100 bg-violet-50 p-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
              <Gift size={38} className="text-violet-600" />
            </div>

            <div>
              <p className="font-bold text-violet-700">Phần thưởng</p>
              <p className="text-sm text-slate-600">Bạn đã nhận được 50 xu!</p>

              <div className="mt-2 inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-600 shadow-sm">
                💎 +50
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              <RotateCcw size={16} />
              Ôn lại từ đã học
            </button>

            <button className="rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-700">
              Tiếp tục hành trình →
            </button>
          </div>

          <p className="mt-5 text-center text-xs font-medium text-slate-400">
            💗 Hẹn gặp bạn ngày mai nhé!
          </p>
        </div>
      </div>
    </div>
  );
}

function StatItem({
  icon,
  value,
  label,
  color,
  bg,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className={`mb-2 flex h-11 w-11 items-center justify-center rounded-xl ${bg} ${color}`}
      >
        {icon}
      </div>
      <p className="text-lg font-extrabold text-slate-800">{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
