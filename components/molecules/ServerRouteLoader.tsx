import { cookies } from "next/headers";
import RouteLoader from "@/components/molecules/RouteLoader";
import {
  getLoaderBrandingFromCookieValue,
  LOADER_BRANDING_COOKIE,
  WALLET_ENTRY_COOKIE,
} from "@/lib/orgBrandingCache";

/** Server loading UI that reads the branding cookie — no sessionStorage delay. */
export default async function ServerRouteLoader() {
  const store = await cookies();
  const lastCookie = getLoaderBrandingFromCookieValue(
    store.get(LOADER_BRANDING_COOKIE)?.value,
  );
  const walletEntryFromTenant =
    store.get(WALLET_ENTRY_COOKIE)?.value === "1";
  return (
    <RouteLoader
      lastCookie={lastCookie}
      walletEntryFromTenant={walletEntryFromTenant}
    />
  );
}
