"use client";

import { useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";

/* The team as a rack of jerseys. Each one hangs on the rail showing its back, the way a shirt hangs in a locker room: first name, curved across the shoulders, over
   the number. Tap or click a jersey and it turns around on its peg to show the front with the emblem. They sway on the rail all
   the time, lift when pointed at, and when a filter chip is picked the whole rack is hung again, one after another, with the
   chosen group lit and the others dimmed. The last peg holds an empty jersey. */
export type Person = { name: string; role: string; g: "build" | "grow" | "ops" };

const GROUPS = [
  { id: "all", label: "Everyone" },
  { id: "build", label: "Engineering & product" },
  { id: "grow", label: "Growth & partnerships" },
  { id: "ops", label: "Operations & success" },
] as const;

const BODY = "M32 10 L50 4 Q60 17 70 4 L88 10 L116 34 L104 56 L90 47 L90 124 Q90 128 86 128 L34 128 Q30 128 30 124 L30 47 L16 56 L4 34 Z";

/* the print on each group's shirt, clipped to the body */
function Pattern({ g }: { g: Person["g"] | "open" }) {
  if (g === "build") return <g clipPath="url(#jr-clip)" className="pat"><path d="M0 20H120" className="hoop" /><path d="M0 25H120" className="hoop thin" /></g>;
  if (g === "grow") return <g clipPath="url(#jr-clip)" className="pat"><path d="M33.5 40V134M86.5 40V134" className="sash" /></g>;
  if (g === "ops") return <g clipPath="url(#jr-clip)" className="pat"><path d="M40 0V134M50 0V134M60 0V134M70 0V134M80 0V134" className="pin" /></g>;
  return null;
}

function Shirt({ g, children }: { g: Person["g"] | "open"; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 120 134" aria-hidden="true">
      <path className="body" d={BODY} />
      <Pattern g={g} />
      <path className="shade" d={BODY} /><path className="shade" d={BODY} style={{ fill: "url(#jr-hem)" }} />
      <path className="cuff" d="M4 34 L16 56 M116 34 L104 56" />
      <path className="stripe" d="M9 39 L22 54 M14 33 L27 47 M111 39 L98 54 M106 33 L93 47" />
      <path className="stripe" d="M30 112 H90 M30 119 H90" />
      <path className="collar" d="M50 4 Q60 17 70 4" />
      {children}
    </svg>
  );
}

export default function Lineup({ people }: { people: Person[] }) {
  const [f, setF] = useState<(typeof GROUPS)[number]["id"]>("all");
  const [turned, setTurned] = useState<Set<string>>(new Set());
  const count = (id: string) => (id === "all" ? people.length : people.filter((p) => p.g === id).length);
  const turn = (k: string) => setTurned((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const everyone = [...people.map((p) => ({ ...p, key: p.name })), { name: "Your name here", role: "This spot is open", g: "open" as const, key: "open" }];
  return (
    <div className="os-lineup">
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
        <defs>
          <clipPath id="jr-clip"><path d={BODY} /></clipPath>
          <path id="jr-arc" d="M33 42 Q60 30 87 42" />
          <linearGradient id="jr-shade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity=".2" /><stop offset=".2" stopColor="#000" stopOpacity="0" />
            <stop offset=".58" stopColor="#fff" stopOpacity=".12" /><stop offset="1" stopColor="#000" stopOpacity=".24" />
          </linearGradient>
          <linearGradient id="jr-hem" x1="0" y1="0" x2="0" y2="1">
            <stop offset=".62" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".16" />
          </linearGradient>
          <mask id="jr-em" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" x="0" y="0" width="1" height="1" style={{ maskType: "alpha" }}>
            <image href="/blocktickets-emblem-navy.svg" x="0" y="0" width="1" height="1" preserveAspectRatio="xMidYMid meet" />
          </mask>
        </defs>
      </svg>
      <div className="os-chips" role="group" aria-label="Show the team by group">
        {GROUPS.map((g) => (
          <Button key={g.id} variant={f === g.id ? "primary" : "secondary"} size="sm" aria-pressed={f === g.id} onClick={() => setF(g.id)}>
            {g.label}<small className="os-cnt">{count(g.id)}</small>
          </Button>
        ))}
      </div>
      <p className="os-tip"><ArrowsClockwise weight="bold" aria-hidden />Tap a jersey to turn it around</p>
      <ol className="os-rack" key={f}>
        {everyone.map((p, i) => {
          const open = p.g === "open";
          const dim = f !== "all" && (open || p.g !== f);
          const on = f !== "all" && !open && p.g === f;
          const first = p.name.split(" ")[0].toUpperCase();
          return (
            <li key={p.key} className={`os-jersey g-${open ? "open" : p.g}${open ? " os-open" : ""}${dim ? " dim" : ""}${on ? " lit" : ""}${turned.has(p.key) ? " turned" : ""}`} style={{ ["--j" as string]: i }}>
              <button type="button" className="os-jb" aria-pressed={turned.has(p.key)} aria-label={`${p.name}, ${p.role}. Turn the jersey around`} onClick={() => turn(p.key)}>
                <span className="os-jv">
                  <span className="os-sw">
                    <span className="os-fl">
                      <span className="os-face os-back">
                        <Shirt g={p.g}>
                          <text className="nm" style={{ fontSize: Math.min(12, 50 / (0.74 * (open ? 3 : first.length))) }}><textPath href="#jr-arc" startOffset="50%" textAnchor="middle">{open ? "YOU" : first}</textPath></text>
                          <text className="no" x="60" y="102" textAnchor="middle" textLength={open ? undefined : 48} lengthAdjust="spacingAndGlyphs">{open ? "?" : String(i + 1).padStart(2, "0")}</text>
                        </Shirt>
                      </span>
                      <span className="os-face os-front">
                        <Shirt g={p.g}>
                          {open ? <text className="no" x="60" y="86" textAnchor="middle">+</text> : (
                            <>
                              <rect className="em" x="43" y="30" width="34" height="37" mask="url(#jr-em)" />
                              <text className="nm sm" x="60" y="90" textAnchor="middle" textLength={Math.min(50, first.length * 7)} lengthAdjust="spacing">{first}</text>
                            </>
                          )}
                        </Shirt>
                      </span>
                    </span>
                  </span>
                </span>
              </button>
              <div className="os-plate-j"><b>{p.name}</b><span>{p.role}</span></div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
