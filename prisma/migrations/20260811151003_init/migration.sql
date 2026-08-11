-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalPath" TEXT NOT NULL,
    "thumbPath" TEXT NOT NULL,
    "previewPath" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "capturedAt" DATETIME,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileKind" TEXT NOT NULL,
    "rawFormat" TEXT,
    "previewSource" TEXT,
    "isRawDecoded" BOOLEAN NOT NULL DEFAULT false,
    "frameGroupId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "importId" TEXT,
    "cameraMake" TEXT,
    "cameraModel" TEXT,
    "lensModel" TEXT,
    "focalLength" REAL,
    "focalLength35" REAL,
    "apertureF" REAL,
    "shutterSec" REAL,
    "iso" INTEGER,
    "expComp" REAL,
    "meteringMode" TEXT,
    "flashFired" BOOLEAN,
    "filmSimulation" TEXT,
    "exifJson" TEXT,
    "notes" TEXT,
    CONSTRAINT "Photo_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Import" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "sourceNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorLog" TEXT
);

-- CreateTable
CREATE TABLE "PhotoTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "photoId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "PhotoTag_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockNumber" INTEGER NOT NULL,
    "blockTitle" TEXT NOT NULL,
    "lessonNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "estMinutes" INTEGER NOT NULL,
    "contentPath" TEXT NOT NULL,
    "skillTags" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lessonId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "reflection" TEXT,
    CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "constraints" TEXT,
    "successCriteria" TEXT NOT NULL,
    "minPhotos" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "Assignment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssignmentSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT,
    "selfNote" TEXT,
    "criteriaMet" TEXT,
    CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssignmentSubmission_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CullSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "mode" TEXT NOT NULL DEFAULT 'blind'
);

-- CreateTable
CREATE TABLE "CullEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "gutRating" INTEGER,
    "finalRating" INTEGER,
    "picked" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    CONSTRAINT "CullEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CullSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CullEntry_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Critique" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cullEntryId" TEXT,
    "photoId" TEXT NOT NULL,
    "focusScore" INTEGER,
    "focusNote" TEXT,
    "exposureScore" INTEGER,
    "exposureNote" TEXT,
    "compositionScore" INTEGER,
    "compositionNote" TEXT,
    "lightScore" INTEGER,
    "lightNote" TEXT,
    "subjectScore" INTEGER,
    "subjectNote" TEXT,
    "keeperReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Critique_cullEntryId_fkey" FOREIGN KEY ("cullEntryId") REFERENCES "CullEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Critique_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "relatedLessonId" TEXT,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "ChallengeRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" DATETIME,
    "completedAt" DATETIME,
    "reflection" TEXT,
    CONSTRAINT "ChallengeRun_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChallengeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "isPick" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    CONSTRAINT "ChallengeEntry_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ChallengeRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChallengeEntry_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "baseSimulation" TEXT NOT NULL,
    "settingsJson" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "notes" TEXT,
    "bestFor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "RecipeSample" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "sceneType" TEXT,
    "verdict" TEXT,
    CONSTRAINT "RecipeSample_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecipeSample_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Photo_fileHash_key" ON "Photo"("fileHash");

-- CreateIndex
CREATE INDEX "Photo_capturedAt_idx" ON "Photo"("capturedAt");

-- CreateIndex
CREATE INDEX "Photo_apertureF_idx" ON "Photo"("apertureF");

-- CreateIndex
CREATE INDEX "Photo_iso_idx" ON "Photo"("iso");

-- CreateIndex
CREATE INDEX "Photo_isPrimary_idx" ON "Photo"("isPrimary");

-- CreateIndex
CREATE INDEX "Photo_fileKind_idx" ON "Photo"("fileKind");

-- CreateIndex
CREATE INDEX "Photo_frameGroupId_idx" ON "Photo"("frameGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoTag_photoId_label_key" ON "PhotoTag"("photoId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_blockNumber_lessonNumber_key" ON "Lesson"("blockNumber", "lessonNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_lessonId_key" ON "LessonProgress"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_lessonId_key" ON "Assignment"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentSubmission_assignmentId_photoId_key" ON "AssignmentSubmission"("assignmentId", "photoId");

-- CreateIndex
CREATE UNIQUE INDEX "CullEntry_sessionId_photoId_key" ON "CullEntry"("sessionId", "photoId");

-- CreateIndex
CREATE UNIQUE INDEX "Critique_cullEntryId_key" ON "Critique"("cullEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeEntry_runId_photoId_key" ON "ChallengeEntry"("runId", "photoId");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_name_key" ON "Recipe"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeSample_recipeId_photoId_key" ON "RecipeSample"("recipeId", "photoId");
