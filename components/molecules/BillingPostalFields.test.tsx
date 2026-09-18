import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import BillingPostalFields from "./BillingPostalFields";

describe("BillingPostalFields", () => {
  it("asks for a postal code when the country is Canada", () => {
    render(
      <BillingPostalFields
        country="CA"
        postal=""
        onCountryChange={vi.fn()}
        onPostalChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Postal code")).toBeInTheDocument();
    expect(screen.queryByLabelText("ZIP")).not.toBeInTheDocument();
  });

  it("asks for ZIP when the country is the United States", async () => {
    const onCountryChange = vi.fn();
    const user = userEvent.setup();
    render(
      <BillingPostalFields
        country="US"
        postal=""
        error="invalid"
        onCountryChange={onCountryChange}
        onPostalChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("ZIP")).toBeInTheDocument();
    expect(screen.getByText("ZIP is invalid. Please try again.")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Billing country"), "CA");
    expect(onCountryChange).toHaveBeenCalledWith("CA");
  });
});
