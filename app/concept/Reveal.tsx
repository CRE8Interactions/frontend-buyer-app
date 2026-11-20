"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/* Blur-and-rise reveal on first view (opacity + filter + transform, 700ms,
   cubic-bezier(.22,1,.36,1)). Renders the final state under reduced motion. */
export default function Reveal({ children, delay = 0, as: Tag = "div", className = "" }: {
  children: ReactNode; delay?: number; as?: ElementType; className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setShown(true); io.disconnect(); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    io.observe(el);
    const t = setTimeout(() => setShown(true), 4000);
    return () => { io.disconnect(); clearTimeout(t); };
  }, []);
  return <Tag ref={ref} className={`n-rv ${className}${shown ? " in" : ""}`.trim()} style={{ transitionDelay: `${delay}ms` }}>{children}</Tag>;
}
