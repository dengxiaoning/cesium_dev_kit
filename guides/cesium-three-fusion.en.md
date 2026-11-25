# Cesium + Three.js single-context fusion: make ground objects really sink into terrain

> The default "two canvas" approach has three flaws: the depth buffers are not shared
> (objects can't sink into terrain), the camera matrix lags one frame (ground objects
> float as you orbit), and you pay for an extra full-screen composite. This post shows how
> `fusion: 'single-context'` solves all three, and the caveats to watch for.

## Why two canvases look wrong

Many people render Three.js on its own canvas stacked above Cesium via CSS. Fine for
objects in the air, but **ground-level content** breaks:

1. Each canvas has its own depth buffer — the Three.js objects and Cesium terrain don't know
   about each other, so occlusion is guesswork;
2. Cesium updates its camera every frame, but Three.js is still using last frame's matrix,
   so objects "float" when you rotate quickly;
3. One extra full-screen composite costs bandwidth and GPU time.

## Single-context fusion

`fusion: 'single-context'` makes Three.js reuse Cesium's canvas and WebGL context, drawing
straight into Cesium's frame against the same depth buffer:

```ts
import * as Cesium from 'cesium'
import * as THREE from 'three'
import { createKit } from 'cesium_dev_kit'

const kit = createKit({
  Cesium,
  three: THREE,
  containerId: 'cesiumContainer',
  threeContainerId: 'threeContainer',
  viewerConfig: {
    // fused mode requires WebGL2
    contextOptions: { requestWebgl2: true }
  }
})

const { scene, camera } = kit.threeJs.initThree({
  center: [104.08, 30.62],
  fusion: 'single-context', // default 'overlay' keeps the two-canvas behaviour
  depth: 'canvas-blit',     // default when fusion is 'single-context'
  precision: 'double'       // default
})

// Update only your animation each frame; no need to call renderer.render yourself
kit.threeJs.loop(() => {
  mixer && mixer.update(0.016)
})
```

| Option | Default | Description |
| --- | --- | --- |
| `fusion` | `'overlay'` | `'single-context'` reuses Cesium's canvas and WebGL context |
| `depth` | `'canvas-blit'` (single-context only) | Blits Cesium's depth onto the canvas so objects can be occluded by, and occlude, the terrain |
| `precision` | `'double'` | Composes the view matrix in float64 and drops precision once; `'legacy'` restores the old path |

## It does two things automatically

1. Raises `scene.logarithmicDepthFarToNearRatio` to force a single frustum — multiple
   frustums clear depth between passes, leaving only the nearest slab;
2. Skips the ECEF "fake occluder" spheres used by the old approach.

## Caveats (read before shipping)

- **WebGL2 required**. If the context is missing or not WebGL2, it logs the reason and falls
  back to two canvases without breaking rendering;
- With `scene.msaaSamples > 1`, `blitFramebuffer` may fail; repeated failures disable depth
  sharing (the context is still shared). Set `scene.msaaSamples = 1` on the Cesium side;
- With OIT enabled the depth is not in a blit-able FBO, so it degrades to context sharing only;
- Do **not** call `renderer.setSize()` in fused mode: assigning canvas width/height clears the
  drawing buffer (and wipes Cesium's frame). Size is driven by Cesium's canvas.

## Check whether occlusion is active

```ts
const status = kit.threeJs.getFusionStatus()
// reports frustum count, logarithmic depth, MSAA samples and the current depth source
console.log(status)
```

## Full example

[Live demo: extrude / ray cast](https://dengxiaoning.github.io/cesium_dev_kit/demo/?auto=1#/cesiumThreejs/extrude) ·
[ThreeJs API](https://dengxiaoning.github.io/cesium_dev_kit/classes/ThreeJs.html)
