import { prisma } from "@/lib/db";

export type LessonListItem = {
  id: string;
  blockNumber: number;
  blockTitle: string;
  lessonNumber: number;
  title: string;
  summary: string;
  estMinutes: number;
  skillTags: string[];
  conditions: string[];
  status: string;
};

export async function listLessonsWithProgress(): Promise<LessonListItem[]> {
  const lessons = await prisma.lesson.findMany({
    include: { progress: true },
    orderBy: [{ blockNumber: "asc" }, { lessonNumber: "asc" }],
  });

  return lessons.map((l) => ({
    id: l.id,
    blockNumber: l.blockNumber,
    blockTitle: l.blockTitle,
    lessonNumber: l.lessonNumber,
    title: l.title,
    summary: l.summary,
    estMinutes: l.estMinutes,
    skillTags: JSON.parse(l.skillTags) as string[],
    conditions: JSON.parse(l.conditions) as string[],
    status: l.progress?.status ?? "not_started",
  }));
}

/** Lessons currently `assigned` — the home screen shows all of them, not just one (§5.1). */
export async function listOpenAssignments(): Promise<LessonListItem[]> {
  const lessons = await listLessonsWithProgress();
  return lessons.filter((l) => l.status === "assigned");
}

/**
 * A suggestion, not a queue (§5.1) — weighted toward lessons that haven't
 * been touched yet. Weighting toward weak critique-score skills is a
 * Module 3 dependency that doesn't exist yet, so this is untouched-only for
 * now.
 */
export async function suggestNextLesson(): Promise<LessonListItem | null> {
  const lessons = await listLessonsWithProgress();
  if (lessons.length === 0) return null;

  const untouched = lessons.filter((l) => l.status === "not_started");
  const pool = untouched.length > 0 ? untouched : lessons;
  return pool[Math.floor(Math.random() * pool.length)];
}
