/* The venue from above, drawn for its main sport: the seating rows in the team colour around a football field, a soccer pitch, a basketball or
   volleyball court, a baseball diamond or a rink. Decorative (the facts beside it say the same in words), so it is hidden from screen readers. */
type Kind = "football" | "soccer" | "court" | "baseball" | "rink";
const KIND: Record<string, Kind> = { Football: "football", Soccer: "soccer", Basketball: "court", Volleyball: "court", Baseball: "baseball", Hockey: "rink" };

export default function VenueArt({ sport }: { sport: string }) {
  const kind = KIND[sport] ?? "football";
  return (
    <svg viewBox="0 0 400 300" className="pg-art" aria-hidden focusable="false">
      <defs>
        <pattern id="pg-art-seats" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.3" fill="currentColor" /></pattern>
      </defs>
      {[0, 1, 2].map((i) => (
        <rect key={i} className="pg-art-ring" style={{ ["--k" as string]: i }} x={14 + i * 16} y={14 + i * 14} width={372 - i * 32} height={272 - i * 28} rx={74 - i * 12} fill="url(#pg-art-seats)" />
      ))}
      {kind === "football" && (
        <g>
          <rect x="84" y="64" width="232" height="172" rx="12" className="pg-art-grass" />
          <rect x="84" y="64" width="34" height="172" rx="8" className="pg-art-end" /><rect x="282" y="64" width="34" height="172" rx="8" className="pg-art-end" />
          <g className="pg-art-line">{[118, 144, 170, 200, 230, 256, 282].map((x) => <line key={x} x1={x} y1="64" x2={x} y2="236" />)}<circle cx="200" cy="150" r="16" /></g>
        </g>
      )}
      {kind === "soccer" && (
        <g>
          <rect x="84" y="64" width="232" height="172" rx="12" className="pg-art-grass" />
          <g className="pg-art-line"><rect x="84" y="64" width="232" height="172" rx="12" /><line x1="200" y1="64" x2="200" y2="236" /><circle cx="200" cy="150" r="26" /><rect x="84" y="108" width="40" height="84" /><rect x="276" y="108" width="40" height="84" /></g>
        </g>
      )}
      {kind === "court" && (
        <g>
          <rect x="94" y="70" width="212" height="160" rx="10" className="pg-art-wood" />
          <g className="pg-art-line"><rect x="94" y="70" width="212" height="160" rx="10" /><line x1="200" y1="70" x2="200" y2="230" /><circle cx="200" cy="150" r="22" /><rect x="94" y="116" width="44" height="68" /><rect x="262" y="116" width="44" height="68" /></g>
        </g>
      )}
      {kind === "baseball" && (
        <g>
          <rect x="84" y="64" width="232" height="172" rx="12" className="pg-art-grass" />
          <polygon points="200,92 258,150 200,208 142,150" className="pg-art-dirt" />
          <g className="pg-art-line"><polygon points="200,112 238,150 200,188 162,150" /></g>
        </g>
      )}
      {kind === "rink" && (
        <g>
          <rect x="84" y="70" width="232" height="160" rx="52" className="pg-art-ice" />
          <g className="pg-art-line2"><line x1="200" y1="70" x2="200" y2="230" className="pg-art-red" /><line x1="150" y1="70" x2="150" y2="230" /><line x1="250" y1="70" x2="250" y2="230" /><circle cx="200" cy="150" r="22" /></g>
        </g>
      )}
    </svg>
  );
}
