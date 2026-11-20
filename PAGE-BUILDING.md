# Building pages and components: library parts and tokens only

**Read this file every time you redesign a page or create a new page or component. Read it before you write any code.**

## The rule

Build from the library, with the design tokens, and be creative inside those limits.

1. **Use library components only.** Compose pages from the atomic layers, in this order of preference:
   `components/ui` (shadcn base, restyled) → `components/atoms` → `components/molecules` → `components/organisms` → `components/templates`.
   Do not write raw `<button>`, `<input>`, `<select>`, `<textarea>`, cards, badges, dialogs or tabs when a library part exists. Use `<Button>`, `<Input>`, `Card`, `Pill`, and so on.
2. **Use variables only.** Colour, radius, spacing, type and motion come from the tokens in `app/globals.css` (`--h-*`, `--e-*`) and the Tailwind utilities built on them (`bg-h-default`, `text-h-muted`, ...). No hex or rgb values, no invented greys, no one-off font sizes or radii. Details are in `DESIGN-SYSTEM.md`.
3. **Pick the variant that exists.** Use the shipped variants and sizes (`variant="secondary"`, `size="sm"`, and so on). Do not restyle a library part from a page with `className` overrides, page CSS or inline styles. If a part looks wrong for the page, the part is wrong: say so and ask to change it in the library, in one place.
4. **Get creative with what you have.** Library-only does not mean template-looking. Create the page through:
   - composition: unexpected but consistent layouts, asymmetry, scale contrast, rhythm, density, whitespace;
   - hierarchy: which part leads, which supports, how a variant (primary, secondary, tertiary) steps emphasis up or down;
   - combining parts in new ways (a stat row from `Pill`, `Card` and type tokens; a hero from atoms and motion tokens);
   - motion from the shared motion tokens and `lib/motion.ts`;
   - the brand's own devices (`BlockMarker`, `Glow`, `Eyebrow`, `IconChip`, `Reveal`) used with restraint.
   Look at what already exists in Storybook (`npm run storybook`, :6006) and the existing pages before you decide a part is missing.
5. **Custom only when told to.** If the owner explicitly asks for a custom or one-off element, build it, but still with tokens, never with raw colours. When you are not told, do not go custom.

## Before you build

- Read `AGENTS.md`, `DESIGN-SYSTEM.md` and this file.
- List the library parts you will use. For each thing you think is missing, search `components/` and Storybook first.
- If something is truly missing, stop and ask: add it to the library (shadcn first: `npx shadcn@latest add <name>`, restyled with `cva` and tokens, with its story and a `DESIGN-SYSTEM.md` entry), or build a custom one-off if the owner says so. Do not quietly inline a copy on the page.

## While you build

- One green (primary) moment per screen. Phosphor icons only. Text on green is navy.
- Pages hold layout and content. They do not hold component styling.
- Reuse over repeat: the same pattern on two pages becomes a molecule or organism, not two copies.

## Before you finish

Run these checks on what you touched and report the results:

```bash
grep -rnE "<button|<input|<select|<textarea" app/<page>      # raw controls: should be library parts
grep -rnE "#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(" app/<page>       # hex and rgb: should be tokens
grep -rn "style=\{\{" app/<page>                              # inline styles: avoid
npm run check
```

Look at the page on localhost:3000 in light and dark, at phone width and desktop. Do not deploy; the owner asks for that.

## Report format

End with: the library parts used, anything custom (and who asked for it), anything you believe the library is missing, and what you checked.
