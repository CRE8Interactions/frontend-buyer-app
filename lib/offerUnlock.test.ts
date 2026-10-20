import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_SEATED_TICKET_GROUPS } from "@/lib/demo/fixtures";

vi.mock("@/lib/api", () => ({
  checkAccessCode: vi.fn(),
}));

import { checkAccessCode } from "@/lib/api";
import { verifyOfferAccessCode, unlockOfferInTicketGroups, seatmapLookupsFromTicketGroups } from "@/lib/offerUnlock";

const mockedCheckAccessCode = vi.mocked(checkAccessCode);

const CODED_OFFER = DEMO_SEATED_TICKET_GROUPS.find(
  (g) => g.offer?.accessCode,
)?.offer;
const EXPECTED = CODED_OFFER?.accessCode as string;

describe("verifyOfferAccessCode", () => {
  beforeEach(() => {
    mockedCheckAccessCode.mockReset();
  });

  it("asks the backend about the offer and unlocks when it accepts the code", async () => {
    mockedCheckAccessCode.mockResolvedValue({ data: { valid: true } } as never);

    await expect(
      verifyOfferAccessCode({ offer: CODED_OFFER, code: "rotated-code" }),
    ).resolves.toBe(true);
    expect(mockedCheckAccessCode).toHaveBeenCalledWith({
      offer: CODED_OFFER,
      userInputCode: "rotated-code",
    });
  });

  it("falls back to the code from the inventory payload", async () => {
    mockedCheckAccessCode.mockRejectedValue(new Error("not available"));

    await expect(
      verifyOfferAccessCode({
        offer: CODED_OFFER,
        code: EXPECTED.toLowerCase(),
        expected: EXPECTED,
      }),
    ).resolves.toBe(true);
  });

  it("checks the inventory code alone when the offer is unknown", async () => {
    await expect(
      verifyOfferAccessCode({ code: EXPECTED, expected: EXPECTED }),
    ).resolves.toBe(true);
    expect(mockedCheckAccessCode).not.toHaveBeenCalled();
  });

  it("rejects a wrong or empty code the backend did not accept", async () => {
    mockedCheckAccessCode.mockResolvedValue({ data: "" } as never);

    await expect(
      verifyOfferAccessCode({
        offer: CODED_OFFER,
        code: "nope",
        expected: EXPECTED,
      }),
    ).resolves.toBe(false);
    await expect(
      verifyOfferAccessCode({
        offer: CODED_OFFER,
        code: "  ",
        expected: EXPECTED,
      }),
    ).resolves.toBe(false);
    expect(mockedCheckAccessCode).toHaveBeenCalledTimes(1);
  });
});

describe("unlockOfferInTicketGroups", () => {
  it("marks matching access-coded rows as unlocked", () => {
    const coded = DEMO_SEATED_TICKET_GROUPS.find((g) => g.offer?.accessCode);
    if (!coded?.offer?.name) {
      throw new Error("demo fixtures need a coded seated offer");
    }

    const updated = unlockOfferInTicketGroups(
      DEMO_SEATED_TICKET_GROUPS as never,
      coded.offer.name,
    );

    expect(
      updated.filter(
        (group) =>
          group.offer?.name === coded.offer?.name && group.offer?.unlocked,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      updated.find((group) => group.offer?.name !== coded.offer?.name)?.offer
        ?.unlocked,
    ).not.toBe(true);
  });

  it("rebuilds seat lookups so unlocked seats become selectable on the map", () => {
    const groups = [
      {
        id: "locked-row",
        seatIds: ["s9"],
        GA: false,
        offer: {
          id: "off-coded",
          name: "Niagara Falls Paramedic Association",
          accessCode: "NFPA",
        },
      },
    ] as never;

    const updated = unlockOfferInTicketGroups(
      groups,
      "Niagara Falls Paramedic Association",
    );
    const { seatLookupTable } = seatmapLookupsFromTicketGroups(updated);

    expect(seatLookupTable.s9?.offer?.unlocked).toBe(true);
  });
});
