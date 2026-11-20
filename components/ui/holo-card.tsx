"use client";

import * as React from "react";
import type { CardTheme } from "@/lib/cardTheme";
import { cn } from "@/lib/utils";

/* HoloCard: a card face with a thin-film hologram. It tilts a little toward the cursor (or the phone), and the foil,
   sheen and glare follow the light. No flip, no spin. The colours come from a CardTheme (lib/cardTheme.ts): a tier's
   step, or a colour the backend sends. The content is whatever you put inside; text inherits the theme's ink.
   The loop only runs while the light is moving and stops when it settles. Reduced motion: no tilt, the light still follows. */
export type HoloCardProps = {
  theme: CardTheme;
  /** max tilt in degrees. Default 10. */
  maxTilt?: number;
  /** multiplies the theme's foil strength. Default 1. */
  foil?: number;
  /** follow the phone's tilt where it needs no permission. Default true. */
  motion?: boolean;
  /** width over height. Default 1.586 (a bank card); a larger number is a shorter card, for a small screen. */
  aspect?: number;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ComponentProps<"div">, "children" | "className">;

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9 .02' numOctaves='2' seed='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const CSS = `
.hc-face{position:absolute;inset:0;border-radius:20px;overflow:hidden;color:var(--hc-ink);
  background:linear-gradient(135deg,var(--hc-a) 0%,var(--hc-b) 38%,var(--hc-c) 62%,var(--hc-d) 100%);
  box-shadow:inset 0 0 0 .5px rgb(0 0 0 / .1),inset 0 1px 0 rgb(255 255 255 / .55)}
.hc-layer{position:absolute;pointer-events:none}
.hc-grain{inset:0;opacity:.35;mix-blend-mode:soft-light;background-image:${GRAIN};background-size:200px 200px}
.hc-film{inset:-30%;mix-blend-mode:var(--hc-blend,multiply);opacity:calc(var(--ho,.6) * var(--foil,1) * var(--hc-film,1));
  background:linear-gradient(115deg,#ffd9ec 0%,#ffe6cf 12%,#fff6c9 22%,#d4f7e4 34%,#c9ecff 46%,#d9d4ff 58%,#f6d0ff 70%,#ffd9ec 82%,#ffe6cf 100%);
  background-size:300% 300%;background-position:var(--hx,50%) var(--hy,50%);
  -webkit-mask-image:radial-gradient(85% 110% at var(--mx,50%) var(--my,50%),#000 0%,rgb(0 0 0 / .55) 50%,rgb(0 0 0 / .15) 85%);
  mask-image:radial-gradient(85% 110% at var(--mx,50%) var(--my,50%),#000 0%,rgb(0 0 0 / .55) 50%,rgb(0 0 0 / .15) 85%)}
.hc-film2{inset:-30%;mix-blend-mode:color;opacity:calc(var(--ho,.6) * .55 * var(--foil,1));
  background:conic-gradient(from var(--ca,0deg) at var(--mx,50%) var(--my,50%),#ff9ad5,#ffc58f,#fff08f,#9ff0c6,#8fd6ff,#b8a6ff,#ff9ad5);
  -webkit-mask-image:radial-gradient(60% 80% at var(--mx,50%) var(--my,50%),#000,transparent 75%);
  mask-image:radial-gradient(60% 80% at var(--mx,50%) var(--my,50%),#000,transparent 75%)}
.hc-lines{inset:0;mix-blend-mode:soft-light;opacity:calc(var(--ho,.6) * .5 * var(--foil,1));
  background:repeating-linear-gradient(115deg,rgb(255 255 255 / .9) 0 1px,transparent 1px 3px)}
.hc-streak{inset:-40%;mix-blend-mode:soft-light;opacity:.9;transform:translateX(var(--st,0%));
  background:linear-gradient(115deg,transparent 42%,rgb(255 255 255 / .95) 49%,rgb(255 255 255 / .95) 51%,transparent 58%)}
.hc-glare{inset:0;mix-blend-mode:screen;background:radial-gradient(45% 65% at var(--mx,50%) var(--my,50%),rgb(255 255 255 / .55),rgb(255 255 255 / 0) 65%)}
.hc-edge{inset:0;border-radius:20px;padding:1px;
  background:linear-gradient(var(--ea,135deg),rgb(255 255 255 / .9),rgb(0 0 0 / .06) 30%,rgb(0 0 0 / .04) 70%,rgb(255 255 255 / .7));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
`;

export function HoloCard({ theme, maxTilt = 10, foil = 1, motion = true, aspect = 1.586, className, children, style, ...rest }: HoloCardProps) {
  const stage = React.useRef<HTMLDivElement>(null);
  const card = React.useRef<HTMLDivElement>(null);
  const shadow = React.useRef<HTMLDivElement>(null);
  const st = React.useRef({ tx: 0, ty: 0, ttx: 0, tty: 0, lx: 0.5, ly: 0.35, tlx: 0.5, tly: 0.35, raf: 0 });
  const reduce = React.useRef(false);
  const pressed = React.useRef(false);

  const apply = React.useCallback(() => {
    const s = st.current;
    const el = card.current;
    if (!el) return;
    el.style.transform = `rotateX(${s.tx}deg) rotateY(${s.ty}deg)`;
    const mx = s.lx * 100;
    const my = s.ly * 100;
    el.style.setProperty("--mx", `${mx}%`);
    el.style.setProperty("--my", `${my}%`);
    el.style.setProperty("--hx", `${mx * 1.6}%`);
    el.style.setProperty("--hy", `${my * 1.2}%`);
    el.style.setProperty("--ho", (0.45 + Math.min(0.5, (Math.abs(s.tx) + Math.abs(s.ty)) / 26 + Math.abs(s.lx - 0.5) * 0.5)).toFixed(3));
    el.style.setProperty("--ca", `${s.ty * 6 + s.lx * 120}deg`);
    el.style.setProperty("--st", `${s.ty * 4 + (s.lx - 0.5) * 60}%`);
    el.style.setProperty("--ea", `${135 + s.ty * 3}deg`);
    if (shadow.current) shadow.current.style.transform = `translateX(${-s.ty * 1.4}px)`;
  }, []);

  const tick = React.useCallback(() => {
    const s = st.current;
    s.tx += (s.ttx - s.tx) * 0.12;
    s.ty += (s.tty - s.ty) * 0.12;
    s.lx += (s.tlx - s.lx) * 0.12;
    s.ly += (s.tly - s.ly) * 0.12;
    apply();
    const settled = Math.abs(s.ttx - s.tx) + Math.abs(s.tty - s.ty) + Math.abs(s.tlx - s.lx) + Math.abs(s.tly - s.ly) < 0.002;
    s.raf = settled ? 0 : requestAnimationFrame(tick);
  }, [apply]);
  const kick = React.useCallback(() => { if (!st.current.raf) st.current.raf = requestAnimationFrame(tick); }, [tick]);

  React.useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    apply();
    const s = st.current;
    return () => { if (s.raf) cancelAnimationFrame(s.raf); s.raf = 0; };
  }, [apply]);

  /* phones: follow the tilt where no permission is needed (iOS asks first, so it stays still there) */
  React.useEffect(() => {
    if (!motion || !window.matchMedia("(hover: none)").matches) return;
    const DOE = (typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent : undefined) as unknown as { requestPermission?: unknown } | undefined;
    if (!DOE || typeof DOE.requestPermission === "function") return;
    const on = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      const s = st.current;
      const m = reduce.current ? 0 : maxTilt;
      s.ttx = Math.max(-m, Math.min(m, -(e.beta - 45) * 0.5));
      s.tty = Math.max(-m, Math.min(m, e.gamma * 0.6));
      s.tlx = 0.5 + e.gamma / 90;
      s.tly = 0.5 + (e.beta - 45) / 90;
      kick();
    };
    window.addEventListener("deviceorientation", on);
    return () => window.removeEventListener("deviceorientation", on);
  }, [motion, maxTilt, kick]);

  /* a mouse moves the light on hover; a finger or pen does it while pressed (vertical drags still scroll the page) */
  const onMove = (e: React.PointerEvent) => {
    if (!stage.current || (e.pointerType !== "mouse" && !pressed.current)) return;
    const r = stage.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const s = st.current;
    const m = reduce.current ? 0 : maxTilt;
    s.tlx = px;
    s.tly = py;
    s.tty = (px - 0.5) * 2 * m;
    s.ttx = -(py - 0.5) * 2 * m;
    kick();
  };
  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    pressed.current = true;
    onMove(e);
  };
  const onLeave = () => {
    pressed.current = false;
    const s = st.current;
    s.ttx = 0; s.tty = 0; s.tlx = 0.5; s.tly = 0.35;
    kick();
  };

  const vars = {
    ["--hc-a" as string]: theme.stops[0], ["--hc-b" as string]: theme.stops[1], ["--hc-c" as string]: theme.stops[2], ["--hc-d" as string]: theme.stops[3],
    ["--hc-ink" as string]: theme.ink, ["--hc-blend" as string]: theme.dark ? "screen" : "multiply", ["--hc-film" as string]: theme.dark ? 0.55 : 1,
    ["--foil" as string]: String(theme.foil * foil),
  } as React.CSSProperties;

  return (
    <div className={cn("relative w-full", className)} style={style} {...rest}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div ref={stage} className="relative w-full select-none" style={{ aspectRatio: String(aspect), perspective: 1100, touchAction: "pan-y", WebkitTapHighlightColor: "transparent" }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onLeave} onPointerCancel={onLeave} onPointerLeave={onLeave}>
        <div ref={shadow} aria-hidden className="pointer-events-none absolute -bottom-3 left-[10%] right-[10%] h-8 rounded-[50%] bg-black/25 blur-[20px]" />
        <div ref={card} className="absolute inset-0" style={{ transformStyle: "preserve-3d", willChange: "transform", ...vars }}>
          <div className="hc-face">
            <div className="hc-layer hc-grain" />
            <div className="hc-layer hc-film" />
            <div className="hc-layer hc-film2" />
            <div className="hc-layer hc-lines" />
            <div className="hc-layer hc-streak" />
            <div className="hc-layer hc-glare" />
            <div className="absolute inset-0">{children}</div>
            <div className="hc-layer hc-edge" />
          </div>
        </div>
      </div>
    </div>
  );
}
