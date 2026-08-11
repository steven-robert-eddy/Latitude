import { NextResponse } from "next/server";
import { z } from "zod";
import { submitAssignment } from "@/lib/curriculum/progress";

const bodySchema = z.object({
  submissions: z
    .array(
      z.object({
        photoId: z.string().min(1),
        role: z.string().optional(),
        selfNote: z.string().optional(),
      }),
    )
    .min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Expected { submissions: [{ photoId, role?, selfNote? }] }" }, { status: 400 });
  }

  try {
    const progress = await submitAssignment(id, body.data.submissions);
    return NextResponse.json({ status: progress.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to submit assignment" }, { status: 400 });
  }
}
