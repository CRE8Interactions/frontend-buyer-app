import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppProviders from "@/components/providers/AppProviders";

vi.mock("next/navigation", () => ({
  usePathname: () => "/browse/",
}));

vi.mock("@growthbook/growthbook-react", () => ({
  GrowthBookProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/lib/growthbook", () => ({
  getGrowthBook: () => ({}),
  initGrowthBook: vi.fn(),
}));

vi.mock("@/lib/intercom", () => ({
  bootIntercom: vi.fn(),
  hideIntercomLauncher: vi.fn(),
  showIntercomLauncher: vi.fn(),
  updateIntercom: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: null, ready: true }),
  displayName: () => "",
}));

vi.mock("@/components/molecules/GlobalRouteTransitionLoader", () => ({
  default: () => null,
}));

afterEach(() => {
  document.getElementById("bt-boot-loader")?.remove();
});

describe("AppProviders", () => {
  it("removes the pre-hydrate splash after browse is ready even when the splash marked itself as the platform loader", async () => {
    const splash = document.createElement("div");
    splash.id = "bt-boot-loader";
    splash.setAttribute("data-bt-platform-loader", "");
    splash.setAttribute("aria-label", "Loading");
    document.documentElement.appendChild(splash);

    render(
      <AppProviders>
        <div>browse ready</div>
      </AppProviders>,
    );

    expect(screen.getByText("browse ready")).toBeInTheDocument();
    await waitFor(() => {
      expect(document.getElementById("bt-boot-loader")).toBeNull();
    });
  });

  it("keeps the splash while a React loader is still painting", async () => {
    const splash = document.createElement("div");
    splash.id = "bt-boot-loader";
    document.documentElement.appendChild(splash);

    render(
      <AppProviders>
        <div data-bt-tenant-loader="">loading tickets</div>
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByText("loading tickets")).toBeInTheDocument();
    });
    expect(document.getElementById("bt-boot-loader")).not.toBeNull();
  });
});
