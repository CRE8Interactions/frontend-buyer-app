"use client";

const SESSION_STORAGE_KEY = "bt_queue_session_id";
const TOKEN_PREFIX = "wr_token_";
const DESTINATION_PREFIX = "wr_destination_";
const RETURN_PREFIX = "wr_return_";
const CURRENT_EVENT_KEY = "wr_current_event_uuid";

export type WaitingRoomDestination = "ga" | "seated";

function storage() {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getQueueSessionId() {
  const store = storage();
  if (!store) return "";
  let sessionId = store.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = randomId();
    store.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

export function getWaitingRoomToken(eventUuid?: string | null) {
  if (!eventUuid) return null;
  return storage()?.getItem(`${TOKEN_PREFIX}${eventUuid}`) || null;
}

export function setWaitingRoomToken(eventUuid: string, token: string) {
  const store = storage();
  if (!store || !eventUuid || !token) return;
  store.setItem(`${TOKEN_PREFIX}${eventUuid}`, token);
  store.setItem(CURRENT_EVENT_KEY, eventUuid);
}

export function getCurrentWaitingRoomEventUuid() {
  return storage()?.getItem(CURRENT_EVENT_KEY) || null;
}

export function clearWaitingRoomToken(eventUuid?: string | null) {
  const store = storage();
  if (!store || !eventUuid) return;
  store.removeItem(`${TOKEN_PREFIX}${eventUuid}`);
  store.removeItem(`${RETURN_PREFIX}${eventUuid}`);
  if (store.getItem(CURRENT_EVENT_KEY) === eventUuid) {
    store.removeItem(CURRENT_EVENT_KEY);
  }
}

export function setWaitingRoomDestination(
  eventUuid: string,
  destination: WaitingRoomDestination,
) {
  if (!eventUuid) return;
  storage()?.setItem(`${DESTINATION_PREFIX}${eventUuid}`, destination);
}

export function getWaitingRoomDestination(
  eventUuid?: string | null,
): WaitingRoomDestination {
  if (!eventUuid) return "seated";
  return storage()?.getItem(`${DESTINATION_PREFIX}${eventUuid}`) === "ga"
    ? "ga"
    : "seated";
}

export function setWaitingRoomReturnPath(
  eventUuid: string,
  returnPath: string,
) {
  if (!eventUuid || !returnPath.startsWith("/")) return;
  storage()?.setItem(`${RETURN_PREFIX}${eventUuid}`, returnPath);
}

export function getWaitingRoomReturnPath(eventUuid?: string | null) {
  if (!eventUuid) return null;
  return storage()?.getItem(`${RETURN_PREFIX}${eventUuid}`) || null;
}

export function isWaitingRoomRequired(event?: {
  waitingRoomEnabled?: boolean | null;
} | null) {
  return Boolean(event?.waitingRoomEnabled);
}

export function hasValidWaitingRoomToken(eventUuid?: string | null) {
  return Boolean(getWaitingRoomToken(eventUuid));
}

export function getWaitingRoomPath(slug: string, shortcode: string) {
  return `/e/${encodeURIComponent(slug)}/${encodeURIComponent(shortcode)}/waiting-room/`;
}

export function getWaitingRoomPurchasePath({
  eventUuid,
  slug,
  shortcode,
}: {
  eventUuid: string;
  slug: string;
  shortcode: string;
}) {
  const returnPath = getWaitingRoomReturnPath(eventUuid);
  if (returnPath) return returnPath;
  return getWaitingRoomDestination(eventUuid) === "ga"
    ? `/e/${slug}/${shortcode}/`
    : `/e/${slug}/${shortcode}/tickets/`;
}

export function rememberWaitingRoomEntry({
  eventUuid,
  destination,
  returnPath,
}: {
  eventUuid: string;
  destination: WaitingRoomDestination;
  returnPath?: string;
}) {
  setWaitingRoomDestination(eventUuid, destination);
  if (returnPath) setWaitingRoomReturnPath(eventUuid, returnPath);
}
