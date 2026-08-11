/*
  Warnings:

  - Added the required column `conditions` to the `Lesson` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockNumber" INTEGER NOT NULL,
    "blockTitle" TEXT NOT NULL,
    "lessonNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "estMinutes" INTEGER NOT NULL,
    "contentPath" TEXT NOT NULL,
    "skillTags" TEXT NOT NULL,
    "conditions" TEXT NOT NULL
);
INSERT INTO "new_Lesson" ("blockNumber", "blockTitle", "contentPath", "estMinutes", "id", "lessonNumber", "skillTags", "summary", "title") SELECT "blockNumber", "blockTitle", "contentPath", "estMinutes", "id", "lessonNumber", "skillTags", "summary", "title" FROM "Lesson";
DROP TABLE "Lesson";
ALTER TABLE "new_Lesson" RENAME TO "Lesson";
CREATE UNIQUE INDEX "Lesson_blockNumber_lessonNumber_key" ON "Lesson"("blockNumber", "lessonNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
