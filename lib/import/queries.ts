import { prisma } from "@/lib/db";

const MAX_RECENT_IMPORTS = 3;

export async function listRecentImports() {
  return prisma.import.findMany({
    orderBy: { createdAt: "desc" },
    take: MAX_RECENT_IMPORTS,
    select: {
      id: true,
      label: true,
      status: true,
      fileCount: true,
      processedCount: true,
      createdAt: true,
    },
  });
}
