"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  DOB_INVALID_MESSAGE,
  DOB_REQUIRED_MESSAGE,
  dobBlurError,
  editDobInput,
  lightFieldClass,
} from "@/lib/fieldValidation";

export type DobFieldError = "required" | "invalid" | null;

export default function DobField({
  id = "dob",
  name = "dob",
  value,
  onChange,
  onBlur,
  error = null,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (error: "invalid" | null) => void;
  error?: DobFieldError;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pendingCaretRef = useRef<number | null>(null);
  const handlingRef = useRef(false);
  const [caretEpoch, setCaretEpoch] = useState(0);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const caret = pendingCaretRef.current;
    if (!input || caret == null || document.activeElement !== input) return;
    input.setSelectionRange(caret, caret);
  }, [value, caretEpoch]);

  const sync = (event: React.FormEvent<HTMLInputElement>) => {
    if (handlingRef.current) return;
    handlingRef.current = true;
    queueMicrotask(() => {
      handlingRef.current = false;
    });

    const input = event.currentTarget;
    const nativeEvent = event.nativeEvent as InputEvent;
    const edit = editDobInput(
      value,
      input.value,
      input.selectionStart,
      nativeEvent.inputType,
    );
    pendingCaretRef.current = edit.caret;
    const caret = Math.min(edit.caret, edit.value.length);
    input.value = edit.value;
    input.setSelectionRange(caret, caret);
    onChange(edit.value);
    setCaretEpoch((epoch) => epoch + 1);
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="text-[12px] font-semibold text-[#4a5567]"
      >
        Birth date
      </label>
      <input
        ref={inputRef}
        id={id}
        name={name}
        value={value}
        required
        autoComplete="bday"
        aria-invalid={Boolean(error)}
        onChange={sync}
        onInput={sync}
        onBlur={(event) => onBlur?.(dobBlurError(event.currentTarget.value))}
        placeholder="MM/DD/YYYY"
        inputMode="numeric"
        className={`mt-2 ${lightFieldClass(Boolean(error))}`}
      />
      {error === "required" ? (
        <p className="mt-2 text-[13px] text-[#c2394a]">
          {DOB_REQUIRED_MESSAGE}
        </p>
      ) : error === "invalid" ? (
        <p className="mt-2 text-[13px] text-[#c2394a]">
          {DOB_INVALID_MESSAGE}
        </p>
      ) : (
        <p className="mt-1.5 text-[12px] text-[#8a93a3]">
          Format: MM/DD/YYYY
        </p>
      )}
    </div>
  );
}
