# Blocktickets web design system

Rules for building anything on the Blocktickets marketing site or demo app.
These encode deliberate decisions — don't undo them casually.
Source of truth for brand: the Complete Brand Guidelines PDF.

---

## 1. Color

| Token | Hex | Use |
|---|---|---|
| Navy (field) | `#051B35` | Page background, button text on green. The brand is "centered on midnight/deep navy" — navy is the field, everything else is accent. |
| White | `#FFFFFF` / `text-white` | Headings, primary text, emphasis. |
| Green (accent) | `#A6E773` (hover `#b9ef93`) | **Accent only — see §2.** |
| Steel | `#BCBFCC` | Secondary text, icons, static links. |
| Space | `#9DA2B3` | Muted/body text, eyebrows, captions. |
| Graphite | `#6E7180` | Tertiary text, separators (`•`). |
| Electric blue | `#3874E0` | **Ambient glows only.** Never text, never borders, never fills. |
| Elevated surface | `#0a2747` | Cards on navy (app pages: `cardCls`). |
| Tile surface | `#06203c` | Image/logo tiles. |

**Never introduce a new color.** If a mock shows a color not in this table, map it
to the nearest token (this has burned us before — e.g. a one-off blue label).

## 2. The green rule (most important rule in this file)

Green means **"act here"** or **"this is the brand."** Nothing else.

Allowed: primary buttons/CTAs · the hero's signature line ("Block by Block.") ·
the rotating statement word · the block motif (BlockStack animation, square
block markers) · interactive/active states (hover, active tab, selected) ·
small micro-markers (bullet dots).

Not allowed: heading keyword highlights (use **white emphasis** instead) ·
eyebrows · icons · static link text (links are Steel at rest, green on hover) ·
borders/washes on regular cards · photo color grading.

Approximate budget: **one green moment per viewport.**

## 3. Typography

- Font: Inter (next/font), `-webkit-font-smoothing: antialiased`.
- `h1` hero: `clamp(40px,6.2vw,76px)`, semibold, `tracking -0.025em`.
- `.h2` section: `clamp(30px,4vw,48px)`, semibold, `tracking -0.025em`.
- `.eyebrow`: 12px, semibold, uppercase, `tracking 0.16–0.2em`, Space gray.
- `.lede`: `clamp(15px,1.4vw,18px)`, Space gray, `leading 1.6`.
- Emphasis inside body copy = `font-semibold text-white` spans (thesis lines),
  **not** color. Role/attribution lines: 12px uppercase tracked Space gray.
- JSX gotcha: a space after `</span>` can collapse — use `{" "}` or `{" · "}`.

## 4. Layout & section rhythm

- `.container-x`: max-width 1200px, 24px padding (40px at lg).
- Sections: `py-20 lg:py-24`, separated by `border-t border-white/10` hairlines.
- Ambient glow recipe (one per section, alternating sides):
  `<div className="pointer-events-none absolute -left-40 top-1/2 h-[440px] w-[440px] rounded-full bg-[#3874E0]/[0.12] blur-[150px]" />`
  Blue for most sections; green glow reserved for the statement + final CTA.
- **No `overflow-hidden` on sections containing sticky scroll-scrub content**
  (breaks `position: sticky`).
- Layout taste: contained, hierarchical compositions (cards, bentos, panels)
  over open/floating editorial text. Unequal weights beat rows of equals.

## 5. Hero system (all pages)

Every hero = photo + the same 4-layer stack, in order:
1. Navy wash: `rgba(5,27,53,0.38)` (≈0.34 if the photo is content, not backdrop)
2. Navy radial under the text: `radial-gradient(ellipse … rgba(5,27,53,0.42), transparent 72%)` — centered for centered text, shifted for left-aligned text
3. Top/bottom fade: `linear-gradient(to bottom, #051B35 0%, transparent 26%, transparent ~52%, #051B35 92%)` — melts the nav in at top, dissolves into the page at bottom
4. **No green tint. No border-b on the hero** (the fade is the transition).

Full-viewport heroes: `min-h-[calc(100svh-70px)]` + flex centering.
Each page gets its **own** photo — never reuse the homepage hero image.

## 6. Buttons & links

- `.btn-primary` — green bg, navy text. The main CTA everywhere.
- `.btn-outline` / chip buttons — `border-white/15 bg-white/[0.04]`, white text,
  `hover:bg-white/[0.1]`. Secondary actions.
