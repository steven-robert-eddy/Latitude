# Latitude

A self-hosted lab notebook for deliberately improving at photography. See
[DESIGN.md](./DESIGN.md) for the full product spec — principles, data model,
ingestion pipeline, and the five modules this is built around.

## Status

Phases 1, 1b, and 2 are in place — the two phases the design doc calls "the
real project":

- **Phase 1 — foundation.** Prisma/SQLite schema, the photo ingestion
  pipeline (hashing, EXIF/RAW metadata extraction, thumbnail/preview
  generation, frame grouping + primary election), manual entry and the roll
  shortcut for scans.
- **Phase 1b — bulk import.** Server-path and folder-drop import, a
  concurrency-capped background job so large imports don't lock the app up,
  per-file error handling, a post-import review screen.
- **Phase 2 — Fundamentals Curriculum (v1 ship).** All twelve lessons
  authored as MDX, the lesson grid with filters, the reader with a pinned
  assignment brief, and the full take → submit → self-check → complete flow
  with a required reflection.

The cull trainer, insights, challenges, and recipe modules come in later
phases (see DESIGN.md §10).

## Getting started

```bash
npm install         # also runs `prisma generate`
cp .env.example .env  # .env is gitignored — this is your local DB path config
npm run db:migrate  # applies the schema to data/db/latitude.db
npm run dev
```

On Windows (PowerShell), use `Copy-Item .env.example .env` instead of `cp`.

Open [http://localhost:3000](http://localhost:3000). `/import` lets you drop
photos in and watch them get ingested; `/learn` is the curriculum.

`data/` (the SQLite database and the photo store) is gitignored — it's local
state, backed up by copying the folder, never committed.

## Stack

Next.js (App Router) + TypeScript, Prisma over SQLite (via the
`better-sqlite3` driver adapter), `sharp` for derivatives, `exifr` +
`exiftool-vendored` for metadata, `next-mdx-remote` for lesson content,
Tailwind for styling. See DESIGN.md §2 for the rationale.

## Scripts

- `npm run dev` / `npm run build` / `npm run start` — each re-indexes lesson
  content first (`predev`/`prebuild`)
- `npm run lint`
- `npm run db:migrate` — Prisma migrate dev
- `npm run db:studio` — Prisma Studio
- `npm run lessons:index` — parse `content/lessons/*.mdx` and upsert into the DB
- `npm run lessons:watch` — re-index automatically while editing lesson content
