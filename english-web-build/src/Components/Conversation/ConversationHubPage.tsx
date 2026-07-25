"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Sparkles } from "lucide-react";
import {
  BeaconVieButton,
  BeaconVieCard,
  BeaconVieSectionHeader,
  BeaconVieSkeleton,
  BeaconVieState,
} from "@/src/Components/UI/BeaconVie";
import {
  ConversationMode,
  ConversationScenario,
  getConversationScenarios,
  startConversation,
} from "@/src/lib/conversation-api";

const MODE_LABELS: Record<string, string> = {
  FREE: "Free Conversation",
  TOPIC: "Topic",
  SCENARIO: "Scenario",
  ROLEPLAY: "Role Play",
  INTERVIEW: "Interview",
  TRAVEL: "Travel",
  BUSINESS: "Business",
  DAILY_ENGLISH: "Daily English",
  DEBATE: "Debate",
  STORY: "Story",
};

const MODE_FILTERS = ["ALL", ...Object.keys(MODE_LABELS)];

export default function ConversationHubPage() {
  const router = useRouter();
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; data: ConversationScenario[] }
  >({ status: "loading" });
  const [filter, setFilter] = useState("ALL");
  const [startingCode, setStartingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setState({ status: "loading" });
    getConversationScenarios()
      .then((data) => setState({ status: "ready", data }))
      .catch(() => setState({ status: "error" }));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const filtered = useMemo(() => {
    if (state.status !== "ready") return [];
    if (filter === "ALL") return state.data;
    return state.data.filter((s) => s.mode === filter);
  }, [state, filter]);

  async function handleStart(scenarioCode?: string, mode?: ConversationMode) {
    setError(null);
    setStartingCode(scenarioCode ?? mode ?? "free");
    try {
      const { session } = await startConversation(
        scenarioCode ? { scenarioCode } : { mode },
      );
      router.push(`/conversation/${session.id}`);
    } catch {
      setError("Could not start this conversation. Please try again.");
      setStartingCode(null);
    }
  }

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      <BeaconVieSectionHeader
        eyebrow="AI Conversation Partner"
        title="Practice speaking English with an AI partner"
        description="Pick a scenario, roleplay, interview, or just chat freely — every conversation is scored and counts toward your Speaking skill, XP, and achievements."
        action={
          <BeaconVieButton onClick={() => handleStart(undefined, "FREE")} loading={startingCode === "free"}>
            <Sparkles aria-hidden className="h-4 w-4" />
            Start free conversation
          </BeaconVieButton>
        }
      />

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {MODE_FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-2 text-sm font-black transition ${
              filter === key
                ? "bg-[var(--BeaconVie-primary)] text-white"
                : "border border-[var(--BeaconVie-border)] text-[var(--BeaconVie-muted)] hover:bg-[var(--BeaconVie-hover-tint)]"
            }`}
          >
            {key === "ALL" ? "All" : MODE_LABELS[key]}
          </button>
        ))}
      </div>

      {state.status === "loading" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <BeaconVieSkeleton key={i} className="h-40" />
          ))}
        </div>
      )}

      {state.status === "error" && (
        <BeaconVieState
          title="Couldn't load conversation scenarios"
          description="Something went wrong while loading the scenario list."
          actionLabel="Thử lại"
          onAction={load}
          tone="error"
        />
      )}

      {state.status === "ready" && filtered.length === 0 && (
        <BeaconVieState
          title="No scenarios in this category yet"
          description="Try a different filter, or start a free conversation instead."
          actionLabel="Start free conversation"
          onAction={() => handleStart(undefined, "FREE")}
        />
      )}

      {state.status === "ready" && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((scenario) => (
            <BeaconVieCard key={scenario.code} className="flex flex-col p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--BeaconVie-primary-soft)] text-[var(--BeaconVie-primary)]">
                  <MessageCircle aria-hidden className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-[var(--BeaconVie-border)] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-[var(--BeaconVie-muted)]">
                  {scenario.difficulty}
                </span>
              </div>
              <h3 className="text-lg font-black text-[var(--BeaconVie-ink)]">{scenario.title}</h3>
              <p className="mt-1 flex-1 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
                {scenario.description}
              </p>
              {scenario.goals.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs font-bold text-[var(--BeaconVie-muted)]">
                  {scenario.goals.slice(0, 2).map((goal) => (
                    <li key={goal} className="flex items-start gap-1.5">
                      <span aria-hidden>•</span>
                      {goal}
                    </li>
                  ))}
                </ul>
              )}
              <BeaconVieButton
                className="mt-4 w-full"
                tone="soft"
                loading={startingCode === scenario.code}
                onClick={() => handleStart(scenario.code)}
              >
                Start conversation
              </BeaconVieButton>
            </BeaconVieCard>
          ))}
        </div>
      )}
    </div>
  );
}
