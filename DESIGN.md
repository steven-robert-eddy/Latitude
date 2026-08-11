# Latitude — Design Document

> Working title. "Latitude" is the exposure-latitude pun; swap freely.

A self-hosted web app for deliberately improving at photography. It is a coach and
a lab notebook, not a photo library. Lightroom already stores your pictures — this
stores what you learned from taking them.

---

## 1. Purpose and principles

**The problem.** Shooting more does not automatically make you better. Without
structure you repeat the same habits, you can't tell which of your photos are
actually good, and you never find out which settings are quietly failing you.

**The product.** A modular app with five modules that attack that from different
angles. Every module writes to the same photo store, so the data compounds:
assignments from the curriculum become material for the culling trainer, and the
EXIF analyzer reads across everything.

**Principles that should survive contact with implementation:**

1. **Single user, self-hosted, no accounts.** Steven runs this for himself.
   No auth, no multi-tenancy, no cloud services. Do not add a `User` table.
2. **The data is his.** SQLite file + a photos directory. Both are backed up by
   copying a folder. Nothing is uploaded anywhere.
3. **Photos are evidence, not content.** The app never becomes a gallery or a
   library manager. Photos arrive either attached to something (an assignment, a
   challenge, a cull session) or via bulk import to feed the analyzer. What it
   never does is become the place he browses his pictures for fun.
4. **Offline-capable by default.** No external API calls required for core
   function. Anything AI-assisted is optional and degrades gracefully.
5. **Modules are independent.** Each can be built, shipped, and used alone. They
   share the photo store and nothing else.

**Non-goals.** RAW editing. Photo organization at library scale. Social features,
sharing, publishing. Mobile app (responsive web is enough). Anything requiring an
account.

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router), TypeScript | One deployable, server components for content-heavy lesson pages, route handlers for the API |
| DB | SQLite via Prisma | Single file, zero config, correct for one user. Prisma gives typed access and migrations |
| Styling | Tailwind CSS | Fast, and the design tokens in §9 map cleanly onto config |
| Photo storage | Local filesystem, `./data/photos/` | Originals untouched; derivatives generated alongside |
| Image processing | `sharp` | Thumbnails, resizing, orientation |
| RAW decoding | `exiftool-vendored` (preview extraction) + `dcraw`/LibRaw fallback | See §4.2 — most RAW files never need a real decode |
| EXIF | `exifr`, with `exiftool-vendored` for RAW containers | Standard EXIF plus Fujifilm MakerNotes (film simulation, recipe params) |
| Content | MDX files on disk, indexed into DB | Lessons are authored as files, version-controlled with the code |
| Charts | Recharts | For the EXIF analyzer module |
| Testing | Vitest + Playwright | Unit for the analysis logic, one Playwright pass on the upload flow |

**Deployment.** `next build` + `next start` behind whatever Steven already runs.
A `docker-compose.yml` should be provided with one service and volume mounts for
`./data/db`, `./data/photos`, and a read-only mount for a source photo directory
to import from. The image bundles `exiftool` and, optionally, `dcraw`/LibRaw. No
external network dependency at runtime.

**Repo layout:**

```
/app                    Next.js App Router
  /(modules)/learn      Fundamentals Curriculum
  /(modules)/cull       Culling Trainer
  /(modules)/insights   EXIF Pattern Analyzer
  /(modules)/challenges Shooting Challenges
  /(modules)/recipes    Film Recipe Library
  /import               Bulk import + review
  /api                  Route handlers
/content/lessons        MDX lesson source
/lib
  /photos               Ingest, metadata, RAW previews, frame grouping, thumbs
  /import               Job runner, directory walking, progress state
  /analysis             EXIF aggregation + insight rules
  /content              MDX loading and indexing
/prisma                 schema.prisma, migrations
/data                   Gitignored. db/ and photos/
```

---

## 3. Data model

Prisma schema. Notes follow.

