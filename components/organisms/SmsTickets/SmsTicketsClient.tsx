"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  downloadSmsApplePasses,
  downloadSmsGooglePasses,
  getSmsTickets,
} from "@/lib/api";
import { formatEventWhen, imageUrl } from "@/lib/helpers";
import {
  phoneWalletLabel,
  phoneWalletTheme,
  type PhoneWalletKind,
  phoneWalletKinds,
} from "@/lib/phoneWallet";
import { getAccessibleLabel } from "@/lib/ticketAccessibility";
import { formatVenueCityState } from "@/lib/venueLocation";
import { downloadBlobPass } from "@/lib/wallet";

type SmsTicket = {
  id?: string | number;
  uuid?: string;
  checkInCode?: string;
  sectionNumber?: string;
  rowNumber?: string;
  seatNumber?: string | number;
  generalAdmission?: boolean;
  accessible?: boolean;
  accessibleType?: string;
};

type SmsEvent = {
  name?: string;
  start?: string;
  display_start_time?: boolean;
  image?: unknown;
  venue?: {
    name?: string;
    timezone?: string;
    address?: Parameters<typeof formatVenueCityState>[0];
  };
};

type SmsPayload = {
  event?: SmsEvent;
  tickets?: SmsTicket[];
  expiresAt?: string | null;
};

type LoadStatus = "loading" | "ready" | "expired" | "unavailable";

function httpStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status;
}

function walletName(kind: PhoneWalletKind) {
  return kind === "apple" ? "Apple Wallet" : "Google Wallet";
}

function walletError(kind: PhoneWalletKind) {
  return `Could not add these tickets to ${walletName(kind)}. Try again, or add them one at a time.`;
}

