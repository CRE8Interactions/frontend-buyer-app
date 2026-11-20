"use client";

import { useRef } from "react";
import Button from "@/components/atoms/Button";

/* Closing banner: a ticket is printed out of a slot, then tilts and catches the light as the pointer moves over
   it. The print runs once when it scrolls into view. The tear-off stub carries the block pattern from the brand
   mark, so it reads as "your block". Tilt is a pointer effect only; nothing here is needed to read or click. */
const BLOCKS = Array.from({ length: 25 }, (_, i) => ((i * 7 + (i >> 2) * 3) % 5) < 2 || i === 12);

export default function CtaTicket() {
  const ref = useRef<HTMLDivElement>(null);

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 7).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 9).toFixed(2)}deg`);
    el.style.setProperty("--sx", `${((x + 0.5) * 100).toFixed(1)}%`);
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <div className="ct">
      <div className="ct-slot" aria-hidden="true"><i /></div>
      <div className="ct-window">
        <div className="ct-ticket" ref={ref} onPointerMove={move} onPointerLeave={leave}>
          <div className="ct-main">
            <p className="ct-top"><span>Admit one</span><span>No. 0001</span></p>
            <h2>Ready to <span>build bigger?</span></h2>
            <p className="ct-sub">Book a walkthrough and we’ll show you the entire platform.</p>
            <Button href="/sell">
              Schedule a discovery call
              <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
            </Button>
          </div>
          <div className="ct-stub" aria-hidden="true">
            <div className="ct-blocks">{BLOCKS.map((on, i) => <i key={i} className={on ? "on" : ""} style={{ ["--i" as string]: i }} />)}</div>
            <span className="ct-tag">Block by Block</span>
          </div>
          <i className="ct-shine" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
