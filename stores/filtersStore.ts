import { create } from "zustand";

export type PurchaseFilters = {
  quantity: number;
  sort: string;
  accessible: boolean;
  priceRange: [number, number];
  selectedOfferIds: Array<string | number>;
  accessCodes: string[];
  returnLocked?: boolean;
};

type FiltersState = {
  event: Record<string, unknown> | null;
  eventTicketLimit: number | null;
  code: string | number | null;
  feeStructure: unknown;
  taxRates: unknown;
  priceRangeMinMax: [number, number] | null;
  offers: unknown[];
  originalPriceRange: [number, number];
  filters: PurchaseFilters;
  ticketGroups: TicketGroup[];
  loadingTicketGroups: boolean;
  setLoadingTicketGroups: (loading: boolean) => void;
  setTicketGroups: (ticketGroups: TicketGroup[]) => void;
  setFilters: (newFilters: Partial<PurchaseFilters>) => void;
  setEvent: (event: Record<string, unknown> | null) => void;
  setFeeStructure: (feeStructure: unknown) => void;
  setTaxRates: (taxRates: unknown) => void;
  setPriceRangeMinMax: (range: [number, number] | null) => void;
  setOffers: (offers: unknown[]) => void;
  setCode: (code: string | number | null) => void;
  setEventTicketLimit: (limit: number | null) => void;
};

export type TicketGroup = {
  id?: string | number;
  seatId?: string | number;
  seatNumber?: string | number;
  seatIds?: string[];
  sectionId?: string | number;
  sectionName?: string;
  sectionNumber?: string | number;
  rowId?: string | number;
  rowName?: string;
  rowNumber?: string | number;
  price?: number;
  sortOrder?: number;
  quantity?: number;
  availableCount?: number;
  /** Sellable seat IDs for this group (capacity baseline). */
  allSeatIds?: string[] | Record<string, unknown>;
  GA?: boolean;
  accessible?: boolean;
  resale?: boolean;
  ticketGroupUUID?: string;
  offer?: {
    id?: string | number;
    name?: string;
    color?: string | null;
    accessCode?: string | null;
    unlocked?: boolean;
    freeOffer?: boolean;
    description?: string;
    inventoryType?: string;
    isDefaultOffer?: boolean;
    connected_offers?: unknown[];
    minQuantity?: number | null;
    maxQuantity?: number | null;
    multipleOf?: number | null;
    incrementsOf?: number | null;
    limit?: number | null;
  };
  package?: {
    id?: string | number;
    name?: string;
    freeOffer?: boolean;
    minQuantity?: number | null;
    maxQuantity?: number | null;
    multipleOf?: number | null;
    incrementsOf?: number | null;
    limit?: number | null;
  };
  offerIds?: Array<string | number>;
  [key: string]: unknown;
};

const useFiltersStore = create<FiltersState>((set, get) => ({
  event: null,
  eventTicketLimit: null,
  code: null,
  feeStructure: null,
  taxRates: null,
  priceRangeMinMax: null,
  offers: [],
  originalPriceRange: [0, 500],
  filters: {
    quantity: 2,
    sort: "price",
    accessible: false,
    priceRange: [0, 500],
    selectedOfferIds: [],
    accessCodes: [],
  },
  ticketGroups: [],
  loadingTicketGroups: true,

  setLoadingTicketGroups: (loadingTicketGroups) => set({ loadingTicketGroups }),
  setTicketGroups: (ticketGroups) => set({ ticketGroups }),
  setFilters: (newFilters) =>
    set({ filters: { ...get().filters, ...newFilters } }),
  setEvent: (event) => set({ event }),
  setFeeStructure: (feeStructure) => set({ feeStructure }),
  setTaxRates: (taxRates) => set({ taxRates }),
  setPriceRangeMinMax: (priceRangeMinMax) => set({ priceRangeMinMax }),
  setOffers: (offers) => set({ offers }),
  setCode: (code) => set({ code }),
  setEventTicketLimit: (eventTicketLimit) => set({ eventTicketLimit }),
}));

export default useFiltersStore;
