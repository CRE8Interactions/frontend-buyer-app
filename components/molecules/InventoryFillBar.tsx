/**
 * Thin track showing how sold-through a listing's inventory is.
 * Width = % full; color shifts cooler → warmer as inventory tightens.
 */

export type InventoryFill = {
  available: number;
  capacity: number;
  /** 0–100, share of capacity already sold / unavailable */
  fullPct: number;
};

function fillColor(fullPct: number) {
  if (fullPct >= 85) return "#f07167";
  if (fullPct >= 60) return "#e8b86d";
  return "#a6e773";
}

export default function InventoryFillBar({
  fill,
  className = "",
}: {
  fill: InventoryFill;
  className?: string;
}) {
  const width = Math.max(0, Math.min(100, fill.fullPct));
  return (
    <div className={`w-full ${className}`.trim()}>
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-white/10"
        role="meter"
        aria-label={`${width}% full`}
        aria-valuenow={width}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{
            width: `${width}%`,
            background: fillColor(width),
          }}
        />
      </div>
    </div>
  );
}
