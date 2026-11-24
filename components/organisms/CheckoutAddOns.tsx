"use client";

import { useEffect, useState } from "react";
import AddonPickupDetails from "@/components/molecules/AddonPickupDetails";
import Spinner from "@/components/atoms/Spinner";
import {
  addonQuantityFor,
  firstAddonImageUrl,
  nextAddonQuantityDown,
  nextAddonQuantityUp,
  type AddonCartItem,
  type AddonProduct,
  type AddonSelection,
} from "@/lib/addonCatalog";
import { hasAddonPickupDetails } from "@/lib/addonPickup";
import { formatCurrency } from "@/lib/helpers";

export default function CheckoutAddOns({
  products = [],
  items = [],
  disabled = false,
  onChange,
  onSkip,
  showSkip = true,
}: {
  products?: AddonProduct[];
  items?: AddonCartItem[];
  disabled?: boolean;
  onChange: (selection: AddonSelection) => Promise<void> | void;
  onSkip?: () => void;
  showSkip?: boolean;
}) {
  const [pending, setPending] = useState("");

  if (!products.length) return null;

  const selectedPickup = products.filter((product) => {
    if (!hasAddonPickupDetails(product)) return false;
    const variants = product.variants?.length ? product.variants : [null];
    return variants.some(
      (variant) => addonQuantityFor(items, product.uuid, variant?.uuid || null) > 0,
    );
  });

  const change = async (
    product: AddonProduct,
    variantUuid: string | null,
    quantity: number,
  ) => {
    const key = `${product.uuid}:${variantUuid || ""}`;
    setPending(key);
    try {
      await onChange({
        productUuid: product.uuid,
        variantUuid,
        quantity,
      });
    } finally {
      setPending("");
    }
  };

  return (
    <section aria-labelledby="addon-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="addon-heading" className="text-[18px] font-semibold tracking-[-0.02em]">
          Add-ons
        </h2>
        {showSkip ? (
          <button
            type="button"
            className="text-[14px] font-semibold text-[#3b6fd8] disabled:opacity-50"
            onClick={onSkip}
            disabled={disabled}
          >
            Skip Add-Ons
          </button>
        ) : null}
      </div>
      {selectedPickup.length > 0 ? (
        <aside
          aria-label="Pickup reminders for selected add-ons"
          className="rounded-[14px] bg-[#f7f8fc] p-4"
        >
          <p className="mb-2 text-[14px] font-semibold">
            Pickup details for your order
          </p>
          {selectedPickup.map((product) => (
            <div key={product.uuid} className="mt-2">
              <p className="mb-1 text-[14px] font-semibold">{product.name}</p>
              <AddonPickupDetails product={product} />
            </div>
          ))}
        </aside>
      ) : null}
      <div className="flex flex-col gap-3">
        {products.map((product) => (
          <ProductCard
            key={product.uuid}
            product={product}
            items={items}
            disabled={disabled}
            pending={pending}
            onChange={change}
          />
        ))}
      </div>
    </section>
  );
}

function ProductCard({
  product,
  items,
  disabled,
  pending,
  onChange,
}: {
  product: AddonProduct;
  items: AddonCartItem[];
  disabled: boolean;
  pending: string;
  onChange: (
    product: AddonProduct,
    variantUuid: string | null,
    quantity: number,
  ) => Promise<void>;
}) {
  const variants = product.variants?.length ? product.variants : [null];
  const [variantUuid, setVariantUuid] = useState(variants[0]?.uuid || null);
  const variant =
    product.variants?.find((entry) => entry.uuid === variantUuid) || null;
  const price = variant ? variant.price : product.basePrice;
  const available = variant ? variant.available : product.available;
  const quantity = addonQuantityFor(items, product.uuid, variant?.uuid || null);
  const minQty = Math.max(0, Number(product.minQuantity) || 0);
  const soldOut = available === 0;
  const lineKey = `${product.uuid}:${variant?.uuid || ""}`;
  const busy = pending === lineKey;
  const imageUrl = firstAddonImageUrl(product.imageUrls);

  useEffect(() => {
    if (!variantUuid && variants[0]?.uuid) setVariantUuid(variants[0].uuid || null);
  }, [variantUuid, variants]);

  return (
    <article className="rounded-[14px] border border-[rgba(5,27,53,0.08)] p-4">
      <div className="flex gap-3">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold">{product.name}</h3>
          {product.description ? (
            <p className="mt-1 text-[13px] text-[#6e7180]">{product.description}</p>
          ) : null}
          <p className="mt-1 text-[14px] font-semibold tabular-nums">
            {formatCurrency(price)}
          </p>
          {soldOut ? (
            <p className="mt-1 text-[13px] text-[var(--bt-error,#c0374a)]">Sold out</p>
          ) : null}
          {minQty > 1 ? (
            <p className="mt-1 text-[12px] text-[#6e7180]">
              Minimum {minQty} per order
            </p>
          ) : null}
          {hasAddonPickupDetails(product) ? (
            <div className="mt-2">
              <AddonPickupDetails product={product} />
            </div>
          ) : null}
          {product.variants?.length ? (
            <label className="mt-3 block">
              <span className="sr-only">{product.name} options</span>
              <select
                aria-label={`${product.name} options`}
                className="h-11 w-full rounded-full border border-[rgba(5,27,53,0.16)] bg-white px-4 text-[14px]"
                value={variantUuid || ""}
                disabled={disabled || busy}
                onChange={(event) => setVariantUuid(event.target.value)}
              >
                {product.variants.map((entry) => (
                  <option key={entry.uuid} value={entry.uuid || ""}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <div
          className="flex items-center gap-2"
          aria-busy={busy}
          aria-label={busy ? `Updating ${product.name}` : undefined}
        >
          <button
            type="button"
            aria-label={`Decrease ${product.name}`}
            disabled={disabled || busy || quantity <= 0}
            className="h-10 w-10 rounded-full border border-[rgba(5,27,53,0.16)] text-[18px] disabled:opacity-40"
            onClick={() =>
              void onChange(
                product,
                variant?.uuid || null,
                nextAddonQuantityDown(quantity, minQty),
              )
            }
          >
            −
          </button>
          <span className="min-w-6 text-center text-[15px] tabular-nums" aria-live="polite">
            {busy ? <Spinner /> : quantity}
          </span>
          <button
            type="button"
            aria-label={`Increase ${product.name}`}
            disabled={
              disabled ||
              busy ||
              soldOut ||
              (available != null && quantity >= available) ||
              Boolean(product.maxQuantity && quantity >= product.maxQuantity)
            }
            className="h-10 w-10 rounded-full border border-[rgba(5,27,53,0.16)] text-[18px] disabled:opacity-40"
            onClick={() =>
              void onChange(
                product,
                variant?.uuid || null,
                nextAddonQuantityUp(quantity, minQty),
              )
            }
          >
            +
          </button>
        </div>
      </div>
    </article>
  );
}
