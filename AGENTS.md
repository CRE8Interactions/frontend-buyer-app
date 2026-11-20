<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Blocktickets: how to work in this repo

Fan app and marketing site on Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript, with a shadcn-based component library (`components/ui`) documented in Storybook. Start with `HANDOFF.md` (state, open items), then `DESIGN-SYSTEM.md` (tokens, components, rules).

## Building pages and components
**Read `PAGE-BUILDING.md` on every redesign, new page and new component, before writing code.** Library components and tokens only, creative composition, custom only when the owner asks.

## Shared checkout
**Read `COORDINATION.md` before editing or taking over a task.** Codex and Claude use the same checkout, with one editor at a time.

For Blocktickets UI and Storybook changes, read [the Blocktickets design skill](.claude/skills/blocktickets-design/SKILL.md). Follow the current rules in this file and `DESIGN-SYSTEM.md` if the skill differs.

## Rules from the project owner (follow them)
- **Never deploy** (Vercel, preview or production) unless the owner explicitly says so. Check changes on localhost (`npm run dev`, http://localhost:3000) and report.
- **Commit verified component work locally by default.** Use the shared working branch and keep `main` for reviewed PRs. Push or merge only with the owner's approval.
- **Components are shadcn components, restyled.** Reuse the shadcn component as the base and restyle it in place with `cva` variants and Tailwind utilities on our `h-` tokens, merged with `cn()` (tailwind-merge), with `data-slot` and state data attributes as hooks. Check shadcn first (`npx shadcn@latest add <name>`); build a custom component only when shadcn has none. **Do not** add per-component CSS or BEM class stylesheets: that was tried and reversed (see DESIGN-SYSTEM.md "Component styling and quality gates").
- **Change only the component you were asked to change.** Do not mass-restyle. Every time a component changes, update its story (`components/ui/<name>.stories.tsx`) and `DESIGN-SYSTEM.md` in the same change.
- **Visual rules:** colours only through tokens (`bg-h-default`, `text-h-muted`, ... never a hex); explicit pixel radii (`rounded-[12px]`), because in this theme `rounded-xl` is 24px, not 12px; Phosphor icons only (Bold, 16px); text on the green accent is navy; one green moment per screen. Details in DESIGN-SYSTEM.md.
- **Do not name the reference library** (HeroUI) in docs or code comments that ship.
- **The component library pages of the brand site stay unpublished** (`brand/index.html`, sections `class="page lbp"`) until the owner says otherwise.
- The `navy` / `navy-green` button variants exist but are used **only on explicit request**.

## Commands
| Command | What it does |
|---|---|
| `npm run dev` | app on :3000 (webpack) |
| `npm run storybook` | component library on :6006 |
| `npm run check` | fast gate, about 10 seconds: library lint, strict stories check, type check |
| `npm run verify` | same checks, used by CI |
| `npm run visual` | visual regression: loads every story (dark and light) and compares computed styles of every element with `tests/visual/baseline/<platform>` (`darwin` or `linux`); use `-- --platform <platform>` to select a folder. Needs Storybook running (or `-- --static` after `npm run build-storybook`); about 11 minutes for all 530 stories, so use `-- --filter '<story id regex>'` while working |
| `npm run visual:update` | rewrite the current platform's baseline after an intended, reviewed visual change. Update both baselines using the steps in DESIGN-SYSTEM.md |

Before finishing a component change: `npm run check`, then `npm run visual -- --filter '^(atoms|molecules|organisms)-<name>'` for the component and what embeds it, and look at it in Storybook in dark and light. The visual check does not see hover, press, focus or closed popovers: test those by hand.

## Known pitfalls
- Tailwind-merge semantics matter: a caller's `className="h-8"` on a component that has `md:h-9` keeps the component's `md:h-9`. Search callers (`grep -rn "<Button" components app`) when you change sizing classes.
- `components/ui` files import from `@/lib/*`; shared motion tokens are in `app/globals.css` (`--e-out`, `--e-drawer`) and `lib/motion.ts`.
- Next.js docs for this version are in `node_modules/next/dist/docs/` (see the block above).
- `app/concept/styles.ts` holds base CSS for the landing pages and targets button variants by `data-variant`.

