/** Caption under every tenant loader. Never use Blocktickets in this line. */
export const LOADER_MESSAGE = "loading tickets";
export const CHECKOUT_LOADER_MESSAGE = "getting payment ready";
export const CHECKOUT_SUCCESS_LOADER_MESSAGE = "retrieving payment details";

export function loaderMessageForPath(pathname = "") {
  const path = (pathname.split("?")[0] || "").replace(/\/+$/, "") || "/";
  if (
    path === "/checkout/checkout-success" ||
    path.startsWith("/checkout/checkout-success/")
  ) {
    return CHECKOUT_SUCCESS_LOADER_MESSAGE;
  }
  if (path === "/checkout" || path.startsWith("/checkout/")) {
    return CHECKOUT_LOADER_MESSAGE;
  }
  return LOADER_MESSAGE;
}
