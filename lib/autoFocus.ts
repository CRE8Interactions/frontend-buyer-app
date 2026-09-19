/**
 * Shopper forms and popups drop the cursor straight into their first field, so a
 * login, create-account, or popup form can be typed into without a tap first.
 * Phones skip that focus — focusing a text field slides the software keyboard
 * up and hides the form, and a read-only lock then blocks the keyboard when the
 * shopper later taps the field.
 */

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** Controls that cannot be typed into, so they never win the initial focus. */
const SKIP_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

/**
 * Touch devices slide a software keyboard up whenever a text field takes focus.
 * A touchscreen laptop still reports its mouse, so it keeps desktop behaviour.
 */
export function raisesSoftKeyboard(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const hints = (
    navigator as Navigator & { userAgentData?: { mobile?: boolean } }
  ).userAgentData;
  if (hints?.mobile) return true;
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "")) return true;
  if (typeof window.matchMedia === "function") {
    return (
      window.matchMedia("(pointer: coarse)").matches &&
      !window.matchMedia("(hover: hover)").matches
    );
  }
  return false;
}

function isTypable(field: Field) {
  return field.tagName === "INPUT" || field.tagName === "TEXTAREA";
}

/**
 * Desktop: put the cursor in the field. Phones: leave the field alone so the
 * shopper's tap is what focuses it and raises the keyboard.
 */
export function focusWithoutKeyboard(field?: Field | null): boolean {
  if (!field) return false;
  if (raisesSoftKeyboard() && isTypable(field)) return false;
  field.focus({ preventScroll: true });
  return true;
}

/**
 * First field a shopper should land in. Skips disabled, read-only, hidden, and
 * non-typable controls, plus anything opted out with `data-no-autofocus`.
 */
export function firstAutoFocusField(
  container?: HTMLElement | null,
): Field | null {
  if (!container) return null;
  const fields = container.querySelectorAll<Field>("input, textarea, select");
  for (const field of fields) {
    if (field.disabled) continue;
    if ("readOnly" in field && field.readOnly) continue;
    if (field.dataset.noAutofocus !== undefined) continue;
    if (field.getAttribute("aria-hidden") === "true") continue;
    if (field.tagName === "INPUT" && SKIP_INPUT_TYPES.has((field as HTMLInputElement).type)) {
      continue;
    }
    return field;
  }
  return null;
}

/**
 * Focuses that field. Leaves focus alone when it already sits inside the
 * container, so a field that already holds the cursor is not overridden.
 */
export function focusFirstField(container?: HTMLElement | null): boolean {
  if (!container) return false;
  const active = container.ownerDocument?.activeElement;
  if (active && active !== container.ownerDocument?.body && container.contains(active)) {
    return false;
  }
  return focusWithoutKeyboard(firstAutoFocusField(container));
}
