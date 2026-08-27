import { afterEach, describe, expect, it } from "vitest";
import { DEMO_EVENTS, DEMO_ORGS } from "@/lib/demo/fixtures";
import {
  cacheEventBranding,
  cacheOrgBranding,
  cacheOrgsBranding,
  consumeWalletEntryFromTenant,
  getCachedBrandingForPath,
  getCachedOrgBranding,
  getLoaderBranding,
  getLoaderBrandingFromCookieValue,
  isPlatformLoaderPath,
  orgSlugFromPathname,
  isTenantOriginPath,
  isWalletAccountPath,
  LOADER_BRANDING_COOKIE,
  markWalletEntryFromTenant,
  resolveLoaderBrandingForRender,
  WALLET_ENTRY_COOKIE,
  walletLoaderFromOrigin,
} from "@/lib/orgBrandingCache";

const raptors = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;
const icedogs = DEMO_ORGS.find((org) => org.slug === "niagara-icedogs")!;
const icedogsEvent = DEMO_EVENTS.find(
  (event) => event.organization.slug === "niagara-icedogs",
)!;

afterEach(() => {
  sessionStorage.clear();
  document.cookie = `${LOADER_BRANDING_COOKIE}=; Max-Age=0; Path=/`;
  document.cookie = `${WALLET_ENTRY_COOKIE}=; Max-Age=0; Path=/`;
});

describe("org branding cookie", () => {
  it("keeps last-used tenant branding ready after sessionStorage is empty", () => {
    cacheOrgBranding(raptors);
    sessionStorage.clear();

    const branding = getCachedOrgBranding();
    expect(branding?.name).toBe(raptors.name);
    expect(branding?.primaryColor).toBe(raptors.branding.primaryColor);
    expect(branding?.logoSrc).toBe(raptors.branding.logo.url);
    expect(getLoaderBranding("/checkout/")).toMatchObject({
      name: raptors.name,
      primaryColor: raptors.branding.primaryColor,
    });
    expect(getLoaderBranding("/checkout/checkout-success/")).toMatchObject({
      name: raptors.name,
      primaryColor: raptors.branding.primaryColor,
    });
    expect(getLoaderBranding(`/${raptors.slug}/`)).toMatchObject({
      name: raptors.name,
    });
    expect(getLoaderBranding(`/${raptors.slug}/package/pkg-1/`)).toMatchObject({
      name: raptors.name,
      primaryColor: raptors.branding.primaryColor,
    });
  });

  it("does not invent branding when the cookie and session cache are empty", () => {
    expect(getCachedOrgBranding()).toBeNull();
    expect(getLoaderBranding("/e/any/event")).toBeNull();
    expect(getLoaderBrandingFromCookieValue(undefined)).toBeNull();
    expect(getLoaderBrandingFromCookieValue("not-json")).toBeNull();
  });
});

describe("org switch loader branding", () => {
  it("paints the destination org when that team is already cached", () => {
    cacheOrgBranding(raptors);
    cacheOrgsBranding([icedogs]);
    cacheEventBranding(icedogsEvent, icedogs, { touchLast: false });

    expect(getLoaderBranding(`/${icedogs.slug}/`)).toMatchObject({
      name: icedogs.name,
      primaryColor: icedogs.branding.primaryColor,
    });
    expect(
      getLoaderBranding(`/e/${icedogsEvent.seoUrl}/${icedogsEvent.shortCode}`),
    ).toMatchObject({
      name: icedogs.name,
    });
  });

  it("does not paint the previous org on another team's storefront or event", () => {
    cacheOrgBranding(raptors);
    const lastCookie = {
      slug: raptors.slug,
      name: raptors.name,
      primaryColor: raptors.branding.primaryColor,
      logoSrc: raptors.branding.logo.url,
    };

    expect(getLoaderBranding(`/${icedogs.slug}/`)).toBeNull();
    expect(getLoaderBranding("/e/other-event/OTH1")).toBeNull();
    expect(getLoaderBranding(`/${icedogs.slug}/`, {}, lastCookie)).toBeNull();
    expect(getCachedOrgBranding(icedogs.slug)).toBeNull();
    expect(getCachedOrgBranding(raptors.slug)?.name).toBe(raptors.name);
  });

  it("uses matching last-org branding when a missing event has no exact cache entry", () => {
    cacheOrgBranding(raptors);

    expect(
      getCachedBrandingForPath(
        `/e/${raptors.slug}-vs-yuba-sutter-freebirds/AFG/tickets/`,
      ),
    ).toMatchObject({
      slug: raptors.slug,
      name: raptors.name,
      primaryColor: raptors.branding.primaryColor,
      logoSrc: raptors.branding.logo.url,
    });
    expect(
      getCachedBrandingForPath("/e/unrelated-event/AFG/tickets/"),
    ).toBeNull();
  });

  it("does not reuse last-used branding on home, browse, Our Story, or legal pages", () => {
    cacheOrgBranding(raptors);

    expect(isPlatformLoaderPath("/")).toBe(true);
    expect(isPlatformLoaderPath("/browse/")).toBe(true);
    expect(isPlatformLoaderPath("/our-story")).toBe(true);
    expect(isPlatformLoaderPath("/purchase-policy/")).toBe(true);
    expect(isPlatformLoaderPath("/terms-conditions/")).toBe(true);
    expect(isPlatformLoaderPath("/privacy-policy/")).toBe(true);
    expect(isPlatformLoaderPath("/disclaimer/")).toBe(true);
    expect(isPlatformLoaderPath("/cookies-policy/")).toBe(true);
    expect(isPlatformLoaderPath("/sign-out/")).toBe(true);
    expect(getLoaderBranding("/")).toBeNull();
    expect(getLoaderBranding("/browse/")).toBeNull();
    expect(getLoaderBranding("/our-story/")).toBeNull();
    expect(getLoaderBranding("/purchase-policy/")).toBeNull();
    expect(getLoaderBranding("/checkout/")).toMatchObject({
      name: raptors.name,
    });
  });

  it("brands org fundraiser routes and uses Blocktickets on standalone fundraise and group", () => {
    cacheOrgBranding(raptors);

    expect(orgSlugFromPathname(`/${raptors.slug}/fundraisers/spring/`)).toBe(
      raptors.slug,
    );
    expect(
      getLoaderBranding(`/${raptors.slug}/fundraisers/spring/`),
    ).toMatchObject({ name: raptors.name });
    expect(isPlatformLoaderPath("/fundraise/spring/")).toBe(true);
    expect(getLoaderBranding("/fundraise/spring/")).toBeNull();
    expect(isPlatformLoaderPath("/group/abc123/")).toBe(true);
    expect(getLoaderBranding("/group/abc123/")).toBeNull();
  });

  it("keeps menu paths on Blocktickets even when that org is cached", () => {
    const menuPath = `/menu/${raptors.uuid}/section/`;
    cacheOrgBranding(raptors);

    expect(isPlatformLoaderPath(menuPath)).toBe(true);
    expect(getLoaderBranding(menuPath)).toBeNull();
  });

  it("uses the Blocktickets loader on login when there is nowhere to return to", () => {
    cacheOrgBranding(raptors);

    expect(isPlatformLoaderPath("/login/")).toBe(true);
    expect(getLoaderBranding("/login/")).toBeNull();
  });

  it("does not borrow the last team on login that returns to checkout", () => {
    cacheOrgBranding(raptors);

    expect(
      isPlatformLoaderPath("/login/", "?from=%2Fcheckout%2F%3FcartId%3Dc1"),
    ).toBe(false);
    expect(getLoaderBranding("/login/")).toBeNull();
  });
});

