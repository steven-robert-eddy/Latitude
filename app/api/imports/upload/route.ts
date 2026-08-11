import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runImportJob } from "@/lib/import/job-runner";

/**
 * Browser folder-drop import (§4b). The client is expected to send each
 * File's relative path (webkitdirectory's webkitRelativePath) as the
 * multipart filename, so subfolder structure survives for frame grouping.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const label = form.get("label");
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  if (typeof label !== "string" || label.trim().length === 0) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }
  if (files.length === 0) {
    return NextResponse.json({ error: "No files in upload" }, { status: 400 });
  }

  const importRow = await prisma.import.create({
    data: { label, sourceNote: "Browser folder upload" },
  });

  const buffers = await Promise.all(
    files.map(async (file) => ({ filename: file.name, buffer: Buffer.from(await file.arrayBuffer()) })),
  );

  void runImportJob(importRow.id, { kind: "buffers", files: buffers });

  return NextResponse.json({ importId: importRow.id });
}
