import { describe, expect, it } from "vitest";
import { DEMO_USER } from "@/lib/demo/fixtures";
import {
  codeResponseError,
  codeSubmitError,
  dobBlurError,
  dobSubmitError,
  editDobInput,
  emailBlurInvalid,
  emailLooksInvalid,
  emailSubmitError,
  emailSubmitInvalid,
  formString,
  isBlockedEmail,
  sendgridEmailInvalid,
  isValidDob,
  nameAllows,
  nameBlurError,
  nameFieldError,
  normalizeEmail,
  phoneBlurError,
  phoneNumberError,
  phoneSubmitError,
  promoCodeRedeemDisplayMessage,
  promoCodeRejectedMessage,
  PROMO_CODE_API_ERROR_MESSAGES,
  redemptionCodeBlurError,
  redemptionCodeBlurFieldError,
  redemptionCodeSubmitError,
  submittedEmail,
} from "@/lib/fieldValidation";

describe("email order", () => {
  it("treats a blocked domain as invalid before syntax is the reason", () => {
    expect(isBlockedEmail("user@mailinator.com")).toBe(true);
    expect(emailLooksInvalid("user@mailinator.com")).toBe(true);
    expect(isBlockedEmail("not-an-email")).toBe(false);
    expect(emailLooksInvalid("not-an-email")).toBe(true);
  });

  it("lowercases with normalizeEmail and accepts the demo address", () => {
    expect(normalizeEmail("  Fan@Blocktickets.XYZ  ")).toBe(DEMO_USER.email);
    expect(emailLooksInvalid(DEMO_USER.email)).toBe(false);
    expect(isBlockedEmail(DEMO_USER.email)).toBe(false);
  });

  it("does not treat malformed addresses as blocked", () => {
    expect(isBlockedEmail("user@")).toBe(false);
    expect(isBlockedEmail("not-an-email")).toBe(false);
  });

  it("treats empty as valid on blur and required on submit", () => {
    expect(emailBlurInvalid("")).toBe(false);
    expect(emailSubmitError("")).toBe("required");
    expect(emailSubmitInvalid("")).toBe(true);
    expect(emailBlurInvalid("not-an-email")).toBe(true);
    expect(emailSubmitError("not-an-email")).toBe("invalid");
    expect(emailSubmitInvalid(DEMO_USER.email)).toBe(false);
    expect(emailSubmitError(DEMO_USER.email)).toBeNull();
  });

  it("matches login SendGrid rejection rules", () => {
    expect(sendgridEmailInvalid({ verdict: "Valid" })).toBe(false);
    expect(sendgridEmailInvalid({ verdict: "Invalid" })).toBe(true);
    expect(
      sendgridEmailInvalid({
        verdict: "Risky",
        suggestion: "fan@blocktickets.xyz",
      }),
    ).toBe(true);
    expect(sendgridEmailInvalid({ verdict: "Risky" })).toBe(false);
  });

  it("reads a submitted email from FormData even when state would be empty", () => {
    const data = new FormData();
    data.set("email", `  ${DEMO_USER.email.toUpperCase()}  `);
    expect(formString(data, "email")).toBe(`  ${DEMO_USER.email.toUpperCase()}  `);
    expect(submittedEmail(data)).toBe(DEMO_USER.email);
    expect(formString(data, "missing")).toBe("");
  });
});

describe("name pattern", () => {
  it("accepts the demo first name and rejects digits", () => {
    expect(nameAllows("")).toBe(true);
    expect(nameAllows(DEMO_USER.firstName)).toBe(true);
    expect(nameFieldError(DEMO_USER.firstName)).toBeNull();
    expect(nameAllows("Demo1")).toBe(false);
    expect(nameFieldError("Demo1")).toBe("pattern");
    expect(nameFieldError("")).toBe("required");
  });

  it("treats empty as valid on blur and pattern errors only when typed", () => {
    expect(nameBlurError("")).toBeNull();
    expect(nameBlurError("   ")).toBeNull();
    expect(nameBlurError("Demo1")).toBe("pattern");
    expect(nameBlurError(DEMO_USER.firstName)).toBeNull();
  });
});

