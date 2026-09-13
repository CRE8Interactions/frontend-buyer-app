/**
 * A wallet pass is only useful on the phone that gets scanned at the door, so
 * the add button is offered on phones and the API is asked to build the pass
 * for that phone's wallet: a `.pkpass` download for Apple, a save link for
 * Google.
 */
import { downloadApplePass, downloadGooglePass } from "@/lib/api";
import {
  downloadBlobPass,
  isPhoneDevice,
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

/** The wallet this phone can hold a pass in; tablets and desktops get none. */
export function phoneWalletKind(): PhoneWalletKind | null {
  if (!isPhoneDevice()) return null;
  const ua = navigator.userAgent;
  if (/iPhone|iPod/i.test(ua)) return "apple";
  if (/Android/i.test(ua)) return "google";
  return null;
}

export function phoneWalletLabel(kind: PhoneWalletKind): string {
  return kind === "apple" ? "Add to Apple Wallet" : "Add to Google Wallet";
}

/** Platform wallet CTAs use neutral dark styling, not org accent. */
export type PhoneWalletTheme = {
  buttonBg: string;
  buttonColor: string;
  selectedBorder: string;
  selectedBackground: string;
  selectedIndicator: string;
  addedLabel: string;
};

const APPLE_WALLET_THEME: PhoneWalletTheme = {
  buttonBg: "#14161c",
  buttonColor: "#ffffff",
  selectedBorder: "#14161c",
  selectedBackground: "color-mix(in srgb, #14161c 8%, white)",
  selectedIndicator: "#14161c",
  addedLabel: "#14161c",
};

const GOOGLE_WALLET_THEME: PhoneWalletTheme = {
  buttonBg: "#1f1f1f",
  buttonColor: "#ffffff",
  selectedBorder: "#1f1f1f",
  selectedBackground: "color-mix(in srgb, #1f1f1f 8%, white)",
  selectedIndicator: "#1f1f1f",
  addedLabel: "#1f1f1f",
};

export function phoneWalletTheme(kind: PhoneWalletKind): PhoneWalletTheme {
  return kind === "google" ? GOOGLE_WALLET_THEME : APPLE_WALLET_THEME;
}

/** The pass rides along as the ticket, against the package event then the pass events. */
export function accessPassWalletRequest(
  pass: AccessPassSummary,
  fallbackEvent?: EventLike | null,
): { event: EventLike; obj: Record<string, unknown> } | null {
  const obj = {
    ...pass.pass,
    uuid: pass.accessPassUUID || pass.pass.uuid,
    checkInCode: pass.checkInCode || pass.pass.checkInCode,
    sectionNumber: pass.pass.sectionNumber,
    rowNumber: pass.pass.rowNumber,
    seatNumber: pass.pass.seatNumber,
    generalAdmission: pass.pass.generalAdmission,
    name: pass.name || pass.pass.name,
    accessPass: true,
  };
  const event =
    walletPassEvent(fallbackEvent, obj) ||
    walletPassEvent(pass.events[0], obj);
  if (!event || !String(pass.checkInCode || "").trim()) return null;
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
    const res = await downloadGooglePass({
      event: passEvent,
      ticket: request.obj,
    });
    const link = googleWalletLink(res.data);
    if (!link) {
      return "Could not get a Google Wallet link. Please try again.";
    }
    window.open(link, "_blank", "noopener,noreferrer");
    return null;
  } catch {
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
  fallbackEvent?: EventLike | null,
): Promise<string | null> {
  return addPassToPhoneWallet(
    accessPassWalletRequest(pass, fallbackEvent),
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
