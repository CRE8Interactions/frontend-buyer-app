"use client";

import { useMemo } from "react";

/* The live preview: one stadium, built from your answers a detail at a time.
   - events a year light sections and switch on floodlight towers,
   - tickets a year fill the seats, open turnstile gates and add suites,
   - the organization, its kind and its city appear on the banner over the bowl.
   Every detail is a CSS transition on a data attribute,
   so going back an answer simply plays in reverse. */

export type Kind = "Venue" | "Team" | "Promoter" | "Festival" | "University";

const CX = 320, CY = 282;
const RING = [
  { oR: [270, 200], iR: [212, 156] },
  { oR: [196, 146], iR: [142, 104] },
] as const;
const rad = (d: number) => (d * Math.PI) / 180;
const pt = (rx: number, ry: number, t: number) => [CX + rx * Math.cos(t), CY + ry * Math.sin(t)] as const;
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
const f1 = (n: number) => n.toFixed(1);

type Dot = { x: number; y: number; rank: number };
type Sector = { d: string; dots: Dot[]; lit: number };

function buildSectors(): Sector[] {
  const out: Sector[] = [];
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 12; i++) {
      const { oR, iR } = RING[r];
      const t0 = rad(i * 30 - 90 + 2.4), t1 = rad(i * 30 - 90 + 27.6);
      const [ox0, oy0] = pt(oR[0], oR[1], t0), [ox1, oy1] = pt(oR[0], oR[1], t1);
      const [ix1, iy1] = pt(iR[0], iR[1], t1), [ix0, iy0] = pt(iR[0], iR[1], t0);
      const d = `M${f1(ox0)} ${f1(oy0)}A${oR[0]} ${oR[1]} 0 0 1 ${f1(ox1)} ${f1(oy1)}L${f1(ix1)} ${f1(iy1)}A${iR[0]} ${iR[1]} 0 0 0 ${f1(ix0)} ${f1(iy0)}Z`;
      const dots: Dot[] = [];
      for (let rr = 0; rr < 4; rr++) {
        const f = (rr + 0.5) / 4;
        for (let cc = 0; cc < 6; cc++) {
          const t = lerp(t0, t1, (cc + 0.5) / 6);
          const [x, y] = pt(lerp(iR[0], oR[0], f), lerp(iR[1], oR[1], f), t);
          dots.push({ x, y, rank: ((rr * 6 + cc) * 7) % 24 });
        }
      }
      out.push({ d, dots, lit: ((r * 12 + i) * 7) % 24 });
    }
  }
  return out;
}

const GATES = Array.from({ length: 12 }, (_, i) => {
  const [x, y] = pt(290, 216, rad(i * 30 - 75));
  return { x, y, order: (i * 5) % 12 };
});
/* suites: eight boxes that hug the rim of the bowl, four across the top and four across the bottom */
const SUITES = Array.from({ length: 8 }, (_, i) => {
  const base = i < 4 ? -114 : 66, k = i % 4;
  const t0 = rad(base + k * 12 + 0.8), t1 = rad(base + k * 12 + 11.2);
  const [ox0, oy0] = pt(287, 217, t0), [ox1, oy1] = pt(287, 217, t1), [ix1, iy1] = pt(274, 205, t1), [ix0, iy0] = pt(274, 205, t0);
  return { d: `M${f1(ox0)} ${f1(oy0)}A287 217 0 0 1 ${f1(ox1)} ${f1(oy1)}L${f1(ix1)} ${f1(iy1)}A274 205 0 0 0 ${f1(ix0)} ${f1(iy0)}Z`, i };
});
const TOWERS = [[40, 96], [600, 96], [40, 468], [600, 468]] as const;
const beam = (tx: number, ty: number) => {
  const dx = CX - tx, dy = CY - ty, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, nx = -uy, ny = ux, L = 220;
  return `${f1(tx + nx * 3)},${f1(ty + ny * 3)} ${f1(tx + ux * L + nx * 42)},${f1(ty + uy * L + ny * 42)} ${f1(tx + ux * L - nx * 42)},${f1(ty + uy * L - ny * 42)} ${f1(tx - nx * 3)},${f1(ty - ny * 3)}`;
};

