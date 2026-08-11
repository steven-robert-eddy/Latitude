import type { MDXComponents } from "mdx/types";
import { Stop } from "./Stop";
import { Compare } from "./Compare";
import { FieldNote } from "./FieldNote";
import { CheckYourself } from "./CheckYourself";

// Reading is prose and prose wants a serif (§9) — these overrides keep
// lesson body copy on Source Serif 4 without every .mdx file repeating it.
export const mdxComponents: MDXComponents = {
  Stop,
  Compare,
  FieldNote,
  CheckYourself,
  h2: (props) => <h2 className="mt-8 mb-3 font-sans text-lg font-semibold text-ink" {...props} />,
  h3: (props) => <h3 className="mt-6 mb-2 font-sans text-base font-semibold text-ink" {...props} />,
  p: (props) => <p className="my-4 font-serif text-ink leading-relaxed" {...props} />,
  ul: (props) => <ul className="my-4 list-disc pl-6 font-serif text-ink" {...props} />,
  ol: (props) => <ol className="my-4 list-decimal pl-6 font-serif text-ink" {...props} />,
  li: (props) => <li className="my-1" {...props} />,
  strong: (props) => <strong className="font-semibold text-ink" {...props} />,
  a: (props) => <a className="text-mark underline underline-offset-2" {...props} />,
  blockquote: (props) => (
    <blockquote className="my-4 border-l-2 border-paper-edge pl-4 font-serif text-ink-soft italic" {...props} />
  ),
  code: (props) => <code className="font-mono text-sm text-ink" {...props} />,
};
