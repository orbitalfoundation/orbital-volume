# 2026-06-25 — migrate to @orbitalfoundation/bus + demo polish

Goal: orbital-volume runs on the published bus and works well as a self-contained demo.

## Bus migration

The old demo ran on `orbital-sys` (CDN), whose `sys` is *callable* (`sys(blobA, blobB, …)`) with
listeners `resolve(blob, sys, self)`. The new
[`@orbitalfoundation/bus`](https://github.com/orbitalfoundation/orbital-bus) uses `createBus()` →
`bus.resolve(eventOrBlob)`, listener signature `resolve(event, bus)`, `this` bound to the entity.

Surfaces touched:

1. **`volume.js`** — listener param `sys` → `bus`; install service as `bus.volume`; added an `id`
   (the bus keys entities on `id`, not `uuid`). Volume's *internal* entity cache still keys on
   `uuid` (its own namespace, unrelated to bus registration).
2. **`demo-scene.js`** — `createBus()` + `bus.resolve([...])`; explicit `{run:'realtime'}` tick
   loop (the old kernel auto-ticked; rendering happens per entity per `{tick}` — see `scene.js`).
3. **`index.html`** — import-map entries for `@orbitalfoundation/bus` + `/utils` so the browser
   resolves the bus's bare specifiers (verified served on jsDelivr, no bundler).
4. **`package.json`** — depends on `@orbitalfoundation/bus` for module consumers (e.g. puppet).

### Semantic gaps handled

- **Dual-role blobs → split data/behavior.** A blob with `resolve()` is *registered only* by the
  new bus (NOT also dispatched — SPEC §3.4). The old `cylinder001` had both a `volume` component
  and a `resolve` (self-rotate). Self-publishing on `{registered:true}` works but defers a
  microtask (floating promise during registration), so the demo instead splits it: a plain
  `cylinder001` entity (rendered + cached synchronously) plus a separate `cylinder001_spin`
  listener that mutates the entity's live-bound pose each tick. Idiomatic new-bus shape.
- **Server-safe import.** `three-helper.js` instantiated `new THREE.Matrix4()` at module
  top-level, crashing any server-side import (THREE is null there). Guarded it — fixes the
  long-documented "Server/Client" tension for this file.

### Verification

- `test/smoke.mjs` imports the real `volume.js` in *server* mode (handlers no-op when
  `getThree()` is null) and asserts the bus flow: service install, entity caching, tick. Run
  `npm run smoke`.
- Visual/WebGL confirmed by a human in-browser (grid, cube, sphere, spinning cylinder, lights,
  avatar, orbit controls).

## Demo polish (same session)

- **Avatar.** The Ready Player Me URL 404'd (asset retired). The demo now uses the repo-local
  `assets/rpm-mixamo-t-posed.glb` — the "Alex" avatar from prismatic.blue (the preferred,
  hand-tuned rig despite its generic filename), byte-identical to prismatic's copy. Self-contained,
  no external host / CORS. (A motorpunk.glb was briefly vendored then dropped once the preferred
  avatar was confirmed.)
- **Console noise.** Dropped the per-entity "granted new uuid" `console.log` in `volume.js`.
- **Animation path.** Cleaned `import.meta.url + "/../…"` to `new URL('./…', import.meta.url)`.

## Tracked / not done

- Publish as `@orbitalfoundation/orbital-volume` (with the puppet/item-3 work).
- **three.js upgrade 0.148 → 0.185** — noticed 0.185 released. Big jump (color-management,
  `outputEncoding`/`useLegacyLights` removed, addons + bundled `three-vrm` likely affected).
  Worth its own focused pass; deferred.
