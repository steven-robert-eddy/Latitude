import Link from "next/link";
import { listOpenAssignments, suggestNextLesson } from "@/lib/curriculum/queries";

// Progress state changes on every assignment/completion action — this must
// reflect the live DB on every request, never a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [openAssignments, suggested] = await Promise.all([listOpenAssignments(), suggestNextLesson()]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-16">
      <div>
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-ink">Latitude</h1>
        <p className="mt-2 text-ink-soft">A lab notebook for deliberately improving at photography.</p>
      </div>

      {openAssignments.length > 0 && (
        <section>
          <h2 className="font-sans text-sm font-semibold tracking-wide text-ink-soft uppercase">
            Open assignment{openAssignments.length > 1 ? "s" : ""}
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {openAssignments.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={`/learn/${lesson.id}`}
                  className="block border border-paper-edge bg-paper p-4 transition-colors hover:border-mark"
                >
                  <p className="font-sans text-xs text-ink-soft">
                    Block {lesson.blockNumber} · {lesson.blockTitle}
                  </p>
                  <p className="mt-1 font-sans text-base font-semibold text-ink">{lesson.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {suggested && (
        <section>
          <h2 className="font-sans text-sm font-semibold tracking-wide text-ink-soft uppercase">
            {openAssignments.length > 0 ? "Or pick up" : "Start here"}
          </h2>
          <Link
            href={`/learn/${suggested.id}`}
            className="mt-3 block border border-paper-edge bg-paper p-4 transition-colors hover:border-mark"
          >
            <p className="font-sans text-xs text-ink-soft">
              Block {suggested.blockNumber} · {suggested.blockTitle}
            </p>
            <p className="mt-1 font-sans text-base font-semibold text-ink">{suggested.title}</p>
            <p className="mt-1 font-serif text-sm text-ink-soft">{suggested.summary}</p>
          </Link>
          <Link href="/learn" className="mt-2 inline-block font-sans text-sm text-mark underline underline-offset-2">
            or browse something else
          </Link>
        </section>
      )}

      <Link href="/import" className="font-sans text-sm text-ink-soft underline underline-offset-2">
        Import photos
      </Link>
    </main>
  );
}
