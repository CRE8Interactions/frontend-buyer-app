// @ts-check
/** Owns asynchronous buyer navigation. Starting an action cancels every older wait.
 * @param {{requestFrame?: (callback: FrameRequestCallback) => number, cancelFrame?: (id: number) => void}} [options]
 * @returns {import('../../../types/checked-contracts.js').NavigationOwner}
 */
export function createNavigationOwner({
  requestFrame = (callback) => requestAnimationFrame(callback),
  cancelFrame = (id) => cancelAnimationFrame(id),
} = {}) {
  /** @type {import("../../../types/checked-contracts.js").NavigationToken | null} */
  let current = null;
  /** @type {Set<() => void>} */
  const pending = new Set();
  /** @param {import("../../../types/checked-contracts.js").NavigationToken | undefined} token */
  const isCurrent = (token) => token === current;
  /** @param {import("../../../types/checked-contracts.js").NavigationKind} kind */
  function begin(kind) {
    current = Object.freeze({ kind });
    for (const cancel of [...pending]) cancel();
    return current;
  }
  /** @param {import('../../../types/checked-contracts.js').NavigationToken | undefined} token @param {() => boolean} isMoving @returns {Promise<boolean>} */
  function waitForCamera(token, isMoving) {
    if (!isCurrent(token)) return Promise.resolve(false);
    return new Promise((resolve) => {
      /** @type {number} */
      let frame;
      /** @param {boolean} value */
      const finish = (value) => {
        cancelFrame(frame);
        pending.delete(cancel);
        resolve(value);
      };
      const cancel = () => finish(false);
      const tick = () => {
        if (!isCurrent(token)) return finish(false);
        if (!isMoving()) return finish(true);
        frame = requestFrame(tick);
      };
      pending.add(cancel);
      frame = requestFrame(tick);
    });
  }
  return { begin, isCurrent, waitForCamera };
}
