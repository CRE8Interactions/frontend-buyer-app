/*
Adapted from the parked KokonutUI "Tear Button" (parked/tear-button), MIT License, Copyright (c) 2025 kokonutUI, https://kokonutui.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
"use client";

/* What changed for Blocktickets: the button is as wide as its column (the body takes what the stub leaves), it is the accent colour of the site, the page can
   refuse a tear until the form is right (`onAttempt`, with a shake), it can be disabled (an expired hold), and the page can print a fresh stub (`resetToken`)
   after a declined card. The tear itself, the stick-slip holes, the swing, the throw and the fall, are the original's. From the keyboard the stub tears itself. */

import { type KeyboardEvent, type PointerEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const HEIGHT = 72;
const STUB_WIDTH = 84;
// How far (deg) the stub swings, about the foot of the perforation, before the last fibre gives.
const TEAR_ANGLE = 34;
// The perforation tears hole by hole: each one holds for a moment, then gives. That stick-slip is what makes it feel like paper.
const HOLES = 7;
const HOLD = 0.55;
const HOLD_SHARE = 0.3;
// The stub's swing chases the hand on a stiff spring, so the slips snap.
const SWING_STIFFNESS = 900;
const SWING_DAMPING = 42;
const RETURN_STIFFNESS = 520;
const RETURN_DAMPING = 22;
// Once free: px and seconds.
const GRAVITY = 2600;
const FALL_DISTANCE = 240;
const STEP = 1 / 120;
// Ragged edge of the tear, as offsets in px along the perforation.
const FIBRES = [1.6, 0.4, 2.2, 0.9, 1.8, 0.2, 2.4, 1.1, 0.5, 2, 1.4, 0.3, 2.3, 0.8, 1.7, 0.1, 2.1, 1.2, 0.6, 1.9];
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

type Phase = "idle" | "tearing" | "flying" | "torn";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function haptic(ms: number) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
}

/** Raw pull (0..1+) to how far the tear has run, holding at each hole. */
function stickSlip(pull: number) {
  const scaled = clamp(pull, 0, 1) * HOLES;
  const hole = Math.min(Math.floor(scaled), HOLES - 1);
  const f = scaled - hole;
  const given = f < HOLD ? (f / HOLD) * HOLD_SHARE : HOLD_SHARE + ((f - HOLD) / (1 - HOLD)) * (1 - HOLD_SHARE);
  return (hole + given) / HOLES;
}

/** One side of the tear as a clip-path: ragged down to `tip` (px from the top), straight below. `side` is 1 for the body's right edge, -1 for the stub's left edge. */
function tornEdge(tip: number, width: number, side: 1 | -1) {
  const points: string[] = [];
  const edge = side === 1 ? width : 0;
  const far = side === 1 ? 0 : width;
  points.push(`${far}px 0px`);
  const rows = Math.ceil((tip / HEIGHT) * FIBRES.length);
  for (let k = 0; k <= rows; k++) {
    const y = Math.min((k / FIBRES.length) * HEIGHT, tip);
    const x = edge - side * FIBRES[k % FIBRES.length];
    points.push(`${x.toFixed(1)}px ${y.toFixed(1)}px`);
  }
  points.push(`${edge}px ${tip.toFixed(1)}px`, `${edge}px ${HEIGHT}px`, `${far}px ${HEIGHT}px`);
  return `polygon(${points.join(",")})`;
}

// Ticket notches, cut where the perforation meets the top and bottom edges.
const NOTCH = 8;
const bodyMask = `radial-gradient(circle at 100% 0, #0000 ${NOTCH}px, #000 ${NOTCH + 0.5}px) top / 100% 51% no-repeat, radial-gradient(circle at 100% 100%, #0000 ${NOTCH}px, #000 ${NOTCH + 0.5}px) bottom / 100% 51% no-repeat`;
const stubMask = `radial-gradient(circle at 0 0, #0000 ${NOTCH}px, #000 ${NOTCH + 0.5}px) top / 100% 51% no-repeat, radial-gradient(circle at 0 100%, #0000 ${NOTCH}px, #000 ${NOTCH + 0.5}px) bottom / 100% 51% no-repeat`;

export interface TearToPayProps {
  icon: ReactNode;
  label: string;
  description: string;
  stubLabel?: string;
  confirmedLabel: string;
  confirmedDescription: string;
  /** Called once the stub comes away. */
  onConfirm: () => void;
  /** Asked when a tear begins (a drag or a key). Return false to refuse it: the button shakes and the stub stays on. */
  onAttempt?: () => boolean;
  disabled?: boolean;
  /** A new number prints a fresh stub (after a declined card, say). */
  resetToken?: number;
  className?: string;
}

