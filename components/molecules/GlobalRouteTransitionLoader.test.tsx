// The loader intercepts native anchor clicks in a document-level capture

// listener, so these fixtures must be plain anchors rather than next/link.

/* eslint-disable @next/next/no-html-link-for-pages */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { useState } from "react";

import { afterEach, describe, expect, it, vi } from "vitest";

import GlobalRouteTransitionLoader from "@/components/molecules/GlobalRouteTransitionLoader";

import { blockticketsNavLogoHref } from "@/lib/navLogo";

import { DEMO_EVENTS, DEMO_ORGS } from "@/lib/demo/fixtures";

import { cacheOrgBranding } from "@/lib/orgBrandingCache";

import { notifyRouteCommitted } from "@/lib/routeTransition";
import {
  clearWalletNavigation,
  getWalletNavigationPending,
} from "@/lib/walletTransition";



vi.mock("@/lib/api", () => ({ searchEvents: vi.fn() }));



import { fetchSearchEvents, eventSearchName } from "@/lib/searchEvents";

import { searchEvents } from "@/lib/api";

import { eventPurchasePath } from "@/lib/helpers";



const raptors = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;

const icedogs = DEMO_ORGS.find((org) => org.slug === "niagara-icedogs")!;



function commitNavigation(path: string) {

  act(() => {

    window.history.replaceState({}, "", path);

    notifyRouteCommitted(path);

  });

}



function addDestinationLoader() {

  const destination = document.createElement("div");

  destination.setAttribute("data-bt-destination-loader", "");

  act(() => {

    document.body.appendChild(destination);

  });

  return destination;

}



function coverActive() {

  return document.body.dataset.btRouteTransition === "";

}



