/**
 * DateChip — event date block: month in green caps over a large white day.
 * `glass` is the hero treatment; `navy` the compact list-row treatment.
 */
export default function DateChip({
  month,
  day,
  variant = "glass",
}: {
  month: string;
  day: string;
  variant?: "glass" | "navy";
}) {
  if (variant === "navy") {
    return (
      <div className="w-[56px] shrink-0 rounded-lg border border-white/12 bg-[#051B35] py-2 text-center">
        <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#a6e773]">{month}</div>
        <div className="text-[19px] font-bold leading-tight text-white">{day}</div>
      </div>
    );
  }
  return (
    <div className="tile-glass w-[60px] shrink-0 rounded-xl py-2 text-center">
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#a6e773]">{month}</div>
      <div className="text-[24px] font-bold leading-none text-white">{day}</div>
    </div>
  );
}
