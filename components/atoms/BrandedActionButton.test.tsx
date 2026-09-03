import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BrandedActionButton from "@/components/atoms/BrandedActionButton";

describe("BrandedActionButton", () => {
  it("keeps the idle label when it is not loading", () => {
    render(<BrandedActionButton>Pay now</BrandedActionButton>);

    expect(screen.getByRole("button", { name: "Pay now" })).toBeEnabled();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
  });

  it("shows a spinner, loading copy, and disables while loading", () => {
    render(
      <BrandedActionButton loading loadingLabel="Processing…">
        Pay now
      </BrandedActionButton>,
    );

    const button = screen.getByRole("button", { name: /Processing/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByText("Pay now")).not.toBeInTheDocument();
  });

  it("shows only a spinner and disables when there is no loading copy", () => {
    render(<BrandedActionButton loading>Pay now</BrandedActionButton>);

    const button = screen.getByRole("button", { name: "Loading" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByText("Pay now")).not.toBeInTheDocument();
  });
});
