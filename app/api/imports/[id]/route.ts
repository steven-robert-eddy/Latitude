import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deletePhotoFiles } from "@/lib/photos/paths";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const importRow = await prisma.import.findUnique({ where: { id } });
  if (!importRow) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    id: importRow.id,
    label: importRow.label,
    sourceNote: importRow.sourceNote,
    sourcePath: importRow.sourcePath,
    status: importRow.status,
    fileCount: importRow.fileCount,
    processedCount: importRow.processedCount,
    duplicateCount: importRow.duplicateCount,
    errorCount: importRow.errorCount,
    currentFilename: importRow.currentFilename,
    errors: importRow.errorLog ? (JSON.parse(importRow.errorLog) as { filename: string; reason: string }[]) : [],
    createdAt: importRow.createdAt,
  });
}

/**
 * Deletes an import wholesale — cascades to its photo rows in the DB (§4b),
 * and removes their original + derivative files from disk too, since a
 * "back out a misfire" action that leaves the files behind isn't actually
 * clean.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const photos = await prisma.photo.findMany({
    where: { importId: id },
    select: { originalPath: true, thumbPath: true, previewPath: true },
  });

  try {
    await prisma.import.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await Promise.all(photos.map((p) => deletePhotoFiles(p)));

  return NextResponse.json({ ok: true });
}
