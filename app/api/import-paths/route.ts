import { NextResponse } from "next/server";
import { listRecentImportPaths } from "@/lib/import/recent-paths";

export async function GET() {
  const paths = await listRecentImportPaths();
  return NextResponse.json({ paths });
}
