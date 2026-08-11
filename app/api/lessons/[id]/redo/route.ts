import { NextResponse } from "next/server";
import { redoAssignment } from "@/lib/curriculum/progress";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const progress = await redoAssignment(id);
    return NextResponse.json({ status: progress.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to redo assignment" }, { status: 400 });
  }
}
