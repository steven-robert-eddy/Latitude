"use client";

import { useState } from "react";

type SelfCheckFormProps = {
  successCriteria: string[];
  submitting: boolean;
  onComplete: (criteriaMet: Record<string, boolean>, reflection: string) => void;
  onRedo: () => void;
};

/** Self-check criteria + the required reflection (§5.2) — the highest-value field in the app. */
export function SelfCheckForm({ successCriteria, submitting, onComplete, onRedo }: SelfCheckFormProps) {
  const [criteria, setCriteria] = useState<Record<string, boolean>>({});
  const [reflection, setReflection] = useState("");

  const reflectionValid = reflection.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-sans text-sm font-semibold text-ink">Self-check</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {successCriteria.map((criterion, index) => (
            <li key={index}>
              <label className="flex items-start gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={criteria[index] ?? false}
                  onChange={(e) => setCriteria((prev) => ({ ...prev, [index]: e.target.checked }))}
                  className="mt-1 accent-mark"
                />
                <span>{criterion}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <label className="flex flex-col gap-1 text-sm text-ink">
        Reflection — what clicked, what didn&apos;t
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={4}
          className="border border-paper-edge bg-paper px-3 py-2 font-serif text-ink"
          placeholder="Required to complete the lesson."
        />
      </label>

      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={!reflectionValid || submitting}
          onClick={() => onComplete(criteria, reflection)}
          className="bg-mark px-4 py-2 font-sans text-sm text-paper disabled:opacity-50"
        >
          {submitting ? "Completing…" : "Complete lesson"}
        </button>
        <button type="button" onClick={onRedo} className="font-sans text-sm text-ink-soft underline underline-offset-2">
          Redo the assignment
        </button>
      </div>
    </div>
  );
}
