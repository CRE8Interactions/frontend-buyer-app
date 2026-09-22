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

  it("stays centered on mobile by default", () => {
    render(
      <Modal title="Cart expired" onClose={vi.fn()} variant="light">
        <p>Your reserved tickets were released.</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog")).not.toHaveClass("max-[899px]:rounded-t-[26px]");
    expect(screen.getByRole("dialog")).toHaveClass("rounded-2xl");
    expect(screen.getByRole("dialog").parentElement).toHaveClass("items-center");
    expect(screen.getByRole("dialog").parentElement).not.toHaveClass("max-[899px]:items-end");
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

  it("shows a top-right Close control by default", () => {
    render(
      <Modal title="Transfer tickets" onClose={vi.fn()}>
        <p>Confirm transfer</p>
      </Modal>,
    );

    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("hides the top-right Close control when hideClose is set", () => {
    render(
      <Modal title="Are you sure you want to exit?" onClose={vi.fn()} hideClose>
        <p>You will lose your selected tickets.</p>
      </Modal>,
    );

    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    expect(screen.getByText("You will lose your selected tickets.")).toBeInTheDocument();
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

  it("dismisses Event information when the backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal title="Event information" onClose={onClose} closeOnBackdrop>
        <p>Venue and lineup</p>
      </Modal>,
    );

    fireEvent.click(screen.getByRole("dialog").parentElement!.parentElement!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not dismiss from the backdrop while busy", () => {
    const onClose = vi.fn();
    render(
      <Modal title="Event information" onClose={onClose} closeOnBackdrop busy>
        <p>Venue and lineup</p>
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
