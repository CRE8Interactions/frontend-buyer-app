import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RedemptionCodeField from "@/components/molecules/RedemptionCodeField";
import { FIELD_COPY } from "@/lib/fieldValidation";

describe("RedemptionCodeField", () => {
  it("shows required copy on submit-style errors and clears on change", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <RedemptionCodeField
        id="promo"
        name="promo"
        label="Promo code"
        hideLabel
        value=""
        onChange={onChange}
        error="required"
      />,
    );

    expect(screen.getByText(FIELD_COPY.promoCodeRequired)).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");

    rerender(
      <RedemptionCodeField
        id="promo"
        name="promo"
        label="Promo code"
        hideLabel
        value="SAVE10"
        onChange={onChange}
        error={null}
      />,
    );
    expect(screen.queryByText(FIELD_COPY.promoCodeRequired)).not.toBeInTheDocument();

    await user.click(screen.getByRole("textbox"));
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows access-code rejection copy and calls onBlur", async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(
      <RedemptionCodeField
        id="access"
        name="accessCode"
        label="Access code"
        value="WRONG"
        onChange={() => {}}
        onBlur={onBlur}
        error="rejected"
      />,
    );

    expect(screen.getByText(FIELD_COPY.accessCodeIncorrect)).toBeInTheDocument();
    await user.click(screen.getByRole("textbox"));
    await user.tab();
    expect(onBlur).toHaveBeenCalledWith("WRONG");
  });
});
