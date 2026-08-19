/* Abstract product-preview mocks (skeleton UI), matching the Figma. */

export function HeroPreview() {
  const bars = [42, 68, 55, 82, 71, 94, 76, 88, 63, 91];
  const kpis = [70, 88, 52, 58];
  const rows = [70, 54, 86];
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#051B35]">
      <div className="grid grid-cols-[44px_1fr] sm:grid-cols-[56px_1fr]">
        {/* rail */}
        <div className="flex flex-col gap-2 border-r border-white/10 p-2.5">
          <div className="mb-1 h-6 rounded-md bg-[#a6e773]/90" />
          <div className="h-2 w-[80%] rounded-full bg-[#a6e773]/40" />
          <div className="h-2 w-[68%] rounded-full bg-white/10" />
          <div className="h-2 w-[74%] rounded-full bg-white/10" />
        </div>
        {/* main column */}
        <div className="min-w-0">
          {/* header */}
          <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="h-2 w-16 rounded-full bg-white/20" />
            <span className="hidden text-[9px] font-medium uppercase tracking-[0.18em] text-[#9DA2B3] sm:inline">Revenue · Game week</span>
            <div className="ml-auto h-6 w-16 rounded-lg border border-white/10 bg-white/[0.04]" />
            <div className="h-6 w-6 rounded-lg bg-[#a6e773]" />
          </div>
          {/* body */}
          <div className="space-y-3 p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {kpis.map((w, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5 sm:min-h-[120px]">
                  <div className="h-1.5 w-9 rounded-full bg-white/20" />
                  <div className="mt-3 h-4 rounded bg-[#a6e773]/85" style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.75fr_1fr]">
              <div className="flex flex-col rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="h-2 w-24 rounded-full bg-white/20" />
                  <div className="h-2 w-10 rounded-full bg-[#a6e773]/40" />
                </div>
                <div className="flex h-[150px] items-end gap-1.5 sm:h-[200px]">
                  {bars.map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-md bg-[#a6e773]/70" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="flex flex-col rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="h-2 w-16 rounded-full bg-white/20" />
                <div className="mt-4 flex flex-col gap-4">
                  {rows.map((w, i) => (
                    <div key={i} className="relative h-4">
                      <div className="absolute inset-x-0 top-0 h-1.5 rounded-full bg-white/10" />
                      <div className="absolute top-2.5 h-1.5 rounded-full bg-[#a6e773]/60" style={{ width: `${w}%` }} />
                    </div>
                  ))}
                </div>
                <div className="mt-auto flex gap-2 border-t border-white/10 pt-4">
                  <div className="h-8 flex-1 rounded-lg border border-white/10 bg-[#051B35]" />
                  <div className="h-8 flex-1 rounded-lg bg-[#a6e773]/90" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FinalPreview() {
  const bars = [40, 66, 52, 80, 70, 92, 88];
  return (
    <div className="rounded-2xl border border-white/10 bg-[#051B35]/80 p-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#9DA2B3]">Platform preview</span>
        <span className="rounded-lg bg-[#a6e773]/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#a6e773]">Sample data</span>
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <span className="text-[12px] font-medium text-[#9DA2B3]">Revenue per event</span>
        <div className="mt-4 flex h-32 items-end gap-1.5">
          {bars.map((h, i) => (
            <div key={i} className="bar flex-1" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[18px] font-semibold tabular-nums text-white">14</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#9DA2B3]">On-sales this month</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[18px] font-semibold tabular-nums text-[#a6e773]">94%</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#9DA2B3]">Door scan success</div>
        </div>
      </div>
    </div>
  );
}
