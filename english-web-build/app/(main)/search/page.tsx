"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { ArrowRight, Filter, RefreshCcw, Search } from "lucide-react";
import {
  CefrLevel,
  LearningSkill,
  SearchResultType,
  UnifiedSearchResult,
  searchContent,
} from "@/src/lib/search-api";

const typeOptions: Array<{ label: string; value: SearchResultType | "ALL" }> = [
  { label: "All content", value: "ALL" },
  { label: "Vocabulary", value: "VOCABULARY_WORD" },
  { label: "Grammar lessons", value: "GRAMMAR_LESSON" },
  { label: "Reading articles", value: "READING_ARTICLE" },
  { label: "Listening", value: "LISTENING_CONTENT" },
  { label: "Speaking", value: "SPEAKING_TOPIC" },
  { label: "Writing", value: "WRITING_TOPIC" },
  { label: "Community", value: "COMMUNITY_POST" },
];

const skillOptions: Array<{ label: string; value: LearningSkill | "ALL" }> = [
  { label: "All skills", value: "ALL" },
  { label: "Vocabulary", value: "VOCABULARY" },
  { label: "Grammar", value: "GRAMMAR" },
  { label: "Reading", value: "READING" },
  { label: "Listening", value: "LISTENING" },
  { label: "Speaking", value: "SPEAKING" },
  { label: "Writing", value: "WRITING" },
];

const levelOptions: Array<CefrLevel | "ALL"> = ["ALL", "A1", "A2", "B1", "B2", "C1", "C2"];

