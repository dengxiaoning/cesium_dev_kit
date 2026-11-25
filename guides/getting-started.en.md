# Getting started with cesium_dev_kit: your first 3D scene in 10 minutes

> Audience: frontend / GIS developers who know basic Cesium and want less boilerplate.
> Prerequisites: Node 18+, a Vite project, and a Cesium Ion token.

## Why this kit

Plain Cesium makes you hand-roll a lot of material callbacks, listeners and teardown
just to draw an animated polygon with a flowing line. `cesium_dev_kit` wraps those
into ready-made modules and fixes two real pain points:

1. **Tree-shakable subpaths** — `import { Graphics } from 'cesium_dev_kit/graphics'`
   does not pull in `echarts` / `dat.gui`;
2. **Explicit lifecycle** — `createKit()` returns an explicit context, and `dispose()`
   is idempotent (no leaked listeners / DataSources).

## Install

```bash
npm install cesium_dev_kit cesium
```

Optional (install only when used): `three`, `echarts`, `dat.gui`, `libgif`.

## Step 1 — Initialize

```ts
import * as Cesium from 'cesium'
import { createKit } from 'cesium_dev_kit'

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN

const kit = createKit({
  Cesium,
  containerId: 'cesiumContainer'
})
```

The container needs an explicit size, or the canvas collapses to 0px:

```css
#cesiumContainer { width: 100%; height: 100%; }
```

## Step 2 — Draw a polygon

```ts
kit.graphics.createPolygonGraphics({
  positions: Cesium.Cartesian3.fromDegreesArray([
    104.09, 30.65,
    104.12, 30.65,
    104.11, 30.62
  ]),
  material: Cesium.Color.DEEPSKYBLUE.withAlpha(0.4),
  clampToGround: true
})

kit.context.viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(104.10, 30.635, 9000)
})
```

`kit.graphics` has a full toolbox: `createLineGraphics`, `createBoxGraphics`,
`createModelGraphics`, `createDynamicPolyLineGraphics` (animated flow lines),
`createVideoPlaneGraphics` (video planes)… See the
[API docs](https://dengxiaoning.github.io/cesium_dev_kit/classes/Graphics.html).

## Step 3 — Add a little analysis

Spatial analysis is a one-liner too:

```ts
kit.analysis.createVisibilityAnalysis({
  position: Cesium.Cartesian3.fromDegrees(104.08, 30.62, 2),
  targetPositions: [
    Cesium.Cartesian3.fromDegrees(104.12, 30.66, 0),
    Cesium.Cartesian3.fromDegrees(104.10, 30.58, 0)
  ]
})
```

## Step 4 — Dispose on unmount (important)

```ts
// Vue: onUnmounted(() => kit.dispose())
// React: useEffect(() => () => kit.dispose(), [])
kit.dispose() // idempotent; only destroys a viewer created by the kit
```

If you passed in your own `viewer`, `dispose()` only removes the DataSources/listeners
the kit added and never destroys your viewer.

## Beyond: import only what you need

```ts
import { Graphics } from 'cesium_dev_kit/graphics'

const graphics = new Graphics({ Cesium, viewer })
graphics.createLineGraphics({ positions: [[104.09, 30.65], [104.11, 30.68]], width: 3 })
```

## Next steps

- [Live examples (70+)](https://dengxiaoning.github.io/cesium_dev_kit/examples/)
- [API docs](https://dengxiaoning.github.io/cesium_dev_kit/)
- [Terrain editing walkthrough](./terrain-editing.en.md)
- [Cesium + Three.js single-context fusion](./cesium-three-fusion.en.md)
