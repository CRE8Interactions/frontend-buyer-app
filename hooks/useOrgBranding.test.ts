import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_ORGS } from "@/lib/demo/fixtures";
import { BLOCKTICKETS_NAVY } from "@/lib/branding";
import {
  cacheOrgBranding,
  getCachedOrgBrandingByUuid,
} from "@/lib/orgBrandingCache";

const org = DEMO_ORGS[0];

vi.mock("@/lib/api", () => ({
  getPublicOrganizationBranding: vi.fn(),
}));

import useOrgBranding from "@/hooks/useOrgBranding";
import { getPublicOrganizationBranding } from "@/lib/api";

const mockedFetch = vi.mocked(getPublicOrganizationBranding);

describe("useOrgBranding", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockedFetch.mockReset();
  });

  it("uses cached branding without fetching", () => {
    cacheOrgBranding(org);
    mockedFetch.mockResolvedValue({ data: { organization: org } } as never);

    const { result } = renderHook(() =>
      useOrgBranding({ slug: org.slug, uuid: org.uuid }),
    );

    expect(result.current.organization?.name).toBe(org.name);
    expect(result.current.theme.accent).toBe(org.branding.primaryColor);
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("fetches by UUID, caches the result, and brands the theme", async () => {
    mockedFetch.mockResolvedValue({ data: { organization: org } } as never);

    const { result } = renderHook(() => useOrgBranding({ uuid: org.uuid }));

    expect(result.current.theme.accent).toBe(BLOCKTICKETS_NAVY);

    await waitFor(() => {
      expect(result.current.organization?.name).toBe(org.name);
    });
    expect(mockedFetch).toHaveBeenCalledWith(org.uuid);
    expect(getCachedOrgBrandingByUuid(org.uuid)?.name).toBe(org.name);
    expect(result.current.theme.accent).toBe(org.branding.primaryColor);
  });

  it("keeps the Blocktickets theme when the fetch fails", async () => {
    mockedFetch.mockRejectedValue(new Error("unavailable"));

    const { result } = renderHook(() => useOrgBranding({ uuid: "missing-org" }));

    await waitFor(() => {
      expect(mockedFetch).toHaveBeenCalledWith("missing-org");
    });
    expect(result.current.organization).toBeNull();
    expect(result.current.theme.accent).toBe(BLOCKTICKETS_NAVY);
  });
});
