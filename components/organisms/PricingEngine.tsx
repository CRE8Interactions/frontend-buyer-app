"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "@/components/atoms/icons";

/**
 * PricingEngine — interactive walkthrough of the AI pricing engine. A step rail
 * (Ingest → Diagnose → Recommend → Protect) drives an animated mock dashboard.
 * Auto-advances, pauses on hover, and replays each panel's bar/fill animations
 * on switch. Honors prefers-reduced-motion (no auto-advance).
 */

const STEPS = [
  { k: "01 — Ingest", t: "Drag in your data. We clean it." },
  { k: "02 — Diagnose", t: "See the revenue gap instantly." },
  { k: "03 — Recommend", t: "Which seats to move, and why." },
  { k: "04 — Protect", t: "Know who drives the revenue." },
];

const OCCUPANCY = [94, 61, 88, 48, 70, 55, 91, 67, 52, 78];

const RECS = [
  { seg: "VIP Suite", chip: "underpriced", why: "Below market vs. comparable demand", move: "+$191" },
  { seg: "Premium Floor", chip: "99% demand", why: "Near-capacity demand score", move: "+$64" },
  { seg: "Upper Bowl", chip: "soft demand", why: "Drop to drive volume and fill empty seats", move: "−$12" },
];

/* animate a width/height from 0 to its target once the element mounts */
function useGrow(target: string) {
  const [v, setV] = useState("0%");
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setV(target)));
    return () => cancelAnimationFrame(id);
  }, [target]);
  return v;
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#a6e773]/25 bg-[#a6e773]/10 px-2.5 py-1 text-[12px] font-semibold text-[#a6e773]">
      {children}
    </span>
  );
}

function PanelHead({ title, tag }: { title: string; tag: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-2.5">
      <div className="text-[19px] font-semibold text-white">{title}</div>
      <Tag>{tag}</Tag>
    </div>
  );
}

function Metric({ v, l, lime }: { v: string; l: string; lime?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-[18px]">
      <div className={`text-[26px] font-bold tracking-[-0.02em] ${lime ? "text-[#a6e773]" : "text-white"}`}>{v}</div>
      <div className="mt-1.5 text-[12px] leading-snug text-white/40">{l}</div>
    </div>
  );
}

function Note({ children, divider = true }: { children: React.ReactNode; divider?: boolean }) {
  return (
    <p className={`mt-auto text-[13px] leading-relaxed text-white/40 ${divider ? "border-t border-white/10 pt-4" : "pt-3"}`}>
      {children}
    </p>
  );
}

function Fill({ pct }: { pct: string }) {
  const w = useGrow(pct);
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
      <span
        className="block h-full rounded-full"
        style={{ width: w, background: "linear-gradient(90deg,#a6e773,#7fd14a)", transition: "width 1.4s cubic-bezier(.2,.8,.2,1)" }}
      />
    </div>
  );
}

function Bar({ h, hot, label }: { h: number; hot: boolean; label: string }) {
  const ht = useGrow(`${h}%`);
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-end gap-2">
      <span
        className="w-full max-w-[34px] rounded-t-md"
        style={{
          height: ht,
          transition: "height 1s cubic-bezier(.2,.8,.2,1)",
          background: hot ? "linear-gradient(180deg,#a6e773,#7fd14a)" : "rgba(255,255,255,.12)",
        }}
      />
      <span className="text-[10px] text-white/40">{label}</span>
    </div>
  );
}

function Split({ fans, rev }: { fans: string; rev: string }) {
  const f = useGrow(fans);
  const r = useGrow(rev);
  return (
    <div className="flex h-[30px] overflow-hidden rounded-lg bg-white/[0.05]">
      <span style={{ width: f, background: "rgba(255,255,255,.18)", transition: "width 1.2s cubic-bezier(.2,.8,.2,1)" }} />
      <span style={{ width: r, background: "linear-gradient(90deg,#a6e773,#7fd14a)", transition: "width 1.2s cubic-bezier(.2,.8,.2,1) .15s" }} />
    </div>
  );
}

