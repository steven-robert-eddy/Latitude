import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { lessonFrontmatterSchema, type LessonFrontmatter } from "./schema";

export const LESSONS_DIR = path.join(process.cwd(), "content", "lessons");

export type LessonSource = {
  frontmatter: LessonFrontmatter;
  /** Raw MDX body, with frontmatter stripped — ready to compile. */
  content: string;
  slug: string;
};

export async function getLessonSlugs(): Promise<string[]> {
  const files = await fs.readdir(LESSONS_DIR);
  return files.filter((f) => f.endsWith(".mdx")).map((f) => f.replace(/\.mdx$/, ""));
}

export async function getLessonSource(slug: string): Promise<LessonSource> {
  const filePath = path.join(LESSONS_DIR, `${slug}.mdx`);
  const raw = await fs.readFile(filePath, "utf-8");
  const { data, content } = matter(raw);

  const frontmatter = lessonFrontmatterSchema.parse(data);
  if (frontmatter.id !== slug) {
    throw new Error(`Lesson frontmatter id "${frontmatter.id}" doesn't match filename "${slug}.mdx"`);
  }

  return { frontmatter, content, slug };
}

export async function getAllLessonSources(): Promise<LessonSource[]> {
  const slugs = await getLessonSlugs();
  const lessons = await Promise.all(slugs.map(getLessonSource));
  return lessons.sort((a, b) => {
    if (a.frontmatter.blockNumber !== b.frontmatter.blockNumber) {
      return a.frontmatter.blockNumber - b.frontmatter.blockNumber;
    }
    return a.frontmatter.lessonNumber - b.frontmatter.lessonNumber;
  });
}