```prisma
// ---------- Photos: the shared spine ----------

model Photo {
  id            String   @id @default(cuid())
  originalPath  String   // relative to data/photos
  thumbPath     String
  previewPath   String
  filename      String
  fileHash      String   @unique  // dedupe on re-upload
  width         Int
  height        Int
  capturedAt    DateTime?
  importedAt    DateTime @default(now())

  // ---- File type and RAW handling ----
  fileKind      String   // "jpeg" | "raw" | "scan"
  rawFormat     String?  // "RAF", "ARW", "CR3", "DNG", "NEF"
  previewSource String?  // "embedded" | "decoded" | "native" — how previewPath was made
  isRawDecoded  Boolean  @default(false)

  // ---- Frame grouping ----
  // One press of the shutter can produce several files: a RAF, its JPEG, and
  // later an edited export. They share a frameGroupId and are ONE photograph.
  frameGroupId  String   // cuid; a solo file gets its own group of one
  role          String   // "as_shot_jpeg" | "raw" | "edited" | "scan"
  isPrimary     Boolean  @default(true)  // exactly one true per frameGroupId

  importId      String?
  import        Import?  @relation(fields: [importId], references: [id])

  // Flattened EXIF for querying. Full blob kept in exifJson.
  cameraMake    String?
  cameraModel   String?
  lensModel     String?
  focalLength   Float?   // mm
  focalLength35 Float?   // 35mm-equivalent, for cross-body comparison
  apertureF     Float?   // 2.8
  shutterSec    Float?   // 0.004
  iso           Int?
  expComp       Float?
  meteringMode  String?
  flashFired    Boolean?
  filmSimulation String? // Fuji MakerNote
  exifJson      String?  // full parsed EXIF as JSON

  notes         String?

  submissions   AssignmentSubmission[]
  cullEntries   CullEntry[]
  challengeEntries ChallengeEntry[]
  recipeSamples RecipeSample[]
  critiques     Critique[]
  tags          PhotoTag[]

  @@index([capturedAt])
  @@index([apertureF])
  @@index([iso])
  @@index([isPrimary])
  @@index([fileKind])
  @@index([frameGroupId])
}

model Import {
  id           String   @id @default(cuid())
  label        String                     // "CocoCay day 2", "walk downtown"
  sourceNote   String?                    // where the files came from
  createdAt    DateTime @default(now())
  fileCount    Int      @default(0)
  status       String   @default("pending") // pending | running | complete | failed
  errorLog     String?                    // JSON array of { filename, reason }

  photos       Photo[]
}

model PhotoTag {
  id      String @id @default(cuid())
  photoId String
  photo   Photo  @relation(fields: [photoId], references: [id], onDelete: Cascade)
  label   String

  @@unique([photoId, label])
}

// ---------- Curriculum ----------

model Lesson {
  id            String  @id            // slug, matches MDX filename
  blockNumber   Int                    // grouping only — not a sequence
  blockTitle    String
  lessonNumber  Int                    // position within block, for stable display
  title         String
  summary       String
  estMinutes    Int
  contentPath   String                 // path to MDX
  skillTags     String                 // JSON array: ["exposure", "light"]

  assignment    Assignment?
  progress      LessonProgress?

  @@unique([blockNumber, lessonNumber])
}

model LessonProgress {
  id          String    @id @default(cuid())
  lessonId    String    @unique
  lesson      Lesson    @relation(fields: [lessonId], references: [id])
  status      String    @default("not_started") // not_started | reading | assigned | submitted | complete
  startedAt   DateTime?
  completedAt DateTime?
  reflection  String?   // free-text: what clicked, what didn't
}

model Assignment {
  id            String  @id @default(cuid())
  lessonId      String  @unique
  lesson        Lesson  @relation(fields: [lessonId], references: [id])
  title         String
  brief         String  // what to shoot
  constraints   String? // JSON: e.g. { "minPhotos": 3, "requireVaryingAperture": true }
  successCriteria String // JSON array of strings — the self-check list
  minPhotos     Int     @default(1)

  submissions   AssignmentSubmission[]
}

model AssignmentSubmission {
  id           String   @id @default(cuid())
  assignmentId String
  assignment   Assignment @relation(fields: [assignmentId], references: [id])
  photoId      String
  photo        Photo    @relation(fields: [photoId], references: [id], onDelete: Cascade)
  submittedAt  DateTime @default(now())
  role         String?  // e.g. "f/2.8" or "backlit" — which slot in the assignment
  selfNote     String?
  criteriaMet  String?  // JSON: { "criterionIndex": bool }

  @@unique([assignmentId, photoId])
}

// ---------- Culling ----------

model CullSession {
  id          String   @id @default(cuid())
  name        String
  createdAt   DateTime @default(now())
  completedAt DateTime?
  mode        String   @default("blind") // blind | comparative
  entries     CullEntry[]
}

model CullEntry {
  id            String  @id @default(cuid())
  sessionId     String
  session       CullSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  photoId       String
  photo         Photo   @relation(fields: [photoId], references: [id], onDelete: Cascade)
  gutRating     Int?    // 1-5, given before the checklist
  finalRating   Int?    // 1-5, given after
  picked        Boolean @default(false)
  order         Int
  critique      Critique?

  @@unique([sessionId, photoId])
}

model Critique {
  id           String  @id @default(cuid())
  cullEntryId  String? @unique
  cullEntry    CullEntry? @relation(fields: [cullEntryId], references: [id], onDelete: Cascade)
  photoId      String
  photo        Photo   @relation(fields: [photoId], references: [id], onDelete: Cascade)
  // Each axis scored 1-5 with an optional note
  focusScore       Int?
  focusNote        String?
  exposureScore    Int?
  exposureNote     String?
  compositionScore Int?
  compositionNote  String?
  lightScore       Int?
  lightNote        String?
  subjectScore     Int?
  subjectNote      String?
  keeperReason     String?
  createdAt        DateTime @default(now())
}

// ---------- Challenges ----------

model Challenge {
  id          String   @id @default(cuid())
  title       String
  prompt      String
  rationale   String   // what skill this is training
  difficulty  String   @default("medium") // easy | medium | hard
  relatedLessonId String?
  isBuiltIn   Boolean  @default(true)

  runs        ChallengeRun[]
}

model ChallengeRun {
  id          String   @id @default(cuid())
  challengeId String
  challenge   Challenge @relation(fields: [challengeId], references: [id])
  startedAt   DateTime @default(now())
  dueAt       DateTime?
  completedAt DateTime?
  reflection  String?
  entries     ChallengeEntry[]
}

model ChallengeEntry {
  id      String @id @default(cuid())
  runId   String
  run     ChallengeRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  photoId String
  photo   Photo @relation(fields: [photoId], references: [id], onDelete: Cascade)
  isPick  Boolean @default(false)
  note    String?

  @@unique([runId, photoId])
}

// ---------- Recipes ----------

model Recipe {
  id            String   @id @default(cuid())
  name          String   @unique
  baseSimulation String  // e.g. "Classic Chrome"
  settingsJson  String   // full param set — see §8
  sourceUrl     String?
  notes         String?
  bestFor       String?  // JSON array: ["harsh sun", "green foliage"]
  createdAt     DateTime @default(now())
  isFavorite    Boolean  @default(false)

  samples       RecipeSample[]
}

model RecipeSample {
  id        String @id @default(cuid())
  recipeId  String
  recipe    Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  photoId   String
  photo     Photo  @relation(fields: [photoId], references: [id], onDelete: Cascade)
  sceneType String? // "shade", "golden hour", "indoor tungsten"
  verdict   String? // "worked" | "muddy" | "too contrasty"

  @@unique([recipeId, photoId])
}
```

