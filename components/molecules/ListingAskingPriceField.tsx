"use client";

import type { KeyboardEvent } from "react";
import useAutoFocus from "@/hooks/useAutoFocus";
import { browseLeading } from "@/lib/browseType";
import { BLOCKTICKETS_NAVY, ERROR_COLOR } from "@/lib/branding";
import { formatCurrency } from "@/lib/helpers";
import { fluidSize } from "@/lib/shopperFluidType";
import {
  askingPriceInput,
  listingAskingPriceError,
  listingPriceDraft,
} from "@/lib/walletListings";

const INK = BLOCKTICKETS_NAVY;
const SUB = "#6e7180";
const FAINT = "#4a5567";
const FIELD = "#f7f8fc";

/** Price step shared by selling a ticket and editing a listing. */
export default function ListingAskingPriceField({
  id,
  value,
  ticketCount,
  face,
  resaleMinimumPercent,
  fieldError = null,
  onValueChange,
  onFieldError,
  onSubmit,
  autoFocus = true,
}: {
  id: string;
  value: string;
  ticketCount: number;
  face: number;
  resaleMinimumPercent: number | null;
  fieldError?: string | null;
  onValueChange: (value: string) => void;
  onFieldError: (error: string | null) => void;
  onSubmit?: () => void;
  autoFocus?: boolean;
}) {
  const focusRef = useAutoFocus<HTMLInputElement>(autoFocus);
  const draft = listingPriceDraft(value, {
    face,
    resaleMinimumPercent,
    fieldError,
  });
  const placeCaretAtEnd = (field: HTMLInputElement) => {
    const end = field.value.length;
    field.setSelectionRange(end, end);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 17, lineHeight: 1.5, fontWeight: 600, letterSpacing: "-0.015em" }}>
          Price your {ticketCount <= 1 ? "ticket" : "tickets"}
        </div>
        <div style={{ fontSize: fluidSize(14), lineHeight: browseLeading("body"), color: SUB }}>
          Ticket face value {formatCurrency(face)}
        </div>
      </div>
      <label
        htmlFor={id}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: FIELD, borderRadius: 14, padding: "18px 16px", border: `1px solid ${draft.invalid ? ERROR_COLOR : "transparent"}` }}
      >
        <span
          onMouseDown={(event) => {
            const field = event.currentTarget.querySelector("input");
            if (!field) return;
            event.preventDefault();
            field.focus();
            placeCaretAtEnd(field);
          }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", minHeight: 35, cursor: "text" }}
        >
          <span style={{ fontSize: fluidSize(28), fontWeight: 700, color: INK, lineHeight: 1 }}>$</span>
          <input
            ref={focusRef}
            id={id}
            inputMode="decimal"
            value={value}
            onFocus={(event) => placeCaretAtEnd(event.currentTarget)}
            onChange={(event) => onValueChange(askingPriceInput(event.target.value))}
            onBlur={() => {
              onFieldError(
                listingAskingPriceError(value, {
                  face,
                  resaleMinimumPercent,
                  mode: "blur",
                }),
              );
            }}
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
              if (event.key !== "Enter" || !onSubmit) return;
              event.preventDefault();
              onSubmit();
            }}
            style={{ fontFamily: "inherit", width: `${Math.max(String(value || "0").length, 1)}ch`, boxSizing: "content-box", fontSize: fluidSize(28), fontWeight: 700, color: INK, lineHeight: 1, textAlign: "left", background: "transparent", border: "none", outline: "none", padding: 0 }}
          />
        </span>
        <span role={draft.invalid ? "alert" : undefined} style={{ fontSize: fluidSize(12), fontWeight: 500, color: draft.invalid ? ERROR_COLOR : FAINT }}>
          {draft.message}
        </span>
      </label>
    </div>
  );
}
