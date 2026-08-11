import fs from "node:fs/promises";
import { prisma } from "@/lib/db";
import { absolutePath } from "./paths";

export type MediaKind = "thumb" | "preview" | "original";

const CONTENT_TYPES: Record<"thumb" | "preview", string> = {
  thumb: "image/webp",
  preview: "image/webp",
};

export async function readPhotoMedia(photoId: string, kind: "thumb" | "preview") {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { thumbPath: true, previewPath: true },
  });
  if (!photo) return null;

  const relPath = kind === "thumb" ? photo.thumbPath : photo.previewPath;
  const buffer = await fs.readFile(absolutePath(relPath));
  return { buffer, contentType: CONTENT_TYPES[kind] };
}
