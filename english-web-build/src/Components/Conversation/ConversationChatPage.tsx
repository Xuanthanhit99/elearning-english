"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Send, Square, RotateCcw } from "lucide-react";
import {
  LumiverseBadge,
  LumiverseButton,
  LumiverseCard,
  LumiverseSkeleton,
  LumiverseState,
} from "@/src/Components/UI/Lumiverse";
import {
  ConversationFinishResult,
  ConversationMessage,
  ConversationSession,
  finishConversation,
  getConversation,
  streamConversationMessage,
} from "@/src/lib/conversation-api";

type LocalMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  pending?: boolean;
  failed?: boolean;
};

export default function ConversationChatPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; session: ConversationSession }
  >({ status: "loading" });
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [lastFailedInput, setLastFailedInput] = useState<string | null>(null);
  const [result, setResult] = useState<ConversationFinishResult | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  function loadSession() {
    setState({ status: "loading" });
    getConversation(sessionId)
      .then((session) => {
        setState({ status: "ready", session });
        setMessages(
          session.messages.map((m: ConversationMessage) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          })),
        );
      })
      .catch(() => setState({ status: "error" }));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingText]);

  // Ctrl/Cmd+Enter also sends; Escape cancels an in-flight generation —
  // matches Part 9's "keyboard shortcuts" requirement without hijacking
  // plain Enter (which stays newline-in-textarea, Shift+Enter free too).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isStreaming) {
        handleCancel();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming]);

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isStreaming || result) return;

    setLastFailedInput(null);
    const userMessageId = `local-user-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMessageId, role: "USER", content: trimmed }]);
    setInput("");
    setIsStreaming(true);
    setStreamingText("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamConversationMessage(sessionId, trimmed, {
        signal: controller.signal,
        onChunk: (chunk) => setStreamingText((prev) => prev + chunk),
      });
      setStreamingText((finalText) => {
        setMessages((prev) => [
          ...prev,
          { id: `local-assistant-${Date.now()}`, role: "ASSISTANT", content: finalText },
        ]);
        return "";
      });
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        // Cancelled — whatever streamed so far is still shown as a (marked)
        // partial reply rather than silently discarded.
        setStreamingText((partial) => {
          if (partial) {
            setMessages((prev) => [
              ...prev,
              {
                id: `local-assistant-${Date.now()}`,
                role: "ASSISTANT",
                content: partial,
                pending: true,
              },
            ]);
          }
          return "";
        });
      } else {
        setLastFailedInput(trimmed);
        setMessages((prev) => prev.filter((m) => m.id !== userMessageId));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleRetry() {
    if (lastFailedInput) {
      const toRetry = lastFailedInput;
      setLastFailedInput(null);
      void sendMessage(toRetry);
    }
  }

  async function handleFinish() {
    setFinishing(true);
    setFinishError(null);
    try {
      const finished = await finishConversation(sessionId);
      setResult(finished);
    } catch {
      setFinishError("Could not finish this conversation. Please try again.");
    } finally {
      setFinishing(false);
    }
  }

  if (state.status === "loading") {
    return (
      <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-3xl flex-col gap-4 px-4 py-6">
        <LumiverseSkeleton className="h-14" />
        <LumiverseSkeleton className="flex-1" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <LumiverseState
          title="Couldn't load this conversation"
          description="It may not exist, or you may not have access to it."
          actionLabel="Retry"
          onAction={loadSession}
          tone="error"
        />
      </div>
    );
  }

  const { session } = state;

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-3xl flex-col px-4 py-4 sm:py-6">
      <header className="mb-3 flex items-center gap-3 border-b border-[var(--lumiverse-border)] pb-3">
        <Link
          href="/conversation"
          aria-label="Back to conversation topics"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--lumiverse-border)] text-[var(--lumiverse-muted)] transition hover:bg-[var(--lumiverse-hover-tint)]"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-black text-[var(--lumiverse-ink)]">
            {session.scenario?.title ?? "Free Conversation"}
          </h1>
          <p className="text-xs font-bold text-[var(--lumiverse-muted)]">
            {session.difficulty} · {session.mode.replace("_", " ")}
          </p>
        </div>
        {session.status === "ACTIVE" && !result && (
          <LumiverseButton tone="soft" onClick={handleFinish} loading={finishing}>
            Finish & get feedback
          </LumiverseButton>
        )}
      </header>

      {finishError && (
        <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {finishError}
        </div>
      )}

      {result ? (
        <ConversationResultView result={result} />
      ) : (
        <>
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto pb-4"
            role="log"
            aria-live="polite"
            aria-label="Conversation messages"
          >
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isStreaming && (
              <MessageBubble
                message={{ id: "streaming", role: "ASSISTANT", content: streamingText }}
                typing={streamingText.length === 0}
              />
            )}
          </div>

          {lastFailedInput && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              <span>Message failed to send.</span>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-black text-white"
              >
                <RotateCcw aria-hidden className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <label htmlFor="conversation-input" className="sr-only">
              Type your message
            </label>
            <textarea
              id="conversation-input"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  void sendMessage(input);
                }
              }}
              placeholder="Type your reply in English... (Ctrl+Enter to send)"
              rows={2}
              disabled={isStreaming || session.status !== "ACTIVE"}
              className="lumiverse-input min-h-[52px] flex-1 resize-none rounded-2xl border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card-soft)] px-4 py-3 text-sm font-semibold text-[var(--lumiverse-ink)] outline-none focus:border-[var(--lumiverse-primary)]"
            />
            {isStreaming ? (
              <LumiverseButton type="button" tone="danger" onClick={handleCancel} aria-label="Stop generating">
                <Square aria-hidden className="h-4 w-4" />
              </LumiverseButton>
            ) : (
              <LumiverseButton
                type="submit"
                disabled={!input.trim() || session.status !== "ACTIVE"}
                aria-label="Send message"
              >
                <Send aria-hidden className="h-4 w-4" />
              </LumiverseButton>
            )}
          </form>
        </>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  typing,
}: {
  message: LocalMessage;
  typing?: boolean;
}) {
  const isUser = message.role === "USER";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-semibold leading-6 sm:max-w-[75%] ${
          isUser
            ? "bg-[var(--lumiverse-primary)] text-white"
            : "border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] text-[var(--lumiverse-ink)]"
        }`}
      >
        {typing ? (
          <span className="flex gap-1" aria-label="AI partner is typing">
            <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-current" />
          </span>
        ) : (
          <>
            {message.content}
            {message.pending && (
              <span className="mt-1 block text-xs font-bold opacity-70">(stopped early)</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ConversationResultView({ result }: { result: ConversationFinishResult }) {
  const scores: Array<[string, number | null]> = [
    ["Overall", result.overallScore],
    ["Fluency", result.fluencyScore],
    ["Grammar", result.grammarScore],
    ["Vocabulary", result.vocabularyScore],
    ["Naturalness", result.naturalnessScore],
    ["Confidence", result.confidenceScore],
  ];

  return (
    <div className="flex-1 space-y-4 overflow-y-auto pb-6">
      <LumiverseCard className="p-6 text-center">
        <LumiverseBadge>Session complete</LumiverseBadge>
        <p className="mt-3 text-5xl font-black text-[var(--lumiverse-primary)]">
          {result.overallScore ?? "—"}
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--lumiverse-muted)]">
          {result.feedback}
        </p>
      </LumiverseCard>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {scores.map(([label, value]) => (
          <LumiverseCard key={label} className="p-4 text-center">
            <p className="text-2xl font-black text-[var(--lumiverse-ink)]">{value ?? "—"}</p>
            <p className="mt-1 text-xs font-bold text-[var(--lumiverse-muted)]">{label}</p>
          </LumiverseCard>
        ))}
      </div>

      {result.grammarCorrections.length > 0 && (
        <LumiverseCard className="p-5">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-[var(--lumiverse-muted)]">
            Grammar corrections
          </h3>
          <ul className="space-y-3">
            {result.grammarCorrections.map((c, i) => (
              <li key={i} className="rounded-xl border border-[var(--lumiverse-border)] p-3 text-sm">
                <p className="font-semibold text-rose-600 line-through">{c.original}</p>
                <p className="font-black text-emerald-600">{c.corrected}</p>
                <p className="mt-1 text-xs font-semibold text-[var(--lumiverse-muted)]">{c.explanation}</p>
              </li>
            ))}
          </ul>
        </LumiverseCard>
      )}

      {(result.recommendedVocabulary.length > 0 || result.vocabularySuggestions.length > 0) && (
        <LumiverseCard className="p-5">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-[var(--lumiverse-muted)]">
            Vocabulary to review
          </h3>
          <div className="flex flex-wrap gap-2">
            {[...new Set([...result.recommendedVocabulary, ...result.vocabularySuggestions])].map(
              (word) => (
                <span
                  key={word}
                  className="rounded-full border border-[var(--lumiverse-border)] px-3 py-1 text-xs font-bold text-[var(--lumiverse-ink)]"
                >
                  {word}
                </span>
              ),
            )}
          </div>
        </LumiverseCard>
      )}

      {result.recommendedGrammar.length > 0 && (
        <LumiverseCard className="p-5">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-[var(--lumiverse-muted)]">
            Grammar focus
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.recommendedGrammar.map((item) => (
              <span
                key={item}
                className="rounded-full border border-[var(--lumiverse-border)] px-3 py-1 text-xs font-bold text-[var(--lumiverse-ink)]"
              >
                {item}
              </span>
            ))}
          </div>
        </LumiverseCard>
      )}

      <div className="flex gap-3">
        <Link href="/conversation" className="lumiverse-button-primary flex-1 text-center">
          Start another conversation
        </Link>
      </div>
    </div>
  );
}
