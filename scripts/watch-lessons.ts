// Dev watcher for the lesson indexer (§5.4) — re-runs scripts/index-lessons.ts
// whenever a file under content/lessons changes. `tsx --watch` alone won't
// catch this: it only re-runs on changes to files in the script's own
// import graph, and .mdx content is read via fs at runtime, not imported.
import { watch } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const LESSONS_DIR = path.join(process.cwd(), "content", "lessons");
const DEBOUNCE_MS = 300;

let timer: ReturnType<typeof setTimeout> | null = null;

function runIndexer() {
  const child = spawn("npx", ["tsx", "scripts/index-lessons.ts"], {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  child.on("error", (err) => console.error("Failed to run indexer:", err));
}

function scheduleReindex(filename: string | null) {
  if (filename && !filename.endsWith(".mdx")) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(runIndexer, DEBOUNCE_MS);
}

console.log(`Watching ${LESSONS_DIR} for changes…`);
runIndexer(); // index once on startup

watch(LESSONS_DIR, { recursive: true }, (_event, filename) => {
  scheduleReindex(filename);
});
