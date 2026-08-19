import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_SESSION, DEMO_USER } from "@/lib/demo/fixtures";

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
import { validateEmail, verifyCode, verifyUser } from "@/lib/api";
import { setSession } from "@/lib/auth";

const mockedValidateEmail = vi.mocked(validateEmail);
const mockedVerifyUser = vi.mocked(verifyUser);
const mockedVerifyCode = vi.mocked(verifyCode);
const mockedSetSession = vi.mocked(setSession);

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
    mockedSetSession.mockReset();
    stubLocation();
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
      await screen.findByText(/that email looks invalid/i),
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
      },
      { timeout: 1500 },
    );
  });
});
