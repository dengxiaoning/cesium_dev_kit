<template>
  <div class="terrain-edit-page">
    <div id="cesiumContainer" class="map3d-contaner"></div>
    <div id="threeContainer"></div>

    <div class="panel">
      <div class="panel-title">
        <span class="dot"></span>
        地形笔刷 · 地形重建
        <span class="badge" :class="{ off: !terrainReady }">{{ terrainReady ? '世界地形' : '平面地形' }}</span>
      </div>

      <div class="row">
        <button class="btn primary" :class="{ active: painting }" :disabled="!ready" @click="toggleBrush">
          {{ painting ? '笔刷已开启' : '开启笔刷' }}
        </button>
        <button class="btn" :disabled="!ready || loading" @click="resetArea">重建区域</button>
        <button class="btn ghost" :disabled="!ready" @click="undo">撤销</button>
      </div>

      <div class="row">
        <div class="export-group">
          <span class="export-label">导出</span>
          <button type="button" :disabled="!ready" title="导出 JSON 快照（可再 importData 复原）" @click="saveTerrain('json')">JSON</button>
          <button type="button" :disabled="!ready" title="导出 GeoTIFF（QGIS / GDAL 可直接读取）" @click="saveTerrain('geotiff')">GeoTIFF</button>
          <button type="button" :disabled="!ready" title="导出 ESRI ASCII 格网（.asc）" @click="saveTerrain('ascii')">ASCII</button>
          <button type="button" :disabled="!ready" title="导出 XYZ 文本（逐顶点）" @click="saveTerrain('xyz')">XYZ</button>
        </div>
      </div>

      <div class="row">
        <button class="btn" :disabled="!ready || loading" @click="pickFile">载入数据</button>
        <input ref="fileInput" class="file" type="file" accept=".json,.tif,.tiff,.asc,.xyz,application/json,image/tiff,text/plain" @change="loadTerrain" />
      </div>

      <div class="row modes">
        <button v-for="item in modes" :key="item.value" class="chip" :class="{ active: brush.mode === item.value }" @click="changeMode(item.value)">
          {{ item.label }}
        </button>
      </div>

      <div class="row modes">
        <button class="chip" :class="{ active: activeTemplate === 'pit' }" :disabled="!ready" title="一键基坑：再点一次取消" @click="applyTemplate('pit')">基坑</button>
        <button class="chip" :class="{ active: activeTemplate === 'mound' }" :disabled="!ready" title="一键土堆：再点一次取消" @click="applyTemplate('mound')">土堆</button>
        <button class="chip" :class="{ active: activeTemplate === 'platform' }" :disabled="!ready" title="一键平台：再点一次取消" @click="applyTemplate('platform')">平台</button>
        <button class="chip" :class="{ active: activeTemplate === 'ramp' }" :disabled="!ready" title="一键坡道：再点一次取消" @click="applyTemplate('ramp')">坡道</button>
      </div>

      <div class="slider">
        <label>笔刷半径 <b>{{ brush.radius }} m</b></label>
        <input type="range" min="20" max="400" step="10" v-model.number="brush.radius" @input="syncBrush" />
      </div>

      <div class="slider">
        <label>台阶落差 <b>{{ brush.maxDelta }} m</b></label>
        <input type="range" min="1" max="20" step="1" v-model.number="brush.maxDelta" @input="syncBrush" />
        <span class="hint">每刷一级的落差；按住左键不放会逐级下挖，拖动沿轨迹刷出平底平台</span>
      </div>

      <div class="slider" v-if="brush.mode === 'level'">
        <label>目标高程 <b>{{ targetHeight == null ? '取落笔处' : targetHeight.toFixed(0) + ' m' }}</b></label>
        <input type="range" min="0" max="2500" step="5" :value="targetHeight || 0" @input="onTarget" />
        <span class="hint">整平到同一高程，适合先做作业平台</span>
      </div>

      <label class="check">
        <input type="checkbox" v-model="showContour" @change="toggleContour" />
        显示等高线
      </label>
      <label class="check">
        <input type="checkbox" v-model="useTexture" @change="toggleTexture" />
        影像贴图（关闭后退回顶点着色）
      </label>
      <label class="check">
        <input type="checkbox" v-model="cutSurface" @change="toggleCutSurface" />
        开挖面岩土（陡壁更自然）
      </label>

      <div class="stats" v-if="stats">
        <div><span>范围面积</span><b>{{ stats.area }} 万㎡</b></div>
        <div><span>最大高差</span><b>{{ stats.relief }} m</b></div>
        <div><span>最低点</span><b>{{ stats.min }} m</b></div>
        <div><span>挖方</span><b class="cut">{{ stats.cut }} 万m³</b></div>
        <div><span>填方</span><b class="fill">{{ stats.fill }} 万m³</b></div>
      </div>

      <div class="tip" :class="{ error: !!error }">{{ error || tip }}</div>
    </div>
  </div>
