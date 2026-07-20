"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Compass, RefreshCcw, Sparkles } from "lucide-react";
import {
  DiscoverySection,
  UnifiedSearchResult,
  getDiscovery,
  isRecommendation,
} from "@/src/lib/search-api";

function DiscoveryCard({ item }: { item: DiscoverySection["items"][number] }) {
  const href = isRecommendation(item) ? item.href : (item as UnifiedSearchResult).href;
  return (
    <Link href={href} className="block rounded-3xl border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] p-5 shadow-sm transition hover:border-violet-300 hover:bg-[var(--lumiverse-card-soft)] dark:hover:border-violet-400/40">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
        <Sparkles size={20} />
      </div>
      <h3 className="line-clamp-2 text-lg font-black text-[var(--lumiverse-ink)]">{item.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-[var(--lumiverse-muted)]">
        {isRecommendation(item) ? item.reason : item.description ?? item.subtitle ?? item.type}
      </p>
      <div className="mt-4 inline-flex items-center gap-2 text-sm font-black text-violet-700">
        {isRecommendation(item) ? item.ctaLabel : "Open"} <ArrowRight size={16} />
      </div>
    </Link>
  );
}

export default function DiscoverPage() {
  const [sections, setSections] = useState<DiscoverySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await getDiscovery();
      setSections(result.sections);
    } catch {
      setError("Could not load discovery. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getDiscovery()
      .then((result) => {
        if (active) setSections(result.sections);
      })
      .catch(() => {
        if (active) setError("Could not load discovery. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-[2rem] bg-gradient-to-br from-violet-600 to-emerald-500 p-6 text-white shadow-lg shadow-violet-100">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black">
          <Compass size={16} /> Content Discovery
        </div>
        <h1 className="text-3xl font-black sm:text-4xl">Explore what fits you today</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold text-white/85">
          Continue learning, review due content, practice weak skills and discover new lessons from real data.
        </p>
      </section>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-48 animate-pulse rounded-3xl bg-[var(--lumiverse-card-soft)]" />)}
        </div>
      ) : error ? (
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
          <p className="font-black text-rose-700">{error}</p>
          <button type="button" onClick={load} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 font-black text-white">
            <RefreshCcw size={18} /> Retry
          </button>
        </section>
      ) : sections.length ? (
        sections.map((section) => (
          <section key={section.id} className="space-y-4">
            <div>
              <h2 className="text-2xl font-black text-[var(--lumiverse-ink)]">{section.title}</h2>
              <p className="text-sm font-bold text-[var(--lumiverse-muted)]">{section.description}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {section.items.map((item) => <DiscoveryCard key={item.id} item={item} />)}
            </div>
          </section>
        ))
      ) : (
        <section className="rounded-3xl border border-dashed border-[var(--lumiverse-border)] bg-[var(--lumiverse-card-soft)] p-8 text-center">
          <p className="font-black text-[var(--lumiverse-ink)]">No discovery content yet.</p>
          <p className="mt-2 text-sm font-bold text-[var(--lumiverse-muted)]">Complete a lesson or placement test to improve recommendations.</p>
        </section>
      )}
    </div>
  );
}
