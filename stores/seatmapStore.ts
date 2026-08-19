import { create } from "zustand";
import { mixedMapSelectionError } from "@/lib/mapSelection";
import useFiltersStore, { type TicketGroup } from "./filtersStore";
import type {
  SeatmapBackground,
  SeatmapMapping,
} from "@/lib/seatmapLookups";
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
  _withingEventTicketLimit: (additionalTickets: number) => boolean;
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

  _withingEventTicketLimit: (additionalTickets) => {
    const limit =
      get().eventTicketLimit ?? useFiltersStore.getState().eventTicketLimit;
    if (!limit) return true;

    const { selectedFromMap } = get();
    const currentGA = selectedFromMap
      .filter((g) => g.GA === true)
      .reduce((sum, g) => sum + (g.quantity || 0), 0);
    const currentSeated = selectedFromMap.filter((g) => g.GA === false).length;
    return currentGA + currentSeated + additionalTickets <= limit;
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
    const totalNew = selectedGroups.reduce(
      (sum, { quantity }) => sum + (quantity || 0),
      0,
    );
    if (!get()._withingEventTicketLimit(totalNew)) {
      const limit =
        get().eventTicketLimit ?? useFiltersStore.getState().eventTicketLimit;
      set({
        seatedError: {
          title: "Max ticket limit reached",
          message: `Adding these tickets would exceed the ticket limit of ${limit}. Please change your selection.`,
          buttonText: "Close",
        },
      });
      return;
    }
    selectedGroups.forEach((group) => {
      get()._addToSeats(group);
      trackSelectTicket({
        organization: useFiltersStore.getState().event
          ?.organization as TrackingOrganization | undefined,
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
    if (!get()._withingEventTicketLimit(1)) {
      const limit =
        get().eventTicketLimit ?? useFiltersStore.getState().eventTicketLimit;
      set({
        seatedError: {
          title: "Max ticket limit reached",
          message: `Adding these tickets would exceed the ticket limit of ${limit}. Please change your selection.`,
          buttonText: "Close",
        },
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
    const totalNew = groups.reduce(
      (sum, g) => sum + (g.quantity || 1),
      0,
    );
    if (!get()._withingEventTicketLimit(totalNew)) {
      const limit =
        get().eventTicketLimit ?? useFiltersStore.getState().eventTicketLimit;
      set({
        seatedError: {
          title: "Max ticket limit reached",
          message: `Adding these tickets would exceed the ticket limit of ${limit}. Please change your selection.`,
          buttonText: "Close",
        },
      });
      return;
    }

    set((state) => ({
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
                selected: true,
              },
            },
          }
        : state.data,
    }));

    const organization = useFiltersStore.getState().event
      ?.organization as TrackingOrganization | undefined;
    groups.forEach((group) => {
      const selectedTicket = {
        seatId,
        seatNumber: get().data?.seats?.[String(seatId)]?.seatNumber,
        ...group,
        offer: group.offer,
        offerIds: group.offer?.id ? [group.offer.id] : group.offerIds,
      };
      get()._addToSeats(selectedTicket);
      trackSelectTicket({
        organization,
        ticket: selectedTicket,
        quantity: group.quantity || 1,
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
