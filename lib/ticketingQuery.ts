import type { TicketingFilters } from "@/components/organisms/PremiumTicketing";

/** Cheapest first — what the listings show before the shopper flips the sort. */
const DEFAULT_SORT = "price";

export function parseTicketingSearchParams(search: URLSearchParams): {
  quantity?: number;
  sort?: TicketingFilters["sort"];
  accessible?: boolean;
  offerIds: Array<string | number>;
  accessCodeTokens: string[];
} {
  const quantityRaw = search.get("quantity");
  const quantity = Number(quantityRaw);
  const sortRaw = search.get("sort");
  const sort =
    sortRaw === "price" || sortRaw === "-price" ? sortRaw : undefined;
  const offers = search.get("offers");
  const access = search.get("access_code");

  return {
    ...(Number.isFinite(quantity) && quantity > 0 ? { quantity } : {}),
    ...(sort ? { sort } : {}),
    ...(search.get("accessible") === "true" ? { accessible: true } : {}),
    offerIds: offers
      ? offers
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : [],
    accessCodeTokens: access
      ? access
          .split(",")
          .map((token) => token.trim())
          .filter(Boolean)
      : [],
  };
}

/** Codes sent to getTicketGroups — the value after `offerId:`. */
export function accessCodesFromTokens(tokens: string[]): string[] {
  return tokens
    .map((token) => {
      const split = token.indexOf(":");
      return split >= 0 ? token.slice(split + 1).trim() : token.trim();
    })
    .filter(Boolean);
}

export function offerIdFromAccessToken(token: string): string {
  const split = token.indexOf(":");
  return split >= 0 ? token.slice(0, split).trim() : "";
}

export function listingFiltersFromSearch(search: URLSearchParams): TicketingFilters {
  const parsed = parseTicketingSearchParams(search);
  return {
    quantity: parsed.quantity ?? 0,
    accessible: Boolean(parsed.accessible),
    sort: parsed.sort ?? "price",
    offerIds: parsed.offerIds,
    accessCodes: accessCodesFromTokens(parsed.accessCodeTokens),
  };
}

export function hasListingQueryFilters(search: URLSearchParams) {
  const parsed = parseTicketingSearchParams(search);
  return Boolean(
    parsed.quantity ||
      parsed.sort ||
      parsed.accessible ||
      parsed.offerIds.length ||
      parsed.accessCodeTokens.length,
  );
}

export function ticketingSearchFromFilters(
  filters: TicketingFilters,
  accessCodeTokens: string[] = [],
): URLSearchParams {
  const next = new URLSearchParams();

  // Only choices the shopper made belong here: an unlocked offer link should
  // read as that offer, not carry the quantity and sort the page started on.
  if (filters.quantity > 0 && filters.quantity !== filters.defaultQuantity) {
    next.set("quantity", String(filters.quantity));
  }
  if (filters.sort && filters.sort !== DEFAULT_SORT) {
    next.set("sort", filters.sort);
  }
  if (filters.accessible) next.set("accessible", "true");
  if (filters.offerIds?.length) {
    next.set("offers", filters.offerIds.map(String).join(","));
  }
  if (accessCodeTokens.length) {
    next.set("access_code", accessCodeTokens.join(","));
  }
  return next;
}

export function ticketingSearchHref(
  pathname: string,
  filters: TicketingFilters,
  accessCodeTokens: string[] = [],
) {
  const params = ticketingSearchFromFilters(filters, accessCodeTokens).toString();
  return params ? `${pathname}?${params}` : pathname;
}
