import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import moment from "moment";
import { getToken, isLoggedIn } from "@/lib/auth";
import { demoAdapter } from "@/lib/demo/adapter";
import { createInflightCache } from "@/lib/inflightCache";
import {
  clearWaitingRoomToken,
  getCurrentWaitingRoomEventUuid,
  getQueueSessionId,
  getWaitingRoomToken,
  setWaitingRoomReturnPath,
} from "@/lib/waitingRoom";

/** Demo mode: serve local dummy data, never hit a backend. */
const DEMO = process.env.NEXT_PUBLIC_DEMO === "true";

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API,
  timeout: 30000,
  withCredentials: false,
  ...(DEMO ? { adapter: demoAdapter } : {}),
});

const WAITING_ROOM_GATED_URLS = [
  /\/events\/seatmap\//,
  /\/tickets\/available/,
  /\/events\/place-tickets-into-cart/,
  /\/events\/place-ga-tickets-into-cart/,
  /\/events\/place-package-into-cart/,
  /\/access-pass-templates\/add-to-cart/,
  /\/flex-pack\/add-to-cart/,
];

instance.interceptors.request.use(
  (config) => {
    if (isLoggedIn()) {
      const token = getToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    const url = config.url || "";
    const waitingRoomRequest = url.includes("/waiting-room/");
    const gated = WAITING_ROOM_GATED_URLS.some((pattern) => pattern.test(url));
    if (waitingRoomRequest || gated) {
      const sessionId = getQueueSessionId();
      if (sessionId) config.headers["X-Queue-Session-Id"] = sessionId;
    }
    if (gated) {
      const body = config.data as
        | {
            eventUUID?: string;
            eventUuid?: string;
            data?: { eventUUID?: string; eventUuid?: string };
          }
        | undefined;
      const params = config.params as
        | { eventUUID?: string; eventUuid?: string }
        | undefined;
      const eventUuid =
        params?.eventUUID ||
        params?.eventUuid ||
        body?.eventUUID ||
        body?.eventUuid ||
        body?.data?.eventUUID ||
        body?.data?.eventUuid ||
        getCurrentWaitingRoomEventUuid();
      const waitingRoomToken = getWaitingRoomToken(eventUuid);
      if (waitingRoomToken) {
        config.headers["X-Waiting-Room-Token"] = waitingRoomToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data as
      | { code?: string; eventUuid?: string; joinUrl?: string }
      | undefined;
    if (
      data?.code === "WAITING_ROOM_REQUIRED" &&
      typeof window !== "undefined"
    ) {
      if (data.eventUuid) {
        clearWaitingRoomToken(data.eventUuid);
        const returnPath = `${window.location.pathname}${window.location.search}`;
        if (returnPath && !returnPath.includes("/waiting-room")) {
          setWaitingRoomReturnPath(data.eventUuid, returnPath);
        }
      }
      if (
        data.joinUrl &&
        !window.location.pathname.includes("/waiting-room")
      ) {
        window.location.assign(data.joinUrl);
      }
    }
    return Promise.reject(error);
  },
);

export const verifyUser = (data: unknown) => instance.post("/verifies", data);

export const verifyCode = (data: unknown) =>
  instance.post("/verifies/by-phone-or-email", data);

export const phoneUnique = (data: unknown) =>
  instance.post("/verifies/phone-unique", data);

export const createNewUser = (data: unknown) =>
  instance.post("/verifies/newUser", data);

export const createOrder = (data: unknown) => instance.post("/orders", data);

export const processOrder = (data: unknown) =>
  instance.post("/orders/process", data);

export const processFreeOrder = (data: unknown) =>
  instance.post("/orders/process-free", data);

export const getPricing = (data: unknown) =>
  instance.post("/orders/pricing", data);

export const getOrder = (orderId: string) =>
  instance.get(`/orders?filters[orderId][$eq]=${orderId}`);

export const getAccessPassesByOrder = (orderId: string) =>
  instance.get(`/access-passes/by-order/${orderId}`);

export const getMyAccessPasses = (type = "organizer") =>
  instance.get("/events/myAccessPasses", { params: type ? { type } : {} });

export const getMyAccessPass = (uuid: string) =>
  instance.get(`/events/myAccessPasses/${uuid}`);

export const getVenueAccessPasses = (venueUUID: string) =>
  instance.get(
    `/access-pass-templates/get-venue-access-passes?venueUUID=${venueUUID}`,
  );

export const getAccessPassTemplate = (uuid: string) =>
  instance.get(`/access-pass-templates/get-access-pass?uuid=${uuid}`);

export const placeAccessPassIntoCart = (templateId: string | number) =>
  instance.post(`/access-pass-templates/add-to-cart?id=${templateId}`);

export const findMadeOrder = (data: unknown) =>
  instance.post("/orders/findMadeOrder", data);

export const getMyOrganizations = () => instance.get("/organizations/myOrgs");

export const createOrganization = (data: unknown) =>
  instance.post("/organizations", data);

export const getPaymentIntent = (data: unknown) =>
  instance.post(`/payment/intent`, data);

export const resolveFundraisingCampaign = ({
  organizationUUID,
  eventUUID,
  packageUUID,
  flexPackUUID,
  accessPassTemplateUUID,
  participantUuid,
  sectionIds,
}: {
  organizationUUID?: string;
  eventUUID?: string;
  packageUUID?: string;
  flexPackUUID?: string;
  accessPassTemplateUUID?: string;
  participantUuid?: string;
  sectionIds?: string;
} = {}) => {
  const params = new URLSearchParams();
  if (organizationUUID) params.set("organizationUUID", organizationUUID);
  if (eventUUID) params.set("eventUUID", eventUUID);
  if (packageUUID) params.set("packageUUID", packageUUID);
  if (flexPackUUID) params.set("flexPackUUID", flexPackUUID);
  if (accessPassTemplateUUID) {
    params.set("accessPassTemplateUUID", accessPassTemplateUUID);
  }
  if (participantUuid) params.set("participantUuid", participantUuid);
  if (sectionIds) params.set("sectionIds", sectionIds);
  return instance.get(`/fundraising-campaigns/resolve?${params.toString()}`);
};

export const getPublicFundraisingCampaign = (
  slug: string,
  {
    organizationUUID,
    organizationSlug,
  }: { organizationUUID?: string; organizationSlug?: string } = {},
) => {
  const params = new URLSearchParams();
  if (organizationUUID) params.set("organizationUUID", organizationUUID);
  if (organizationSlug) params.set("organizationSlug", organizationSlug);
  const query = params.toString();
  return instance.get(
    `/fundraising-campaigns/public/${encodeURIComponent(slug)}${query ? `?${query}` : ""}`,
  );
};

export const createLandingPageDonationIntent = (slug: string, payload: unknown) =>
  instance.post(
    `/fundraising-campaigns/public/${encodeURIComponent(slug)}/donate`,
    payload,
  );

export const confirmLandingPageDonation = (paymentIntentId: string) =>
  instance.post("/fundraising-campaigns/donate/confirm", { paymentIntentId });

export const getCategories = () => instance.get("/categories");

export const getVenues = () => instance.get("/venues/find-on-sale");

export const getOrganizationsOnSale = () =>
  instance.get("/organizations/on-sale");

export const getGuestPasses = (eventId: string, phoneNumber: string) =>
  instance.get(
    `/guest-passes?filters[$and][0][eventId][$eq]=${eventId}&filters[$and][1][phoneNumber][$contains]=${phoneNumber}`,
  );

export const getGuestList = (phoneNumber: string) =>
  instance.get(`/guest-lists?phoneNumber=${phoneNumber}`);

export const getVenue = (id: string) =>
  instance.get(`/venues?filters[slug][$eq]=${encodeURIComponent(id)}`);

export const getVenueUpcomingEvents = (id: string | number) =>
  instance.get(`/venues/${id}/upcoming-events`);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Enrich stub venue/team events with pricingLevels (id, uuid, or shortCode). */
export const getEventsByIds = (ids: Array<string | number>) => {
  const params = new URLSearchParams();
  const numeric: string[] = [];
  const uuids: string[] = [];
  const codes: string[] = [];
  ids.forEach((id) => {
    const value = String(id);
    if (/^\d+$/.test(value)) numeric.push(value);
    else if (UUID_RE.test(value) || value.includes("-")) uuids.push(value);
    else codes.push(value);
  });
  const branches = [
    { key: "id", values: numeric },
    { key: "uuid", values: uuids },
    { key: "shortCode", values: codes },
  ].filter((branch) => branch.values.length);
  if (branches.length === 1) {
    branches[0].values.forEach((id, i) =>
      params.set(`filters[${branches[0].key}][$in][${i}]`, id),
    );
  } else {
    branches.forEach((branch, orIndex) => {
      branch.values.forEach((id, i) =>
        params.set(`filters[$or][${orIndex}][${branch.key}][$in][${i}]`, id),
      );
    });
  }
  params.set("pagination[pageSize]", String(Math.max(ids.length, 1)));
  return instance.get(`/events?${params.toString()}`);
};

export const getOrganizationStorefront = (slug: string) =>
  instance.get(`/organizations/storefront/${encodeURIComponent(slug)}`);

export const getPublicOrganizationBranding = (idOrSlug: string) =>
  getOrganizationStorefront(idOrSlug);

export const getEvents = () => instance.get(`/events/on-sale`);

export const getTaxRates = (city: string, state: string) =>
  instance.get(`organizations/tax-rates?city=${city}&state=${state}`);

export const searchEvents = (q: unknown) => instance.post(`/events/search`, q);

const myEventsCache = createInflightCache<AxiosResponse>(5_000);

export const getMyEvents = (options?: { fresh?: boolean }) =>
  myEventsCache.get(
    () => instance.get("/events/myUpcomingEvents"),
    options,
  );

export function __resetMyEventsCacheForTests() {
  myEventsCache.reset();
}

export const getMyUpcomingOrders = () =>
  instance.get("/events/myUpcomingOrders");

export const getEvent = (id: string) =>
  instance.get(`/events/${id}?filters[status][$eq]=on_sale`);

const eventByShortCodeCache = createInflightCache<AxiosResponse>(5_000);

export const getEventByShortCode = (id: string, slug: string, code: string) =>
  eventByShortCodeCache.get(
    () => instance.get(`/events/${slug}/${id}?code=${code}`),
    { key: `${slug}/${id}?code=${code}` },
  );

export const getSeatmapByShortCode = (id: string, slug: string) =>
  instance.get(`/events/seatmap/${slug}/${id}`);

export const getEventTickets = (id: string) => {
  const date = moment().toISOString();
  return instance.get(
    `/tickets?filters[eventId][$eq]=${id}&filters[on_sale_status][$eq]=available&filters[sales_start][$lte]=${date}&filters[sales_end][$gte]=${date}`,
  );
};

export const getAllEventTickets = (id: string, code: string) =>
  instance.get(`/tickets/available?eventUUID=${id}&code=${code}`);

export const createTicketTransfer = (data: unknown) =>
  instance.post("/ticket-transfers", data);

export const updatePersonalDetails = (data: unknown) =>
  instance.post("/verifies/personalDetails", data);

export const createBankAccount = (data: unknown) =>
  instance.post("/payment-information/generate", data);

export const getBankAccount = () => instance.get("/payment-informations/0");

export const savePassApple = () =>
  instance.get("/aaa/apple", { responseType: "blob" });

export const savePassGoogle = () => instance.get("/aaa/google");

export const removeBankAccount = () =>
  instance.get("/payment-information/deactive");

export const getMySentTransfers = (userEmail: string, page: number) =>
  instance.get(
    `/ticket-transfers?filters[fromUserEmail][$eq]=${userEmail}&populate=*&sort[0]=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=50`,
  );

export const getMyReceivedTransfers = (userEmail: string, page: number) =>
  instance.get(
    `/ticket-transfers?filters[emailAddressToUser][$eq]=${userEmail}&populate=*&sort[0]=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=50`,
  );

export const cancelMyTransfers = (data: unknown) =>
  instance.post("/ticket-transfers/cancel", data);

export const getIncomingTransfers = () =>
  instance.get("/ticket-transfers/incoming");

export const acceptIncomingTransfers = (data: unknown) =>
  instance.post("/ticket-transfers/accept", data);

export const createListing = (data: unknown) => instance.post("/listings", data);

export const getListingsByEvent = (id: string) =>
  instance.get(`/listings/byEvent?id=${id}`);

export const getMyListings = () => instance.get("/listings/mylisting");

export const getAvailableFunds = () =>
  instance.get("/listings/available-funds");

export const removeMyListings = (id: string | number) =>
  instance.delete(`/listings/${id}`);

export const updateMyListings = (id: string | number, data: unknown) =>
  instance.put(`/listings/${id}`, data);

export const getResaleTickets = (eventId: string) =>
  instance.get(
    `/tickets?filters[eventId][$eq]=${eventId}&filters[on_sale_status][$eq]=resaleAvailable`,
  );

export const validEmail = (data: unknown) =>
  instance.post("/verifies/emailValid", data);

export const requestNumberChange = (data: unknown) =>
  instance.post("/verifies/change-number", data);

export const updateNumber = (data: unknown) =>
  instance.post("/verifies/confirm-update", data);

export const confirmCode = (data: unknown) =>
  instance.post("/tickets/unlock", data);

export const checkAccessCode = (data: unknown) =>
  instance.post("/tickets/checkAccessCode", data);

export const getOffers = (eventId: string) =>
  instance.get(`/events/offers?uuid=${eventId}`);

export const getTicketsFromOffer = (offerId: string, eventId: string) =>
  instance.get(`/events/offer-tickets?uuid=${eventId}&offerUUID=${offerId}`);

export const placeTicketsIntoCart = (data: unknown) =>
  instance.post(`/events/place-tickets-into-cart`, data);

export const placeGATicketsIntoCart = (data: unknown) =>
  instance.post(`/events/place-ga-tickets-into-cart`, data);

export const placePackageIntoCart = (data: unknown) =>
  instance.post(`/events/place-package-into-cart`, data);

export const getTicketGroups = (data: unknown) =>
  instance.post(`/ticket-group/get-ticket-groups`, data);

export const joinWaitingRoom = (eventUuid: string) =>
  instance.post("/waiting-room/join", { data: { eventUuid } });

export const getWaitingRoomStatus = (eventUuid: string) =>
  instance.get("/waiting-room/status", { params: { eventUuid } });

export const heartbeatWaitingRoom = (eventUuid: string, token: string) =>
  instance.post("/waiting-room/heartbeat", {
    data: { eventUuid, token },
  });

export const leaveWaitingRoom = (
  eventUuid: string,
  token?: string | null,
  soft = false,
) =>
  instance.post("/waiting-room/leave", {
    data: {
      eventUuid,
      ...(token ? { token } : {}),
      ...(soft ? { soft: true } : {}),
    },
  });

/**
 * Best-effort queue release for page close/refresh. `fetch` with keepalive is
 * used because sendBeacon cannot carry the queue-session header.
 */
export function beaconLeaveWaitingRoom(
  eventUuid: string,
  token?: string | null,
  { soft = false }: { soft?: boolean } = {},
) {
  if (!eventUuid || typeof window === "undefined" || typeof fetch === "undefined") {
    return;
  }
  const base = process.env.NEXT_PUBLIC_API?.replace(/\/$/, "");
  if (!base) return;
  const sessionId = getQueueSessionId();
  if (!sessionId) return;

  try {
    void fetch(`${base}/waiting-room/leave`, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        "X-Queue-Session-Id": sessionId,
        ...(token ? { "X-Waiting-Room-Token": token } : {}),
      },
      body: JSON.stringify({
        data: {
          eventUuid,
          ...(token ? { token } : {}),
          ...(soft ? { soft: true } : {}),
        },
      }),
    }).catch(() => {});
  } catch {
    // Admission TTL still reclaims the slot if unload networking is unavailable.
  }
}

export function isWaitingRoomRequiredError(error: unknown) {
  return (
    (error as { response?: { data?: { code?: string } } })?.response?.data
      ?.code === "WAITING_ROOM_REQUIRED"
  );
}

export const getCart = (cartId: string) =>
  instance.get(`/cart/myCart?cartId=${cartId}`);

export const dropUserCart = (data: unknown) =>
  instance.post(`/cart/drop-user-cart`, data);

export const getVenuePackages = (venueUUID: string) =>
  instance.get(`/packages/get-venue-packages?venueUUID=${venueUUID}`);

/** In-flight + short-lived cache — this endpoint can be 30MB+ and Strict Mode remounts would otherwise fetch twice. */
// Explicit AxiosResponse — ReturnType<typeof instance.get> collapses to unknown via axios overloads.
const packageFeInflight = new Map<string, Promise<AxiosResponse>>();
const packageFeCache = new Map<
  string,
  { expires: number; response: AxiosResponse }
>();
const PACKAGE_FE_CACHE_MS = 60_000;

export const getPackageFE = (uuid: string): Promise<AxiosResponse> => {
  const cached = packageFeCache.get(uuid);
  if (cached && cached.expires > Date.now()) {
    return Promise.resolve(cached.response);
  }

  const existing = packageFeInflight.get(uuid);
  if (existing) return existing;

  const request = instance
    .get(`/packages/get-package-fe?uuid=${uuid}`, {
      // Large stadium packages ship seatmap + tens of thousands of tickets.
      timeout: 120000,
    })
    .then((response) => {
      packageFeCache.set(uuid, {
        expires: Date.now() + PACKAGE_FE_CACHE_MS,
        response,
      });
      return response;
    })
    .finally(() => {
      packageFeInflight.delete(uuid);
    });

  packageFeInflight.set(uuid, request);
  return request;
};

export const getMyPackage = (uuid: string) =>
  instance.get(`/packages/get-my-package?uuid=${uuid}`);

export const downloadApplePass = (data: unknown) =>
  instance.post(`/download_apple_pass`, data, { responseType: "blob" });

export const downloadGooglePass = (data: unknown) =>
  instance.post("/create_download_google_pass", data);

export const validateEmail = (data: unknown) =>
  instance.post("/registration/validate-email", data);

export const getTicketsByEvent = (uuid: string) =>
  instance.get(`/event/my-tickets/${uuid}`);

export const getVenueFlexPacks = (venueUUID: string) =>
  instance.get(`/flex-pack/get-venue-flex-packs?venueUUID=${venueUUID}`);

export const getFlexPack = (uuid: string) =>
  instance.get(`/flex-pack/get-flex-pack?uuid=${uuid}`);

export const placeFlexPackIntoCart = (flexPackId: string | number) =>
  instance.post(`/flex-pack/add-to-cart?id=${flexPackId}`);

export const trackCartSessionEvent = (data: unknown) =>
  instance.post("/cart-sessions/track", data);

export const completeCartSession = (data: unknown) =>
  instance.post("/cart-sessions/complete", data);

export const getGroupInvitation = (groupCode: string) =>
  instance.get(
    `/group-purchase-invitations?populate=*&filters[groupCode][$eq]=${groupCode}`,
  );

export const redeemPromoCode = (data: unknown) =>
  instance.post(`/promo-code/redeem`, data);

export const removePromoCode = (data: unknown) =>
  instance.post(`/promo-code/remove`, data);

export const getOrderByPaymentIntentId = (paymentIntentId: string) =>
  instance.get(
    `/orders/get-order-by-payment-intent-id?paymentIntentId=${paymentIntentId}`,
  );

export const getOrderReceiptHtml = (paymentIntentId: string) =>
  instance.get<string>(
    `/orders/order-receipt-html?paymentIntentId=${encodeURIComponent(paymentIntentId)}`,
    { responseType: "text" },
  );

export const getPublicMenu = (
  organizationUuid: string,
  sectionName: string,
  rowName: string,
  seatName: string,
  { venueUuid, eventUuid }: { venueUuid?: string; eventUuid?: string } = {},
) => {
  const section = encodeURIComponent(sectionName);
  const row = encodeURIComponent(rowName);
  const seat = encodeURIComponent(seatName);
  const params: Record<string, string> = {};
  if (venueUuid) params.venueUuid = venueUuid;
  if (eventUuid) params.eventUuid = eventUuid;
  return instance.get(
    `/fnb-items/public-menu/${organizationUuid}/${section}/${row}/${seat}`,
    { params },
  );
};

export const getEventMenuContext = (
  eventUuid: string,
  { section, row, seat }: { section?: string; row?: string; seat?: string } = {},
) => {
  const params: Record<string, string> = {};
  if (section) params.section = section;
  if (row) params.row = row;
  if (seat) params.seat = seat;
  return instance.get(`/fnb-items/event-menu-context/${eventUuid}`, { params });
};

export const submitPublicMenuOrder = (payload: unknown) =>
  instance.post("/fnb-items/public-order", { data: payload });

export const createPublicMenuPaymentIntent = (payload: unknown) =>
  instance.post("/fnb-items/public-payment-intent", { data: payload });

export const getPublicMenuPricing = (payload: unknown) =>
  instance.post("/fnb-items/public-pricing", { data: payload });

export const getPublicOrderStatus = (
  organizationUuid: string,
  orderNumber: string,
  {
    section,
    row,
    seat,
    venueUuid,
    eventUuid,
  }: {
    section?: string;
    row?: string;
    seat?: string;
    venueUuid?: string;
    eventUuid?: string;
  } = {},
) => {
  const params: Record<string, string> = {};
  if (section) params.section = section;
  if (row) params.row = row;
  if (seat) params.seat = seat;
  if (venueUuid) params.venueUuid = venueUuid;
  if (eventUuid) params.eventUuid = eventUuid;
  return instance.get(
    `/fnb-orders/public-status/${organizationUuid}/${encodeURIComponent(orderNumber)}`,
    { params },
  );
};

export default instance;

export type { AxiosRequestConfig };
