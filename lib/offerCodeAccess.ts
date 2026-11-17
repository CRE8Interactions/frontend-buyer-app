export const OFFER_CODE_NOT_FOUND =
  "We couldn't find an offer for that code. Check the spelling and try again.";

export const OFFER_CODE_FAILED = "Something went wrong. Please try again.";

export type AccessCodedOffer = {
  id?: string | number;
  name?: string;
  accessCode?: string | null;
  isHidden?: boolean;
};

export function hasAccessCode(offer?: { accessCode?: string | null } | null) {
  return Boolean(String(offer?.accessCode || "").trim());
}

export function accessCodeEntry(offerId: string | number, code: string) {
  return `${offerId}:${String(code || "").trim()}`;
}

export function codeForOffer(
  accessCodes: string[] | null | undefined,
  offerId: string | number,
) {
  const id = String(offerId);
  const entry = (accessCodes || []).find(
    (item) => String(item).split(":")[0] === id,
  );
  if (!entry) return "";
  const separator = String(entry).indexOf(":");
  return separator === -1 ? "" : String(entry).slice(separator + 1);
}

export function isOfferUnlocked(
  offer: AccessCodedOffer | null | undefined,
  accessCodes: string[] | null | undefined,
) {
  if (!offer || offer.isHidden || !hasAccessCode(offer) || offer.id == null) {
    return false;
  }
  const code = codeForOffer(accessCodes, offer.id);
  if (!code) return false;
  return (
    code.trim().toLowerCase() === String(offer.accessCode).trim().toLowerCase()
  );
}

export function mergeAccessCodeEntries(
  existing: string[] | null | undefined,
  entries: string[] | null | undefined,
) {
  const byOffer = new Map<string, string>();
  (existing || []).forEach((entry) => {
    const id = String(entry).split(":")[0];
    if (id) byOffer.set(id, entry);
  });
  (entries || []).forEach((entry) => {
    const id = String(entry).split(":")[0];
    if (id) byOffer.set(id, entry);
  });
  return [...byOffer.values()];
}

export function removeAccessCodeForOffer(
  existing: string[] | null | undefined,
  offerId: string | number,
) {
  const id = String(offerId);
  return (existing || []).filter((entry) => String(entry).split(":")[0] !== id);
}

/** An empty offer filter stays empty so open seats remain on the page. */
export function selectedOfferIdsAfterUnlock(
  selectedOfferIds: Array<string | number> | null | undefined,
  unlockedIds: Array<string | number> | null | undefined,
) {
  if (!selectedOfferIds?.length) return null;
  const next = [...selectedOfferIds];
  (unlockedIds || []).forEach((id) => {
    if (!next.some((selected) => String(selected) === String(id))) {
      next.push(id);
    }
  });
  return next;
}

export function selectedOfferIdsAfterRemove(
  selectedOfferIds: Array<string | number> | null | undefined,
  offerId: string | number,
) {
  const id = String(offerId);
  return (selectedOfferIds || []).filter(
    (selected) => String(selected) !== id,
  );
}

export function visibleOffersForPills(
  offers: AccessCodedOffer[] | null | undefined,
  accessCodes: string[] | null | undefined,
) {
  return (offers || [])
    .map((offer, index) => ({ offer, index }))
    .filter(({ offer }) => {
      if (offer?.isHidden) return false;
      if (!hasAccessCode(offer)) return true;
      return isOfferUnlocked(offer, accessCodes);
    })
    .sort((a, b) => {
      const rank = (offer: AccessCodedOffer) => (hasAccessCode(offer) ? 0 : 1);
      const delta = rank(a.offer) - rank(b.offer);
      if (delta !== 0) return delta;
      return a.index - b.index;
    })
    .map(({ offer }) => offer);
}

export function unlockedOfferNotices(
  offers: AccessCodedOffer[] | null | undefined,
  accessCodes: string[] | null | undefined,
) {
  return visibleOffersForPills(offers, accessCodes)
    .filter((offer) => hasAccessCode(offer) && offer.id != null)
    .map((offer) => ({
      id: offer.id as string | number,
      name: offer.name,
      code: codeForOffer(accessCodes, offer.id as string | number),
    }));
}

export function applicableUnlockedOffers(
  pageOffers: AccessCodedOffer[] | null | undefined,
  serverOffers: Array<{ id?: string | number; name?: string }> | null | undefined,
) {
  const serverIds = new Set(
    (serverOffers || []).map((offer) => String(offer.id)),
  );
  const seen = new Set<string>();
  return (pageOffers || []).filter((offer) => {
    if (offer?.id == null || seen.has(String(offer.id))) return false;
    if (offer.isHidden || !hasAccessCode(offer)) return false;
    if (!serverIds.has(String(offer.id))) return false;
    seen.add(String(offer.id));
    return true;
  });
}
