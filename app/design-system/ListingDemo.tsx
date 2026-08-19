"use client";

import { useState } from "react";
import FilterChip from "@/components/molecules/FilterChip";
import ListingRow from "@/components/molecules/ListingRow";
import Switch from "@/components/atoms/Switch";
import { Ticket } from "@/components/atoms/icons";

/** Live demo of the buy-flow pieces on the design-system page. */
export default function ListingDemo() {
  const [active, setActive] = useState("Section J–L");
  const [on, setOn] = useState(true);
  const [selected, setSelected] = useState(false);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <FilterChip icon={<Ticket className="h-4 w-4" />} active={false}>2+ tickets</FilterChip>
        {["Section A–B", "Section J–L"].map((b) => (
          <FilterChip key={b} active={active === b} onClick={() => setActive(b)}>
            {b}
          </FilterChip>
        ))}
        <span className="ml-2 inline-flex items-center gap-2.5 text-[13.5px] font-medium text-[#BCBFCC]">
          Accessible seating <Switch checked={on} onChange={setOn} label="Accessible seating" />
        </span>
      </div>
      <div className="max-w-[560px] divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/12 bg-[#0a2747]">
        <ListingRow
          sec="K"
          row="A"
          qtyMin={2}
          qtyMax={4}
          price={16.03}
          tier={1}
          accessible
          bestDeal
          selected={selected}
          onClick={() => setSelected((v) => !v)}
        />
        <ListingRow sec="C" row="E" qtyMin={2} qtyMax={6} price={18.92} tier={2} />
      </div>
      <p className="text-[12px] text-[#9DA2B3]">Click the row to select it — selection is the green “act here” state. Prices are always all-in.</p>
    </div>
  );
}
