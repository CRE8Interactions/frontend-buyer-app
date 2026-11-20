/* Helpers for the scroll-driven sections. On phones window.innerHeight changes while you scroll (the browser
   toolbar collapses and expands), which made every progress value jump and the pinned stages shake. The stable
   height is the small viewport (100svh), measured once and only again when the width changes (rotation).
   `setter` writes a CSS custom property only when its value really changed, so a frame with no visible change
   costs no style recalculation. */
let probe: HTMLDivElement | null = null;
let cachedW = -1;
let cachedH = 0;

export function stableVh(): number {
  if (typeof document === "undefined") return 0;
  if (window.innerWidth === cachedW && cachedH > 0) return cachedH;
  if (!probe) {
    probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:fixed;left:0;top:0;width:0;height:100svh;visibility:hidden;pointer-events:none";
    document.body.appendChild(probe);
  }
  cachedW = window.innerWidth;
  cachedH = probe.offsetHeight || window.innerHeight;
  return cachedH;
}

export function setter(el: HTMLElement) {
  const seen: Record<string, string> = {};
  return (key: string, value: string) => {
    if (seen[key] === value) return;
    seen[key] = value;
    el.style.setProperty(key, value);
  };
}

/* Document-space top of an element from layout offsets. Unlike getBoundingClientRect it ignores transforms, so the
   Reveal wrapper's 16px entrance translate cannot skew a measurement taken before it has settled. */
export function docTop(el: HTMLElement): number {
  let y = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
  return y;
}
