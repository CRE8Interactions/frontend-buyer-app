const phased = new WeakSet<Element>();

/**
 * Callback ref that anchors a CSS animation to the document clock, so a loader
 * that is swapped for another element (boot splash, route loader, page loader,
 * a remounted spinner) keeps moving instead of restarting. Entrances
 * (`loop: false`) land already finished so they never replay.
 *
 * Applies once per element: moving `animation-delay` on an animation that is
 * already running jumps it, and inline callback refs re-run on every render.
 */
export function motionPhase<T extends Element & { style: CSSStyleDeclaration }>(
  durationMs: number,
  options: { loop?: boolean; staggerMs?: number } = {},
) {
  return (el: T | null) => {
    if (!el || phased.has(el) || typeof performance === "undefined") return;
    phased.add(el);
    const elapsed = performance.now();
    const offset =
      options.loop === false
        ? -Math.min(elapsed, durationMs)
        : (options.staggerMs || 0) - (elapsed % durationMs);
    el.style.animationDelay = `${Math.round(offset)}ms`;
  };
}
