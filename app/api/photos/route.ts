import { NextResponse } from "next/server";
import { ingestPhoto } from "@/lib/photos/ingest";
import { prisma } from "@/lib/db";

export type UploadedPhotoSummary = {
  filename: string;
  ok: true;
  photoId: string;
  created: boolean;
  role: string;
  isPrimary: boolean;
  frameGroupId: string;
  thumbUrl: string;
};

export type UploadFailure = {
  filename: string;
  ok: false;
  error: string;
};

export async function POST(request: Request) {
  const form = await request.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const importId = form.get("importId");

  if (files.length === 0) {
    return NextResponse.json({ error: "No files in upload" }, { status: 400 });
  }

  const results: (UploadedPhotoSummary | UploadFailure)[] = [];

  // Per-file failures never abort the batch (§4b) — even outside a formal
  // bulk import, one bad file in a multi-file drop shouldn't lose the rest.
  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { photoId, created } = await ingestPhoto(buffer, {
        filename: file.name,
        importId: typeof importId === "string" && importId.length > 0 ? importId : undefined,
      });

      const photo = await prisma.photo.findUniqueOrThrow({
        where: { id: photoId },
        select: { role: true, isPrimary: true, frameGroupId: true },
      });

      results.push({
        filename: file.name,
        ok: true,
        photoId,
        created,
        role: photo.role,
        isPrimary: photo.isPrimary,
        frameGroupId: photo.frameGroupId,
        thumbUrl: `/api/photos/${photoId}/thumb`,
      });
    } catch (error) {
      console.error(`Ingest failed for ${file.name}:`, error);
      results.push({
        filename: file.name,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown ingest error",
      });
    }
  }

  return NextResponse.json({ results });
}
