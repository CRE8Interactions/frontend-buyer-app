/**
 * A wallet pass is only useful on the phone that gets scanned at the door, so
 * the add button is offered on phones and the API is asked to build the pass
 * for that phone's wallet: a `.pkpass` download for Apple, a save link for
 * Google.
 */
import { downloadApplePass, downloadGooglePass } from "@/lib/api";
import { toIanaTimezone } from "@/lib/helpers";
import {
  downloadBlobPass,
  isAndroid,
  isIos,
  type AccessPassSummary,
  type EventLike,
} from "@/lib/wallet";

export type PhoneWalletKind = "apple" | "google";

const APPLE_PASS_TYPE = "application/vnd.apple.pkpass";

type WalletEvent = EventLike & {
  organizationUUID?: string;
  organizationId?: string;
  eventUUID?: string;
  shortCode?: string;
  shortcode?: string;
  slug?: string;
  seoUrl?: string;
  setting?: Record<string, unknown> | null;
  issuerId?: string;
  timezone?: string;
};

type WalletOrganization = Record<string, unknown> & {
  issuerId?: string;
  uuid?: string;
  setting?: Record<string, unknown> | null;
};

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

/** Class ids use the event uuid, not a numeric Strapi row id. */
function eventUuidFromUnknown(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) continue;
    const text = String(value ?? "").trim();
    if (text && !/^\d+$/.test(text)) return text;
  }
  return "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function issuerIdFromUnknown(value: unknown): string {
  if (!value) return "";
  if (Array.isArray(value)) {
    for (const item of value) {
      const issuerId = issuerIdFromUnknown(item);
      if (issuerId) return issuerId;
    }
    return "";
  }
  if (typeof value !== "object") return "";
  const row = value as WalletOrganization;
  return firstText(
    row.issuerId,
    row.issuer_id,
    row.googleIssuerId,
    row.google_issuer_id,
    row.googleWalletIssuerId,
    row.google_wallet_issuer_id,
    row.googlePayIssuerId,
    issuerIdFromUnknown(row.setting),
  );
}

function organizationFromUnknown(...values: unknown[]): WalletOrganization {
  const organization = {} as WalletOrganization;
  for (const value of values) {
    const row = asRecord(value);
    if (row) Object.assign(organization, row);
  }
  return organization;
}

/**
 * Google Wallet class ids are `{issuerId}.{eventUuid}`. Wallet list / order
 * payloads often omit one or both, nest the issuer under organization.setting,
 * or keep the org uuid only as event.organizationUUID.
 */
export function walletPassEvent(
  event?: EventLike | Record<string, unknown> | null,
  ticket?: Record<string, unknown> | null,
): EventLike | null {
  const ticketEvent = ticket?.event;
  const nested = asRecord(ticketEvent) as WalletEvent | null;
  if (!event && !nested && typeof ticketEvent !== "string") return null;
  const row = event as WalletEvent | undefined;
  const uuid = eventUuidFromUnknown(
    row?.uuid,
    nested?.uuid,
    ticket?.eventUUID,
    ticket?.event_uuid,
    typeof ticketEvent === "string" ? ticketEvent : "",
  );
  const organization = organizationFromUnknown(
    asRecord(ticket?.organization),
    nested?.organization,
    row?.organization,
    asRecord(ticket?.setting) ? { setting: ticket?.setting } : null,
  );
  const organizationUuid = eventUuidFromUnknown(
    organization.uuid,
    row?.organizationUUID,
    nested?.organizationUUID,
    ticket?.organizationUUID,
    row?.organizationId,
    nested?.organizationId,
  );
  if (organizationUuid) organization.uuid = organizationUuid;
  const issuerId = firstText(
    issuerIdFromUnknown(organization),
    issuerIdFromUnknown(row),
    issuerIdFromUnknown(nested),
    issuerIdFromUnknown(ticket),
  );
  if (issuerId) organization.issuerId = issuerId;
  return {
    ...nested,
    ...event,
    ...(uuid ? { uuid } : {}),
    ...(organizationUuid ? { organizationUUID: organizationUuid } : {}),
    ...(Object.keys(organization).length
      ? { organization: organization as EventLike["organization"] }
      : {}),
  };
}

/** The wallet this device can hold a pass in; desktops get none. */
export function phoneWalletKind(): PhoneWalletKind | null {
  if (isIos()) return "apple";
  if (isAndroid()) return "google";
  return null;
}

export function phoneWalletLabel(kind: PhoneWalletKind): string {
  return kind === "apple" ? "Add to Apple Wallet" : "Add to Google Wallet";
}

