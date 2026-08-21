import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Wallet from "@/components/organisms/Wallet";
import { DEMO_USER } from "@/lib/demo/fixtures";
import { FIELD_COPY } from "@/lib/fieldValidation";

vi.mock("@/lib/api", () => ({
  validateEmail: vi.fn(),
  verifyUser: vi.fn(),
  verifyCode: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  setSession: vi.fn(),
  setLastKnown: vi.fn(),
}));

import { validateEmail, verifyUser } from "@/lib/api";

const mockedValidateEmail = vi.mocked(validateEmail);
const mockedVerifyUser = vi.mocked(verifyUser);

describe("Wallet login fields", () => {
  beforeEach(() => {
    mockedValidateEmail.mockReset();
    mockedVerifyUser.mockReset();
    mockedValidateEmail.mockResolvedValue({ data: { verdict: "Valid" } } as never);
    mockedVerifyUser.mockResolvedValue({} as never);
  });

  it("lowercases the demo email before sending a code", async () => {
    const user = userEvent.setup();
    render(<Wallet initialScreen="login" />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "  Fan@Blocktickets.XYZ  ",
    );
    await user.click(screen.getByRole("button", { name: /send my code/i }));

    await waitFor(() => {
      expect(mockedValidateEmail).toHaveBeenCalledWith({
        email: DEMO_USER.email,
      });
    });
    expect(mockedVerifyUser).toHaveBeenCalledWith({
      data: { phoneNumber: "", email: DEMO_USER.email },
    });
  });

  it("does not call the email API for a blocked domain", async () => {
    const user = userEvent.setup();
    render(<Wallet initialScreen="login" />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "shopper@mailinator.com",
    );
    await user.click(screen.getByRole("button", { name: /send my code/i }));

    expect(await screen.findByText(FIELD_COPY.invalidEmail)).toBeInTheDocument();
    expect(mockedValidateEmail).not.toHaveBeenCalled();
    expect(mockedVerifyUser).not.toHaveBeenCalled();
  });
});
