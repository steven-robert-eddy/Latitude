import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import type { FrameRole } from "./types";

// Primary election order — first match wins. See DESIGN.md §4.4.
const ROLE_PRIORITY: FrameRole[] = ["edited", "as_shot_jpeg", "raw", "scan"];

export function filenameStem(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return (dot === -1 ? filename : filename.slice(0, dot)).toLowerCase();
}

function truncateToSecond(date: Date): Date {
  const d = new Date(date);
  d.setMilliseconds(0);
  return d;
}

/**
 * Finds the frameGroupId a new photo belongs to, by matching capturedAt (to
 * the second) and filename stem against photos already in the store. A file
 * with no capturedAt (a scan awaiting manual entry) can't be matched on time
 * and gets a solo group.
 *
 * Read-only — the caller inserts the new Photo with the returned
 * frameGroupId, then calls reelectPrimary() to settle isPrimary across the
 * whole group.
 */
export async function findFrameGroupId(filename: string, capturedAt: Date | null): Promise<string> {
  if (!capturedAt) return randomUUID();

  const stem = filenameStem(filename);
  const second = truncateToSecond(capturedAt);
  const windowEnd = new Date(second.getTime() + 1000);

  const candidates = await prisma.photo.findMany({
    where: { capturedAt: { gte: second, lt: windowEnd } },
    select: { filename: true, frameGroupId: true },
  });

  const sibling = candidates.find((c) => filenameStem(c.filename) === stem);
  return sibling?.frameGroupId ?? randomUUID();
}

/**
 * Re-runs primary election across every photo currently in a frame group.
 * Call this after any insert into the group, including a file arriving in a
 * later import that joins retroactively — promoting a new primary must not
 * orphan attachments on the old one, since assignments/cull entries/etc.
 * reference the group through whichever photo row is primary at the time.
 */
export async function reelectPrimary(frameGroupId: string): Promise<void> {
  const members = await prisma.photo.findMany({
    where: { frameGroupId },
    select: { id: true, role: true, importedAt: true },
  });
  if (members.length === 0) return;

  const primaryId = electPrimary(members);

  // Frame groups are small (1-3 photos) — just write the whole set rather
  // than diffing against current state.
  await prisma.$transaction(
    members.map((m) => prisma.photo.update({ where: { id: m.id }, data: { isPrimary: m.id === primaryId } })),
  );
}

function electPrimary(members: { id: string; role: string; importedAt: Date }[]): string {
  for (const role of ROLE_PRIORITY) {
    const candidates = members
      .filter((m) => m.role === role)
      .sort((a, b) => a.importedAt.getTime() - b.importedAt.getTime());
    if (candidates.length > 0) return candidates[0].id;
  }
  return members[0].id;
}
