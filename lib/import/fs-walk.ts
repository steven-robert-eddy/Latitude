import fs from "node:fs/promises";
import path from "node:path";
import { ACCEPTED_RASTER_EXTENSIONS, RAW_EXTENSIONS, extensionOf } from "@/lib/photos/constants";

export type WalkedFile = {
  absolutePath: string;
  relativePath: string;
  size: number;
};

const ACCEPTED = new Set<string>([...RAW_EXTENSIONS, ...ACCEPTED_RASTER_EXTENSIONS]);

/**
 * Server-side path import (§4b) — walks a directory the container can see,
 * recursing into subfolders, and returns every eligible photo file. Hidden
 * files/directories and symlinks are skipped (symlinks to avoid cycles).
 */
export async function walkDirectory(rootPath: string): Promise<WalkedFile[]> {
  const stat = await fs.stat(rootPath).catch(() => null);
  if (!stat) throw new Error(`Path does not exist: ${rootPath}`);
  if (!stat.isDirectory()) throw new Error(`Not a directory: ${rootPath}`);

  const results: WalkedFile[] = [];
  await walk(rootPath, rootPath, results);
  return results;
}

async function walk(root: string, dir: string, results: WalkedFile[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isSymbolicLink()) continue;

    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walk(root, absolutePath, results);
      continue;
    }
    if (!entry.isFile()) continue;

    if (!ACCEPTED.has(extensionOf(entry.name))) continue;

    const fileStat = await fs.stat(absolutePath);
    results.push({
      absolutePath,
      relativePath: path.relative(root, absolutePath),
      size: fileStat.size,
    });
  }
}
