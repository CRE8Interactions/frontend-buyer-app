import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import GlobalRouteTransitionLoader from "@/components/molecules/GlobalRouteTransitionLoader";
import { DEMO_ORGS } from "@/lib/demo/fixtures";
import { cacheOrgBranding } from "@/lib/orgBrandingCache";

const raptors = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("GlobalRouteTransitionLoader platform links", () => {
  it("keeps Blocktickets branding for links inside Home and Our Story", () => {
    cacheOrgBranding(raptors);
    window.history.replaceState({}, "", "/");
    const { rerender } = render(
      <>
        <GlobalRouteTransitionLoader />
        <a href={`/${raptors.slug}/`}>Partner tickets</a>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Partner tickets" }));

    expect(document.querySelector("[data-bt-platform-loader]")).toBeTruthy();
    expect(document.querySelector("[data-bt-tenant-loader]")).toBeNull();

    window.history.replaceState({}, "", "/our-story/");
    rerender(
      <>
        <GlobalRouteTransitionLoader />
        <a href={`/${raptors.slug}/`}>See partner events</a>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "See partner events" }));

    expect(document.querySelector("[data-bt-platform-loader]")).toBeTruthy();
    expect(document.querySelector("[data-bt-tenant-loader]")).toBeNull();
  });

  it("lets footer links use their destination organization branding", () => {
    cacheOrgBranding(raptors);
    window.history.replaceState({}, "", "/");
    render(
      <>
        <GlobalRouteTransitionLoader />
        <footer>
          <a href={`/${raptors.slug}/`}>Partner footer</a>
        </footer>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Partner footer" }));

    expect(document.querySelector("[data-bt-tenant-loader]")).toBeTruthy();
    expect(screen.getByText(raptors.name)).toBeInTheDocument();
  });
});