- Inverse emphasis button (rare): `bg-white text-[#051B35]` (e.g. Transfer).
- Text links: Steel at rest → green on hover. Never green at rest.

## 7. Cards

- Marketing card: `rounded-[22px] border border-white/[0.08]` + subtle white
  gradient overlay; glow cards add a corner blur in **blue**.
- App card (`cardCls`): `rounded-2xl border border-white/12 bg-[#0a2747]`.
- Image/logo tile: `bg-[#06203c]` + green corner glow blur + centered logo.
- Date block: navy box, month in green caps, day large white.
- Equal-height pairs: let CSS grid stretch; verify heights match when editing.

## 8. Motion

- `Reveal` wraps section content (fade + rise on scroll; IO with geometry +
  timeout fallbacks). HMR can strip the `in` class in dev — full reload fixes;
  not a production issue.
- Animations must be: **coordinated** (sequenced state, not free-running CSS
  loops), **in-view only** (IntersectionObserver), **reduced-motion safe**
  (render final state). Reference: `BlockStack`.
- `RotatingWord`: ligatures off, `font-light`, reserved line height.

## 9. Icons

- All icons live in `components/icons.tsx` (24px grid, stroke `currentColor`).
- Tickets are always the `Ticket` icon. Never a diamond/placeholder shape.
- Icon chips: `bg-white/[0.06] text-[#BCBFCC]` (not green).

## 10. Component hierarchy (atomic design)

Components live in `components/` organized atoms → molecules → organisms →
templates; pages (`app/` routes) compose templates. Each tier has a barrel
(`@/components/atoms` etc.); direct file imports also fine. Non-UI code
(demo data/auth) lives in `lib/`.

**Atoms** (`components/atoms/`) — smallest brand-locked pieces:
`Button` (`.btn` system; `variant` primary/outline/ghost, `size` sm; renders
`<a>` when given `href`) · `Pill` (accent/success/warning/neutral, sm/md) ·
`Eyebrow` · `IconChip` · `BlockMarker` (green square motif) · `Glow` (ambient
orb; blue default, green reserved) · `Switch` (green when on) ·
`Input`/`Label` (+ `inputCls`/`labelCls`) · `Reveal` · `RotatingWord` ·
`icons.tsx` (24px grid, `currentColor`).

**Molecules** (`components/molecules/`) — small compositions:
`Section` (border-t + container + rhythm padding + glow slot; set
`overflowHidden={false}` around sticky scroll-scrub) · `SectionHeader`
(eyebrow + h2 + lede) · `FeatureCard` (bento w/ `aside`/`backdrop` slots) ·
`StatCard` · `CtaPanel` (closing CTA; green wash allowed) · `Modal` ·
`BackChip` · `DateChip` (glass/navy) · `LogoTile` · `EmptyState` ·
`FilterChip` (green active) · `ListingRow` (buy-flow listing; all-in price) ·
`SocialLinks` · `Card.tsx` (`cardCls` app card, `chipBtnCls`/`chipBtnSmCls`).

**Organisms** (`components/organisms/`) — full page regions:
`Nav` · `SeatMap` (interactive SVG ballpark; tonal price tiers, green =
selected; band clicks drive the listing filters) · `SiteFooter` (slim:
logo/socials/copyright + legal row) · `PageHero`
(photo + 4-layer stack, §5) · `LogoMarquee` · `Testimonials` (rotating,
photos) · `SwitchTimeline` + `PricingEngine` (sticky scroll-scrub; heights set
in JS px, not vh) · `BlockStack` · `WalletMenu` · `Previews` (unused mocks).

**Templates** (`components/templates/`) — page chrome:
`MarketingPage` (Nav + main + SiteFooter) · `AppShell` (app header/auth-guard)
· `WalletShell` (identity strip + section tabs).

**Pages** (`app/`) — routes compose templates + organisms; page-specific
compositions stay local to the route file.

`lib/`: `demoAuth.ts` (localStorage `bt-demo-user` — **not real auth**) ·
`demoData.ts` (all demo events/packages) · `walletSections.tsx` (single source
of wallet nav sections).

## 11. Don't bring these back

Rejected in design review — don't reintroduce: light mode · multicolor card
glows (cyan/orange/pink) · green heading-keyword highlights everywhere ·
decorative fake QR codes / skeuomorphic ticket stubs (QR belongs only in the
e-Ticket modal) · column-style mega footer · per-page one-off colors ·
green-tinted photo grading · `border-b` seams under heroes.
