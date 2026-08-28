import { describe, expect, it } from "vitest";
import { blockticketsNavLogoHref } from "@/lib/navLogo";

describe("blockticketsNavLogoHref", () => {
  it("sends marketing and legal nav lockups home", () => {
    expect(blockticketsNavLogoHref("/")).toBe("/");
    expect(blockticketsNavLogoHref("/browse/")).toBe("/");
    expect(blockticketsNavLogoHref("/our-story")).toBe("/");
    expect(blockticketsNavLogoHref("/sell/")).toBe("/");
    expect(blockticketsNavLogoHref("/show")).toBe("/");
    expect(blockticketsNavLogoHref("/purchase-policy/")).toBe("/");
    expect(blockticketsNavLogoHref("/terms-conditions")).toBe("/");
    expect(blockticketsNavLogoHref("/privacy-policy")).toBe("/");
    expect(blockticketsNavLogoHref("/disclaimer")).toBe("/");
    expect(blockticketsNavLogoHref("/cookies-policy")).toBe("/");
  });

  it("sends every other nav lockup to Browse", () => {
    expect(blockticketsNavLogoHref("/login/")).toBe("/browse");
    expect(blockticketsNavLogoHref("/wallet/my-tickets/")).toBe("/browse");
    expect(blockticketsNavLogoHref("/e/raptors/RAPT006/tickets/")).toBe(
      "/browse",
    );
    expect(blockticketsNavLogoHref("/venue/scotiabank-arena/")).toBe("/browse");
    expect(blockticketsNavLogoHref("/checkout/")).toBe("/browse");
    expect(blockticketsNavLogoHref("/search/?query=raptors")).toBe("/browse");
  });
});
