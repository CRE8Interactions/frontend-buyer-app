import { checkAccessCode } from "@/lib/api";

/** Explicit yes from POST /tickets/unlock-style responses. */
function serverAccepted(body: unknown) {
  if (body === true) return true;
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    b.valid === true ||
    b.unlocked === true ||
    b.success === true ||
    b.data === true
  );
}

/**
 * Whether the shopper's code opens an access-coded offer.
 *
 * The backend is asked first so a code rotated after page load still resolves.
 * When it gives no verdict, the code that came down with the locked inventory
 * decides, which keeps unlocking working on events the endpoint doesn't cover.
 */
export async function verifyOfferAccessCode({
  eventId,
  code,
  expected,
}: {
  eventId?: string | number;
  code: string;
  expected?: string;
}) {
  const typed = code.trim();
  if (!typed) return false;
  try {
    const res = await checkAccessCode({ eventId, accessCode: typed });
    if (serverAccepted(res?.data)) return true;
  } catch {
    // Fall through to the code from the inventory payload.
  }
  return !!expected && typed.toUpperCase() === expected.trim().toUpperCase();
}
