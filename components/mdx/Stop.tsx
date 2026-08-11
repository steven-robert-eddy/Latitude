// Renders a stop-difference callout — e.g. <Stop from="f/2.8" to="f/4" />.
// Settings are readouts, so the numbers render mono (§9); the computed
// delta is the pedagogical point, not the raw numbers themselves.

function parseAperture(value: string): number | null {
  const match = value.trim().match(/^f\/(\d+(?:\.\d+)?)$/i);
  return match ? parseFloat(match[1]) : null;
}

// Rounds to the nearest third-stop and formats as e.g. "+1⅔ stops" — works
// for any magnitude, not just a fixed table of small examples.
function formatStops(stops: number): string {
  const sign = stops >= 0 ? "+" : "−";
  const thirds = Math.round(Math.abs(stops) * 3);
  const whole = Math.floor(thirds / 3);
  const remainder = thirds % 3;
  const fraction = remainder === 1 ? "⅓" : remainder === 2 ? "⅔" : "";
  const label = whole === 0 ? fraction || "0" : `${whole}${fraction}`;
  const isOneStop = thirds === 3;
  return `${sign}${label} stop${isOneStop ? "" : "s"}`;
}

export function Stop({ from, to }: { from: string; to: string }) {
  const fFrom = parseAperture(from);
  const fTo = parseAperture(to);
  const stops = fFrom != null && fTo != null ? 2 * Math.log2(fTo / fFrom) : null;

  return (
    <span className="inline-flex items-center gap-2 border border-paper-edge px-2 py-1 font-mono text-sm text-ink">
      <span>{from}</span>
      <span className="text-ink-soft" aria-hidden="true">
        →
      </span>
      <span>{to}</span>
      {stops != null && <span className="text-ink-soft">({formatStops(stops)})</span>}
    </span>
  );
}
