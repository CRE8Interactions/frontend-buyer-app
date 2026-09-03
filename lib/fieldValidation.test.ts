import { describe, expect, it } from "vitest";
import { DEMO_USER } from "@/lib/demo/fixtures";
import {
  codeSubmitError,
  dobBlurError,
  dobSubmitError,
  emailBlurInvalid,
  emailLooksInvalid,
  emailSubmitError,
  emailSubmitInvalid,
  formString,
  isBlockedEmail,
  isValidDob,
  nameAllows,
  nameBlurError,
  nameFieldError,
  normalizeEmail,
  phoneBlurError,
  phoneNumberError,
  phoneSubmitError,
  promoCodeRejectedMessage,
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

  it("formats rejected promo copy from the API message", () => {
    expect(promoCodeRejectedMessage("Promo code not found")).toBe(
      "Promo code not found. Please try again.",
    );
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
