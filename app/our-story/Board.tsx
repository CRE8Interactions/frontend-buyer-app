"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

/* The starting lineup as a tactics board. Everyone stands in formation by what they do (the people who build at the
   back, operations in the middle, growth up front). Each player is a magnet: drag it anywhere on the board, pick it
   (hover, focus or tap) to light it up and read the role below. "Reset formation" springs everyone back.
   Names are always on the board, so nothing depends on hover. Positions are percentages of the board, one set for
   wide boards (x, y) and one for tall phone boards (mx, my); see .os-pl in styles.ts. */
export type Player = { name: string; role: string; g: "build" | "ops" | "grow" };

const SPOTS: Record<Player["g"], { x: number; y: number; mx: number; my: number }[]> = {
  build: [{ x: 11, y: 34, mx: 27, my: 66 }, { x: 31, y: 34, mx: 73, my: 66 }, { x: 11, y: 74, mx: 27, my: 87 }, { x: 31, y: 74, mx: 73, my: 87 }],
  ops: [{ x: 54.5, y: 34, mx: 27, my: 41 }, { x: 54.5, y: 74, mx: 73, my: 41 }],
  grow: [{ x: 83.5, y: 34, mx: 27, my: 16 }, { x: 83.5, y: 74, mx: 73, my: 16 }],
};
const ZONES = [
  { id: "build", label: "Engineering & product" },
  { id: "ops", label: "Operations & success" },
  { id: "grow", label: "Growth & partnerships" },
] as const;

const initials = (n: string) => { const w = n.split(" "); return (w[0][0] + w[w.length - 1][0]).toUpperCase(); };

function Magnet({ p, on, pick, moved, home, board }: { p: Player; on: boolean; pick: () => void; moved: () => void; home: number; board: RefObject<HTMLDivElement | null> }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  useEffect(() => {
    if (!home) return;
    const a = animate(x, 0, { type: "spring", duration: 0.55, bounce: 0.2 });
    const b = animate(y, 0, { type: "spring", duration: 0.55, bounce: 0.2 });
    return () => { a.stop(); b.stop(); };
  }, [home, x, y]);
  return (
    <motion.button
      type="button" className="os-p" aria-pressed={on} style={{ x, y }}
      drag dragConstraints={board} dragElastic={0.12} dragMomentum={false}
      whileDrag={{ scale: 1.06 }} whileTap={{ scale: 0.97 }}
      onDragStart={() => { pick(); moved(); }} onTap={pick} onFocus={pick} onPointerEnter={(e) => { if (e.pointerType === "mouse") pick(); }}
    >
      <span className="os-dot" aria-hidden="true">{initials(p.name)}</span>
      <b>{p.name}</b>
      <span className="os-prole">{p.role}</span>
    </motion.button>
  );
}

export default function Board({ people }: { people: Player[] }) {
  const board = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [home, setHome] = useState(0);
  const seen: Record<string, number> = {};
  const picked = people.find((p) => p.name === sel);
  return (
    <div className="os-board">
      <div className="os-pitch" ref={board}>
        {ZONES.map((z) => <span key={z.id} className={`os-zone os-z-${z.id}`}>{z.label}</span>)}
        <i className="os-div os-div1" /><i className="os-div os-div2" />
        <ul>
          {people.map((p, i) => {
            const s = SPOTS[p.g][(seen[p.g] = (seen[p.g] ?? -1) + 1)];
            return (
              <li key={p.name} className="os-pl" style={{ ["--x" as string]: `${s.x}%`, ["--y" as string]: `${s.y}%`, ["--mx" as string]: `${s.mx}%`, ["--my" as string]: `${s.my}%`, ["--i" as string]: i }}>
                <Magnet p={p} on={sel === p.name} pick={() => setSel(p.name)} moved={() => setDirty(true)} home={home} board={board} />
              </li>
            );
          })}
        </ul>
      </div>
      <div className="os-board-foot">
        <p aria-live="polite">
          {picked ? <><b>{picked.name}</b><span>{picked.role}</span></> : <span>Drag anyone around the board. Pick a player to see their role.</span>}
        </p>
        {dirty && (
          <Button variant="secondary" size="sm" onClick={() => { setHome((n) => n + 1); setDirty(false); }}>
            <ArrowCounterClockwise weight="bold" /> Reset formation
          </Button>
        )}
      </div>
    </div>
  );
}
