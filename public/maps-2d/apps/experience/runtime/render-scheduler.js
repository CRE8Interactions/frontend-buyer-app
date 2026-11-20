/** One frame at a time, with a bounded tail for damping and visual easing. */
export function createRenderScheduler(draw, {
  request = requestAnimationFrame, cancel = cancelAnimationFrame,
  now = () => performance.now(), visible = () => !document.hidden,
} = {}) {
  let frame = 0, until = 0, disposed = false, active = true;
  function tick(time) {
    frame = 0;
    if (disposed || !active || !visible()) return;
    const moving = draw(time);
    // OrbitControls may invalidate from inside draw; preserve its queued frame.
    if (!disposed && active && visible() && !frame && (moving || time < until)) frame = request(tick);
  }
  return {
    invalidate(duration = 0) {
      until = Math.max(until, now() + duration);
      if (!disposed && active && visible() && !frame) frame = request(tick);
    },
    setActive(value) {
      active = value;
      if (!active) { cancel(frame); frame = 0; }
      else this.invalidate(180);
    },
    destroy() { disposed = true; cancel(frame); frame = 0; },
  };
}
