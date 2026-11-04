import { describe, expect, it } from "vitest";
import {
  BANK_ACCOUNT_SETUP_FALLBACK,
  bankAccountSetupError,
} from "@/lib/bankAccountSetupError";

describe("bankAccountSetupError", () => {
  it("returns the trimmed API error message", () => {
    expect(
      bankAccountSetupError({
        response: {
          data: { error: { message: "  Live and test mode accounts cannot be mixed.  " } },
        },
      }),
    ).toBe("Live and test mode accounts cannot be mixed.");
  });

  it("falls back when the API message is missing or blank", () => {
    expect(bankAccountSetupError(new Error("offline"))).toBe(BANK_ACCOUNT_SETUP_FALLBACK);
    expect(
      bankAccountSetupError({ response: { data: { error: { message: "   " } } } }),
    ).toBe(BANK_ACCOUNT_SETUP_FALLBACK);
    expect(
      bankAccountSetupError({ response: { data: { error: { message: 404 } } } }),
    ).toBe(BANK_ACCOUNT_SETUP_FALLBACK);
  });
});
