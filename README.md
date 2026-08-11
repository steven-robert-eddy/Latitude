# Latitude

A self-hosted lab notebook for deliberately improving at photography. See
[DESIGN.md](./DESIGN.md) for the full product spec — principles, data model,
ingestion pipeline, and the five modules this is built around.

## Status

Phase 1 (foundation) is in place: the Prisma/SQLite schema, the photo
ingestion pipeline (hashing, EXIF/RAW metadata extraction, thumbnail/preview
generation, frame grouping), and a bare-bones `/import` page exercising it end
to end. The curriculum, cull trainer, insights, challenges, and recipe modules
come in later phases (see DESIGN.md §10).

## Getting started

```bash
npm install        # also runs `prisma generate`
npm run db:migrate  # applies the schema to data/db/latitude.db
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `/import` lets you drop
photos in and watch them get ingested.

`data/` (the SQLite database and the photo store) is gitignored — it's local
state, backed up by copying the folder, never committed.

## Stack

Next.js (App Router) + TypeScript, Prisma over SQLite (via the
`better-sqlite3` driver adapter), `sharp` for derivatives, `exifr` +
`exiftool-vendored` for metadata, Tailwind for styling. See DESIGN.md §2 for
the rationale.

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run lint`
- `npm run db:migrate` — Prisma migrate dev
- `npm run db:studio` — Prisma Studio
