// Side-by-side conceptual slots — e.g. <Compare a="wide-open" b="stopped-down" />.
// Lesson content has no real photos to embed (it's authored prose, not
// user data), so this frames the two conditions being contrasted rather
// than showing actual images.

function formatLabel(value: string): string {
  return value
    .split("-")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

export function Compare({ a, b }: { a: string; b: string }) {
  return (
    <div className="my-4 grid grid-cols-2 gap-3 not-prose">
      {[a, b].map((label) => (
        <div key={label} className="border border-paper-edge bg-paper px-4 py-6 text-center">
          <span className="font-sans text-sm text-ink-soft">{formatLabel(label)}</span>
        </div>
      ))}
    </div>
  );
}
