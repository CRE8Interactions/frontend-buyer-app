/**
 * A wallet pass is only useful on the phone that gets scanned at the door, so
 * the add button is offered on phones and the API is asked to build the pass
 * for that phone's wallet: a `.pkpass` download for Apple, a save link for
 * Google.
 */
import { downloadApplePass, downloadGooglePass } from "@/lib/api";
import {
  downloadBlobPass,
  isAndroid,
  isIos,
  type AccessPassSummary,
  type EventLike,
} from "@/lib/wallet";

export type PhoneWalletKind = "apple" | "google";

const APPLE_PASS_TYPE = "application/vnd.apple.pkpass";

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
  const event = pass.events[0];
  if (!event || !pass.checkInCode) return null;
  return { event, obj: { ...pass.pass, accessPass: true } };
}

function googleWalletLink(data: unknown): string {
  if (typeof data === "string") return data;
  const body = data as { url?: string; data?: { url?: string } } | null;
  return body?.url || body?.data?.url || "";
}

async function addApplePass(request: {
  event: EventLike;
  obj: Record<string, unknown>;
}): Promise<string | null> {
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

async function addGooglePass(request: {
  event: EventLike;
  obj: Record<string, unknown>;
}): Promise<string | null> {
  try {
    const res = await downloadGooglePass({
      event: request.event,
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
export async function addAccessPassToPhoneWallet(
  pass: AccessPassSummary,
  kind: PhoneWalletKind,
): Promise<string | null> {
  const request = accessPassWalletRequest(pass);
  if (!request) return "This pass has no code to add yet.";
  return kind === "apple" ? addApplePass(request) : addGooglePass(request);
}
