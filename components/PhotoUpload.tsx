"use client";

import { useCallback, useRef, useState } from "react";
import { FrameStrip, type FrameStripPhoto } from "./FrameStrip";
import type { UploadFailure, UploadedPhotoSummary } from "@/app/api/photos/route";

type UploadResult = UploadedPhotoSummary | UploadFailure;

type PhotoUploadProps = {
  /** Attach uploaded photos to an existing Import row. */
  importId?: string;
  onUploaded?: (results: UploadResult[]) => void;
};

export function PhotoUpload({ importId, onUploaded }: PhotoUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<FrameStripPhoto[]>([]);
  const [failures, setFailures] = useState<UploadFailure[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;

      setUploading(true);
      const form = new FormData();
      for (const file of files) form.append("files", file);
      if (importId) form.append("importId", importId);

      try {
        const response = await fetch("/api/photos", { method: "POST", body: form });
        const data: { results: UploadResult[] } = await response.json();

        const ok = data.results.filter((r): r is UploadedPhotoSummary => r.ok);
        const failed = data.results.filter((r): r is UploadFailure => !r.ok);

        setUploaded((prev) => [...prev, ...ok.map((r) => ({ id: r.photoId, thumbUrl: r.thumbUrl, label: r.role }))]);
        setFailures((prev) => [...prev, ...failed]);
        onUploaded?.(data.results);
      } finally {
        setUploading(false);
      }
    },
    [importId, onUploaded],
  );

  return (
    <div className="flex flex-col gap-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          void upload(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed px-6 py-10 text-center font-sans transition-colors ${
          dragActive ? "border-mark bg-paper" : "border-paper-edge bg-paper"
        }`}
      >
        <p className="text-ink">Drop photos here, or click to choose files</p>
        <p className="text-sm text-ink-soft">JPEG, TIFF, WebP, or RAW (RAF, ARW, CR2, CR3, NEF, DNG, ORF, RW2)</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.tif,.tiff,.webp,.raf,.arw,.cr2,.cr3,.nef,.dng,.orf,.rw2"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {uploading && <p className="font-mono text-xs text-ink-soft">Ingesting…</p>}

      {failures.length > 0 && (
        <ul className="flex flex-col gap-1 font-mono text-xs text-mark">
          {failures.map((f, i) => (
            <li key={`${f.filename}-${i}`}>
              {f.filename}: {f.error}
            </li>
          ))}
        </ul>
      )}

      {uploaded.length > 0 && <FrameStrip photos={uploaded} />}
    </div>
  );
}
