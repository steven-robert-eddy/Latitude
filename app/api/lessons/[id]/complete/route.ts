import { NextResponse } from "next/server";
import { z } from "zod";
import { completeLesson } from "@/lib/curriculum/progress";

const bodySchema = z.object({
  criteriaMet: z.record(z.string(), z.boolean()),
  reflection: z.string().min(1, "A reflection is required to complete a lesson."),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  try {
    const progress = await completeLesson(id, body.data.criteriaMet, body.data.reflection);
    return NextResponse.json({ status: progress.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to complete lesson" }, { status: 400 });
  }
}