afterEach(() => {

  window.history.replaceState({}, "", "/");

  sessionStorage.clear();

  delete document.body.dataset.btRouteTransition;

  clearWalletNavigation();

  vi.mocked(searchEvents).mockReset();

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



  it("keeps covering a committed route until the destination route loader is stable", async () => {

    cacheOrgBranding(raptors);

    window.history.replaceState({}, "", "/");

    render(

      <>

        <GlobalRouteTransitionLoader />

        <a href={`/${raptors.slug}/`}>Partner tickets</a>

      </>,

    );



    fireEvent.click(screen.getByRole("link", { name: "Partner tickets" }));

    commitNavigation(`/${raptors.slug}/`);



    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(coverActive()).toBe(true);



    const destination = addDestinationLoader();

    await new Promise((resolve) => setTimeout(resolve, 200));



    await waitFor(() => {

      expect(coverActive()).toBe(false);

    });

    destination.remove();

  });



  it("stays up after commit until the destination route loader is on screen", async () => {

    cacheOrgBranding(raptors);

    window.history.replaceState({}, "", "/");

    render(

      <>

        <GlobalRouteTransitionLoader />

        <a href={`/${raptors.slug}/`}>Partner tickets</a>

      </>,

    );



    fireEvent.click(screen.getByRole("link", { name: "Partner tickets" }));

    commitNavigation(`/${raptors.slug}/`);



    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(coverActive()).toBe(true);



    const destination = addDestinationLoader();

    await new Promise((resolve) => setTimeout(resolve, 200));



    await waitFor(() => {

      expect(coverActive()).toBe(false);

    });

    destination.remove();

  });



  it("uncovers once the destination route loader is stable", async () => {

    cacheOrgBranding(raptors);

    window.history.replaceState({}, "", "/");

    render(

      <>

        <GlobalRouteTransitionLoader />

        <a href={`/${raptors.slug}/`}>Partner tickets</a>

      </>,

    );



    fireEvent.click(screen.getByRole("link", { name: "Partner tickets" }));

    expect(coverActive()).toBe(true);



    const destination = addDestinationLoader();

    commitNavigation(`/${raptors.slug}/`);

    await new Promise((resolve) => setTimeout(resolve, 200));



    await waitFor(() => {

      expect(coverActive()).toBe(false);

    });

    destination.remove();

  });



  it("keeps the cover up after the destination route commits without a loader", async () => {

    cacheOrgBranding(raptors);

    window.history.replaceState({}, "", "/");

    render(

      <>

        <GlobalRouteTransitionLoader />

        <a href={`/${raptors.slug}/`}>Partner tickets</a>

      </>,

    );



    fireEvent.click(screen.getByRole("link", { name: "Partner tickets" }));

    expect(coverActive()).toBe(true);



    commitNavigation(`/${raptors.slug}/`);



    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(coverActive()).toBe(true);

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



  it("does not treat a stale tenant loader as the destination", async () => {

    cacheOrgBranding(raptors);

    window.history.replaceState({}, "", "/");

    render(

      <>

        <GlobalRouteTransitionLoader />

        <a href={`/${raptors.slug}/`}>Partner tickets</a>

        <div data-bt-tenant-loader="" />

      </>,

    );



    fireEvent.click(screen.getByRole("link", { name: "Partner tickets" }));

    commitNavigation(`/${raptors.slug}/`);



    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(coverActive()).toBe(true);

  });



  it("shows the browse cover when the search nav lockup is clicked", () => {

    window.history.replaceState({}, "", "/search/?query=raptors");



    function SearchNavLogo() {

      const [pathname, setPathname] = useState(window.location.pathname);

      return (

        <a

          href={blockticketsNavLogoHref(pathname)}

          onClick={() => {

            setPathname(window.location.pathname);

          }}

        >

          Blocktickets home

        </a>

      );

    }



    render(

      <>

        <GlobalRouteTransitionLoader />

        <SearchNavLogo />

      </>,

    );



    expect(screen.getByRole("link", { name: /blocktickets home/i })).toHaveAttribute(

      "href",

      "/browse",

    );



    fireEvent.click(screen.getByRole("link", { name: /blocktickets home/i }));



    expect(coverActive()).toBe(true);

  });



  it("paints the team loader the moment a search result is opened", async () => {

    const hits = DEMO_EVENTS.filter(

      (event) => event.organization.slug === icedogs.slug,

    );

    vi.mocked(searchEvents).mockResolvedValue({ data: hits } as never);

    window.history.replaceState({}, "", "/search/?query=icedogs");



    const [event] = await fetchSearchEvents("icedogs");

    const label = eventSearchName(event);

    render(

      <>

        <GlobalRouteTransitionLoader />

        <a href={eventPurchasePath(event)}>{label}</a>

      </>,

    );



    fireEvent.click(screen.getByRole("link", { name: label }));



    expect(document.querySelector("[data-bt-tenant-loader]")).toBeTruthy();

    expect(screen.getByText(icedogs.name)).toBeInTheDocument();

  });



  it.each([

    ["/wallet/my-tickets/", "My tickets"],

    ["/wallet/my-transfers/", "Transfers"],

    ["/wallet/my-listings/", "Listings"],

  ])("covers %s with the Blocktickets splash when entering wallet from a team page", (href, label) => {

    cacheOrgBranding(raptors);

    window.history.replaceState({}, "", `/${raptors.slug}/`);

    render(

      <>

        <GlobalRouteTransitionLoader />

        <a href={href}>{label}</a>

      </>,

    );



    fireEvent.click(screen.getByRole("link", { name: label }));



    expect(coverActive()).toBe(true);

    expect(document.querySelector("[data-bt-platform-loader]")).toBeTruthy();

    expect(document.querySelector("[data-bt-tenant-loader]")).toBeNull();

    expect(screen.queryByText(raptors.name)).not.toBeInTheDocument();

  });



  it("covers checkout sign-in with the Blocktickets splash", () => {
    cacheOrgBranding(raptors);
    window.history.replaceState({}, "", "/checkout/?cartId=cart-1");

    render(
      <>
        <GlobalRouteTransitionLoader />
        <a href="/login/?from=%2Fcheckout%2F%3FcartId%3Dcart-1">Sign in</a>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Sign in" }));

    expect(coverActive()).toBe(true);
    expect(document.querySelector("[data-bt-platform-loader]")).toBeTruthy();
  });

  it("covers wallet entry from checkout success with the Blocktickets splash", () => {

    cacheOrgBranding(raptors);

    window.history.replaceState({}, "", "/checkout/success/?intentId=pi_test");

    render(

      <>

        <GlobalRouteTransitionLoader />

        <a href="/wallet/my-tickets/">Go to my wallet</a>

      </>,

    );



    fireEvent.click(screen.getByRole("link", { name: "Go to my wallet" }));



    expect(coverActive()).toBe(true);

    expect(document.querySelector("[data-bt-platform-loader]")).toBeTruthy();

  });



  it("starts in-wallet navigation feedback without the global splash", () => {

    window.history.replaceState({}, "", "/wallet/my-tickets/");

    render(

      <>

        <GlobalRouteTransitionLoader />

        <a href="/wallet/my-transfers/">Transfers</a>

      </>,

    );



    fireEvent.click(screen.getByRole("link", { name: "Transfers" }));



    expect(getWalletNavigationPending()).toBe("/wallet/my-transfers");

    expect(coverActive()).toBe(false);

  });

});


