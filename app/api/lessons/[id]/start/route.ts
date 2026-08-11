import { NextResponse } from "next/server";
import { startReading } from "@/lib/curriculum/progress";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const progress = await startReading(id);
    return NextResponse.json({ status: progress.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to start lesson" }, { status: 400 });
  }
}
