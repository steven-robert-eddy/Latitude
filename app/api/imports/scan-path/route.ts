import { NextResponse } from "next/server";
import { walkDirectory } from "@/lib/import/fs-walk";

/** Scans a server-side path without persisting anything — the "show the count and size, ask before starting" step (§4b). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const path = body?.path;

  if (typeof path !== "string" || path.trim().length === 0) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  try {
    const files = await walkDirectory(path);
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    return NextResponse.json({ fileCount: files.length, totalBytes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to scan path" },
      { status: 400 },
    );
  }
}
