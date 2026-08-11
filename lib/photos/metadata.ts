import * as exifr from "exifr";
import { exiftool } from "exiftool-vendored";
import type { Tags } from "exiftool-vendored";
import { isRawExtension } from "./constants";
import { normalizeFocalLength35 } from "./focal-length";
import type { NormalizedMetadata } from "./types";

/**
 * One interface, two extractors underneath (DESIGN.md §4.3). exiftool-vendored
 * handles proprietary RAW containers; exifr handles everything else. Either
 * way the caller gets the same normalized shape.
 */
export async function extractMetadata(filePath: string, ext: string): Promise<NormalizedMetadata> {
  const base = isRawExtension(ext)
    ? await extractWithExiftool(filePath)
    : await extractWithExifr(filePath);

  // Fuji film simulation and recipe params live in MakerNotes. exifr's JPEG
  // path doesn't reliably decode them, so for anything that looks Fujifilm
  // we go back to exiftool-vendored specifically for those fields — see
  // DESIGN.md §4.3: "must be explicitly requested from both libraries."
  if (!isRawExtension(ext) && isFujifilm(base.cameraMake)) {
    await enrichWithFujiTags(filePath, base);
  }

  base.focalLength35 = normalizeFocalLength35(base.focalLength, base.focalLength35, base.cameraModel);

  return base;
}

function isFujifilm(make: string | null): boolean {
  return !!make && make.toLowerCase().includes("fujifilm");
}

async function extractWithExifr(filePath: string): Promise<NormalizedMetadata> {
  const tags: Record<string, unknown> = (await exifr.parse(filePath, { translateValues: false })) ?? {};
  const orientation = (await exifr.orientation(filePath).catch(() => undefined)) ?? 1;

  const flash = tags.Flash;
  return {
    capturedAt: toDate(tags.DateTimeOriginal ?? tags.CreateDate),
    cameraMake: strOrNull(tags.Make),
    cameraModel: strOrNull(tags.Model),
    lensModel: strOrNull(tags.LensModel),
    focalLength: numOrNull(tags.FocalLength),
    focalLength35: numOrNull(tags.FocalLengthIn35mmFormat),
    apertureF: numOrNull(tags.FNumber),
    shutterSec: numOrNull(tags.ExposureTime),
    iso: numOrNull(tags.ISO),
    expComp: numOrNull(tags.ExposureCompensation ?? tags.ExposureBiasValue),
    meteringMode: tags.MeteringMode != null ? String(tags.MeteringMode) : null,
    flashFired: typeof flash === "number" ? Boolean(flash & 0x1) : null,
    filmSimulation: null,
    orientation,
    sourceWidth: numOrNull(tags.ExifImageWidth ?? tags.ImageWidth),
    sourceHeight: numOrNull(tags.ExifImageHeight ?? tags.ImageHeight),
    raw: tags,
  };
}

async function extractWithExiftool(filePath: string): Promise<NormalizedMetadata> {
  const tags = await exiftool.read(filePath);
  return normalizedFromExiftoolTags(tags);
}

async function enrichWithFujiTags(filePath: string, base: NormalizedMetadata): Promise<void> {
  const tags = await exiftool.read(filePath).catch(() => null);
  if (!tags) return;
  Object.assign(base.raw, tags as unknown as Record<string, unknown>);
  base.filmSimulation = tags.FilmMode ?? base.filmSimulation;
}

function normalizedFromExiftoolTags(tags: Tags): NormalizedMetadata {
  return {
    capturedAt: toDate(tags.DateTimeOriginal ?? tags.CreateDate),
    cameraMake: strOrNull(tags.Make),
    cameraModel: strOrNull(tags.Model),
    lensModel: strOrNull(tags.LensModel),
    focalLength: parseMmString(tags.FocalLength),
    focalLength35: parseMmString(tags.FocalLengthIn35mmFormat),
    apertureF: numOrNull(tags.FNumber),
    shutterSec: parseShutterString(tags.ExposureTime),
    iso: numOrNull(tags.ISO),
    expComp: numOrNull(tags.ExposureCompensation),
    meteringMode: tags.MeteringMode != null ? String(tags.MeteringMode) : null,
    flashFired: parseFlash(tags.Flash),
    filmSimulation: tags.FilmMode ?? null,
    orientation: numOrNull(tags.Orientation) ?? 1,
    sourceWidth: numOrNull(tags.ExifImageWidth ?? tags.ImageWidth),
    sourceHeight: numOrNull(tags.ExifImageHeight ?? tags.ImageHeight),
    raw: tags as unknown as Record<string, unknown>,
  };
}

function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "object" && "toDate" in value && typeof (value as { toDate: unknown }).toDate === "function") {
    const d = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function strOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** exiftool-vendored keeps focal length as e.g. "18.0 mm" */
function parseMmString(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const n = parseFloat(value.replace(/mm.*$/i, ""));
  return Number.isFinite(n) ? n : null;
}

/** exiftool-vendored keeps shutter speed as e.g. "1/500" or "2.5" */
function parseShutterString(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.includes("/")) {
    const [num, den] = trimmed.split("/").map(Number);
    if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) return num / den;
    return null;
  }
  const n = parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

function parseFlash(value: unknown): boolean | null {
  if (typeof value === "number") return Boolean(value & 0x1);
  if (typeof value === "string") return !/no ?flash/i.test(value);
  return null;
}
