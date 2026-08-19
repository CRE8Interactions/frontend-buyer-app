import { cookies } from "next/headers";
import RouteLoader from "@/components/molecules/RouteLoader";
import {
  getLoaderBrandingFromCookieValue,
  LOADER_BRANDING_COOKIE,
} from "@/lib/orgBrandingCache";

/** Server loading UI that reads the branding cookie — no sessionStorage delay. */
export default async function ServerRouteLoader() {
  const store = await cookies();
  const lastCookie = getLoaderBrandingFromCookieValue(
    store.get(LOADER_BRANDING_COOKIE)?.value,
  );
  return <RouteLoader lastCookie={lastCookie} />;
}
