# 2026-07-09 — `volume.static`: build once, skip the tick revisit

The tick loop re-invokes every cached entity's handler each frame. That is
what advances GLB animation mixers and instanced vegetation — but for a
built primitive it does nothing: `poseUpdate` early-returns for
non-instanced volumes because live pose binding already writes straight
into the three node. A scene made mostly of immobile parts (lita-game's
hotels publish several hundred wall/floor/prop boxes) still paid one
awaited handler call per part per frame.

New opt-in flag on the component:

```js
{ volume: { geometry: 'cube', static: true, ... } }
```

Once such an entity is `_built`, the tick loop skips it. Everything else
still works: live-bound `pose.position` mutation moves it (the binding is
the node), explicit `{ volume }` deltas route through `_update` as before,
and `obliterate` removal is honored (the skip condition checks it, and the
delta path is how obliterate arrives anyway).

Deliberately opt-in rather than inferred: `file` entities need the revisit
for mixers, instanced prims for matrix writes, and guessing would break
them quietly. Rule of thumb for consumers: mark anything that never
animates and is not instanced.

First consumer: lita-game marks all compiled hotel geometry static; its
characters, elevator cabs, and task markers stay dynamic.
