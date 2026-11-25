# cesium_dev_kit

Cesium development kit: plotting, measurement, analysis, custom materials / primitives, sensors, heatmap, post-processing effects, Three.js integration and terrain editing.

> **Live demo: <https://dengxiaoning.github.io/cesium_dev_kit/demo/?auto=1>**
>
> Every class in the sidebar has a matching example page (plotting, measurement, analysis,
> materials, post-processing, path roaming, …). The demo auto-logs-in with a mock account
> (`?auto=1`). To run locally: `npm run dev`.

> **Chinese is the primary documentation language.** The UI and category names on this page are
> in English, but method descriptions still carry the original Chinese JSDoc text until the
> comments are fully translated. For the complete Chinese version, see
> <https://dengxiaoning.github.io/cesium_dev_kit/>.

## Install

```bash
npm install cesium_dev_kit cesium
# optional: only needed for the Three.js integration
npm install three
```

> Requires Cesium `>=1.105`. `three`, `echarts`, `dat.gui` and `libgif` are optional peer
> dependencies, installed only when their features are used.

## Cesium static assets (required)

This kit extends Cesium but does not ship Cesium's own runtime assets. Before the first render,
`Assets/`, `Workers/`, `ThirdParty/` and `Widgets/widgets.css` must be reachable.

- **Vite**: `npm i -D vite-plugin-cesium`, then `plugins: [cesium()]` in `vite.config.ts`.
- **Manual**: copy `node_modules/cesium/Build/Cesium/{Assets,Workers,ThirdParty,Widgets}` into
  `public/cesium/`, set `window.CESIUM_BASE_URL = '/cesium/'` before importing Cesium, and
  `import 'cesium/Build/Cesium/Widgets/widgets.css'`.
- The container needs an explicit size (`width/height: 100%`).
- Set `Cesium.Ion.defaultAccessToken`.

## Quick start

```ts
import * as Cesium from 'cesium'
import { createKit } from 'cesium_dev_kit'

const kit = createKit({
  Cesium,
  containerId: 'cesiumContainer',
  assetsBaseUrl: '/static/'
})

// Point
kit.graphics.getPointGraphics({ color: Cesium.Color.GREEN, pixelSize: 6 })

// Polygon (Cartesian3 positions)
kit.graphics.createPolygonGraphics({
  positions: Cesium.Cartesian3.fromDegreesArray([104.09, 30.65, 104.11, 30.65, 104.10, 30.63]),
  material: Cesium.Color.RED.withAlpha(0.3),
  clampToGround: true
})

// Release on unmount (idempotent; only destroys a viewer created by the kit)
kit.dispose()
```

You can also instantiate modules individually (each instance holds its own Cesium closure):

```ts
import { Graphics } from 'cesium_dev_kit/graphics'

const graphics = new Graphics({ Cesium, viewer })
graphics.createLineGraphics({ positions: [[104.09, 30.65], [104.11, 30.68]], width: 3 })
```

Available subpaths: `/graphics`, `/material`, `/primitive`, `/draw`, `/analysis`, `/plugin`,
`/pass-effect`, `/control`, `/three`, `/custom-cesium-plugin`, `/default-static`.

## API index (one page per class)

