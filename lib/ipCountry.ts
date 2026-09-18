function isCountryCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z]{2}$/.test(value);
}

/** IPData country for shopper defaults. Missing key / failed lookup → null. */
export async function fetchIpCountry(signal?: AbortSignal) {
  const key = process.env.NEXT_PUBLIC_IP_DATA_API_KEY;
  if (!key) return null;
  const res = await fetch(
    `https://api.ipdata.co?api-key=${encodeURIComponent(key)}`,
    { signal },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { country_code?: string } | null;
  return isCountryCode(data?.country_code)
    ? data.country_code.toUpperCase()
    : null;
}
