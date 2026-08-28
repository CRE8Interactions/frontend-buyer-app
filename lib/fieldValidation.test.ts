import { describe, expect, it } from "vitest";
import { DEMO_USER } from "@/lib/demo/fixtures";
import {
  codeSubmitError,
  emailBlurInvalid,
  emailLooksInvalid,
  emailSubmitError,
  emailSubmitInvalid,
  formString,
  isBlockedEmail,
  nameAllows,
  nameFieldError,
  normalizeEmail,
  phoneNumberError,
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
});

describe("phoneNumberError", () => {
  it("requires a value and accepts the demo number", () => {
    expect(phoneNumberError(undefined)).toBe("required");
    expect(phoneNumberError("+1")).toBe("invalid");
    expect(phoneNumberError(DEMO_USER.phoneNumber)).toBeNull();
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
