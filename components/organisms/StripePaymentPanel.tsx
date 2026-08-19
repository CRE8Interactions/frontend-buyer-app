"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import Spinner from "@/components/atoms/Spinner";
import { getCart, getPaymentIntent, processOrder } from "@/lib/api";
import { buildPaymentIntentRequest } from "@/lib/fundraisingCheckout";
import { getStoredCart } from "@/lib/cart";
import {
  STRIPE_PAYMENT_ELEMENT_FONTS,
  stripePaymentElementAppearance,
  ticketsPaymentElementOptions,
} from "@/lib/stripePaymentElement";

export type StripePaymentPanelHandle = {
  /** Confirm the Payment Element + process the order. Throws on failure. */
  confirm: () => Promise<void>;
};

type CartLike = {
  id: string | number;
  tickets?: unknown[];
  package?: { events?: Array<{ start?: string; organization?: OrgLike }>; organization?: OrgLike } | null;
  flex_pack?: { organization?: OrgLike } | null;
  access_pass_template?: {
    events?: Array<{ start?: string }>;
    organization?: OrgLike;
  } | null;
  event?: {
    organization?: OrgLike;
    [key: string]: unknown;
  } | null;
  total?: number;
  totalTax?: number;
  ipAddress?: string;
  [key: string]: unknown;
};

type OrgLike = {
  connected_account_id?: string;
  test_connected_account_id?: string;
};

type StripePaymentPanelProps = {
  /** Cart id from URL / parent. Falls back to sessionStorage.cart. */
  cartId?: string | null;
  accent?: string;
  onPrimary?: string;
  onReadyChange?: (ready: boolean) => void;
  onStatusChange?: (status: "loading" | "ready" | "error", message?: string) => void;
  onPaymentContextChange?: (
    ctx: { intentId: string; cart: CartLike } | null,
  ) => void;
  onSuccess?: () => void;
};

/** Dedupe cart+intent bootstrap (React Strict Mode remounts fire effects twice). */
const paymentBootstrapInflight = new Map<
  string,
  Promise<{
    cart: CartLike;
    clientSecret: string;
    intentId: string;
    stripe: Stripe;
  }>
>();

function resolveConnectedAccountId(cart: CartLike, event: CartLike["event"]) {
  const isProd =
    process.env.NEXT_PUBLIC_CLIENT_ENV === "production" ||
    process.env.NODE_ENV === "production";
  const org =
    (cart.flex_pack?.organization ||
      cart.access_pass_template?.organization ||
      cart.package?.organization ||
      cart.event?.organization ||
      event?.organization) as OrgLike | undefined;
  return isProd
    ? org?.connected_account_id || null
    : org?.test_connected_account_id || null;
}

function PaymentFormInner({
  intentId,
  cart,
  onReadyChange,
  confirmRef,
}: {
  intentId: string;
  cart: CartLike;
  onReadyChange?: (ready: boolean) => void;
  confirmRef: MutableRefObject<(() => Promise<void>) | null>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    onReadyChange?.(Boolean(complete && stripe && elements));
  }, [complete, stripe, elements, onReadyChange]);

  useEffect(() => {
    confirmRef.current = async () => {
      if (!stripe || !elements) {
        throw new Error("Payment form is still loading.");
      }
      const submitted = await elements.submit();
      if (submitted?.error) {
        throw new Error(
          submitted.error.message || "Unable to complete purchase. Please try again.",
        );
      }
      await processOrder({ cart, paymentIntentId: intentId });
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: "if_required",
      });
      if (error) {
        throw new Error(error.message || "Card declined");
      }
      sessionStorage.setItem("order", JSON.stringify({ id: cart.id }));
    };
    return () => {
      confirmRef.current = null;
    };
  }, [stripe, elements, cart, intentId, confirmRef]);

  return (
    <PaymentElement
      onChange={(e) => setComplete(Boolean(e.complete))}
      options={ticketsPaymentElementOptions}
    />
  );
}

const StripePaymentPanel = forwardRef<
  StripePaymentPanelHandle,
  StripePaymentPanelProps
