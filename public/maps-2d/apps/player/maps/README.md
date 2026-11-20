# Venues

The map player (`apps/experience`) is one shared program that holds no venue of its own. Every venue is a folder here, and everything about that venue lives in
its folder. Nothing in one folder is read when another venue is on screen.

```
maps/
  index.json            the venues, and which one loads when none is named
  <slug>/
    venue-map.json      seats, sections, row heights, scale (the source of truth for both views)
    venue-map.svg       2D artwork (a group with class "logo" is used as the team logo in 3D)
    section-names.json  section names, GA and closed sections
    venue.json          this venue's properties: view2d and view3d
    venue-map.pack.json the seat map as buyers download it (written by the pack command)
    venue-decor.svg     parts of the artwork a schematic map keeps (written by the decor command)
    manifest.json       map id and a checksum of each file above (written by the seal command)
```

Open a venue with `apps/experience/index.html?venue=<slug>`.

## The player and the maps are separate

The player (`apps/experience`) owns everything shared: the seat popover, callouts, selection, the cart, themes, the 3D toolkit. A venue folder owns only
that venue's data and its own 2D and 3D layout. Reworking the player's interface never requires touching a venue, and changing a venue never requires
touching the player. Venue files contain no interface.

## The packed seat map

Buyers do not download `venue-map.json`. `npm run map:pack <slug>` writes `venue-map.pack.json`: the same seat map with one copy of each outline, reduced to
the points that matter, and each seat stored as its id, number and position plus only what differs from the venue's usual seat. The command refuses to
write the pack unless unpacking it gives back every id, name, position and field exactly, with outlines within 0.6 map units of the source.
`venue-map.json` stays in the folder as the file you edit. Re-pack after any change to it, then seal. (`?pack=0` makes the player load the full file, for comparison.)

## Adding or changing a venue

