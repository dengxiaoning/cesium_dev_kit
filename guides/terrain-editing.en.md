# Terrain editing in practice: dig a foundation pit and save/reload it

> Terrain editing is `cesium_dev_kit`'s killer feature: dig, raise and flatten terrain on
> the Cesium globe in real time, keep the original satellite imagery on the cut surfaces,
> and serialize the result for re-editing. Use cases: construction sites, mining, hydrology,
> earthwork volume.

## The idea in one line

Cesium has no "write terrain" API (`terrainProvider` is read-only). The kit instead
**samples real terrain + overlays a local Three.js mesh**: it takes the base height from
`sampleTerrainMostDetailed`, then deforms a vertex-colored grid weighted by distance to the
polygon boundary, so the pit rim lines up exactly with the original terrain.

## Dependencies

Terrain editing needs Three.js:

```bash
npm install three
```

## Initialize

```ts
import * as Cesium from 'cesium'
import * as THREE from 'three'
import { createKit } from 'cesium_dev_kit'

const kit = createKit({
  Cesium,
  three: THREE,
  containerId: 'cesiumContainer'
})

// Initialize the three scene first (terrain editing runs on this mesh)
const { scene } = kit.threeJs.initThree({ center: [117.1, 36.25] })
kit.threeJs.loop(() => scene.update())
```

## Option 1 — Brush interaction (hold left button to dig)

```ts
await kit.terrainEdit.setArea([117.1, 36.25], { size: 2400, segments: 160 })

kit.terrainEdit
  .setBrush({ mode: 'lower', radius: 110, maxDelta: 3 })
  .enableBrush(true) // hold LMB to dig, RMB to orbit, wheel to zoom
```

`mode` can be `lower` / `raise` / `flatten` / `smooth`. `maxDelta` is the "step drop":
each stroke presses the brush core to one absolute elevation, producing a flat floor plus
a narrow wall rather than a smooth bowl.

## Option 2 — Polygon, one shot

```ts
await kit.terrainEdit.setPolygon([
  [117.095, 36.245],
  [117.105, 36.245],
  [117.105, 36.255],
  [117.095, 36.255]
])

// sink 60m deep, 6m steps, water level at 0.3
kit.terrainEdit.apply({ mode: 'sink', depth: 60, stepHeight: 6, waterLevel: 0.3 })

console.log(kit.terrainEdit.getStats())
```

## The important part: save and re-edit

The kit does not decide where your data lives; it returns a complete, serializable result:

```ts
const data = kit.terrainEdit.exportData() // null until an area is defined

await fetch('/api/terrain/42', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data) // plain JSON, no TypedArrays / class instances
})

const saved = await (await fetch('/api/terrain/42')).json()
kit.terrainEdit.importData(saved).enableBrush(true)
```

For raw numbers without serialization, use `getHeightField()`:

```ts
const field = kit.terrainEdit.getHeightField()
const delta = field.current.map((h, i) => h - field.base[i]) // negative = cut, positive = fill
```

## Size reference

With `segments = 160`, the export is about 277KB (two 161×161 Float32 arrays, base64),
~180KB gzipped. Lower `segments` for smaller payloads, or quantize `grid.current` to
Int16 / GeoTIFF yourself.

## Full example

[Live demo: terrain editing](https://dengxiaoning.github.io/cesium_dev_kit/demo/?auto=1#/terrain/terrainEdit) ·
[TerrainEdit API](https://dengxiaoning.github.io/cesium_dev_kit/classes/TerrainEdit.html)