export default function TearToPay({ icon, label, description, stubLabel = "Tear", confirmedLabel, confirmedDescription, onConfirm, onAttempt, disabled = false, resetToken = 0, className }: TearToPayProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [generation, setGeneration] = useState(0);
  const [width, setWidth] = useState(340);
  const [nope, setNope] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const stubRef = useRef<HTMLButtonElement>(null);
  const bodyWidth = Math.max(width - STUB_WIDTH, 140);

  const sim = useRef({
    angle: 0, speed: 0, target: 0, held: false, grabAngle: 0, hole: 0, raf: 0, last: 0, carry: 0,
    // Free flight, once torn.
    x: 0, y: 0, vx: 0, vy: 0, spin: 0,
    // The hand's recent movement, for the throw.
    px: 0, py: 0, pt: 0, pvx: 0, pvy: 0,
    auto: 0, flying: false, reduceMotion: false, bodyW: 0,
  });
  sim.current.bodyW = bodyWidth;

  const latest = useRef({ onConfirm, onAttempt, disabled });
  latest.current = { onConfirm, onAttempt, disabled };

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hinge = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    return rect ? { x: rect.left + sim.current.bodyW, y: rect.top + HEIGHT } : { x: 0, y: 0 };
  }, []);

  const drawTear = useCallback(() => {
    const s = sim.current;
    const tip = clamp(s.angle / TEAR_ANGLE, 0, 1) * HEIGHT;
    const stub = stubRef.current;
    const body = bodyRef.current;
    if (body) body.style.clipPath = tip > 0.5 ? tornEdge(tip, s.bodyW, 1) : "";
    if (stub) {
      stub.style.clipPath = tip > 0.5 ? tornEdge(tip, STUB_WIDTH, -1) : "";
      stub.style.transform = `rotate(${s.angle.toFixed(2)}deg)`;
    }
  }, []);

  const drawFlight = useCallback(() => {
    const s = sim.current;
    const stub = stubRef.current;
    if (!stub) return;
    const fade = clamp(1 - (s.y - FALL_DISTANCE * 0.5) / (FALL_DISTANCE * 0.5), 0, 1);
    stub.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) rotate(${s.angle.toFixed(1)}deg)`;
    stub.style.opacity = fade.toFixed(3);
  }, []);

  const detach = useCallback(() => {
    const s = sim.current;
    s.held = false;
    haptic(14);
    // The stub leaves with the swing it had, plus the hand's throw.
    const rad = (s.angle * Math.PI) / 180;
    const tangential = ((s.speed * Math.PI) / 180) * HEIGHT;
    s.x = 0;
    s.y = 0;
    s.vx = Math.cos(rad) * tangential + clamp(s.pvx, -900, 900) * 0.6 + 90;
    s.vy = Math.sin(rad) * tangential + clamp(s.pvy, -900, 900) * 0.6 - 120;
    s.spin = s.speed * 0.6 + 140;
    s.flying = true;
    if (stubRef.current) stubRef.current.style.transition = "none";
    setPhase("flying");
    latest.current.onConfirm();
  }, []);

  // While attached: the swing chases its target, held or springing home.
  const stepSwing = useCallback(() => {
    const s = sim.current;
    const stiffness = s.held || s.auto ? SWING_STIFFNESS : RETURN_STIFFNESS;
    const damping = s.held || s.auto ? SWING_DAMPING : RETURN_DAMPING;
    const force = (s.target - s.angle) * stiffness - s.speed * damping;
    s.speed += force * STEP;
    s.angle += s.speed * STEP;
    // A tick for each hole that gives.
    const hole = Math.floor(clamp(s.angle / TEAR_ANGLE, 0, 1) * HOLES);
    if (hole > s.hole) haptic(3);
    s.hole = hole;
    return s.angle >= TEAR_ANGLE * 0.995;
  }, []);

  const stepFlight = useCallback(() => {
    const s = sim.current;
    s.vy += GRAVITY * STEP;
    s.x += s.vx * STEP;
    s.y += s.vy * STEP;
    s.angle += s.spin * STEP;
    return s.y > FALL_DISTANCE;
  }, []);

  // Runs the fixed steps owed since the last frame; true once this phase is over (the stub tore through, or it has fallen out of sight).
  const advance = useCallback((elapsed: number) => {
    const s = sim.current;
    s.carry += elapsed;
    let finished = false;
    while (s.carry >= STEP && !finished) {
      s.carry -= STEP;
      if (s.flying) finished = stepFlight();
      else if (s.auto) {
        s.target = Math.min(s.target + STEP * 60, TEAR_ANGLE * 1.05);
        finished = stepSwing();
      } else finished = stepSwing() && s.held;
    }
    return finished;
  }, [stepFlight, stepSwing]);

  const tick = useCallback((now: number) => {
    const s = sim.current;
    s.raf = 0;
    const elapsed = s.last ? Math.min((now - s.last) / 1000, 0.05) : STEP;
    s.last = now;
    const { flying } = s;
    const finished = advance(elapsed);
    if (flying) {
      drawFlight();
      if (finished) { s.last = 0; setPhase("torn"); return; }
      s.raf = requestAnimationFrame(tick);
      return;
    }
    drawTear();
    if (finished) {
      s.auto = 0;
      detach();
      s.raf = requestAnimationFrame(tick);
      return;
    }
    const resting = !(s.held || s.auto) && Math.abs(s.angle) < 0.02 && Math.abs(s.speed) < 0.05;
    if (!resting) { s.raf = requestAnimationFrame(tick); return; }
    s.angle = 0; s.speed = 0; s.last = 0;
    drawTear();
    setPhase("idle");
  }, [advance, detach, drawFlight, drawTear]);

  const wake = useCallback(() => {
    const s = sim.current;
    if (!s.raf) s.raf = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    const s = sim.current;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    s.reduceMotion = query.matches;
    const onChange = () => { s.reduceMotion = query.matches; };
    query.addEventListener("change", onChange);
    return () => { query.removeEventListener("change", onChange); cancelAnimationFrame(s.raf); s.raf = 0; };
  }, []);

  // A fresh stub when the page asks for one.
  const firstReset = useRef(true);
  useEffect(() => {
    if (firstReset.current) { firstReset.current = false; return; }
    const s = sim.current;
    cancelAnimationFrame(s.raf);
    s.raf = 0; s.last = 0; s.angle = 0; s.speed = 0; s.target = 0; s.hole = 0; s.flying = false; s.auto = 0; s.held = false;
    if (bodyRef.current) bodyRef.current.style.clipPath = "";
    setGeneration((g) => g + 1);
    setPhase("idle");
  }, [resetToken]);

  // In reduced motion the stub doesn't fall: it fades where it tore.
  useEffect(() => {
    if (phase !== "flying" || !sim.current.reduceMotion) return;
    const s = sim.current;
    cancelAnimationFrame(s.raf);
    s.raf = 0; s.last = 0;
    const stub = stubRef.current;
    if (stub) { stub.style.transition = `opacity 180ms ${EASE_OUT}`; stub.style.opacity = "0"; }
    const id = window.setTimeout(() => setPhase("torn"), 180);
    return () => window.clearTimeout(id);
  }, [phase]);

  /** The page's say before a tear begins: false means the form is not right yet. */
  const allowed = () => {
    if (latest.current.disabled) return false;
    if (latest.current.onAttempt && !latest.current.onAttempt()) {
      haptic(20);
      setNope(true);
      window.setTimeout(() => setNope(false), 420);
      return false;
    }
    return true;
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    const s = sim.current;
    if (phase === "flying" || phase === "torn") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    if (!allowed()) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const h = hinge();
    s.grabAngle = (Math.atan2(event.clientY - h.y, event.clientX - h.x) * 180) / Math.PI - s.angle;
    s.held = true;
    s.px = event.clientX; s.py = event.clientY; s.pt = event.timeStamp; s.pvx = 0; s.pvy = 0;
    setPhase("tearing");
    wake();
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const s = sim.current;
    if (!s.held) return;
    const dt = event.timeStamp - s.pt;
    if (dt > 0) {
      s.pvx = s.pvx * 0.5 + ((event.clientX - s.px) / dt) * 500;
      s.pvy = s.pvy * 0.5 + ((event.clientY - s.py) / dt) * 500;
    }
    s.px = event.clientX; s.py = event.clientY; s.pt = event.timeStamp;
    const h = hinge();
    const raw = (Math.atan2(event.clientY - h.y, event.clientX - h.x) * 180) / Math.PI - s.grabAngle;
    // Pushing the stub back into the body only gives a little.
    const pull = raw < 0 ? raw * 0.15 : raw;
    s.target = pull >= TEAR_ANGLE ? TEAR_ANGLE * 1.05 : stickSlip(Math.max(pull, 0) / TEAR_ANGLE) * TEAR_ANGLE + Math.min(pull, 0);
    wake();
  };

  const handlePointerUp = () => {
    const s = sim.current;
    if (!s.held) return;
    s.held = false;
    // Pulled past the last hole when let go (a flick): the stub finishes the tear by itself. Otherwise it swings back and the perforation holds.
    if (s.target >= TEAR_ANGLE) s.auto = 1;
    else s.target = 0;
    wake();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const s = sim.current;
    if (phase !== "idle" || event.repeat) return;
    if (!allowed()) return;
    // From the keyboard the stub tears itself, hole by hole.
    s.auto = 1;
    s.target = 0;
    setPhase("tearing");
    wake();
  };

  /* Tapping the body does what the keyboard does: the stub tears itself, hole by hole (so it still validates the form, shakes when refused, and plays the whole tear).
     The stub is for pulling it yourself; the body is for people who just want to pay. */
  const tearByTap = () => {
    const s = sim.current;
    if (phase !== "idle") return;
    if (!allowed()) return;
    s.auto = 1;
    s.target = 0;
    setPhase("tearing");
    wake();
  };

  const done = phase === "flying" || phase === "torn";

  return (
    <div className={cn("relative w-full select-none", nope && "cx-nope", className)} ref={rootRef} style={{ height: HEIGHT }}>
      <div
        className={cn("absolute inset-y-0 left-0 flex items-center gap-3 rounded-l-[20px] bg-h-accent px-4 text-h-accent-foreground [-webkit-tap-highlight-color:transparent]", phase === "idle" && !disabled && "cursor-pointer active:brightness-90 [@media(hover:hover)]:hover:brightness-95")}
        onClick={tearByTap}
        ref={bodyRef}
        style={{ width: bodyWidth, mask: bodyMask, WebkitMask: bodyMask, opacity: disabled ? 0.45 : 1, transition: "opacity 200ms" }}
      >
        <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ease-out", done ? "bg-h-accent-foreground text-h-accent" : "bg-h-accent-foreground/15")}>
          {done ? (
            <svg aria-hidden="true" className="size-[18px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          ) : icon}
        </span>
        <span className="relative grid min-w-0 flex-1">
          {[
            { key: "ask", on: !done, title: label, sub: description },
            { key: "done", on: done, title: confirmedLabel, sub: confirmedDescription },
          ].map((line) => (
            <span
              aria-hidden={!line.on}
              className={cn("col-start-1 row-start-1 min-w-0 transition-[opacity,filter,translate] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-opacity", line.on ? "translate-y-0 opacity-100 blur-0" : "pointer-events-none translate-y-1 opacity-0 blur-[3px]")}
              key={line.key}
            >
              <span className="block truncate text-base font-semibold tracking-[-0.01em] tabular-nums">{line.title}</span>
              <span className="block truncate text-xs text-h-accent-foreground/75">{line.sub}</span>
            </span>
          ))}
        </span>
      </div>

      {phase === "torn" ? null : (
        <button
          aria-disabled={disabled || undefined}
          aria-label={`${label}: ${description}. Press Enter to tear the stub.`}
          className={cn(
            "absolute inset-y-0 flex touch-none flex-col items-center justify-center gap-1 rounded-r-[20px] bg-h-accent text-h-accent-foreground/80 outline-none focus-visible:ring-2 focus-visible:ring-h-focus focus-visible:ring-offset-2 focus-visible:ring-offset-h-surface",
            "starting:-translate-x-3 starting:opacity-0 transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
            disabled ? "cursor-not-allowed opacity-45" : phase === "tearing" ? "cursor-grabbing" : "cursor-grab"
          )}
          // A new stub per tear, so no inline style from the last one lingers.
          key={generation}
          onKeyDown={handleKeyDown}
          onLostPointerCapture={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          ref={stubRef}
          style={{ left: bodyWidth, width: STUB_WIDTH, mask: stubMask, WebkitMask: stubMask, transformOrigin: "0 100%" }}
          type="button"
        >
          {/* The perforation. */}
          <span aria-hidden="true" className="absolute inset-y-2.5 left-0 border-l-2 border-dotted border-h-accent-foreground/40" />
          <svg aria-hidden="true" className="size-[18px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24"><path d="M6 6c6 0 12 3 12 11M14 14l4 4 4-4" /></svg>
          <span className="text-xs font-semibold">{stubLabel}</span>
        </button>
      )}
      <span aria-live="polite" className="sr-only">{done ? confirmedLabel : ""}</span>
    </div>
  );
}
