'use client';

import { ReactNode } from 'react';

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="lumiverse-card p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-black text-[var(--lumiverse-ink)]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm font-semibold text-[var(--lumiverse-muted)]">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--lumiverse-border)] pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-xl">
        <div className="font-bold text-[var(--lumiverse-ink)]">
          {label}
        </div>
        {description && (
          <div className="mt-1 text-sm font-semibold text-[var(--lumiverse-muted)]">{description}</div>
        )}
      </div>
      <div className="sm:min-w-52">{children}</div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition ${
        checked ? 'bg-[var(--lumiverse-primary)]' : 'bg-[var(--lumiverse-muted)]/30'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  );
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string | number;
  onChange: (value: string) => void;
  options: { value: string | number; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="lumiverse-input w-full px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--lumiverse-focus)]"
    >
      {options.map((option) => (
        <option key={String(option.value)} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
