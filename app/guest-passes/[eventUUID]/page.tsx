"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import AppShell from "@/components/templates/AppShell";
import BackChip from "@/components/molecules/BackChip";
import Modal from "@/components/molecules/Modal";
import EmptyState from "@/components/molecules/EmptyState";
import PageLoader from "@/components/molecules/PageLoader";
import { cardCls, chipBtnSmCls } from "@/components/molecules/Card";
import Button from "@/components/atoms/Button";
import { getGuestList } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  type EventLike,
  type TicketLike,
  eventImage,
  eventWhenLabel,
  seatLabel,
  unwrapList,
} from "@/lib/wallet";

type GuestList = {
  eventId?: string;
  event?: EventLike;
  guest_passes?: TicketLike[];
};

export default function GuestPassesPage() {
  const params = useParams<{ eventUUID: string }>();
  const { user, ready, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [guestList, setGuestList] = useState<GuestList | null>(null);
  const [active, setActive] = useState<TicketLike | null>(null);

  useEffect(() => {
    if (!ready || !isAuthenticated || !user?.phoneNumber) return;
    setLoading(true);
    getGuestList(encodeURIComponent(String(user.phoneNumber)))
      .then((res) => {
        const lists = unwrapList<GuestList>(res.data);
        const match = lists.find(
          (d) => d.eventId === params.eventUUID || d.event?.uuid === params.eventUUID,
        );
        setGuestList(match || null);
      })
      .catch((err) => {
        console.error(err);
        setGuestList(null);
      })
      .finally(() => setLoading(false));
  }, [ready, isAuthenticated, user?.phoneNumber, params.eventUUID]);

  const event = guestList?.event;
  const passes = guestList?.guest_passes || [];

  return (
    <AppShell requireAuth>
      <BackChip href="/my-events/" label="My events" />

      {loading ? (
        <PageLoader message="Loading guest passes…" label="Loading guest passes" className="mt-8 min-h-[30vh]" />
      ) : !guestList || !event ? (
        <div className="mt-8">
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" />
              </svg>
            }
          >
            Guest passes not found for this event.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-9 lg:flex-row lg:gap-12">
          <aside className="shrink-0 lg:w-[300px]">
            <div className="overflow-hidden rounded-2xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={eventImage(event)} alt="" className="aspect-square w-full object-cover" />
            </div>
            <h1 className="mt-5 text-[24px] font-semibold">{event.name}</h1>
            <p className="mt-2 text-[14px] text-[#9DA2B3]">{eventWhenLabel(event)}</p>
          </aside>

          <div className="min-w-0 flex-1">
            <h2 className="text-[24px] font-bold">
              {passes.length} Guest pass{passes.length === 1 ? "" : "es"}
            </h2>
            <div className="mt-6 space-y-3">
              {passes.map((pass, i) => (
                <div key={String(pass.id || pass.checkInCode || i)} className={`${cardCls} flex flex-wrap items-center justify-between gap-4 p-5`}>
                  <div>
                    <p className="font-semibold">{seatLabel(pass)}</p>
                    {pass.checkInCode && (
                      <p className="mt-1 text-[13px] text-[#9DA2B3]">Code {pass.checkInCode}</p>
                    )}
                  </div>
                  <button type="button" className={chipBtnSmCls} onClick={() => setActive(pass)}>
                    View pass
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {active && (
        <Modal title="Guest pass" onClose={() => setActive(null)}>
          <div className="mt-6 flex flex-col items-center text-center">
            {active.checkInCode ? (
              <div className="rounded-2xl bg-white p-4">
                <QRCodeSVG value={String(active.checkInCode)} size={200} />
              </div>
            ) : (
              <p className="text-[#9DA2B3]">QR unavailable</p>
            )}
            <p className="mt-4 font-semibold">{event?.name}</p>
            <p className="mt-1 text-[14px] text-[#9DA2B3]">{seatLabel(active)}</p>
            <Button className="mt-6 w-full" onClick={() => setActive(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
