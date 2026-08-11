import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      progress: true,
      assignment: {
        include: {
          submissions: {
            include: { photo: { select: { id: true, filename: true } } },
            orderBy: { submittedAt: "asc" },
          },
        },
      },
    },
  });

  if (!lesson) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!lesson.assignment) return NextResponse.json({ error: "lesson has no assignment" }, { status: 500 });

  return NextResponse.json({
    id: lesson.id,
    blockNumber: lesson.blockNumber,
    blockTitle: lesson.blockTitle,
    lessonNumber: lesson.lessonNumber,
    title: lesson.title,
    summary: lesson.summary,
    estMinutes: lesson.estMinutes,
    skillTags: JSON.parse(lesson.skillTags) as string[],
    conditions: JSON.parse(lesson.conditions) as string[],
    status: lesson.progress?.status ?? "not_started",
    reflection: lesson.progress?.reflection ?? null,
    assignment: {
      title: lesson.assignment.title,
      brief: lesson.assignment.brief,
      minPhotos: lesson.assignment.minPhotos,
      successCriteria: JSON.parse(lesson.assignment.successCriteria) as string[],
      submissions: lesson.assignment.submissions.map((s) => ({
        photoId: s.photoId,
        filename: s.photo.filename,
        role: s.role,
        selfNote: s.selfNote,
        criteriaMet: s.criteriaMet ? (JSON.parse(s.criteriaMet) as Record<string, boolean>) : null,
        thumbUrl: `/api/photos/${s.photoId}/thumb`,
      })),
    },
  });
}
