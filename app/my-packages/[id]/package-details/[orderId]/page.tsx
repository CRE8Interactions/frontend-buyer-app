"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/templates/AppShell";
import BackChip from "@/components/molecules/BackChip";
import EmptyState from "@/components/molecules/EmptyState";
import PageLoader from "@/components/molecules/PageLoader";
import DateChip from "@/components/molecules/DateChip";
import LogoTile from "@/components/molecules/LogoTile";
import { cardCls } from "@/components/molecules/Card";
import Button from "@/components/atoms/Button";
import Pill from "@/components/atoms/Pill";
import {
  getAccessPassesByOrder,
  getMyPackage,
  getOrder,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { imageUrl } from "@/lib/helpers";
import {
  type AccessPassLike,
  type EventLike,
  type OrderLike,
  type TicketLike,
  eventChip,
  eventWhenLabel,
  unwrapList,
} from "@/lib/wallet";

type PackageEventRow = {
  event: EventLike;
  tickets: TicketLike[];
};

export default function PackageDetailsPage() {
  const params = useParams<{ id: string; orderId: string }>();
  const { ready, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pkg, setPkg] = useState<OrderLike["package"] | null>(null);
  const [rows, setRows] = useState<PackageEventRow[]>([]);
  const [accessPasses, setAccessPasses] = useState<AccessPassLike[]>([]);

  useEffect(() => {
    if (!ready || !isAuthenticated || !params.id || !params.orderId) return;
    setLoading(true);
    Promise.all([
      getMyPackage(params.id),
      getOrder(params.orderId),
      getAccessPassesByOrder(params.orderId),
    ])
      .then(([pkgRes, orderRes, passesRes]) => {
        const eventPackage = pkgRes.data as NonNullable<OrderLike["package"]>;
        const order = orderRes.data as OrderLike;
        setPkg(eventPackage);
        setAccessPasses(
          unwrapList<AccessPassLike>(
            (passesRes.data as { data?: unknown })?.data ?? passesRes.data,
          ),
        );
        setRows(
          (eventPackage?.events || []).map((event) => ({
            event,
            tickets: (order.tickets || []).filter(
              (t) => (t.eventUUID || t.eventId) === event.uuid,
            ),
          })),
        );
      })
      .catch((err) => {
        console.error(err);
        setPkg(null);
      })
      .finally(() => setLoading(false));
  }, [ready, isAuthenticated, params.id, params.orderId]);

  return (
    <AppShell requireAuth>
      <BackChip href="/my-events/" label="My events" />

      {loading ? (
        <PageLoader message="Loading package…" label="Loading package" className="mt-8 min-h-[30vh]" />
      ) : !pkg ? (
        <div className="mt-8">
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" />
              </svg>
            }
          >
            Package not found.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-6 max-w-[860px]">
          <div className={`${cardCls} flex flex-col gap-5 p-6 sm:flex-row sm:items-center`}>
            <LogoTile src={imageUrl(pkg.image)} />
            <div className="min-w-0 flex-1">
              <h1 className="text-[24px] font-semibold">{pkg.name}</h1>
              <p className="mt-1 text-[14px] text-[#9DA2B3]">
                {pkg.organization?.name || pkg.venue?.name || "Season package"}
              </p>
              <Pill className="mt-3">{rows.length} events</Pill>
            </div>
          </div>

          {accessPasses.length > 0 && (
            <div className="mt-10">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#9DA2B3]">
                Access passes
              </h2>
              <div className="mt-4 space-y-3">
                {accessPasses.map((pass) => (
                  <Link
                    key={pass.uuid}
                    href={`/my-events/access-passes/${pass.uuid}/`}
                    className={`${cardCls} flex items-center justify-between gap-4 p-5 transition-transform hover:-translate-y-0.5`}
                  >
                    <div>
                      <p className="font-semibold">{pass.name || "Access pass"}</p>
                      <p className="mt-1 text-[13px] text-[#9DA2B3]">
                        {pass.events?.length ?? 0} events included
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#9DA2B3]">
              Events &amp; tickets
            </h2>
            <div className="mt-4 space-y-3">
              {rows.map(({ event, tickets }) => {
                const chip = eventChip(event);
                return (
                  <Link
                    key={event.uuid}
                    href={`/event-details/${params.orderId}/`}
                    className={`${cardCls} flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5 sm:p-5`}
                  >
                    <DateChip month={chip.m} day={chip.d} variant="navy" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{event.name}</p>
                      <p className="mt-0.5 text-[13px] text-[#9DA2B3]">
                        {eventWhenLabel(event)}
                      </p>
                    </div>
                    <Pill size="sm" variant="neutral">
                      {tickets.length} tix
                    </Pill>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
