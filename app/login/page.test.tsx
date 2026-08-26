import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_SESSION, DEMO_USER } from "@/lib/demo/fixtures";
import { FIELD_COPY } from "@/lib/fieldValidation";

const navState = { from: "/checkout/?cartId=cart-raptors-1" };

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams({ from: navState.from }),
  usePathname: () => "/login/",
  useParams: () => ({}),
}));

vi.mock("@/lib/api", () => ({
  validateEmail: vi.fn(),
  verifyUser: vi.fn(),
  verifyCode: vi.fn(),
  createNewUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  setSession: vi.fn(),
  getLastKnown: vi.fn(() => null),
}));

import LoginPage from "@/app/login/page";
import { createNewUser, validateEmail, verifyCode, verifyUser } from "@/lib/api";
import { getLastKnown, setSession } from "@/lib/auth";
import { namePatternMatch } from "@/lib/helpers";
import { PHONE_ERROR } from "@/components/molecules/PhoneNumberInput";

const mockedValidateEmail = vi.mocked(validateEmail);
const mockedVerifyUser = vi.mocked(verifyUser);
const mockedVerifyCode = vi.mocked(verifyCode);
const mockedCreateNewUser = vi.mocked(createNewUser);
const mockedSetSession = vi.mocked(setSession);
const mockedGetLastKnown = vi.mocked(getLastKnown);

function stubLocation() {
  const hrefSetter = vi.fn();
  vi.stubGlobal("location", {
    get href() {
      return "http://localhost/login/?from=%2Fcheckout%2F%3FcartId%3Dcart-raptors-1";
    },
    set href(value: string) {
      hrefSetter(value);
    },
    pathname: "/login/",
    search: "?from=%2Fcheckout%2F%3FcartId%3Dcart-raptors-1",
    assign: vi.fn(),
    replace: hrefSetter,
  });
  return hrefSetter;
}

async function sendCodeForDemoUser(user: ReturnType<typeof userEvent.setup>) {
  render(<LoginPage />);
  await user.type(
    screen.getByLabelText(/email address/i),
    DEMO_USER.email,
  );
  await user.click(screen.getByRole("button", { name: /send my code/i }));
  expect(
    await screen.findByLabelText(/six-digit code/i),
  ).toBeInTheDocument();
}

