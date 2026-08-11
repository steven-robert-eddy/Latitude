import { CROP_FACTORS } from "./constants";

/**
 * The X-T20 is APS-C and the Minolta is full frame — raw focal length is not
 * comparable across bodies, so every ingest normalizes to a 35mm-equivalent.
 * See DESIGN.md §4.1 step 4.
 */
export function normalizeFocalLength35(
  focalLength: number | null,
  focalLength35FromExif: number | null,
  cameraModel: string | null,
): number | null {
  if (focalLength35FromExif != null) return focalLength35FromExif;
  if (focalLength == null) return null;

  const cropFactor = cropFactorFor(cameraModel);
  return Math.round(focalLength * cropFactor * 10) / 10;
}

function cropFactorFor(cameraModel: string | null): number {
  if (!cameraModel) return 1;
  const needle = cameraModel.toLowerCase();
  for (const [modelSubstring, factor] of Object.entries(CROP_FACTORS)) {
    if (needle.includes(modelSubstring)) return factor;
  }
  return 1; // unrecognized camera: assume full frame rather than guess wrong
}
