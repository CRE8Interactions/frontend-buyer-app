# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Fans of a team or venue on Blocktickets (confirmed for the season seats page: a fan, often buying for family or friends) who want to choose real seats on the stadium map, see which home games each seat includes, and check out. Organizers (teams, venues) run their storefronts on the same platform.

## Product Purpose
Blocktickets is a fan app and marketing site for ticketing: events, season seats, flex packs and a wallet, built on Next.js 16 with a shadcn-based component library documented in Storybook. The season seats page sells one seat that carries over to every home game of a team's season.

## Positioning
Chosen by the owner's delegation, to be confirmed: you pick your exact seat on the real stadium map (live availability and prices), one seat covers every home game, and any single game can be transferred from the wallet.

## Operating Context
- The real seat map comes from the API (events/seatmap, ticket groups) and renders with the shared InteractiveSeatmap; the team and its games come from the storefront API with the design file as a fallback.
- The API has no season packages yet, so a season seat is priced as the seated game's seat price times the games it carries over to; checkout and the confirmation are still the demo.

## Capabilities and Constraints
- Components are shadcn components, restyled with cva and `--h-*` tokens. Pages are built from library components and tokens only; creativity comes from composition, hierarchy and motion; custom parts only when the owner asks (PAGE-BUILDING.md, DESIGN-SYSTEM.md).
- Colours only through tokens; Phosphor icons; text on the green accent is navy; one green moment per screen; pixel radii are explicit.
- Loading placeholders use the shared pulse (library Skeleton). Native tooltips (title attributes) are not used on cards.
- Never deploy unless the owner says so; the component library pages of the brand site stay unpublished.

## Brand Commitments
Name: Blocktickets. Existing voice and tokens in DESIGN-SYSTEM.md are binding. The team's own colour (--t) and crest theme a team page.

## Evidence on Hand
Real NM State storefront data (events, venues, logos) and the real Aggie Memorial Stadium seatmap and ticket groups are available from the dev API. No season packages, testimonials or sales figures exist; none may be invented.

## Product Principles
1. The real thing beats an illustration: use real seats, prices and games wherever the API has them.
2. One seat, every game: make the season value legible before the checkout.
3. The map is the hero; the interface around it should recede and guide.
4. Honest about demo parts: label what is not live yet.

## Accessibility & Inclusion
Keyboard operable, visible focus, reduced-motion respected, hold timer announced; seat choice must not depend on colour alone.
