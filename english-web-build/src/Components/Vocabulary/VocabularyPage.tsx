"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { api } from "@/src/lib/axios";
import { speakWord } from "@/src/lib/tts-api";
import { useAuthStore } from "@/src/store/authStore";
import { AppIcon, AppIconName } from "@/src/Components/UI/AppIcon";
import AppLogo from "@/src/Components/UI/AppLogo";
import StudySidebar from "@/src/Components/Layout/StudySidebar";
import { X, Gift, BookOpen, Star, Target, RotateCcw } from "lucide-react";
import { useTranslation } from "@/src/hooks/useTranslation";
import { Locale } from "@/src/i18n/types";
import vocab from "./vocabularyPage.content";

type VocabularyWord = {
  id: string;
  word: string;
  phonetic?: string | null;
  audio?: string | null;
  imageUrl?: string | null;
  partOfSpeech?: string | null;
  meaningVi?: string | null;
  meaningEn?: string | null;
  example?: string | null;
  synonyms?: string[];
  antonyms?: string[];
  difficulty?: number | null;
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
  completed?: boolean;
  reason?: string;
  id?: string;
  status?: string;
  topic?: { id: string; name: string; description?: string | null };
  words?: DailyWordItem[];
  addedWords?: DailyWordItem[];
  addedCount?: number;
  requestedAmount?: number;
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

type NotebookItem = {
  id: string;
  createdAt?: string;
  word: VocabularyWord;
};

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
const fallbackWeakWords = ["pollution", "recycle", "conserve"];

const vocabularyEmojiMap: Record<string, string> = {
  airplane: "2708-fe0f",
  apple: "1f34e",
  bag: "1f45c",
  banana: "1f34c",
  beach: "1f3d6-fe0f",
  bicycle: "1f6b2",
  book: "1f4d6",
  bottle: "1f37e",
  bread: "1f35e",
  bus: "1f68c",
  cake: "1f370",
  camera: "1f4f7",
  car: "1f697",
  cat: "1f431",
  chair: "1fa91",
  city: "1f3d9-fe0f",
  coffee: "2615",
  conservation: "1f331",
  conserve: "1f331",
  computer: "1f4bb",
  doctor: "1f468-200d-2695-fe0f",
  dog: "1f436",
  earth: "1f30d",
  ecology: "1f331",
  "eco-friendly": "1f331",
  ecosystem: "1f333",
  education: "1f3eb",
  efficient: "2699-fe0f",
  electricity: "26a1",
  emission: "1f32b-fe0f",
  enduring: "267e-fe0f",
  environment: "1f30d",
  environmental: "1f331",
  family: "1f46a",
  fire: "1f525",
  flower: "1f33c",
  forest: "1f332",
  fruit: "1f34e",
  globe: "1f30d",
  green: "1f331",
  health: "1f3e5",
  hospital: "1f3e5",
  hotel: "1f3e8",
  house: "1f3e0",
  internet: "1f310",
  leaf: "1f343",
  lemon: "1f34b",
  medicine: "1f48a",
  money: "1f4b0",
  moon: "1f319",
  music: "1f3b5",
  orange: "1f34a",
  paper: "1f4c4",
  phone: "1f4f1",
  pizza: "1f355",
  pollution: "1f3ed",
  plane: "2708-fe0f",
  recycle: "267b-fe0f",
  recyclable: "267b-fe0f",
  renewable: "267b-fe0f",
  reusable: "267b-fe0f",
  rice: "1f35a",
  school: "1f3eb",
  ship: "1f6a2",
  shopping: "1f6cd-fe0f",
  soccer: "26bd",
  star: "2b50",
  sun: "2600-fe0f",
  technology: "1f4bb",
  train: "1f686",
  travel: "1f9f3",
  tree: "1f333",
  viable: "2705",
  water: "1f4a7",
  weather: "2601-fe0f",
};

const escapeSvgText = (value?: string | null) =>
  (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const getVisualTone = (word?: VocabularyWord | null) => {
  const text = `${word?.word || ""} ${word?.meaningEn || ""} ${
    word?.meaningVi || ""
  } ${word?.topic?.name || ""}`.toLowerCase();

  if (
    /(banana|apple|orange|rice|bread|coffee|food|fruit|eat|drink)/.test(text)
  ) {
    return { bg: "#f7e79a", fg: "#f59e0b", icon: "fruit" };
  }
  if (
    /(environment|eco|green|recycle|conservation|tree|forest|nature|sustain)/.test(
      text,
    )
  ) {
    return { bg: "#dcfce7", fg: "#16a34a", icon: "leaf" };
  }
  if (
    /(technology|computer|phone|internet|screen|software|digital)/.test(text)
  ) {
    return { bg: "#dbeafe", fg: "#2563eb", icon: "tech" };
  }
  if (/(travel|hotel|airport|plane|ship|train|city|bus|car)/.test(text)) {
    return { bg: "#e0f2fe", fg: "#0284c7", icon: "travel" };
  }
  if (/(health|doctor|hospital|medicine|body)/.test(text)) {
    return { bg: "#ffe4e6", fg: "#e11d48", icon: "health" };
  }
  if (/(business|money|work|career|market|invoice)/.test(text)) {
    return { bg: "#fef3c7", fg: "#d97706", icon: "business" };
  }

  return { bg: "#efe9ff", fg: "#6d35ff", icon: "word" };
};

const buildVocabularySvg = (word?: VocabularyWord | null) => {
  const tone = getVisualTone(word);
  const label = escapeSvgText(word?.word || "word");
  const meaning = escapeSvgText(
    word?.meaningVi || word?.meaningEn || "Vocabulary",
  );
  const initial = escapeSvgText((word?.word || "V").slice(0, 1).toUpperCase());

  const icons: Record<string, string> = {
    fruit: `<path d="M206 142c35-34 89-36 123-8-29 51-92 70-136 36 2-10 6-20 13-28Z" fill="${tone.fg}"/><path d="M251 95c-4-20 5-39 26-54 13 25 10 49-8 70" fill="#7c3f12"/><path d="M274 116c48-19 92 2 111 32-47 27-103 20-130-15" fill="#facc15"/>`,
    leaf: `<path d="M141 206c31-84 104-132 195-122 3 94-50 159-142 172 18-31 48-62 92-89-56 17-96 50-145 39Z" fill="${tone.fg}"/><path d="M145 221c51-43 95-71 151-91" stroke="#065f46" stroke-width="12" stroke-linecap="round"/>`,
    tech: `<rect x="112" y="98" width="256" height="166" rx="26" fill="${tone.fg}"/><rect x="138" y="125" width="204" height="106" rx="14" fill="#eff6ff"/><path d="M198 294h84M240 264v30" stroke="${tone.fg}" stroke-width="16" stroke-linecap="round"/>`,
    travel: `<path d="M86 211 394 109l-74 192-76-68-66 58 13-83-105 3Z" fill="${tone.fg}"/><path d="m244 233 150-124" stroke="#075985" stroke-width="12" stroke-linecap="round"/>`,
    health: `<path d="M240 330S104 249 104 156c0-42 31-74 72-74 26 0 50 14 64 37 14-23 38-37 64-37 41 0 72 32 72 74 0 93-136 174-136 174Z" fill="${tone.fg}"/><path d="M240 142v92M194 188h92" stroke="#fff" stroke-width="22" stroke-linecap="round"/>`,
    business: `<rect x="116" y="126" width="248" height="174" rx="26" fill="${tone.fg}"/><path d="M188 126v-22c0-20 16-36 36-36h32c20 0 36 16 36 36v22" stroke="#92400e" stroke-width="18" fill="none"/><path d="M116 194h248" stroke="#fef3c7" stroke-width="18"/>`,
    word: `<circle cx="240" cy="178" r="86" fill="${tone.fg}"/><text x="240" y="209" text-anchor="middle" font-family="Arial, sans-serif" font-size="92" font-weight="900" fill="#fff">${initial}</text>`,
  };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360">
    <rect width="480" height="360" rx="34" fill="${tone.bg}"/>
    <circle cx="96" cy="72" r="54" fill="#fff" opacity=".35"/>
    <circle cx="396" cy="292" r="72" fill="#fff" opacity=".28"/>
    ${icons[tone.icon] || icons.word}
    <rect x="76" y="286" width="328" height="46" rx="23" fill="#fff" opacity=".82"/>
    <text x="240" y="316" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="800" fill="#111827">${label}</text>
    <text x="240" y="344" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#6b7280">${meaning}</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const getVocabularyImageUrl = (word?: VocabularyWord | null) => {
  if (!word) return { src: "", mode: "photo" as const };
  if (word.imageUrl) return { src: word.imageUrl, mode: "custom" as const };

  const cleanWord = (word.word || "").toLowerCase().trim();
  const emojiCode = vocabularyEmojiMap[cleanWord];

  if (emojiCode) {
    return {
      src: `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${emojiCode}.svg`,
      mode: "sticker" as const,
    };
  }

  return {
    src: buildVocabularySvg(word),
    mode: "generated" as const,
  };
};

export default function VocabularyPage() {
  const { locale } = useTranslation();
  const c = vocab[locale];
  const user = useAuthStore((state) => state.user);
  const displayName = user?.fullname || "Minh Anh";
  const avatar = user?.avatar || "/cat-home.jpg";

  const [today, setToday] = useState<TodayVocabulary | null>(null);
  const [dailyWords, setDailyWords] = useState<DailyWordItem[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [stats, setStats] = useState<VocabStats | null>(null);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [challenge, setChallenge] = useState<TodayChallenge | null>(null);
  const [notebookItems, setNotebookItems] = useState<NotebookItem[]>([]);
  const [notebookCount, setNotebookCount] = useState(0);
  const [level, setLevel] = useState("A1");
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState<VocabularyWord | null>(null);
  const [relations, setRelations] = useState<any>(null);
  const [inlineRelations, setInlineRelations] = useState<any>(null);
  const [flashcard, setFlashcard] = useState<any>(null);
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeAnswers, setChallengeAnswers] = useState<
    Record<string, string>
  >({});
  const [challengeSentence, setChallengeSentence] = useState("");
  const [challengeResult, setChallengeResult] = useState<any>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareContent, setShareContent] = useState("");
  const [openModalProgress, setOpenModalProgress] = useState(false);
  const [studyStartedAt] = useState(() => Date.now());

  const isTodayCompleted = Boolean(
    today?.completed || today?.status === "COMPLETED",
  );
  const currentItem = dailyWords[activeIndex] || today?.words?.[0] || null;
  const currentWord = currentItem?.word || null;
  const previousItem = activeIndex > 0 ? dailyWords[activeIndex - 1] : null;
  const nextItem =
    activeIndex < dailyWords.length - 1 ? dailyWords[activeIndex + 1] : null;
  const learnedCount = dailyWords.filter((item) =>
    ["KNOWN", "MASTERED", "REVIEW", "LEARNING"].includes(
      item.progress?.status || "",
    ),
  ).length;
  const totalWords = dailyWords.length || today?.words?.length || 10;
  const progressPercent = isTodayCompleted
    ? 100
    : totalWords
      ? Math.round((learnedCount / totalWords) * 100)
      : 0;
  const confidentCount = dailyWords.filter((item) =>
    ["KNOWN", "MASTERED"].includes(item.progress?.status || ""),
  ).length;
  const accuracyPercent = learnedCount
    ? Math.round((confidentCount / learnedCount) * 100)
    : 100;
  const studyMinutes = Math.max(
    1,
    Math.round((Date.now() - studyStartedAt) / 60000),
  );

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
    if (notebookRes.status === "fulfilled") {
      setNotebookItems(notebookRes.value.data || []);
      setNotebookCount(notebookRes.value.data?.length || 0);
    }
    if (challengeRes.status === "fulfilled")
      setChallenge(challengeRes.value.data);

    if (todayRes.status === "fulfilled") {
      const data = todayRes.value.data;
      setToday(data);
      if (data?.completed) {
        setDailyWords(data.words || []);
        setActiveIndex(0);
        setLoading(false);
        return;
      }
      if (data?.id && !data?.locked) {
        try {
          const wordsRes = await api.get(`/vocabulary/daily/${data.id}/words`);
          setDailyWords(wordsRes.data?.words || []);
          setActiveIndex(0);
        } catch {
          setDailyWords([]);
          setMessage(c.messages.loadWordsError);
        }
      } else {
        setDailyWords([]);
      }
    } else {
      setToday(null);
      setDailyWords([]);
      setMessage(c.messages.loadTodayError);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadVocabulary();
  }, []);

  useEffect(() => {
    if (!currentWord?.id) {
      setInlineRelations(null);
      return;
    }

    api
      .get(`/vocabulary/words/${currentWord.id}/relations`)
      .then((res) => setInlineRelations(res.data))
      .catch(() => setInlineRelations(null));
  }, [currentWord?.id]);

  const updateLevel = async (nextLevel: string) => {
    setLevel(nextLevel);
    await api.patch("/vocabulary/profile", { level: nextLevel });
    await loadVocabulary();
  };

  const markProgress = async (status: "KNOWN" | "REVIEW" | "LEARNING") => {
    if (!currentWord?.id || today?.locked || isTodayCompleted) {
      setMessage(
        isTodayCompleted ? c.messages.alreadyCompleted : c.messages.noValidWord,
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

      const nextIndex = activeIndex + 1;
      if (nextIndex < dailyWords.length) {
        setActiveIndex(nextIndex);
        setMessage(
          status === "KNOWN" ? c.messages.savedKnown : c.messages.savedReview,
        );
      } else {
        setMessage(
          status === "KNOWN"
            ? c.messages.savedKnownDone
            : c.messages.savedReviewDone,
        );
      }
    } catch {
      setMessage(c.messages.saveProgressError);
    }
  };
  const toggleNotebook = async () => {
    if (!currentWord?.id) {
      setMessage(c.messages.noWordForNotebook);
      return;
    }
    const isSaved = Boolean(currentItem?.inNotebook);
    try {
      if (isSaved) {
        await api.delete(`/vocabulary/words/${currentWord.id}/notebook`);
        setMessage(c.messages.removedFromNotebook);
      } else {
        await api.post(`/vocabulary/words/${currentWord.id}/notebook`, {
          note: "Lưu từ từ trang học hôm nay",
        });
        setMessage(c.messages.addedToNotebook);
      }
      setDailyWords((items) =>
        items.map((item) =>
          item.wordId === currentWord.id
            ? { ...item, inNotebook: !isSaved }
            : item,
        ),
      );
      const notebookRes = await api.get("/vocabulary/notebook");
      setNotebookItems(notebookRes.data || []);
      setNotebookCount(notebookRes.data?.length || 0);
    } catch {
      setMessage(c.messages.notebookUpdateError);
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
    if (isTodayCompleted) {
      setMessage(c.messages.alreadyCompleted);
      return;
    }
    window.location.href = "/vocabulary/flashcards";
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
      setMessage(c.messages.flashcardCompleted);
    }
    await loadVocabulary();
  };

  const playAudio = () => {
    if (!currentWord?.word) {
      setMessage(c.messages.noAudio);
      return;
    }
    speakWord(currentWord.word, currentWord.audio);
  };

  const nextWord = async () => {
    if (isTodayCompleted) {
      setOpenModalProgress(true);
      return;
    }
    if (!today?.id || !currentWord?.id) return;
    const res = await api.get(
      `/vocabulary/daily/${today.id}/words/${currentWord.id}/navigation`,
    );
    if (res.data?.next) setActiveIndex(res.data.currentIndex + 1);
    else setMessage(c.messages.allWordsViewed);
  };

  const completeToday = async () => {
    if (!today?.id || today.locked || isTodayCompleted) return;
    await api.post(`/vocabulary/daily/${today.id}/complete`);
    setOpenModalProgress(true);
    setMessage(c.messages.completedToday);
    await loadVocabulary();
  };

  const addExtraWords = async (amount: number) => {
    if (!today?.id || today.locked) return;
    const previousTotal = dailyWords.length;
    const res = await api.post(`/vocabulary/daily/${today.id}/extra`, {
      amount,
    });
    const allWords: DailyWordItem[] = res.data?.words || [];
    const addedWords: DailyWordItem[] = res.data?.addedWords || [];
    const firstAddedWordId = addedWords[0]?.wordId;
    const firstAddedIndex =
      firstAddedWordId !== undefined
        ? allWords.findIndex((item) => item.wordId === firstAddedWordId)
        : previousTotal;
    setToday({ ...res.data, completed: false });
    setDailyWords(allWords);
    const nextIndex = firstAddedIndex >= 0 ? firstAddedIndex : previousTotal;
    setActiveIndex(Math.max(0, Math.min(nextIndex, allWords.length - 1)));
    setOpenModalProgress(false);
    setMessage(
      c.messages.extraWordsAdded.replace(
        "{amount}",
        String(res.data?.addedCount || amount),
      ),
    );
  };

  const submitCompletionReview = async (
    reviews: Array<{
      wordId: string;
      rating: "AGAIN" | "HARD" | "GOOD" | "EASY";
    }>,
  ) => {
    const res = await api.post("/vocabulary/flashcards/review", { reviews });
    await loadVocabulary();
    return res.data;
  };

  const shareWord = async () => {
    if (!currentWord?.id) return;
    const res = await api.post(`/vocabulary/words/${currentWord.id}/share`, {
      content: shareContent,
    });
    setShareOpen(false);
    setShareContent("");
    setMessage(
      res.data?.post?.id ? c.messages.sharePosted : c.messages.shareCreated,
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

  if (loading && !today) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#e2e8f0] border-t-[#4f5790]" />
        <p className="font-bold text-[#4f5790]">{c.messages.loadingToday}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-7 px-4 py-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="min-w-0 space-y-4">
          <div className="flex items-center gap-4">
            <Link
              href="/courses"
              className="text-2xl font-black text-[#4f5790]"
            >
              <AppIcon name="chevronLeft" bare size={24} />
            </Link>
            <h1 className="text-2xl font-black">{c.title}</h1>
          </div>

          {today?.locked ? (
            <LockedNotice reason={today.reason} />
          ) : (
            <>
              <WordStudyCard
                activeIndex={activeIndex}
                completed={isTodayCompleted}
                item={currentItem}
                locked={isTodayCompleted}
                total={totalWords}
                word={currentWord}
                onFlashcard={openFlashcard}
                onKnown={() => markProgress("KNOWN")}
                onNotebook={toggleNotebook}
                onReview={() => markProgress("REVIEW")}
                onShare={() => setShareOpen(true)}
                onAudio={playAudio}
              />
              <WordPager
                activeIndex={activeIndex}
                completed={isTodayCompleted}
                nextItem={nextItem}
                previousItem={previousItem}
                total={totalWords}
                onComplete={completeToday}
                onNext={nextWord}
                onPrevious={() =>
                  setActiveIndex((index) => Math.max(0, index - 1))
                }
              />
              <WordDetailTabs
                level={level}
                relations={inlineRelations}
                word={currentWord}
                onFlashcard={openFlashcard}
              />
              {message && (
                <div className="rounded-xl bg-[#ecfdf5] px-5 py-4 font-bold text-[#15803d]">
                  {message}
                </div>
              )}
            </>
          )}
        </section>

        <aside className="space-y-6">
          <StatsPanel
            stats={stats}
            fallbackLearned={
              weeklyPlan?.days?.flatMap((day) => day.words || []).length ||
              totalWords
            }
            notebookCount={notebookCount}
            percent={progressPercent}
          />
          <NotebookPanel
            items={notebookItems}
            currentWord={currentWord}
            onSelectWord={openWordDetail}
          />
          <ReviewSuggestionPanel
            suggestions={suggestions}
            onSelectWord={openWordDetail}
          />
          <ChallengeCard
            challenge={challenge}
            onOpen={() => setShowChallenge(true)}
            word={currentWord?.word}
          />
        </aside>
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
        accuracy={accuracyPercent}
        minutes={studyMinutes}
        open={openModalProgress}
        wordsLearned={totalWords}
        onClose={() => setOpenModalProgress(false)}
        onFinish={() => {
          setOpenModalProgress(false);
          setMessage(c.messages.goalReachedTomorrow);
        }}
        onLearnExtra={(amount) => void addExtraWords(amount)}
        onSubmitReview={submitCompletionReview}
        words={dailyWords.slice(0, totalWords)}
      />
    </>
  );
}

function LockedNotice({ reason }: { reason?: string }) {
  const { locale } = useTranslation();
  const c = vocab[locale];
  return (
    <section className="rounded-2xl border border-[#fed7aa] bg-[#fff7ed] p-5">
      <h2 className="text-xl font-black text-[#c2410c]">{c.locked.title}</h2>
      <p className="mt-2 font-bold text-[#9a3412]">
        {reason || c.locked.defaultReason}
      </p>
      <Link
        href="/vocabulary/test"
        className="mt-4 inline-flex rounded-xl bg-[#6d35ff] px-5 py-3 font-black text-white"
      >
        {c.locked.cta}
      </Link>
    </section>
  );
}

export function VocabularySidebar() {
  return <StudySidebar />;
}

export function TopBar({
  displayName,
  avatar,
}: {
  displayName: string;
  avatar: string;
}) {
  const { locale } = useTranslation();
  const c = vocab[locale];
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
            placeholder={c.topBar.searchPlaceholder}
            className="h-14 w-full rounded-xl border border-[#dfe2f3] bg-white pl-12 pr-4 text-sm font-bold outline-none placeholder:text-[#8b91aa] focus:border-[#6d35ff]"
          />
        </label>
        <div className="ml-auto flex items-center gap-3">
          <TopMetric
            icon="fire"
            value="18"
            label={c.topBar.streak}
            tone="orange"
          />
          <TopMetric
            icon="star"
            value="2,450"
            label={c.topBar.xpToday}
            tone="yellow"
          />
          <TopMetric
            icon="diamond"
            value="5,230"
            label={c.topBar.coins}
            tone="cyan"
          />
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

function WordStudyCard(props: {
  locked: boolean;
  completed: boolean;
  activeIndex: number;
  total: number;
  word: VocabularyWord | null;
  item: DailyWordItem | null;
  onKnown: () => void;
  onReview: () => void;
  onNotebook: () => void;
  onFlashcard: () => void;
  onShare: () => void;
  onAudio: () => void;
}) {
  const { locale } = useTranslation();
  const c = vocab[locale];
  const { completed, item, locked, total, word } = props;
  const displayWord = word?.word || "Environment";
  const meaning =
    word?.meaningVi || word?.meaningEn || "Môi trường, hoàn cảnh xung quanh";
  const example =
    word?.example ||
    "We should protect the environment for future generations.";
  const exampleVi = word?.meaningVi
    ? `Nghĩa: ${word.meaningVi}`
    : "Chúng ta nên bảo vệ môi trường cho các thế hệ tương lai.";
  const image = getVocabularyImageUrl(word);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#ece8fb] bg-white shadow-sm">
      <div className="grid min-h-[340px] gap-6 bg-[#f1edff] p-6 md:grid-cols-[minmax(0,1fr)_360px] md:p-8">
        <div className="min-w-0">
          {completed && (
            <span className="mb-4 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
              {c.studyCard.completedBadge}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-4xl font-black leading-tight text-[#101733] md:text-5xl">
              {displayWord}
            </h2>
            <button
              onClick={props.onAudio}
              className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-[#6d35ff] shadow-sm"
            >
              <AppIcon name="volume" bare size={24} />
            </button>
          </div>

          <p className="mt-4 text-lg font-bold text-[#7377a8]">
            {word?.phonetic || "/ɪnˈvaɪrənmənt/"}
          </p>
          <span className="mt-5 inline-flex rounded-lg bg-[#dcfce7] px-3 py-1.5 text-sm font-black text-[#16a34a]">
            {word?.partOfSpeech || c.studyCard.defaultPartOfSpeech}
          </span>

          <h3 className="mt-6 text-lg font-black text-[#101733]">{meaning}</h3>
          <div className="mt-5 border-l-4 border-[#6d35ff] pl-4">
            <p className="text-sm font-black text-[#6d35ff]">
              {c.studyCard.exampleLabel}
            </p>
            <p className="mt-3 font-bold leading-7 text-[#101733]">{example}</p>
            <p className="mt-1 text-sm font-bold text-[#7377a8]">{exampleVi}</p>
          </div>
        </div>

        <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-[30px] bg-[#f5e79a] p-8 shadow-inner">
          <span className="absolute left-8 top-8 h-16 w-16 rounded-full bg-white/30 blur-xl" />
          <span className="absolute bottom-8 right-10 h-24 w-24 rounded-full bg-[#ffd76a]/60 blur-2xl" />
          <span className="absolute inset-x-12 bottom-8 h-10 rounded-full bg-[#c58a1f]/15 blur-xl" />
          <div className="relative z-10 grid h-full min-h-[210px] w-full place-items-center rounded-[26px] border border-white/40 bg-[#f6e89f]">
            <div className="absolute inset-0 rounded-[26px] bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.65),transparent_28%),radial-gradient(circle_at_70%_75%,rgba(255,184,0,0.22),transparent_32%)]" />
            {image.src ? (
              <img
                src={image.src}
                alt={
                  word?.word ? `Ảnh minh họa từ ${word.word}` : "Ảnh từ vựng"
                }
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
                className={`relative z-10 drop-shadow-[0_18px_18px_rgba(107,67,12,0.22)] ${
                  image.mode === "photo" || image.mode === "custom"
                    ? "h-[210px] w-[260px] rounded-[24px] object-cover"
                    : "h-[190px] w-[230px] object-contain"
                }`}
              />
            ) : (
              <AppIcon
                name="leaf"
                bare
                size={108}
                className="relative z-10 text-emerald-600"
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-t border-[#ece8fb] bg-white p-5 sm:grid-cols-2 lg:grid-cols-5">
        <ActionButton
          active={Boolean(item?.inNotebook)}
          icon="plus"
          label={
            item?.inNotebook
              ? c.studyCard.savedNotebook
              : c.studyCard.addNotebook
          }
          onClick={props.onNotebook}
        />
        <ActionButton
          disabled={locked}
          icon="notebook"
          label={c.studyCard.flashcard}
          onClick={props.onFlashcard}
        />
        <ActionButton
          disabled={locked}
          icon="shield"
          label={c.studyCard.known}
          onClick={props.onKnown}
        />
        <ActionButton
          disabled={locked}
          icon="shield"
          label={c.studyCard.review}
          onClick={props.onReview}
        />
        <ActionButton
          icon="message"
          label={c.studyCard.share}
          onClick={props.onShare}
        />
      </div>

      <div className="border-t border-[#ece8fb] px-6 py-3 text-center text-sm font-black text-[#7377a8]">
        {c.studyCard.wordCounter
          .replace(
            "{current}",
            String(Math.min(props.activeIndex + 1, Math.max(total, 1))),
          )
          .replace("{total}", String(Math.max(total, 1)))}
      </div>
    </section>
  );
}

function ActionButton({
  active,
  disabled,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  disabled?: boolean;
  icon: AppIconName;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "border-[#6d35ff] bg-[#6d35ff] text-white"
          : "border-[#e4e0f4] bg-white text-[#27245f] hover:border-[#6d35ff] hover:text-[#6d35ff]"
      }`}
    >
      <AppIcon name={icon} bare size={17} />
      {label}
    </button>
  );
}

function WordDetailTabs({
  level,
  relations,
  word,
  onFlashcard,
}: {
  level: string;
  relations: any;
  word: VocabularyWord | null;
  onFlashcard: () => void;
}) {
  const { locale } = useTranslation();
  const c = vocab[locale];
  const tabOrder = [
    "detail",
    "example",
    "synonym",
    "antonym",
    "related",
  ] as const;
  const tabLabels: Record<(typeof tabOrder)[number], string> = {
    detail: c.tabs.detail,
    example: c.tabs.example,
    synonym: c.tabs.synonym,
    antonym: c.tabs.antonym,
    related: c.tabs.relatedPhrase,
  };
  const [activeTab, setActiveTab] =
    useState<(typeof tabOrder)[number]>("detail");
  const synonyms = word?.synonyms?.length
    ? word.synonyms
    : relations?.synonyms || [];
  const antonyms = word?.antonyms?.length
    ? word.antonyms
    : relations?.antonyms || [];
  const sameTopic = relations?.sameTopic || [];

  return (
    <section className="overflow-hidden rounded-2xl border border-[#ece8fb] bg-white shadow-sm">
      <div className="flex overflow-x-auto border-b border-[#ece8fb] text-sm font-black text-[#5e6391]">
        {tabOrder.map((tabId) => (
          <button
            key={tabId}
            onClick={() => setActiveTab(tabId)}
            className={`min-w-fit px-7 py-4 ${activeTab === tabId ? "bg-[#f4f0ff] text-[#6d35ff]" : ""}`}
          >
            {tabLabels[tabId]}
          </button>
        ))}
      </div>

      {activeTab === "example" ? (
        <ExampleTabContent
          level={level}
          relations={relations}
          word={word}
          onFlashcard={onFlashcard}
        />
      ) : activeTab === "synonym" ? (
        <SynonymTabContent
          level={level}
          relations={relations}
          synonyms={synonyms}
          word={word}
          onFlashcard={onFlashcard}
        />
      ) : activeTab === "antonym" ? (
        <AntonymTabContent
          antonyms={antonyms}
          relations={relations}
          word={word}
          onFlashcard={onFlashcard}
        />
      ) : activeTab === "related" ? (
        <RelatedPhraseTabContent
          relations={relations}
          word={word}
          onFlashcard={onFlashcard}
        />
      ) : (
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5 text-sm font-bold text-[#59627f]">
            <InfoRow
              label={c.detailTab.wordType}
              value={word?.partOfSpeech || c.studyCard.defaultPartOfSpeech}
            />
            <InfoRow
              label={c.detailTab.level}
              value={level}
              badge={
                word?.difficulty
                  ? `Độ khó ${word.difficulty}`
                  : c.detailTab.mediumBadge
              }
            />
            <InfoRow
              label={c.detailTab.topic}
              value={word?.topic?.name || c.detailTab.defaultTopic}
            />

            <div>
              <p className="font-black text-[#101733]">
                {c.detailTab.wordFamily}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(synonyms.length ? synonyms : [word?.word || "environment"])
                  .slice(0, 4)
                  .map((item: string) => (
                    <span
                      key={item}
                      className="rounded-lg bg-[#efe9ff] px-3 py-1.5 text-xs font-black text-[#6d35ff]"
                    >
                      {item}
                    </span>
                  ))}
              </div>
            </div>

            <div>
              <p className="font-black text-[#101733]">
                {c.detailTab.collocations}
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {(sameTopic.length
                  ? sameTopic
                      .slice(0, 3)
                      .map((item: VocabularyWord) => item.word)
                  : [
                      `learn ${word?.word || "vocabulary"}`,
                      `use ${word?.word || "it"} naturally`,
                      `review ${word?.word || "it"} later`,
                    ]
                ).map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            {antonyms.length > 0 && (
              <div>
                <p className="font-black text-[#101733]">
                  {c.detailTab.antonyms}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {antonyms.slice(0, 4).map((item: string) => (
                    <span
                      key={item}
                      className="rounded-lg bg-[#fff1f2] px-3 py-1.5 text-xs font-black text-[#e11d48]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-[#f7f5ff] p-6">
            <p className="font-black text-[#101733]">{c.detailTab.memoTitle}</p>
            <p className="mt-4 text-sm font-bold leading-6 text-[#27245f]">
              {c.detailTab.memoText.replace("{word}", word?.word || "word")}
            </p>
            <div className="mt-8 flex items-end gap-5">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-white text-[#f97316] shadow-sm">
                <AppIcon name="paw" bare size={72} />
              </div>
              <div className="rounded-2xl bg-white p-4 text-sm font-bold leading-6 text-[#101733] shadow-sm">
                {c.detailTab.flashcardTip}
                <button
                  onClick={onFlashcard}
                  className="mt-4 block rounded-xl bg-[#6d35ff] px-5 py-3 text-sm font-black text-white"
                >
                  {c.detailTab.learnWithFlashcard}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ExampleTabContent({
  level,
  relations,
  word,
  onFlashcard,
}: {
  level: string;
  relations: any;
  word: VocabularyWord | null;
  onFlashcard: () => void;
}) {
  const { locale } = useTranslation();
  const c = vocab[locale];
  const image = getVocabularyImageUrl(word);
  const sameTopic = relations?.sameTopic || [];
  const examples = [
    word?.example ||
      `The city is investing in ${word?.word || "sustainable"} energy sources to reduce carbon emissions.`,
    `We should use ${word?.word || "this word"} naturally in daily English.`,
    `This company is committed to ${word?.word || "English"} development.`,
  ];
  const viExamples = [
    word?.meaningVi
      ? `Nghĩa chính: ${word.meaningVi}.`
      : "Thành phố đang đầu tư vào các nguồn năng lượng bền vững để giảm lượng khí thải carbon.",
    "Chúng ta nên dùng từ này tự nhiên trong tiếng Anh hằng ngày.",
    "Công ty này cam kết phát triển bền vững.",
  ];
  const family = (
    word?.synonyms?.length
      ? word.synonyms
      : sameTopic.map((item: VocabularyWord) => item.word)
  ).slice(0, 3);

  return (
    <div className="grid gap-6 p-5 lg:grid-cols-[210px_minmax(0,1fr)]">
      <aside className="space-y-5 text-sm font-bold text-[#4f5790]">
        <ExampleMeta
          label={c.detailTab.wordType}
          value={word?.partOfSpeech || "adjective (tính từ)"}
        />
        <ExampleMeta
          action={
            word?.word ? () => speakWord(word.word, word.audio) : undefined
          }
          label={c.exampleTab.phonetic}
          value={word?.phonetic || "/səˈsteɪ.nə.bəl/"}
        />
        <ExampleMeta
          badge={level}
          label={c.detailTab.level}
          value={
            word?.difficulty ? `Độ khó ${word.difficulty}` : "Trung cấp cao"
          }
        />
        <ExampleMeta
          icon="leaf"
          label={c.detailTab.topic}
          value={word?.topic?.name || "Environment"}
        />

        <div>
          <p className="font-black text-[#101733]">{c.detailTab.wordFamily}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(family.length ? family : ["sustain", "sustainability"])
              .slice(0, 3)
              .map((item: string) => (
                <span
                  key={item}
                  className="rounded-lg bg-[#efe9ff] px-2.5 py-1 text-xs font-black text-[#6d35ff]"
                >
                  {item}
                </span>
              ))}
          </div>
        </div>

        <div>
          <p className="font-black text-[#101733]">
            {c.detailTab.collocations}
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-5">
            {(sameTopic.length
              ? sameTopic.slice(0, 4).map((item: VocabularyWord) => item.word)
              : [
                  `${word?.word || "sustainable"} development`,
                  `${word?.word || "sustainable"} energy`,
                  `${word?.word || "sustainable"} solution`,
                  `${word?.word || "sustainable"} future`,
                ]
            ).map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="overflow-hidden rounded-2xl border border-[#ece8fb] bg-white shadow-sm">
        <div className="grid gap-5 bg-[#f7f2ff] p-6 md:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-3xl font-black text-[#6d35ff]">
                {word?.word || "sustainable"}
              </h3>
              <button
                onClick={() => word?.word && speakWord(word.word, word.audio)}
                className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#6d35ff] shadow-sm"
              >
                <AppIcon name="volume" bare size={18} />
              </button>
            </div>
            <p className="mt-3 text-sm font-bold text-[#4f5790]">
              {word?.phonetic || "/səˈsteɪ.nə.bəl/"}
            </p>
            <p className="mt-5 text-sm font-black text-[#101733]">
              {c.exampleTab.meaning}
            </p>
            <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-[#4f5790]">
              {word?.meaningVi ||
                word?.meaningEn ||
                "Có thể duy trì lâu dài mà không gây hại cho môi trường hoặc cạn kiệt tài nguyên."}
            </p>
          </div>

          <div className="grid min-h-[140px] place-items-center rounded-2xl bg-[#f6e89f] p-4">
            {image.src ? (
              <img
                src={image.src}
                alt={word?.word ? `Ảnh minh họa từ ${word.word}` : "Ảnh ví dụ"}
                className={`h-28 w-40 rounded-xl ${
                  image.mode === "sticker" ? "object-contain" : "object-cover"
                }`}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <AppIcon
                name="leaf"
                bare
                size={64}
                className="text-emerald-600"
              />
            )}
          </div>
        </div>

        <div className="p-6">
          <h4 className="text-xl font-black">{c.exampleTab.examplesTitle}</h4>
          <div className="mt-4 space-y-3">
            {examples.map((example, index) => (
              <div
                key={`${example}-${index}`}
                className="flex gap-3 rounded-xl border border-[#ece8fb] bg-white p-4"
              >
                <span className="font-black text-[#101733]">{index + 1}.</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black leading-6 text-[#101733]">
                    {highlightWord(example, word?.word)}
                  </p>
                  <p className="mt-1 text-sm font-bold leading-6 text-[#69708b]">
                    {viExamples[index]}
                  </p>
                </div>
                <button
                  onClick={() => word?.word && speakWord(word.word, word.audio)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#efe9ff] text-[#6d35ff]"
                >
                  <AppIcon name="volume" bare size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button className="inline-flex items-center gap-2 rounded-xl border border-[#e8e9f5] px-6 py-3 text-sm font-black text-[#6d35ff]">
              <AppIcon name="notebook" bare size={16} />
              {c.exampleTab.saveWord}
            </button>
            <button
              onClick={onFlashcard}
              className="inline-flex items-center gap-2 rounded-xl bg-[#6d35ff] px-8 py-3 text-sm font-black text-white"
            >
              <AppIcon name="notebook" bare size={16} />
              {c.detailTab.learnWithFlashcard}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SynonymTabContent({
  level,
  relations,
  synonyms,
  word,
  onFlashcard,
}: {
  level: string;
  relations: any;
  synonyms: string[];
  word: VocabularyWord | null;
  onFlashcard: () => void;
}) {
  const { locale } = useTranslation();
  const c = vocab[locale];
  const image = getVocabularyImageUrl(word);
  const sameTopic = relations?.sameTopic || [];
  const synonymItems: Array<{
    word: string;
    phonetic: string;
    meaning: string;
    example: string;
    level: string;
    image: ReturnType<typeof getVocabularyImageUrl>;
  }> = (
    synonyms.length
      ? synonyms
      : sameTopic.length
        ? sameTopic.slice(0, 5).map((item: VocabularyWord) => item.word)
        : ["eco-friendly", "renewable", "viable", "lasting", "enduring"]
  )
    .slice(0, 6)
    .map((item: string, index: number) => {
      const synonymWord: VocabularyWord = {
        id: `${item}-${index}`,
        word: item,
        meaningVi: buildSynonymMeaning(item),
      };
      return {
        word: item,
        phonetic: buildSimplePhonetic(item),
        meaning: buildSynonymMeaning(item),
        example: buildSynonymExample(item),
        level: index < 2 ? "B1" : "B2",
        image: getVocabularyImageUrl(synonymWord),
      };
    });

  return (
    <div>
      <div className="grid gap-5 bg-[#f7f2ff] p-6 md:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-black text-[#6d35ff]">
              {word?.word || "sustainable"}
            </h3>
            <button
              onClick={() => word?.word && speakWord(word.word, word.audio)}
              className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#6d35ff] shadow-sm"
            >
              <AppIcon name="volume" bare size={16} />
            </button>
          </div>
          <p className="mt-2 text-sm font-bold text-[#4f5790]">
            {word?.phonetic || "/səˈsteɪ.nə.bəl/"}
          </p>
          <p className="mt-4 max-w-xl text-sm font-bold leading-6 text-[#4f5790]">
            {word?.meaningVi ||
              word?.meaningEn ||
              "Có thể duy trì lâu dài mà không gây hại cho môi trường hoặc cạn kiệt tài nguyên."}
          </p>
        </div>

        <div className="grid min-h-[130px] place-items-center rounded-2xl bg-[#f6e89f] p-4">
          {image.src ? (
            <img
              src={image.src}
              alt={word?.word ? `Ảnh minh họa từ ${word.word}` : "Ảnh từ chính"}
              className={`h-28 w-40 rounded-xl ${
                image.mode === "sticker" ? "object-contain" : "object-cover"
              }`}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <AppIcon name="leaf" bare size={64} className="text-emerald-600" />
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-xl font-black">{c.synonymTab.title}</h4>
            <p className="mt-1 text-sm font-bold text-[#69708b]">
              {c.synonymTab.subtitle.replace(
                "{word}",
                word?.word || "sustainable",
              )}
            </p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl border border-[#e8e9f5] px-4 py-2 text-sm font-black text-[#6d35ff]">
            <AppIcon name="sparkles" bare size={15} />
            {c.synonymTab.viewAll}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {synonymItems.map((item, index) => (
            <article
              key={item.word}
              className="rounded-2xl border border-[#ece8fb] bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-[#6d35ff]">
                      {index + 1}. {item.word}
                    </span>
                    <button className="text-[#6d35ff]">
                      <AppIcon name="volume" bare size={13} />
                    </button>
                  </div>
                  <p className="mt-1 text-xs font-bold text-[#4f5790]">
                    {item.phonetic}
                  </p>
                  <span className="mt-2 inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-700">
                    {item.level}
                  </span>
                </div>

                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#eefdf4]">
                  {item.image.src ? (
                    <img
                      src={item.image.src}
                      alt={`Ảnh minh họa từ đồng nghĩa ${item.word}`}
                      className={`h-11 w-11 ${
                        item.image.mode === "sticker"
                          ? "object-contain"
                          : "rounded-full object-cover"
                      }`}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <AppIcon
                      name="leaf"
                      bare
                      size={28}
                      className="text-emerald-600"
                    />
                  )}
                </div>
              </div>

              <p className="mt-3 text-sm font-black text-[#101733]">
                {item.meaning}
              </p>
              <p className="mt-2 text-sm font-bold leading-6 text-[#4f5790]">
                {highlightWord(item.example, item.word)}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f7f2ff] p-5">
          <div className="flex items-center gap-3">
            <AppIcon name="sparkles" tone="purple" />
            <div>
              <p className="font-black">{c.synonymTab.quickMemoTitle}</p>
              <p className="text-sm font-bold text-[#69708b]">
                {c.synonymTab.quickMemoDesc}
              </p>
            </div>
          </div>
          <button
            onClick={onFlashcard}
            className="inline-flex items-center gap-2 rounded-xl border border-[#6d35ff] px-6 py-3 text-sm font-black text-[#6d35ff]"
          >
            <AppIcon name="zap" bare size={15} />
            {c.synonymTab.practiceNow}
          </button>
        </div>
      </div>
    </div>
  );
}

function AntonymTabContent({
  antonyms,
  relations,
  word,
  onFlashcard,
}: {
  antonyms: string[];
  relations: any;
  word: VocabularyWord | null;
  onFlashcard: () => void;
}) {
  const { locale } = useTranslation();
  const c = vocab[locale];
  const image = getVocabularyImageUrl(word);
  const sameTopic = relations?.sameTopic || [];
  const antonymItems: Array<{
    word: string;
    phonetic: string;
    meaning: string;
    example: string;
    level: string;
    image: ReturnType<typeof getVocabularyImageUrl>;
    icon: AppIconName;
  }> = (
    antonyms.length
      ? antonyms
      : ["unsustainable", "destructive", "harmful", "wasteful", "short-term"]
  )
    .slice(0, 6)
    .map((item: string, index: number) => {
      const antonymWord: VocabularyWord = {
        id: `${item}-${index}`,
        word: item,
        meaningVi: buildAntonymMeaning(item),
      };
      const icons: AppIconName[] = ["zap", "settings", "x", "gift", "calendar"];
      return {
        word: item,
        phonetic: buildSimplePhonetic(item),
        meaning: buildAntonymMeaning(item),
        example: buildAntonymExample(item),
        level: index < 3 ? "B1" : "B2",
        image: getVocabularyImageUrl(antonymWord),
        icon: icons[index % icons.length],
      };
    });

  return (
    <div>
      <div className="grid gap-5 bg-[#f7f2ff] p-6 md:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-black text-[#6d35ff]">
              {word?.word || "sustainable"}
            </h3>
            <button
              onClick={() => word?.word && speakWord(word.word, word.audio)}
              className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#6d35ff] shadow-sm"
            >
              <AppIcon name="volume" bare size={16} />
            </button>
          </div>
          <p className="mt-2 text-sm font-bold text-[#4f5790]">
            {word?.phonetic || "/səˈsteɪ.nə.bəl/"}
          </p>
          <p className="mt-4 max-w-xl text-sm font-bold leading-6 text-[#4f5790]">
            {word?.meaningVi ||
              word?.meaningEn ||
              "Có thể duy trì lâu dài mà không gây hại cho môi trường hoặc cạn kiệt tài nguyên."}
          </p>
        </div>

        <div className="grid min-h-[130px] place-items-center rounded-2xl bg-[#f6e89f] p-4">
          {image.src ? (
            <img
              src={image.src}
              alt={word?.word ? `Ảnh minh họa từ ${word.word}` : "Ảnh từ chính"}
              className={`h-28 w-40 rounded-xl ${
                image.mode === "sticker" ? "object-contain" : "object-cover"
              }`}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <AppIcon name="leaf" bare size={64} className="text-emerald-600" />
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="mb-5">
          <h4 className="text-xl font-black">{c.antonymTab.title}</h4>
          <p className="mt-1 text-sm font-bold text-[#69708b]">
            {c.antonymTab.subtitle.replace(
              "{word}",
              word?.word || "sustainable",
            )}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {antonymItems.map((item, index) => (
            <article
              key={item.word}
              className="rounded-2xl border border-[#f4dfe4] bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-[#e11d48]">
                      {index + 1}. {item.word}
                    </span>
                    <button className="text-[#6d35ff]">
                      <AppIcon name="volume" bare size={13} />
                    </button>
                  </div>
                  <p className="mt-1 text-xs font-bold text-[#4f5790]">
                    {item.phonetic}
                  </p>
                  <span className="mt-2 inline-flex rounded-md bg-orange-100 px-2 py-0.5 text-[11px] font-black text-orange-600">
                    {item.level}
                  </span>
                </div>

                <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full bg-red-50">
                  {item.image.src && item.image.mode === "sticker" ? (
                    <img
                      src={item.image.src}
                      alt={`Ảnh minh họa từ trái nghĩa ${item.word}`}
                      className="h-10 w-10 object-contain opacity-80"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <AppIcon
                      name={item.icon}
                      bare
                      size={26}
                      className="text-red-500"
                    />
                  )}
                </div>
              </div>

              <p className="mt-3 text-sm font-black text-[#101733]">
                {item.meaning}
              </p>
              <p className="mt-2 text-sm font-bold leading-6 text-[#4f5790]">
                {highlightWord(item.example, item.word)}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl border border-[#e8e9f5] px-6 py-3 text-sm font-black text-[#6d35ff]">
            <AppIcon name="notebook" bare size={16} />
            {c.exampleTab.saveWord}
          </button>
          <button
            onClick={onFlashcard}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6d35ff] px-8 py-3 text-sm font-black text-white"
          >
            <AppIcon name="zap" bare size={16} />
            {c.synonymTab.practiceNow}
          </button>
        </div>
      </div>
    </div>
  );
}

function RelatedPhraseTabContent({
  relations,
  word,
  onFlashcard,
}: {
  relations: any;
  word: VocabularyWord | null;
  onFlashcard: () => void;
}) {
  const { locale } = useTranslation();
  const c = vocab[locale];
  const image = getVocabularyImageUrl(word);
  const baseWord = word?.word || "sustainable";
  const sameTopic = relations?.sameTopic || [];
  const phrases = buildRelatedPhrases(baseWord, sameTopic);

  return (
    <div>
      <div className="grid gap-5 bg-[#f7f2ff] p-6 md:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-black text-[#6d35ff]">{baseWord}</h3>
            <button
              onClick={() => word?.word && speakWord(word.word, word.audio)}
              className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#6d35ff] shadow-sm"
            >
              <AppIcon name="volume" bare size={16} />
            </button>
          </div>
          <p className="mt-2 text-sm font-bold text-[#4f5790]">
            {word?.phonetic || "/səˈsteɪ.nə.bəl/"}
          </p>
          <p className="mt-4 max-w-xl text-sm font-bold leading-6 text-[#4f5790]">
            {word?.meaningVi ||
              word?.meaningEn ||
              "Có thể duy trì lâu dài mà không gây hại cho môi trường hoặc cạn kiệt tài nguyên."}
          </p>
        </div>

        <div className="grid min-h-[130px] place-items-center rounded-2xl bg-[#f6e89f] p-4">
          {image.src ? (
            <img
              src={image.src}
              alt={word?.word ? `Ảnh minh họa từ ${word.word}` : "Ảnh từ chính"}
              className={`h-28 w-40 rounded-xl ${
                image.mode === "sticker" ? "object-contain" : "object-cover"
              }`}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <AppIcon name="leaf" bare size={64} className="text-emerald-600" />
          )}
        </div>
      </div>

      <div className="p-6">
        <h4 className="text-xl font-black">
          {c.relatedPhraseTab.title.replace("{word}", baseWord)}
        </h4>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {phrases.map((item, index) => (
            <article
              key={item.phrase}
              className="flex gap-4 rounded-2xl border border-[#ece8fb] bg-white p-4 shadow-sm"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#efe9ff] text-sm font-black text-[#6d35ff]">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-[#6d35ff]">{item.phrase}</p>
                    <p className="mt-1 text-sm font-bold text-[#4f5790]">
                      {item.meaning}
                    </p>
                  </div>
                  <button
                    onClick={() => word?.word && speakWord(word.word, word.audio)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#efe9ff] text-[#6d35ff]"
                  >
                    <AppIcon name="volume" bare size={15} />
                  </button>
                </div>
                <p className="mt-3 text-sm font-bold leading-6 text-[#4f5790]">
                  {highlightWord(item.example, item.phrase)}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl border border-[#e8e9f5] px-6 py-3 text-sm font-black text-[#6d35ff]">
            <AppIcon name="notebook" bare size={16} />
            {c.exampleTab.saveWord}
          </button>
          <button
            onClick={onFlashcard}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6d35ff] px-8 py-3 text-sm font-black text-white"
          >
            <AppIcon name="zap" bare size={16} />
            {c.synonymTab.practiceNow}
          </button>
        </div>
      </div>
    </div>
  );
}

function buildRelatedPhrases(
  word: string,
  sameTopic: VocabularyWord[],
): Array<{ phrase: string; meaning: string; example: string }> {
  const clean = word.toLowerCase();
  const presets: Record<
    string,
    Array<{ phrase: string; meaning: string; example: string }>
  > = {
    sustainable: [
      {
        phrase: "sustainable development",
        meaning: "phát triển bền vững",
        example: "The UN promotes sustainable development worldwide.",
      },
      {
        phrase: "sustainable energy",
        meaning: "năng lượng bền vững",
        example: "Solar and wind are examples of sustainable energy.",
      },
      {
        phrase: "sustainable future",
        meaning: "tương lai bền vững",
        example: "We must act now to secure a sustainable future.",
      },
      {
        phrase: "sustainable living",
        meaning: "lối sống bền vững",
        example: "He adopted a sustainable living to reduce waste.",
      },
      {
        phrase: "sustainable solutions",
        meaning: "giải pháp bền vững",
        example: "We need sustainable solutions to climate change.",
      },
      {
        phrase: "sustainable practices",
        meaning: "thực hành bền vững",
        example: "The company follows sustainable practices in production.",
      },
      {
        phrase: "environmentally sustainable",
        meaning: "bền vững về môi trường",
        example:
          "This product is made with environmentally sustainable materials.",
      },
      {
        phrase: "financially sustainable",
        meaning: "bền vững về tài chính",
        example: "The project is financially sustainable in the long term.",
      },
    ],
  };

  if (presets[clean]) return presets[clean];

  const topicWords = sameTopic.slice(0, 4).map((item) => item.word);
  const base = [
    `${word} practice`,
    `${word} habit`,
    `${word} solution`,
    `${word} example`,
    `${word} idea`,
    `${word} topic`,
    `${word} skill`,
    `${word} review`,
  ];

  return base.map((phrase, index) => ({
    phrase,
    meaning: topicWords[index % Math.max(topicWords.length, 1)]
      ? `liên quan đến ${topicWords[index % topicWords.length]}`
      : "cụm từ liên quan",
    example: `Try using ${phrase} in a natural English sentence.`,
  }));
}

function buildSimplePhonetic(value: string) {
  const clean = value.toLowerCase().replace(/[^a-z]/g, "");
  return clean ? `/${clean.slice(0, 8)}/` : "/word/";
}

function buildSynonymMeaning(value: string) {
  const meanings: Record<string, string> = {
    "eco-friendly": "thân thiện với môi trường",
    conservation: "sự bảo tồn",
    conserve: "bảo tồn, giữ gìn",
    durable: "bền, dùng được lâu",
    ecology: "sinh thái học",
    ecosystem: "hệ sinh thái",
    efficient: "hiệu quả, tiết kiệm",
    environmental: "thuộc về môi trường",
    green: "xanh, thân thiện với môi trường",
    lasting: "lâu dài",
    reusable: "có thể tái sử dụng",
    renewable: "có thể tái tạo",
    recycle: "tái chế",
    recyclable: "có thể tái chế",
    responsible: "có trách nhiệm",
    sustain: "duy trì",
    sustainable: "bền vững",
    sustainability: "sự bền vững",
    viable: "khả thi, có thể duy trì",
    enduring: "bền vững, lâu dài",
  };
  return meanings[value.toLowerCase()] || "Nghĩa đang cập nhật";
}

function buildSynonymExample(value: string) {
  const examples: Record<string, string> = {
    "eco-friendly": "This product is made from eco-friendly materials.",
    renewable: "Solar energy is a renewable resource.",
    viable: "We need a viable solution for the future.",
    lasting: "They built a lasting partnership.",
    enduring: "Enduring habits lead to success.",
  };
  return (
    examples[value.toLowerCase()] || `Try using ${value} in your own sentence.`
  );
}

function buildAntonymMeaning(value: string) {
  const meanings: Record<string, string> = {
    destructive: "gây hủy hoại",
    harmful: "có hại",
    "short-term": "ngắn hạn",
    unsustainable: "không bền vững",
    wasteful: "lãng phí",
  };
  return meanings[value.toLowerCase()] || "Nghĩa đang cập nhật";
}

function buildAntonymExample(value: string) {
  const examples: Record<string, string> = {
    destructive: "Deforestation is a destructive action for ecosystems.",
    harmful: "Using plastic bags is harmful to marine life.",
    "short-term": "We need long-term solutions, not short-term fixes.",
    unsustainable: "Rapid population growth is unsustainable.",
    wasteful: "It is wasteful to leave the lights on all day.",
  };
  return (
    examples[value.toLowerCase()] || `Try using ${value} in your own sentence.`
  );
}

function ExampleMeta({
  action,
  badge,
  icon,
  label,
  value,
}: {
  action?: () => void;
  badge?: string;
  icon?: AppIconName;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="font-black text-[#101733]">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        {icon && <AppIcon name={icon} tone="emerald" size={15} />}
        {badge && (
          <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-700">
            {badge}
          </span>
        )}
        <span className="text-xs leading-5">{value}</span>
        {action && (
          <button
            onClick={action}
            className="grid h-7 w-7 place-items-center rounded-lg bg-[#efe9ff] text-[#6d35ff]"
          >
            <AppIcon name="volume" bare size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function highlightWord(text: string, word?: string) {
  if (!word) return text;
  const index = text.toLowerCase().indexOf(word.toLowerCase());
  if (index < 0) return text;

  return (
    <>
      {text.slice(0, index)}
      <span className="text-[#6d35ff]">
        {text.slice(index, index + word.length)}
      </span>
      {text.slice(index + word.length)}
    </>
  );
}

function InfoRow({
  badge,
  label,
  value,
}: {
  badge?: string;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="font-black text-[#101733]">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span>{value}</span>
        {badge && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

function WordPager({
  activeIndex,
  completed,
  nextItem,
  previousItem,
  total,
  onComplete,
  onNext,
  onPrevious,
}: {
  activeIndex: number;
  completed: boolean;
  nextItem: DailyWordItem | null;
  previousItem: DailyWordItem | null;
  total: number;
  onComplete: () => void;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const { locale } = useTranslation();
  const c = vocab[locale];
  const isLast = activeIndex >= total - 1;
  return (
    <section className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
      <button
        disabled={!previousItem}
        onClick={onPrevious}
        className="flex items-center gap-3 rounded-xl border border-[#ece8fb] bg-white px-5 py-4 text-left font-black text-[#101733] shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        <AppIcon name="chevronLeft" bare size={20} className="text-[#6d35ff]" />
        <span>
          <span className="block">{c.pager.prevWord}</span>
          <span className="block text-xs text-[#7377a8]">
            {previousItem?.word?.word || c.pager.none}
          </span>
        </span>
      </button>
      <div className="text-center text-sm font-black text-[#27245f]">
        {Math.min(activeIndex + 1, Math.max(total, 1))} / {Math.max(total, 1)}
      </div>
      {isLast ? (
        <button
          disabled={completed}
          onClick={onComplete}
          className="rounded-xl bg-[#6d35ff] px-5 py-4 font-black text-white shadow-sm disabled:cursor-not-allowed disabled:bg-emerald-500"
        >
          {completed ? c.pager.completed : c.pager.completeLesson}
        </button>
      ) : (
        <button
          disabled={!nextItem}
          onClick={onNext}
          className="flex items-center justify-end gap-3 rounded-xl border border-[#ece8fb] bg-white px-5 py-4 text-right font-black text-[#101733] shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span>
            <span className="block">{c.pager.nextWord}</span>
            <span className="block text-xs text-[#7377a8]">
              {nextItem?.word?.word || c.pager.none}
            </span>
          </span>
          <AppIcon
            name="chevronRight"
            bare
            size={20}
            className="text-[#6d35ff]"
          />
        </button>
      )}
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
              disabled={locked}
              className="inline-flex items-center gap-2 rounded-lg bg-[#eef6ff] px-3 py-2 text-sm font-black text-[#2563eb] disabled:cursor-not-allowed disabled:opacity-50"
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
          disabled={locked}
          className="self-center rounded-full border border-[#e8e9f5] bg-white px-4 py-5 text-3xl font-black text-[#101733] shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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
  completed,
  learned,
  percent,
  total,
  onComplete,
}: {
  completed?: boolean;
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
        disabled={completed}
        className="rounded-xl bg-[#6d35ff] px-8 py-4 font-black text-white disabled:cursor-not-allowed disabled:bg-[#22c55e]"
      >
        {completed ? "Đã hoàn thành" : "Hoàn thành"}
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
  percent,
}: {
  stats: VocabStats | null;
  fallbackLearned: number;
  notebookCount: number;
  percent: number;
}) {
  const { locale } = useTranslation();
  const c = vocab[locale];
  const mastered = stats?.masteredWords || 0;
  const learned = stats?.learnedWords || fallbackLearned;
  const reviewDue = stats?.reviewDue || 0;
  const displayPercent = stats?.memoryRate || percent || 0;

  return (
    <Panel title={c.statsPanel.title}>
      <div className="grid items-center gap-6 sm:grid-cols-[150px_1fr]">
        <div
          className="grid h-36 w-36 place-items-center rounded-full"
          style={{
            background: `conic-gradient(#6d35ff ${displayPercent * 3.6}deg, #ebe7ff 0deg)`,
          }}
        >
          <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center">
            <span>
              <span className="block text-3xl font-black text-[#101733]">
                {displayPercent}%
              </span>
              <span className="block text-xs font-bold text-[#7377a8]">
                {c.statsPanel.mastered}
              </span>
            </span>
          </div>
        </div>
        <div className="space-y-4 text-sm font-bold text-[#59627f]">
          <ProgressLegend
            color="#7c3aed"
            label={c.statsPanel.learned}
            value={`${learned} ${c.statsPanel.unit}`}
          />
          <ProgressLegend
            color="#22c55e"
            label={c.statsPanel.toMastered}
            value={`${mastered} ${c.statsPanel.unit}`}
          />
          <ProgressLegend
            color="#ef4444"
            label={c.statsPanel.toReview}
            value={`${reviewDue} ${c.statsPanel.unit}`}
          />
          <ProgressLegend
            color="#6d35ff"
            label={c.statsPanel.notebook}
            value={`${stats?.notebookWords || notebookCount} ${c.statsPanel.unit}`}
          />
        </div>
      </div>
    </Panel>
  );
}

function ProgressLegend({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </span>
      <span className="font-black text-[#27245f]">{value}</span>
    </div>
  );
}

function NotebookPanel({
  currentWord,
  items,
  onSelectWord,
}: {
  currentWord: VocabularyWord | null;
  items: NotebookItem[];
  onSelectWord: (wordId: string) => void;
}) {
  const { locale } = useTranslation();
  const c = vocab[locale];
  const dateLocales: Record<Locale, string> = {
    vi: "vi-VN",
    en: "en-US",
    zh: "zh-CN",
    de: "de-DE",
  };
  const list = items.length
    ? items.slice(0, 3)
    : currentWord
      ? [{ id: currentWord.id, word: currentWord }]
      : [];

  return (
    <Panel title={c.notebookPanel.title} action={c.notebookPanel.viewAll}>
      <div className="space-y-3">
        {list.length ? (
          list.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectWord(item.word.id)}
              className="grid w-full grid-cols-[48px_1fr_24px] items-center gap-3 rounded-xl px-1 py-2 text-left hover:bg-[#f8f6ff]"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#efe9ff] text-[#6d35ff]">
                <AppIcon name="notebook" bare size={22} />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-black text-[#101733]">
                  {item.word.word}
                </span>
                <span className="block truncate text-xs font-bold text-[#7377a8]">
                  {item.createdAt
                    ? c.notebookPanel.addedOn.replace(
                        "{date}",
                        new Date(item.createdAt).toLocaleDateString(
                          dateLocales[locale],
                        ),
                      )
                    : item.word.meaningVi ||
                      item.word.meaningEn ||
                      c.notebookPanel.defaultLabel}
                </span>
              </span>
              <AppIcon
                name="notebook"
                bare
                size={18}
                className="text-[#6d35ff]"
              />
            </button>
          ))
        ) : (
          <p className="text-sm font-bold text-[#7377a8]">
            {c.notebookPanel.empty}
          </p>
        )}
      </div>
    </Panel>
  );
}

function ReviewSuggestionPanel({
  suggestions,
  onSelectWord,
}: {
  suggestions: any;
  onSelectWord: (wordId: string) => void;
}) {
  const { locale } = useTranslation();
  const c = vocab[locale];
  const words = suggestions?.weakWords?.length
    ? suggestions.weakWords.slice(0, 3)
    : fallbackWeakWords.map((word) => ({ word, wordId: "" }));
  return (
    <Panel title={c.reviewSuggestion.title} action={c.reviewSuggestion.viewAll}>
      <div className="space-y-3">
        {words.map((item: any) => (
          <button
            key={item.word}
            disabled={!item.wordId}
            onClick={() => onSelectWord(item.wordId)}
            className="grid w-full grid-cols-[48px_1fr] items-center gap-3 rounded-xl px-1 py-2 text-left disabled:cursor-default"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <AppIcon name="leaf" bare size={22} />
            </span>
            <span>
              <span className="block font-black text-[#101733]">
                {item.word}
              </span>
              <span className="block text-xs font-bold text-[#7377a8]">
                {item.meaningVi ||
                  item.meaningEn ||
                  item.status ||
                  c.reviewSuggestion.defaultMeta}
              </span>
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function ChallengeCard({
  challenge,
  onOpen,
  word,
}: {
  challenge: TodayChallenge | null;
  onOpen: () => void;
  word?: string;
}) {
  const { locale } = useTranslation();
  const c = vocab[locale];
  const total = challenge?.total || 1;
  const done = 0;
  return (
    <Panel title={c.challengeCard.title}>
      <div className="flex items-start gap-3">
        <AppIcon name="target" tone="purple" />
        <p className="text-sm font-bold leading-6 text-[#59627f]">
          {challenge?.locked
            ? challenge.reason
            : challenge?.prompt ||
              c.challengeCard.defaultPrompt.replace(
                "{word}",
                challenge?.word || word || "vocabulary",
              )}
        </p>
      </div>
      <div className="mt-5 flex items-center gap-3 text-sm font-black text-[#7377a8]">
        <span>
          {done}/{total}
        </span>
        <div className="h-2 flex-1 rounded-full bg-[#eeeafb]">
          <div
            className="h-2 rounded-full bg-[#6d35ff]"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
        <span className="text-[#6d35ff]">+10 XP</span>
      </div>
      <button
        onClick={onOpen}
        disabled={Boolean(challenge?.locked)}
        className="mt-6 w-full rounded-xl border border-[#6d35ff] bg-white px-5 py-3 font-black text-[#6d35ff] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {c.challengeCard.start}
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
  const { locale } = useTranslation();
  const c = vocab[locale];
  return (
    <Modal onClose={onClose}>
      <h2 className="text-3xl font-black">{detail.word}</h2>
      <p className="mt-2 text-lg font-bold text-[#69708b]">
        {detail.phonetic} · {detail.partOfSpeech || c.detailModal.defaultType}
      </p>
      <div className="mt-6 rounded-2xl bg-[#f8f6ff] p-5">
        <h3 className="font-black">{c.detailModal.meaning}</h3>
        <p className="mt-2 font-bold">{detail.meaningVi || detail.meaningEn}</p>
        <p className="mt-3 text-sm font-bold text-[#69708b]">
          {detail.example}
        </p>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <InfoList
          title={c.detailModal.synonyms}
          items={relations?.synonyms || []}
        />
        <InfoList
          title={c.detailModal.antonyms}
          items={relations?.antonyms || []}
        />
      </div>
      <div className="mt-5">
        <h3 className="font-black">{c.detailModal.sameTopic}</h3>
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
  const { locale } = useTranslation();
  const c = vocab[locale];
  const total = flashcard.session?.cards?.length || 1;
  const index = (flashcard.cardIndex || 0) + 1;
  return (
    <Modal onClose={onClose}>
      <div className="text-center">
        <p className="text-sm font-black uppercase text-[#6d35ff]">
          {c.flashcardModal.counter
            .replace("{index}", String(index))
            .replace("{total}", String(total))}
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
            {c.flashcardModal.again}
          </button>
          <button
            onClick={() => onReview("HARD")}
            className="rounded-xl border border-[#fed7aa] bg-white px-4 py-4 font-black text-[#f97316]"
          >
            {c.flashcardModal.hard}
          </button>
          <button
            onClick={() => onReview("GOOD")}
            className="rounded-xl bg-[#22c55e] px-4 py-4 font-black text-white"
          >
            {c.flashcardModal.good}
          </button>
          <button
            onClick={() => onReview("EASY")}
            className="rounded-xl bg-[#6d35ff] px-4 py-4 font-black text-white"
          >
            {c.flashcardModal.easy}
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
  const { locale } = useTranslation();
  const c = vocab[locale];
  return (
    <Modal onClose={onClose}>
      <h2 className="text-3xl font-black">{c.shareModal.title}</h2>
      <p className="mt-2 font-bold text-[#69708b]">
        {c.shareModal.subtitle}{" "}
        <span className="text-[#6d35ff]">{word?.word}</span>
      </p>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={c.shareModal.placeholder
          .replace("{word}", word?.word || "")
          .replace("{meaning}", word?.meaningVi || word?.meaningEn || "")}
        className="mt-6 min-h-40 w-full rounded-2xl border border-[#e8e9f5] p-4 font-bold outline-none focus:border-[#6d35ff]"
      />
      <button
        onClick={onSubmit}
        className="mt-5 w-full rounded-xl bg-[#6d35ff] px-5 py-4 font-black text-white"
      >
        {c.shareModal.postButton}
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
  const { locale } = useTranslation();
  const c = vocab[locale];
  const isSentenceMode =
    challenge?.type === "WRITE_SENTENCE" || Boolean(challenge?.prompt);
  return (
    <Modal onClose={onClose}>
      <h2 className="text-3xl font-black">
        {challenge?.title || c.challengeModal.defaultTitle}
      </h2>
      {result && (
        <div className="mt-4 rounded-xl bg-[#ecfdf5] p-4 font-black text-[#15803d]">
          {result.feedback ||
            c.challengeModal.resultFallback
              .replace("{correct}", String(result.correct))
              .replace("{total}", String(result.total))
              .replace("{score}", String(result.score))}
        </div>
      )}
      {isSentenceMode ? (
        <div className="mt-6 rounded-2xl border border-[#e8e9f5] p-5">
          <h3 className="font-black">{challenge?.prompt}</h3>
          {challenge?.hint && (
            <p className="mt-2 text-sm font-bold text-[#69708b]">
              {c.challengeModal.hint}: {challenge.hint}
            </p>
          )}
          <textarea
            value={sentence}
            onChange={(event) => setSentence(event.target.value)}
            placeholder={c.challengeModal.sentencePlaceholder}
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
                {c.challengeModal.questionLabel.replace(
                  "{n}",
                  String(index + 1),
                )}
                : {question.prompt}
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
        {c.challengeModal.submit}
      </button>
    </Modal>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  const { locale } = useTranslation();
  const c = vocab[locale];
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
            {c.infoListEmpty}
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

function buildReviewOptions(
  words: DailyWordItem[],
  current: VocabularyWord | undefined,
  type: "meaning" | "word",
) {
  const correct =
    type === "meaning"
      ? current?.meaningVi || current?.meaningEn || current?.word || ""
      : current?.word || "";
  const distractors = words
    .map((item) =>
      type === "meaning"
        ? item.word.meaningVi || item.word.meaningEn || item.word.word
        : item.word.word,
    )
    .filter((value) => value && value !== correct)
    .slice(0, 3);

  return [correct, ...distractors]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function blankReviewWord(example?: string | null, word?: string | null) {
  if (!example || !word) return `Use "${word || "this word"}" in a sentence.`;
  const pattern = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return example.replace(pattern, "_____");
}

function LessonCompletedModal({
  accuracy,
  minutes,
  open,
  onClose,
  onFinish,
  onLearnExtra,
  onSubmitReview,
  words,
  wordsLearned,
}: {
  accuracy: number;
  minutes: number;
  open: boolean;
  onClose: () => void;
  onFinish: () => void;
  onLearnExtra: (amount: number) => void;
  onSubmitReview: (
    reviews: Array<{
      wordId: string;
      rating: "AGAIN" | "HARD" | "GOOD" | "EASY";
    }>,
  ) => Promise<any>;
  words: DailyWordItem[];
  wordsLearned: number;
}) {
  const { locale } = useTranslation();
  const c = vocab[locale];
  const [mode, setMode] = useState<
    "summary" | "review" | "reviewDone" | "explore"
  >("summary");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewInput, setReviewInput] = useState("");
  const [reviewAnswers, setReviewAnswers] = useState<
    Array<{ wordId: string; rating: "AGAIN" | "HARD" | "GOOD" | "EASY" }>
  >([]);
  const [reviewResult, setReviewResult] = useState<any>(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  if (!open) return null;

  const CONFETTI = Array.from({ length: 42 }, (_, i) => ({
    left: `${(i * 37) % 100}%`,
    top: `${(i * 19) % 55}%`,
    rotate: `rotate(${(i * 23) % 90}deg)`,
    color: ["#8b5cf6", "#22c55e", "#f59e0b", "#06b6d4", "#ef4444"][i % 5],
  }));

  const reviewWords = words.filter((item) => item.word?.id).slice(0, 10);
  const currentReviewItem = reviewWords[reviewIndex];
  const currentReviewWord = currentReviewItem?.word;
  const currentReviewMode = reviewIndex % 5;
  const meaningOptions = buildReviewOptions(
    reviewWords,
    currentReviewWord,
    "meaning",
  );
  const wordOptions = buildReviewOptions(
    reviewWords,
    currentReviewWord,
    "word",
  );

  const answerReview = async (rating: "AGAIN" | "HARD" | "GOOD" | "EASY") => {
    if (!currentReviewWord?.id || submittingReview) return;

    const nextAnswers = [
      ...reviewAnswers.filter((item) => item.wordId !== currentReviewWord.id),
      { wordId: currentReviewWord.id, rating },
    ];
    setReviewAnswers(nextAnswers);
    setReviewInput("");

    if (reviewIndex + 1 < reviewWords.length) {
      setReviewIndex((index) => index + 1);
      return;
    }

    setSubmittingReview(true);
    try {
      const result = await onSubmitReview(nextAnswers);
      setReviewResult(result);
      setMode("reviewDone");
    } finally {
      setSubmittingReview(false);
    }
  };

  const submitTypedReview = () => {
    if (!currentReviewWord) return;
    const expected = (currentReviewWord.word || "").trim().toLowerCase();
    const actual = reviewInput.trim().toLowerCase();
    void answerReview(actual === expected ? "GOOD" : "AGAIN");
  };

  if (mode === "review") {
    if (!currentReviewWord) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4 backdrop-blur-sm">
        <div className="w-full max-w-[560px] rounded-[28px] bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-violet-600">
                {c.completedModal.reviewCounter
                  .replace("{index}", String(reviewIndex + 1))
                  .replace("{total}", String(reviewWords.length))}
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-950">
                {c.completedModal.reviewModes[currentReviewMode]}
              </h2>
            </div>
            <button
              onClick={() => setMode("summary")}
              className="rounded-full bg-slate-100 p-2"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-6 rounded-2xl bg-violet-50 p-5">
            {currentReviewMode === 0 && (
              <>
                <p className="text-4xl font-black text-violet-700">
                  {currentReviewWord.word}
                </p>
                <p className="mt-3 text-lg font-bold text-slate-700">
                  {currentReviewWord.meaningVi || currentReviewWord.meaningEn}
                </p>
                <p className="mt-3 text-sm font-semibold text-slate-500">
                  {currentReviewWord.example ||
                    "Try using this word in your own sentence."}
                </p>
              </>
            )}

            {currentReviewMode === 1 && (
              <>
                <p className="text-sm font-bold text-slate-500">
                  {c.completedModal.chooseCorrectMeaning}
                </p>
                <p className="mt-2 text-3xl font-black text-violet-700">
                  {currentReviewWord.word}
                </p>
                <div className="mt-5 grid gap-2">
                  {meaningOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() =>
                        void answerReview(
                          option ===
                            (currentReviewWord.meaningVi ||
                              currentReviewWord.meaningEn)
                            ? "GOOD"
                            : "AGAIN",
                        )
                      }
                      className="rounded-xl border border-violet-100 bg-white px-4 py-3 text-left text-sm font-bold hover:bg-violet-100"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}

            {currentReviewMode === 2 && (
              <>
                <p className="text-sm font-bold text-slate-500">
                  {c.completedModal.typeWordMeaning}
                </p>
                <p className="mt-2 text-xl font-black text-slate-900">
                  {currentReviewWord.meaningVi || currentReviewWord.meaningEn}
                </p>
                <input
                  value={reviewInput}
                  onChange={(event) => setReviewInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitTypedReview();
                  }}
                  className="mt-5 w-full rounded-xl border border-violet-100 px-4 py-3 font-bold outline-none focus:border-violet-500"
                  placeholder={c.completedModal.typeWordPlaceholder}
                />
              </>
            )}

            {currentReviewMode === 3 && (
              <>
                <button
                  onClick={() =>
                    currentReviewWord.word &&
                    speakWord(currentReviewWord.word, currentReviewWord.audio)
                  }
                  className="rounded-xl bg-violet-600 px-5 py-3 font-black text-white"
                >
                  {c.completedModal.listenAndChoose}
                </button>
                <p className="mt-3 text-sm font-bold text-slate-500">
                  {c.completedModal.listenNoAudioFallback}{" "}
                  {currentReviewWord.meaningVi || currentReviewWord.meaningEn}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {wordOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() =>
                        void answerReview(
                          option === currentReviewWord.word ? "GOOD" : "AGAIN",
                        )
                      }
                      className="rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm font-bold hover:bg-violet-100"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}

            {currentReviewMode === 4 && (
              <>
                <p className="text-sm font-bold text-slate-500">
                  {c.completedModal.fillMissingWord}
                </p>
                <p className="mt-2 text-lg font-black text-slate-900">
                  {blankReviewWord(
                    currentReviewWord.example,
                    currentReviewWord.word,
                  )}
                </p>
                <input
                  value={reviewInput}
                  onChange={(event) => setReviewInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitTypedReview();
                  }}
                  className="mt-5 w-full rounded-xl border border-violet-100 px-4 py-3 font-bold outline-none focus:border-violet-500"
                  placeholder={c.completedModal.fillMissingPlaceholder}
                />
              </>
            )}
          </div>

          {[2, 4].includes(currentReviewMode) ? (
            <button
              onClick={submitTypedReview}
              className="mt-5 w-full rounded-xl bg-violet-600 py-3 font-black text-white"
            >
              {c.completedModal.check}
            </button>
          ) : currentReviewMode === 0 ? (
            <div className="mt-5 grid grid-cols-3 gap-2">
              <button
                onClick={() => void answerReview("AGAIN")}
                className="rounded-xl bg-red-50 py-3 font-black text-red-600"
              >
                {c.completedModal.forgot}
              </button>
              <button
                onClick={() => void answerReview("HARD")}
                className="rounded-xl bg-amber-50 py-3 font-black text-amber-600"
              >
                {c.completedModal.hard}
              </button>
              <button
                onClick={() => void answerReview("GOOD")}
                className="rounded-xl bg-emerald-50 py-3 font-black text-emerald-600"
              >
                {c.completedModal.remembered}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (mode === "reviewDone") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4 backdrop-blur-sm">
        <div className="w-full max-w-[480px] rounded-[28px] bg-white p-7 text-center shadow-2xl">
          <h2 className="text-3xl font-extrabold text-violet-600">
            {c.completedModal.reviewDoneTitle}
          </h2>
          <p className="mt-3 font-bold text-slate-600">
            {c.completedModal.reviewDoneDesc
              .replace("{remembered}", String(reviewResult?.remembered || 0))
              .replace(
                "{total}",
                String(reviewResult?.total || reviewWords.length),
              )}
          </p>
          <button
            onClick={onFinish}
            className="mt-6 w-full rounded-xl bg-violet-600 py-3 font-black text-white"
          >
            {c.completedModal.finishToday}
          </button>
        </div>
      </div>
    );
  }

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
            {c.completedModal.title.split("\n").map((line, index) => (
              <span key={index}>
                {index > 0 && <br />}
                {line.trim()}
              </span>
            ))}
          </h2>

          <p className="mt-3 text-sm text-slate-500">
            {c.completedModal.subtitle}
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
              {c.completedModal.statsTitle}
            </p>

            <div className="grid grid-cols-3 gap-3">
              <StatItem
                icon={<BookOpen size={22} />}
                value={String(wordsLearned)}
                label={c.completedModal.newWords}
                color="text-violet-600"
                bg="bg-violet-100"
              />

              <StatItem
                icon={<Star size={22} />}
                value={`${accuracy}%`}
                label={c.completedModal.accuracy}
                color="text-amber-500"
                bg="bg-amber-100"
              />

              <StatItem
                icon={<Target size={22} />}
                value={c.completedModal.minutes.replace("{n}", String(minutes))}
                label={c.completedModal.time}
                color="text-emerald-500"
                bg="bg-emerald-100"
              />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm font-black text-amber-800">
              {c.completedModal.tipTitle}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              {c.completedModal.tipDesc}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-4 rounded-2xl border border-violet-100 bg-violet-50 p-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
              <Gift size={38} className="text-violet-600" />
            </div>

            <div>
              <p className="font-bold text-violet-700">
                {c.completedModal.tomorrowTitle}
              </p>
              <p className="text-sm text-slate-600">
                {c.completedModal.tomorrowDesc}
              </p>

              <div className="mt-2 inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-600 shadow-sm">
                {c.completedModal.srsLine}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <button
              onClick={() => setMode("review")}
              disabled={!reviewWords.length}
              className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
            >
              <RotateCcw size={16} />
              {c.completedModal.reviewNow}
            </button>

            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 20].map((amount) => (
                <button
                  key={amount}
                  onClick={() => onLearnExtra(amount)}
                  className="rounded-xl border border-violet-100 bg-white py-3 text-sm font-bold text-violet-700 hover:bg-violet-50"
                >
                  {c.completedModal.learnMore.replace(
                    "{amount}",
                    String(amount),
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={onFinish}
              className="rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              {c.completedModal.finishToday}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/speaking"
                className="rounded-xl bg-emerald-50 py-3 text-center text-sm font-bold text-emerald-700 hover:bg-emerald-100"
              >
                {c.completedModal.goSpeaking}
              </Link>
              <Link
                href="/reading"
                className="rounded-xl bg-sky-50 py-3 text-center text-sm font-bold text-sky-700 hover:bg-sky-100"
              >
                {c.completedModal.goReading}
              </Link>
            </div>
          </div>

          <p className="mt-5 text-center text-xs font-medium text-slate-400">
            {c.completedModal.footerNote}
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
