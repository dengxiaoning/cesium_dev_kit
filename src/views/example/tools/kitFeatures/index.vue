<template>
  <div class="kit-features">
    <div id="cesiumContainer" class="map3d-contaner"></div>

    <el-card class="panel">
      <template #header>
        <div class="card-header">
          <span>套件能力演示</span>
        </div>
      </template>

      <!-- 一、标注 + Web Components 工具条 -->
      <div class="section">
        <div class="section-title">① 标注序列化 + 撤销（Web Components 工具条）</div>
        <div ref="toolbarHost" class="toolbar-host"></div>
        <div class="btn-row">
          <el-button size="mini" :disabled="!annoState.canUndo" @click="annoUndo">撤销</el-button>
          <el-button size="mini" :disabled="!annoState.canRedo" @click="annoRedo">重做</el-button>
          <el-button size="mini" @click="annoExport">导出 JSON</el-button>
          <el-button size="mini" @click="annoLoad">载入 JSON</el-button>
          <el-button size="mini" @click="annoClear">清空</el-button>
        </div>
        <div class="hint">标注 {{ annoState.size }} 个 · 可撤销 {{ annoState.canUndo ? '是' : '否' }}</div>
      </div>

      <el-divider class="divider" />

      <!-- 二、标绘序列化 + 撤销 -->
      <div class="section">
        <div class="section-title">② 标绘序列化 + 撤销</div>
        <div class="btn-row">
          <el-button size="mini" @click="addPlot('AttackArrow')">攻击箭头</el-button>
          <el-button size="mini" @click="addPlot('PincerArrow')">钳击箭头</el-button>
          <el-button size="mini" @click="addPlot('StraightArrow')">直线箭头</el-button>
        </div>
        <div class="btn-row">
          <el-button size="mini" :disabled="!plotState.canUndo" @click="plotUndo">撤销</el-button>
          <el-button size="mini" :disabled="!plotState.canRedo" @click="plotRedo">重做</el-button>
          <el-button size="mini" @click="plotExport">导出 JSON</el-button>
          <el-button size="mini" @click="plotLoad">载入 JSON</el-button>
          <el-button size="mini" @click="plotClear">清空</el-button>
        </div>
        <div class="hint">标绘 {{ plotState.size }} 个 · 可撤销 {{ plotState.canUndo ? '是' : '否' }}</div>
      </div>

      <el-divider class="divider" />

      <!-- 三、剖面分析 -->
      <div class="section">
        <div class="section-title">③ 剖面分析</div>
        <div class="btn-row">
          <el-button size="mini" @click="profileInteractive">交互画线</el-button>
          <el-button size="mini" @click="profileFixed">固定示例</el-button>
        </div>
        <div class="hint">交互：左键点两点，右键结束；固定示例沿给定线采样。</div>
        <div v-if="profileStats" class="hint stats">
          最高 {{ profileStats.maxHeight.toFixed(1) }} m · 最低 {{ profileStats.minHeight.toFixed(1) }} m ·
          平均 {{ profileStats.avgHeight.toFixed(1) }} m · 爬升 {{ profileStats.gain.toFixed(1) }} m ·
          下降 {{ profileStats.loss.toFixed(1) }} m
        </div>
      </div>

      <pre v-if="jsonPreview" class="json-preview">{{ jsonPreview }}</pre>
    </el-card>
  </div>
</template>

<script>
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'
import { AnnotationStore, AnnotationLayer } from '@/utils/cesiumPluginsExtends/annotation/index'
import { PlotStore, PlotLayer } from '@/utils/cesiumPluginsExtends/plot/index'
import {
  defineDrawToolbar,
  bindDrawToolbar
} from '@/utils/cesiumPluginsExtends/web-components/index'

// 演示区域中心（成都附近）
const CENTER = [104.09, 30.65]

