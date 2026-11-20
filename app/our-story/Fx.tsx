"use client";

import { useEffect } from "react";

/* Pointer and view interactions for /our-story. Nothing here is tied to scroll position: tilt follows a fine
   pointer (desktop), the belief spotlight is a class toggle from an IntersectionObserver, and the gap scene replays
   on click. Writes are CSS custom properties or classes only, throttled to one per animation frame. The page works
   without this component; it adds "os-fx" to the root once it runs, and the dim states only exist then. */
export default function Fx() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".n");
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    root.classList.add("os-fx");
    const undo: (() => void)[] = [() => root.classList.remove("os-fx")];

    /* tilt: elements with data-tilt lean toward the pointer */
    if (fine && !reduce) {
      document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((el) => {
        const max = parseFloat(el.dataset.tilt || "6");
        let raf = 0, nx = 0, ny = 0;
        const paint = () => {
          raf = 0;
          el.style.setProperty("--ry", `${(nx * max).toFixed(2)}deg`);
          el.style.setProperty("--rx", `${(-ny * max).toFixed(2)}deg`);
        };
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          nx = ((e.clientX - r.left) / r.width) * 2 - 1;
          ny = ((e.clientY - r.top) / r.height) * 2 - 1;
          if (!raf) raf = requestAnimationFrame(paint);
        };
        const leave = () => { nx = 0; ny = 0; if (!raf) raf = requestAnimationFrame(paint); };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", leave);
        undo.push(() => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); if (raf) cancelAnimationFrame(raf); });
      });
    }

    /* the gap scene replays when clicked: two identical sets of keyframes are swapped so the animation restarts */
    const art = document.querySelector<HTMLElement>(".os-art");
    if (art) {
      const click = () => art.classList.toggle("b");
      art.addEventListener("click", click);
      undo.push(() => art.removeEventListener("click", click));
    }

    /* beliefs: the line crossing the middle of the screen is the one in the spotlight; hover or focus moves it */
    const items = Array.from(document.querySelectorAll<HTMLElement>(".os-cred li"));
    if (items.length) {
      const set = (el: HTMLElement) => items.forEach((i) => i.classList.toggle("is-on", i === el));
      set(items[0]);
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) set(e.target as HTMLElement); });
      }, { rootMargin: "-42% 0px -42% 0px" });
      items.forEach((i) => io.observe(i));
      const offs: (() => void)[] = [];
      if (fine) items.forEach((i) => { const h = () => set(i); i.addEventListener("pointerenter", h); i.addEventListener("focusin", h); offs.push(() => { i.removeEventListener("pointerenter", h); i.removeEventListener("focusin", h); }); });
      undo.push(() => { io.disconnect(); offs.forEach((f) => f()); });
    }

    return () => undo.forEach((f) => f());
  }, []);
  return null;
}
