import { describe, expect, it, vi } from "vitest";
import { createInflightCache } from "./inflightCache";

describe("createInflightCache", () => {
  it("reuses an in-flight load and the short-lived success value", async () => {
    const cache = createInflightCache<string>(60_000);
    const load = vi.fn().mockResolvedValue("events");

    const [first, second] = await Promise.all([cache.get(load), cache.get(load)]);

    expect(load).toHaveBeenCalledTimes(1);
    expect(first).toBe("events");
    expect(second).toBe("events");
    await expect(cache.get(load)).resolves.toBe("events");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed load and fetches again after fresh", async () => {
    const cache = createInflightCache<string>(60_000);
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("canceled"))
      .mockResolvedValueOnce("events")
      .mockResolvedValueOnce("refreshed");

    await expect(cache.get(load)).rejects.toThrow("canceled");
    await expect(cache.get(load)).resolves.toBe("events");
    await expect(cache.get(load, { fresh: true })).resolves.toBe("refreshed");
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("does not reuse a load for a different key", async () => {
    const cache = createInflightCache<string>(60_000);
    const loadA = vi.fn().mockResolvedValue("raptors");
    const loadB = vi.fn().mockResolvedValue("icedogs");

    const [a, aAgain, b] = await Promise.all([
      cache.get(loadA, { key: "RAPT006" }),
      cache.get(loadA, { key: "RAPT006" }),
      cache.get(loadB, { key: "ICEDOG1" }),
    ]);

    expect(loadA).toHaveBeenCalledTimes(1);
    expect(loadB).toHaveBeenCalledTimes(1);
    expect(a).toBe("raptors");
    expect(aAgain).toBe("raptors");
    expect(b).toBe("icedogs");
  });
});