**Schema notes:**

- `Photo` is deliberately the only table other modules point at. Deleting a photo
  cascades everywhere; that is intended.
- `fileHash` (SHA-256 of file bytes) prevents the same JPEG entering twice when
  it's used for both an assignment and a cull session. Re-upload returns the
  existing `Photo`.
- **`frameGroupId` + `isPrimary` are load-bearing.** One press of the shutter can
  produce a RAF, a JPEG, and (later) an edited export. All three share a
  `frameGroupId` and are one photograph. Exactly one is `isPrimary`. **Every
  analyzer query, every histogram, every critique average must filter
  `isPrimary: true`** or frames count two or three times and the statistics are
  silently multiplied. This is the single easiest way to get Module 3 wrong.
- A group is not a separate table on purpose. A shared cuid does the job, and a
  `Frame` table would mean every other module points at `Frame` instead of
  `Photo` — a much larger change for no gain at this size.
- `importId` is nullable. Photos attached directly to an assignment have no
  import; photos from a bulk import may have no attachment. Both are valid.
- Lessons have no prerequisite field. `blockNumber` groups them thematically and
  `lessonNumber` gives a stable display position, but nothing gates anything.
- EXIF is both flattened (for `WHERE apertureF BETWEEN ...`) and kept whole in
  `exifJson` so the analyzer can grow without a migration.
- `focalLength35` matters because the X-T20 is APS-C and the Minolta is full
  frame. Normalize on ingest or every focal-length insight will be wrong.
- Prisma has no native enum on SQLite; the `status`/`mode`/`verdict` string
  fields must be constrained by a TypeScript union and validated with Zod at the
  route boundary.
- JSON-in-TEXT columns are marked in comments. Every read goes through a Zod
  parse in `/lib`, never `JSON.parse` at the call site.

---

## 4. Photo ingestion pipeline

Shared by every module. One function, `ingestPhoto(file, opts)`, in
`/lib/photos/ingest.ts`.

### 4.1 Core sequence

1. Stream to a temp file. Accept `image/jpeg`, `image/png`, `image/tiff`,
   `image/webp`, and RAW by extension: `.raf` `.arw` `.cr2` `.cr3` `.nef` `.dng`
   `.orf` `.rw2`. Size ceiling 200 MB (RAF files from newer bodies are large).
2. SHA-256 the bytes. Existing hash → return that `Photo`, stop.
3. Extract metadata (§4.3) and derivatives (§4.2), branching on file kind.
4. Compute `focalLength35`: EXIF `FocalLengthIn35mmFormat` when present,
   otherwise a crop factor by camera model (X-T20 → 1.5). Normalizing this is
   mandatory — the X-T20 is APS-C and the Minolta is full frame, so raw focal
   length is not comparable across them.
5. Write the original to `data/photos/{yyyy}/{mm}/{id}.{ext}`, byte-untouched.
   **The app never modifies or deletes an original file.**
6. Insert the `Photo` row.
7. Run frame grouping (§4.4).

### 4.2 RAW derivative strategy

A RAW file can't be handed to `sharp`. But a full RAW decode is slow, needs a
native dependency, and — critically — throws away the thing Steven actually cares
about, because a decoded RAF is unrendered and looks nothing like the Fuji
recipe he shot.

**So: prefer the embedded preview.** Every RAF (and ARW, CR3, NEF) contains a
full-size JPEG rendered by the camera with the film simulation and recipe
already applied. That preview is both cheaper to get and more faithful to intent
than anything we'd decode ourselves.

```
1. exiftool -b -JpgFromRaw  → full-size embedded preview
2. if absent, -b -PreviewImage → smaller embedded preview
3. if both absent, decode via dcraw/LibRaw → set previewSource = "decoded",
   isRawDecoded = true, and flag it in the UI as an unrendered decode
```

Record which path was taken in `previewSource`. It matters: a `"decoded"`
preview is not what came out of the camera, and any critique of *color* on a
decoded frame is critiquing our decoder, not his photograph. Surface a small
note on those frames in the cull and critique views.

From whichever JPEG results, generate with `sharp`, honoring orientation:
`thumb` 400px long edge, `preview` 1600px long edge, both WebP q80.

LibRaw/dcraw should be an **optional** dependency. If it isn't installed, step 3
fails gracefully: the photo still imports with metadata intact and gets a
placeholder thumbnail flagged "no preview available." Do not make a native build
step a hard requirement for running the app.

### 4.3 Metadata across formats

`exifr` handles JPEG and DNG well but is unreliable on proprietary RAW
containers. Use `exiftool-vendored` as the extractor for anything in the RAW
extension list, `exifr` for the rest, behind one interface
(`/lib/photos/metadata.ts`) that returns the same normalized shape either way.

Fuji film simulation and recipe parameters live in MakerNotes and must be
explicitly requested from both libraries. On RAF files these are richer than on
JPEGs — highlight/shadow/color/grain settings are often all present, which means
**the Recipe Library can auto-populate a recipe from an imported RAF.** Worth
building: on import, if MakerNote recipe params are present and don't match any
saved `Recipe`, offer "save these settings as a recipe."

### 4.4 Frame grouping (RAW+JPEG, and edited exports)

Shooting RAW+JPEG produces `DSCF1234.RAF` and `DSCF1234.JPG`. These are one
photograph and must not count as two. Later, an edited export of that RAF is
still the same photograph.

Group on: same `capturedAt` (to the second) **and** same base filename stem. On a
match, all files take the same `frameGroupId`.

