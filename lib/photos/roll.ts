import { ingestPhoto } from "./ingest";
import type { IngestResult } from "./types";

/**
 * Set once for the whole roll (§4.5): camera, film stock, ISO, and the
 * capture date if it's known for the roll as a whole.
 */
export type RollDefaults = {
  cameraMake?: string;
  cameraModel?: string;
  filmStock?: string;
  iso?: number;
  capturedAt?: Date;
};

/** Entered per frame: everything the roll defaults don't cover. */
export type RollFrameInput = {
  filename: string;
  buffer: Buffer;
  apertureF?: number;
  shutterSec?: number;
  focalLength?: number;
  capturedAt?: Date; // overrides the roll default when a frame's time is known
};

/**
 * A 36-exposure roll entered one field at a time is a chore that guarantees
 * it never happens. This sets camera/film stock/ISO once and asks only for
 * aperture and shutter per frame — see DESIGN.md §4.5.
 */
export async function ingestRoll(
  frames: RollFrameInput[],
  rollDefaults: RollDefaults,
  opts?: { importId?: string },
): Promise<IngestResult[]> {
  const results: IngestResult[] = [];
  for (const frame of frames) {
    const result = await ingestPhoto(frame.buffer, {
      filename: frame.filename,
      importId: opts?.importId,
      isScan: true,
      manualMetadata: {
        cameraMake: rollDefaults.cameraMake,
        cameraModel: rollDefaults.cameraModel,
        filmStock: rollDefaults.filmStock,
        iso: rollDefaults.iso,
        apertureF: frame.apertureF,
        shutterSec: frame.shutterSec,
        focalLength: frame.focalLength,
        capturedAt: frame.capturedAt ?? rollDefaults.capturedAt,
      },
    });
    results.push(result);
  }
  return results;
}
