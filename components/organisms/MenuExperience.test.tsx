import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MenuExperience, { decodeMenuParam } from "@/components/organisms/MenuExperience";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api", () => ({
  getPublicMenu: vi.fn(),
  getPublicMenuPricing: vi.fn(),
  createPublicMenuPaymentIntent: vi.fn(),
  submitPublicMenuOrder: vi.fn(),
}));

import { getPublicMenu } from "@/lib/api";

const mockedMenu = vi.mocked(getPublicMenu);

describe("decodeMenuParam", () => {
  it("decodes a section key", () => {
    expect(decodeMenuParam("Club%20Level")).toBe("Club Level");
  });
});

describe("MenuExperience seat gate", () => {
  beforeEach(() => {
    mockedMenu.mockReset();
    mockedMenu.mockResolvedValue({
      data: { accessMode: "seat_delivery", location: { name: "Club" } },
    } as never);
    sessionStorage.clear();
  });

  it("requires row and seat before opening the menu", async () => {
    const user = userEvent.setup();
    render(
      <MenuExperience
        organizationUuid="org-1"
        venueUuid="venue-1"
        menuKey="Club%20Level"
      />,
    );

    await screen.findByRole("heading", { name: /where are you sitting/i });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByText("Row is required.")).toBeInTheDocument();
    expect(mockedMenu).toHaveBeenCalled();
  });

  it("holds the Blocktickets loader until the menu items arrive", async () => {
    mockedMenu.mockReset();
    let releaseAccessMode: (value: unknown) => void = () => {};
    let releaseMenu: (value: unknown) => void = () => {};
    mockedMenu
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseAccessMode = resolve;
          }) as never,
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseMenu = resolve;
          }) as never,
      );

    render(<MenuExperience organizationUuid="org-1" menuKey="Club%20Level" />);

    expect(screen.getByRole("status", { name: /loading/i })).toHaveAttribute(
      "data-bt-platform-loader",
    );
    expect(screen.getByText("loading menu")).toBeInTheDocument();

    releaseAccessMode({
      data: { accessMode: "pickup", location: { name: "Club" } },
    });
    await waitFor(() => {
      expect(mockedMenu).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
    expect(screen.getByText("loading menu")).toBeInTheDocument();
    expect(screen.queryByText("Hot dog")).not.toBeInTheDocument();

    releaseMenu({
      data: {
        location: { name: "Club" },
        categories: [],
        items: [{ id: "i1", name: "Hot dog", price: 8 }],
      },
    });

    expect(await screen.findByText("Hot dog")).toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: /loading/i }),
    ).not.toBeInTheDocument();
  });
});
