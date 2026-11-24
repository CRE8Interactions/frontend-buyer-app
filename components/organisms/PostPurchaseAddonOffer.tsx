"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CheckoutAddOns from "@/components/organisms/CheckoutAddOns";
import BrandedActionButton from "@/components/atoms/BrandedActionButton";
import {
  addonApiErrorMessage,
  normalizeAddonCatalogPayload,
  resolveOrderUUID,
  type AddonProduct,
  type AddonSelection,
} from "@/lib/addonCatalog";
import {
  createPostPurchaseAddonCheckout,
  getOrderAvailableAddons,
} from "@/lib/api";

type OfferOrder = {
  uuid?: string | null;
  orderUuid?: string | null;
  order_uuid?: string | null;
  flex_pack?: unknown;
  access_pass_template?: unknown;
};

export default function PostPurchaseAddonOffer({
  order,
  title = "Add more for this event",
  subtitle = "Complete a separate payment for parking, merchandise, or other add-ons.",
}: {
  order?: OfferOrder | null;
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const orderUUID = resolveOrderUUID(order);
  const blocked = Boolean(order?.flex_pack || order?.access_pass_template);
  const [products, setProducts] = useState<AddonProduct[]>([]);
  const [items, setItems] = useState<AddonSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderUUID || blocked) {
      setProducts([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    getOrderAvailableAddons(orderUUID)
      .then((res) => {
        if (!cancelled) {
          setProducts(normalizeAddonCatalogPayload(res.data) as AddonProduct[]);
        }
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderUUID, blocked]);

  const hasSelection = useMemo(
    () => items.some((line) => Number(line.quantity) > 0),
    [items],
  );

  if (loading || blocked || !orderUUID || !products.length) return null;

  return (
    <section className="flex flex-col gap-4 rounded-[18px] border border-[rgba(5,27,53,0.08)] bg-white p-5">
      <div>
        <h2 className="text-[18px] font-semibold tracking-[-0.02em]">{title}</h2>
        <p className="mt-1 text-[13px] text-[#6e7180]">{subtitle}</p>
      </div>
      {error ? (
        <p role="alert" className="text-[14px] text-[var(--bt-error,#c0374a)]">
          {error}
        </p>
      ) : null}
      <CheckoutAddOns
        products={products}
        items={items}
        disabled={submitting}
        showSkip={false}
        onChange={async ({ productUuid, variantUuid, quantity }) => {
          setItems((current) => {
            const rest = current.filter(
              (line) =>
                !(
                  line.productUuid === productUuid &&
                  (line.variantUuid || null) === (variantUuid || null)
                ),
            );
            if (quantity > 0) {
              rest.push({ productUuid, variantUuid: variantUuid || null, quantity });
            }
            return rest;
          });
        }}
      />
      <BrandedActionButton
        type="button"
        disabled={!hasSelection || submitting}
        loading={submitting}
        loadingLabel="Preparing checkout…"
        onClick={async () => {
          if (!orderUUID || !hasSelection) return;
          setError("");
          setSubmitting(true);
          try {
            const res = await createPostPurchaseAddonCheckout(orderUUID, { items });
            const cartId = res.data?.cartId;
            if (!cartId) throw new Error("Checkout could not be started");
            router.push(`/checkout/post-purchase?cartId=${cartId}`);
          } catch (err) {
            setError(
              addonApiErrorMessage(err, "Add-ons could not be prepared for checkout."),
            );
          } finally {
            setSubmitting(false);
          }
        }}
      >
        Continue to payment
      </BrandedActionButton>
    </section>
  );
}
