"use client";

import { useCallback } from "react";
import { focusWithoutKeyboard } from "@/lib/autoFocus";

/**
 * Ref for the field that should hold the cursor when a form or popup opens. Use
 * it instead of the native `autoFocus` attribute, which pops the software
 * keyboard open on phones.
 */
export default function useAutoFocus<
  T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
>(enabled: boolean) {
  return useCallback(
    (field: T | null) => {
      if (enabled) focusWithoutKeyboard(field);
    },
    [enabled],
  );
}
