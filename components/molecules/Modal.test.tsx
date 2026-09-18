import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Modal from "@/components/molecules/Modal";
import { DEMO_USER } from "@/lib/demo/fixtures";

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
});

describe("Modal", () => {
  it("drops the cursor into the popup's first typable field", () => {
    render(
      <Modal title="Transfer tickets" onClose={vi.fn()}>
        <input type="checkbox" name="agree" />
        <input aria-label="Email address" defaultValue={DEMO_USER.email} />
      </Modal>,
    );

    expect(document.activeElement).toBe(
      screen.getByLabelText("Email address"),
    );
  });

  it("keeps focus out of read-only and field-less popups", () => {
    const { unmount } = render(
      <Modal title="Order receipt" onClose={vi.fn()}>
        <input aria-label="Order id" readOnly defaultValue="order-1" />
      </Modal>,
    );

    expect(document.activeElement).toBe(document.body);
    unmount();

    render(
      <Modal title="Seat view" onClose={vi.fn()}>
        <p>Row 12 view</p>
      </Modal>,
    );

    expect(document.activeElement).toBe(document.body);
  });

  it("renders as a bottom sheet when sheet mode is enabled", () => {
    render(
      <Modal title="Event information" onClose={vi.fn()} sheet>
        <p>Details</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog")).toHaveClass("rounded-t-[26px]");
  });

  it("includes mobile bottom-sheet layout classes by default", () => {
    render(
      <Modal title="Cart expired" onClose={vi.fn()} variant="light">
        <p>Your reserved tickets were released.</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog")).toHaveClass("max-[899px]:rounded-t-[26px]");
    expect(screen.getByRole("dialog").parentElement).toHaveClass("max-[899px]:items-end");
  });

  it("stays centered on mobile when sheet mode is disabled", () => {
    render(
      <Modal title="Design preview" onClose={vi.fn()} sheet={false}>
        <p>Always centered</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog")).not.toHaveClass("max-[899px]:rounded-t-[26px]");
    expect(screen.getByRole("dialog")).toHaveClass("rounded-2xl");
  });

  it("does not dismiss when the backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal title="Transfer tickets" onClose={onClose}>
        <p>Confirm transfer</p>
      </Modal>,
    );

    fireEvent.click(screen.getByRole("dialog").parentElement!.parentElement!);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not steal focus on a phone so a tap can raise the keyboard", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) =>
        ({ matches: query === "(pointer: coarse)" }) as MediaQueryList,
    });

    render(
      <Modal title="Transfer tickets" onClose={vi.fn()}>
        <input aria-label="Email address" defaultValue={DEMO_USER.email} />
      </Modal>,
    );

    const email = screen.getByLabelText<HTMLInputElement>("Email address");
    expect(document.activeElement).not.toBe(email);
    expect(email.readOnly).toBe(false);

    email.focus();

    expect(document.activeElement).toBe(email);
    expect(email.readOnly).toBe(false);
  });
});
