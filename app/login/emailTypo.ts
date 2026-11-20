/* Offline typo check for the common mail providers ("gmial.com" -> "gmail.com", "gmail.con" -> "gmail.com"). Instant, free, no request.
   Advice only: the emailed code is what proves an address is real. */
const DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "aol.com", "me.com", "msn.com", "live.com", "comcast.net", "proton.me", "protonmail.com"];

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

/** the corrected address, or null when the domain is fine or nothing is close enough */
export function suggestEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const user = email.slice(0, at);
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain || DOMAINS.includes(domain)) return null;
  // still typing: "gmail.co" or "gma" is on its way to a real domain, so say nothing yet
  if (DOMAINS.some((d) => d.startsWith(domain))) return null;
  let best: string | null = null;
  let bestD = 3;
  for (const d of DOMAINS) {
    const dist = distance(domain, d);
    if (dist < bestD && dist <= (d.length <= 7 ? 1 : 2)) { best = d; bestD = dist; }
  }
  return best ? `${user}@${best}` : null;
}

/** Domains to offer once an "@" is typed: everything that still fits what is typed after it, most common first. */
export function completeDomains(email: string, max = 4): string[] {
  const at = email.lastIndexOf("@");
  if (at < 1) return [];
  const typed = email.slice(at + 1).trim().toLowerCase();
  return DOMAINS.filter((d) => d !== typed && d.startsWith(typed)).slice(0, max);
}
