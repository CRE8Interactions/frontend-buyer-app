import BrandLoader from "@/components/molecules/BrandLoader";

/** Shown while a route segment streams in (Next.js Suspense) — the app-launch loader. */
export default function Loading() {
  return <BrandLoader message="Loading your tickets" />;
}
