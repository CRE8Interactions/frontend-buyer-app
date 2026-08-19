"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import AppShell from "@/components/templates/AppShell";
import BackChip from "@/components/molecules/BackChip";
import Modal from "@/components/molecules/Modal";
import EmptyState from "@/components/molecules/EmptyState";
import PageLoader from "@/components/molecules/PageLoader";
import DateChip from "@/components/molecules/DateChip";
import { cardCls, chipBtnSmCls } from "@/components/molecules/Card";
import Button from "@/components/atoms/Button";
import Pill from "@/components/atoms/Pill";
import {
  downloadApplePass,
  downloadGooglePass,
  getMyAccessPass,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { imageUrl } from "@/lib/helpers";
import {
  type AccessPassLike,
  type EventLike,
  downloadBlobPass,
  eventChip,
  eventWhenLabel,
  isAndroid,
  isIos,
  seatLabel,
} from "@/lib/wallet";

export default function AccessPassDetailsPage() {
  const params = useParams<{ uuid: string }>();
  const { ready, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pass, setPass] = useState<AccessPassLike | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !isAuthenticated || !params.uuid) return;
    setLoading(true);
    getMyAccessPass(params.uuid)
      .then((res) => {
        const data = (res.data as { data?: AccessPassLike })?.data ?? res.data;
        setPass(data as AccessPassLike);
      })
      .catch((err) => {
        console.error(err);
        setPass(null);
      })
      .finally(() => setLoading(false));
  }, [ready, isAuthenticated, params.uuid]);

  const events = [...(pass?.events || [])].sort(
    (a, b) => new Date(a.start || 0).getTime() - new Date(b.start || 0).getTime(),
  );
  const upcoming = events.filter((e) => e.status !== "complete");
  const next = upcoming[0] || events[0];
  const remaining = events.filter((e) => e.status !== "complete").length;

  const walletEvent = next as EventLike | undefined;
  const walletObj = pass
    ? {
        ...pass,
        accessPass: true,
      }
    : null;

  const addApple = async () => {
    if (!walletEvent || !walletObj) return;
    try {
      const res = await downloadApplePass({ event: walletEvent, obj: walletObj });
      await downloadBlobPass(res.data as Blob, "access-pass.pkpass");
    } catch (err) {
      console.error(err);
      setWalletError("Could not download your Apple Wallet pass.");
    }
  };

  const addGoogle = async () => {
    if (!walletEvent || !walletObj) return;
    try {
      const res = await downloadGooglePass({ event: walletEvent, ticket: walletObj });
      const link =
        typeof res.data === "string"
          ? res.data
          : (res.data as { url?: string })?.url;
      if (link) window.open(link, "_blank", "noopener,noreferrer");
      else setWalletError("Could not open Google Wallet.");
    } catch (err) {
      console.error(err);
      setWalletError("Could not add this pass to Google Wallet.");
    }
  };

  return (
    <AppShell requireAuth>
      <BackChip href="/my-events/" label="My events" />

      {loading ? (
        <PageLoader message="Loading access pass…" label="Loading access pass" className="mt-8 min-h-[30vh]" />
      ) : !pass ? (
        <div className="mt-8">
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" />
              </svg>
            }
          >
            Access pass not found.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-6 max-w-[720px]">
          <div
            className={`${cardCls} overflow-hidden`}
            style={
              pass.backgroundColor || pass.fontColor
                ? {
                    backgroundColor: pass.backgroundColor || undefined,
                    color: pass.fontColor || undefined,
                  }
                : undefined
            }
          >
            <div className="flex items-start gap-4 p-6">
              {pass.artwork && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl(pass.artwork)}
                  alt=""
                  className="h-20 w-20 rounded-xl object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] opacity-80">
                  {pass.type === "organizer" ? "All-access pass" : "Season pass"}
                </p>
                <h1 className="mt-1 text-[22px] font-semibold">{pass.name || "Access Pass"}</h1>
                {pass.checkInCode && (
                  <p className="mt-1 text-[13px] opacity-80">Pass #{pass.checkInCode}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-4 text-[13px]">
                  <div>
                    <div className="opacity-70">Events remaining</div>
                    <div className="font-semibold">
                      {remaining} of {events.length}
                    </div>
                  </div>
                  {seatLabel(pass) !== "Ticket" && (
                    <div>
                      <div className="opacity-70">Seat</div>
                      <div className="font-semibold">{seatLabel(pass)}</div>
                    </div>
                  )}
                </div>
              </div>
              {pass.checkInCode && (
                <button
                  type="button"
                  className="rounded-xl border border-white/20 bg-white/10 p-2"
                  onClick={() => setShowQr(true)}
                  aria-label="Show QR"
                >
                  <QRCodeSVG
                    value={String(pass.checkInCode)}
                    size={56}
                    bgColor={pass.backgroundColor || "#0a2747"}
                    fgColor={pass.fontColor || "#ffffff"}
                  />
                </button>
              )}
            </div>
          </div>

          {next && (
            <div className="mt-8">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#9DA2B3]">
                Next up
              </h2>
              <div className={`${cardCls} mt-3 flex items-center gap-4 p-4`}>
                <DateChip month={eventChip(next).m} day={eventChip(next).d} variant="navy" />
                <div className="min-w-0">
                  <p className="font-semibold">{next.name}</p>
                  <p className="mt-0.5 text-[13px] text-[#9DA2B3]">{eventWhenLabel(next)}</p>
                </div>
              </div>
            </div>
          )}

          {events.length > 0 && (
            <div className="mt-8">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#9DA2B3]">
                All events
              </h2>
              <div className="mt-3 space-y-2">
                {events.map((ev) => (
                  <div
                    key={ev.uuid}
                    className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold">{ev.name}</p>
                      <p className="text-[12px] text-[#9DA2B3]">{eventWhenLabel(ev)}</p>
                    </div>
                    <Pill size="sm" variant={ev.status === "complete" ? "neutral" : "success"}>
                      {ev.status === "complete" ? "Attended" : "Upcoming"}
                    </Pill>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {isIos() && (
              <button type="button" className={chipBtnSmCls} onClick={() => void addApple()}>
                Apple Wallet
              </button>
            )}
            {isAndroid() && (
              <button type="button" className={chipBtnSmCls} onClick={() => void addGoogle()}>
                Google Wallet
              </button>
            )}
            {pass.checkInCode && (
              <button type="button" className={chipBtnSmCls} onClick={() => setShowQr(true)}>
                Show QR
              </button>
            )}
          </div>
        </div>
      )}

      {showQr && pass?.checkInCode && (
        <Modal title={pass.name || "Access Pass"} onClose={() => setShowQr(false)}>
          <div className="mt-6 flex flex-col items-center text-center">
            <div className="rounded-2xl bg-white p-4">
              <QRCodeSVG value={String(pass.checkInCode)} size={200} />
            </div>
            <p className="mt-4 text-[14px] text-[#9DA2B3]">
              Show this code at entry for any included event.
            </p>
            <Button className="mt-6 w-full" onClick={() => setShowQr(false)}>
              Close
            </Button>
          </div>
        </Modal>
      )}

      {walletError && (
        <Modal title="Wallet" onClose={() => setWalletError(null)}>
          <p className="mt-4 text-[14px] text-[#BCBFCC]">{walletError}</p>
          <Button className="mt-6 w-full" onClick={() => setWalletError(null)}>
            OK
          </Button>
        </Modal>
      )}
    </AppShell>
  );
}
