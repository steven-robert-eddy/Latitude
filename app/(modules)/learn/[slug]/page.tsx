import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getLessonSource, getLessonSlugs } from "@/lib/content/lessons";
import { mdxComponents } from "@/components/mdx";
import { LessonProgressPanel } from "@/components/curriculum/LessonProgressPanel";

export async function generateStaticParams() {
  const slugs = await getLessonSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const lesson = await getLessonSource(slug).catch(() => null);
  if (!lesson) notFound();

  const { frontmatter, content } = lesson;

  return (
    <main className="mx-auto flex w-full max-w-[68ch] flex-1 flex-col px-6 py-16 pb-28">
      <p className="font-sans text-xs font-semibold tracking-wide text-ink-soft uppercase">
        Block {frontmatter.blockNumber} · {frontmatter.blockTitle}
      </p>
      <h1 className="mt-2 font-sans text-2xl font-semibold text-ink">{frontmatter.title}</h1>
      <p className="mt-2 font-serif text-ink-soft">{frontmatter.summary}</p>
      <p className="mt-1 font-mono text-xs text-ink-soft">{frontmatter.estMinutes} min read</p>

      <article className="mt-8">
        <MDXRemote source={content} components={mdxComponents} />
      </article>

      <LessonProgressPanel lessonId={slug} />
    </main>
  );
}
