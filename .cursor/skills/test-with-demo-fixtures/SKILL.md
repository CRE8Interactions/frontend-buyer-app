---
name: test-with-demo-fixtures
description: >-
  Add or update purposeful Vitest/React Testing Library coverage for every
  behavior change — happy path and failure path, no redundant cases — using
  lib/demo/fixtures.ts as the single source of truth for test data. Use when
  changing any component, page, store, or lib module; adding component or page
  tests; covering browse/tickets flows; mocking API payloads; testing what
  should display on pages but no styling; or when tempted to copy
  event/org/venue/ticket fixtures into tests/.
---

# Test with demo fixtures

## Rule 1: every functional change ships with test changes

Any change to **functionality** — component, page, hook, store, or `lib/` module — must be paired with a test in the same pass. Do not finish a functional task with source edits and untouched tests.

**don't add tests for styling changes only functionality.** Spacing, sticky offsets, colors, borders, shadows, radius, and layout polish do not get new tests. If the user can still do the same things and see the same data, keep existing tests and do not add coverage.

**test what should display on pages but no styling.** Page/component tests assert the copy and data the user should see (headings, offer names, seat lines, prices, payment method, empty/error messages, button labels, hrefs). Do not assert how it looks.

| Change | Test action |
|--------|-------------|
| New behavior / feature | Add a test that fails without the change |
| Bug fix | Add a regression test reproducing the bug |
| Changed behavior (e.g. qty bounds now come from `min`/`max`) | Update the existing assertions to the new contract |
| Extracted or moved logic (e.g. `lib/ticketListings.ts`) | Move/point the test at the new module, keep coverage |
| Renamed prop, field, or copy | Update fixtures + assertions rather than deleting the test |
| Pure refactor, no behavior change | Keep tests as-is and re-run them as the proof |
| Styling / layout / chrome only | No new tests |

Then run the suite before reporting done:

```bash
npm test
```

Guidelines:

- Prefer extending an existing suite (`BrowseHome.test.tsx`, `PremiumTicketing.test.tsx`, `ticketListings.test.ts`) over creating a new file for a small change.
- Test the observable contract (rendered output, computed listings, hrefs), not internals.
- On pages, assert **what** is on screen from fixtures (names, amounts, labels, missing-state copy). Never assert **how** it is styled.
- Never delete or skip a failing test to get green — either the source or the assertion is wrong; fix that.
- If a change is genuinely untestable through the UI, extract the logic into `lib/` and test it there.

## Rule 2: tests are purposeful — happy path, failure path, no redundancy

Every test must earn its keep. Write the smallest set of cases that would **fail if the requirement were broken**. Cover both the success path and the meaningful failure / edge path. Do not add a second test that only restates what another already proves.

**We don't need styling tests.** Don't add tests for styling changes — only functionality. Do not assert chrome, layout, sticky/scroll behavior, or presentation via `toHaveStyle`, Tailwind bg/border class colors, white vs navy panels, or similar. Domain color contracts that affect sellability (e.g. exclusive seats are purple, unavailable seats are gray) are fine; pure visual polish is not.

**test what should display on pages but no styling**

| Display (test this) | Styling (do not test) |
|---------------------|------------------------|
| Offer name, event name, venue, dates | Font size, weight, tracking, color |
| Seat line, ticket count, package name | Spacing, padding, gap, sticky offsets |
| Prices, fees, payment method, order id | Borders, radius, shadows, card chrome |
| Button/link labels and hrefs | Tailwind layout / panel / badge classes |
| Empty, error, and fallback copy | `toHaveStyle`, white vs navy panels |

| Include | Skip |
|---------|------|
| Happy path that proves the requirement works | A near-duplicate that only swaps an irrelevant value |
| Unhappy path that proves the failure / empty / locked / sold-out / error contract | Asserting the same outcome twice under different names |
| One regression for a real bug you fixed | Speculative permutations that the product does not care about |
| Visible page copy and data from fixtures | Chrome / layout / sticky / styling-only changes |
| Domain color contracts that affect sellability | `toHaveStyle` / Tailwind presentation classes |

How to write them:

