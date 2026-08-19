import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BrandedCheckoutShell from "@/components/organisms/BrandedCheckoutShell";
import { formatHoldClock } from "@/lib/checkoutBranding";
import { DEMO_ORGS, demoCheckoutCart } from "@/lib/demo/fixtures";

vi.mock("next/navigation", () => ({
  usePathname: () => "/checkout/",
  useParams: () => ({}),
}));

const raptors = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;

describe("BrandedCheckoutShell", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows secure checkout chrome and the seat-hold clock", () => {
    const cart = demoCheckoutCart();
    render(
      <BrandedCheckoutShell
        accent={raptors.branding.primaryColor}
        remainingSeconds={cart.remainingTime}
        onBack={() => undefined}
      >
        <p>Payment form</p>
      </BrandedCheckoutShell>,
    );

    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    expect(screen.getByText("Secure checkout")).toBeInTheDocument();
    expect(
      screen.getByText(`Seats held ${formatHoldClock(cart.remainingTime)}`),
    ).toBeInTheDocument();
    expect(screen.getByText("Payment form")).toBeInTheDocument();
  });

  it("hides the seat-hold clock when remaining seconds are missing", () => {
    render(
      <BrandedCheckoutShell accent="#051b35" onBack={() => undefined}>
        <p>Payment form</p>
      </BrandedCheckoutShell>,
    );

    expect(screen.queryByText(/seats held/i)).not.toBeInTheDocument();
    expect(screen.getByText("Secure checkout")).toBeInTheDocument();
  });

  it("notifies when the hold clock runs out", () => {
    vi.useFakeTimers();
    const onExpire = vi.fn();
    render(
      <BrandedCheckoutShell
        accent={raptors.branding.primaryColor}
        remainingSeconds={1}
        onBack={() => undefined}
        onExpire={onExpire}
      >
        <p>Payment form</p>
      </BrandedCheckoutShell>,
    );

    expect(screen.getByText("Seats held 0:01")).toBeInTheDocument();
    expect(onExpire).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Seats held 0:00")).toBeInTheDocument();
  });

  it("notifies immediately when the hold is already expired", () => {
    const onExpire = vi.fn();
    render(
      <BrandedCheckoutShell
        accent={raptors.branding.primaryColor}
        remainingSeconds={0}
        onBack={() => undefined}
        onExpire={onExpire}
      >
        <p>Payment form</p>
      </BrandedCheckoutShell>,
    );

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Seats held 0:00")).toBeInTheDocument();
  });

  it("pauses the hold clock without expiring when holdPaused is true", () => {
    vi.useFakeTimers();
    const onExpire = vi.fn();
    const { rerender } = render(
      <BrandedCheckoutShell
        accent={raptors.branding.primaryColor}
        remainingSeconds={5}
        holdPaused={false}
        onBack={() => undefined}
        onExpire={onExpire}
      >
        <p>Payment form</p>
      </BrandedCheckoutShell>,
    );

    expect(screen.getByText("Seats held 0:05")).toBeInTheDocument();

    rerender(
      <BrandedCheckoutShell
        accent={raptors.branding.primaryColor}
        remainingSeconds={5}
        holdPaused
        onBack={() => undefined}
        onExpire={onExpire}
      >
        <p>Payment form</p>
      </BrandedCheckoutShell>,
    );

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(onExpire).not.toHaveBeenCalled();
    expect(screen.getByText("Seats held 0:05")).toBeInTheDocument();
  });
});
