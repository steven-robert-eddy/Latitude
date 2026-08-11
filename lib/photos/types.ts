export type PreviewSource = "embedded" | "decoded" | "native";
export type FileKind = "jpeg" | "raw" | "scan";
export type FrameRole = "as_shot_jpeg" | "raw" | "edited" | "scan";

// The shape every metadata extractor (exifr, exiftool-vendored) normalizes to,
// regardless of which library produced it. See DESIGN.md §4.3.
export type NormalizedMetadata = {
  capturedAt: Date | null;
  cameraMake: string | null;
  cameraModel: string | null;
  lensModel: string | null;
  focalLength: number | null; // mm, as reported
  focalLength35: number | null; // 35mm-equivalent, normalized on ingest
  apertureF: number | null;
  shutterSec: number | null;
  iso: number | null;
  expComp: number | null;
  meteringMode: string | null;
  flashFired: boolean | null;
  filmSimulation: string | null;
  orientation: number; // EXIF orientation tag, 1-8, default 1
  /** EXIF-reported sensor dimensions — used only when no preview could be
   * decoded, so a RAW with a missing preview still gets sane dimensions. */
  sourceWidth: number | null;
  sourceHeight: number | null;
  /** Full parsed tag set, merged from whichever extractor(s) ran. */
  raw: Record<string, unknown>;
};

export type RawPreviewResult = {
  buffer: Buffer;
  source: PreviewSource;
};

export type IngestManualMetadata = {
  cameraMake?: string;
  cameraModel?: string;
  lensModel?: string;
  focalLength?: number;
  apertureF?: number;
  shutterSec?: number;
  iso?: number;
  capturedAt?: Date;
  filmStock?: string;
};

export type IngestOptions = {
  /** Original filename as uploaded, e.g. "DSCF1234.RAF". */
  filename: string;
  /** Attach the resulting Photo to an Import row. */
  importId?: string;
  /** First-class manual entry path for scans and other EXIF-less sources (§4.5). */
  manualMetadata?: IngestManualMetadata;
  /** Force this file to be treated as a scan even if it happens to carry EXIF. */
  isScan?: boolean;
};

export type IngestResult = {
  photoId: string;
  /** True if this call created a new Photo row rather than returning a dedupe hit. */
  created: boolean;
};
