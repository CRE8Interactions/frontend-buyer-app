import { redirect } from "next/navigation";

/** Legacy demo buy URL — send shoppers to browse. Real purchase is `/e/[slug]/[shortcode]/`. */
export default function EventSlugRedirect() {
  redirect("/browse/");
}