</template>

<script>
import * as Cesium from 'cesium'
import * as THREE from 'three'
import { createKit } from '@/utils/cesiumPluginsExtends/index'
import {
  heightFieldToGeoTIFF,
  geoTIFFToHeightField,
  heightFieldToAsciiGrid,
  asciiGridToHeightField,
  heightFieldToXyz,
  xyzToHeightField
} from '@/utils/cesiumPluginsExtends/terrain'
import { defaultStatic } from '../defaultStaticConf'

/** 默认观察位置：泰山一带，地形起伏明显，适合演示开挖 */
const DEFAULT_CENTER = [117.1, 36.25]

export default {
  data () {
    return {
      loading: false,
      ready: false,
      painting: false,
      terrainReady: false,
      showContour: true,
      useTexture: true,
      cutSurface: true,
      targetHeight: null,
      activeTemplate: null,
      brush: { mode: 'lower', radius: 110, maxDelta: 3 },
      stats: null,
      tip: '按住左键逐级下挖，拖动沿轨迹刷出平底平台；右键转视角，滚轮缩放',
      error: '',
      modes: [
        { value: 'lower', label: '下沉' },
        { value: 'raise', label: '抬升' },
        { value: 'level', label: '整平' },
        { value: 'smooth', label: '平滑' }
      ]
    }
  },
  mounted () {
    this.initMap()
  },
  methods: {
    async initMap () {
      const kit = createKit({
        Cesium,
        three: THREE,
        containerId: 'cesiumContainer',
        threeContainerId: 'threeContainer',
        viewerConfig: {
          // 与 three 融合必须关闭默认渲染循环
          useDefaultRenderLoop: false,
          shouldAnimate: true,
          infoBox: false,
          selectionIndicator: false,
          animation: false,
          timeline: false,
          // 编辑块要和地形做真正的深度遮挡（前景山体挡住它时就该看不见）：
          // - 关掉 OIT：开启后 Cesium 把深度挪进自己的累积缓冲，搬不出来；
          // - canvas 关 antialias、msaaSamples 设 1：多重采样的缓冲不能 blit 深度。
          // 抗锯齿改由 FXAA 后处理补回来，见下方 scene.postProcessStages.fxaa。
          orderIndependentTranslucency: false,
          contextOptions: { webgl: { antialias: false } },
          msaaSamples: 1
        },
        extraConfig: {
          depthTest: true,
          logo: false
        },
        imageryProvider: {
          type: 'WebMapTileServiceImageryProvider',
          option: {
            url: 'https://t0.tianditu.gov.cn/img_w/wmts?tk=65a5f62a964c1d5b23fa81bc34147973',
            layer: 'img',
            style: 'default',
            tileMatrixSetID: 'w',
            format: 'tiles',
            maximumLevel: 18
          }
        },
        MapImageryList: [
          {
            type: 'WebMapTileServiceImageryProvider',
            option: {
              url: 'https://t0.tianditu.gov.cn/cia_w/wmts?tk=65a5f62a964c1d5b23fa81bc34147973',
              layer: 'cia',
              style: 'default',
              tileMatrixSetID: 'w',
              format: 'tiles',
              maximumLevel: 18
            }
          }
        ],
        defaultStatic
      })

      this.kit = kit
      this.viewer = kit.viewer
      // 关闭 canvas MSAA 才能把地形深度搬给 three，边缘锯齿交给 FXAA 补
      const stages = this.viewer.scene.postProcessStages
      if (stages && stages.fxaa) stages.fxaa.enabled = true
      this.terrainEdit = kit.terrainEdit
      // 调试用：控制台可拿到场景与模块实例
      if (typeof window !== 'undefined') {
        window.__terrainDemo = this
        // 便于在控制台调试
        window.Cesium = Cesium
        window.THREE = THREE
      }

      const { scene } = kit.threeJs.initThree({ center: DEFAULT_CENTER, threeHabit: false, fusion: 'single-context', depth: 'canvas-blit' })
      this.scene = scene
      // 单帧循环交给 three 统一驱动：先渲染 cesium，再用同一帧的相机矩阵渲染 three
      kit.threeJs.loop(() => this.scene.update())

      await this.addTerrain()
      this.ready = true
      await this.buildArea({ lng: DEFAULT_CENTER[0], lat: DEFAULT_CENTER[1] })
      this.focusArea()
      // 涂抹过程中统计不需要每帧刷新，按固定间隔采样即可
      this.statsTimer = setInterval(() => this.updateStats(), 700)
    },
    /** 把镜头对准编辑区：用包围球 + 俯角偏移，避免只朝某个方向看而没框住区域 */
    focusArea () {
      const stats = this.terrainEdit.getStats()
      const center = this.areaCenter || { lng: DEFAULT_CENTER[0], lat: DEFAULT_CENTER[1] }
      const height = stats ? (stats.minHeight + stats.maxHeight) / 2 : 0
      const cartesian = Cesium.Cartesian3.fromDegrees(center.lng, center.lat, height)
      // 半径取区域对角线的一半，range 约 1.1 倍边长：
      // 太远的话 2400m 的地块只占屏幕一角，笔刷圈小得像个点，完全看不出在刷什么
      const sphere = new Cesium.BoundingSphere(cartesian, 1180)
      this.viewer.camera.flyToBoundingSphere(sphere, {
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(18),
          Cesium.Math.toRadians(-46),
          2600
        ),
        duration: 0
      })
    },
    async addTerrain () {
      try {
        // 演示站点统一在 main.ts 里配置了 Ion token，这里直接用世界地形。
        // 网络不稳时不能一直卡在 await 上，超时就退回椭球（0 高程）继续演示。
        const provider = await Promise.race([
          Cesium.CesiumTerrainProvider.fromIonAssetId(1),
          new Promise((resolve) => setTimeout(() => resolve(null), 12000))
        ])
        if (!provider) throw new Error('世界地形加载超时')
        this.viewer.terrainProvider = provider
        this.terrainReady = true
      } catch (err) {
        this.terrainReady = false
        this.error = '世界地形加载失败，将以 0 高程平面演示：' + (err && err.message ? err.message : err)
      }
    },
    /** 在当前视野中心铺一块可涂抹的地形区域 */
    async buildArea (fixedCenter) {
      const center = fixedCenter || this.pickCenter() || { lng: DEFAULT_CENTER[0], lat: DEFAULT_CENTER[1] }
      this.areaCenter = center
      this.loading = true
      this.error = ''
      this.tip = '正在采样地形高度并取地表贴图…'
      try {
        await this.terrainEdit.setArea(center, {
          size: 2400,
          segments: 160,
          feather: 90,
          texture: this.useTexture,
          cutSurface: this.cutSurface
        })
        this.syncBrush()
        this.terrainEdit.enableBrush(true)
        this.painting = true
        this.updateStats()
        this.tip = '按住左键逐级下挖，拖动沿轨迹刷出平底平台；右键转视角，滚轮缩放'
      } catch (err) {
        this.error = '生成地形区域失败：' + (err && err.message ? err.message : err)
      } finally {
        this.loading = false
      }
    },
    async resetArea () {
      this.terrainEdit.clear()
      this.painting = false
      this.activeTemplate = null
      await this.buildArea()
      this.focusArea()
    },
    toggleBrush () {
      this.painting = !this.painting
      this.terrainEdit.enableBrush(this.painting)
      this.tip = this.painting
        ? '按住左键逐级下挖，拖动刷出平底平台；右键拖动转视角，滚轮缩放'
        : '笔刷已关闭：左键拖动可旋转地图、滚轮缩放，随时可以再开启'
      this.updateStats()
    },
    changeMode (mode) {
      this.brush.mode = mode
      if (mode !== 'level') this.targetHeight = null
      this.syncBrush()
    },
    onTarget (event) {
      this.targetHeight = Number(event.target.value)
      this.syncBrush()
    },
    syncBrush () {
      this.terrainEdit.setBrush({
        mode: this.brush.mode,
        radius: this.brush.radius,
        maxDelta: this.brush.maxDelta,
        targetHeight: this.brush.mode === 'level' ? this.targetHeight : null
      })
    },
    toggleContour () {
      this.terrainEdit.setContourVisible(this.showContour)
    },
    toggleTexture () {
      this.terrainEdit.setTextureEnabled(this.useTexture)
    },
    toggleCutSurface () {
      this.terrainEdit.setCutSurfaceEnabled(this.cutSurface)
    },
    undo () {
      this.terrainEdit.undo()
      this.activeTemplate = null
      this.updateStats()
      this.tip = '已撤销上一步'
    },
    /** 一键应用地形模板：基坑 / 土堆 / 平台 / 坡道；再次点击同一模板 = 撤销并取消选中 */
    applyTemplate (type) {
      if (!this.ready || !this.terrainEdit) return
      try {
        if (this.activeTemplate === type) {
          // 再点一次同一个 = 取消：撤销这次模板改动
          this.terrainEdit.undo()
          this.activeTemplate = null
          this.updateStats()
          this.tip = `已取消模板：${type}`
          return
        }
        if (type === 'pit') {
          this.terrainEdit.applyTemplate({ type: 'pit', depth: 60, stepHeight: 6 })
        } else if (type === 'mound') {
          this.terrainEdit.applyTemplate({ type: 'mound', depth: 40, stepHeight: 0 })
        } else if (type === 'platform') {
          this.terrainEdit.applyTemplate({ type: 'platform' })
        } else {
          this.terrainEdit.applyTemplate({ type: 'ramp', direction: 90 })
        }
        this.activeTemplate = type
        this.updateStats()
        this.tip = `已应用模板：${type}（可继续用笔刷微调；再点一次按钮可取消）`
      } catch (err) {
        this.error = '应用模板失败：' + (err && err.message ? err.message : err)
      }
    },
    /** 导出当前编辑结果并让浏览器下载：format 为 json / geotiff / ascii / xyz */
    saveTerrain (format = 'json') {
      const field = this.terrainEdit.getHeightField()
      if (!field) {
        this.tip = '还没有可导出的地形，先刷两笔'
        return
      }
      let blob
      let filename
      let sizeText
      if (format === 'geotiff') {
        const bytes = heightFieldToGeoTIFF(field)
        blob = new Blob([bytes], { type: 'image/tiff' })
        filename = `terrain-${field.segments}x${field.segments}-${Date.now()}.tif`
        sizeText = `${(bytes.byteLength / 1024).toFixed(0)} KB`
      } else if (format === 'ascii') {
        const text = heightFieldToAsciiGrid(field)
        blob = new Blob([text], { type: 'text/plain' })
        filename = `terrain-${field.segments}x${field.segments}-${Date.now()}.asc`
        sizeText = `${(text.length / 1024).toFixed(0)} KB`
      } else if (format === 'xyz') {
        const text = heightFieldToXyz(field)
        blob = new Blob([text], { type: 'text/plain' })
        filename = `terrain-${field.segments}x${field.segments}-${Date.now()}.xyz`
        sizeText = `${(text.length / 1024).toFixed(0)} KB`
      } else {
        const data = this.terrainEdit.exportData()
        const text = JSON.stringify(data)
        blob = new Blob([text], { type: 'application/json' })
        filename = `terrain-${data.grid.segments}x${data.grid.segments}-${Date.now()}.json`
        sizeText = `${(text.length / 1024).toFixed(0)} KB`
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      this.tip = `已导出 ${sizeText}（${format.toUpperCase()}）：可用「载入数据」直接还原，或交给 QGIS / GDAL 等工具`
    },
    pickFile () {
      const input = this.$refs.fileInput
      if (input) input.click()
    },
    /** 载入数据：按扩展名分发到 JSON 快照 / GeoTIFF / ASCII / XYZ */
    loadTerrain (event) {
      const file = event.target.files && event.target.files[0]
      if (!file) return
      const ext = (file.name.split('.').pop() || '').toLowerCase()

      if (ext === 'tif' || ext === 'tiff') {
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const field = geoTIFFToHeightField(new Uint8Array(reader.result))
            this.terrainEdit.importHeightField(field)
            this.afterImportField(field, file.name)
          } catch (err) {
            this.error = '载入失败：' + (err && err.message ? err.message : err)
          } finally {
            event.target.value = ''
          }
        }
        reader.onerror = () => { this.error = '读取文件失败' }
        reader.readAsArrayBuffer(file)
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        try {
          const text = String(reader.result)
          if (ext === 'asc') {
            const field = asciiGridToHeightField(text)
            this.terrainEdit.importHeightField(field)
            this.afterImportField(field, file.name)
          } else if (ext === 'xyz') {
            const field = xyzToHeightField(text)
            this.terrainEdit.importHeightField(field)
            this.afterImportField(field, file.name)
          } else {
            const data = JSON.parse(text)
            this.terrainEdit.importData(data)
            this.applySnapshotUi(data)
            this.terrainEdit.enableBrush(true)
            this.painting = true
            this.areaCenter = this.snapshotCenter(data)
            this.focusArea()
            this.error = ''
            this.updateStats()
            this.tip = `已载入 ${file.name}（${data.grid.segments}×${data.grid.segments} 网格），可继续刷`
          }
        } catch (err) {
          this.error = '载入失败：' + (err && err.message ? err.message : err)
        } finally {
          event.target.value = ''
        }
      }
      reader.onerror = () => {
        this.error = '读取文件失败'
      }
      reader.readAsText(file)
    },
    /** 载入高度场（DEM / GeoTIFF / ASCII / XYZ）后的通用收尾 */
    afterImportField (field, name) {
      this.terrainEdit.enableBrush(true)
      this.painting = true
      const b = field.bounds
      this.areaCenter = { lng: (b.minLng + b.maxLng) / 2, lat: (b.minLat + b.maxLat) / 2 }
      this.error = ''
      this.focusArea()
      this.updateStats()
      this.tip = `已载入 ${name}（${field.segments + 1}×${field.segments + 1} 格网），可继续刷`
    },
    /** 把数据包里的笔刷 / 显示状态同步回界面，避免面板和实际状态不一致 */
    applySnapshotUi (data) {
      const view = data.view || {}
      this.useTexture = view.texture !== false
      this.cutSurface = view.cutSurface !== false
      this.showContour = view.contour !== false
      if (data.brush) {
        this.brush.mode = data.brush.mode || 'lower'
        this.brush.radius = data.brush.radius || 110
        this.brush.maxDelta = data.brush.maxDelta || 3
      }
      if (this.brush.mode !== 'level') this.targetHeight = null
    },
    snapshotCenter (data) {
      if (data.area && data.area.center) return data.area.center
      const list = data.polygon || []
      if (!list.length) return { lng: DEFAULT_CENTER[0], lat: DEFAULT_CENTER[1] }
      let lng = 0
      let lat = 0
      list.forEach((p) => {
        lng += Number(p.lng) || 0
        lat += Number(p.lat) || 0
      })
      return { lng: lng / list.length, lat: lat / list.length }
    },
    pickCenter () {
      const scene = this.viewer.scene
      const canvas = scene.canvas
      const screen = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2)
      let cartesian = null
      try {
        if (scene.pickPositionSupported && scene.globe.depthTestAgainstTerrain) {
          cartesian = scene.pickPosition(screen)
        }
      } catch (err) {
        cartesian = null
      }
      if (!cartesian) {
        const ray = this.viewer.camera.getPickRay(screen)
        if (ray) cartesian = scene.globe.pick(ray, scene)
      }
      if (!cartesian) return null
      const carto = Cesium.Cartographic.fromCartesian(cartesian)
      if (!carto) return null
      return { lng: Cesium.Math.toDegrees(carto.longitude), lat: Cesium.Math.toDegrees(carto.latitude) }
    },
    updateStats () {
      if (!this.terrainEdit) return
      const stats = this.terrainEdit.getStats()
      if (!stats) {
        this.stats = null
        return
      }
      this.stats = {
        area: (stats.area / 10000).toFixed(1),
        relief: (stats.maxHeight - stats.minHeight).toFixed(1),
        min: stats.minHeight.toFixed(1),
        cut: (stats.cutVolume / 10000).toFixed(1),
        fill: (stats.fillVolume / 10000).toFixed(1)
      }
    }
  },
  beforeUnmount () {
    if (this.statsTimer) {
      clearInterval(this.statsTimer)
      this.statsTimer = null
    }
    if (this.kit) {
      this.kit.dispose()
      this.kit = null
      this.viewer = null
      this.scene = null
      this.terrainEdit = null
    }
  }
}
</script>


