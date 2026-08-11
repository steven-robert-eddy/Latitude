import { NextResponse } from "next/server";
import { takeAssignment } from "@/lib/curriculum/progress";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const progress = await takeAssignment(id);
    return NextResponse.json({ status: progress.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to take assignment" }, { status: 400 });
  }
}