describe("hydrate-safe loader branding", () => {
  it("does not paint session-cached branding on an event route before the client cache is allowed", () => {
    cacheEventBranding(icedogsEvent, icedogs);
    const path = `/e/${icedogsEvent.seoUrl}/${icedogsEvent.shortCode}/tickets/`;

    expect(
      resolveLoaderBrandingForRender(path, { allowClientCache: false }),
    ).toBeNull();
    expect(
      resolveLoaderBrandingForRender(path, { allowClientCache: true }),
    ).toMatchObject({
      name: icedogs.name,
      primaryColor: icedogs.branding.primaryColor,
    });
  });

  it("still uses explicit page branding on the first paint", () => {
    const path = `/e/${icedogsEvent.seoUrl}/${icedogsEvent.shortCode}/tickets/`;

    expect(
      resolveLoaderBrandingForRender(path, {
        allowClientCache: false,
        branding: {
          primaryColor: raptors.branding.primaryColor,
          logoSrc: raptors.branding.logo.url,
          name: raptors.name,
        },
      }),
    ).toMatchObject({
      name: raptors.name,
      primaryColor: raptors.branding.primaryColor,
    });
  });
});

describe("wallet origin loaders", () => {
  it("uses tenant branding when My wallet is opened from an event page", () => {
    cacheEventBranding(icedogsEvent, icedogs);
    const eventPath = `/e/${icedogsEvent.seoUrl}/${icedogsEvent.shortCode}/`;

    expect(isTenantOriginPath(eventPath)).toBe(true);
    expect(
      walletLoaderFromOrigin(eventPath, "/wallet/my-tickets/"),
    ).toMatchObject({
      fallback: "none",
      branding: { name: icedogs.name, primaryColor: icedogs.branding.primaryColor },
    });
  });

  it("uses Blocktickets when My wallet is opened from Browse", () => {
    cacheOrgBranding(raptors);

    expect(isTenantOriginPath("/browse/")).toBe(false);
    expect(walletLoaderFromOrigin("/browse/", "/wallet/my-tickets/")).toEqual({
      branding: null,
      fallback: "blocktickets",
    });
    expect(isPlatformLoaderPath("/wallet/my-tickets/")).toBe(true);
    expect(getLoaderBranding("/wallet/my-tickets/")).toBeNull();
  });

  it("uses tenant branding from checkout success, then Blocktickets inside the wallet", () => {
    cacheOrgBranding(raptors);

    expect(
      walletLoaderFromOrigin("/checkout/checkout-success/", "/wallet/my-tickets/"),
    ).toMatchObject({
      fallback: "none",
      branding: { name: raptors.name },
    });

    markWalletEntryFromTenant();
    expect(isPlatformLoaderPath("/wallet/my-tickets/")).toBe(false);
    expect(getLoaderBranding("/wallet/my-tickets/")).toMatchObject({
      name: raptors.name,
    });

    consumeWalletEntryFromTenant();
    expect(isWalletAccountPath("/wallet/my-tickets/event/abc/")).toBe(true);
    expect(isWalletAccountPath("/wallet/my-tickets/package/pkg-1/event/abc/")).toBe(
      true,
    );
    expect(orgSlugFromPathname("/wallet/my-tickets/package/pkg-1/")).toBeNull();
    expect(
      walletLoaderFromOrigin("/wallet/my-tickets/", "/wallet/my-tickets/event/abc/"),
    ).toEqual({
      branding: null,
      fallback: "blocktickets",
    });
    expect(isPlatformLoaderPath("/wallet/my-tickets/event/abc/")).toBe(true);
    expect(getLoaderBranding("/wallet/my-tickets/event/abc/")).toBeNull();
  });
});
