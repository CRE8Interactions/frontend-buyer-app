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

  it("opens on a phone with the cursor set but the keyboard down", () => {
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
    expect(document.activeElement).toBe(email);
    expect(email.readOnly).toBe(true);

    fireEvent.pointerDown(email);

    expect(email.readOnly).toBe(false);
  });
});
