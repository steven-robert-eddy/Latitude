import { z } from "zod";

// Matches the MDX frontmatter format in DESIGN.md §5.4. Content is the
// source of truth; this is what gets parsed out of it and, eventually,
// upserted into the Lesson/Assignment tables by scripts/index-lessons.ts.

export const assignmentFrontmatterSchema = z.object({
  title: z.string().min(1),
  brief: z.string().min(1),
  minPhotos: z.number().int().positive(),
  constraints: z.record(z.string(), z.unknown()).optional(),
  successCriteria: z.array(z.string().min(1)).min(1),
});

export const lessonFrontmatterSchema = z.object({
  id: z.string().min(1),
  blockNumber: z.number().int().positive(),
  blockTitle: z.string().min(1),
  lessonNumber: z.number().int().positive(),
  title: z.string().min(1),
  summary: z.string().min(1),
  estMinutes: z.number().int().positive(),
  skillTags: z.array(z.string()),
  // Drives the "needs specific conditions" filter in the lesson grid (§5.1).
  conditions: z.array(z.enum(["any", "sun", "golden-hour", "moving-subject", "location"])),
  assignment: assignmentFrontmatterSchema,
});

export type AssignmentFrontmatter = z.infer<typeof assignmentFrontmatterSchema>;
export type LessonFrontmatter = z.infer<typeof lessonFrontmatterSchema>;