describe("Login page", () => {
  beforeEach(() => {
    navState.from = "/checkout/?cartId=cart-raptors-1";
    mockedValidateEmail.mockResolvedValue({
      data: { verdict: "Valid" },
    } as never);
    mockedVerifyUser.mockResolvedValue({} as never);
    mockedVerifyCode.mockResolvedValue({
      status: 200,
      data: DEMO_SESSION,
    } as never);
    mockedCreateNewUser.mockResolvedValue({
      status: 200,
      data: DEMO_SESSION,
    } as never);
    mockedSetSession.mockReset();
    mockedGetLastKnown.mockReset();
    mockedGetLastKnown.mockReturnValue(null);
    stubLocation();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("offline")),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the sign-in card used before checkout", () => {
    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { name: /your tickets, in one place/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/enter the email you bought with/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/local codes land in/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/localhost:1080/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send my code/i }),
    ).toBeInTheDocument();
    expect(screen.getByAltText("Blocktickets")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /blocktickets home/i }),
    ).toHaveAttribute("href", "/browse/");
    expect(screen.getByRole("button", { name: /send my code/i })).toBeEnabled();
  });

  it("keeps Send my code enabled when the email is empty and shows copy on submit", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /send my code/i }));

    expect(await screen.findByText(FIELD_COPY.invalidEmail)).toBeInTheDocument();
    expect(mockedValidateEmail).not.toHaveBeenCalled();
  });

  it("shows invalid copy on blur of a non-empty bad email without calling the API", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), "not-an-email");
    await user.tab();

    expect(await screen.findByText(FIELD_COPY.invalidEmail)).toBeInTheDocument();
    expect(mockedValidateEmail).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /send my code/i })).toBeEnabled();
  });

  it("submits with Enter and reads a DOM value that never fired React change", async () => {
    render(<LoginPage />);

    const field = screen.getByLabelText(/email address/i);
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(field, `  ${DEMO_USER.email.toUpperCase()}  `);

    fireEvent.submit(field.closest("form")!);

    await waitFor(() => {
      expect(mockedValidateEmail).toHaveBeenCalledWith({
        email: DEMO_USER.email,
      });
    });
  });

  it("sends a code for a valid email and asks for the six-digit code", async () => {
    const user = userEvent.setup();
    await sendCodeForDemoUser(user);

    expect(mockedValidateEmail).toHaveBeenCalledWith({ email: DEMO_USER.email });
    expect(mockedVerifyUser).toHaveBeenCalledWith({
      data: { phoneNumber: "", email: DEMO_USER.email },
    });
    expect(screen.getByText(DEMO_USER.email)).toBeInTheDocument();
    expect(screen.queryByText(/localhost:1080/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/open http/i)).not.toBeInTheDocument();
  });

  it("does not send a code when the email is invalid", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /send my code/i }));

    expect(
      await screen.findByText(FIELD_COPY.invalidEmail),
    ).toBeInTheDocument();
    expect(mockedValidateEmail).not.toHaveBeenCalled();
    expect(mockedVerifyUser).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/six-digit code/i)).not.toBeInTheDocument();
  });

  it("returns to checkout after a valid code", async () => {
    const user = userEvent.setup();
    const hrefSetter = stubLocation();
    await sendCodeForDemoUser(user);

    await user.type(screen.getByLabelText(/six-digit code/i), "123456");

    await waitFor(() => {
      expect(mockedSetSession).toHaveBeenCalledWith(DEMO_SESSION);
    });
    await waitFor(
      () => {
        expect(hrefSetter).toHaveBeenCalledWith(
          "/checkout/?cartId=cart-raptors-1",
        );
        expect(location.replace).toHaveBeenCalledWith(
          "/checkout/?cartId=cart-raptors-1",
        );
      },
      { timeout: 1500 },
    );
  });

  it("does not call the email API for a blocked domain", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "shopper@mailinator.com",
    );
    await user.click(screen.getByRole("button", { name: /send my code/i }));

    expect(
      await screen.findByText(FIELD_COPY.invalidEmail),
    ).toBeInTheDocument();
    expect(mockedValidateEmail).not.toHaveBeenCalled();
    expect(mockedVerifyUser).not.toHaveBeenCalled();
  });

  it("rejects a SendGrid Invalid or Risky email without sending a code", async () => {
    const user = userEvent.setup();
    mockedValidateEmail.mockResolvedValue({
      data: { verdict: "Risky", suggestion: "fan@blocktickets.xyz" },
    } as never);
    render(<LoginPage />);

    await user.type(
      screen.getByLabelText(/email address/i),
      DEMO_USER.email,
    );
    await user.click(screen.getByRole("button", { name: /send my code/i }));

    expect(
      await screen.findByText(FIELD_COPY.invalidEmail),
    ).toBeInTheDocument();
    expect(mockedVerifyUser).not.toHaveBeenCalled();
  });

  it("sends a mixed-case email to the backend as lowercase", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "  Fan@Blocktickets.XYZ  ",
    );
    await user.click(screen.getByRole("button", { name: /send my code/i }));

    await screen.findByLabelText(/six-digit code/i);
    expect(mockedValidateEmail).toHaveBeenCalledWith({
      email: DEMO_USER.email,
    });
    expect(mockedVerifyUser).toHaveBeenCalledWith({
      data: { phoneNumber: "", email: DEMO_USER.email },
    });
  });

  it("shows a network error when email validation fails and allows retry", async () => {
    const user = userEvent.setup();
    mockedValidateEmail.mockRejectedValueOnce(new Error("offline"));
    render(<LoginPage />);

    await user.type(
      screen.getByLabelText(/email address/i),
      DEMO_USER.email,
    );
    await user.click(screen.getByRole("button", { name: /send my code/i }));

    expect(
      await screen.findByText(/experiencing technical difficulties/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/six-digit code/i)).not.toBeInTheDocument();

    mockedValidateEmail.mockResolvedValue({
      data: { verdict: "Valid" },
    } as never);
    await user.click(screen.getByRole("button", { name: /send my code/i }));
    expect(
      await screen.findByLabelText(/six-digit code/i),
    ).toBeInTheDocument();
  });

  it("shows a network error when verifying the code fails, not an incorrect-code message", async () => {
    const user = userEvent.setup();
    mockedVerifyCode.mockRejectedValue(new Error("offline"));
    await sendCodeForDemoUser(user);

    await user.type(screen.getByLabelText(/six-digit code/i), "123456");

    expect(
      await screen.findByText(/experiencing technical difficulties/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(FIELD_COPY.codeIncorrect),
    ).not.toBeInTheDocument();
  });

  it("shows a network error when resend fails", async () => {
    const user = userEvent.setup();
    await sendCodeForDemoUser(user);
    mockedVerifyUser.mockRejectedValueOnce(new Error("offline"));

    await user.click(screen.getByRole("button", { name: /send a new code/i }));

    expect(
      await screen.findByText(/experiencing technical difficulties/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/a new code is on its way/i),
    ).not.toBeInTheDocument();
  });
});

