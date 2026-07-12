"use client";

import {
  ChevronLeft,
  Headphones,
  Play,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/axios";
import StudySidebar from "@/src/Components/Layout/StudySidebar";
import {
  getApiErrorMessage,
  unwrap,
} from "./listening.helpers";

const topics = [
  { icon: "☕", name: "Daily Life" },
  { icon: "🎒", name: "School" },
  { icon: "🧳", name: "Travel" },
  { icon: "💼", name: "Work" },
  { icon: "💗", name: "Health" },
  { icon: "🍔", name: "Food" },
  { icon: "💻", name: "Technology" },
  { icon: "🌿", name: "Environment" },
];

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function ListeningTopicPage() {
  const router = useRouter();
  const [selectedTopic, setSelectedTopic] =
    useState("Daily Life");
  const [selectedLevel, setSelectedLevel] =
    useState("B1");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    try {
      setStarting(true);
      setError("");

      const response = await api.post<any>(
        "/listening/practice/start",
        {
          topic: selectedTopic,
          level: selectedLevel,
          limit: 10,
        },
      );

      const payload = unwrap<{ sessionId: string }>(
        response.data,
      );

      router.push(
        `/listening/practice/${payload.sessionId}`,
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Không bắt đầu được bài theo chủ đề.",
        ),
      );
    } finally {
      setStarting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fbfbff] text-[#101733]">
      <div className="mx-auto flex min-h-screen max-w-[1920px]">
        <StudySidebar />

        <section className="min-w-0 flex-1 px-5 py-7 lg:px-10">
          <div className="mx-auto max-w-[1300px]">
            <button
              onClick={() => router.push("/listening")}
              className="inline-flex items-center gap-2 font-bold text-violet-600"
            >
              <ChevronLeft size={18} />
              Listening Home
            </button>

            <section className="mt-6 rounded-3xl bg-gradient-to-r from-violet-700 to-indigo-600 p-8 text-white">
              <div className="flex items-center gap-4">
                <Headphones size={42} />
                <div>
                  <h1 className="text-3xl font-black">
                    Nghe theo chủ đề
                  </h1>
                  <p className="mt-2 text-white/75">
                    Chọn level và topic. Backend sẽ tạo hoặc
                    resume session phù hợp.
                  </p>
                </div>
              </div>
            </section>

            {error && (
              <div className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-600">
                {error}
              </div>
            )}

            <section className="mt-7 rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">
                Chọn trình độ
              </h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {levels.map((level) => (
                  <button
                    key={level}
                    onClick={() =>
                      setSelectedLevel(level)
                    }
                    className={`rounded-xl px-5 py-3 font-black ${
                      selectedLevel === level
                        ? "bg-violet-600 text-white"
                        : "bg-slate-50"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>

              <h2 className="mt-8 text-xl font-black">
                Chọn chủ đề
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {topics.map((topic) => (
                  <button
                    key={topic.name}
                    onClick={() =>
                      setSelectedTopic(topic.name)
                    }
                    className={`rounded-2xl border p-5 text-left ${
                      selectedTopic === topic.name
                        ? "border-violet-500 bg-violet-50"
                        : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <div className="text-3xl">
                      {topic.icon}
                    </div>
                    <p className="mt-3 font-black">
                      {topic.name}
                    </p>
                  </button>
                ))}
              </div>

              <button
                disabled={starting}
                onClick={start}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-4 font-black text-white disabled:opacity-50"
              >
                <Play size={19} />
                {starting
                  ? "Đang chuẩn bị..."
                  : `Bắt đầu ${selectedTopic} · ${selectedLevel}`}
              </button>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
