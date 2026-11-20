/* The "thinking orb" loading mark: the same dotted orb the Blocktickets site uses (the thinking-orbs package, MIT, by Jakub Antalik), drawn here without React.
   The package's own engine (vendor/thinking-orbs-engine.js, copied unchanged from its dist) does the geometry and the painting; this file is only the loop
   the package's React component runs: one canvas, redrawn each frame, paused when it is off screen or the tab is hidden, a still frame for reduced motion. */
import { r as resolvePreset, M as MODE_FRAMES, p as paintFrame } from './vendor/thinking-orbs-engine.js';

/**
 * Draws an orb into `canvas` until `stop()` is called or the canvas leaves the page.
 * @param {HTMLCanvasElement} canvas
 * @param {{state?: string, size?: 64|32|20, speed?: number, dark?: boolean, grow?: number}} options  grow: how much larger than `size` it is shown (drawn sharp at that size)
 * @returns {() => void} stop
 */
export function mountOrb(canvas, { state = 'working', size = 64, speed = 1, dark = false, grow = 1 } = {}) {
  const ctx = canvas.getContext('2d'); if (!ctx) return () => {};
  const dpr = Math.min(2, window.devicePixelRatio || 1) * grow, { mode, speed: base, opts } = resolvePreset(state, size), frameOf = MODE_FRAMES[mode], rate = base * speed;
  canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr); canvas.style.width = canvas.style.height = size * grow + 'px';
  const draw = (seconds) => { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size); paintFrame(ctx, frameOf(size, seconds, opts), dark); };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { draw(0.6); return () => {}; }
  let frame = 0, running = false, seen = true, stopped = false;
  const loop = () => { if (stopped || !canvas.isConnected) return stop(); draw((performance.now() / 1e3) * rate); if (running) frame = requestAnimationFrame(loop); };
  const start = () => { if (running || stopped) return; running = true; frame = requestAnimationFrame(loop); };
  const pause = () => { running = false; cancelAnimationFrame(frame); };
  const watch = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([entry]) => { seen = entry.isIntersecting; if (seen && document.visibilityState !== 'hidden') start(); else pause(); }) : null;
  const onVisibility = () => { if (document.visibilityState === 'hidden') pause(); else if (seen) start(); };
  function stop() { stopped = true; pause(); watch?.disconnect(); document.removeEventListener('visibilitychange', onVisibility); }
  draw((performance.now() / 1e3) * rate); watch?.observe(canvas); document.addEventListener('visibilitychange', onVisibility); if (!watch) start();
  return stop;
}
