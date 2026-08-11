import type { ReactNode } from "react";

// A practical tip from the field — a callout distinct from the main prose.
export function FieldNote({ children }: { children: ReactNode }) {
  return (
    <aside className="not-prose my-6 border-l-2 border-mark bg-paper py-2 pl-4">
      <p className="font-sans text-xs font-semibold tracking-wide text-ink-soft uppercase">Field note</p>
      <div className="mt-1 font-serif text-ink [&>p]:m-0">{children}</div>
    </aside>
  );
}
