import { describe, expect, it } from "vitest";
import { demoTicketGroups } from "@/lib/demo/fixtures";
import {
  applicableUnlockedOffers,
  isOfferUnlocked,
  mergeAccessCodeEntries,
  selectedOfferIdsAfterUnlock,
  unlockedOfferNotices,
  visibleOffersForPills,
} from "@/lib/offerCodeAccess";

const groups = demoTicketGroups().ticketGroups;
const presale = groups.find((group) => group.offer?.accessCode)?.offer;
const openOffers = groups
  .filter((group) => group.offer?.name && !group.offer.accessCode)
  .map((group) => group.offer!);

if (!presale?.id || !presale.accessCode || openOffers.length < 1) {
  throw new Error("demo fixtures need a coded offer and an open offer");
}

const hidden = {
  id: "off-hidden-presale",
  name: "Old presale",
  accessCode: presale.accessCode,
  isHidden: true,
};
const offers = [...openOffers, presale, hidden];

describe("offer code access", () => {
  it("hides locked offers until their code is applied and never shows hidden offers", () => {
    expect(visibleOffersForPills(offers, []).map((offer) => offer.id)).toEqual(
      openOffers.map((offer) => offer.id),
    );

    const unlocked = visibleOffersForPills(offers, [
      `${presale.id}:${presale.accessCode}`,
      `${hidden.id}:${hidden.accessCode}`,
    ]);
    expect(unlocked.map((offer) => offer.id)).toEqual([
      presale.id,
      ...openOffers.map((offer) => offer.id),
    ]);
    expect(isOfferUnlocked(hidden, [`${hidden.id}:${hidden.accessCode}`])).toBe(
      false,
    );
  });

  it("describes each unlocked offer without dropping open inventory", () => {
    expect(
      unlockedOfferNotices(offers, [`${presale.id}:${presale.accessCode}`]),
    ).toEqual([
      { id: presale.id, name: presale.name, code: presale.accessCode },
    ]);
  });

  it("keeps an empty offer filter empty so open seats stay visible", () => {
    expect(selectedOfferIdsAfterUnlock([], [presale.id!])).toBeNull();
    expect(
      selectedOfferIdsAfterUnlock([openOffers[0].id!], [presale.id!]),
    ).toEqual([openOffers[0].id, presale.id]);
  });

  it("replaces a previous code for the same offer", () => {
    expect(
      mergeAccessCodeEntries(
        [`${presale.id}:OLD`],
        [`${presale.id}:${presale.accessCode}`],
      ),
    ).toEqual([`${presale.id}:${presale.accessCode}`]);
  });

  it("only applies offers this page already lists and the server confirmed", () => {
    expect(
      applicableUnlockedOffers(offers, [
        { id: presale.id, name: presale.name },
        { id: hidden.id, name: hidden.name },
        { id: "off-unknown", name: "Unknown" },
      ]).map((offer) => offer.id),
    ).toEqual([presale.id]);
  });
});
