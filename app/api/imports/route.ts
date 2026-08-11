import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runImportJob } from "@/lib/import/job-runner";
import { recordImportPath } from "@/lib/import/recent-paths";

/** Server-side path import (§4b) — nothing goes through the browser, better for hundreds of RAW files. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const label = body?.label;
  const sourcePath = body?.sourcePath;

  if (typeof label !== "string" || label.trim().length === 0) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }
  if (typeof sourcePath !== "string" || sourcePath.trim().length === 0) {
    return NextResponse.json({ error: "sourcePath is required" }, { status: 400 });
  }

  const importRow = await prisma.import.create({
    data: { label, sourcePath, sourceNote: sourcePath },
  });

  await recordImportPath(sourcePath);

  // Fire-and-forget: the client polls GET /api/imports/[id] for progress and
  // can close the page without killing the job.
  void runImportJob(importRow.id, { kind: "path", rootPath: sourcePath });

  return NextResponse.json({ importId: importRow.id });
}