function ResultCard({ item }: { item: UnifiedSearchResult }) {
  return (
    <Link
      href={item.href}
      className="group block rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[var(--lumiverse-primary)]/25 hover:bg-[var(--lumiverse-hover-tint)]"
    >
      <div className="flex gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--lumiverse-primary-soft)] text-sm font-black text-[var(--lumiverse-primary)]">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            item.type.split("_")[0].slice(0, 2)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-black text-slate-950">{item.title}</h2>
            {item.level && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-500">
                {item.level}
              </span>
            )}
            {item.skill && (
              <span className="rounded-full bg-[var(--lumiverse-primary-soft)] px-2 py-0.5 text-xs font-black text-[var(--lumiverse-primary)]">
                {item.skill}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-bold text-slate-500">{item.subtitle ?? item.type}</p>
          {item.description && (
            <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-slate-600">
              {item.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {item.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full bg-slate-50 px-2 py-1 text-xs font-bold text-slate-500">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <ArrowRight className="mt-1 shrink-0 text-slate-300 transition group-hover:text-[var(--lumiverse-primary)]" size={20} />
      </div>
    </Link>
  );
}

export default function SearchPage() {
  const params = useSearchParams();
  const initialQuery = params.get("q") ?? "";
  const [q, setQ] = useState(initialQuery);
  const [type, setType] = useState<SearchResultType | "ALL">("ALL");
  const [skill, setSkill] = useState<LearningSkill | "ALL">("ALL");
  const [level, setLevel] = useState<CefrLevel | "ALL">("ALL");
  const [sort, setSort] = useState<"RELEVANCE" | "NEWEST" | "POPULAR" | "LEVEL_ASC">("RELEVANCE");
  const [items, setItems] = useState<UnifiedSearchResult[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(Boolean(initialQuery));
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards the debounced auto-search effect against races: a later
  // query/filter change aborts the in-flight request for the previous one,
  // so a slow older response can never overwrite newer results.
  const searchAbortRef = useRef<AbortController | null>(null);
  const loadMoreAbortRef = useRef<AbortController | null>(null);

  const canSearch = useMemo(() => q.trim().length >= 2, [q]);

  function resetForNewSearch(nextValue?: string) {
    const value = nextValue ?? q;
    setItems([]);
    setNextOffset(null);
    setError(null);
    setLoading(value.trim().length >= 2);
  }

  async function load(offset = 0) {
    if (!canSearch) return;
    if (offset > 0) setLoadingMore(true);
    else {
      setLoading(true);
      setItems([]);
    }
    setError(null);

    loadMoreAbortRef.current?.abort();
    const controller = new AbortController();
    loadMoreAbortRef.current = controller;

    try {
      const result = await searchContent(
        { q, type, skill, level, sort, limit: 20, offset },
        controller.signal,
      );
      setItems((current) => (offset > 0 ? [...current, ...result.results] : result.results));
      setNextOffset(result.pagination.nextOffset);
    } catch (err) {
      if (axios.isCancel(err)) return;
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (!canSearch) {
      return;
    }
    const handle = window.setTimeout(() => {
      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;

      searchContent(
        { q, type, skill, level, sort, limit: 20, offset: 0 },
        controller.signal,
      )
        .then((result) => {
          setItems(result.results);
          setNextOffset(result.pagination.nextOffset);
        })
        .catch((err) => {
          if (axios.isCancel(err)) return;
          setError("Search failed. Please try again.");
        })
        .finally(() => {
          setLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(handle);
      searchAbortRef.current?.abort();
    };
  }, [canSearch, q, type, skill, level, sort]);

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-[2rem] bg-[linear-gradient(135deg,var(--lumiverse-primary),var(--lumiverse-violet))] p-6 text-white shadow-lg shadow-violet-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black">
              <Search size={16} />
              Unified Search
            </div>
            <h1 className="text-3xl font-black sm:text-4xl">Find your next lesson</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-white/85">
              Search vocabulary, grammar, reading, listening, speaking, writing and community content.
            </p>
          </div>
          <Link href="/discover" className="rounded-2xl bg-white px-5 py-3 font-black text-[var(--lumiverse-primary)]">
            Explore discovery
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="relative block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            value={q}
            onChange={(event) => {
              resetForNewSearch(event.target.value);
              setQ(event.target.value);
            }}
            placeholder="Search lessons, words, topics..."
            className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-base font-bold outline-none focus:border-[var(--lumiverse-primary)] focus:bg-white"
            aria-label="Search content"
          />
        </label>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <select value={type} onChange={(event) => { resetForNewSearch(); setType(event.target.value as SearchResultType | "ALL"); }} className="rounded-2xl border border-slate-200 px-4 py-3 font-bold">
            {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={skill} onChange={(event) => { resetForNewSearch(); setSkill(event.target.value as LearningSkill | "ALL"); }} className="rounded-2xl border border-slate-200 px-4 py-3 font-bold">
            {skillOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={level} onChange={(event) => { resetForNewSearch(); setLevel(event.target.value as CefrLevel | "ALL"); }} className="rounded-2xl border border-slate-200 px-4 py-3 font-bold">
            {levelOptions.map((option) => <option key={option} value={option}>{option === "ALL" ? "All levels" : option}</option>)}
          </select>
          <select value={sort} onChange={(event) => { resetForNewSearch(); setSort(event.target.value as typeof sort); }} className="rounded-2xl border border-slate-200 px-4 py-3 font-bold">
            <option value="RELEVANCE">Relevance</option>
            <option value="NEWEST">Newest</option>
            <option value="POPULAR">Popular</option>
            <option value="LEVEL_ASC">Level ascending</option>
          </select>
        </div>
      </section>

      {!canSearch ? (
        <section className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center font-bold text-slate-500">
          Type at least 2 characters to search.
        </section>
      ) : loading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-200" />)}</div>
      ) : error ? (
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
          <p className="font-black text-rose-700">{error}</p>
          <button type="button" onClick={() => load(0)} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 font-black text-white">
            <RefreshCcw size={18} /> Retry
          </button>
        </section>
      ) : items.length ? (
        <section className="space-y-3" aria-live="polite">
          <div className="flex items-center gap-2 text-sm font-black text-slate-500">
            <Filter size={16} /> {items.length} result{items.length === 1 ? "" : "s"}
          </div>
          {items.map((item) => <ResultCard key={`${item.type}:${item.id}`} item={item} />)}
          {nextOffset !== null && (
            <button type="button" onClick={() => load(nextOffset)} disabled={loadingMore} className="w-full rounded-2xl border border-[var(--lumiverse-primary)]/25 bg-white px-5 py-3 font-black text-[var(--lumiverse-primary)] disabled:opacity-60">
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          )}
        </section>
      ) : (
        <section className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="font-black text-slate-700">No results found.</p>
          <p className="mt-2 text-sm font-bold text-slate-500">Try a broader keyword or remove filters.</p>
        </section>
      )}
    </div>
  );
}
