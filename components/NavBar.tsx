"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/learn", label: "Learn" },
  { href: "/import", label: "Import" },
];

/** Persistent top nav — every page reachable from every other page, no dead ends. */
export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-paper-edge bg-paper">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="font-sans text-sm font-semibold tracking-tight text-ink">
          Latitude
        </Link>
        <nav className="flex gap-5 font-sans text-sm">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link key={link.href} href={link.href} className={active ? "text-mark" : "text-ink-soft hover:text-ink"}>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
