import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchIpCountry } from "./ipCountry";

describe("fetchIpCountry", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns the IPData country when the key is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_IP_DATA_API_KEY", "test-ipdata-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ country_code: "CA" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchIpCountry()).resolves.toBe("CA");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://api.ipdata.co?api-key=test-ipdata-key"),
      expect.anything(),
    );
  });

  it("returns null when the key is missing so checkout keeps the cart default", async () => {
    vi.stubEnv("NEXT_PUBLIC_IP_DATA_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchIpCountry()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
