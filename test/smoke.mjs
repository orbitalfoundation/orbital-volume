// Node smoke test for the @orbitalfoundation/bus migration.
//
// Runs in SERVER mode: three.js is never loaded (handlers early-return when getThree() is null),
// so this exercises the BUS wiring + entity caching + the dual-role pattern — not rendering.
// Visual/WebGL verification is a separate, browser-only step (open index.html).
//
//   node test/smoke.mjs

import assert from 'node:assert/strict'
import { createBus } from '@orbitalfoundation/bus'
import { volume_system } from '../volume.js'

const bus = createBus()

// 1) registering the volume service installs it on the bus (its resolve runs on {registered:true})
await bus.resolve(volume_system)
assert.equal(bus.volume, volume_system, 'volume service installed at bus.volume')

// 2) a plain entity (no resolve) is dispatched as an event and cached by the volume service
await bus.resolve({ volume: { geometry: 'scene', surface: 'volume001' } })
assert.equal(Object.keys(volume_system._entities).length, 1, 'scene entity cached on publish')

// 3) data + behavior as separate blobs (the idiomatic pattern): a plain entity (cached
//    synchronously) and a separate ticker listener that mutates its live-bound pose.
const cylinder = { uuid: 'cylinder001', volume: { geometry: 'cylinder', pose: { rotation: { x: 0 } } } }
const spin = { id: 'cylinder001-spin', resolve(blob) { if (blob.tick) cylinder.volume.pose.rotation.x += 0.01 } }
await bus.resolve([cylinder, spin])
assert.ok(volume_system._entities['cylinder001'], 'plain cylinder entity cached on publish (no defer)')
assert.equal(
  volume_system._entities['cylinder001'],
  cylinder,
  'cached entity IS the published blob (live reference, so pose mutations show up)'
)

// 4) a tick drives both the volume service (iterate+render) and the separate spinner
const before = cylinder.volume.pose.rotation.x
await bus.resolve({ run: true, ticks: 1, dt: 1 })
assert.ok(cylinder.volume.pose.rotation.x > before, 'cylinder pose advanced on tick')

console.log('OK — volume ↔ bus integration verified (service install, caching, dual-role, tick)')
