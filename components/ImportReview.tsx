"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FrameStrip, type FrameStripPhoto } from "./FrameStrip";

type ImportStatus = {
  id: string;
  label: string;
  sourceNote: string | null;
  sourcePath: string | null;
  status: "pending" | "running" | "complete" | "failed";
  fileCount: number;
  processedCount: number;
  duplicateCount: number;
  errorCount: number;
  currentFilename: string | null;
  errors: { filename: string; reason: string }[];
  createdAt: string;
};

type ImportPhoto = {
  id: string;
  filename: string;
  role: string;
  isPrimary: boolean;
  fileKind: string;
  rawFormat: string | null;
  previewSource: string | null;
  frameGroupId: string;
  thumbUrl: string;
};

/**
 * Polls an in-progress import and, once it settles, shows the review screen:
 * frame strip, RAW/JPEG/paired counts, decoded-preview flags, failures, and
 * a delete action. See DESIGN.md §4b.
 */
export function ImportReview({ importId }: { importId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [photos, setPhotos] = useState<ImportPhoto[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const poll = useCallback(async (): Promise<ImportStatus | null> => {
    const res = await fetch(`/api/imports/${importId}`);
    if (!res.ok) return null;
    const data: ImportStatus = await res.json();
    setStatus(data);
    return data;
  }, [importId]);

  // The job runs server-side independent of this page — polling just reads
  // its progress back, so closing and reopening the tab loses nothing.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      const data = await poll();
      if (cancelled || !data) return;
      if (data.status === "pending" || data.status === "running") {
        timer = setTimeout(tick, 1000);
      }
    }
    void tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [poll]);

  useEffect(() => {
    if (status && (status.status === "complete" || status.status === "failed") && photos === null) {
      fetch(`/api/imports/${importId}/photos`)
        .then((r) => r.json())
        .then((data: { photos: ImportPhoto[] }) => setPhotos(data.photos));
    }
  }, [status, photos, importId]);

  if (!status) {
    return <p className="font-mono text-sm text-ink-soft">Loading…</p>;
  }

  const isRunning = status.status === "pending" || status.status === "running";

  async function handleDelete() {
    if (!status) return;
    if (!confirm(`Delete "${status.label}" and all ${status.fileCount} of its photos? This can't be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/imports/${importId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/import");
    } else {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-sans text-xl font-semibold text-ink">{status.label}</h1>
        {status.sourceNote && <p className="text-sm text-ink-soft">{status.sourceNote}</p>}
      </div>

      {isRunning && (
        <div className="flex flex-col gap-1 font-mono text-sm text-ink">
          <p>
            {status.processedCount} / {status.fileCount} processed
          </p>
          {status.currentFilename && <p className="truncate text-ink-soft">{status.currentFilename}</p>}
          {status.errorCount > 0 && <p className="text-mark">{status.errorCount} failed so far</p>}
        </div>
      )}

      {!isRunning && photos && <ReviewSummary status={status} photos={photos} />}

      {!isRunning && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="self-start border border-mark px-3 py-1.5 font-sans text-sm text-mark disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete this import"}
        </button>
      )}
    </div>
  );
}

function ReviewSummary({ status, photos }: { status: ImportStatus; photos: ImportPhoto[] }) {
  const primaryCount = photos.filter((p) => p.isPrimary).length;
  const rawCount = photos.filter((p) => p.fileKind === "raw").length;
  const jpegCount = photos.filter((p) => p.fileKind === "jpeg").length;
  const decodedCount = photos.filter((p) => p.previewSource === "decoded").length;
  const noPreviewCount = photos.filter((p) => p.previewSource === null).length;

  const frameStripPhotos: FrameStripPhoto[] = photos.map((p) => ({
    id: p.id,
    thumbUrl: p.thumbUrl,
    label: p.isPrimary ? p.role : `${p.role} (grouped)`,
  }));

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-sm text-ink sm:grid-cols-4">
        <Stat label="frames" value={primaryCount} />
        <Stat label="raw files" value={rawCount} />
        <Stat label="jpeg files" value={jpegCount} />
        <Stat label="duplicates skipped" value={status.duplicateCount} />
      </dl>

      {decodedCount > 0 && (
        <p className="text-sm text-ink-soft">
          {decodedCount} frame{decodedCount === 1 ? "" : "s"} used a dcraw decode rather than the camera&apos;s own
          JPEG.
        </p>
      )}
      {noPreviewCount > 0 && (
        <p className="text-sm text-mark">
          {noPreviewCount} frame{noPreviewCount === 1 ? "" : "s"} have no preview available.
        </p>
      )}

      {status.errors.length > 0 && (
        <div>
          <h2 className="font-sans text-sm font-semibold text-ink">
            Failures ({status.errors.length})
          </h2>
          <ul className="mt-1 flex flex-col gap-1 font-mono text-xs text-mark">
            {status.errors.map((e, i) => (
              <li key={`${e.filename}-${i}`}>
                {e.filename}: {e.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <FrameStrip photos={frameStripPhotos} emptyMessage="No photos were imported." />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-ink-soft">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