**Primary election**, in order — the first match wins:

1. `role: "edited"` — a finished version is what he'd judge if one exists
2. `role: "as_shot_jpeg"` — what the camera rendered with his recipe
3. `role: "raw"` — only when nothing else exists for that frame
4. `role: "scan"`

Rules:
- Assignments, cull sessions, and challenges attach to the primary. Other files
  in the group are reachable from it but never independently selectable.
- A file arriving in a later import joins its group retroactively and re-runs the
  election. Attachments follow the group, not the file — so promoting an edited
  export must not orphan an existing cull entry.
- **EXIF always comes from the RAW or as-shot JPEG, never from the edited
  export.** Editors rewrite metadata and some strip it. The analyzer needs
  capture settings, and an export can't be trusted for them.

**On the develop step:** the `role: "edited"` slot exists in the schema from day
one because retrofitting a grouping change onto the spine table later is
genuinely painful, while an unused enum value costs nothing. But **build no UI
for it in phase 1**. If the RAW workflow sticks, the UI is a small addition —
attach an export to an existing frame — and the data model already supports it.
If it doesn't stick, nothing was wasted.

### 4.5 Manual metadata entry

First-class path, not a fallback. Scanned Minolta frames have no EXIF, and the
whole point of shooting film is that the settings were his decisions. Show the
manual form (aperture, shutter, ISO, focal length, camera, film stock) whenever
extraction returns nothing.

For scans, offer a **roll** shortcut: set camera, film stock, and ISO once for a
whole batch, then enter only aperture and shutter per frame. This makes entering
a 36-exposure roll tolerable rather than a chore that guarantees he never does it.

---

## 4b. Bulk import

The analyzer is only as good as its sample. Waiting for photos to trickle in one
assignment at a time means Module 3 says "not enough data" for months. Bulk
import fixes that on day one — point it at an existing shoot and the histograms
have something to work with immediately.

**Entry points:**
- **Drop a folder** in the browser (`webkitdirectory`), including subfolders.
- **Server-side path import** — type a path the container can see
  (`/mnt/photos/2026-cococay`) and it walks the directory. Better for hundreds of
  RAF files, since nothing goes through the browser.

**Flow:**

1. Create an `Import` row with a label. Scan for eligible files, show the count
   and total size, and ask before starting.
2. Process as a background job with a **concurrency cap of 2–4** — RAW preview
   extraction spawns exiftool and `sharp` is CPU-hungry. A 500-file import must
   not lock the app up.
3. Progress UI: processed / total, current filename, running error count. The
   page must be closeable without killing the job — poll job status from the
   server, don't hold it in browser state.
4. **Per-file failures never abort the import.** Log to `Import.errorLog` and
   continue. Show failures at the end with reasons and a retry action.
5. Run frame grouping (§4.4) across the whole import as a final pass, after all
   files land — matching a file against a sibling that hasn't been ingested yet
   is the obvious race, and the reason this is a separate pass.
6. Duplicates within an import (same hash) are skipped silently and reported in
   the summary.

**No watched folders.** A polled directory would drop photos into the analyzer
without any action, which sounds convenient and isn't: it turns a
run-it-when-you-want app into a background service, it makes a stray copy into a
silent data-quality problem, and the deliberate act of choosing what enters is
itself part of the practice. This app is a lab notebook; things get written into
it on purpose.

The convenience is still available without the cost: **remember recent import
paths** and offer "import new files from `/mnt/photos/2026`" as a one-click
action that scans, shows what's new, and waits for confirmation. Same two
seconds of effort, still a decision.

**After import:** land on a review screen — the frame strip for the whole import,
count of RAW / JPEG / paired, any file with a `"decoded"` preview flagged, and
actions to start a cull session on this import, attach frames to an open
assignment, or leave it as analyzer data only.

Bulk-imported photos are **not attached to anything by default**. They count in
Module 3, they're available to pull into cull sessions, and that's it. An import
can be deleted wholesale (cascade to its photos) — useful for backing out a
misfire.

---

## 5. Module 1 — Fundamentals Curriculum

**This is v1. Ship this alone and the app is already useful.**

### 5.1 Shape

Twelve lessons in four thematic blocks. Each lesson is: a short read (3–6 min),
then a shooting assignment, then a submission step where the photos come back
into the app and get self-checked against explicit criteria.

The assignment is the actual teacher. The reading exists to make the assignment
legible.

**Lessons are unordered.** Blocks group them by theme and nothing more — no
prerequisites, no gating, no "complete this first." Pick any lesson, any time.
This is deliberate: the assignments depend on light, weather, and having
somewhere to be, so the right lesson is often the one that matches the
conditions outside rather than the next one in a list. A golden-hour lesson on an
overcast week is a lesson that doesn't get done.

Consequences for the UI:
- The lesson index is a **browsable grid of all twelve**, not a track. Show
  block, title, summary, estimated time, and status on each card.
- Filters that help him pick: by block, by status, by whether the assignment
  needs specific conditions (sun, a moving subject, a location).
- The home screen suggests *a* next lesson, weighted toward untouched ones and
  toward skills with weak critique scores in Module 3, but it's a suggestion with
  a visible "something else" beside it — never a queue.
