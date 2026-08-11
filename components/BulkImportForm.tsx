"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type RecentPath = { id: string; path: string; lastUsedAt: string; useCount: number };
type Mode = "path" | "folder";

/**
 * The two entry points from §4b: a server-side path (walked in place, so
 * nothing goes through the browser — the one that scales to hundreds of RAW
 * files) and a browser folder drop. Both ask for confirmation — count and
 * size — before anything starts.
 */
export function BulkImportForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("path");
  const [label, setLabel] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sourcePath, setSourcePath] = useState("");
  const [recentPaths, setRecentPaths] = useState<RecentPath[]>([]);
  const [scan, setScan] = useState<{ fileCount: number; totalBytes: number } | null>(null);
  const [scanning, setScanning] = useState(false);

  const [folderFiles, setFolderFiles] = useState<File[] | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/import-paths")
      .then((r) => r.json())
      .then((data: { paths: RecentPath[] }) => setRecentPaths(data.paths ?? []))
      .catch(() => {});
  }, []);

  async function handleScan() {
    setScanning(true);
    setError(null);
    setScan(null);
    try {
      const res = await fetch("/api/imports/scan-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: sourcePath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      setScan(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  async function handleStartPathImport() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label || sourcePath, sourcePath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start import");
      router.push(`/import/${data.importId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start import");
      setStarting(false);
    }
  }

  async function handleStartFolderImport() {
    if (!folderFiles || folderFiles.length === 0) return;
    setStarting(true);
    setError(null);
    const form = new FormData();
    form.append("label", label || "Folder upload");
    for (const file of folderFiles) {
      const relPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      form.append("files", file, relPath);
    }
    try {
      const res = await fetch("/api/imports/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start import");
      router.push(`/import/${data.importId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start import");
      setStarting(false);
    }
  }

  const folderTotalBytes = folderFiles?.reduce((sum, f) => sum + f.size, 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4 border-b border-paper-edge font-sans text-sm">
        <ModeTab active={mode === "path"} onClick={() => setMode("path")}>
          Server path
        </ModeTab>
        <ModeTab active={mode === "folder"} onClick={() => setMode("folder")}>
          Drop a folder
        </ModeTab>
      </div>

      <label className="flex flex-col gap-1 text-sm text-ink">
        Label
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="CocoCay day 2"
          className="border border-paper-edge bg-paper px-3 py-2 text-ink"
        />
      </label>

      {mode === "path" && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-ink">
            Path the app can see
            <input
              type="text"
              value={sourcePath}
              onChange={(e) => {
                setSourcePath(e.target.value);
                setScan(null);
              }}
              placeholder="/mnt/photos/2026-cococay"
              className="border border-paper-edge bg-paper px-3 py-2 font-mono text-ink"
            />
          </label>

          {recentPaths.length > 0 && (
            <div className="flex flex-wrap gap-2 font-mono text-xs">
              {recentPaths.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSourcePath(p.path);
                    setScan(null);
                  }}
                  className="border border-paper-edge px-2 py-1 text-ink-soft hover:border-mark hover:text-ink"
                >
                  {p.path}
                </button>
              ))}
            </div>
          )}

          {!scan && (
            <button
              type="button"
              onClick={handleScan}
              disabled={!sourcePath || scanning}
              className="self-start bg-ink px-4 py-2 font-sans text-sm text-paper disabled:opacity-50"
            >
              {scanning ? "Scanning…" : "Scan"}
            </button>
          )}

          {scan && (
            <div className="flex items-center gap-4 font-mono text-sm text-ink">
              <span>
                {scan.fileCount} files · {formatBytes(scan.totalBytes)}
              </span>
              <button
                type="button"
                onClick={handleStartPathImport}
                disabled={starting || scan.fileCount === 0}
                className="bg-mark px-4 py-2 font-sans text-sm text-paper disabled:opacity-50"
              >
                {starting ? "Starting…" : "Start import"}
              </button>
            </div>
          )}
        </div>
      )}

      {mode === "folder" && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="border-2 border-dashed border-paper-edge px-6 py-10 text-center text-ink"
          >
            {folderFiles ? `${folderFiles.length} files selected` : "Choose a folder"}
          </button>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => setFolderFiles(e.target.files ? Array.from(e.target.files) : null)}
            // webkitdirectory/directory aren't in the DOM type lib yet, so
            // they're set imperatively rather than as JSX props.
            ref={(el) => {
              folderInputRef.current = el;
              if (el) {
                el.setAttribute("webkitdirectory", "");
                el.setAttribute("directory", "");
              }
            }}
          />

          {folderFiles && folderFiles.length > 0 && (
            <div className="flex items-center gap-4 font-mono text-sm text-ink">
              <span>
                {folderFiles.length} files · {formatBytes(folderTotalBytes)}
              </span>
              <button
                type="button"
                onClick={handleStartFolderImport}
                disabled={starting}
                className="bg-mark px-4 py-2 font-sans text-sm text-paper disabled:opacity-50"
              >
                {starting ? "Starting…" : "Start import"}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-mark">{error}</p>}
    </div>
  );
}

function ModeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 pb-2 ${active ? "border-mark text-ink" : "border-transparent text-ink-soft"}`}
    >
      {children}
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}
