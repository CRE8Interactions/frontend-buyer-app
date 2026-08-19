"use client";

/**
 * SeatMap — interactive ballpark map for the buy flow. Grandstand wedges are
 * grouped into price bands; clicking any wedge toggles its band filter.
 * Fills are tonal white-on-navy scaled by price tier; green is reserved for
 * the selected/hover ("act here") state. Pure SVG — no map service.
 */

export type SeatMapBand = {
  id: string;
  /** Section letters this band covers, in arc order. */
  sections: string[];
  /** 0 = cheapest tier … 3 = premium. Drives the tonal fill. */
  tier: number;
  minPrice: number;
};

const CX = 320;
const CY = 268;
const RAD = Math.PI / 180;

const P = (r: number, deg: number): [number, number] => [
  +(CX + r * Math.cos(deg * RAD)).toFixed(1),
  +(CY - r * Math.sin(deg * RAD)).toFixed(1),
];

/** Annular wedge between radii r1<r2 from deg a to b (a<b, through the bottom). */
function wedge(r1: number, r2: number, a: number, b: number) {
  const [x1, y1] = P(r1, a);
  const [x2, y2] = P(r2, a);
  const [x3, y3] = P(r2, b);
  const [x4, y4] = P(r1, b);
  return `M${x1} ${y1} L${x2} ${y2} A${r2} ${r2} 0 0 0 ${x3} ${y3} L${x4} ${y4} A${r1} ${r1} 0 0 1 ${x1} ${y1}Z`;
}

const TIER_FILL = ["rgba(255,255,255,0.07)", "rgba(255,255,255,0.12)", "rgba(255,255,255,0.18)", "rgba(255,255,255,0.27)"];

/* Grandstand: 14 sections A–N from the 3B side (θ=160°) around home plate
   (θ=270°) to the 1B side (θ=380°). */
const ARC_START = 160;
const ARC_END = 380;
const SECTIONS = "ABCDEFGHIJKLMN".split("");
const STEP = (ARC_END - ARC_START) / SECTIONS.length;

