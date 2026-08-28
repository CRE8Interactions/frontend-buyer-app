/**
 * Shopper forms and popups drop the cursor straight into their first field, so a
 * login, create-account, or popup form can be typed into without a tap first.
 * Phones get the cursor too, but the software keyboard stays down until the
 * shopper reaches for the field — an unasked-for keyboard hides the form.
 */

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type TypableField = HTMLInputElement | HTMLTextAreaElement;

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

/** First signs the shopper wants to type, so typing must be handed back. */
const TYPING_INTENT_EVENTS = ["pointerdown", "touchstart", "keydown"] as const;

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

function isTypable(field: Field): field is TypableField {
  return field.tagName === "INPUT" || field.tagName === "TEXTAREA";
}

/**
 * Puts the cursor in a field without summoning the keyboard: a touch browser
 * leaves it down for a read-only field, and the first tap or key press makes the
 * field typable again before the shopper's input can land.
 */
export function focusWithoutKeyboard(field?: Field | null): boolean {
  if (!field) return false;
  if (!raisesSoftKeyboard() || !isTypable(field)) {
    field.focus({ preventScroll: true });
    return true;
  }

  const wasReadOnly = field.readOnly;
  field.readOnly = true;
  field.focus({ preventScroll: true });

  const doc = field.ownerDocument;
  const handOverTyping = () => {
    field.readOnly = wasReadOnly;
    TYPING_INTENT_EVENTS.forEach((type) =>
      doc.removeEventListener(type, handOverTyping, true),
    );
  };
  TYPING_INTENT_EVENTS.forEach((type) =>
    doc.addEventListener(type, handOverTyping, true),
  );
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