1. Create `maps/<slug>/` with the map, the artwork and a `venue.json` (copy another venue's and edit it). The `slug` and `mapId` inside must match the folder and the map.
2. Add it to `index.json`.
3. Pack its seat map: `npm run map:pack <slug>`. For a schematic venue that keeps parts of its artwork, also `npm run map:decor <slug>`.
4. Seal it: `npm run map:seal <slug>`. Run this again after ANY change to the venue's files; the player refuses to load a venue whose files do not match its manifest.
5. `npm run map:check` checks every venue, and fails if two venues share a map id or a seat id.

Seat ids must never change for a map that is on sale: inventory is keyed by them.

## venue.json

```jsonc
{
  "slug": "…", "mapId": "…", "name": "…", "team": "…",
  "files": { "map": "venue-map.json", "artwork": "venue-map.svg", "sectionNames": "section-names.json", "manifest": "manifest.json" },
  "view2d": { "currency": "CAD" },
  "view3d": { /* the 3D recipe, below */ }
}
```

### view2d: the 2D map

| Key | What it does | Default |
| --- | --- | --- |
| `style` | `"artwork"` draws the venue's own SVG. `"schematic"` draws the map from the seat map alone: one plain tile per section and the playing surface with its markings. A schematic venue needs no artwork file for its 2D map. Add `?style=schematic` or `?style=artwork` to the address to look at either without changing the venue. | `"artwork"` |
| `schematic` | Colours and spacing for the schematic style: `tile`, `gap`, `gapWidth`, `plate`, `plateEdge`, `plateEdgeWidth` (the white panel and outline a section shows once zoomed in), `base`, `bay`, `dark`, `surface`, `line`, `red`, `pitch`, `simplify`. | built-in |
| `schematic.keep` | Parts of the venue's own artwork to keep on the schematic map (a logo, bench labels, an arrow), as CSS selectors against the SVG. Run `npm run map:decor <slug>` to extract them into `venue-decor.svg`, then seal. | none |
| `currency` | Currency for prices. | `"CAD"` |
| `sectionLabels` | Pins a section's label by hand where the automatic placement lands badly. Keyed by section name, with one point per piece of the section, in map coordinates: `{ "114": [{ "x": 1380, "y": 512 }] }`. A pin applies to the piece it falls inside. Seal after editing. | automatic |
| `portrait` | What the full-venue view does on a screen taller than it is wide (a phone held upright). `auto` (the default) turns a map that is wider than it is tall a quarter turn so it fills the screen; `turn` always turns it; `keep` never does. |
| `portraitTurn` | Which way it turns: `left` (the default) or `right`. |
| `theme` | Team colours for this venue's map. `{ "light": { "strong", "soft", "line" }, "dark": { "strong", "soft", "cover", "coverStrong", "coverSoft" } }`, each a six-digit hex colour, any of them optional. `strong` is a section and an open seat (in dark, an open seat), `soft` the lighter end used for the cheapest price, `line` the lines between sections; in dark, `cover` is a section when there is one price, and `coverStrong` / `coverSoft` the two ends when prices differ. Without it the map uses the Blocktickets navy. Selection green, the amber of a seat being looked at, wheelchair yellow and the greys for unavailable seats are the player's and do not change. |
| `locale` | The locale prices are written in, for example `en-CA`. Without it, the buyer's own browser locale is used. |
| `sample` | Sample notices for demos, shown unless the page is opened with `?dummy=0`. `exclusive` and `obstructed` are lists of rules naming a `section`, and optionally `rows` (a list), `row` and `seat`; an obstructed rule may carry its own `label`. `obstructedEvery: 41` also marks roughly one seat in 41, labelled with `obstructedLabel`. The player itself names no section, row or seat. |

The team logo used in the 3D view is the group with class `logo`. A schematic venue takes it from `venue-decor.svg` when `g.logo` is in its `keep` list, so the full artwork is never loaded.

### view3d: the 3D recipe

The 3D view is built from the seat map by a toolkit (`runtime/seat-view-3d.js`). With an empty recipe a venue gets its seats on plain steps, the playing surface
drawn on the map, a roof and lighting. Every other part is built only if the recipe asks for it.

| Key | What it does | Default |
| --- | --- | --- |
| `rows.rebuild` | Lay the lower bowl out again on shared straight rows, so rows, steps and aisles line up across sections. Use for hand-drawn maps. | `false` |
| `rows.facets` | Straight runs per corner when rebuilding (4 = a turn every 22.5°; 16 or more reads as a curve). | `4` |
| `rows.firstRowLift` | Metres the first row stands above the floor beside the playing surface. | `0` |
| `surface.kick` | Colour of the strip along the foot of the boards. | none |
| `surface.net` | Netting above the glass: `"none"`, `"ends"` or `"all"`. | `"none"` |
| `surface.benches` | Team benches in the map's inactive bay beside the playing surface. | `false` |
| `raisedLevelHeight` | Metres the raised levels stand above the walkway. | `3.4` |
| `levels[]` | Sections with a role. Each has `role` (`"club"`, `"suite"` or `"lounge"`) and `sections` (a pattern matched against section names). | none |
| `levels[].raised` (club) | The club level is its own floor above the lower bowl. | `false` |
| `levels[].overhang` | Metres the level stands forward over the top of the lower bowl in 3D. The flat map cannot show this, so it is recorded here. | `0` (as drawn) |
| `levels[].ceiling` (club) | A low ceiling with a bulkhead and columns over the level. | `false` |
| `levels[].rooms` (suite) | `"furnished"` fits each suite's room out with a counter, stools, sofa, table, unit and TV. | none |
| `levels[].glazed` (lounge) | A closed room with a glass wall on the side facing the playing surface; otherwise an open deck with a rail. | `false` |
| `levels[].seat`, `seats.bowl` | Seat colours. | navy |
| `roof.trusses` | Number of roof trusses. | from the building's length |
| `roof.fixtures` | `"grid"` adds small light fixtures across the roof. | none |
| `roof.ducts` | Two air ducts under the roof. | `false` |
| `scoreboard.screen` | A centre-hung scoreboard with screens of this width and height in metres. | none |
| `banners` | Team banners hung at one end (needs a logo in the artwork). | `false` |
| `palette` | Overrides for the concrete and wall colours (`tread`, `riser`, `slab`, `wall`, `warm`, `cap` …). | neutral concrete |

A building that needs a part the toolkit does not have yet gets that part added to the toolkit as a new optional part, off by default, and switched on in its
own recipe. Venue-specific values never go into the shared code.
