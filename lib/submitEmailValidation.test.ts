import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_USER } from "@/lib/demo/fixtures";
import { FIELD_COPY } from "@/lib/fieldValidation";
import { validateSubmittedEmail } from "@/lib/submitEmailValidation";

vi.mock("@/lib/api", () => ({
  validateEmail: vi.fn(),
}));

import { validateEmail } from "@/lib/api";

const mockedValidateEmail = vi.mocked(validateEmail);

describe("validateSubmittedEmail", () => {
  beforeEach(() => {
    mockedValidateEmail.mockReset();
    mockedValidateEmail.mockResolvedValue({ data: { verdict: "Valid" } } as never);
  });

  it("rejects a blocked domain without calling SendGrid", async () => {
    const result = await validateSubmittedEmail("shopper@mailinator.com");

    expect(result).toEqual({
      ok: false,
      email: "shopper@mailinator.com",
      error: "invalid",
    });
    expect(mockedValidateEmail).not.toHaveBeenCalled();
  });

  it("rejects an empty email without calling SendGrid", async () => {
    const result = await validateSubmittedEmail("   ");

    expect(result).toEqual({ ok: false, email: "", error: "required" });
    expect(mockedValidateEmail).not.toHaveBeenCalled();
  });

  it("rejects a SendGrid Invalid verdict on 200", async () => {
    mockedValidateEmail.mockResolvedValue({
      data: { verdict: "Invalid", score: 0 },
    } as never);

    const result = await validateSubmittedEmail(DEMO_USER.email);

    expect(result).toEqual({
      ok: false,
      email: DEMO_USER.email,
      error: "invalid",
    });
    expect(mockedValidateEmail).toHaveBeenCalledWith({ email: DEMO_USER.email });
  });

  it("rejects a SendGrid Risky verdict with a suggestion on 200", async () => {
    mockedValidateEmail.mockResolvedValue({
      data: { verdict: "Risky", suggestion: "fan@blocktickets.xyz" },
    } as never);

    const result = await validateSubmittedEmail(DEMO_USER.email);

    expect(result).toEqual({
      ok: false,
      email: DEMO_USER.email,
      error: "invalid",
    });
  });

  it("accepts a valid local email when validate-email returns 200 Valid", async () => {
    const result = await validateSubmittedEmail(DEMO_USER.email);

    expect(result).toEqual({ ok: true, email: DEMO_USER.email });
  });

  it("returns network when SendGrid cannot be reached", async () => {
    mockedValidateEmail.mockRejectedValue(new Error("offline"));

    const result = await validateSubmittedEmail(DEMO_USER.email);

    expect(result).toEqual({
      ok: false,
      email: DEMO_USER.email,
      error: "network",
    });
  });

  it("returns startFailed when validate-email responds with 400", async () => {
    mockedValidateEmail.mockRejectedValue({
      response: { status: 400 },
    });

    const result = await validateSubmittedEmail(DEMO_USER.email);

    expect(result).toEqual({
      ok: false,
      email: DEMO_USER.email,
      error: "startFailed",
    });
  });

  it("returns invalid when validate-email responds with 402 Bad email", async () => {
    mockedValidateEmail.mockRejectedValue({
      response: { status: 402, data: "Bad email" },
    });

    const result = await validateSubmittedEmail(DEMO_USER.email);

    expect(result).toEqual({
      ok: false,
      email: DEMO_USER.email,
      error: "invalid",
    });
  });

  it("uses the same invalid copy path as login for malformed addresses", async () => {
    const result = await validateSubmittedEmail("not-an-email");

    expect(result.error).toBe("invalid");
    expect(FIELD_COPY.invalidEmail).toMatch(/invalid/i);
    expect(mockedValidateEmail).not.toHaveBeenCalled();
  });
});
