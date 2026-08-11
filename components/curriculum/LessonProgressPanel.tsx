"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FrameStrip, type FrameStripPhoto } from "@/components/FrameStrip";
import { SubmissionEditor } from "./SubmissionEditor";
import { SelfCheckForm } from "./SelfCheckForm";

type LessonStatus = "not_started" | "reading" | "assigned" | "submitted" | "complete";

type SubmissionDetail = {
  photoId: string;
  filename: string;
  role: string | null;
  selfNote: string | null;
  criteriaMet: Record<string, boolean> | null;
  thumbUrl: string;
};

type LessonDetail = {
  id: string;
  status: LessonStatus;
  reflection: string | null;
  assignment: {
    title: string;
    brief: string;
    minPhotos: number;
    successCriteria: string[];
    submissions: SubmissionDetail[];
  };
};

/**
 * Drives the assignment brief → take → submit → self-check → complete flow
 * (§5.2). Fetches its own state so the reader page (a server component) stays
 * focused on rendering the lesson's MDX content.
 */
export function LessonProgressPanel({ lessonId }: { lessonId: string }) {
  const [detail, setDetail] = useState<LessonDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/lessons/${lessonId}`);
    if (res.ok) setDetail(await res.json());
  }, [lessonId]);

  useEffect(() => {
    // Fetch-on-mount: setDetail happens inside refresh(), after an await,
    // not synchronously — this is the standard client-fetch pattern, not
    // the cascading-render case the rule is guarding against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  // Opening the lesson marks it as `reading` — fired once the page has
  // genuinely mounted in the browser, not on a Next Link prefetch (which
  // never hydrates a client component), so hovering a lesson card doesn't
  // silently start it.
  useEffect(() => {
    if (!detail || detail.status !== "not_started" || startedRef.current) return;
    startedRef.current = true;
    void fetch(`/api/lessons/${lessonId}/start`, { method: "POST" }).then(() => refresh());
  }, [detail, lessonId, refresh]);

  async function runAction(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/${path}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (!detail) {
    return <p className="font-mono text-sm text-ink-soft">Loading…</p>;
  }

  const { assignment, status } = detail;

  // Still just reading — the assignment brief pins to the bottom of the
  // viewport instead of living inline, so it stays visible the whole time
  // without following the reader down the page (§9).
  if (status === "not_started" || status === "reading") {
    return (
      <div className="fixed inset-x-0 bottom-0 border-t border-paper-edge bg-paper">
        <div className="mx-auto flex w-full max-w-[68ch] items-center justify-between gap-4 px-6 py-4">
          <div className="min-w-0">
            <p className="font-sans text-xs font-semibold tracking-wide text-ink-soft uppercase">Assignment</p>
            <p className="truncate font-sans text-sm text-ink">{assignment.title}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => runAction("assign")}
            className="flex-none bg-mark px-4 py-2 font-sans text-sm text-paper disabled:opacity-50"
          >
            Take the assignment
          </button>
        </div>
        {error && <p className="mx-auto max-w-[68ch] px-6 pb-3 text-sm text-mark">{error}</p>}
      </div>
    );
  }

  return (
    <section className="mt-10 border-t border-paper-edge pt-8 pb-24">
      <p className="font-sans text-xs font-semibold tracking-wide text-ink-soft uppercase">Assignment</p>
      <h2 className="mt-1 font-sans text-lg font-semibold text-ink">{assignment.title}</h2>
      <p className="mt-2 whitespace-pre-line font-serif text-ink">{assignment.brief}</p>
      <p className="mt-2 font-mono text-xs text-ink-soft">{assignment.minPhotos} photos minimum</p>

      {error && <p className="mt-3 text-sm text-mark">{error}</p>}

      <div className="mt-6">
        {status === "assigned" && (
          <SubmissionEditor
            minPhotos={assignment.minPhotos}
            submitting={busy}
            onSubmit={(submissions) => runAction("submit", { submissions })}
          />
        )}

        {(status === "submitted" || status === "complete") && (
          <div className="flex flex-col gap-6">
            <FrameStrip photos={toFrameStripPhotos(assignment.submissions)} />

            {status === "submitted" && (
              <SelfCheckForm
                successCriteria={assignment.successCriteria}
                submitting={busy}
                onComplete={(criteriaMet, reflection) => runAction("complete", { criteriaMet, reflection })}
                onRedo={() => runAction("redo")}
              />
            )}

            {status === "complete" && (
              <div className="flex flex-col gap-4">
                <ChecklistSummary
                  successCriteria={assignment.successCriteria}
                  criteriaMet={assignment.submissions[0]?.criteriaMet ?? {}}
                />
                <div>
                  <h2 className="font-sans text-sm font-semibold text-ink">Reflection</h2>
                  <p className="mt-1 whitespace-pre-line font-serif text-ink">{detail.reflection}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function toFrameStripPhotos(submissions: SubmissionDetail[]): FrameStripPhoto[] {
  return submissions.map((s) => ({ id: s.photoId, thumbUrl: s.thumbUrl, label: s.role ?? undefined }));
}

function ChecklistSummary({
  successCriteria,
  criteriaMet,
}: {
  successCriteria: string[];
  criteriaMet: Record<string, boolean>;
}) {
  return (
    <div>
      <h2 className="font-sans text-sm font-semibold text-ink">Self-check</h2>
      <ul className="mt-2 flex flex-col gap-1">
        {successCriteria.map((criterion, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-ink">
            <span className={criteriaMet[index] ? "text-green" : "text-ink-soft"} aria-hidden="true">
              {criteriaMet[index] ? "✓" : "—"}
            </span>
            <span>{criterion}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
