import { listLessonsWithProgress } from "@/lib/curriculum/queries";
import { LessonGrid } from "@/components/curriculum/LessonGrid";

// Status badges must reflect live progress, never a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const lessons = await listLessonsWithProgress();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="font-sans text-xl font-semibold text-ink">Fundamentals</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Twelve lessons, four blocks, no particular order. Pick whichever matches the light outside.
        </p>
      </div>
      <LessonGrid lessons={lessons} />
    </main>
  );
}