describe("Login page create account", () => {
  beforeEach(() => {
    navState.from = "/checkout/?cartId=cart-raptors-1";
    mockedValidateEmail.mockResolvedValue({
      data: { verdict: "Valid" },
    } as never);
    mockedVerifyUser.mockResolvedValue({} as never);
    mockedVerifyCode.mockResolvedValue({ status: 203, data: {} } as never);
    mockedCreateNewUser.mockResolvedValue({
      status: 200,
      data: DEMO_SESSION,
    } as never);
    mockedSetSession.mockReset();
    mockedGetLastKnown.mockReset();
    mockedGetLastKnown.mockReturnValue(null);
    stubLocation();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("offline")),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function fillMobile(
    user: ReturnType<typeof userEvent.setup>,
    number: string,
  ) {
    const input = screen.getByLabelText(/mobile number/i);
    await user.click(input);
    fireEvent.change(input, { target: { value: number } });
  }

  async function openCreateAccount(user: ReturnType<typeof userEvent.setup>) {
    await sendCodeForDemoUser(user);
    await user.type(screen.getByLabelText(/six-digit code/i), "123456");
    expect(
      await screen.findByRole("heading", {
        name: /let's set up your profile/i,
      }),
    ).toBeInTheDocument();
  }

  it("opens the create-account form with the verified email disabled", async () => {
    const user = userEvent.setup();
    await openCreateAccount(user);

    const emailField = screen.getByLabelText(/email address/i);
    expect(emailField).toBeDisabled();
    expect(emailField).toHaveValue(DEMO_USER.email);
  });

  it("requires first name, last name, phone, and date of birth", async () => {
    const user = userEvent.setup();
    await openCreateAccount(user);

    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(screen.getAllByText(/this field is required/i).length).toBe(2);
    expect(screen.getByText(PHONE_ERROR.required)).toBeInTheDocument();
    expect(screen.getByText(/date of birth is required/i)).toBeInTheDocument();
    expect(mockedCreateNewUser).not.toHaveBeenCalled();
  });

  it("ignores digits in name fields and exposes the letters-only pattern", async () => {
    const user = userEvent.setup();
    await openCreateAccount(user);

    const first = screen.getByLabelText(/first name/i);
    const last = screen.getByLabelText(/last name/i);
    await user.type(first, `${DEMO_USER.firstName}2`);
    await user.type(last, `${DEMO_USER.lastName}9`);

    expect(first).toHaveValue(DEMO_USER.firstName);
    expect(last).toHaveValue(DEMO_USER.lastName);
    expect(first).toHaveAttribute("pattern", namePatternMatch);
    expect(last).toHaveAttribute("pattern", namePatternMatch);
  });

  it("rejects whitespace-only names", async () => {
    const user = userEvent.setup();
    await openCreateAccount(user);

    await user.type(screen.getByLabelText(/first name/i), "   ");
    await user.type(screen.getByLabelText(/last name/i), "   ");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(screen.getAllByText(/this field is required/i).length).toBe(2);
    expect(mockedCreateNewUser).not.toHaveBeenCalled();
  });

  it("rejects an invalid phone number", async () => {
    const user = userEvent.setup();
    await openCreateAccount(user);

    await user.type(screen.getByLabelText(/first name/i), DEMO_USER.firstName);
    await user.type(screen.getByLabelText(/last name/i), DEMO_USER.lastName);
    await fillMobile(user, "123");
    await user.type(screen.getByLabelText(/birth date/i), DEMO_USER.dob);
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(screen.getByText(PHONE_ERROR.invalid)).toBeInTheDocument();
    expect(mockedCreateNewUser).not.toHaveBeenCalled();
  });

  it("rejects a future date of birth", async () => {
    const user = userEvent.setup();
    await openCreateAccount(user);

    await user.type(screen.getByLabelText(/first name/i), DEMO_USER.firstName);
    await user.type(screen.getByLabelText(/last name/i), DEMO_USER.lastName);
    await fillMobile(user, DEMO_USER.phoneNumber);
    await user.type(screen.getByLabelText(/birth date/i), "01/01/2099");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(
      screen.getByText(/date of birth is incorrect/i),
    ).toBeInTheDocument();
    expect(mockedCreateNewUser).not.toHaveBeenCalled();
  });

  it("shows an existing-phone error when the account already exists", async () => {
    const user = userEvent.setup();
    mockedCreateNewUser.mockResolvedValue({ status: 226, data: {} } as never);
    await openCreateAccount(user);

    await user.type(screen.getByLabelText(/first name/i), DEMO_USER.firstName);
    await user.type(screen.getByLabelText(/last name/i), DEMO_USER.lastName);
    await fillMobile(user, DEMO_USER.phoneNumber);
    await user.type(screen.getByLabelText(/birth date/i), DEMO_USER.dob);
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(await screen.findByText(PHONE_ERROR.exists)).toBeInTheDocument();
    expect(mockedSetSession).not.toHaveBeenCalled();
  });

  it("shows a network error when creating the account fails", async () => {
    const user = userEvent.setup();
    mockedCreateNewUser.mockRejectedValue(new Error("offline"));
    await openCreateAccount(user);

    await user.type(screen.getByLabelText(/first name/i), DEMO_USER.firstName);
    await user.type(screen.getByLabelText(/last name/i), DEMO_USER.lastName);
    await fillMobile(user, DEMO_USER.phoneNumber);
    await user.type(screen.getByLabelText(/birth date/i), DEMO_USER.dob);
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(
      await screen.findByText(/experiencing technical difficulties/i),
    ).toBeInTheDocument();
  });

  it("creates the account with the fixture profile and signs in", async () => {
    const user = userEvent.setup();
    const hrefSetter = stubLocation();
    await openCreateAccount(user);

    await user.type(screen.getByLabelText(/first name/i), DEMO_USER.firstName);
    await user.type(screen.getByLabelText(/last name/i), DEMO_USER.lastName);
    await fillMobile(user, DEMO_USER.phoneNumber);
    await user.type(screen.getByLabelText(/birth date/i), DEMO_USER.dob);
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(mockedCreateNewUser).toHaveBeenCalledWith({
        data: {
          email: DEMO_USER.email,
          firstName: DEMO_USER.firstName,
          lastName: DEMO_USER.lastName,
          phoneNumber: DEMO_USER.phoneNumber,
          dob: DEMO_USER.dob,
        },
      });
    });
    await waitFor(() => {
      expect(mockedSetSession).toHaveBeenCalledWith(DEMO_SESSION);
    });
    await waitFor(
      () => {
        expect(hrefSetter).toHaveBeenCalledWith(
          "/checkout/?cartId=cart-raptors-1",
        );
      },
      { timeout: 1500 },
    );
  });

  it("returns to the last page after signup when login has no from param", async () => {
    const user = userEvent.setup();
    navState.from = "";
    mockedGetLastKnown.mockReturnValue("/checkout/?cartId=cart-raptors-1");
    const hrefSetter = stubLocation();
    await openCreateAccount(user);

    await user.type(screen.getByLabelText(/first name/i), DEMO_USER.firstName);
    await user.type(screen.getByLabelText(/last name/i), DEMO_USER.lastName);
    await fillMobile(user, DEMO_USER.phoneNumber);
    await user.type(screen.getByLabelText(/birth date/i), DEMO_USER.dob);
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(mockedSetSession).toHaveBeenCalledWith(DEMO_SESSION);
    });
    await waitFor(
      () => {
        expect(hrefSetter).toHaveBeenCalledWith(
          "/checkout/?cartId=cart-raptors-1",
        );
      },
      { timeout: 1500 },
    );
  });
});
