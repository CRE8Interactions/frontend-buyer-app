// The loader intercepts native anchor clicks in a document-level capture
// listener, so these fixtures must be plain anchors rather than next/link.
/* eslint-disable @next/next/no-html-link-for-pages */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import GlobalRouteTransitionLoader from "@/components/molecules/GlobalRouteTransitionLoader";
import { DEMO_ORGS } from "@/lib/demo/fixtures";
import { cacheOrgBranding } from "@/lib/orgBrandingCache";
import {
  notifyRouteCommitted,
  notifyWalletShellReady,
} from "@/lib/routeTransition";

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

  it("holds the Blocktickets splash over a wallet hop until the tickets are ready", async () => {
    cacheOrgBranding(raptors);
    window.history.replaceState({}, "", `/${raptors.slug}/`);
    render(
      <>
        <GlobalRouteTransitionLoader />
        <a href="/wallet/my-tickets/">My tickets</a>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "My tickets" }));

    expect(window.location.pathname).toBe("/wallet/my-tickets/");
    notifyRouteCommitted("/wallet/my-tickets/");
    // The wallet is never a team, so the previous org must not paint here.
    expect(document.querySelector("[data-bt-platform-loader]")).toBeTruthy();
    expect(document.querySelector("[data-bt-tenant-loader]")).toBeNull();
    expect(screen.queryByText(raptors.name)).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/wallet/my-tickets/");

    notifyWalletShellReady();

    await waitFor(() => {
      expect(document.querySelector("[data-bt-platform-loader]")).toBeNull();
    });
  });

  it("hides when a logged-out shopper is bounced from the wallet to login", async () => {
    window.history.replaceState({}, "", "/browse/");
    render(
      <>
        <GlobalRouteTransitionLoader />
        <a href="/wallet/my-tickets/">My tickets</a>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "My tickets" }));
    expect(document.querySelector("[data-bt-platform-loader]")).toBeTruthy();

    // The guard bounces to login, so the wallet shell never reports ready.
    window.history.replaceState({}, "", "/login/?from=%2Fwallet%2Fmy-tickets%2F");

    await waitFor(() => {
      expect(document.querySelector("[data-bt-platform-loader]")).toBeNull();
    });
  });

  it("hides after an empty wallet finishes loading", async () => {
    window.history.replaceState({}, "", "/");
    render(
      <>
        <GlobalRouteTransitionLoader />
        <a href="/wallet/my-tickets/">My tickets</a>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "My tickets" }));
    expect(document.querySelector("[data-bt-platform-loader]")).toBeTruthy();

    notifyWalletShellReady();

    await waitFor(() => {
      expect(document.querySelector("[data-bt-platform-loader]")).toBeNull();
    });
  });
});
