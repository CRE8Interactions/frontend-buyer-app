/** Caption under every tenant loader. Never use Blocktickets in this line. */
export const LOADER_MESSAGE = "loading tickets";
export const CHECKOUT_LOADER_MESSAGE = "getting payment ready";
export const CHECKOUT_SUCCESS_LOADER_MESSAGE = "retrieving payment details";
export const GROUP_LOADER_MESSAGE = "loading group";
export const FUNDRAISER_LOADER_MESSAGE = "loading fundraiser";
export const MENU_LOADER_MESSAGE = "loading menu";

export function loaderMessageForPath(pathname = "") {
  const path = (pathname.split("?")[0] || "").replace(/\/+$/, "") || "/";
  if (
    path === "/checkout/success" ||
    path.startsWith("/checkout/success/")
  ) {
    return CHECKOUT_SUCCESS_LOADER_MESSAGE;
  }
  if (path === "/checkout" || path.startsWith("/checkout/")) {
    return CHECKOUT_LOADER_MESSAGE;
  }
  if (path === "/group" || path.startsWith("/group/")) {
    return GROUP_LOADER_MESSAGE;
  }
  if (path === "/fundraise" || path.startsWith("/fundraise/")) {
    return FUNDRAISER_LOADER_MESSAGE;
  }
  if (path === "/menu" || path.startsWith("/menu/")) {
    return MENU_LOADER_MESSAGE;
  }
  return LOADER_MESSAGE;
}
