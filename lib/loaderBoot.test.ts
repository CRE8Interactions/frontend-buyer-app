import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_ORGS } from "@/lib/demo/fixtures";
import { LOADER_BOOT_SCRIPT } from "@/lib/loaderBoot";
import { CHECKOUT_SUCCESS_LOADER_MESSAGE } from "@/lib/loaderMessages";
import { cacheOrgBranding, markWalletEntryFromTenant } from "@/lib/orgBrandingCache";

const RAPTORS = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;

function paintBootSplash(path: string) {
  window.history.pushState({}, "", path);
  new Function(LOADER_BOOT_SCRIPT)();
  return document.getElementById("bt-boot-loader");
}

describe("boot splash", () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.cookie = "bt_org_branding_last=; Path=/; Max-Age=0";
    document.cookie = "bt_wallet_entry_from_tenant=; Path=/; Max-Age=0";
    document.getElementById("bt-boot-loader")?.remove();
  });

  it("spins the org logo and names the org while checkout confirmation loads", () => {
    cacheOrgBranding(RAPTORS);

    const splash = paintBootSplash("/checkout/checkout-success/?intentId=pi_1");

    expect(splash?.querySelector("[data-bt-boot-spinner] svg")).not.toBeNull();
    expect(splash?.querySelector("img")).toHaveAttribute(
      "src",
      RAPTORS.branding.logo.url,
    );
    expect(splash?.textContent).toContain(RAPTORS.name);
    expect(splash?.textContent).toContain(CHECKOUT_SUCCESS_LOADER_MESSAGE);
  });

  it("spins the Blocktickets mark on browse", () => {
    const splash = paintBootSplash("/browse");

    expect(splash?.querySelector("[data-bt-boot-spinner]")).not.toBeNull();
    expect(splash?.querySelector("img")).toHaveAttribute(
      "alt",
      "Blocktickets",
    );
  });

  it("spins the Blocktickets mark on a wallet path after Browse", () => {
    cacheOrgBranding(RAPTORS);

    const splash = paintBootSplash("/wallet/my-tickets/");

    expect(splash?.querySelector("img")).toHaveAttribute("alt", "Blocktickets");
  });

  it("spins the org logo on a wallet path entered from a tenant page", () => {
    cacheOrgBranding(RAPTORS);
    markWalletEntryFromTenant();

    const splash = paintBootSplash("/wallet/my-tickets/");

    expect(splash?.querySelector("img")).toHaveAttribute(
      "src",
      RAPTORS.branding.logo.url,
    );
    expect(splash?.textContent).toContain(RAPTORS.name);
  });

  it("paints nothing when no org branding is known", () => {
    expect(paintBootSplash("/checkout/checkout-success/?intentId=pi_1")).toBe(
      null,
    );
  });
});
