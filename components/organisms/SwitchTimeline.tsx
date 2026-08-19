"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

type Item = { t: string; d: string; hl?: string };

function withHl(text: string, hl?: string) {
  if (!hl) return text;
  const i = text.indexOf(hl);
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <span className="text-[#a6e773]">{hl}</span>
      {text.slice(i + hl.length)}
    </>
  );
}

/**
 * SwitchTimeline — sticky scroll-scrub. The heading + numbered points stay in
 * view (native position:sticky, no scroll-jacking) while the reader scrolls
 * through a tall track; the active point advances with scroll progress and a
 * green line fills down to it.
 */
export default function SwitchTimeline({ items, heading, sub }: { items: Item[]; heading: ReactNode; sub: string }) {
  const [active, setActive] = useState(0);
  const [fill, setFill] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const setHeight = () => {
      el.style.height = `${(window.innerHeight || 800) * items.length * 0.52}px`;
    };
    const compute = () => {
      const vh = window.innerHeight || 800;
      const range = el.offsetHeight - vh;
      const p = range > 0 ? Math.min(1, Math.max(0, -el.getBoundingClientRect().top / range)) : 0;
      setActive(Math.min(items.length - 1, Math.max(0, Math.floor(p * items.length))));
    };
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        compute();
      });
    };
    const onResize = () => {
      setHeight();
      compute();
    };
    setHeight();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    compute();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [items.length]);

  // fill the rail down to the active marker
  useEffect(() => {
    const el = itemRefs.current[active];
    if (el) setFill(el.offsetTop + 16);
  }, [active]);

  const select = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const vh = window.innerHeight || 800;
    const range = el.offsetHeight - vh;
    const trackTop = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: trackTop + ((i + 0.5) / items.length) * range, behavior: "smooth" });
  };

  return (
    <div ref={trackRef} className="relative">
      <div className="sticky top-24 grid gap-10 lg:grid-cols-[0.82fr_1.1fr] lg:gap-16">
        <div className="lg:pt-2">
          <h2 className="h2 max-w-[440px]">{heading}</h2>
          <p className="lede mt-4 max-w-[420px]">{sub}</p>
        </div>

        <ol ref={listRef} className="relative max-w-2xl">
          {/* base rail */}
          <span className="pointer-events-none absolute bottom-5 left-4 top-2 w-px -translate-x-1/2 bg-white/10" />
          {/* progress fill */}
          <span
            className="pointer-events-none absolute left-4 top-2 w-px -translate-x-1/2 bg-[#a6e773] transition-[height] duration-500 ease-out"
            style={{ height: fill }}
          />
          {items.map((it, i) => {
            const current = i === active;
            return (
              <li
                key={it.t}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                className="relative grid grid-cols-[auto_1fr] gap-x-6 pb-9 last:pb-0"
              >
                <button
                  onClick={() => select(i)}
                  aria-label={it.t}
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-[13px] font-medium tabular-nums transition-all duration-300 ${current ? "border-[#a6e773] bg-[#a6e773] text-[#051B35]" : "border-white/10 bg-white/[0.04] text-[#9DA2B3]"
                    }`}
                >
                  {i + 1}
                </button>
                <div className={`pt-0.5 transition-opacity duration-300 ${current ? "opacity-100" : "opacity-35"}`}>
                  <h3 className="text-[clamp(20px,2.2vw,30px)] font-semibold leading-tight tracking-[-0.02em] text-white">{current ? withHl(it.t, it.hl) : it.t}</h3>
                  <p className="mt-2 max-w-[520px] text-[15px] leading-relaxed text-[#9DA2B3]">{it.d}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
