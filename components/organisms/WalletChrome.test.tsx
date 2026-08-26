import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import WalletChrome from "@/components/organisms/WalletChrome";

describe("WalletChrome", () => {
  it("sends the shopper to Browse from the Blocktickets lockup", () => {
    render(
      <WalletChrome
        items={[{ id: "tickets", label: "Tickets", on: true, onClick: vi.fn() }]}
        showNav
        compact={false}
      />,
    );

    expect(
      screen.getByRole("link", { name: /blocktickets home/i }),
    ).toHaveAttribute("href", expect.stringMatching(/^\/browse\/?$/));
    expect(screen.getByRole("img", { name: /^blocktickets$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^tickets$/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("follows section hrefs and marks the current route", async () => {
    const user = userEvent.setup();
    const onTickets = vi.fn();
    render(
      <WalletChrome
        items={[
          { id: "tickets", label: "Tickets", href: "/wallet/my-tickets", on: true },
          { id: "transfers", label: "Transfers", href: "/wallet/my-tickets/", on: false, onClick: onTickets },
        ]}
        showNav
        compact={false}
      />,
    );

    expect(screen.getByRole("link", { name: /^tickets$/i })).toHaveAttribute(
      "href",
      "/wallet/my-tickets",
    );
    expect(screen.getByRole("link", { name: /^tickets$/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /^transfers$/i })).not.toHaveAttribute(
      "aria-current",
    );

    await user.click(screen.getByRole("link", { name: /^transfers$/i }));
    expect(onTickets).toHaveBeenCalled();
  });
});
