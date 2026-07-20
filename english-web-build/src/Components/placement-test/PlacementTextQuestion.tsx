"use client";

import { Check, FileText, Keyboard } from "lucide-react";
import { PlacementOption } from "@/src/lib/placement-api";

type Props = {
  prompt: string;
  passage: string | null;
  options: PlacementOption[];
  selectedAnswer: string | null;
  disabled?: boolean;
  questionType: "MULTIPLE_CHOICE" | "FILL_BLANK" | "READING";
  onSelectAnswer: (answer: string | null) => void;
};

export default function PlacementTextQuestion({
  prompt,
  passage,
  options,
  selectedAnswer,
  disabled = false,
  questionType,
  onSelectAnswer,
}: Props) {
  const usesInput = questionType === "FILL_BLANK" && options.length === 0;

  return (
    <div>
      {passage ? (
        <article className="mb-6 max-h-[44vh] overflow-auto rounded-3xl border border-slate-200 bg-slate-50 p-5 text-base font-medium leading-8 text-slate-700">
          <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-slate-500">
            <FileText aria-hidden className="h-4 w-4" />
            Reading passage
          </div>
          {passage}
        </article>
      ) : null}

      <h1 className="max-w-4xl text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
        {prompt}
      </h1>

      {usesInput ? (
        <div className="mt-7">
          <label htmlFor="placement-fill-answer" className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700">
            <Keyboard aria-hidden className="h-4 w-4 text-violet-600" />
            Your answer
          </label>
          <input
            id="placement-fill-answer"
            value={selectedAnswer ?? ""}
            disabled={disabled}
            onChange={(event) => onSelectAnswer(event.target.value)}
            placeholder="Type your answer here"
            className="min-h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-lg font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
          />
        </div>
      ) : (
        <div className="mt-7 space-y-3" role="group" aria-label="Answer options">
          {options.map((option) => (
            <PlacementOptionButton
              key={option.key}
              option={option}
              active={selectedAnswer === option.text}
              disabled={disabled}
              onSelect={() => onSelectAnswer(option.text)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlacementOptionButton({
  option,
  active,
  disabled,
  onSelect,
}: {
  option: PlacementOption;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onSelect}
      className={[
        "flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:opacity-60",
        active
          ? "border-violet-500 bg-violet-50"
          : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40",
      ].join(" ")}
    >
      <span className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${active ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300"}`}>
        {active ? <Check aria-hidden className="h-4 w-4" /> : null}
      </span>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-black ${active ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700"}`}>
        {option.key}
      </span>
      <span>
        <span className="block text-base font-black text-slate-950 sm:text-lg">
          {option.text}
        </span>
        {option.translation ? (
          <span className="mt-1 block text-sm font-semibold leading-6 text-slate-500">
            {option.translation}
          </span>
        ) : null}
      </span>
    </button>
  );
}
