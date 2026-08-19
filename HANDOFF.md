# Blocktickets Next.js app — developer handoff

Next.js 16 (App Router) · Tailwind CSS v4 · React 19 · TypeScript.
Fan app + marketing site. Design rules: `DESIGN-SYSTEM.md`.

## Run it

```bash
cp .env.example .env.local   # set NEXT_PUBLIC_API + NEXT_PUBLIC_STRIPE_KEY
npm install
npm run dev                  # http://localhost:3000
npm run build
```

## What's in here

**Marketing (unchanged):** `/`, `/our-story`, `/case-study/[slug]`, `/design-system`

**Fan app (ported from CRA frontend):**
- Auth: `/login` (real OTP via Strapi)
- Discovery: `/browse`, `/search`, `/venue/[slug]`, `/[slug]` org storefronts
- Purchase: `/e/[slug]/[shortcode]`, `/e/.../tickets`, `/checkout`, success
- Packages/flex: under org + venue paths
- Wallet: `/my-events`, transfers, listings, settings (+ subpages)
- Special: fundraise, group, F&B menu, legal pages

## Env

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API` | Strapi API base (include `/api`) |
| `NEXT_PUBLIC_STRIPE_KEY` | Stripe publishable key |
| `NEXT_PUBLIC_CLIENT_ENV` | optional: `production` / `development` |
| `NEXT_PUBLIC_IP_DATA_API_KEY` | optional phone geo default |
| `NEXT_PUBLIC_GROWTHBOOK_API_HOST` | GrowthBook CDN host |
| `NEXT_PUBLIC_GROWTHBOOK_API_KEY` | GrowthBook client SDK key |
| `NEXT_PUBLIC_INTERCOM_APP_ID` | Intercom workspace app ID |
| `NEXT_PUBLIC_TRACKING_DEBUG` | optional: `true` for tracking console logs |

Org-scoped pixels (GTM, Meta, TikTok, LinkedIn, Google Ads) come from Strapi organization fields — not env vars.

## Known gaps vs old CRA

- Package purchase opens seatmap selection (same flow as CRA), then carts selected seats
- Static export removed — deploy needs a Node server (`next start`) or compatible host
- Section-cover venues (NMSU/Aggie) use click-to-zoom; some venue-specific seam blending from the CRA map is simplified
