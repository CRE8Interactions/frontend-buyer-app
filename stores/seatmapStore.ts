import { create } from "zustand";
import {
  adjacentSeatsUnavailableError,
  invalidOfferQuantityError,
  maxTicketLimitError,
  mixedMapSelectionError,
} from "@/lib/mapSelection";
import {
  exceededSelectionTicketLimit,
  limitsFromSeatedOfferRow,
  limitsFromTicketGroup,
  offerDisplayName,
  offerMaxQuantity,
  quantityIsAllowed,
  quantityRestrictionLabel,
} from "@/lib/ticketListings";
import useFiltersStore, { type TicketGroup } from "./filtersStore";
import type {
  SeatmapBackground,
  SeatmapMapping,
} from "@/lib/seatmapLookups";
import { adjacentSeatWindow } from "@/lib/seatmapLookups";
import {
  trackSelectTicket,
  type TrackingOrganization,
} from "@/lib/tracking";

export const SEAT_VIEW_PLACEHOLDER =
  "https://blocktickets-assets.nyc3.cdn.digitaloceanspaces.com/seatview-placeholder.png";

const effectiveUnitPrice = (ticketGroup: TicketGroup) => {
  const offer =
    ticketGroup?.offer ||
    ticketGroup?.package ||
    (ticketGroup?.listing as { offer?: { freeOffer?: boolean } } | undefined)
      ?.offer;
  if (offer && "freeOffer" in offer && offer.freeOffer) return 0;
  return ticketGroup.price ?? 0;
};

function offerIdentity(group: TicketGroup) {
  const source = group.package || group.offer;
  const id = source?.id ?? source?.name;
  return id == null || id === "" ? "" : String(id);
}

/** One row per offer, so a seat listed twice still counts as a single offer. */
function distinctOfferGroups(groups: TicketGroup[]) {
  const seen = new Set<string>();
  const unique: TicketGroup[] = [];
  groups.forEach((group, index) => {
    const key = offerIdentity(group) || `row-${index}`;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(group);
  });
  return unique;
}

/**
 * Offer name for the max-ticket dialog. Name the offer only when the
 * selection already mixes two or more offers and the blocked number is that
 * offer's own cap. A single-offer selection, and a block from the event
 * global limit, stay unnamed.
 */
function limitedOfferName(
  selected: TicketGroup[],
  incoming: TicketGroup[],
  limit: number,
) {
  if (distinctOfferGroups([...selected, ...incoming]).length < 2) return null;
  const match = incoming.find((group) => offerMaxQuantity(group) === limit);
  return match ? offerDisplayName(match) : null;
}

const resetState = {
  scale: 1,
  scaleThreshold: 4,
  arePathsHidden: false,
  selectedFromMap: [] as TicketGroup[],
};

type SeatmapError = {
  title: string;
  message: string;
  buttonText?: string;
  status?: number;
  leaveMap?: boolean;
} | null;

type SeatmapState = {
  data: SeatmapMapping | null;
  background: SeatmapBackground | null;
  scale: number;
  scaleThreshold: number;
  arePathsHidden: boolean;
  seatedError: SeatmapError;
  seatBorderRadius: number;
  maxScale: number;
  seatmapId: string | number | null;
  seatLookupTable: Record<string, TicketGroup>;
  seatOffersLookupTable: Record<string, TicketGroup[]>;
  sectionLookupTable: Record<string, TicketGroup[]>;
  selectedFromMap: TicketGroup[];
  totalCount: number;
  totalPrice: number;
  bucket: string;
  eventTicketLimit?: number | null;
  setData: (data: SeatmapMapping | null) => void;
  setBackground: (background: SeatmapBackground | null) => void;
  setScale: (scale: number) => void;
  setScaleThreshold: (scaleThreshold: number) => void;
  setArePathsHidden: (hidden: boolean) => void;
  setSeatLookupTable: (table: Record<string, TicketGroup>) => void;
  setSeatOffersLookupTable: (table: Record<string, TicketGroup[]>) => void;
  setSectionLookupTable: (table: Record<string, TicketGroup[]>) => void;
  setSelectedFromMap: (selected: TicketGroup[]) => void;
  setSeatedError: (error: SeatmapError) => void;
  setSeatBorderRadius: (radius: number) => void;
  setMaxScale: (maxScale: number) => void;
  setSeatmapId: (id: string | number | null) => void;
  _addToSeats: (ticketGroup: TicketGroup) => void;
  _calculateTotals: () => void;
  _withingEventTicketLimit: (
    additionalTickets: number,
    incoming?: TicketGroup | TicketGroup[],
  ) => boolean;
  resetMapState: () => void;
  selectGASeats: (selectedGroups: TicketGroup[]) => void;
  selectSpecificSeat: (id: string | number, ticketGroup: TicketGroup) => void;
  selectSeatedOffers: (
    seatId: string | number,
    groups: TicketGroup[],
  ) => void;
  unselectSeat: (seatId: string | number, ticketGroup: TicketGroup) => void;
  resetMapSelection: () => void;
  getTicketImage: (
    venue: string,
    sectionNumber: string | number,
    type?: string,
  ) => string;
};

