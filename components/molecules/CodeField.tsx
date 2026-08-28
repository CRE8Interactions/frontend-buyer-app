"use client";

import { useMemo, useRef, type KeyboardEvent } from "react";
import useAutoFocus from "@/hooks/useAutoFocus";
import {
  FIELD_COPY,
  fieldClass,
  fieldErrorTextClass,
  normalizeOtp,
  type FieldVariant,
} from "@/lib/fieldValidation";

export type CodeError = "code" | "network" | null;

const BOXES = [0, 1, 2, 3, 4, 5];

export default function CodeField({
  id,
  name = "code",
  value,
  onChange,
  onComplete,
  error = null,
  disabled = false,
  variant = "light",
  layout = "boxes",
  label,
  autoFocus = false,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: CodeError;
  disabled?: boolean;
  variant?: FieldVariant;
  layout?: "boxes" | "input";
  label?: string;
  autoFocus?: boolean;
}) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const focusRef = useAutoFocus<HTMLInputElement>(autoFocus);
  const setBoxRef = useMemo(
    () =>
      BOXES.map((index) => (field: HTMLInputElement | null) => {
        boxes.current[index] = field;
        if (index === 0) focusRef(field);
      }),
    [focusRef],
  );
  const setValue = (raw: string) => {
    const next = normalizeOtp(raw);
    onChange(next);
    if (next.length === 6) onComplete?.(next);
    return next;
  };
  const focusBox = (index: number) =>
    boxes.current[Math.min(Math.max(index, 0), BOXES.length - 1)]?.focus();

  /** Digits land in the box that was typed in; a whole code fills from there. */
  const typeInBox = (index: number, raw: string) => {
    const digits = normalizeOtp(raw);
    if (!digits) {
      setValue(value.slice(0, index) + value.slice(index + 1));
      return;
    }
    const next = setValue(
      digits.length > 1
        ? value.slice(0, index) + digits
        : value.slice(0, index) + digits + value.slice(index + 1),
    );
    focusBox(Math.min(index + digits.length, next.length));
  };

  const moveInBoxes = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !value[index] && index > 0) {
      event.preventDefault();
      setValue(value.slice(0, index - 1) + value.slice(index));
      focusBox(index - 1);
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusBox(index - 1);
      return;
    }
    if (event.key === "ArrowRight" && index < BOXES.length - 1) {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  if (layout === "input") {
    const invalid = Boolean(error);
    return (
      <div>
        {label ? (
          <label
            htmlFor={id}
            className={
              variant === "dark"
                ? "block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#9DA2B3]"
                : "text-[12px] font-semibold text-[#4a5567]"
            }
          >
            {label}
          </label>
        ) : null}
        <input
          id={id}
          name={name}
          value={value}
          inputMode="numeric"
          autoComplete="one-time-code"
          ref={focusRef}
          maxLength={6}
          disabled={disabled}
          aria-invalid={invalid}
          aria-label={label || "Six-digit code"}
          onChange={(e) => setValue(e.target.value)}
          onInput={(e) => setValue(e.currentTarget.value)}
          placeholder="6 digit code"
          className={`${label ? "mt-2.5" : ""} ${fieldClass(variant, invalid)}`}
        />
        {error === "code" ? (
          <p className={fieldErrorTextClass(variant)}>
            {FIELD_COPY.codeIncorrect}
          </p>
        ) : error === "network" ? (
          <p className={fieldErrorTextClass(variant)}>{FIELD_COPY.network}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-6 gap-2">
        {BOXES.map((i) => (
          <input
            key={i}
            id={i === 0 ? id : undefined}
            ref={setBoxRef[i]}
            value={value[i] || ""}
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label={i === 0 ? "Six-digit code" : `Digit ${i + 1} of 6`}
            aria-invalid={Boolean(error)}
            disabled={disabled}
            onChange={(e) => typeInBox(i, e.target.value)}
            onKeyDown={(e) => moveInBoxes(i, e)}
            onFocus={(e) => e.currentTarget.select()}
            className={`h-[54px] w-full rounded-[14px] border text-center text-[22px] font-semibold tabular-nums text-[#051b35] md:h-[60px] ${
              error
                ? "border-[#c2394a]"
                : "border-[rgba(5,27,53,0.12)] focus:border-[#a6e773]"
            } ${value[i] ? "bg-white" : "bg-[#f7f8fc] focus:bg-white"}`}
          />
        ))}
      </div>
      {/* One box per digit, so the whole code still submits as a single field. */}
      <input type="hidden" name={name} value={value} />
      {error === "code" ? (
        <p className="mt-2 text-center text-[13px] text-[#c2394a]">
          {FIELD_COPY.codeIncorrect}
        </p>
      ) : error === "network" ? (
        <p className="mt-2 text-center text-[13px] text-[#c2394a]">
          {FIELD_COPY.network}
        </p>
      ) : null}
    </div>
  );
}
