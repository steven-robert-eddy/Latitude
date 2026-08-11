import type { ReactNode } from "react";

// A question with a disclosure-revealed answer — native <details> gives
// this keyboard/screen-reader support for free.
export function CheckYourself({ question, children }: { question: string; children: ReactNode }) {
  return (
    <details className="not-prose group my-6 border border-paper-edge px-4 py-3">
      <summary className="cursor-pointer list-none font-sans text-sm font-semibold text-ink marker:content-none">
        <span className="mr-2 text-mark">?</span>
        {question}
        <span className="ml-2 text-ink-soft group-open:hidden">— check yourself</span>
      </summary>
      <div className="mt-3 border-t border-paper-edge pt-3 font-serif text-ink [&>p]:m-0">{children}</div>
    </details>
  );
}