export default function SeatMap({
  bands,
  selected,
  onToggle,
  highlightSections = [],
  className = "",
}: {
  bands: SeatMapBand[];
  selected: string[];
  onToggle: (bandId: string) => void;
  /** Section letters to spotlight (e.g. while hovering a listing row). */
  highlightSections?: string[];
  className?: string;
}) {
  const bandOf = (section: string) => bands.find((b) => b.sections.includes(section));
  const gaBand = bands.find((b) => b.sections.includes("GA"));

  const fill = (band: SeatMapBand | undefined, hoverable = true) => {
    if (!band) return "rgba(255,255,255,0.04)";
    if (selected.includes(band.id)) return "#a6e773";
    return TIER_FILL[band.tier] ?? TIER_FILL[0];
  };

  return (
    <div className={className}>
      <svg viewBox="0 0 640 430" className="w-full" role="group" aria-label="Seat map — select a section to filter listings">
        {/* field */}
        <path
          d={`M${P(0, 0)[0]} ${P(0, 0)[1]} L${P(196, 45).join(" ")} A196 196 0 0 0 ${P(196, 135).join(" ")}Z`}
          fill="rgba(255,255,255,0.03)"
        />
        {/* infield */}
        <path
          d={`M${P(0, 0).join(" ")} L${P(112, 45).join(" ")} L${P(158, 90).join(" ")} L${P(112, 135).join(" ")}Z`}
          fill="rgba(255,255,255,0.06)"
        />
        <circle cx={P(78, 90)[0]} cy={P(78, 90)[1]} r="7" fill="rgba(255,255,255,0.1)" />
        {/* foul lines */}
        <path d={`M${P(4, 45).join(" ")} L${P(196, 45).join(" ")}`} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        <path d={`M${P(4, 135).join(" ")} L${P(196, 135).join(" ")}`} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

        {/* GA lawn — outfield band */}
        {gaBand && (
          <g
            onClick={() => onToggle(gaBand.id)}
            className="cursor-pointer transition-opacity hover:opacity-80"
            role="button"
            aria-pressed={selected.includes(gaBand.id)}
            aria-label={`GA Lawn — from $${gaBand.minPrice.toFixed(2)}`}
          >
            <path
              d={`M${P(202, 60).join(" ")} A202 202 0 0 0 ${P(202, 120).join(" ")} L${P(226, 120).join(" ")} A226 226 0 0 1 ${P(226, 60).join(" ")}Z`}
              fill={highlightSections.includes("GA") && !selected.includes(gaBand.id) ? "rgba(166,231,115,0.45)" : fill(gaBand)}
              stroke={highlightSections.includes("GA") ? "#a6e773" : "none"}
              strokeWidth="2"
            />
            <text
              x={P(214, 90)[0]}
              y={P(214, 90)[1] + 4}
              textAnchor="middle"
              className="pointer-events-none select-none"
              fontSize="11"
              fontWeight="600"
              letterSpacing="2"
              fill={selected.includes(gaBand.id) ? "#051B35" : "#9DA2B3"}
            >
              GA LAWN
            </text>
          </g>
        )}

        {/* grandstand sections */}
        {SECTIONS.map((s, i) => {
          const a = ARC_START + i * STEP;
          const b = a + STEP;
          const band = bandOf(s);
          const mid = a + STEP / 2;
          const [tx, ty] = P(120, mid);
          const on = band ? selected.includes(band.id) : false;
          const hot = highlightSections.includes(s);
          return (
            <g
              key={s}
              onClick={() => band && onToggle(band.id)}
              className="cursor-pointer transition-opacity hover:opacity-80"
              role="button"
              aria-pressed={on}
              aria-label={band ? `Section ${s} — from $${band.minPrice.toFixed(2)}` : `Section ${s}`}
            >
              <path
                d={wedge(96, 146, a, b)}
                fill={hot && !on ? "rgba(166,231,115,0.45)" : fill(band)}
                stroke={hot ? "#a6e773" : "#051B35"}
                strokeWidth="2.5"
              />
              <text
                x={tx}
                y={ty + 4}
                textAnchor="middle"
                className="pointer-events-none select-none"
                fontSize="12"
                fontWeight="600"
                fill={on ? "#051B35" : "#BCBFCC"}
              >
                {s}
              </text>
            </g>
          );
        })}

        {/* home plate */}
        <rect x={CX - 5} y={CY - 5} width="10" height="10" transform={`rotate(45 ${CX} ${CY})`} fill="rgba(255,255,255,0.35)" />
      </svg>
    </div>
  );
}

/**
 * SeatMapThumb — tiny non-interactive locator: the same venue geometry with
 * one section lit green. Used inside listing rows so every listing shows
 * where it sits.
 */
export function SeatMapThumb({ section, className = "" }: { section: string; className?: string }) {
  return (
    <svg viewBox="40 30 560 390" className={className} aria-hidden>
      <path
        d={`M${P(0, 0)[0]} ${P(0, 0)[1]} L${P(196, 45).join(" ")} A196 196 0 0 0 ${P(196, 135).join(" ")}Z`}
        fill="rgba(255,255,255,0.05)"
      />
      <path
        d={`M${P(202, 60).join(" ")} A202 202 0 0 0 ${P(202, 120).join(" ")} L${P(226, 120).join(" ")} A226 226 0 0 1 ${P(226, 60).join(" ")}Z`}
        fill={section === "GA" ? "#a6e773" : "rgba(255,255,255,0.08)"}
      />
      {SECTIONS.map((s, i) => {
        const a = ARC_START + i * STEP;
        return (
          <path
            key={s}
            d={wedge(96, 146, a, a + STEP)}
            fill={s === section ? "#a6e773" : "rgba(255,255,255,0.08)"}
            stroke="#0a2747"
            strokeWidth="3"
          />
        );
      })}
    </svg>
  );
}