export const EVENT_STOPS = ["1–5", "6–10", "11–25", "26–50", "51–75", "76–100", "101–150", "150+"];
export const TICKET_STOPS = ["Under 5k", "5k–10k", "10k–25k", "25k–50k", "50k–100k", "100k–250k", "250k–1M", "1M+"];
const LIT_FOR = [2, 4, 7, 11, 15, 19, 22, 24];
const DOTS_FOR = [3, 5, 8, 11, 14, 17, 20, 24];
const GATES_FOR = [3, 4, 5, 6, 8, 10, 12, 12];
const TOWERS_ON = [1, 1, 2, 2, 3, 3, 4, 4];

export default function Arena({ kind, org, city, events, tickets, open }: { kind: Kind; org: string; city: string; events: number; tickets: number; open: boolean }) {
  const sectors = useMemo(buildSectors, []);
  const lit = open ? 24 : LIT_FOR[events];
  const perSector = open ? 24 : DOTS_FOR[tickets];
  const gates = open ? 12 : GATES_FOR[tickets];
  const towers = open ? 4 : TOWERS_ON[events];
  const suites = open || tickets >= 3;
  const name = org.trim() || "Your organization";
  const sub = [kind, city.trim()].filter(Boolean).join(" · ");
  const nameW = Math.min(284, name.length * 15.2);
  const subW = Math.min(250, sub.length * 7.4);

  return (
    <svg viewBox="0 0 640 500" className="sl-arena" data-open={open ? "1" : "0"} role="img" aria-label={`A stadium for ${org.trim() || "your organization"}, a ${kind.toLowerCase()}. ${lit} of 24 sections are lit, each with about ${perSector} seats filled, ${gates} gates open and ${towers} floodlight towers on.`}>
      {TOWERS.map(([x, y], i) => (
        <g key={i} className="sl-tw" data-on={i < towers ? "1" : "0"} style={{ ["--ti" as string]: i }}>
          <polygon className="beam" points={beam(x, y)} />
          <circle className="mast" cx={x} cy={y} r="8" /><circle className="bulb" cx={x} cy={y} r="3.4" />
        </g>
      ))}

      <g className="sl-site" transform={`translate(${CX} ${CY}) scale(.92) translate(${-CX} ${-CY})`}>
        <ellipse className="sl-conc" cx={CX} cy={CY} rx="290" ry="216" />
        {GATES.map((g, i) => <circle key={i} className="sl-gate" data-on={g.order < gates ? "1" : "0"} cx={f1(g.x)} cy={f1(g.y)} r="4.2" style={{ ["--go" as string]: g.order }} />)}

        {sectors.map((s, i) => (
          <g key={i} className="sl-sec" data-lit={s.lit < lit ? "1" : "0"} style={{ ["--lo" as string]: s.lit, ["--bi" as string]: i }}>
            <path className="sl-p" d={s.d} />
            {s.dots.map((p, j) => <circle key={j} className="sl-d" data-on={p.rank < perSector ? "1" : "0"} cx={f1(p.x)} cy={f1(p.y)} r="2.7" style={{ ["--dk" as string]: p.rank }} />)}
          </g>
        ))}

        {SUITES.map((s) => <path key={s.i} className="sl-suite" data-on={suites ? "1" : "0"} d={s.d} style={{ ["--si" as string]: s.i }} />)}

        {/* the playing surface: plain markings, the same for every kind */}
        <g className="sl-rink" transform={`translate(${CX} ${CY})`}>
          <rect x="-100" y="-66" width="200" height="132" rx="30" />
          <circle r="22" /><path d="M0-66V66M-100 0H-78M100 0H78" />
        </g>
      </g>

      {/* the banner over the bowl: the live preview of what you type */}
      <g className="sl-sb" data-set={org.trim() ? "1" : "0"}>
        <text className="nm" x="320" y="41" textAnchor="middle" textLength={name.length * 15.2 > 284 ? nameW : undefined} lengthAdjust="spacingAndGlyphs">{name}</text>
        <text className="ct" x="320" y="59" textAnchor="middle" textLength={sub.length * 7.4 > 250 ? subW : undefined} lengthAdjust="spacingAndGlyphs" data-set={city.trim() ? "1" : "0"}>{sub}</text>
      </g>
    </svg>
  );
}
