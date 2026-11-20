# Map player

A seat map player in two parts: one shared program, and one folder per venue. The player holds no venue of its own and names no section, row or seat of
any building.

```
public/maps-2d/
  apps/
    experience/          the player (shared by every venue)
      index.html         open with ?venue=<slug>
      app.js             loads a venue and wires up the 3D view
      runtime/           the 2D map, the 3D view, the seat card, styles
    player/maps/         the venues
      README.md          how a venue folder works and how to add one
      index.json         the venues, and which loads when none is named
      <slug>/            one venue: seat map, venue.json, artwork, manifest
scripts/maps/            pack, seal, check and decor commands
tests/map-player/        smoke tests (npm run test:map)
backups/                 dated snapshots, one zip each
```

## Where things are in the player

| Part | File |
|---|---|
| 2D map: seats, sections, labels, zoom, picking | `runtime/flat-webgl.js` |
| Map drawn from the seat data alone | `runtime/schematic-artwork.js` |
| 3D arena, the view from a seat, the flight into it | `runtime/seat-view-3d.js`, `runtime/seat-view-3d.css` |
| Seat card and standing-section card | `runtime/buyer-popup-controller.js`, `runtime/buyer-panel.js` |
| The small plan in the seat card | `runtime/seat-locator.js` |
| Minimap | `runtime/buyer-flat-controller.js` |
| Styling, with the design tokens at the top | `runtime/blocktickets-callouts.css` |
| Dark theme | `runtime/map-dark.css` |

## Commands

```
npm run map:pack <slug>     write the seat map buyers download
npm run map:decor <slug>    write the parts of the artwork a schematic map keeps
npm run map:seal <slug>     checksum the venue's files (run after any change to them)
npm run map:check           check every venue
npm run test:map            run the smoke tests
```

## Adding a venue

See `apps/player/maps/README.md`. In short: a new folder with the seat map and a `venue.json`, an entry in `index.json`, then pack, seal and check.

## Not finished

- `scripts/maps/cleanup/` holds one-off scripts that straightened Meridian Centre's rows. They are written for that venue only.
- The smoke tests pick seats in Meridian Centre by section and row name.
