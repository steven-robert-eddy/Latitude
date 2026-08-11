import { prisma } from "@/lib/db";
import type { SubmissionInput } from "./types";

// The lesson flow state machine, §5.2:
//
//   not_started → reading → assigned → submitted → complete
//                   ↑                       |
//                   └───────────────────────┘
//                       (redo assignment)
//
// Enforced here, not just in the UI — the same discipline the culling
// trainer's gut-rating lock uses elsewhere in the app.

export class InvalidLessonTransitionError extends Error {}

async function requireProgress(lessonId: string) {
  const progress = await prisma.lessonProgress.findUnique({ where: { lessonId } });
  if (!progress) throw new Error(`No lesson found: ${lessonId}`);
  return progress;
}

/** Opened the lesson. Idempotent — fired from the reader page on mount. */
export async function startReading(lessonId: string) {
  const progress = await requireProgress(lessonId);
  if (progress.status !== "not_started") return progress;

  return prisma.lessonProgress.update({
    where: { lessonId },
    data: { status: "reading", startedAt: progress.startedAt ?? new Date() },
  });
}

/** Pressed "Take the assignment." Idempotent if already assigned. */
export async function takeAssignment(lessonId: string) {
  const progress = await requireProgress(lessonId);
  if (progress.status === "assigned") return progress;
  if (progress.status !== "not_started" && progress.status !== "reading") {
    throw new InvalidLessonTransitionError(
      `Can't take the assignment from status "${progress.status}" — use redo instead.`,
    );
  }

  return prisma.lessonProgress.update({
    where: { lessonId },
    data: { status: "assigned", startedAt: progress.startedAt ?? new Date() },
  });
}

/** Photos uploaded and mapped to assignment roles. */
export async function submitAssignment(lessonId: string, submissions: SubmissionInput[]) {
  const progress = await requireProgress(lessonId);
  if (progress.status !== "assigned") {
    throw new InvalidLessonTransitionError(`Can't submit from status "${progress.status}"`);
  }

  const assignment = await prisma.assignment.findUnique({ where: { lessonId } });
  if (!assignment) throw new Error(`Lesson ${lessonId} has no assignment`);

  if (submissions.length < assignment.minPhotos) {
    throw new Error(`This assignment needs at least ${assignment.minPhotos} photo(s) — got ${submissions.length}.`);
  }

  await prisma.$transaction([
    prisma.assignmentSubmission.deleteMany({ where: { assignmentId: assignment.id } }),
    ...submissions.map((s) =>
      prisma.assignmentSubmission.create({
        data: { assignmentId: assignment.id, photoId: s.photoId, role: s.role ?? null, selfNote: s.selfNote ?? null },
      }),
    ),
    prisma.lessonProgress.update({ where: { lessonId }, data: { status: "submitted" } }),
  ]);

  return requireProgress(lessonId);
}

/**
 * Self-check criteria filled in and a reflection written. The reflection is
 * required — it's the highest-value field in the app (§5.2) — and is
 * enforced here, not just with a form validator, so no code path can skip it.
 */
export async function completeLesson(lessonId: string, criteriaMet: Record<string, boolean>, reflection: string) {
  const progress = await requireProgress(lessonId);
  if (progress.status !== "submitted") {
    throw new InvalidLessonTransitionError(`Can't complete from status "${progress.status}"`);
  }
  if (reflection.trim().length === 0) {
    throw new Error("A reflection is required to complete a lesson.");
  }

  const assignment = await prisma.assignment.findUnique({ where: { lessonId } });
  if (!assignment) throw new Error(`Lesson ${lessonId} has no assignment`);

  await prisma.$transaction([
    prisma.assignmentSubmission.updateMany({
      where: { assignmentId: assignment.id },
      data: { criteriaMet: JSON.stringify(criteriaMet) },
    }),
    prisma.lessonProgress.update({
      where: { lessonId },
      data: { status: "complete", completedAt: new Date(), reflection },
    }),
  ]);

  return requireProgress(lessonId);
}

/** Redo the assignment — loops back to `reading` (§5.2), only valid from `submitted`. */
export async function redoAssignment(lessonId: string) {
  const progress = await requireProgress(lessonId);
  if (progress.status !== "submitted") {
    throw new InvalidLessonTransitionError(`Can't redo from status "${progress.status}"`);
  }

  const assignment = await prisma.assignment.findUnique({ where: { lessonId } });

  await prisma.$transaction([
    ...(assignment ? [prisma.assignmentSubmission.deleteMany({ where: { assignmentId: assignment.id } })] : []),
    prisma.lessonProgress.update({
      where: { lessonId },
      data: { status: "reading", completedAt: null, reflection: null },
    }),
  ]);

  return requireProgress(lessonId);
}