describe("phone validation", () => {
  it("requires a value on submit and accepts the demo number", () => {
    expect(phoneSubmitError(undefined)).toBe("required");
    expect(phoneNumberError(undefined)).toBe("required");
    expect(phoneSubmitError("+1")).toBe("invalid");
    expect(phoneSubmitError(DEMO_USER.phoneNumber)).toBeNull();
  });

  it("treats empty as valid on blur and invalid only when a number was entered", () => {
    expect(phoneBlurError(undefined)).toBeNull();
    expect(phoneBlurError("")).toBeNull();
    expect(phoneBlurError("+1")).toBe("invalid");
    expect(phoneBlurError(DEMO_USER.phoneNumber)).toBeNull();
  });
});

describe("date of birth", () => {
  it("treats empty as valid on blur and required on submit", () => {
    expect(dobBlurError("")).toBeNull();
    expect(dobSubmitError("")).toBe("required");
    expect(dobSubmitError(DEMO_USER.dob)).toBeNull();
    expect(isValidDob(DEMO_USER.dob)).toBe(true);
  });

  it("flags invalid dates on blur when typed and on submit", () => {
    expect(dobBlurError("01/01/2099")).toBe("invalid");
    expect(dobSubmitError("01/01/2099")).toBe("invalid");
    expect(dobBlurError("13/40/2000")).toBe("invalid");
  });

  it("adds the slash for the next part only while typing", () => {
    expect(editDobInput("0", "02", 2, "insertText")).toEqual({
      value: "02/",
      caret: 3,
    });
    expect(editDobInput("02/0", "02/01", 5, "insertText")).toEqual({
      value: "02/01/",
      caret: 6,
    });
  });

  it("does not add a slash when backspace removes a digit", () => {
    expect(editDobInput("02/1", "02/", 3, "deleteContentBackward")).toEqual({
      value: "02",
      caret: 2,
    });
    expect(editDobInput("02/", "02", 2, "deleteContentBackward")).toEqual({
      value: "02",
      caret: 2,
    });
    expect(editDobInput("02/0/", "02//", 3, "deleteContentBackward")).toEqual({
      value: "02",
      caret: 2,
    });
  });

  it("drops a leftover slash when backspace empties the field", () => {
    expect(editDobInput("0/", "0", 1, "deleteContentBackward")).toEqual({
      value: "0",
      caret: 1,
    });
    expect(editDobInput("1/", "/", 0, "deleteContentBackward")).toEqual({
      value: "",
      caret: 0,
    });
  });

  it("keeps the caret at a digit removed from the middle", () => {
    expect(
      editDobInput(DEMO_USER.dob, "0/01/1995", 1, "deleteContentBackward"),
    ).toEqual({ value: "0/01/1995", caret: 1 });
  });

  it("backspaces through a slash by removing the preceding digit", () => {
    expect(
      editDobInput(DEMO_USER.dob, "0101/1995", 2, "deleteContentBackward"),
    ).toEqual({ value: "0/01/1995", caret: 1 });
  });

  it("deletes through a slash by removing the following digit", () => {
    expect(
      editDobInput(DEMO_USER.dob, "0101/1995", 2, "deleteContentForward"),
    ).toEqual({ value: "01/1/1995", caret: 3 });
  });

  it("replaces a digit in a complete date without shifting the year", () => {
    expect(editDobInput(DEMO_USER.dob, "091/01/1995", 2, "insertText")).toEqual(
      { value: "09/01/1995", caret: 3 },
    );
  });

  it("moves into the next block after changing the digit before a slash", () => {
    expect(editDobInput(DEMO_USER.dob, "01/051/1995", 5, "insertText")).toEqual(
      { value: "01/05/1995", caret: 6 },
    );
  });

  it("replaces digits inside a block and steps forward", () => {
    const first = editDobInput(DEMO_USER.dob, "01/01/21995", 7, "insertText");
    expect(first).toEqual({ value: "01/01/2995", caret: 7 });
    const second = editDobInput(first.value, "01/01/20995", 8, "insertText");
    expect(second).toEqual({ value: "01/01/2095", caret: 8 });
    expect(second.caret).not.toBe(second.value.length);
  });

  it("replaces a digit in a shorter date instead of shifting the rest", () => {
    expect(editDobInput("02/15/19", "902/15/19", 1, "insertText")).toEqual({
      value: "92/15/19",
      caret: 1,
    });
  });

  it("keeps the edited demo date valid", () => {
    const removed = editDobInput(
      DEMO_USER.dob,
      "0/01/1995",
      1,
      "deleteContentBackward",
    );
    const restored = editDobInput(removed.value, DEMO_USER.dob, 2, "insertText");
    expect(restored).toEqual({ value: DEMO_USER.dob, caret: 3 });
    expect(isValidDob(restored.value)).toBe(true);
  });
});

