"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

/* A small arena bowl drawn in code. The rink is a rounded rectangle (like a real
   hockey rink) and every seating row is an offset of it: straight along the side,
   curved around the corners. Four sections: left corner, two side sections, right corner.
   Click or press Space/Enter to pick, arrow keys to move, Esc to clear. */

type Seat = { id: string; sec: number; row: number; n: number; x: number; y: number; rot: number; price: number; d: number };

const CX = 400, CY = 0;
const RW = 170, RH = 80, RC = 56;       // rink half-width, half-height, corner radius
const GAP = 20, STEP = 21, ROWS = 4, SPACING = 21;
const PRICES = [64, 58, 52, 46];
const ROW_LABEL = ["A", "B", "C", "D"];
const SECTION_NO = [112, 113, 114, 115];
const MAX = 8;
const VB = { x: 128, y: -4, w: 544, h: 208 };

const CLX = CX - RW + RC, CRX = CX + RW - RC, CCY = CY + RH - RC; // corner centres
const AISLE = 6;                                                   // half aisle, in px
const MID = CX;
const rad = (d: number) => (d * Math.PI) / 180;
const dOf = (ri: number) => GAP + ri * STEP;

function hash(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/* Left corner: θ 177°→93°. Sides: x ranges. Right corner: θ 87°→3°. */
const CORNER_L = { a0: 177, a1: 93 };
const CORNER_R = { a0: 87, a1: 3 };
const SIDE_L = { x0: CLX + AISLE, x1: MID - AISLE };
const SIDE_R = { x0: MID + AISLE, x1: CRX - AISLE };

function cornerSeat(cx: number, ri: number, θ0: number, θ1: number, i: number, count: number) {
  const R = RC + dOf(ri);
  const deg = θ0 + ((θ1 - θ0) * (i + 0.5)) / count;
  const t = rad(deg);
  return { x: cx + R * Math.cos(t), y: CCY + R * Math.sin(t), rot: (Math.atan2(-Math.cos(t), Math.sin(t)) * 180) / Math.PI };
}

function build(): Seat[][][] {
  const out: Seat[][][] = [[], [], [], []];
  for (let ri = 0; ri < ROWS; ri++) {
    const R = RC + dOf(ri);
    const yStraight = CY + RH + dOf(ri);
    const push = (sec: number, list: Omit<Seat, "id" | "sec" | "row" | "n" | "price" | "d">[]) => {
      out[sec][ri] = list.map((p, i) => ({
        ...p, sec, row: ri, n: i + 1, price: PRICES[ri],
        id: `${SECTION_NO[sec]}-${ROW_LABEL[ri]}-${i + 1}`,
        d: Math.hypot(p.x - CX, (p.y - (CY + RH + 40)) * 1.6),
      }));
    };
    const cornerCount = (a: { a0: number; a1: number }) => Math.max(3, Math.floor((R * rad(Math.abs(a.a0 - a.a1))) / SPACING));
    const nL = cornerCount(CORNER_L);
    push(0, Array.from({ length: nL }, (_, i) => cornerSeat(CLX, ri, CORNER_L.a0, CORNER_L.a1, i, nL)));
    const nS = Math.floor((SIDE_L.x1 - SIDE_L.x0) / SPACING);
    const side = (s: { x0: number; x1: number }) => Array.from({ length: nS }, (_, i) => ({ x: s.x0 + ((i + 0.5) * (s.x1 - s.x0)) / nS, y: yStraight, rot: 0 }));
    push(1, side(SIDE_L));
    push(2, side(SIDE_R));
    const nR = cornerCount(CORNER_R);
    push(3, Array.from({ length: nR }, (_, i) => cornerSeat(CRX, ri, CORNER_R.a0, CORNER_R.a1, i, nR)));
  }
  return out;
}

const soldFor = (id: string, i: number) => hash(i * 3.7 + id.length) < 0.24;

/* Section outline between the inner and outer row offsets. */
function wedgePath(sec: number) {
  const dIn = GAP - 11, dOut = dOf(ROWS - 1) + 11;
  const pt = (d: number, k: number, steps: number): string => {
    if (sec === 1 || sec === 2) {
      const s = sec === 1 ? SIDE_L : SIDE_R;
      return `${(s.x0 + ((s.x1 - s.x0) * k) / steps).toFixed(1)} ${(CY + RH + d).toFixed(1)}`;
    }
    const c = sec === 0 ? CORNER_L : CORNER_R;
    const cx = sec === 0 ? CLX : CRX;
    const t = rad(c.a0 + ((c.a1 - c.a0) * k) / steps);
    return `${(cx + (RC + d) * Math.cos(t)).toFixed(1)} ${(CCY + (RC + d) * Math.sin(t)).toFixed(1)}`;
  };
  const steps = 24;
  const inner = Array.from({ length: steps + 1 }, (_, k) => pt(dIn, k, steps));
  const outer = Array.from({ length: steps + 1 }, (_, k) => pt(dOut, steps - k, steps));
  return `M ${inner.join(" L ")} L ${outer.join(" L ")} Z`;
}

function labelPos(sec: number) {
  const d = dOf(ROWS - 1) + 28;
  if (sec === 1) return { x: (SIDE_L.x0 + SIDE_L.x1) / 2, y: CY + RH + d };
  if (sec === 2) return { x: (SIDE_R.x0 + SIDE_R.x1) / 2, y: CY + RH + d };
  const c = sec === 0 ? CORNER_L : CORNER_R;
  const t = rad((c.a0 + c.a1) / 2);
  const cx = sec === 0 ? CLX : CRX;
  return { x: cx + (RC + d) * Math.cos(t), y: CCY + (RC + d) * Math.sin(t) };
}

export default function SeatMap() {
  const grid = useMemo(build, []);
  const flat = useMemo(() => grid.flat(2), [grid]);
  const byId = useMemo(() => Object.fromEntries(flat.map((s) => [s.id, s])), [flat]);

  // Three adjacent seats in section 113, row C are pre-picked (and never sold).
  const preselect = useMemo(() => {
    const row = grid[1][2];
    return [row[row.length - 3].id, row[row.length - 2].id, row[row.length - 1].id];
  }, [grid]);
  const soldSet = useMemo(
    () => new Set(flat.filter((s, i) => soldFor(s.id, i) && !preselect.includes(s.id)).map((s) => s.id)),
    [flat, preselect],
  );

  const [picked, setPicked] = useState<string[]>(preselect);
  const [hover, setHover] = useState<Seat | null>(null);
  const [focusId, setFocusId] = useState<string>(preselect[1]);
  const [shown, setShown] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const refs = useRef<Record<string, SVGGElement | null>>({});

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // On narrow screens the map keeps its desktop size and scrolls sideways; start centred.
  useEffect(() => {
    const el = stage.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, []);

  const chosen = picked.map((id) => byId[id]).filter(Boolean);
  const total = chosen.reduce((a, s) => a + s.price, 0);

  function toggle(s: Seat) {
    if (soldSet.has(s.id)) return;
    setPicked((p) => (p.includes(s.id) ? p.filter((x) => x !== s.id) : p.length >= MAX ? p : [...p, s.id]));
  }

  function move(s: Seat, key: string) {
    const rows = grid[s.sec];
    let target: Seat | undefined;
    if (key === "ArrowRight") target = rows[s.row][s.n] ?? grid[Math.min(s.sec + 1, grid.length - 1)][s.row][0];
    if (key === "ArrowLeft") target = rows[s.row][s.n - 2] ?? (s.sec > 0 ? grid[s.sec - 1][s.row].at(-1) : undefined);
    if (key === "ArrowUp" && s.row > 0) target = rows[s.row - 1][Math.min(s.n - 1, rows[s.row - 1].length - 1)];
    if (key === "ArrowDown" && s.row < ROWS - 1) target = rows[s.row + 1][Math.min(s.n - 1, rows[s.row + 1].length - 1)];
    if (target) { setFocusId(target.id); refs.current[target.id]?.focus(); }
  }

  function onKey(e: KeyboardEvent<SVGGElement>, s: Seat) {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(s); }
    else if (e.key === "Escape") setPicked([]);
    else if (e.key.startsWith("Arrow")) { e.preventDefault(); move(s, e.key); }
  }

  const label = (s: Seat) =>
    `Section ${SECTION_NO[s.sec]}, row ${ROW_LABEL[s.row]}, seat ${s.n}, ${soldSet.has(s.id) ? "sold" : `$${s.price}${picked.includes(s.id) ? ", selected" : ""}`}`;

  const secs = Array.from(new Set(chosen.map((s) => `${SECTION_NO[s.sec]}`)));
  const rowsPicked = Array.from(new Set(chosen.map((s) => ROW_LABEL[s.row])));

  const hoverSold = hover ? soldSet.has(hover.id) : false;
  const leftPct = hover ? ((hover.x - VB.x) / VB.w) * 100 : 0;
  const topPct = hover ? ((hover.y - VB.y) / VB.h) * 100 : 0;

  // rink geometry
  const rx = CX - RW, ry = CY - RH;

  return (
    <div ref={wrap} className={`sm ${shown ? "sm-in" : ""}`}>
      <div className="sm-stage" ref={stage}>
        <div className="sm-canvas">
        <svg viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} role="group" aria-label="Seat map: four sections along the rink. Arrow keys move, space selects, escape clears." className="sm-svg">
          <defs>
            <linearGradient id="sm-ice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFFFFF" />
              <stop offset="1" stopColor="#EEF0F3" />
            </linearGradient>
            <clipPath id="sm-ice-clip"><rect x={rx + 7} y={ry + 7} width={RW * 2 - 14} height={RH * 2 - 14} rx={RC - 7} /></clipPath>
          </defs>

          {/* rink: boards, ice, markings */}
          <rect x={rx} y={ry} width={RW * 2} height={RH * 2} rx={RC} className="sm-boards" />
          <rect x={rx + 7} y={ry + 7} width={RW * 2 - 14} height={RH * 2 - 14} rx={RC - 7} fill="url(#sm-ice)" stroke="#E3E5E9" strokeWidth="1.5" />
          <g clipPath="url(#sm-ice-clip)" fill="none" strokeLinecap="round">
            <line x1={CX} x2={CX} y1={ry} y2={ry + RH * 2} stroke="#E6B8B8" strokeWidth="3" />
            <line x1={CX - 62} x2={CX - 62} y1={ry} y2={ry + RH * 2} stroke="#D6DBE4" strokeWidth="3" />
            <line x1={CX + 62} x2={CX + 62} y1={ry} y2={ry + RH * 2} stroke="#D6DBE4" strokeWidth="3" />
            <line x1={CX - RW + 20} x2={CX - RW + 20} y1={ry} y2={ry + RH * 2} stroke="#E6B8B8" strokeWidth="1.4" />
            <line x1={CX + RW - 20} x2={CX + RW - 20} y1={ry} y2={ry + RH * 2} stroke="#E6B8B8" strokeWidth="1.4" />
            <circle cx={CX} cy={CY} r="24" stroke="#E6B8B8" strokeWidth="1.6" />
            <circle cx={CX} cy={CY} r="2.6" fill="#D6DBE4" stroke="none" />
            {[-1, 1].flatMap((sx) => [-1, 1].map((sy) => (
              <g key={`${sx}${sy}`}>
                <circle cx={CX + sx * 108} cy={CY + sy * 34} r="15" stroke="#E6B8B8" strokeWidth="1.4" />
                <circle cx={CX + sx * 108} cy={CY + sy * 34} r="2.2" fill="#E6B8B8" stroke="none" />
                <circle cx={CX + sx * 30} cy={CY + sy * 34} r="2" fill="#E6B8B8" stroke="none" />
              </g>
            )))}
            <path d={`M ${CX - RW + 20} ${CY - 12} a 12 12 0 0 1 0 24 z`} fill="#E8EDF5" stroke="#D6DBE4" strokeWidth="1.2" />
            <path d={`M ${CX + RW - 20} ${CY - 12} a 12 12 0 0 0 0 24 z`} fill="#E8EDF5" stroke="#D6DBE4" strokeWidth="1.2" />
          </g>

          {/* section outlines and numbers */}
          {SECTION_NO.map((no, sec) => {
            const p = labelPos(sec);
            return (
              <g key={no}>
                <path d={wedgePath(sec)} className={`sm-wedge ${hover && hover.sec === sec ? "on" : ""}`} />
                <text x={p.x} y={p.y + 4} textAnchor="middle" className="sm-sec">{no}</text>
              </g>
            );
          })}

          {/* seats */}
          {flat.map((s, i) => {
            const sold = soldSet.has(s.id);
            const sel = picked.includes(s.id);
            return (
              <g
                key={s.id}
                ref={(el) => { refs.current[s.id] = el; }}
                transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) rotate(${s.rot.toFixed(1)})`}
                role="checkbox"
                aria-checked={sel}
                aria-disabled={sold}
                aria-label={label(s)}
                tabIndex={focusId === s.id ? 0 : -1}
                onClick={() => { setFocusId(s.id); toggle(s); }}
                onKeyDown={(e) => onKey(e, s)}
                onFocus={() => setHover(s)}
                onBlur={() => setHover((h) => (h?.id === s.id ? null : h))}
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover((h) => (h?.id === s.id ? null : h))}
                className={`sm-seat ${sold ? "sold" : ""} ${sel ? "sel" : ""}`}
                style={{ ["--d" as string]: `${Math.round(s.d * 3) + (i % 5) * 6}ms` }}
              >
                <circle className="hit" r="10.5" />
                <circle className="dot" r="7.5" />
                {sel && (
                  <g transform={`rotate(${(-s.rot).toFixed(1)})`}>
                    <path className="tick" d="M-3.3 0.2 L-0.9 2.7 L3.5 -2.6" />
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {hover && (
          <div className="sm-pop" style={{ left: `clamp(84px, ${leftPct}%, calc(100% - 84px))`, top: `${topPct}%` }} aria-hidden>
            <span className="sm-pop-seat">
              <b>Section {SECTION_NO[hover.sec]}</b>
              <small>Row {ROW_LABEL[hover.row]} · Seat {hover.n}</small>
            </span>
            <span className={`sm-pop-price ${hoverSold ? "sold" : ""}`}>{hoverSold ? "Sold" : `$${hover.price}`}</span>
          </div>
        )}
        </div>
      </div>

      <div className="sm-foot">
        <p className="sm-legend">
          <span><i className="a" />Available</span>
          <span><i className="s" />Selected</span>
          <span><i className="x" />Unavailable</span>
        </p>
        <div className="sm-sum" aria-live="polite">
          {chosen.length > 0 ? (
            <>
              <div className="sm-info">
                <b>{chosen.length} seat{chosen.length > 1 ? "s" : ""}</b>
                <span>Section {secs.join(", ")} · Row {rowsPicked.join(", ")}</span>
              </div>
              <div className="sm-pay">
                <b className="sm-total">${total}</b>
                <button type="button" onClick={() => setPicked([])} className="sm-clear">Clear</button>
              </div>
            </>
          ) : (
            <span className="sm-hint">Pick seats on the map</span>
          )}
        </div>
      </div>
    </div>
  );
}
