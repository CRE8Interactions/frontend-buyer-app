import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import GuestContact from "@/components/organisms/GuestContact";
import { DEMO_USER } from "@/lib/demo/fixtures";
import { FIELD_COPY } from "@/lib/fieldValidation";

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

describe("GuestContact", () => {
  it("continues with the demo user's normalized details", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(
      <GuestContact
        loginHref="/login/?from=%2Fcheckout%2F"
        onContinue={onContinue}
      />,
    );

    await user.type(
      screen.getByLabelText(/^email$/i),
      `  ${DEMO_USER.email.toUpperCase()}  `,
    );
    await user.type(
      screen.getByLabelText(/first name/i),
      DEMO_USER.firstName,
    );
    await user.type(screen.getByLabelText(/last name/i), DEMO_USER.lastName);
    await user.click(
      screen.getByRole("button", { name: /continue to payment/i }),
    );

    expect(onContinue).toHaveBeenCalledWith({
      email: DEMO_USER.email,
      firstName: DEMO_USER.firstName,
      lastName: DEMO_USER.lastName,
    });
  });

  it("blocks a disposable email and ignores digits in names", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(
      <GuestContact loginHref="/login/" onContinue={onContinue} />,
    );

    await user.type(screen.getByLabelText(/^email$/i), "bot@mailinator.com");
    await user.type(screen.getByLabelText(/first name/i), `${DEMO_USER.firstName}2`);
    await user.type(screen.getByLabelText(/last name/i), DEMO_USER.lastName);
    await user.click(
      screen.getByRole("button", { name: /continue to payment/i }),
    );

    expect(onContinue).not.toHaveBeenCalled();
    expect(screen.getByText(FIELD_COPY.invalidEmail)).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toHaveValue(DEMO_USER.firstName);
    expect(
      screen.getByRole("button", { name: /continue to payment/i }),
    ).toBeEnabled();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/login/",
    );
  });

  it("keeps Continue enabled when empty and validates on Enter", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<GuestContact loginHref="/login/" onContinue={onContinue} />);

    expect(
      screen.getByRole("button", { name: /continue to payment/i }),
    ).toBeEnabled();
    await user.click(screen.getByLabelText(/^email$/i));
    await user.keyboard("{Enter}");

    expect(onContinue).not.toHaveBeenCalled();
    expect(screen.getByText(FIELD_COPY.invalidEmail)).toBeInTheDocument();
    expect(screen.getAllByText(/this field is required/i).length).toBe(2);
  });
});
