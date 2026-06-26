# orbital-volume → @orbitalfoundation/bus migration

Status: in progress (June 2026). Goal: orbital-volume runs on the published bus and works well.

## What changed and why

The old demo ran on `orbital-sys` (loaded from CDN), whose `sys` is *callable*
(`sys(blobA, blobB, …)`) and whose listeners are `resolve(blob, sys, self)`. The new
[`@orbitalfoundation/bus`](https://github.com/orbitalfoundation/orbital-bus) uses
`createBus()` → `bus.resolve(eventOrBlob)` and listener signature `resolve(event, bus)`
with `this` bound to the entity. Migration touched four surfaces:

1. **`volume.js`** — listener param `sys` → `bus`; install service as `bus.volume`; added an
   `id` (the new bus keys entities on `id`, not `uuid`).
2. **`demo-scene.js`** — `createBus()` + `bus.resolve([...])`; explicit `{run:'realtime'}` tick
   loop (the old kernel auto-ticked; rendering happens on tick — see `scene.js`).
3. **`index.html`** — import map entries for `@orbitalfoundation/bus` + `/utils` so the browser
   resolves the bus's bare specifiers (no bundler needed).
4. **`package.json`** — declares `@orbitalfoundation/bus` for module consumers (e.g. puppet).

## Semantic gaps handled

- **`uuid` → `id`.** New bus reserves `id`/`inherits`/`resolve` as entity keys. `volume_system`
  now carries `id`. Volume's *internal* entity cache still uses `uuid` (its own namespace —
  unrelated to bus registration).
- **Dual-role blobs → split data/behavior.** A blob with `resolve()` is *registered only* by the
  new bus (NOT also dispatched as an event — SPEC §3.4). The old demo's `cylinder001` had both a
  `volume` component and a `resolve` (self-rotate). Rather than have it self-publish on
  `{registered:true}` (which works but defers by a microtask — a floating promise during
  registration), the demo now splits it: a plain `cylinder001` entity (rendered + cached
  synchronously) plus a separate `cylinder001_spin` listener that mutates the entity's
  live-bound pose each tick. This is the idiomatic new-bus shape — data and behavior are
  separate blobs — and it's what the smoke test asserts.
- **Tick ownership.** Rendering occurs when `scene_handler` runs, which is per entity per
  `{tick}`. The demo now starts `{run:'realtime'}` after publishing entities.

## Verification

- Node smoke test (`test/smoke.mjs`) imports the real `volume.js` in *server* mode (handlers
  no-op when `getThree()` is null) and asserts the bus flow: service install, entity caching on
  publish, tick iteration, and the cylinder dual-role pattern. Run: `node test/smoke.mjs`.
- Visual/WebGL verification needs a browser (serve the folder, open `index.html`) — that part
  is for a human to eyeball.

## Not done here (tracked)
- Publishing as `@orbitalfoundation/orbital-volume` (ties into the puppet work, item 3).
- The README's "design tensions" are partly resolved by the bus SPEC now; README updated to note this.
