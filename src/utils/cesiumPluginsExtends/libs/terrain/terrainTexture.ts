/**
 * 地形局部网格的「地表贴图」取样。
 *
 * 编辑出来的地形如果只是一块纯色网格，会明显像贴了张灰板，跟周围的卫星影像脱节。
 * 这里直接向当前影像图层要瓦片，把覆盖范围内的瓦片拼成一张 canvas 贴到网格上，
 * 于是挖开的地表保留它原本的地表纹理（草地 / 裸土 / 道路），只是被拉扯变形。
 *
 * 瓦片索引与地理范围一律走 provider 自己的 `positionToTileXY` / `tileXYToRectangle`，
 * 不自己推算 WebMercator 公式——不同厂商的 `numberOfLevelZeroTilesX` 并不都是 1，
 * 手算会取到错误的瓦片（表现为拼出来一片空白或海面）。
 */

/** 经纬度包围盒（度） */
export interface TerrainTextureBounds {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

export interface TerrainTextureOptions {
  /** 纹理长边像素上限，默认 2048 */
  maxSize?: number
  /** 目标地面分辨率（米/像素），默认 1.2 */
  metersPerPixel?: number
  /** 最多取多少张瓦片（超了自动降级），默认 64 */
  maxTiles?: number
}

export interface TerrainTextureResult {
  /** 拼好的地表纹理 */
  canvas: HTMLCanvasElement
  width: number
  height: number
  /** 实际使用的瓦片层级 */
  level: number
  /** 成功绘制的瓦片数 */
  tiles: number
  /** 经纬度 -> 纹理 UV（v 已按 three 的 flipY 约定处理） */
  uv: (lng: number, lat: number) => [number, number]
}

const TILE_SIZE = 256
/** 赤道处 0 级 WebMercator 的米/像素，用来估算合适的层级 */
const BASE_RESOLUTION = 156543.03392804097

function clamp(value: number, min: number, max: number) {
  return value < min ? min : value > max ? max : value
}

/**
 * 从影像图层取一块范围内的地表纹理。
 *
 * @param Cesium - Cesium 全局对象
 * @param layer - 影像图层（`ImageryLayer`）或直接给 provider
 * @param bounds - 需要的经纬度范围（度）
 * @param options - 纹理尺寸与精度控制
 * @returns 拼好的纹理与 UV 映射；取不到瓦片时返回 `null`（调用方自行回退）
 * @example
 * const tex = await buildImageryTexture(Cesium, viewer.imageryLayers.get(0), bounds)
 * // tex.canvas 交给 THREE.CanvasTexture，tex.uv(lng, lat) 生成 UV
 */
export async function buildImageryTexture(
  Cesium: any,
  layer: any,
  bounds: TerrainTextureBounds,
  options: TerrainTextureOptions = {}
): Promise<TerrainTextureResult | null> {
  if (typeof document === 'undefined') return null
  const provider = layer && (layer.imageryProvider || layer.provider)
  if (!provider || typeof provider.requestImage !== 'function' || !provider.tilingScheme) {
    return null
  }
  const scheme = provider.tilingScheme
  if (typeof scheme.positionToTileXY !== 'function' || typeof scheme.tileXYToRectangle !== 'function') {
    return null
  }
  if (provider.readyPromise && provider.ready === false) {
    try {
      await provider.readyPromise
    } catch (e) {
      return null
    }
  }

  const dLng = bounds.maxLng - bounds.minLng
  const dLat = bounds.maxLat - bounds.minLat
  if (!(dLng > 0) || !(dLat > 0)) return null

  const maxSize = clamp(Math.round(options.maxSize ?? 2048), 256, 4096)
  const maxTiles = clamp(Math.round(options.maxTiles ?? 64), 1, 256)
  const targetMpp = Math.max(0.05, options.metersPerPixel ?? 1.2)
  const centerLat = (bounds.minLat + bounds.maxLat) / 2
  const widthMeters = dLng * 111319.49 * Math.cos((centerLat * Math.PI) / 180)
  const heightMeters = dLat * 111319.49

  const toCarte = (lng: number, lat: number) =>
    Cesium.Cartographic.fromRadians(
      (lng * Math.PI) / 180,
      (lat * Math.PI) / 180,
      0
    )

  // 由「期望地面分辨率」反推层级，再按瓦片数上限收敛
  const wanted = Math.log2(
    (BASE_RESOLUTION * Math.cos((centerLat * Math.PI) / 180)) / targetMpp
  )
  const maxLevel = provider.maximumLevel != null ? provider.maximumLevel : 19
  const minLevel = provider.minimumLevel != null ? provider.minimumLevel : 0
  let level = clamp(Math.floor(wanted), minLevel, Math.min(maxLevel, 19))

  const rangeAt = (lv: number) => {
    const sw = scheme.positionToTileXY(toCarte(bounds.minLng, bounds.minLat), lv)
    const ne = scheme.positionToTileXY(toCarte(bounds.maxLng, bounds.maxLat), lv)
    if (!sw || !ne) return null
    return {
      x0: Math.min(sw.x, ne.x),
      x1: Math.max(sw.x, ne.x),
      y0: Math.min(sw.y, ne.y),
      y1: Math.max(sw.y, ne.y)
    }
  }

  let range = rangeAt(level)
  while (range && (range.x1 - range.x0 + 1) * (range.y1 - range.y0 + 1) > maxTiles && level > minLevel) {
    level--
    range = rangeAt(level)
  }
  if (!range) return null

  // 画布按经纬度线性铺开，长边对齐到 maxSize（保持像元近似正方）
  const aspect = heightMeters / Math.max(1, widthMeters)
  const canvasW = Math.round(widthMeters >= heightMeters ? maxSize : maxSize / Math.max(0.05, aspect))
  const canvasH = Math.round(canvasW * aspect)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(64, canvasW)
  canvas.height = Math.max(64, canvasH)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#6b6f5f'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const toDeg = (rad: number) => (rad * 180) / Math.PI
  const jobs: Promise<void>[] = []
  let tiles = 0
  for (let y = range.y0; y <= range.y1; y++) {
    for (let x = range.x0; x <= range.x1; x++) {
      const rect = scheme.tileXYToRectangle(x, y, level)
      if (!rect) continue
      // 瓦片经纬度范围 -> 画布像素范围
      const west = toDeg(rect.west)
      const east = toDeg(rect.east)
      const south = toDeg(rect.south)
      const north = toDeg(rect.north)
      const px = ((west - bounds.minLng) / dLng) * canvas.width
      const py = ((bounds.maxLat - north) / dLat) * canvas.height
      const pw = ((east - west) / dLng) * canvas.width
      const ph = ((north - south) / dLat) * canvas.height
      // 完全落在画布外的瓦片直接跳过
      if (px + pw < 0 || px > canvas.width || py + ph < 0 || py > canvas.height) continue
      jobs.push(
        Promise.resolve()
          .then(() => provider.requestImage(x, y, level))
          .then((image: any) => {
            if (!image) return
            const iw = image.width || image.naturalWidth || 0
            const ih = image.height || image.naturalHeight || 0
            if (!iw || !ih) return
            try {
              ctx.drawImage(image, 0, 0, iw, ih, px, py, pw, ph)
              tiles++
            } catch (e) {
              /* 单张瓦片失败就算了，别影响整体 */
            }
          })
          .catch(() => undefined)
      )
    }
  }
  await Promise.all(jobs)
  if (!tiles) return null

  const uv = (lng: number, lat: number): [number, number] => [
    (lng - bounds.minLng) / dLng,
    (lat - bounds.minLat) / dLat
  ]

  return { canvas, width: canvas.width, height: canvas.height, level, tiles, uv }
}

/**
 * 依次尝试若干影像图层，返回第一张取成功的纹理。
 * @param Cesium - Cesium 全局对象
 * @param layers - 候选图层（按优先级）
 * @param bounds - 经纬度范围
 * @param options - 纹理参数
 * @returns 纹理结果或 `null`
 */
export async function buildImageryTextureFromLayers(
  Cesium: any,
  layers: any[],
  bounds: TerrainTextureBounds,
  options: TerrainTextureOptions = {}
): Promise<TerrainTextureResult | null> {
  for (const layer of layers || []) {
    if (!layer || layer.show === false) continue
    try {
      const result = await buildImageryTexture(Cesium, layer, bounds, options)
      if (result) return result
    } catch (e) {
      /* 换下一个图层 */
    }
  }
  return null
}
