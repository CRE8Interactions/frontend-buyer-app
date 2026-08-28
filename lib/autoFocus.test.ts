import { afterEach, describe, expect, it } from "vitest";
import { firstAutoFocusField, focusFirstField } from "@/lib/autoFocus";

function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  return host;
}

/** Reads as a phone, where focusing a text field slides the keyboard up. */
function usePhone() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) =>
      ({ matches: query === "(pointer: coarse)" }) as MediaQueryList,
  });
}

afterEach(() => {
  document.body.innerHTML = "";
  Reflect.deleteProperty(window, "matchMedia");
});

describe("firstAutoFocusField", () => {
  it("picks the first field a shopper can type into", () => {
    const host = mount(`
      <input type="hidden" name="cartId" value="cart-1" />
      <input type="checkbox" name="save" />
      <input name="promo" disabled />
      <input name="email" readonly />
      <input name="phone" data-no-autofocus />
      <input name="firstName" />
      <textarea name="notes"></textarea>
    `);

    expect(firstAutoFocusField(host)).toHaveProperty("name", "firstName");
  });

  it("has nothing to focus when a popup only has buttons", () => {
    const host = mount(`
      <button type="button">Close</button>
      <input type="submit" value="Transfer" />
    `);

    expect(firstAutoFocusField(host)).toBeNull();
    expect(firstAutoFocusField(null)).toBeNull();
  });
});

describe("focusFirstField", () => {
  it("moves the cursor into the first field", () => {
    const host = mount(`<input name="email" /><input name="code" />`);

    expect(focusFirstField(host)).toBe(true);
    expect(document.activeElement).toHaveProperty("name", "email");
  });

  it("leaves an already-focused field alone", () => {
    const host = mount(`<input name="email" /><input name="code" />`);
    const code = host.querySelector<HTMLInputElement>('[name="code"]')!;
    code.focus();

    expect(focusFirstField(host)).toBe(false);
    expect(document.activeElement).toBe(code);
  });

  it("holds the cursor on a phone without opening the keyboard", () => {
    usePhone();
    const host = mount(`<input name="email" />`);
    const email = host.querySelector<HTMLInputElement>('[name="email"]')!;

    expect(focusFirstField(host)).toBe(true);
    expect(document.activeElement).toBe(email);
    // Read-only keeps the keyboard down until the shopper reaches for the field.
    expect(email.readOnly).toBe(true);

    email.dispatchEvent(new Event("pointerdown", { bubbles: true }));

    expect(email.readOnly).toBe(false);
  });
});