export default {
  data () {
    return {
      annoState: { size: 0, canUndo: false, canRedo: false },
      plotState: { size: 0, canUndo: false, canRedo: false },
      profileStats: null,
      jsonPreview: ''
    }
  },
  mounted () {
    this.initMap()
  },
  beforeUnmount () {
    if (this.unbindToolbar) this.unbindToolbar()
    if (this.annoLayer) this.annoLayer.destroy()
    if (this.plotLayer) this.plotLayer.destroy()
    this.c_viewer = null
  },
  methods: {
    async addWorldTerrain (viewer) {
      try {
        const provider = await Cesium.CesiumTerrainProvider.fromIonAssetId(1)
        viewer.terrainProvider = provider
      } catch (error) {
        console.log(`Failed to add world terrain: ${error}`)
      }
    },
    initMap () {
      Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN
      const { viewer, analysis } = new initCesium({
        cesiumGlobal: Cesium,
        containerId: 'cesiumContainer',
        viewerConfig: { infoBox: false, shouldAnimate: true },
        extraConfig: {
          depthTest: true,
          AccessToken: import.meta.env.VITE_CESIUM_ION_TOKEN
        },
        MapImageryList: [
          {
            type: 'UrlTemplateImageryProvider',
            option: {
              url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              subdomains: ['0', '1', '2', '3'],
              tilingScheme: new Cesium.WebMercatorTilingScheme()
            }
          }
        ]
      })
      this.c_viewer = viewer
      this.analysis = analysis
      this.addWorldTerrain(viewer)

      // ① 标注：数据层 + Cesium 绑定层
      this.annoStore = new AnnotationStore()
      this.annoLayer = new AnnotationLayer({ Cesium, viewer, store: this.annoStore })
      this.annoStore.subscribe((snapshot) => {
        this.annoState = {
          size: snapshot.annotations.length,
          canUndo: snapshot.canUndo,
          canRedo: snapshot.canRedo
        }
      })

      // ② 标绘：数据层 + Cesium 绑定层
      this.plotStore = new PlotStore()
      this.plotLayer = new PlotLayer({ Cesium, viewer, store: this.plotStore })
      this.plotStore.subscribe((snapshot) => {
        this.plotState = {
          size: snapshot.plots.length,
          canUndo: snapshot.canUndo,
          canRedo: snapshot.canRedo
        }
      })

      // ① 的 Web Components 工具条
      defineDrawToolbar()
      const toolbar = document.createElement('cesium-draw-toolbar')
      toolbar.setAttribute('modes', 'point,polyline,polygon')
      this.$refs.toolbarHost.appendChild(toolbar)
      this.unbindToolbar = bindDrawToolbar(toolbar, {
        point: () => this.addAnnotation('point'),
        polyline: () => this.addAnnotation('polyline'),
        polygon: () => this.addAnnotation('polygon'),
        cancel: () => {
          toolbar.value = null
        }
      })

      this.flyTo()
    },
    flyTo () {
      this.c_viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(CENTER[0], CENTER[1], 12000),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-55), roll: 0 }
      })
    },
    jitter (range = 0.012) {
      return (Math.random() - 0.5) * range
    },
    randomPoint () {
      return [CENTER[0] + this.jitter(), CENTER[1] + this.jitter()]
    },

    /* ---------------- ① 标注 ---------------- */
    addAnnotation (type) {
      const p1 = this.randomPoint()
      if (type === 'point') {
        this.annoStore.add({ type: 'point', positions: [p1], style: { color: '#ffcc00', pointSize: 10 } })
        return
      }
      const p2 = this.randomPoint()
      if (type === 'polyline') {
        this.annoStore.add({ type: 'polyline', positions: [p1, p2], style: { color: '#4fc3f7', lineWidth: 3 } })
        return
      }
      this.annoStore.add({
        type: 'polygon',
        positions: [p1, p2, this.randomPoint()],
        style: { color: '#66bb6a', clampToGround: true }
      })
    },
    annoUndo () { this.annoStore.undo() },
    annoRedo () { this.annoStore.redo() },
    annoClear () { this.annoStore.clear() },
    annoExport () {
      this.jsonPreview = JSON.stringify(this.annoStore.toJSON(), null, 2)
    },
    annoLoad () {
      if (!this.jsonPreview) { this.annoExport(); return }
      try { this.annoStore.load(JSON.parse(this.jsonPreview)) } catch (error) { console.warn(error) }
    },

    /* ---------------- ② 标绘 ---------------- */
    addPlot (type) {
      const points = []
      const n = type === 'StraightArrow' ? 3 : 4
      for (let i = 0; i < n; i++) points.push(this.randomPoint())
      this.plotStore.add({ type, positions: points, fillMaterial: '#ff5252' })
    },
    plotUndo () { this.plotStore.undo() },
    plotRedo () { this.plotStore.redo() },
    plotClear () { this.plotStore.clear() },
    plotExport () {
      this.jsonPreview = JSON.stringify(this.plotStore.toJSON(), null, 2)
    },
    plotLoad () {
      if (!this.jsonPreview) { this.plotExport(); return }
      try { this.plotStore.load(JSON.parse(this.jsonPreview)) } catch (error) { console.warn(error) }
    },

    /* ---------------- ③ 剖面分析 ---------------- */
    profileInteractive () {
      this.analysis.createProfileAnalysis({
        chart: true,
        callback: (result) => {
          this.profileStats = result.stats
        }
      })
    },
    profileFixed () {
      this.analysis.createProfileAnalysis({
        positions: [
          [CENTER[0] - 0.01, CENTER[1] - 0.01],
          [CENTER[0] + 0.01, CENTER[1] + 0.01]
        ],
        samples: 200,
        chart: true,
        callback: (result) => {
          this.profileStats = result.stats
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.kit-features {
  position: relative;
  .map3d-contaner {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  .panel {
    width: 340px;
    position: absolute;
    top: 3px;
    right: 3px;
    z-index: 3;
    max-height: calc(100% - 6px);
    overflow: auto;
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section {
      .section-title {
        font-size: 13px;
        font-weight: 600;
        color: #dfe8f5;
        margin-bottom: 8px;
      }
      .toolbar-host {
        margin-bottom: 8px;
      }
      .btn-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 6px;
        .el-button {
          margin-left: 0;
        }
      }
      .hint {
        font-size: 12px;
        color: #9fb0c3;
        line-height: 1.5;
        &.stats {
          color: #b9f6ca;
        }
      }
    }
    .divider {
      margin: 12px 0;
    }
    .json-preview {
      margin-top: 10px;
      max-height: 160px;
      overflow: auto;
      padding: 8px;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.35);
      color: #b9f6ca;
      font-size: 11px;
      line-height: 1.4;
    }
  }
}
</style>
