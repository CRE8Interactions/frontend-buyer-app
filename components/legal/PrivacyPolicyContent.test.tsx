import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PrivacyPolicyContent from "@/components/legal/PrivacyPolicyContent";

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

describe("PrivacyPolicyContent", () => {
  it("discloses SMS text messaging and that opt-in data is not shared", () => {
    render(<PrivacyPolicyContent />);

    expect(
      screen.getByRole("heading", { name: "SMS Text Messaging" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/No mobile information will be shared/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/from Profile in your wallet/i),
    ).toBeInTheDocument();
  });
});
