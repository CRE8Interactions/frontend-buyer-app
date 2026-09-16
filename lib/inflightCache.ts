/** Share one in-flight promise and keep a short successful result for remounts. */
export function createInflightCache<T>(ttlMs: number) {
  const inflight = new Map<
    string,
    { request: Promise<T>; signal?: AbortSignal }
  >();
  const cached = new Map<string, { expires: number; value: T }>();
  const generation = new Map<string, number>();

  const genOf = (key: string) => generation.get(key) || 0;
  const bump = (key: string) => generation.set(key, genOf(key) + 1);

  return {
    get(
      load: () => Promise<T>,
      options?: { fresh?: boolean; key?: string; signal?: AbortSignal },
    ): Promise<T> {
      const key = options?.key ?? "";
      if (options?.fresh) {
        cached.delete(key);
        inflight.delete(key);
        bump(key);
      } else {
        const hit = cached.get(key);
        if (hit && hit.expires > Date.now()) {
          return Promise.resolve(hit.value);
        }
        const pending = inflight.get(key);
        // A remount aborts the previous request, so sharing it would hand the
        // new caller a cancelled response instead of fetching again.
        if (pending && !pending.signal?.aborted) return pending.request;
      }

      const gen = genOf(key);
      const request = load()
        .then((value) => {
          if (genOf(key) === gen) {
            cached.set(key, { expires: Date.now() + ttlMs, value });
          }
          return value;
        })
        .finally(() => {
          if (inflight.get(key)?.request === request) inflight.delete(key);
        });
      inflight.set(key, { request, signal: options?.signal });
      return request;
    },
    reset() {
      inflight.clear();
      cached.clear();
      generation.clear();
    },
  };
}
