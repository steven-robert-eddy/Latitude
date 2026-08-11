import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { exiftool } from "exiftool-vendored";
import type { RawPreviewResult } from "./types";

const execFileAsync = promisify(execFile);

/**
 * Prefer the camera's own embedded JPEG preview over a real RAW decode — it's
 * both cheaper and more faithful to intent, since it already has the film
 * simulation and recipe baked in. See DESIGN.md §4.2.
 *
 * Returns null when nothing could be produced (no embedded preview, and
 * dcraw/LibRaw is either not installed or failed to decode). The caller falls
 * back to a placeholder thumbnail — a photo without a preview must still
 * import successfully with its metadata intact.
 */
export async function extractRawPreview(filePath: string): Promise<RawPreviewResult | null> {
  const embedded =
    (await tryExtractBinaryTag(filePath, "JpgFromRaw")) ??
    (await tryExtractBinaryTag(filePath, "PreviewImage"));

  if (embedded) {
    return { buffer: embedded, source: "embedded" };
  }

  const decoded = await tryDecodeWithDcraw(filePath);
  if (decoded) {
    return { buffer: decoded, source: "decoded" };
  }

  return null;
}

async function tryExtractBinaryTag(filePath: string, tag: "JpgFromRaw" | "PreviewImage"): Promise<Buffer | null> {
  try {
    const buffer = await exiftool.extractBinaryTagToBuffer(tag, filePath);
    return buffer.length > 0 ? buffer : null;
  } catch {
    return null; // tag absent on this file — not an error, just try the next source
  }
}

/**
 * dcraw is an optional dependency (§4.2) — its absence must never block an
 * import. Any failure here (binary missing, unsupported format, decode
 * error) is treated the same way: no preview from this path.
 */
async function tryDecodeWithDcraw(filePath: string): Promise<Buffer | null> {
  try {
    const { stdout } = await execFileAsync("dcraw", ["-c", "-w", "-q", "3", filePath], {
      encoding: "buffer",
      maxBuffer: 1024 * 1024 * 256,
    });
    const buffer = stdout as unknown as Buffer;
    return buffer.length > 0 ? buffer : null;
  } catch {
    return null;
  }
}
