import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_EVENTS, demoSmsTicket, demoSmsTickets } from "@/lib/demo/fixtures";
import { formatEventWhen } from "@/lib/helpers";
import { formatVenueCityState } from "@/lib/venueLocation";

const nav = vi.hoisted(() => ({ token: "live-token" }));
const wallets = vi.hoisted(() => ({
  kinds: [] as Array<"apple" | "google">,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ token: nav.token }),
}));

vi.mock("@/lib/api", () => ({
  getSmsTickets: vi.fn(),
  downloadSmsApplePasses: vi.fn(),
  downloadSmsGooglePasses: vi.fn(),
}));

vi.mock("@/lib/phoneWallet", async () => {
  const actual = await vi.importActual<typeof import("@/lib/phoneWallet")>(
    "@/lib/phoneWallet",
  );
  return {
    ...actual,
    phoneWalletKinds: () => wallets.kinds,
  };
});

import SmsTicketsClient from "@/components/organisms/SmsTickets/SmsTicketsClient";
import {
  downloadSmsApplePasses,
  downloadSmsGooglePasses,
  getSmsTickets,
} from "@/lib/api";

const mockedGet = vi.mocked(getSmsTickets);
const mockedApple = vi.mocked(downloadSmsApplePasses);
const mockedGoogle = vi.mocked(downloadSmsGooglePasses);

const event = DEMO_EVENTS[0];

describe("SMS ticket page", () => {
  beforeEach(() => {
    nav.token = "live-token";
    wallets.kinds = [];
    mockedGet.mockReset();
    mockedApple.mockReset();
    mockedGoogle.mockReset();
    mockedGet.mockResolvedValue({ data: demoSmsTickets() } as never);
    mockedApple.mockResolvedValue({ data: new Blob(["passes"]) } as never);
    mockedGoogle.mockResolvedValue({
      data: { url: "https://pay.google.com/gp/v/save/demo-sms" },
    } as never);
  });

  it("renders the event, the seat, and each ticket QR for a live link", async () => {
    render(<SmsTicketsClient />);

    expect(await screen.findByRole("heading", { name: event.name })).toBeInTheDocument();
    expect(screen.getByText("Your tickets")).toBeInTheDocument();
    expect(screen.getByText("2 tickets")).toBeInTheDocument();
    expect(screen.getByText("GA")).toBeInTheDocument();
    expect(screen.getByText("101")).toBeInTheDocument();
    expect(screen.getByText("Ticket 1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "QR code for ticket 1" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "QR code for ticket 2" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: event.name })).toHaveAttribute(
      "src",
      "/cases/icedogs.jpg",
    );
    expect(
      screen.getByText(
        formatEventWhen(event.start, event.venue?.timezone, "ddd, MMM D, h:mm A"),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `Meridian Centre · ${formatVenueCityState(event.venue?.address)}`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Show a QR code at the door. Open this page on your phone to add tickets to Apple Wallet or Google Wallet.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Add all/ }),
    ).not.toBeInTheDocument();
  });

  it("tells the holder to ask the box office when the link is expired", async () => {
    mockedGet.mockRejectedValue({ response: { status: 410 } });
    render(<SmsTicketsClient />);

    expect(
      await screen.findByRole("heading", { name: "Link expired" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This ticket link is no longer valid. Ask the box office to text you a new one.",
      ),
    ).toBeInTheDocument();
  });

  it("says the tickets are unavailable when the link cannot be loaded", async () => {
    mockedGet.mockRejectedValue({ response: { status: 404 } });
    render(<SmsTicketsClient />);

    expect(
      await screen.findByRole("heading", { name: "Tickets unavailable" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "We couldn't find tickets for this link. Check the text message and try again.",
      ),
    ).toBeInTheDocument();
  });

  it("downloads every Apple pass when the phone adds all tickets", async () => {
    wallets.kinds = ["apple"];
    render(<SmsTicketsClient />);

    const button = await screen.findByRole("button", {
      name: "Add all 2 tickets to Apple Wallet",
    });
    await userEvent.click(button);

    await waitFor(() => {
      expect(mockedApple).toHaveBeenCalledWith("live-token");
    });
    expect(mockedGoogle).not.toHaveBeenCalled();
  });

  it("opens a blank window before saving every ticket to Google Wallet", async () => {
    wallets.kinds = ["apple", "google"];
    const popup = {
      location: { href: "about:blank" },
      opener: window,
      close: vi.fn(),
    };
    const open = vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    let finish: (value: { data: { url: string } }) => void = () => {};
    mockedGoogle.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }) as never,
    );
    render(<SmsTicketsClient />);

    expect(
      await screen.findByRole("button", { name: "Add all 2 tickets to Apple Wallet" }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Add all 2 tickets to Google Wallet" }),
    );

    expect(open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(open.mock.invocationCallOrder[0]).toBeLessThan(
      mockedGoogle.mock.invocationCallOrder[0],
    );
    expect(mockedGoogle).toHaveBeenCalledWith("live-token");
    finish({ data: { url: "https://pay.google.com/gp/v/save/demo-sms" } });
    await waitFor(() => {
      expect(popup.location.href).toBe(
        "https://pay.google.com/gp/v/save/demo-sms",
      );
      expect(popup.opener).toBeNull();
    });
    open.mockRestore();
  });

  it("does not request Google passes when the window is blocked", async () => {
    wallets.kinds = ["apple", "google"];
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<SmsTicketsClient />);

    await userEvent.click(
      await screen.findByRole("button", {
        name: "Add all 2 tickets to Google Wallet",
      }),
    );

    expect(
      screen.getByText(
        "Could not add these tickets to Google Wallet. Try again, or add them one at a time.",
      ),
    ).toBeInTheDocument();
    expect(mockedGoogle).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it("labels an accessible reserved seat and leaves the other seat unlabeled", async () => {
    mockedGet.mockResolvedValue({
      data: demoSmsTickets({
        tickets: [
          demoSmsTicket({
            generalAdmission: false,
            sectionNumber: "101",
            rowNumber: "A",
            seatNumber: "4",
            accessible: true,
            accessibleType: "DA",
            checkInCode: "SEAT-A",
          }),
          demoSmsTicket({
            id: 9,
            uuid: "sms-ticket-other",
            generalAdmission: false,
            sectionNumber: "102",
            rowNumber: "B",
            seatNumber: "5",
            accessible: false,
            checkInCode: "SEAT-B",
          }),
        ],
      }),
    } as never);
    render(<SmsTicketsClient />);

    expect(await screen.findByText("Open space for wheelchair")).toBeInTheDocument();
    expect(screen.getAllByText("Open space for wheelchair")).toHaveLength(1);
    expect(screen.getByText("102")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
