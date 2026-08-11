"use client";

import { useState } from "react";
import { PhotoUpload } from "@/components/PhotoUpload";
import type { UploadedPhotoSummary } from "@/app/api/photos/route";

export type PendingSubmission = {
  photoId: string;
  filename: string;
  thumbUrl: string;
  role: string;
};

type SubmissionEditorProps = {
  minPhotos: number;
  submitting: boolean;
  onSubmit: (submissions: { photoId: string; role: string }[]) => void;
};

/** Attach photos to an assignment by role — the aperture ladder's "f/2.8", a backlit frame's "backlit", etc. */
export function SubmissionEditor({ minPhotos, submitting, onSubmit }: SubmissionEditorProps) {
  const [pending, setPending] = useState<PendingSubmission[]>([]);

  function handleUploaded(results: (UploadedPhotoSummary | { ok: false })[]) {
    const ok = results.filter((r): r is UploadedPhotoSummary => r.ok);
    setPending((prev) => [
      ...prev,
      ...ok
        .filter((r) => !prev.some((p) => p.photoId === r.photoId))
        .map((r) => ({ photoId: r.photoId, filename: r.filename, thumbUrl: r.thumbUrl, role: "" })),
    ]);
  }

  function updateRole(photoId: string, role: string) {
    setPending((prev) => prev.map((p) => (p.photoId === photoId ? { ...p, role } : p)));
  }

  function remove(photoId: string) {
    setPending((prev) => prev.filter((p) => p.photoId !== photoId));
  }

  const canSubmit = pending.length >= minPhotos && !submitting;

  return (
    <div className="flex flex-col gap-4">
      <PhotoUpload onUploaded={handleUploaded} />

      {pending.length > 0 && (
        <ul className="flex flex-col gap-2">
          {pending.map((p) => (
            <li key={p.photoId} className="flex items-center gap-3 border border-paper-edge p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- served from our own on-disk derivatives */}
              <img src={p.thumbUrl} alt={p.filename} className="h-16 w-24 flex-none object-cover" />
              <input
                type="text"
                value={p.role}
                onChange={(e) => updateRole(p.photoId, e.target.value)}
                placeholder="role, e.g. f/2.8 or backlit"
                className="flex-1 border border-paper-edge bg-paper px-2 py-1 font-mono text-sm text-ink"
              />
              <button
                type="button"
                onClick={() => remove(p.photoId)}
                className="font-sans text-xs text-mark"
                aria-label={`Remove ${p.filename}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSubmit(pending.map(({ photoId, role }) => ({ photoId, role })))}
          className="bg-mark px-4 py-2 font-sans text-sm text-paper disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit frames"}
        </button>
        <span className="font-mono text-xs text-ink-soft">
          {pending.length} / {minPhotos} minimum
        </span>
      </div>
    </div>
  );
}
