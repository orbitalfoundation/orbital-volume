# 2026-07-09 — line handler; shadows on lights and prims

Second batch of lita-game-driven extensions (same day as `volume.static`).

**`line` geometry** (`handlers/line.js`) — a polyline in world space:
`{ volume: { geometry: 'line', points: [[x,y,z],…], material: { color,
opacity, dashed }, rev: 0 } }`. A line's truth is its point list rather
than a pose, so updates go through data: mutate `points`, bump `rev`, and
the tick revisit rebuilds the buffer geometry. Fewer than two points hides
the node without removing it. First consumer: lita-game draws each staff
member's / robot's planned route as a dashed line while they're on a task.

**Shadow support on lights** (`handlers/light.js`) — `volume.shadow = true |
{ size, extent, near, far }`, the same config shape as the scene handler's
`sun`. Also `volume.target: [x,y,z]` for directional/spot lights (the
target is added to the scene so three keeps it updated). The renderer's
shadow map must be on (e.g. scene `prettier: true`).

**Prims cast/receive by default** (`handlers/prim.js`) — meshes now set
`castShadow = receiveShadow = true` unless `volume.shadow === false`. A
no-op unless a shadow-casting light exists, so existing scenes are
unaffected until they opt a light in.