<style scoped>
.terrain-edit-page {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #05080f;
}
.map3d-contaner,
#threeContainer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
#threeContainer {
  pointer-events: none;
}
.panel {
  position: absolute;
  left: 16px;
  bottom: 16px;
  z-index: 20;
  width: 300px;
  padding: 14px 16px 12px;
  border: 1px solid rgba(110, 226, 255, 0.35);
  border-radius: 10px;
  background: linear-gradient(
    160deg,
    rgba(9, 24, 36, 0.94),
    rgba(6, 14, 24, 0.94)
  );
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45),
    inset 0 0 24px rgba(64, 196, 255, 0.06);
  color: #cfe9f5;
  font-size: 12px;
  backdrop-filter: blur(6px);
}
.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #eaf8ff;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #57e0ff;
  box-shadow: 0 0 8px #57e0ff;
}
.badge {
  margin-left: auto;
  padding: 1px 6px;
  border: 1px solid rgba(87, 224, 255, 0.4);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 400;
  color: #8fe9ff;
}
.badge.off {
  border-color: rgba(255, 176, 116, 0.5);
  color: #ffb074;
}
.row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.btn {
  flex: 1;
  height: 30px;
  border: 1px solid rgba(110, 226, 255, 0.28);
  border-radius: 6px;
  background: rgba(21, 48, 66, 0.7);
  color: #cfe9f5;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn:hover:not(:disabled) {
  border-color: rgba(110, 226, 255, 0.7);
  color: #fff;
  background: rgba(30, 72, 96, 0.85);
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.btn.primary {
  border-color: rgba(87, 224, 255, 0.6);
  background: linear-gradient(
    180deg,
    rgba(32, 122, 158, 0.9),
    rgba(20, 78, 104, 0.9)
  );
  color: #eafaff;
}
.btn.primary.active {
  box-shadow: 0 0 12px rgba(87, 224, 255, 0.5);
}
.btn.ghost {
  flex: 0 0 60px;
  background: transparent;
}
/* 导出按钮组：左侧「导出」标签 + 各格式按钮，共享一个外框 */
.export-group {
  flex: 1;
  display: flex;
  align-items: stretch;
  min-width: 0;
  height: 30px;
  border: 1px solid rgba(110, 226, 255, 0.28);
  border-radius: 6px;
  overflow: hidden;
}
.export-label {
  display: flex;
  align-items: center;
  padding: 0 10px;
  background: linear-gradient(180deg, rgba(32, 122, 158, 0.9), rgba(20, 78, 104, 0.9));
  color: #eafaff;
  font-size: 12px;
  white-space: nowrap;
}
.export-group button {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  padding: 0 2px;
  border: none;
  border-left: 1px solid rgba(110, 226, 255, 0.18);
  background: rgba(21, 48, 66, 0.7);
  color: #cfe9f5;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.export-group button:hover:not(:disabled) {
  background: rgba(30, 72, 96, 0.92);
  color: #fff;
}
.export-group button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.file {
  display: none;
}
.modes {
  gap: 6px;
}
.chip {
  flex: 1;
  height: 26px;
  border: 1px solid rgba(110, 226, 255, 0.2);
  border-radius: 4px;
  background: transparent;
  color: #9cc2d2;
  font-size: 12px;
  cursor: pointer;
}
.chip.active {
  border-color: rgba(87, 224, 255, 0.8);
  background: rgba(35, 120, 152, 0.45);
  color: #eafaff;
}
.chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.slider {
  margin-bottom: 8px;
}
.slider label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  color: #9cc2d2;
}
.slider label b {
  color: #8fe9ff;
  font-weight: 500;
}
.slider input[type='range'] {
  width: 100%;
  height: 3px;
  appearance: none;
  border-radius: 2px;
  background: linear-gradient(90deg, #2b8fb4, #1b3b4c);
  outline: none;
}
.slider input[type='range']::-webkit-slider-thumb {
  width: 12px;
  height: 12px;
  appearance: none;
  border: 2px solid #0a1b26;
  border-radius: 50%;
  background: #6ee6ff;
  box-shadow: 0 0 8px rgba(110, 230, 255, 0.7);
  cursor: pointer;
}
.hint {
  display: block;
  margin-top: 3px;
  font-size: 10px;
  color: #6f93a4;
}
.check {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px 0 10px;
  color: #9cc2d2;
  cursor: pointer;
}
.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 10px;
  padding: 8px 10px;
  border: 1px solid rgba(110, 226, 255, 0.15);
  border-radius: 6px;
  background: rgba(8, 28, 40, 0.6);
}
.stats div {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #7fa5b6;
}
.stats b {
  color: #d9f4ff;
  font-weight: 500;
}
.stats b.cut {
  color: #ff8f6b;
}
.stats b.fill {
  color: #7ddfa6;
}
.tip {
  margin-top: 10px;
  min-height: 28px;
  font-size: 11px;
  line-height: 1.4;
  color: #6f93a4;
}
.tip.error {
  color: #ff9a76;
}
@media (max-width: 720px) {
  .panel {
    width: calc(100% - 32px);
    left: 16px;
    right: 16px;
  }
}
</style>