1. **Name the requirement** in the `it(...)` title (what the user or API must get), not the implementation detail.
2. **Assert the contract** — if someone removed the feature or inverted the condition, this test must fail. Weak checks like “something rendered” or “length > 0” without tying to fixture data are not enough when a specific outcome is required.
3. **Pair paths** — for each new behavior, usually one happy case + one unhappy case (e.g. available seats paint offer color; sold-out / missing inventory stays unavailable). Prefer two focused tests over one giant setup that asserts everything.
4. **No redundancy** — before adding a test, ask whether an existing case already fails when this requirement breaks. If yes, extend that case instead of cloning it. Do not assert the same property in both a unit and a UI test unless each layer has a distinct contract.
5. **One reason to fail** — each test should have a primary reason it would go red. Extra `expect`s are fine only when they guard the same requirement’s setup or a necessary side effect.

## Rule 3: fixtures come from `lib/demo/fixtures.ts`

**Do not invent parallel fixture objects in `tests/`.** Build every browse, event, org, venue, and ticket-group payload from `lib/demo/fixtures.ts`.

If a test needs a shape the demo file lacks, **extend `lib/demo/fixtures.ts`** (or add a thin adapter next to it), then import that. Never paste a second copy of Raptors/IceDogs/NM State rows into a test file.

## Canonical imports

```ts
import {
  DEMO_EVENTS,
  DEMO_ORGS,
  DEMO_SEATED_TICKET_GROUPS,
  demoBrowseEvents,
  demoBrowseOrgs,
  demoBrowseVenues,
  demoSeatedTicketingData,
  demoLockedTicketingData,
  demoTicketGroups,
  demoEventDetail,
  demoCart,
} from "@/lib/demo/fixtures";
```

Thin re-exports for older test paths (still derived from fixtures):

- `tests/fixtures/browse.ts` → `demoBrowseEvents/Orgs/Venues()`
- `tests/fixtures/tickets.ts` → `demoSeatedTicketingData()`, `DEMO_SEATED_TICKET_GROUPS`

## What lives where

| Need | Use |
|------|-----|
| Browse events / orgs / venues | `demoBrowseEvents()`, `demoBrowseOrgs()`, `demoBrowseVenues()` |
| Seated select-tickets UI | `demoSeatedTicketingData()` / `demoLockedTicketingData()` |
| Raw ticket groups / listing math | `DEMO_SEATED_TICKET_GROUPS` + `groupsToListings` |
| GA ticket groups | `demoTicketGroups()` |
| Event detail by shortcode | `demoEventDetail(shortcode)` |
| Assert names/hrefs | Read fields off `DEMO_EVENTS[i]` / `DEMO_ORGS[i]` — do not hardcode strings that already exist on the fixture |

## Patterns

### Mock browse APIs

```ts
mockedGetEvents.mockResolvedValue({ data: demoBrowseEvents() });
mockedGetOrgs.mockResolvedValue({ data: demoBrowseOrgs() });
mockedGetVenues.mockResolvedValue({ data: demoBrowseVenues() });
```

### Assert from the fixture, not a duplicate string

```ts
expect(screen.getAllByText(DEMO_EVENTS[0].name).length).toBeGreaterThan(0);
expect(screen.getByText(new RegExp(`${DEMO_EVENTS.length} events`, "i"))).toBeInTheDocument();
```

### Override only what the case needs

```ts
render(
  <PremiumTicketing
    data={demoSeatedTicketingData({
      offerNames: ["Field Club", "Club Level Empty"],
    })}
  />,
);
```

### Extending fixtures

1. Add or enrich the object in `lib/demo/fixtures.ts`.
2. Prefer helpers (`demoBrowseEvents`, `demoSeatedTicketingData`) over exporting one-off test-only blobs.
3. Keep demo mode and tests on the same data so UI review and automated coverage stay aligned.

## Anti-patterns

- Shipping a **functional** source change with no added or updated test
- Adding tests for styling-only changes (sticky, spacing, colors, chrome)
- Skipping a page display assertion (what the user should see) or adding styling assertions instead
- Deleting, `skip`-ing, or loosening an assertion to make the suite pass
- Reporting a functional task done without running `npm test`
- Happy-path-only coverage that never asserts empty, locked, sold-out, or error states
- Redundant tests that would still pass if the requirement were removed (or that only restate another case)
- Vague assertions that cannot fail when the contract is wrong
- We don't need styling tests — no chrome / layout assertions (`toHaveStyle`, Tailwind bg/border class colors, white vs navy panels)
- Copying event names, shortcodes, prices, or listings into `*.test.tsx`
- A second `browseEventsFixture = [{ ... }]` that is not imported from fixtures
- Hardcoding `/e/.../tickets/` paths when `DEMO_EVENTS` already has `slug` + `shortCode` + `seatmap.ga_only`
