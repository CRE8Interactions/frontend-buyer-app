import { getVenues } from "@/lib/api";
import { imageUrl } from "@/lib/helpers";

type Img = Parameters<typeof imageUrl>[0];
type ApiVenue = { name?: string; slug?: string; image?: Img | Img[] };

/* Each venue's own picture, from the venues endpoint (the one the venue information uses; the API sends it as a list, so the first is taken).
   Keyed by the venue's slug and by its lower-cased name, so a page that only has the name can find it. Venues with no picture are left out. */
export async function loadVenuePictures(): Promise<Record<string, string>> {
  const res = await getVenues();
  const d = res.data as ApiVenue[] | { data?: ApiVenue[] } | undefined;
  const list = Array.isArray(d) ? d : d?.data ?? [];
  const out: Record<string, string> = {};
  for (const v of list) {
    const src = imageUrl(Array.isArray(v.image) ? v.image[0] : v.image, "");
    if (!src) continue;
    if (v.slug) out[v.slug.toLowerCase()] = src;
    if (v.name) out[v.name.trim().toLowerCase()] = src;
  }
  return out;
}
