import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_SEATED_TICKET_GROUPS } from "@/lib/demo/fixtures";

vi.mock("@/lib/api", () => ({
  checkAccessCode: vi.fn(),
}));

import { checkAccessCode } from "@/lib/api";
import { verifyOfferAccessCode } from "@/lib/offerUnlock";

const mockedCheckAccessCode = vi.mocked(checkAccessCode);

const CODED_OFFER = DEMO_SEATED_TICKET_GROUPS.find(
  (g) => g.offer?.accessCode,
)?.offer;
const EXPECTED = CODED_OFFER?.accessCode as string;

describe("verifyOfferAccessCode", () => {
  beforeEach(() => {
    mockedCheckAccessCode.mockReset();
  });

  it("unlocks when the backend accepts the code", async () => {
    mockedCheckAccessCode.mockResolvedValue({ data: { valid: true } } as never);

    await expect(
      verifyOfferAccessCode({ eventId: 1, code: "rotated-code" }),
    ).resolves.toBe(true);
    expect(mockedCheckAccessCode).toHaveBeenCalledWith({
      eventId: 1,
      accessCode: "rotated-code",
    });
  });

  it("falls back to the code from the inventory payload", async () => {
    mockedCheckAccessCode.mockRejectedValue(new Error("not available"));

    await expect(
      verifyOfferAccessCode({
        eventId: 1,
        code: EXPECTED.toLowerCase(),
        expected: EXPECTED,
      }),
    ).resolves.toBe(true);
  });

  it("rejects a wrong or empty code the backend did not accept", async () => {
    mockedCheckAccessCode.mockResolvedValue({ data: "" } as never);

    await expect(
      verifyOfferAccessCode({ eventId: 1, code: "nope", expected: EXPECTED }),
    ).resolves.toBe(false);
    await expect(
      verifyOfferAccessCode({ eventId: 1, code: "  ", expected: EXPECTED }),
    ).resolves.toBe(false);
    expect(mockedCheckAccessCode).toHaveBeenCalledTimes(1);
  });
});
