"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type DocLink = { slug: string; title: string; href: string };

/* "Other documents" menu under the title. Opens from its own corner, closes on Escape / outside press / choosing. */
export default function LegalSwitch({ docs, current }: { docs: DocLink[]; current: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const down = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", down);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", down); };
  }, [open]);
  return (
    <div className="lg-sw" ref={ref} data-open={open ? "1" : undefined}>
      <button type="button" className="lg-sw-b" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Other documents
        <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden><path d="M213.66 101.66l-80 80a8 8 0 01-11.32 0l-80-80a8 8 0 0111.32-11.32L128 164.69l74.34-74.35a8 8 0 0111.32 11.32z" /></svg>
      </button>
      <ul className="lg-sw-m" aria-label="Legal documents">
        {docs.map((d) => (
          <li key={d.slug}>
            <Link href={d.href} aria-current={d.slug === current ? "page" : undefined} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>
              {d.title}
              {d.slug === current && <span>Reading</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
