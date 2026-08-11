import { NextResponse } from "next/server";
import { listLessonsWithProgress } from "@/lib/curriculum/queries";

export async function GET() {
  const lessons = await listLessonsWithProgress();
  return NextResponse.json({ lessons });
}