function StatusMessage({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16 text-center text-[#14161c]">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-3 text-base leading-6 text-neutral-700">{body}</p>
    </main>
  );
}

function WalletButton({
  kind,
  label,
  disabled,
  onClick,
}: {
  kind: PhoneWalletKind;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const theme = phoneWalletTheme(kind);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-60"
      style={{ background: theme.buttonBg, color: theme.buttonColor }}
    >
      {label}
    </button>
  );
}

export default function SmsTicketsClient() {
  const params = useParams<{ token?: string | string[] }>();
  const rawToken = params?.token;
  const token = typeof rawToken === "string" ? rawToken : "";
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [payload, setPayload] = useState<SmsPayload | null>(null);
  const [wallets, setWallets] = useState<PhoneWalletKind[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setWallets(phoneWalletKinds());
  }, []);

  useEffect(() => {
    if (!token) {
      setStatus("unavailable");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    getSmsTickets(token)
      .then((response) => {
        if (cancelled) return;
        setPayload(response.data as SmsPayload);
        setStatus("ready");
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setStatus(httpStatus(loadError) === 410 ? "expired" : "unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function addToWallet(kind: PhoneWalletKind) {
    const popup =
      kind === "google" ? window.open("about:blank", "_blank") : null;
    if (kind === "google" && !popup) {
      setError(walletError(kind));
      return;
    }
    setError("");
    setBusy(true);
    try {
      if (kind === "apple") {
        const response = await downloadSmsApplePasses(token);
        const data = response.data;
        const blob =
          data instanceof Blob
            ? data
            : new Blob([data], { type: "application/vnd.apple.pkpasses" });
        await downloadBlobPass(blob, "tickets.pkpasses");
        return;
      }
      const response = await downloadSmsGooglePasses(token);
      const url = (response.data as { url?: string } | undefined)?.url;
      if (!url || !popup) throw new Error("missing");
      popup.location.href = url;
      popup.opener = null;
    } catch {
      popup?.close();
      setError(walletError(kind));
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6 text-[#14161c]">
        <p>Loading your tickets</p>
      </main>
    );
  }

  if (status === "expired") {
    return (
      <StatusMessage
        title="Link expired"
        body="This ticket link is no longer valid. Ask the box office to text you a new one."
      />
    );
  }

  if (status !== "ready" || !payload?.event) {
    return (
      <StatusMessage
        title="Tickets unavailable"
        body="We couldn't find tickets for this link. Check the text message and try again."
      />
    );
  }

  const event = payload.event;
  const tickets = (payload.tickets ?? []).filter((ticket) => ticket.checkInCode);
  const poster = imageUrl(event.image, "");
  const when = formatEventWhen(
    event.start,
    event.venue?.timezone,
    event.display_start_time === false ? "ddd, MMM D" : "ddd, MMM D, h:mm A",
  );
  const city = formatVenueCityState(event.venue?.address);
  const where = [event.venue?.name, city].filter(Boolean).join(" · ");
  const countLabel = tickets.length === 1 ? "1 ticket" : `${tickets.length} tickets`;
  const onPhone = wallets.length > 0;

  return (
    <main className="min-h-screen bg-[#f3f5f8] px-4 py-6 text-[#14161c]">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <header className="flex gap-3">
          {poster ? (
            <img
              src={poster}
              alt={event.name || "Event"}
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Your tickets
            </p>
            <h1 className="text-xl font-semibold leading-tight">{event.name}</h1>
            {when ? <p className="mt-1 text-sm text-neutral-700">{when}</p> : null}
            {where ? <p className="text-sm text-neutral-700">{where}</p> : null}
            <p className="mt-1 text-sm font-medium">{countLabel}</p>
          </div>
        </header>

        <p className="text-sm leading-5 text-neutral-700">
          {onPhone
            ? "Show a QR code at the door, or add these tickets to your wallet."
            : "Show a QR code at the door. Open this page on your phone to add tickets to Apple Wallet or Google Wallet."}
        </p>

        {onPhone && tickets.length >= 2 ? (
          <section className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold">
              Add all {tickets.length} tickets
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {busy
                ? "Preparing your passes…"
                : wallets.length > 1
                  ? "Adds every ticket to Apple Wallet or Google Wallet in one step."
                  : `Adds every ticket to ${walletName(wallets[0])} in one step.`}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {wallets.map((kind) => (
                <WalletButton
                  key={kind}
                  kind={kind}
                  disabled={busy}
                  label={`Add all ${tickets.length} tickets to ${walletName(kind)}`}
                  onClick={() => void addToWallet(kind)}
                />
              ))}
            </div>
            {error ? (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
          </section>
        ) : null}

        <ul className="flex flex-col gap-4">
          {tickets.map((ticket, index) => {
            const accessible = getAccessibleLabel(ticket);
            return (
              <li
                key={ticket.uuid || ticket.id || ticket.checkInCode}
                className="rounded-xl bg-white p-4 shadow-sm"
              >
                {tickets.length > 1 ? (
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Ticket {index + 1} of {tickets.length}
                  </p>
                ) : null}
                <div className="flex justify-center py-3">
                  <QRCodeSVG
                    value={String(ticket.checkInCode)}
                    size={132}
                    role="img"
                    aria-label={`QR code for ticket ${index + 1}`}
                  />
                </div>
                {ticket.generalAdmission ? (
                  <p className="text-center text-base font-medium">
                    {ticket.sectionNumber || "General admission"}
                  </p>
                ) : (
                  <dl className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <dt className="text-neutral-500">Section</dt>
                      <dd className="font-medium">{ticket.sectionNumber || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500">Row</dt>
                      <dd className="font-medium">{ticket.rowNumber || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500">Seat</dt>
                      <dd className="font-medium">{ticket.seatNumber ?? "—"}</dd>
                    </div>
                  </dl>
                )}
                {accessible ? (
                  <p className="mt-2 text-center text-sm font-medium">{accessible}</p>
                ) : null}
                {onPhone ? (
                  <div className="mt-3 flex flex-col gap-2">
                    {wallets.map((kind) => (
                      <WalletButton
                        key={kind}
                        kind={kind}
                        disabled={busy}
                        label={phoneWalletLabel(kind)}
                        onClick={() => void addToWallet(kind)}
                      />
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {onPhone && tickets.length < 2 && error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
