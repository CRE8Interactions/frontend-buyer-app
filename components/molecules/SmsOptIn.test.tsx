import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SmsOptIn from "@/components/molecules/SmsOptIn";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("SmsOptIn", () => {
  it("starts unchecked and shows the SMS consent disclosure", () => {
    render(<SmsOptIn checked={false} onChange={() => {}} />);

    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByText(/Message and data rates may apply/i)).toBeInTheDocument();
    expect(screen.getByText(/Reply STOP to cancel/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/privacy-policy/",
    );
    expect(screen.getByRole("link", { name: "Terms & Conditions" })).toHaveAttribute(
      "href",
      "/terms-conditions/",
    );
  });

  it("reports when the person opts in", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SmsOptIn checked={false} onChange={onChange} />);

    await user.click(screen.getByRole("checkbox"));

    expect(onChange).toHaveBeenCalledWith(true);
  });
});
