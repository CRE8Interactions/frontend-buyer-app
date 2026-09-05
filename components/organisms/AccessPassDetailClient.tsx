"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/templates/AppShell";
import ShopperFluidPage from "@/components/templates/ShopperFluidType";
import BackChip from "@/components/molecules/BackChip";
import EmptyState from "@/components/molecules/EmptyState";
import PageLoader from "@/components/molecules/PageLoader";
import { BrandedLoader } from "@/components/molecules/RouteLoader";
import { cardCls } from "@/components/molecules/Card";
import { ButtonBusyContents } from "@/components/atoms/BrandedActionButton";
import Button from "@/components/atoms/Button";
import { ArrowRight } from "@/components/atoms/icons";
import { getAccessPassTemplate, placeAccessPassIntoCart } from "@/lib/api";
import { useAuth, setLastKnown } from "@/lib/auth";
import {
  checkoutHref,
  rememberCheckoutReturnPath,
  setStoredCart,
} from "@/lib/cart";
import { getLoaderBranding } from "@/lib/orgBrandingCache";
import { beginRouteTransition } from "@/lib/routeTransition";
import {
  formatCurrency,
  getSingularOrPluralWord,
  imageUrl,
  type ApiImage,
} from "@/lib/helpers";

type AccessPassTemplate = {
  id: number | string;
  uuid?: string;
  name?: string;
  description?: string;
  price?: number;
  isSoldOut?: boolean;
  artwork?: ApiImage;
  events?: unknown[];
  venue?: { name?: string; slug?: string; timezone?: string };
  organization?: { name?: string; slug?: string };
};

/** Shared access pass detail + add-to-cart for venue (and org) routes. */
export default function AccessPassDetailClient({
  uuid,
  backHref,
}: {
  uuid: string;
  backHref: string;
}) {
  const { isAuthenticated, ready } = useAuth();
  const router = useRouter();
  const [accessPass, setAccessPass] = useState<AccessPassTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState(false);
  const [leavingForLogin, setLeavingForLogin] = useState(false);
  const leavingForLoginRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getAccessPassTemplate(uuid)
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        const template = Array.isArray(data) ? data[0] : data;
        setAccessPass((template as AccessPassTemplate) ?? null);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this access pass.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uuid]);

  const goLogin = useCallback(() => {
    if (leavingForLoginRef.current) return;
    leavingForLoginRef.current = true;
    setLeavingForLogin(true);
    const from = window.location.pathname + window.location.search;
    setLastKnown(from);
    // Soft navigation: the loader stays painted and the tab does not spin.
    router.replace(`/login/?from=${encodeURIComponent(from)}`);
  }, [router]);

  const buy = async () => {
    if (!accessPass) return;
    if (!ready) return;
    if (!isAuthenticated) {
      goLogin();
      return;
    }
    if (accessPass.isSoldOut) return;

    setBuying(true);
    setError("");
    try {
      const res = await placeAccessPassIntoCart(accessPass.id);
      const cartId =
        (res.data as { id?: string | number; cartId?: string | number })?.id ??
        (res.data as { cartId?: string | number })?.cartId;
      if (cartId != null) {
        rememberCheckoutReturnPath();
        setStoredCart(cartId, 1);
        const href = checkoutHref(cartId);
        beginRouteTransition(href);
        router.push(href);
        return;
      }
      setError("Cart could not be created. Please try again.");
    } catch {
      setError("Unable to add access pass to cart.");
    } finally {
      setBuying(false);
    }
  };

  const eventCount = accessPass?.events?.length || 0;

  if (leavingForLogin) {
    return (
      <BrandedLoader
        branding={getLoaderBranding(
          typeof window !== "undefined" ? window.location.pathname : "",
        )}
        fallback="blocktickets"
      />
    );
  }

  return (
    <AppShell>
      <ShopperFluidPage className="min-h-0">
      <div className="mx-auto max-w-[720px] pb-16">
        <BackChip href={backHref} />

        {loading ? (
          <PageLoader
            message="Loading access pass…"
            label="Loading access pass"
            className="mt-10 min-h-[30vh]"
          />
        ) : !accessPass ? (
          <div className="mt-10">
            <EmptyState
              icon={
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <rect x="3" y="5" width="18" height="14" rx="2.5" />
                  <path d="M3 10h18" />
                </svg>
              }
            >
              Access pass not found.
            </EmptyState>
          </div>
        ) : (
          <>
            <div
              className={`${cardCls} mt-7 flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:p-6`}
            >
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#06203c]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl(accessPass.artwork)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                {accessPass.organization?.name && (
                  <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9DA2B3]">
                    {accessPass.organization.name}
                  </p>
                )}
                <h1 className="mt-1 text-[36px] font-semibold tracking-[-0.02em]">
                  {accessPass.name}
                </h1>
                {accessPass.venue?.name && (
                  <p className="mt-1.5 text-[14px] text-[#BCBFCC]">
                    {accessPass.venue.name}
                  </p>
                )}
                {eventCount > 0 && (
                  <p className="mt-1 text-[13px] text-[#9DA2B3]">
                    Includes access to {eventCount}{" "}
                    {getSingularOrPluralWord(eventCount, "event")}
                  </p>
                )}
                {accessPass.description && (
                  <p className="mt-3 text-[14px] leading-relaxed text-[#9DA2B3]">
                    {accessPass.description}
                  </p>
                )}
              </div>
            </div>

            <div
              className={`${cardCls} mt-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6`}
            >
              <div>
                <p className="text-[14px] text-[#9DA2B3]">
                  Total{" "}
                  <span className="font-semibold text-white">
                    {formatCurrency(accessPass.price)}
                  </span>
                </p>
              </div>
              <Button
                onClick={buy}
                disabled={buying || accessPass.isSoldOut}
                aria-busy={buying || undefined}
                className="inline-flex w-full items-center justify-center gap-2.5 sm:w-auto disabled:opacity-40"
              >
                <ButtonBusyContents
                  loading={buying}
                  loadingLabel="Adding…"
                >
                  {accessPass.isSoldOut
                    ? "Sold out"
                    : isAuthenticated
                      ? "Checkout"
                      : "Log in to buy"}{" "}
                  {!accessPass.isSoldOut && <ArrowRight className="arrow" />}
                </ButtonBusyContents>
              </Button>
            </div>

            {error && (
              <p className="mt-4 text-[14px] text-[#f87171]" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </div>
      </ShopperFluidPage>
    </AppShell>
  );
}