| Category | Class | Capabilities |
| --- | --- | --- |
| Entity Graphics | [Graphics](./classes/Graphics.html) | points, lines, polygons, models, circles, walls, dynamic effects, video planes, GIF billboards |
| Interactive Drawing | [Draw](./classes/Draw.html) | mouse-drawn points, lines, polygons, circles, rectangles, walls, corridors, line of sight |
| Plot Arrows | [AttackArrow](./classes/AttackArrow.html) | attack arrow (double-click to finish; movable / editable) |
| Plot Arrows | [PincerArrow](./classes/PincerArrow.html) | pincer arrow |
| Plot Arrows | [StraightArrow](./classes/StraightArrow.html) | straight arrow |
| Plot Arrows | [BasePlot](./classes/BasePlot.html) | plot base class: state machine, shared utilities |
| Primitives & Analysis | [Primitive](./classes/Primitive.html) | custom geometry primitives, 3D heatmap |
| Spatial Analysis | [Analysis](./classes/Analysis.html) | visibility, look-around, viewshed, clip, excavation, flood, slope, volume |
| Materials | [Material](./classes/Material.html) | flow lines, warnings, city roads, ripple circles and more |
| Scene Plugins | [Plugin](./classes/Plugin.html) | path roaming, radar scan, coordinate correction, path planning, clustering, 3D bars |
| Layers & Controls | [Control](./classes/Control.html) | layer toggling, post-processing panel, unified mouse events |
| Post-processing Effects | [PassEffect](./classes/PassEffect.html) | radar scan, circle scan, fire particles |
| Math | [Math2d](./classes/Math2d.html) | 2D distance, bearing, circle from three points, polygon tests |
| Math | [Math3d](./classes/Math3d.html) | 3D distance, area, bearing, terrain interpolation, ray intersection |
| Three.js Integration | [ThreeJs](./classes/ThreeJs.html) | Three.js scene overlay and synchronization |
| Terrain Editing | [TerrainEdit](./classes/TerrainEdit.html) | drag-to-edit terrain brush (lower / raise / flatten / smooth), polygon one-shot, steps, water, volume stats |
| DOM & Tooltips | [DomUtil](./classes/DomUtil.html) | DOM creation, styling, event binding |
| DOM & Tooltips | [TooltipUtil](./classes/TooltipUtil.html) | map bubbles / tooltips |
| Infrastructure | [Base](./classes/Base.html) | coordinate transforms, events, picking, skybox, effects |
| Extensions | [CustomCesiumPlugin](./classes/CustomCesiumPlugin.html) | base class for custom Cesium plugins |

Terrain editing requires passing `three` to `createKit` and calling `initThree` first:

```ts
import * as THREE from 'three'

const kit = createKit({ Cesium, three: THREE, containerId: 'cesiumContainer' })
const { scene } = kit.threeJs.initThree({ center: [117.1, 36.25] })
kit.threeJs.loop(() => scene.update())

// ① Brush: lay out an editable area, then hold the left button to dig
await kit.terrainEdit.setArea([117.1, 36.25], { size: 2400, segments: 160 })
kit.terrainEdit
  .setBrush({ mode: 'lower', radius: 110, maxDelta: 3 })
  .enableBrush(true)

// ② Polygon: one-shot, with optional steps / water
await kit.terrainEdit.setPolygon([[117.095, 36.245], [117.105, 36.245], [117.105, 36.255], [117.095, 36.255]])
kit.terrainEdit.apply({ mode: 'sink', depth: 60, stepHeight: 6, waterLevel: 0.3 })
console.log(kit.terrainEdit.getStats())
```

### Saving and re-editing

The kit does not decide where your data lives; it hands back a complete, serializable result:

```ts
const data = kit.terrainEdit.exportData()!   // null until an area is defined
await fetch('/api/terrain/42', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)                 // plain JSON, no TypedArrays / class instances
})

const saved = await (await fetch('/api/terrain/42')).json()
kit.terrainEdit.importData(saved).enableBrush(true)
```

## Error handling & lifecycle

```ts
import { createKit, isCesiumDevKitError, setErrorHandler } from 'cesium_dev_kit'

setErrorHandler((err) => {
  if (isCesiumDevKitError(err)) console.warn(err.code, err.message)
})

const kit = createKit({ Cesium, containerId: 'cesiumContainer' })
kit.dispose() // releases listeners / DataSources; never destroys a viewer you passed in
```

## Links

- [GitHub repository](https://github.com/dengxiaoning/cesium_dev_kit)
- [Examples index](https://dengxiaoning.github.io/cesium_dev_kit/examples/)
- [Live demo](https://dengxiaoning.github.io/cesium_dev_kit/demo/?auto=1)
- [Chinese docs](https://dengxiaoning.github.io/cesium_dev_kit/)
- [README](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/README.en.US.md)
