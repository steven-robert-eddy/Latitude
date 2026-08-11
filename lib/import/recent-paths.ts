import { prisma } from "@/lib/db";

const MAX_RECENT_PATHS = 10;

/**
 * "Remember recent import paths" (§4b) — the convenience of a watched
 * folder without the cost: "import new files from /mnt/photos/2026" is a
 * one-click action, but it still scans and waits for confirmation rather
 * than silently pulling files in.
 */
export async function recordImportPath(importPath: string): Promise<void> {
  await prisma.recentImportPath.upsert({
    where: { path: importPath },
    create: { path: importPath },
    update: { lastUsedAt: new Date(), useCount: { increment: 1 } },
  });
}

export async function listRecentImportPaths() {
  return prisma.recentImportPath.findMany({
    orderBy: { lastUsedAt: "desc" },
    take: MAX_RECENT_PATHS,
  });
}
