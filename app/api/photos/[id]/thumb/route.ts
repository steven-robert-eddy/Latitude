import { NextResponse } from "next/server";
import { readPhotoMedia } from "@/lib/photos/media";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const media = await readPhotoMedia(id, "thumb");
  if (!media) return NextResponse.json({ error: "not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(media.buffer), {
    headers: {
      "Content-Type": media.contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
