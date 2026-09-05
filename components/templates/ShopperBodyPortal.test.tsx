import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ShopperBodyPortal from "@/components/templates/ShopperBodyPortal";
import { DEMO_ORGS } from "@/lib/demo/fixtures";

const raptors = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;

describe("ShopperBodyPortal", () => {
  it("portals branded focus tokens onto document.body", () => {
    render(
      <ShopperBodyPortal accentColor={raptors.branding.primaryColor}>
        <input aria-label="Email address" />
      </ShopperBodyPortal>,
    );

    const shell = document.body.querySelector(".shopper-page") as HTMLElement;
    expect(shell).toBeTruthy();
    expect(shell.style.getPropertyValue("--acc")).toBe(
      raptors.branding.primaryColor,
    );
    expect(shell.style.getPropertyValue("--bt-field-focus")).toBe(
      raptors.branding.primaryColor,
    );
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
  });
});