const useSeatmapStore = create<SeatmapState>((set, get) => ({
  data: null,
  background: null,
  scale: 1,
  scaleThreshold: 4,
  arePathsHidden: false,
  seatedError: null,
  seatBorderRadius: 33,
  maxScale: 20,
  seatmapId: null,
  seatLookupTable: {},
  seatOffersLookupTable: {},
  sectionLookupTable: {},
  selectedFromMap: [],
  totalCount: 0,
  totalPrice: 0,
  bucket: "https://blocktickets.nyc3.cdn.digitaloceanspaces.com",

  setData: (data) => set({ data }),
  setBackground: (background) => set({ background }),
  setScale: (scale) => set({ scale }),
  setScaleThreshold: (scaleThreshold) => set({ scaleThreshold }),
  setArePathsHidden: (hidden) => set({ arePathsHidden: hidden }),
  setSeatLookupTable: (seatLookupTable) => set({ seatLookupTable }),
  setSeatOffersLookupTable: (seatOffersLookupTable) =>
    set({ seatOffersLookupTable }),
  setSectionLookupTable: (sectionLookupTable) => set({ sectionLookupTable }),
  setSelectedFromMap: (selectedFromMap) => set({ selectedFromMap }),
  setSeatedError: (seatedError) => set({ seatedError }),
  setSeatBorderRadius: (seatBorderRadius) => set({ seatBorderRadius }),
  setMaxScale: (maxScale) => set({ maxScale }),
  setSeatmapId: (seatmapId) => set({ seatmapId }),

  _addToSeats: (ticketGroup) => {
    set((state) => ({
      selectedFromMap: [...state.selectedFromMap, ticketGroup],
    }));
    get()._calculateTotals();
  },

  _calculateTotals: () => {
    const { selectedFromMap } = get();
    const newTotalPrice = selectedFromMap
      .map((ticketGroup) => {
        const unit = effectiveUnitPrice(ticketGroup);
        if (ticketGroup.GA) return (ticketGroup.quantity || 0) * unit;
        return unit;
      })
      .reduce((sum, price) => sum + price, 0);

    const seatedCount = selectedFromMap.filter((g) => g.GA === false).length;
    const gaCount = selectedFromMap
      .filter((g) => g.GA === true)
      .reduce((sum, g) => sum + (g.quantity || 0), 0);

    set({ totalCount: seatedCount + gaCount, totalPrice: newTotalPrice });
  },

  _withingEventTicketLimit: (additionalTickets, incoming) => {
    const incomingGroups = incoming
      ? Array.isArray(incoming)
        ? incoming
        : [incoming]
      : [];
    return (
      exceededSelectionTicketLimit(
        get().eventTicketLimit ?? useFiltersStore.getState().eventTicketLimit,
        get().selectedFromMap,
        incomingGroups,
        additionalTickets,
      ) == null
    );
  },

  resetMapState: () => {
    get().resetMapSelection();
    set(resetState);
  },

  selectGASeats: (selectedGroups) => {
    const mixed = mixedMapSelectionError(
      get().selectedFromMap,
      selectedGroups,
    );
    if (mixed) {
      set({ seatedError: mixed });
      return;
    }
    const eventLimit =
      get().eventTicketLimit ?? useFiltersStore.getState().eventTicketLimit;
    for (const group of selectedGroups) {
      const limits = limitsFromTicketGroup(group, eventLimit);
      const qty = Number(group.quantity || 0);
      if (!quantityIsAllowed(qty, limits)) {
        set({
          seatedError: invalidOfferQuantityError(
            quantityRestrictionLabel(limits),
          ),
        });
        return;
      }
    }
    const totalNew = selectedGroups.reduce(
      (sum, { quantity }) => sum + (quantity || 0),
      0,
    );
    const gaLimit = exceededSelectionTicketLimit(
      eventLimit,
      get().selectedFromMap,
      selectedGroups,
      totalNew,
    );
    if (gaLimit != null) {
      set({
        seatedError: maxTicketLimitError(
          gaLimit,
          limitedOfferName(get().selectedFromMap, selectedGroups, gaLimit),
        ),
      });
      return;
    }
    const organization = useFiltersStore.getState().event
      ?.organization as TrackingOrganization | undefined;
    set((state) => ({
      selectedFromMap: [...state.selectedFromMap, ...selectedGroups],
    }));
    get()._calculateTotals();
    selectedGroups.forEach((group) => {
      trackSelectTicket({
        organization,
        ticket: group,
        quantity: group?.quantity || 1,
      });
    });
  },

  selectSpecificSeat: (id, ticketGroup) => {
    const mixed = mixedMapSelectionError(get().selectedFromMap, ticketGroup);
    if (mixed) {
      set({ seatedError: mixed });
      return;
    }
    const seatLimit = exceededSelectionTicketLimit(
      get().eventTicketLimit ?? useFiltersStore.getState().eventTicketLimit,
      get().selectedFromMap,
      [ticketGroup],
      1,
    );
    if (seatLimit != null) {
      set({
        seatedError: maxTicketLimitError(
          seatLimit,
          limitedOfferName(get().selectedFromMap, [ticketGroup], seatLimit),
        ),
      });
      return;
    }

    set((state) => ({
      data: state.data
        ? {
            ...state.data,
            seats: {
              ...state.data.seats,
              [String(id)]: {
                ...state.data.seats?.[String(id)],
                seatId: String(id),
                cx: state.data.seats?.[String(id)]?.cx ?? 0,
                cy: state.data.seats?.[String(id)]?.cy ?? 0,
                w: state.data.seats?.[String(id)]?.w ?? 0,
                h: state.data.seats?.[String(id)]?.h ?? 0,
                selected: true,
              },
            },
          }
        : state.data,
    }));

    const selectedTicket = {
      seatId: id,
      seatNumber: get().data?.seats?.[String(id)]?.seatNumber,
      ...ticketGroup,
      offer: ticketGroup?.offer,
      offerIds: ticketGroup?.offer?.id
        ? [ticketGroup.offer.id]
        : ticketGroup.offerIds,
    };
    get()._addToSeats(selectedTicket);
    trackSelectTicket({
      organization: useFiltersStore.getState().event
        ?.organization as TrackingOrganization | undefined,
      ticket: selectedTicket,
      quantity: 1,
    });
  },

  selectSeatedOffers: (seatId, groups) => {
    const mixed = mixedMapSelectionError(get().selectedFromMap, groups);
    if (mixed) {
      set({ seatedError: mixed });
      return;
    }
    const picks = groups.filter((group) => Number(group.quantity) > 0);
    if (!picks.length) return;
    if (picks.length !== 1) {
      set({
        seatedError: invalidOfferQuantityError("1 per seat"),
      });
      return;
    }
    const eventLimit =
      get().eventTicketLimit ?? useFiltersStore.getState().eventTicketLimit;
    const [group] = picks;
    const limits = limitsFromSeatedOfferRow(group, eventLimit);
    const qty = Number(group.quantity || 0);
    if (!quantityIsAllowed(qty, limits)) {
      set({
        seatedError: invalidOfferQuantityError(
          quantityRestrictionLabel(limits),
        ),
      });
      return;
    }
    // A full cart is why these seats can't be added, so say that before
    // blaming the row for not having a long enough run.
    const offerLimit = exceededSelectionTicketLimit(
      eventLimit,
      get().selectedFromMap,
      picks,
      qty,
    );
    if (offerLimit != null) {
      set({
        seatedError: maxTicketLimitError(
          offerLimit,
          limitedOfferName(get().selectedFromMap, picks, offerLimit),
        ),
      });
      return;
    }
    const alreadySelected = new Set(
      get().selectedFromMap.map((selected) => String(selected.seatId)),
    );
    const rowSeatIds = Array.isArray(group.seatIds)
      ? group.seatIds.map(String)
      : [];
    const clickedId = String(seatId);
    const selectedSeatIds = adjacentSeatWindow(
      get().data,
      clickedId,
      rowSeatIds,
      alreadySelected,
      qty,
    );
    if (!selectedSeatIds) {
      set({
        seatedError: adjacentSeatsUnavailableError(qty),
      });
      return;
    }

    set((state) => ({
      data: state.data
        ? {
            ...state.data,
            seats: {
              ...state.data.seats,
              ...Object.fromEntries(
                selectedSeatIds.map((id) => [
                  id,
                  {
                    ...state.data?.seats?.[id],
                    seatId: id,
                    cx: state.data?.seats?.[id]?.cx ?? 0,
                    cy: state.data?.seats?.[id]?.cy ?? 0,
                    w: state.data?.seats?.[id]?.w ?? 0,
                    h: state.data?.seats?.[id]?.h ?? 0,
                    selected: true,
                  },
                ]),
              ),
            },
          }
        : state.data,
    }));

    const organization = useFiltersStore.getState().event
      ?.organization as TrackingOrganization | undefined;
    const selectedTickets = selectedSeatIds.map((selectedSeatId) => ({
      ...group,
      seatId: selectedSeatId,
      seatNumber: get().data?.seats?.[selectedSeatId]?.seatNumber,
      quantity: 1,
      offer: group.offer,
      offerIds: group.offer?.id ? [group.offer.id] : group.offerIds,
    }));
    set((state) => ({
      selectedFromMap: [...state.selectedFromMap, ...selectedTickets],
    }));
    get()._calculateTotals();
    selectedTickets.forEach((selectedTicket) => {
      trackSelectTicket({
        organization,
        ticket: selectedTicket,
        quantity: selectedTicket.quantity || 1,
      });
    });
  },

  unselectSeat: (seatId, ticketGroup) => {
    if (ticketGroup.GA) {
      set((state) => ({
        selectedFromMap: state.selectedFromMap
          .map((group) => {
            if (
              group.sectionId === ticketGroup.sectionId &&
              group.offer?.id === ticketGroup.offer?.id &&
              (ticketGroup.id == null || group.id === ticketGroup.id)
            ) {
              return { ...group, quantity: (group.quantity || 1) - 1 };
            }
            return group;
          })
          .filter((group) => !group.GA || (group.quantity || 0) > 0),
      }));
    } else {
      set((state) => ({
        selectedFromMap: state.selectedFromMap.filter(
          (group) => group.seatId !== seatId,
        ),
        data: state.data
          ? {
              ...state.data,
              seats: {
                ...state.data.seats,
                [String(seatId)]: {
                  ...state.data.seats?.[String(seatId)],
                  seatId: String(seatId),
                  cx: state.data.seats?.[String(seatId)]?.cx ?? 0,
                  cy: state.data.seats?.[String(seatId)]?.cy ?? 0,
                  w: state.data.seats?.[String(seatId)]?.w ?? 0,
                  h: state.data.seats?.[String(seatId)]?.h ?? 0,
                  selected: false,
                },
              },
            }
          : state.data,
      }));
    }
    get()._calculateTotals();
  },

  resetMapSelection: () => {
    set((state) => {
      if (!state.data) {
        return { selectedFromMap: [], totalCount: 0, totalPrice: 0 };
      }
      const seatIds = state.selectedFromMap
        .filter((g) => g.seatId !== undefined)
        .map((g) => String(g.seatId));
      const seats = { ...state.data.seats };
      seatIds.forEach((id) => {
        if (seats[id]) seats[id] = { ...seats[id], selected: false };
      });
      return {
        selectedFromMap: [],
        totalCount: 0,
        totalPrice: 0,
        data: { ...state.data, seats },
      };
    });
  },

  getTicketImage: (venue, sectionNumber, type = "highlights") => {
    const venueSlug = String(venue).trim().toLowerCase();
    const sectionSlug = String(sectionNumber).trim().toLowerCase();
    return `${get().bucket}/venues/${venueSlug}/${type}/${sectionSlug}.png`;
  },
}));

export default useSeatmapStore;
