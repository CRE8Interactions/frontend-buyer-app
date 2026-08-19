import { describe, expect, it } from "vitest";
import { DEMO_EVENTS } from "@/lib/demo/fixtures";
import {
  isAllowedReceiptLogoUrl,
  receiptLogoProxyPath,
  resolveReceiptLogoSrc,
} from "./receiptLogo";

const raptorsEvent =
  DEMO_EVENTS.find((event) => event.shortCode === "RAPT006") || DEMO_EVENTS[0];
const raptorsLogo = raptorsEvent.organization.image.url;

describe("receiptLogo", () => {
  it("resolves the organization logo onto the receipt proxy", () => {
    const origin = "http://localhost:3000";
    const absolute = resolveReceiptLogoSrc(raptorsLogo, origin);
    expect(absolute).toBe(`${origin}${raptorsLogo}`);
    expect(isAllowedReceiptLogoUrl(absolute!)).toBe(true);
    expect(receiptLogoProxyPath(raptorsLogo, origin)).toContain(
      encodeURIComponent(absolute!),
    );
  });

  it("rejects a logo url that is not an allowed image host", () => {
    expect(isAllowedReceiptLogoUrl("https://evil.example/logo.png")).toBe(false);
    expect(resolveReceiptLogoSrc("", "http://localhost:3000")).toBeNull();
  });
});
