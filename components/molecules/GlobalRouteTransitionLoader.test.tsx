// The loader intercepts native anchor clicks in a document-level capture
// listener, so these fixtures must be plain anchors rather than next/link.
/* eslint-disable @next/next/no-html-link-for-pages */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import GlobalRouteTransitionLoader from "@/components/molecules/GlobalRouteTransitionLoader";
import { DEMO_ORGS } from "@/lib/demo/fixtures";
import { cacheOrgBranding } from "@/lib/orgBrandingCache";
import { notifyRouteCommitted } from "@/lib/routeTransition";

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

    expect(window.location.pathname).toBe(`/${raptors.slug}/`);
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

    expect(window.location.pathname).toBe(`/${raptors.slug}/`);
    expect(document.querySelector("[data-bt-platform-loader]")).toBeTruthy();
    expect(document.querySelector("[data-bt-tenant-loader]")).toBeNull();
  });

  it("keeps the loader up until the destination route commits", async () => {
    cacheOrgBranding(raptors);
    window.history.replaceState({}, "", "/");
    render(
      <>
        <GlobalRouteTransitionLoader />
        <a href={`/${raptors.slug}/`}>Partner tickets</a>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Partner tickets" }));

    expect(window.location.pathname).toBe(`/${raptors.slug}/`);
    expect(document.querySelector("[data-bt-platform-loader]")).toBeTruthy();

    notifyRouteCommitted(`/${raptors.slug}/`);

    await waitFor(() => {
      expect(document.querySelector("[data-bt-platform-loader]")).toBeNull();
    });
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

    expect(window.location.pathname).toBe(`/${raptors.slug}/`);
    expect(document.querySelector("[data-bt-tenant-loader]")).toBeTruthy();
    expect(screen.getByText(raptors.name)).toBeInTheDocument();
  });

  it.each([
    ["/wallet/my-tickets/", "My tickets"],
    ["/wallet/my-transfers/", "Transfers"],
    ["/wallet/my-listings/", "Listings"],
  ])("does not cover %s with the Blocktickets splash", (href, label) => {
    cacheOrgBranding(raptors);
    window.history.replaceState({}, "", `/${raptors.slug}/`);
    render(
      <>
        <GlobalRouteTransitionLoader />
        <a href={href}>{label}</a>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: label }));

    expect(document.querySelector("[data-bt-platform-loader]")).toBeNull();
    expect(document.querySelector("[data-bt-tenant-loader]")).toBeNull();
    expect(screen.queryByText(raptors.name)).not.toBeInTheDocument();
  });
});
