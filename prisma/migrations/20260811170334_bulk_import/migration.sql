-- CreateTable
CREATE TABLE "RecentImportPath" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "useCount" INTEGER NOT NULL DEFAULT 1
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Import" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "sourceNote" TEXT,
    "sourcePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "currentFilename" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorLog" TEXT
);
INSERT INTO "new_Import" ("createdAt", "errorLog", "fileCount", "id", "label", "sourceNote", "status") SELECT "createdAt", "errorLog", "fileCount", "id", "label", "sourceNote", "status" FROM "Import";
DROP TABLE "Import";
ALTER TABLE "new_Import" RENAME TO "Import";
CREATE TABLE "new_Photo" (
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
    CONSTRAINT "Photo_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Photo" ("apertureF", "cameraMake", "cameraModel", "capturedAt", "exifJson", "expComp", "fileHash", "fileKind", "filename", "filmSimulation", "flashFired", "focalLength", "focalLength35", "frameGroupId", "height", "id", "importId", "importedAt", "isPrimary", "isRawDecoded", "iso", "lensModel", "meteringMode", "notes", "originalPath", "previewPath", "previewSource", "rawFormat", "role", "shutterSec", "thumbPath", "width") SELECT "apertureF", "cameraMake", "cameraModel", "capturedAt", "exifJson", "expComp", "fileHash", "fileKind", "filename", "filmSimulation", "flashFired", "focalLength", "focalLength35", "frameGroupId", "height", "id", "importId", "importedAt", "isPrimary", "isRawDecoded", "iso", "lensModel", "meteringMode", "notes", "originalPath", "previewPath", "previewSource", "rawFormat", "role", "shutterSec", "thumbPath", "width" FROM "Photo";
DROP TABLE "Photo";
ALTER TABLE "new_Photo" RENAME TO "Photo";
CREATE UNIQUE INDEX "Photo_fileHash_key" ON "Photo"("fileHash");
CREATE INDEX "Photo_capturedAt_idx" ON "Photo"("capturedAt");
CREATE INDEX "Photo_apertureF_idx" ON "Photo"("apertureF");
CREATE INDEX "Photo_iso_idx" ON "Photo"("iso");
CREATE INDEX "Photo_isPrimary_idx" ON "Photo"("isPrimary");
CREATE INDEX "Photo_fileKind_idx" ON "Photo"("fileKind");
CREATE INDEX "Photo_frameGroupId_idx" ON "Photo"("frameGroupId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "RecentImportPath_path_key" ON "RecentImportPath"("path");