- Lessons may reference each other in prose ("stops are covered in The Exposure
  Triangle") as links. Links, not locks.

### 5.2 Lesson flow (state machine)

```
not_started → reading → assigned → submitted → complete
                ↑                       |
                └───────────────────────┘
                    (redo assignment)
```

- `reading` — opened the lesson.
- `assigned` — pressed "Take the assignment." Lesson gets a card on the home
  screen showing the brief. This is the state the user is in while out shooting,
  possibly for days.
- `submitted` — photos uploaded and mapped to assignment roles.
- `complete` — self-check criteria filled in and a one-line reflection written.
  The reflection is required. It's the highest-value field in the app.

Multiple lessons can sit in `assigned` at once — he might have three briefs open
waiting on the right conditions. The home screen shows all open assignments, not
just one.

### 5.3 The twelve lessons

Content is authored as MDX in `/content/lessons/{slug}.mdx` with frontmatter
matching the `Lesson` model. Below is the full curriculum spec: for each lesson,
what the reading covers and what the assignment demands.

---

**Block 1 — Exposure. The camera as a machine you're driving, not riding.**

**1.1 `exposure-triangle` — The Exposure Triangle**
*Reading:* Aperture, shutter, ISO as three taps filling the same bucket. Stops as
the universal unit — one stop is one doubling, regardless of which dial you turn.
Equivalent exposures. Why the camera's "correct" exposure is an opinion, not a
fact.
*Assignment:* One static scene, three exposures that are all correctly exposed
but reached by different routes (e.g. f/2.8 · 1/500 · ISO 200, then f/5.6 ·
1/125 · ISO 200, then f/8 · 1/60 · ISO 200). Upload all three tagged by role.
*Criteria:* All three within ½ stop of each other in brightness. Depth of field
visibly different between shot 1 and shot 3. You can state what changed and why.

**1.2 `aperture-dof` — Aperture and Depth of Field**
*Reading:* f-number as a ratio, not a size — why f/2.8 means the same exposure on
any lens. Depth of field as a function of aperture, distance, and focal length.
The APS-C consideration on the X-T20. Where lenses are sharpest (usually 2–3
stops from wide open) and why "always shoot wide open" is a beginner tell.
*Assignment:* One subject, fixed distance, fixed framing. Shoot at every full
stop your lens allows from wide open to f/16. Foreground and background must both
contain detail so the falloff is visible.
*Criteria:* Framing identical across the set. Background detail readable at f/16
and not at wide open. You can name which frame is sharpest on the subject — and
notice it probably isn't the widest.

**1.3 `shutter-motion` — Shutter Speed and Motion**
*Reading:* Shutter speed as a decision about time, not brightness. Freezing vs.
describing motion. The reciprocal rule and why it's a floor, not a target. Panning.
Handheld limits and how much IBIS/OIS you actually have.
*Assignment:* One moving subject, two treatments — frozen (fast enough that
motion is stopped cold) and deliberately blurred (slow enough that the movement
draws). Then one pan attempt where the subject is sharp and the background streaks.
*Criteria:* The frozen frame has no motion blur at 100%. The blurred frame is
blurred on purpose and the static parts of the frame are sharp. The pan is a
genuine attempt even if it fails — log the shutter speed you used.

**1.4 `metering-compensation` — Metering and Exposure Compensation**
*Reading:* What the meter actually does (drives the scene toward middle grey) and
the two situations that breaks: snow/sky-heavy scenes come out dark, dark scenes
come out grey. Metering modes. Exposure compensation as the fix. Reading a
histogram. "Expose for the highlights" and why it matters more on Fuji JPEGs than
on RAW — because you cannot recover a clipped JPEG highlight.
*Assignment:* A high-contrast scene — bright sky with something in shadow. Shoot
it at meter-recommended, then at −1, then wherever your judgment says. Then find
a mostly-white or mostly-dark scene and shoot it both at meter and corrected.
*Criteria:* You can point to the clipped highlights in the meter-recommended
frame. The corrected frame holds highlight detail. You wrote down the
compensation value you'd start from next time in that situation.

---

**Block 2 — Light. The thing that's actually being photographed.**

**2.1 `light-direction` — Direction of Light**
*Reading:* Front, side, and back light and what each does to form. Why front light
flattens and side light sculpts. Backlight, rim light, and metering for it.
Learning to identify the light direction in a scene before raising the camera.
*Assignment:* One subject, three positions — front-lit, side-lit, back-lit — in
the same session with the same light source. Move yourself, not the subject.
*Criteria:* The three frames are recognizably the same subject and light. Texture
is visibly strongest in the side-lit frame. You made a metering decision on the
backlit frame and can say what it was.

**2.2 `time-of-day` — Golden Hour and Harsh Light**
*Reading:* Why low sun is flattering — longer path, warmer, softer, directional.
Why midday is hard. What midday is actually good for (hard graphic shadows, deep
color, architecture). Open shade and its blue cast. Blue hour.
*Assignment:* One location, two visits — golden hour and midday. Similar
compositions. Then one frame that only works *because* it's midday.
*Criteria:* Both sessions from the same spot. You can articulate the difference
beyond "the golden one is nicer." The midday frame uses hard light as a subject
rather than fighting it.

**2.3 `shadows` — Reading and Using Shadows**
*Reading:* Shadow as compositional element, not absence. Shape, edge quality
(hard vs. soft and what causes it), and using shadow to hide clutter. Contrast
ratio as a thing you can see. Chiaroscuro in one paragraph, without the art-history
detour.
*Assignment:* Three frames where the shadow *is* the subject or the primary
structure of the composition. At least one must use shadow to conceal something
that would otherwise wreck the frame.
*Criteria:* Removing the shadow from each frame would destroy the photo. You can
identify hard vs. soft edges and say what light source produced each.

---

**Block 3 — Composition. Where to stand and what to leave out.**

**3.1 `thirds-framing` — Placement and Framing**
*Reading:* Rule of thirds as a starting heuristic and its failure modes. Why
centered is often correct. Balance and visual weight. Frames within frames.
Edges — the thing beginners never check. Horizon placement as a decision about
what the photo is about.
*Assignment:* Five frames, each with a deliberate placement decision you can
defend. At least one centered on purpose, at least one with the subject hard
against an edge.
*Criteria:* For each frame you wrote one sentence on why the subject sits where
it sits. No accidental edge intrusions — check the borders on every frame.

**3.2 `lines-layers` — Leading Lines and Layers**
*Reading:* Lines as attention routing. Diagonals vs. horizontals. Foreground /
midground / background as depth construction on a flat surface. How focal length
changes layer compression — wide separates, tele stacks. Using near-far
relationships.
*Assignment:* Three frames with genuine leading lines, plus three with three
distinct depth layers. Shoot at least one of the layered frames wide and one
long, same scene, to see compression.
*Criteria:* The lines actually lead somewhere — to the subject, not off the edge.
All three layers are legible in the layered frames. You can describe how the wide
and long versions differ beyond magnification.

**3.3 `negative-space` — Negative Space and Subtraction**
*Reading:* The strongest editing tool is standing somewhere else. Simplification
as the fastest quality upgrade available to a beginner. Negative space as active,
not empty. Isolating a subject via aperture, background choice, or angle.
*Assignment:* Find a visually busy scene. Make one frame that includes the chaos
and one that extracts a single clean subject from it. Then three more frames
elsewhere where at least 60% of the frame is deliberately empty.
*Criteria:* The extracted frame is genuinely simple — you can name every element
in it in one breath. The negative space frames feel intentional rather than
under-filled.

---

**Block 4 — Synthesis. Doing it all at once, in real time.**

**4.1 `seeing-in-the-field` — Seeing Light and Composition Together**
*Reading:* The working sequence experienced photographers run unconsciously:
notice light → find subject → choose position → set exposure → check edges →
shoot → adjust. Working a scene instead of taking one frame and leaving.
Pre-visualization. When to keep shooting and when the scene is done.
*Assignment:* One outing, one location, minimum 45 minutes. Work a single scene —
at least 15 frames of essentially the same subject, changing position, focal
length, and timing. Then pick your best three.
*Criteria:* The 15 frames show real variation, not 15 near-duplicates. Your top
three are not the first three you shot. You can say what changed between your
first frame and your best one.

**4.2 `self-critique` — Building a Self-Critique Framework**
*Reading:* Why gut reaction and considered judgment differ, and why you should
record both. The five-axis framework this app uses — focus, exposure,
composition, light, subject — and what each actually asks. Separating "I like
this because I remember taking it" from "this is a good photograph." How to write
a critique that's useful to future-you.
*Assignment:* Take 20+ frames from any previous lesson's assignments. Rate each
on gut alone. Then run the five-axis framework on each. Note every photo where
the two disagree.
*Criteria:* You completed both passes without editing the gut ratings after the
fact. You identified at least two photos where gut and framework diverged and
wrote why. **This assignment hands off directly into Module 2.**

---

### 5.4 MDX authoring format

```mdx
---
id: aperture-dof
blockNumber: 1
blockTitle: Exposure
lessonNumber: 2
title: Aperture and Depth of Field
summary: What the f-number really means and why wide open isn't sharpest.
estMinutes: 5
skillTags: ["exposure", "depth-of-field"]
conditions: ["any"]   # or ["sun"], ["moving-subject"], ["golden-hour"] — drives filtering
assignment:
  title: The aperture ladder
  brief: |
    One subject, fixed distance, fixed framing. Shoot at every full stop
    your lens allows, from wide open to f/16.
  minPhotos: 4
  constraints:
    requireVaryingAperture: true
  successCriteria:
    - Framing is identical across the whole set
    - Background detail is readable at f/16 and not at wide open
    - You can name the sharpest frame on the subject
---

Content here. Custom components available:

<Stop from="f/2.8" to="f/4" />        {/* renders a stop-difference callout */}
<Compare a="wide-open" b="stopped-down" />  {/* side-by-side slots */}
<FieldNote>Practical tip from the field.</FieldNote>
<CheckYourself>Question with a disclosure-revealed answer.</CheckYourself>
```

A build-time script (`scripts/index-lessons.ts`) parses frontmatter and upserts
`Lesson` and `Assignment` rows. Run it on `postinstall` and via a dev watcher.
Content is the source of truth; the DB is an index.

---

## 6. Module 2 — Culling Trainer

**Problem:** you can't improve if you can't tell which of your own photos are
good. Gut feeling is contaminated by memory of the moment.

**Flow:**

1. Create a session, upload or select 10–50 photos.
2. **Blind gut pass.** One photo at a time, full-bleed, no EXIF, no filename, no
   navigation backward. Rate 1–5. This is deliberately fast — the UI should
   discourage deliberation.
3. **Framework pass.** Same photos, now with the five-axis critique form: focus,
   exposure, composition, light, subject. Each 1–5 with an optional note. EXIF
   visible in this pass.
4. **Divergence report.** The payoff screen. Photos sorted by `|gut − framework|`.
   "You rated this 5 on instinct and 2.4 on the framework — you scored composition
   1. What did you like about it?" That gap is where learning lives.
5. **Comparative mode** (secondary): two photos side by side, pick one, run a
   simple Elo. Good for near-duplicates from the same burst, where absolute
   ratings are useless.

**Rules:** gut ratings are immutable once the framework pass starts — lock them
in the DB layer, not just the UI. Photos in a blind pass must not display
filename, capture time, or any EXIF.

---

## 7. Module 3 — EXIF Pattern Analyzer

**Problem:** the answers to "what am I doing wrong" are sitting in files he
already has.

Reads across every `Photo` in the system and cross-references settings against
critique scores where they exist. This is the module that gets better the more
the other modules are used.

**Views:**

- **Distributions.** Histograms of aperture, shutter, ISO, focal length (35mm-eq).
  Answers "am I actually using this zoom range" and "do I ever leave f/2.8."
- **Settings vs. quality.** Where critiques exist, plot mean score against
  aperture, focal length, ISO. Small samples must be labeled as such.
- **Time of day.** Capture hour vs. mean light score. Likely finding: he shoots
  at bad times.
- **Film simulation usage.** Which Fuji recipes get used and how they score.
- **Progress over time.** Mean critique scores by month, per axis.

**Insight engine.** A rules file, `/lib/analysis/insights.ts`, of pure functions
`(photos, critiques) => Insight | null`. Each insight declares a minimum sample
size and refuses to fire below it. Example rules:

- Focal length clustering: >70% of frames within one focal range → suggest
  deliberately shooting outside it.
- Aperture monoculture: >60% within one stop of wide open → surface lesson 1.2.
- Shutter risk: frames slower than 1/focal-length-35 with below-average focus
  scores → flag handholding limit.
- Highlight risk: recurring positive exposure compensation with below-average
  exposure scores.
- Time-of-day: mean light score materially higher in the golden-hour windows.

**Time window is the first-class control, not a filter buried in settings.**
Import as much history as he wants — more data is better — but **default every
view to a rolling 12 months**, with explicit toggles for all-time and for a
custom range. A lifetime average is close to useless if the sample is weighted
toward 2019: it describes a photographer who no longer exists and, worse, it
drowns out recent change. If he shot 3,000 frames five years ago and 200 this
year, the all-time histogram is a portrait of his old habits.

Two consequences that follow from that:

- **Trend views outrank aggregate views.** The default landing view for any
  metric is that metric over time, not its mean. "Your median aperture has moved
  from f/2.8 to f/5.6 over eighteen months" is a real finding; "your median
  aperture is f/4" is trivia.
- **Every insight states its window and sample.** "Across 180 photos in the last
  12 months" is part of the insight text, not a footnote. An insight that can't
  name its window shouldn't render.

**Every query in this module filters `isPrimary: true`.** Without it, RAW+JPEG
frames double-count and every distribution is quietly wrong. Put the filter in a
shared query helper (`analyzablePhotos()`) rather than repeating it, so it can't
be forgotten in one place.

Two views this module gains from RAW support: capture format over time (is he
actually shooting RAW now, or still JPEG-only), and recipe-vs-RAW comparison
where MakerNote recipe params came off RAF files.

**Hard rule: never state a pattern from fewer than 15 photos.** Show
"not enough data yet — 6 of 15" instead. A confidently wrong insight from a
sample of four will teach the wrong lesson, and this whole app exists to teach
lessons.

---

## 8. Module 4 — Shooting Challenges · Module 5 — Recipe Library

### Challenges

A rotating prompt system for practice after the curriculum is done. Ships with
~40 built-in prompts, each tagged to a skill and optionally to a lesson.

Sample set: shoot only at f/8 for a day · one focal length, no zooming · shoot
directly into the sun · 20 frames in one square metre · photograph a stranger's
hands (with permission) · shoot at 1/15s handheld and make one sharp · find a
photograph in the ugliest place you can reach · shoot only shadows · fill the
frame · one roll's worth — 36 frames, then stop.

A run has a prompt, an optional due date, entries, picks, and a required written
reflection on completion. Home screen offers "start a challenge" with a weighted
random pick that favors untried prompts and skills with weak critique scores.

### Recipe Library

Catalog for Fuji JPEG recipes — Steven shoots recipes, not RAW, so the recipe is
his darkroom and belongs in the lab notebook.

`settingsJson` schema (Zod-validated):

```ts
{
  filmSimulation: string,       // "Classic Chrome"
  dynamicRange: "DR100"|"DR200"|"DR400"|"DR-Auto",
  highlight: number,            // -2 .. +4
  shadow: number,               // -2 .. +4
  color: number,                // -4 .. +4
  noiseReduction: number,
  sharpness: number,
  grainEffect: { strength: "off"|"weak"|"strong", size?: "small"|"large" },
  colorChromeEffect?: "off"|"weak"|"strong",
  colorChromeFxBlue?: "off"|"weak"|"strong",
  whiteBalance: { mode: string, shiftR: number, shiftB: number },
  iso?: string,
  exposureComp?: string
}
```

Features: side-by-side param diff between two recipes; sample photos attached per
recipe with scene type and a verdict; "best for" tags; a
"which recipe for these conditions" lookup filtered by scene type and verdict.

Seed with Summer Chrome and Steven's tweaked highlight/shadow variant — mark the
variant as derived from the base so the diff view has something to show on day one.

---

## 9. Interface

### Direction

The reference object is a **contact sheet with grease-pencil marks on it** — the
thing photographers actually used to decide which frames were worth printing.
That gives us frame numbering (justified: film frames genuinely are numbered),
tight grids, and a single marking color used only for judgment.

Not a dark "pro" UI. Photo paper is neutral-to-cool white, not warm cream, and
that's the base.

### Tokens

```
--paper       #F2F4F3   base
--paper-edge  #E4E8E7   dividers, card edges
--ink         #14171A   primary text
--ink-soft    #5A6169   secondary text, captions
--mark        #E03C31   grease-pencil red — selections, picks, active state ONLY
--green       #00713C   Fuji-box green — completion, correct, progress
```

`--mark` is the discipline test: it means "chosen or in progress" and nothing
else. If it appears on a decorative element, it has been misused.

### Type

- Display / UI: **Archivo** — engineered, condensed widths available, reads like
  the labeling on a camera body.
- Reading: **Source Serif 4** — lessons are prose and prose wants a serif.
- Data: **JetBrains Mono** — every f-stop, shutter speed, and ISO renders mono.
  Settings are readouts, and readouts are monospaced.

### Signature element

The **frame strip**: a horizontal filmstrip of thumbnails with mono frame numbers
under each, used as the primary photo-set component everywhere — assignment
submissions, cull sessions, challenge entries, recipe samples. Selected frames
get a `--mark` crop-mark bracket at the corners, not a fill or glow. One
component, used consistently, and the app has an identity.

### Layout

- Home: current lesson card, any open assignment, any active challenge, one
  insight from the analyzer. Nothing else. If there is nothing in progress, the
  screen is an invitation to start the next lesson.
- Lesson: single measured column, ~68ch, serif. Assignment brief pinned to the
  bottom on scroll.
- Cull blind pass: full-bleed photo, rating row, nothing else on screen.
- Insights: cards, one chart each, plain-language headline above the chart.

### Quality floor

Responsive to mobile — assignments get reviewed on a phone in the field. Visible
keyboard focus. `prefers-reduced-motion` respected. Keyboard shortcuts in the
cull flow (1–5 to rate, space to advance) because it is a repetitive task.

### Copy

Active voice, sentence case, plain verbs. Buttons name what happens: "Take the
assignment," "Submit frames," "Start the blind pass." Empty states point at an
action. Insights that lack data say what's missing and how much is needed, never
apologize and never guess.

---

## 10. Build order

**Phase 1 — Foundation**
Next.js scaffold, Prisma schema, migrations, ingestion pipeline (`sharp` +
`exifr`/`exiftool` + hashing), RAW preview extraction with decode fallback,
frame grouping and primary election, manual entry and roll shortcut, FrameStrip
and PhotoUpload components, design tokens in Tailwind config.
*Done when:* a JPEG, a RAF, and a RAF+JPG pair can each be dropped in and come
back with correct metadata, correct orientation, a faithful thumbnail, and — for
the pair — exactly one primary photo. Plus: a scanned film frame with no EXIF can
be entered by hand.

**Phase 1b — Bulk import**
Folder and server-path import, background job with concurrency cap, progress
polling, per-file error handling, post-import grouping pass, remembered import
paths, review screen.
*Done when:* 500 mixed RAF+JPG files import without locking the UI, pairs resolve
correctly, and failures are listed with reasons rather than aborting the run.

**Phase 2 — Curriculum (v1 ship)**
MDX pipeline and indexer, all twelve lessons authored, browsable lesson grid with
filters, lesson reader, assignment brief and submission flow, self-check criteria,
progress tracking, home screen with multiple open assignments.
*Done when:* Steven can pick any lesson, take its assignment, and complete a
submission with photos attached and a written reflection.

**Phase 3 — Culling Trainer**
Session creation, blind pass with immutable ratings, framework pass, divergence
report, comparative mode.
*Done when:* lesson 4.2's assignment can be completed inside the app.

**Phase 4 — Insights**
Aggregation queries, Recharts views, insight rules engine with sample-size gates,
home-screen insight card.

**Phase 5 — Challenges and Recipes**
Prompt library and seeds, run flow, reflections. Recipe CRUD, diff view, samples,
conditions lookup.

**Phase 6 — Polish**
Backup/export (zip of DB + photos, and a JSON export of all critiques and
reflections), keyboard shortcuts throughout, Docker packaging, seed data.

Phases 1 and 2 are the real project. Everything after is additive, and each phase
should be usable the day it lands.

---

## 11. Decisions already made — do not relitigate

- Single user. No auth. No `User` table.
- SQLite. Not Postgres. It is one person's photo notebook.
- RAW and JPEG both supported. RAW previews come from the camera's embedded JPEG
  wherever possible (§4.2) — full decode is a fallback, not the default path, and
  LibRaw stays an optional dependency.
- Files from one shutter press share a `frameGroupId` and are one photograph.
  `isPrimary` filtering is mandatory in every analyzer query.
- The `"edited"` role exists in the schema from day one; its UI does not. Do not
  build the develop-and-reimport flow until the RAW workflow proves it's needed.
- Imports are manual. No watched folders, no polling, no background service.
- The analyzer defaults to a rolling 12-month window and leads with trends over
  aggregates. Do not make lifetime averages the headline number.
- The app never edits or deletes an original file. It is a notebook, not an
  editor.
- Lessons are unordered. No prerequisites, no gating. Do not add a track.
- Lessons live in MDX in the repo, not in the database.
- No AI dependency in the core loop. If AI-assisted critique is added later it is
  an optional second opinion shown *after* the user's own critique is recorded,
  never before, and never in the blind pass.
- The reflection field is required to complete a lesson. It is the point.

## 12. Resolved, and what's left

The three questions from the previous revision are now decided and folded into
the spec above: the develop step ships as schema-only (§4.4), imports stay manual
with remembered paths (§4b), and the analyzer defaults to a 12-month window with
trends over aggregates (§7).

What genuinely can't be decided from here, because it depends on how the app
feels once he's using it:

1. **Is 15 photos the right floor for an insight?** It's a defensible guess, not
   a derived number. If insights feel noisy at 15, raise it; if the analyzer
   stays silent for months, lower it. Make it a constant in one place
   (`/lib/analysis/thresholds.ts`) so it's a one-line change.
2. **Does the required reflection field become friction?** It's the highest-value
   data in the app and also the thing most likely to make him abandon a lesson at
   95% complete. Watch for lessons stuck in `submitted`. If that happens, the fix
   is a better prompt, not dropping the requirement.
3. **Does the curriculum need more than twelve lessons?** Twelve covers
   fundamentals. Whether the next thing is more lessons, or just the challenge
   library doing the work, is a question for after he's finished them.
</content>
</invoke>
