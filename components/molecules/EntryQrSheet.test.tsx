import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EntryQrSheet from "@/components/molecules/EntryQrSheet";
import { demoAccessPass } from "@/lib/demo/fixtures";

describe("EntryQrSheet", () => {
  it("shows the title, hint, and QR for the entry code", () => {
    const pass = demoAccessPass();
    render(
      <EntryQrSheet
        title={pass.name}
        value={pass.checkInCode}
        qrAriaLabel={`Enlarged QR code for ${pass.name}`}
        hint="Show this code at entry for any included event."
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: pass.name }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Show this code at entry for any included event."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: `Enlarged QR code for ${pass.name}` }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add to Apple Wallet" }),
    ).not.toBeInTheDocument();
  });

  it("closes from the QR control and renders a wallet footer when provided", () => {
    const pass = demoAccessPass();
    const onClose = vi.fn();
    render(
      <EntryQrSheet
        title={pass.name}
        value={pass.checkInCode}
        qrAriaLabel={`Enlarged QR code for ${pass.name}`}
        hint="Scan this code at entry"
        onClose={onClose}
      >
        <button type="button">Add to Apple Wallet</button>
      </EntryQrSheet>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close QR code" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Add to Apple Wallet" }),
    ).toBeInTheDocument();
  });
});
