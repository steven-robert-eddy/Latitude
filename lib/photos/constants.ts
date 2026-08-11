// File extensions (lowercase, no dot) that are proprietary RAW containers.
// exiftool-vendored is used for all of these; exifr handles everything else.
export const RAW_EXTENSIONS = [
  "raf",
  "arw",
  "cr2",
  "cr3",
  "nef",
  "dng",
  "orf",
  "rw2",
] as const;

export type RawExtension = (typeof RAW_EXTENSIONS)[number];

export const ACCEPTED_RASTER_EXTENSIONS = ["jpg", "jpeg", "png", "tif", "tiff", "webp"] as const;

export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // RAF files from newer bodies are large

// 35mm-equivalent crop factor by camera model substring (case-insensitive).
// Extend this table as new gear enters the collection. Unrecognized cameras
// default to a 1.0 (full-frame) crop factor rather than guessing wrong.
export const CROP_FACTORS: Record<string, number> = {
  "x-t20": 1.5, // Fujifilm X-T20, APS-C
  "x-t": 1.5, // catches other Fuji X-T bodies
};

export const THUMB_LONG_EDGE = 400;
export const PREVIEW_LONG_EDGE = 1600;

export function isRawExtension(ext: string): ext is RawExtension {
  return (RAW_EXTENSIONS as readonly string[]).includes(ext.toLowerCase());
}

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}
