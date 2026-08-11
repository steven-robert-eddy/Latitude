import fs from "node:fs/promises";
import { prisma } from "@/lib/db";
import { ingestPhoto } from "@/lib/photos/ingest";
import { regroupPhotos } from "@/lib/photos/frame-grouping";
import { runWithConcurrency } from "./concurrency";
import { walkDirectory } from "./fs-walk";

// RAW preview extraction spawns exiftool and sharp is CPU-hungry — a cap of
// 2-4 keeps a 500-file import from locking the app up (§4b).
const IMPORT_CONCURRENCY = 3;

type ImportItem = { filename: string; load: () => Promise<Buffer> };

export type ImportSource = { kind: "path"; rootPath: string } | { kind: "buffers"; files: { filename: string; buffer: Buffer }[] };

/**
 * Processes every file in an import with a concurrency cap, persisting
 * progress to the Import row as it goes so the client can poll it and the
 * page can be closed without killing the job (§4b). Fire-and-forget: the
 * caller starts this and responds to its own request immediately, it does
 * not await completion.
 */
export async function runImportJob(importId: string, source: ImportSource): Promise<void> {
  try {
    const items = await resolveItems(source);

    await prisma.import.update({
      where: { id: importId },
      data: { status: "running", fileCount: items.length },
    });

    const errors: { filename: string; reason: string }[] = [];
    const ingestedPhotoIds: string[] = [];

    await runWithConcurrency(items, IMPORT_CONCURRENCY, async (item) => {
      try {
        const buffer = await item.load();
        const { photoId, created } = await ingestPhoto(buffer, { filename: item.filename, importId });
        ingestedPhotoIds.push(photoId);
        await prisma.import.update({
          where: { id: importId },
          data: {
            processedCount: { increment: 1 },
            duplicateCount: created ? undefined : { increment: 1 },
            currentFilename: item.filename,
          },
        });
      } catch (error) {
        // Per-file failures never abort the import (§4b step 4).
        errors.push({ filename: item.filename, reason: error instanceof Error ? error.message : String(error) });
        await prisma.import.update({
          where: { id: importId },
          data: { processedCount: { increment: 1 }, errorCount: { increment: 1 }, currentFilename: item.filename },
        });
      }
    });

    // Final grouping pass (§4b step 5) — must run after every file has
    // landed, since concurrent ingestion can miss a sibling that hadn't been
    // inserted yet.
    await regroupPhotos(ingestedPhotoIds);

    await prisma.import.update({
      where: { id: importId },
      data: {
        status: "complete",
        currentFilename: null,
        errorLog: errors.length > 0 ? JSON.stringify(errors) : null,
      },
    });
  } catch (error) {
    await prisma.import
      .update({
        where: { id: importId },
        data: {
          status: "failed",
          currentFilename: null,
          errorLog: JSON.stringify([
            { filename: "*", reason: error instanceof Error ? error.message : String(error) },
          ]),
        },
      })
      .catch(() => {});
  }
}

async function resolveItems(source: ImportSource): Promise<ImportItem[]> {
  if (source.kind === "buffers") {
    return source.files.map((f) => ({ filename: f.filename, load: async () => f.buffer }));
  }

  const files = await walkDirectory(source.rootPath);
  return files.map((f) => ({ filename: f.relativePath, load: () => fs.readFile(f.absolutePath) }));
}