>(function StripePaymentPanel(
  { cartId: cartIdProp, accent = "#8c0b42", onPrimary = "#ffffff", onReadyChange, onStatusChange, onPaymentContextChange, onSuccess },
  ref,
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [intentId, setIntentId] = useState("");
  const [cart, setCart] = useState<CartLike | null>(null);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const confirmInnerRef = useRef<(() => Promise<void>) | null>(null);
  const onReadyChangeRef = useRef(onReadyChange);
  const onStatusChangeRef = useRef(onStatusChange);
  const onPaymentContextChangeRef = useRef(onPaymentContextChange);
  const onSuccessRef = useRef(onSuccess);
  onReadyChangeRef.current = onReadyChange;
  onStatusChangeRef.current = onStatusChange;
  onPaymentContextChangeRef.current = onPaymentContextChange;
  onSuccessRef.current = onSuccess;

  const appearance = useMemo(
    () => stripePaymentElementAppearance(accent, onPrimary),
    [accent, onPrimary],
  );

  const elementsOptions = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance,
            fonts: STRIPE_PAYMENT_ELEMENT_FONTS,
            loader: "always" as const,
          }
        : undefined,
    [clientSecret, appearance],
  );

  useImperativeHandle(
    ref,
    () => ({
      confirm: async () => {
        if (!confirmInnerRef.current) {
          throw new Error(
            error || "Stripe is not ready. Add tickets to create a cart first.",
          );
        }
        await confirmInnerRef.current();
        onSuccessRef.current?.();
      },
    }),
    [error],
  );

  useEffect(() => {
    let cancelled = false;
    const cartId = cartIdProp || getStoredCart()?.cartId || null;

    const bootstrap = async () => {
      setLoading(true);
      setError("");
      onStatusChangeRef.current?.("loading");
      onReadyChangeRef.current?.(false);
      onPaymentContextChangeRef.current?.(null);

      if (!cartId) {
        const msg =
          "No cart found. Hold tickets with Checkout first so a cart is created.";
        if (!cancelled) {
          setError(msg);
          onStatusChangeRef.current?.("error", msg);
          setLoading(false);
        }
        return;
      }

      try {
        let pending = paymentBootstrapInflight.get(cartId);
        if (!pending) {
          pending = (async () => {
            const res = await getCart(String(cartId));
            const cartData = res.data as CartLike | null;
            if (!cartData?.id) {
              throw new Error("Cart not found. Select tickets again.");
            }

            const eventData = cartData.package
              ? ([...(cartData.package.events || [])].sort((a, b) =>
                  String(a.start || "").localeCompare(String(b.start || "")),
                )[0] as CartLike["event"])
              : cartData.access_pass_template
                ? ([...(cartData.access_pass_template.events || [])].sort(
                    (a, b) =>
                      String(a.start || "").localeCompare(String(b.start || "")),
                  )[0] as CartLike["event"])
                : cartData.event;

            if (
              !cartData.flex_pack &&
              !cartData.access_pass_template &&
              !eventData
            ) {
              throw new Error("Unable to start payment for this cart.");
            }

            const request = buildPaymentIntentRequest(
              cartData as never,
              eventData,
              null,
            );
            const intentRes = await getPaymentIntent(request);
            const secret = intentRes.data?.client_secret as string | undefined;
            const id = intentRes.data?.id as string | undefined;
            if (!secret || !id) {
              throw new Error("Payment session could not be created.");
            }

            const isDestinationCharge = Boolean(
              intentRes.data?.transfer_data?.destination,
            );
            const connectedAccountId = resolveConnectedAccountId(
              cartData,
              eventData,
            );
            const key = process.env.NEXT_PUBLIC_STRIPE_KEY || "";
            if (!key) {
              throw new Error("Missing NEXT_PUBLIC_STRIPE_KEY.");
            }
            if (key.startsWith("sk_")) {
              throw new Error(
                "NEXT_PUBLIC_STRIPE_KEY is a secret key (sk_…). Use your publishable key (pk_test_… or pk_live_…) instead, then restart the dev server.",
              );
            }
            if (!key.startsWith("pk_")) {
              throw new Error(
                "NEXT_PUBLIC_STRIPE_KEY must start with pk_test_ or pk_live_.",
              );
            }
            const stripeObj =
              !isDestinationCharge && connectedAccountId
                ? await loadStripe(key, { stripeAccount: connectedAccountId })
                : await loadStripe(key);
            if (!stripeObj) {
              throw new Error(
                "Stripe failed to initialize. Check that NEXT_PUBLIC_STRIPE_KEY is a valid publishable key.",
              );
            }

            return {
              cart: cartData,
              clientSecret: secret,
              intentId: id,
              stripe: stripeObj,
            };
          })().finally(() => {
            // Keep successful bootstraps briefly so Strict Mode remounts reuse them;
            // drop failed ones immediately so retry can create a fresh intent.
            const current = paymentBootstrapInflight.get(cartId);
            void current?.then(
              () => {
                window.setTimeout(() => {
                  if (paymentBootstrapInflight.get(cartId) === current) {
                    paymentBootstrapInflight.delete(cartId);
                  }
                }, 5000);
              },
              () => {
                paymentBootstrapInflight.delete(cartId);
              },
            );
          });
          paymentBootstrapInflight.set(cartId, pending);
        }

        const result = await pending;
        if (cancelled) return;

        setCart(result.cart);
        setClientSecret(result.clientSecret);
        setIntentId(result.intentId);
        setStripe(result.stripe);
        onPaymentContextChangeRef.current?.({
          intentId: result.intentId,
          cart: result.cart,
        });
        onStatusChangeRef.current?.("ready");
      } catch (err: unknown) {
        if (cancelled) return;
        onPaymentContextChangeRef.current?.(null);
        const msg =
          (err as { response?: { data?: { error?: { message?: string } } } })
            ?.response?.data?.error?.message ||
          (err as Error)?.message ||
          "Unable to load Stripe payment form.";
        setError(msg);
        onStatusChangeRef.current?.("error", msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [cartIdProp]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "28px 0" }}>
        <Spinner />
      </div>
    );
  }

  if (error || !clientSecret || !stripe || !elementsOptions || !cart) {
    const cartHint =
      /no cart|cart not found|cartId/i.test(error || "") || !cartIdProp;
    return (
      <div
        style={{
          border: "1px solid rgba(220,38,38,0.25)",
          background: "#fef2f2",
          color: "#991b1b",
          borderRadius: 12,
          padding: "14px 16px",
          fontSize: 14,
          lineHeight: 1.45,
        }}
      >
        {error || "Payment form unavailable."}
        {cartHint && /no cart|cart not found/i.test(error || "") ? (
          <div style={{ marginTop: 10, fontSize: 13, color: "#7f1d1d" }}>
            Hold tickets with Checkout first so a Strapi cart is created.
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Elements key={clientSecret} stripe={stripe} options={elementsOptions}>
      <PaymentFormInner
        intentId={intentId}
        cart={cart}
        onReadyChange={onReadyChange}
        confirmRef={confirmInnerRef}
      />
    </Elements>
  );
});

export default StripePaymentPanel;
