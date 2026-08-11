// Content is the source of truth; the DB is an index (§5.4). This parses
// every content/lessons/*.mdx frontmatter block and upserts the matching
// Lesson + Assignment rows. Run on postinstall and via `npm run lessons:watch`
// in dev.
import { prisma } from "@/lib/db";
import { getAllLessonSources } from "@/lib/content/lessons";

async function main() {
  const lessons = await getAllLessonSources();

  for (const { slug, frontmatter } of lessons) {
    await prisma.lesson.upsert({
      where: { id: slug },
      create: {
        id: slug,
        blockNumber: frontmatter.blockNumber,
        blockTitle: frontmatter.blockTitle,
        lessonNumber: frontmatter.lessonNumber,
        title: frontmatter.title,
        summary: frontmatter.summary,
        estMinutes: frontmatter.estMinutes,
        contentPath: `content/lessons/${slug}.mdx`,
        skillTags: JSON.stringify(frontmatter.skillTags),
        conditions: JSON.stringify(frontmatter.conditions),
      },
      update: {
        blockNumber: frontmatter.blockNumber,
        blockTitle: frontmatter.blockTitle,
        lessonNumber: frontmatter.lessonNumber,
        title: frontmatter.title,
        summary: frontmatter.summary,
        estMinutes: frontmatter.estMinutes,
        contentPath: `content/lessons/${slug}.mdx`,
        skillTags: JSON.stringify(frontmatter.skillTags),
        conditions: JSON.stringify(frontmatter.conditions),
      },
    });

    const { assignment } = frontmatter;
    await prisma.assignment.upsert({
      where: { lessonId: slug },
      create: {
        lessonId: slug,
        title: assignment.title,
        brief: assignment.brief,
        constraints: assignment.constraints ? JSON.stringify(assignment.constraints) : null,
        successCriteria: JSON.stringify(assignment.successCriteria),
        minPhotos: assignment.minPhotos,
      },
      update: {
        title: assignment.title,
        brief: assignment.brief,
        constraints: assignment.constraints ? JSON.stringify(assignment.constraints) : null,
        successCriteria: JSON.stringify(assignment.successCriteria),
        minPhotos: assignment.minPhotos,
      },
    });

    // Every lesson has a progress row from the start — not_started is a
    // real state in the machine (§5.2), not the absence of a row.
    await prisma.lessonProgress.upsert({
      where: { lessonId: slug },
      create: { lessonId: slug },
      update: {},
    });

    console.log(`indexed ${slug}`);
  }

  console.log(`\n${lessons.length} lesson(s) indexed.`);
}

main()
  .catch((error) => {
    console.error("Lesson indexing failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
