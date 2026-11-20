"use client";

import { useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

/* The gap scene. Two worlds drift apart, then the bricks land between them, one at a time; each brick is one of
   the three things the copy says blocktickets combines. The build is a set of one-shot CSS animations (styles.ts)
   that play when the Reveal wrapper gets "in"; "Rebuild" remounts the scene so they play again. */
const BRICKS = ["Enterprise capabilities", "Transparent pricing", "Hands-on support"];

export default function Gap() {
  const [run, setRun] = useState(0);
  return (
    <div className="os-scene">
      <div key={run} className="os-scene-in" role="img" aria-label="Two ticketing worlds, enterprise and budget, with a gap between them. blocktickets bridges it with a staircase of blocks: enterprise capabilities, transparent pricing and hands-on support.">
        <i className="os-gnd" />
        <div className="os-tw os-ent"><b>Enterprise</b><span>Software they couldn’t justify</span></div>
        <i className="os-dim" />
        <i className="os-ext" />
        <span className="os-dim-l">The gap</span>
        {BRICKS.map((b, i) => (
          <i key={b} className={`os-bk os-step os-s${4 - i}`}><b>{b}</b></i>
        ))}
        <i className="os-bk os-step os-s1">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/blocktickets-emblem-navy.svg" alt="" /></i>
        <div className="os-tw os-bud"><b>Budget</b><span>Systems that couldn’t keep up</span></div>
      </div>
      <Button variant="tertiary" size="sm" className="os-again" onClick={() => setRun((n) => n + 1)}>
        <ArrowCounterClockwise weight="bold" /> Rebuild
      </Button>
    </div>
  );
}
