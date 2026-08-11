import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Feeds the post-import review screen's frame strip (§4b). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const photos = await prisma.photo.findMany({
    where: { importId: id },
    orderBy: { filename: "asc" },
    select: {
      id: true,
      filename: true,
      role: true,
      isPrimary: true,
      fileKind: true,
      rawFormat: true,
      previewSource: true,
      frameGroupId: true,
    },
  });

  return NextResponse.json({
    photos: photos.map((p) => ({ ...p, thumbUrl: `/api/photos/${p.id}/thumb` })),
  });
}