function SplitRow({ label, value, fans, rev }: { label: string; value: string; fans: string; rev: string }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-[14px] text-white/60">
        <span>{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <Split fans={fans} rev={rev} />
    </div>
  );
}

function Panel({ active }: { active: number }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={`flex h-full w-full flex-col transition-all duration-500 ${shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
    >
      {active === 0 && (
        <>
          <PanelHead title="Schema detected automatically" tag="Live" />
          <div className="flex flex-1 flex-col justify-center gap-7">
            <div>
              <div className="mb-2.5 flex justify-between text-[13px] text-white/60">
                <span>Data quality after cleaning</span>
                <b className="font-semibold text-[#a6e773]">99.8%</b>
              </div>
              <Fill pct="99.8%" />
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <Metric v="48,210" l="Rows ingested & cleaned" lime />
              <Metric v="5" l="Columns mapped automatically" />
              <Metric v="1.4s" l="Time to first dashboard" />
            </div>
            <div className="flex flex-col gap-2.5">
              {[
                "Columns mapped — section, row, seat, price, sale date",
                "Duplicate and malformed rows removed",
                "Dashboard updating in real time",
              ].map((row) => (
                <div key={row} className="flex items-center gap-3 text-[14px] text-white/60">
                  <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#a6e773]/15 text-[#a6e773]">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                  {row}
                </div>
              ))}
            </div>
          </div>
          <Note>No mapping wizard, no template. Drop in the export you already have and the dashboard populates as it processes.</Note>
        </>
      )}

      {active === 1 && (
        <>
          <PanelHead title="Season overview · 10 events" tag="Auto-generated" />
          <div className="flex flex-1 flex-col justify-center gap-7">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <Metric v="$42,000" l="Season revenue" lime />
              <Metric v="72.5%" l="Occupancy across events" />
              <Metric v="27.5%" l="Seats going empty" />
            </div>
            <div>
              <div className="mb-4 flex justify-between text-[13px] text-white/60">
                <span>Occupancy by event</span>
                <span>
                  <b className="font-semibold text-[#a6e773]">3 events</b> near sellout
                </span>
              </div>
              <div className="flex h-[130px] items-end gap-2.5">
                {OCCUPANCY.map((h, i) => (
                  <Bar key={i} h={h} hot={h >= 85} label={`G${i + 1}`} />
                ))}
              </div>
            </div>
          </div>
          <Note>That empty 27.5% is the gap. Every seat that goes out the door unsold is revenue you priced wrong — and it&rsquo;s the first thing the engine targets.</Note>
        </>
      )}

      {active === 2 && (
        <>
          <PanelHead title="Pricing recommendations" tag="Demand-scored" />
          <div className="flex flex-1 flex-col justify-center gap-2.5">
            {RECS.map((r) => (
              <div key={r.seg} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3.5">
                <div>
                  <div className="text-[15px] font-semibold text-white">
                    {r.seg}
                    <span className="ml-2 inline-block rounded-md bg-[#a6e773]/12 px-2 py-0.5 text-[11px] font-semibold text-[#a6e773]">{r.chip}</span>
                  </div>
                  <div className="mt-1 text-[13px] text-white/40">{r.why}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[22px] font-bold text-[#a6e773]">{r.move}</div>
                  <div className="mt-0.5 text-[12px] text-white/40">per seat</div>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[#a6e773]/20 bg-[#a6e773]/[0.06] px-5 py-3.5">
              <div className="max-w-[60%] text-[13px] text-white/60">Applying these moves across the season, before any manual review.</div>
              <div className="shrink-0 text-right">
                <div className="text-[24px] font-bold text-[#a6e773]">+$11,400</div>
                <div className="mt-0.5 text-[11px] text-white/40">projected revenue</div>
              </div>
            </div>
          </div>
          <Note divider={false}>The engine tells you the direction, the dollar amount, and the reason — so you can adjust with confidence instead of guessing.</Note>
        </>
      )}

      {active === 3 && (
        <>
          <PanelHead title="Who drives your revenue" tag="Fan CRM" />
          <div className="flex flex-1 flex-col justify-center gap-6">
            <div className="flex flex-col gap-5">
              <SplitRow label="Corporate buyers" value="13% of fans → 54% of revenue" fans="13%" rev="54%" />
              <SplitRow label="Season ticket holders" value="9% of fans → 23% of revenue" fans="9%" rev="23%" />
            </div>
            <div className="flex gap-5 text-[12px] text-white/40">
              <span className="inline-flex items-center gap-2">
                <i className="inline-block h-2.5 w-2.5 rounded-[3px] bg-white/[0.18]" />Share of fan base
              </span>
              <span className="inline-flex items-center gap-2">
                <i className="inline-block h-2.5 w-2.5 rounded-[3px] bg-[#a6e773]" />Share of revenue
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <Metric v="$8,400" l="Season ticket holder lifetime value" lime />
              <Metric v="40%" l="Of revenue from top 3 games" />
              <Metric v="Top 3" l="Events to prioritize for dynamic pricing" />
            </div>
          </div>
          <Note>Now you know who to protect when you raise prices — and which games are worth pushing hardest on.</Note>
        </>
      )}
    </div>
  );
}

export default function PricingEngine() {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Sticky scroll-scrub: the stage card stays in view via native CSS sticky
  // (no scroll-jacking) while the reader scrolls through the tall track, and the
  // active step maps to scroll progress. The card stays put; the steps advance.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const setHeight = () => {
      el.style.height = `${(window.innerHeight || 800) * STEPS.length * 0.6}px`;
    };
    const compute = () => {
      const vh = window.innerHeight || 800;
      const range = el.offsetHeight - vh;
      const p = range > 0 ? Math.min(1, Math.max(0, -el.getBoundingClientRect().top / range)) : 0;
      const idx = Math.min(STEPS.length - 1, Math.max(0, Math.floor(p * STEPS.length)));
      setActive(idx);
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
  }, []);

  // Clicking a step scrolls the page so that step becomes the active one.
  const select = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const vh = window.innerHeight || 800;
    const range = el.offsetHeight - vh;
    const trackTop = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: trackTop + ((i + 0.5) / STEPS.length) * range, behavior: "smooth" });
  };

  return (
    <div ref={trackRef} className="relative mt-10">
      <div className="sticky top-24">
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* step rail */}
          <div className="flex flex-col gap-1.5" role="tablist" aria-label="Pricing engine steps">
            {STEPS.map((s, i) => {
              const on = i === active;
              return (
                <button
                  key={s.k}
                  role="tab"
                  aria-selected={on}
                  onClick={() => select(i)}
                  className={`relative w-full rounded-xl border py-4 pl-5 pr-[18px] text-left transition-all duration-300 ${on ? "border-white/10 bg-white/[0.045]" : "border-transparent bg-transparent hover:bg-white/[0.025]"
                    }`}
                >
                  <span
                    className={`absolute bottom-3.5 left-0 top-3.5 w-0.5 rounded-full transition-colors duration-300 ${on ? "bg-[#a6e773] shadow-[0_0_12px_rgba(166,231,115,.6)]" : "bg-white/10"
                      }`}
                  />
                  <div className={`text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors ${on ? "text-[#a6e773]" : "text-white/40"}`}>
                    {s.k}
                  </div>
                  <div className={`mt-1.5 text-[15px] font-medium transition-colors ${on ? "text-white" : "text-white/60"}`}>{s.t}</div>
                </button>
              );
            })}
          </div>

          {/* screen */}
          <div className="card relative flex h-[548px] overflow-hidden p-7 sm:p-8">
            <span
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(circle at 75% 0%, rgba(166,231,115,.06), transparent 55%)" }}
            />
            <div className="relative flex w-full flex-col">
              <Panel key={active} active={active} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
