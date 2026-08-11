import path from "node:path";
import fs from "node:fs/promises";

// Everything under data/ is gitignored and lives outside the repo's version
// control — see DESIGN.md §2. Resolve relative to the repo root, not
// process.cwd(), so this works the same from a route handler, a script, or a
// background job.
export const DATA_ROOT = path.join(process.cwd(), "data");
export const PHOTOS_ROOT = path.join(DATA_ROOT, "photos");

/** data/photos/{yyyy}/{mm}/{id}.{ext} — the original, written byte-untouched. */
export function originalPathFor(id: string, ext: string, capturedAt: Date | null): string {
  const date = capturedAt ?? new Date();
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return path.join("photos", yyyy, mm, `${id}.${ext.toLowerCase()}`);
}

export function derivativePathFor(id: string, kind: "thumb" | "preview"): string {
  return path.join("photos", "_derivatives", kind, `${id}.webp`);
}

export function absolutePath(relativePath: string): string {
  return path.join(DATA_ROOT, relativePath);
}

export async function writeOriginal(relativePath: string, buffer: Buffer): Promise<void> {
  const abs = absolutePath(relativePath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buffer);
}

export async function writeDerivative(relativePath: string, buffer: Buffer): Promise<void> {
  const abs = absolutePath(relativePath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buffer);
}
