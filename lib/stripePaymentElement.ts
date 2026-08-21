/**
 * Shared Stripe Payment Element billing + appearance.
 * Country + ZIP/postal come from Stripe (auto). Street, city, and state stay on
 * `auto` as well: Stripe hides them on the card form, and marking them `never`
 * would require passing those values in `confirmPayment`, which we never collect.
 */

export const STRIPE_PAYMENT_ELEMENT_FONTS = [
  {
    cssSrc:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
  },
];

export const paymentElementBillingFields = {
  billingDetails: {
    address: {
      country: "auto" as const,
      postalCode: "auto" as const,
    },
  },
};

/** Same as original Payment.js wallets={true}: leave wallets on. */
export const paymentElementWallets = {
  applePay: "auto" as const,
  googlePay: "auto" as const,
  link: "auto" as const,
};

/** Stripe's logo variables take "light" | "dark", not a color value. */
function logoVariantOn(color: string): "light" | "dark" {
  const raw = color.replace("#", "").trim();
  const hex =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (hex.length !== 6) return "light";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "light" : "dark";
}

export function stripePaymentElementAppearance(
  accent: string,
  onPrimary = "#ffffff",
) {
  return {
    theme: "flat" as const,
    labels: "above" as const,
    inputs: "spaced" as const,
    variables: {
      fontFamily: "Inter, system-ui, sans-serif",
      fontSizeBase: "15px",
      borderRadius: "10px",
      colorPrimary: accent,
      colorBackground: "#ffffff",
      colorText: "#051B35",
      colorTextSecondary: "#6e7180",
      colorDanger: "#dc2626",
      gridRowSpacing: "20px",
      gridColumnSpacing: "12px",
      labelSpacing: "8px",
      spacingUnit: "5px",
      tabIconSelectedColor: onPrimary,
      tabLogoSelectedColor: logoVariantOn(onPrimary),
      tabSpacing: "6px",
    },
    rules: {
      ".Input": {
        boxShadow: "0px 0px 0px 2px #E6E8EC",
        paddingTop: "12.25px",
        paddingBottom: "12.25px",
        paddingLeft: "14.875px",
        paddingRight: "14.875px",
      },
      ".Input:focus": {
        outline: "0",
        boxShadow: "0px 0px 0px 2px var(--colorPrimary)",
      },
      ".Tab": {
        border: "none",
        boxShadow: "0px 0px 0px 2px #E6E8EC",
        padding: "10px 8px",
      },
      ".TabLabel": {
        fontSize: "13px",
        lineHeight: "1.25",
      },
      ".Tab--selected, .Tab--selected:focus, .Tab--selected:hover": {
        border: "none",
        backgroundColor: "var(--colorPrimary)",
        color: onPrimary,
        boxShadow: "0px 0px 0px 2px var(--colorPrimary)",
      },
      ".TabLabel--selected": {
        color: onPrimary,
      },
      ".TabIcon--selected": {
        color: onPrimary,
      },
    },
  };
}

/** Card + wallets first, same order as package/ticket Payment Element tabs. */
export const checkoutPaymentMethodOrder = [
  "card",
  "apple_pay",
  "google_pay",
  "link",
];

export const checkoutPaymentElementOptions = {
  layout: { type: "tabs" as const },
  wallets: paymentElementWallets,
  fields: paymentElementBillingFields,
  paymentMethodOrder: checkoutPaymentMethodOrder,
};
