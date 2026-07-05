# 2026-07-04 — terrain, vegetation, atmosphere (2.1.0)

Feature pass driven by the terratwin bamboo-farm demo, whose vendored fork of
volume had grown DEM terrain features the official package lacked, and whose
bamboo needed to be both prettier and faster. Both capabilities now live here
as first-class handlers, generalized rather than bamboo-specific.

## Added

- `handlers/terrain.js` (`geometry: 'terrain'`, alias `'dem'`) — heightfield
  from raw elevation grids or lat/lon bounds fetched from public tiles
  (Terrarium elevation + ArcGIS imagery by default). Publishes
  `terrain.sample(x,z)` and min/max elevation back onto the component.
  De-forks the terratwin DEM feature.
- `handlers/load-helpers/terrain-tiles.js` — framework-free tile fetch/decode
  (terrarium + mapbox encodings), merged grids, module-level tile cache.
- `handlers/vegetation.js` + `handlers/load-helpers/vegetation-batch.js`
  (`geometry: 'vegetation'`) — a whole field of stalk-form plants in two
  InstancedMesh draws: lathe-profiled stalks with node collars (vertex-color
  bands, radially flattened normals so extreme non-uniform instance scale
  doesn't skew lighting), procedurally painted frond texture atlas on
  alpha-tested crossed-quad crowns (customDepthMaterial for correct shadow
  cutouts, emissive-map trick for canopy light scatter), GPU wind via
  onBeforeCompile with per-instance phase/amplitude attributes. Mutate
  `plants[]` + set `dirty` to update; geometry is never rebuilt.
- Scene atmosphere options: `sky`, `fog`, `hemisphere`, `sun` (with shadow
  config), `exposure`, `antialias`. `prettier` now also sets PCFSoft shadows.
- `markSRGB()` in three-helper — sRGB texture tagging across three versions
  (colorSpace landed ~r152, encoding removed ~r162).
- `terrain.html` / `demo-terrain.js` — second demo page (pinned to
  three@0.170) showing all of the above; ~2,400 culms grow in and sway at
  vsync with zero console errors.

## Notes

- All additive; no breaking changes to existing handlers or the 0.148 demo.
- Verified: `npm run smoke` (node/server no-op path) plus headless-Chrome
  screenshots of terrain.html (120fps on an M-series laptop).
- terratwin still runs its vendored copy; its bamboo renderer is now the same
  code shape as vegetation-batch here, so migrating it onto this package is
  mostly deleting the fork.
