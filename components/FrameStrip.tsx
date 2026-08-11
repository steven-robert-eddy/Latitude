"use client";

// The signature element (DESIGN.md §9): a horizontal filmstrip of thumbnails
// with mono frame numbers, used everywhere a photo set appears — assignment
// submissions, cull sessions, challenge entries, recipe samples. Selected
// frames get a --mark crop-mark bracket at the corners, never a fill or glow.

export type FrameStripPhoto = {
  id: string;
  thumbUrl: string;
  /** Display number; falls back to position in the strip (1-indexed). */
  frameNumber?: number;
  /** Small caption under the frame number, e.g. a role badge. */
  label?: string;
};

type FrameStripProps = {
  photos: FrameStripPhoto[];
  selectedIds?: ReadonlySet<string>;
  onSelect?: (id: string) => void;
  emptyMessage?: string;
  className?: string;
};

export function FrameStrip({ photos, selectedIds, onSelect, emptyMessage, className }: FrameStripProps) {
  if (photos.length === 0) {
    return <p className="text-sm text-ink-soft font-sans">{emptyMessage ?? "No frames yet."}</p>;
  }

  return (
    <div className={`flex gap-3 overflow-x-auto py-2 ${className ?? ""}`}>
      {photos.map((photo, index) => {
        const selected = selectedIds?.has(photo.id) ?? false;
        return (
          <Frame
            key={photo.id}
            photo={photo}
            frameNumber={photo.frameNumber ?? index + 1}
            selected={selected}
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );
}

function Frame({
  photo,
  frameNumber,
  selected,
  onSelect,
}: {
  photo: FrameStripPhoto;
  frameNumber: number;
  selected: boolean;
  onSelect?: (id: string) => void;
}) {
  const interactive = Boolean(onSelect);

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={() => onSelect?.(photo.id)}
      className={`group relative flex-none w-28 text-left ${interactive ? "cursor-pointer" : "cursor-default"}`}
      aria-pressed={interactive ? selected : undefined}
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-paper-edge">
        {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails are served from our own on-disk derivatives, not next/image's remote pipeline */}
        <img src={photo.thumbUrl} alt={photo.label ?? `Frame ${frameNumber}`} className="h-full w-full object-cover" />
        {selected && <CropMarks />}
      </div>
      <div className="mt-1 flex items-baseline justify-between font-mono text-xs text-ink-soft">
        <span>{String(frameNumber).padStart(2, "0")}</span>
        {photo.label && <span className="truncate pl-2">{photo.label}</span>}
      </div>
    </button>
  );
}

function CropMarks() {
  const corner = "absolute h-3 w-3 border-mark";
  return (
    <div className="pointer-events-none absolute inset-0">
      <span className={`${corner} left-0 top-0 border-l-2 border-t-2`} />
      <span className={`${corner} right-0 top-0 border-r-2 border-t-2`} />
      <span className={`${corner} left-0 bottom-0 border-l-2 border-b-2`} />
      <span className={`${corner} right-0 bottom-0 border-r-2 border-b-2`} />
    </div>
  );
}
