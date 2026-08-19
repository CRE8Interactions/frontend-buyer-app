"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Testimonials — rotating partner quotes. All quotes render stacked in one
 * grid cell (tallest sets the height, so no layout jump) and crossfade.
 * Auto-advances every 6.5s, pauses on hover, dots jump to a quote, and
 * auto-rotation is disabled under prefers-reduced-motion.
 */

const HL = ({ children }: { children: ReactNode }) => <span className="font-semibold text-white">{children}</span>;

const QUOTES = [
  {
    name: "Steven Tomlin",
    img: "/people/steven-tomlin.jpg",
    role: "Business Development & Ticket Sales · Niagara IceDogs",
    q: (
      <>
        &ldquo;What used to take us 10&ndash;15 minutes per request now <HL>takes seconds</HL>. It&rsquo;s saved our
        staff countless hours.&rdquo;
      </>
    ),
  },
  {
    name: "Eric Grundfast",
    img: "/people/eric-grundfast.jpg",
    role: "President · Des Moines Buccaneers",
    q: (
      <>
        &ldquo;Each person can choose their own seat and pay individually. It&rsquo;s{" "}
        <HL>removed a major friction point</HL>{" "}for fans and staff.&rdquo;
      </>
    ),
  },
  {
    name: "Trever Wilson",
    img: "/people/trever-wilson.jpg",
    role: "General Manager · Ogden Raptors",
    q: (
      <>
        &ldquo;What really stood out was the fan data — it&rsquo;s been key to{" "}
        <HL>closing larger sponsorships</HL>.&rdquo;
      </>
    ),
  },
  {
    name: "Joe Fields",
    img: "/people/joe-fields.jpg",
    role: "Director of Athletics · New Mexico State University",
    q: (
      <>
        &ldquo;A <HL>transformational partnership</HL>{" "}that will set our athletics department on an upward
        trajectory like never before.&rdquo;
      </>
    ),
  },
];

export default function Testimonials() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setActive((a) => (a + 1) % QUOTES.length), 4500);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="grid">
        {QUOTES.map((t, i) => {
          const on = i === active;
          return (
            <div
              key={t.name}
              aria-hidden={!on}
              className={`col-start-1 row-start-1 transition-all duration-700 ${on ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
                }`}
            >
              <blockquote className="mx-auto mt-8 max-w-[720px] text-[clamp(24px,3vw,30px)] font-medium leading-snug tracking-[-0.01em] text-white">
                {t.q}
              </blockquote>
              <div className="mt-7 inline-flex items-center gap-2.5 rounded-full bg-white px-2 py-1.5 pr-4 text-[14px] font-medium text-[#051B35]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.img} alt={t.name} className="h-8 w-8 rounded-full object-cover" />
                {t.name}
              </div>
              <p className="mt-4 text-[12px] uppercase tracking-[0.16em] text-[#9DA2B3]">{t.role}</p>
            </div>
          );
        })}
      </div>

      {/* dots */}
      <div className="mt-8 flex items-center justify-center gap-2">
        {QUOTES.map((t, i) => (
          <button
            key={t.name}
            type="button"
            aria-label={`Show quote from ${t.name}`}
            onClick={() => setActive(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-6 bg-[#a6e773]" : "w-1.5 bg-white/20 hover:bg-white/40"
              }`}
          />
        ))}
      </div>
    </div>
  );
}
