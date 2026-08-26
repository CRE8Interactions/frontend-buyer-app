import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PersonalDetailsPage from "@/app/settings/personal-details/page";
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/settings/personal-details/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

vi.mock("@/lib/api", () => ({
  updatePersonalDetails: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: DEMO_USER,
    ready: true,
    isAuthenticated: true,
    refresh: vi.fn(),
  }),
  displayName: () => `${DEMO_USER.firstName} ${DEMO_USER.lastName}`,
  getSession: () => ({ jwt: "demo-jwt-token", user: DEMO_USER }),
  setSession: vi.fn(),
  setLastKnown: vi.fn(),
}));

import { updatePersonalDetails } from "@/lib/api";

const mockedUpdate = vi.mocked(updatePersonalDetails);

describe("Personal details fields", () => {
  beforeEach(() => {
    mockedUpdate.mockReset();
    mockedUpdate.mockResolvedValue({ data: { user: DEMO_USER } } as never);
  });

  it("saves the demo user with a lowercased email", async () => {
    const user = userEvent.setup();
    render(<PersonalDetailsPage />);

    const last = screen.getByLabelText(/last name/i);
    await user.type(last, "s");
    await user.click(screen.getByRole("button", { name: /update/i }));

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith({
        data: {
          firstName: DEMO_USER.firstName,
          lastName: `${DEMO_USER.lastName}s`,
          email: DEMO_USER.email,
        },
      });
    });
  });

  it("never calls the API for a blocked email and ignores digits in names", async () => {
    const user = userEvent.setup();
    render(<PersonalDetailsPage />);

    const first = screen.getByLabelText(/first name/i);
    await user.type(first, "1");
    expect(first).toHaveValue(DEMO_USER.firstName);

    const email = screen.getByLabelText(/^email$/i);
    await user.clear(email);
    await user.type(email, "shopper@mailinator.com");
    await user.tab();
    expect(await screen.findByText(FIELD_COPY.invalidEmail)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update/i })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /update/i }));
    expect(mockedUpdate).not.toHaveBeenCalled();
  });
});
