import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  ACCEPTED_RASTER_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  RAW_EXTENSIONS,
  extensionOf,
  isRawExtension,
} from "./constants";
import { createPlaceholderDerivatives, generateDerivatives } from "./derivatives";
import { findFrameGroupId, reelectPrimary } from "./frame-grouping";
import { sha256 } from "./hash";
import { extractMetadata } from "./metadata";
import { absolutePath, derivativePathFor, originalPathFor, writeDerivative, writeOriginal } from "./paths";
import { extractRawPreview } from "./raw-preview";
import type { FileKind, FrameRole, IngestOptions, IngestResult, NormalizedMetadata } from "./types";

const ACCEPTED_EXTENSIONS = new Set<string>([...RAW_EXTENSIONS, ...ACCEPTED_RASTER_EXTENSIONS]);

/**
 * The single entry point every module ingests photos through. See
 * DESIGN.md §4.1 for the annotated sequence this follows.
 */
export async function ingestPhoto(buffer: Buffer, opts: IngestOptions): Promise<IngestResult> {
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error(`File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB ingest limit: ${opts.filename}`);
  }

  const ext = extensionOf(opts.filename);
  if (!ACCEPTED_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported file type ".${ext}" for ${opts.filename}`);
  }

  const fileHash = sha256(buffer);
  const existing = await prisma.photo.findUnique({ where: { fileHash }, select: { id: true } });
  if (existing) {
    return { photoId: existing.id, created: false };
  }

  const tempPath = path.join(os.tmpdir(), `latitude-ingest-${randomUUID()}.${ext}`);
  await fs.writeFile(tempPath, buffer);

  try {
    const extracted = await extractMetadata(tempPath, ext);
    const metadata = applyManualOverrides(extracted, opts);

    const isRaw = isRawExtension(ext);
    const fileKind: FileKind = isRaw ? "raw" : opts.isScan ? "scan" : "jpeg";
    const role: FrameRole = opts.isScan ? "scan" : isRaw ? "raw" : "as_shot_jpeg";

    const { thumb, preview, width, height, previewSource, isRawDecoded } = await resolveDerivatives(
      tempPath,
      buffer,
      isRaw,
      metadata,
    );

    const id = randomUUID();
    const originalRelPath = originalPathFor(id, ext, metadata.capturedAt);
    const thumbRelPath = derivativePathFor(id, "thumb");
    const previewRelPath = derivativePathFor(id, "preview");

    await writeOriginal(originalRelPath, buffer);
    await Promise.all([writeDerivative(thumbRelPath, thumb), writeDerivative(previewRelPath, preview)]);

    const frameGroupId = await findFrameGroupId(opts.filename, metadata.capturedAt);

    try {
      await prisma.photo.create({
        data: {
          id,
          originalPath: originalRelPath,
          thumbPath: thumbRelPath,
          previewPath: previewRelPath,
          filename: opts.filename,
          fileHash,
          width,
          height,
          capturedAt: metadata.capturedAt,
          fileKind,
          rawFormat: isRaw ? ext.toUpperCase() : null,
          previewSource,
          isRawDecoded,
          frameGroupId,
          role,
          isPrimary: true, // settled below by reelectPrimary once the full group is known
          importId: opts.importId ?? null,
          cameraMake: metadata.cameraMake,
          cameraModel: metadata.cameraModel,
          lensModel: metadata.lensModel,
          focalLength: metadata.focalLength,
          focalLength35: metadata.focalLength35,
          apertureF: metadata.apertureF,
          shutterSec: metadata.shutterSec,
          iso: metadata.iso,
          expComp: metadata.expComp,
          meteringMode: metadata.meteringMode,
          flashFired: metadata.flashFired,
          filmSimulation: metadata.filmSimulation,
          exifJson: JSON.stringify(buildExifJson(metadata, opts)),
        },
      });
    } catch (error) {
      // Two files with identical bytes ingested concurrently can both pass
      // the findUnique dedupe check above before either has inserted — the
      // fileHash unique constraint is the real guard. Losing that race isn't
      // a failure, it's a dedupe hit that arrived late.
      if (isUniqueConstraintViolation(error, "fileHash")) {
        await Promise.all([
          fs.rm(absolutePath(originalRelPath), { force: true }),
          fs.rm(absolutePath(thumbRelPath), { force: true }),
          fs.rm(absolutePath(previewRelPath), { force: true }),
        ]);
        const existing = await prisma.photo.findUniqueOrThrow({ where: { fileHash }, select: { id: true } });
        return { photoId: existing.id, created: false };
      }
      throw error;
    }

    await reelectPrimary(frameGroupId);

    return { photoId: id, created: true };
  } finally {
    await fs.rm(tempPath, { force: true });
  }
}

async function resolveDerivatives(
  tempPath: string,
  originalBuffer: Buffer,
  isRaw: boolean,
  metadata: NormalizedMetadata,
) {
  if (!isRaw) {
    const d = await generateDerivatives(originalBuffer);
    return { ...d, previewSource: "native" as const, isRawDecoded: false };
  }

  const rawPreview = await extractRawPreview(tempPath);
  if (!rawPreview) {
    const d = await createPlaceholderDerivatives(metadata.sourceWidth, metadata.sourceHeight);
    return { ...d, previewSource: null, isRawDecoded: false };
  }

  const d = await generateDerivatives(rawPreview.buffer);
  return { ...d, previewSource: rawPreview.source, isRawDecoded: rawPreview.source === "decoded" };
}

/** Manual entry (§4.5) is first-class, not a fallback — it wins over whatever extraction found. */
function applyManualOverrides(extracted: NormalizedMetadata, opts: IngestOptions): NormalizedMetadata {
  const manual = opts.manualMetadata;
  if (!manual) return extracted;

  return {
    ...extracted,
    cameraMake: manual.cameraMake ?? extracted.cameraMake,
    cameraModel: manual.cameraModel ?? extracted.cameraModel,
    lensModel: manual.lensModel ?? extracted.lensModel,
    focalLength: manual.focalLength ?? extracted.focalLength,
    focalLength35: manual.focalLength != null ? manual.focalLength : extracted.focalLength35,
    apertureF: manual.apertureF ?? extracted.apertureF,
    shutterSec: manual.shutterSec ?? extracted.shutterSec,
    iso: manual.iso ?? extracted.iso,
    capturedAt: manual.capturedAt ?? extracted.capturedAt,
  };
}

function isUniqueConstraintViolation(error: unknown, field: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
  const target = error.meta?.target;
  const targetText = Array.isArray(target) ? target.join(",") : typeof target === "string" ? target : "";
  return targetText.includes(field) || error.message.includes(field);
}

function buildExifJson(metadata: NormalizedMetadata, opts: IngestOptions): Record<string, unknown> {
  if (!opts.manualMetadata && !opts.isScan) return metadata.raw;
  return {
    ...metadata.raw,
    manualEntry: true,
    filmStock: opts.manualMetadata?.filmStock ?? null,
  };
}
