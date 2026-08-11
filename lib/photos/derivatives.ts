import sharp from "sharp";
import { PREVIEW_LONG_EDGE, THUMB_LONG_EDGE } from "./constants";

export type Derivatives = {
  thumb: Buffer;
  preview: Buffer;
  width: number;
  height: number;
};

/**
 * Generate the thumb (400px) and preview (1600px) derivatives from whichever
 * JPEG-decodable buffer ingestion settled on — the original raster file, a
 * RAW's embedded preview, or a dcraw decode. Honors EXIF orientation.
 */
export async function generateDerivatives(sourceBuffer: Buffer): Promise<Derivatives> {
  const oriented = sharp(sourceBuffer, { failOn: "none" }).rotate();

  const [{ data: thumb }, { data: preview }] = await Promise.all([
    oriented
      .clone()
      .resize({ width: THUMB_LONG_EDGE, height: THUMB_LONG_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true }),
    oriented
      .clone()
      .resize({ width: PREVIEW_LONG_EDGE, height: PREVIEW_LONG_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true }),
  ]);

  const { width, height } = await getDisplayDimensions(sourceBuffer);

  return { thumb, preview, width, height };
}

/**
 * Used when a RAW has no embedded preview and dcraw isn't installed (or
 * failed) — the import must still succeed with metadata intact. Produces a
 * flat placeholder in the app's paper tone; the UI is responsible for
 * labeling it "no preview available" via `previewSource: null`.
 */
export async function createPlaceholderDerivatives(
  sourceWidth: number | null,
  sourceHeight: number | null,
): Promise<Derivatives> {
  const width = sourceWidth ?? PREVIEW_LONG_EDGE;
  const height = sourceHeight ?? PREVIEW_LONG_EDGE;
  const aspect = width / height;

  const makePlaceholder = (longEdge: number) => {
    const [w, h] = aspect >= 1 ? [longEdge, Math.round(longEdge / aspect)] : [Math.round(longEdge * aspect), longEdge];
    return sharp({
      create: {
        width: Math.max(w, 1),
        height: Math.max(h, 1),
        channels: 3,
        background: "#e4e8e7", // --paper-edge
      },
    })
      .webp({ quality: 80 })
      .toBuffer();
  };

  const [thumb, preview] = await Promise.all([makePlaceholder(THUMB_LONG_EDGE), makePlaceholder(PREVIEW_LONG_EDGE)]);

  return { thumb, preview, width, height };
}

/** Post-rotation display dimensions — width/height swap for 90/270° EXIF orientations. */
export async function getDisplayDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  const meta = await sharp(buffer, { failOn: "none" }).metadata();
  const swapped = meta.orientation != null && [5, 6, 7, 8].includes(meta.orientation);
  const width = (swapped ? meta.height : meta.width) ?? 0;
  const height = (swapped ? meta.width : meta.height) ?? 0;
  return { width, height };
}
