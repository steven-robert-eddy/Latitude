"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LessonListItem } from "@/lib/curriculum/queries";

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not started",
  reading: "Reading",
  assigned: "Assigned",
  submitted: "Submitted",
  complete: "Complete",
};

const STATUS_COLORS: Record<string, string> = {
  not_started: "text-ink-soft",
  reading: "text-ink",
  assigned: "text-mark",
  submitted: "text-mark",
  complete: "text-green",
};

const CONDITION_LABELS: Record<string, string> = {
  any: "No special conditions",
  sun: "Needs sun",
  "golden-hour": "Needs golden hour",
  "moving-subject": "Needs a moving subject",
  location: "Needs a real outing",
};

/** A browsable grid of all twelve lessons, not a track (§5.1) — filters, not gates. */
export function LessonGrid({ lessons }: { lessons: LessonListItem[] }) {
  const [block, setBlock] = useState<number | "all">("all");
  const [status, setStatus] = useState<string | "all">("all");
  const [condition, setCondition] = useState<string | "all">("all");

  const blocks = useMemo(() => [...new Set(lessons.map((l) => l.blockNumber))].sort(), [lessons]);

  const filtered = lessons.filter((l) => {
    if (block !== "all" && l.blockNumber !== block) return false;
    if (status !== "all" && l.status !== status) return false;
    if (condition !== "all" && !l.conditions.includes(condition)) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-4 font-sans text-sm">
        <FilterSelect
          label="Block"
          value={block === "all" ? "all" : String(block)}
          onChange={(v) => setBlock(v === "all" ? "all" : Number(v))}
          options={[{ value: "all", label: "All blocks" }, ...blocks.map((b) => ({ value: String(b), label: `Block ${b}` }))]}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[{ value: "all", label: "Any status" }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))]}
        />
        <FilterSelect
          label="Conditions"
          value={condition}
          onChange={setCondition}
          options={[{ value: "all", label: "Any conditions" }, ...Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label }))]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((lesson) => (
          <LessonCard key={lesson.id} lesson={lesson} />
        ))}
      </div>

      {filtered.length === 0 && <p className="text-sm text-ink-soft">No lessons match those filters.</p>}
    </div>
  );
}

function LessonCard({ lesson }: { lesson: LessonListItem }) {
  return (
    <Link
      href={`/learn/${lesson.id}`}
      className="flex flex-col gap-2 border border-paper-edge bg-paper p-4 transition-colors hover:border-mark"
    >
      <p className="font-sans text-xs font-semibold tracking-wide text-ink-soft uppercase">
        Block {lesson.blockNumber} · {lesson.blockTitle}
      </p>
      <h3 className="font-sans text-base font-semibold text-ink">{lesson.title}</h3>
      <p className="flex-1 font-serif text-sm text-ink-soft">{lesson.summary}</p>
      <div className="flex items-center justify-between font-mono text-xs">
        <span className={STATUS_COLORS[lesson.status] ?? "text-ink-soft"}>{STATUS_LABELS[lesson.status] ?? lesson.status}</span>
        <span className="text-ink-soft">{lesson.estMinutes} min</span>
      </div>
    </Link>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-2 text-ink-soft">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-paper-edge bg-paper px-2 py-1 text-ink"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