describe("redemption codes", () => {
  it("treats empty as valid on blur and required on submit", () => {
    expect(redemptionCodeBlurError("")).toBeNull();
    expect(redemptionCodeSubmitError("")).toBe("required");
    expect(redemptionCodeBlurError("   ")).toBeNull();
    expect(redemptionCodeSubmitError("  SAVE10  ")).toBeNull();
  });

  it("preserves API rejections on blur", () => {
    expect(redemptionCodeBlurFieldError("rejected", "")).toBe("rejected");
    expect(redemptionCodeBlurFieldError("network", "GO2026")).toBe("network");
    expect(redemptionCodeBlurFieldError("required", "")).toBeNull();
    expect(redemptionCodeBlurFieldError(null, "   ")).toBeNull();
  });

  it("formats rejected promo copy from redeem API messages", () => {
    expect(
      promoCodeRejectedMessage(PROMO_CODE_API_ERROR_MESSAGES.notFound),
    ).toBe("Promo code not found. Please try again.");
    expect(
      promoCodeRejectedMessage(PROMO_CODE_API_ERROR_MESSAGES.alreadyApplied),
    ).toBe("Promo code already applied to order. Please try again.");
    expect(
      promoCodeRejectedMessage(PROMO_CODE_API_ERROR_MESSAGES.noLongerValid),
    ).toBe("Promo code no longer valid. Please try again.");
    expect(promoCodeRejectedMessage()).toBe(
      "Promo code could not be applied. Please try again.",
    );
  });

  it("reads redeem API messages from nested and string error bodies", () => {
    expect(
      promoCodeRedeemDisplayMessage({
        response: {
          data: {
            error: { message: PROMO_CODE_API_ERROR_MESSAGES.alreadyApplied },
          },
        },
      }),
    ).toBe("Promo code already applied to order. Please try again.");
    expect(
      promoCodeRedeemDisplayMessage({
        response: {
          data: { message: PROMO_CODE_API_ERROR_MESSAGES.noLongerValid },
        },
      }),
    ).toBe("Promo code no longer valid. Please try again.");
    expect(
      promoCodeRedeemDisplayMessage({
        response: { data: PROMO_CODE_API_ERROR_MESSAGES.notFound },
      }),
    ).toBe("Promo code not found. Please try again.");
  });
});

describe("codeResponseError", () => {
  it("reads a rejected code as a wrong code", () => {
    expect(codeResponseError(400)).toBe("code");
    expect(codeResponseError(401)).toBe("code");
  });

  it("keeps network copy for a code that never got a verdict", () => {
    expect(codeResponseError(408)).toBe("network");
    expect(codeResponseError(429)).toBe("network");
    expect(codeResponseError(500)).toBe("network");
  });
});

describe("codeSubmitError", () => {
  it("reads a rejected code as a wrong code", () => {
    expect(
      codeSubmitError({
        response: {
          status: 400,
          data: { error: { message: "Code provided is incorrect" } },
        },
      }),
    ).toBe("code");
    expect(codeSubmitError({ status: 401 })).toBe("code");
  });

  it("keeps network copy for a code that never got a verdict", () => {
    expect(codeSubmitError(new Error("offline"))).toBe("network");
    expect(codeSubmitError({ response: { status: 429 } })).toBe("network");
    expect(codeSubmitError({ response: { status: 500 } })).toBe("network");
  });
});