/** The pass rides along as the ticket, against its first event. */
export function accessPassWalletRequest(
  pass: AccessPassSummary,
): { event: EventLike; obj: Record<string, unknown> } | null {
  const obj = { ...pass.pass, accessPass: true };
  const event = walletPassEvent(pass.events[0], obj);
  if (!event || !pass.checkInCode) return null;
  return { event, obj };
}

export type PhoneWalletRequest = {
  event: EventLike;
  obj: Record<string, unknown>;
};

function googleWalletLink(data: unknown): string {
  if (typeof data === "string") return data;
  const body = data as { url?: string; data?: { url?: string } } | null;
  return body?.url || body?.data?.url || "";
}

function apiErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  const data = (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
    .response?.data;
  return firstText(data?.error?.message, data?.message);
}

/** Google Wallet rejects the bare "UTC" label the API often stores. */
function googleWalletTimezone(event?: EventLike | null): string {
  const row = event as WalletEvent | undefined;
  const venue = asRecord(row?.venue);
  const iana = toIanaTimezone(
    (venue?.timezone as string | undefined) ?? row?.timezone,
  );
  if (iana && iana.includes("/")) return iana;
  if (/^utc$/i.test(String(iana || venue?.timezone || row?.timezone || ""))) {
    return "Etc/UTC";
  }
  return iana || "Etc/UTC";
}

async function addApplePass(request: PhoneWalletRequest): Promise<string | null> {
  try {
    const res = await downloadApplePass(request);
    const data = res.data as unknown;
    const blob =
      data instanceof Blob
        ? data
        : typeof data === "string" || data instanceof ArrayBuffer
          ? new Blob([data], { type: APPLE_PASS_TYPE })
          : null;
    if (!blob || blob.size === 0) {
      return "Could not build your Apple Wallet pass. Please try again.";
    }
    await downloadBlobPass(blob, "event.pkpass");
    return null;
  } catch {
    return "Could not add this pass to Apple Wallet. Please try again.";
  }
}

async function addGooglePass(request: PhoneWalletRequest): Promise<string | null> {
  try {
    const passEvent = walletPassEvent(request.event, request.obj) || request.event;
    const eventUUID = eventUuidFromUnknown(
      (passEvent as WalletEvent).uuid,
      (passEvent as WalletEvent).eventUUID,
    );
    if (!eventUUID) {
      return "Could not add this pass to Google Wallet. Please try again.";
    }
    const timezone = googleWalletTimezone(passEvent);
    const ticket = {
      ...request.obj,
      eventUUID,
      timezone,
      event: {
        ...passEvent,
        uuid: eventUUID,
        timezone,
        venue: {
          ...asRecord((passEvent as WalletEvent).venue),
          timezone,
        },
      },
    };
    const res = await downloadGooglePass({
      event: eventUUID,
      ticket,
      obj: ticket,
      timezone,
    });
    const link = googleWalletLink(res.data);
    if (!link) {
      return "Could not get a Google Wallet link. Please try again.";
    }
    window.open(link, "_blank", "noopener,noreferrer");
    return null;
  } catch (err) {
    if (/time zone/i.test(apiErrorMessage(err))) {
      return "Google Wallet needs a valid event time zone.";
    }
    return "Could not add this pass to Google Wallet. Please try again.";
  }
}

/** Message to show the shopper, or null once the pass is on its way. */
export async function addPassToPhoneWallet(
  request: PhoneWalletRequest | null,
  kind: PhoneWalletKind,
  emptyMessage: string,
): Promise<string | null> {
  if (!request) return emptyMessage;
  return kind === "apple" ? addApplePass(request) : addGooglePass(request);
}

/** Message to show the shopper, or null once the pass is on its way. */
export async function addAccessPassToPhoneWallet(
  pass: AccessPassSummary,
  kind: PhoneWalletKind,
): Promise<string | null> {
  return addPassToPhoneWallet(
    accessPassWalletRequest(pass),
    kind,
    "This pass has no code to add yet.",
  );
}

export function ticketWalletRequest(
  event?: EventLike | Record<string, unknown> | null,
  ticket?: Record<string, unknown> | null,
): PhoneWalletRequest | null {
  if (!ticket) return null;
  const checkInCode = String(ticket.checkInCode || "").trim();
  if (!checkInCode) return null;
  const passEvent = walletPassEvent(event, ticket);
  if (!passEvent) return null;
  return { event: passEvent, obj: ticket };
}

export async function addTicketToPhoneWallet(
  event: EventLike | Record<string, unknown> | null | undefined,
  ticket: Record<string, unknown> | null | undefined,
  kind: PhoneWalletKind,
): Promise<string | null> {
  return addPassToPhoneWallet(
    ticketWalletRequest(event, ticket),
    kind,
    "This ticket has no code to add yet.",
  );
}
