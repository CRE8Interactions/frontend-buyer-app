import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventTicketsClient from "@/components/organisms/EventTicketsClient";
import { DEMO_EVENTS, DEMO_USER } from "@/lib/demo/fixtures";
import { FIELD_COPY } from "@/lib/fieldValidation";

const event = DEMO_EVENTS[0];

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/my-tickets/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: DEMO_USER,
    ready: true,
    isAuthenticated: true,
  }),
  displayName: () => `${DEMO_USER.firstName} ${DEMO_USER.lastName}`,
  setLastKnown: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  getTicketsByEvent: vi.fn(),
  getMyEvents: vi.fn(),
  getOrder: vi.fn(),
  createTicketTransfer: vi.fn(),
  createListing: vi.fn(),
  downloadApplePass: vi.fn(),
  downloadGooglePass: vi.fn(),
}));

vi.mock("qrcode.react", () => ({
  QRCodeSVG: () => null,
}));

import { createTicketTransfer, getTicketsByEvent } from "@/lib/api";

const mockedGetTickets = vi.mocked(getTicketsByEvent);
const mockedTransfer = vi.mocked(createTicketTransfer);

async function openTransferEmail() {
  const user = userEvent.setup();
  render(<EventTicketsClient eventUUID={event.uuid} />);
  await screen.findByText(event.name);
  await user.click(screen.getByRole("button", { name: /^transfer$/i }));
  await user.click(screen.getByRole("button", { name: /sec ga · row 1 · seat 1/i }));
  await user.click(screen.getByRole("button", { name: /continue/i }));
  return user;
}

describe("ticket transfer email", () => {
  beforeEach(() => {
    mockedGetTickets.mockReset();
    mockedTransfer.mockReset();
    mockedGetTickets.mockResolvedValue({
      data: {
        event: { ...event, enableTransfers: true },
        tickets: [
          {
            id: 11,
            eventUUID: event.uuid,
            sectionNumber: "GA",
            rowNumber: "1",
            seatNumber: "1",
          },
        ],
        order: { id: 90, event: { ...event, enableTransfers: true } },
      },
    } as never);
    mockedTransfer.mockResolvedValue({} as never);
  });

  it("lowercases the recipient before confirming a transfer", async () => {
    const user = await openTransferEmail();
    await user.type(
      screen.getByLabelText(/recipient email/i),
      "  Friend@Blocktickets.XYZ  ",
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByText("friend@blocktickets.xyz")).toBeInTheDocument();
  });

  it("does not call createTicketTransfer for a blocked email", async () => {
    const user = await openTransferEmail();
    await user.type(
      screen.getByLabelText(/recipient email/i),
      "shopper@mailinator.com",
    );
    await user.tab();
    expect(await screen.findByText(FIELD_COPY.invalidEmail)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
    expect(mockedTransfer).not.toHaveBeenCalled();
  });
});
