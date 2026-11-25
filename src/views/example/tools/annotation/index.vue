<template>
  <div class="annotation-plane">
    <div id="cesiumContainer" class="map3d-contaner"></div>
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>标注 / 撤销 / 序列化</span>
        </div>
      </template>

      <!-- Web Components 工具条：点 / 线 / 面 -->
      <div ref="toolbarHost" class="toolbar-host"></div>

      <div class="group-btn">
        <el-button size="mini" :disabled="!state.canUndo" @click="undo">撤销</el-button>
        <el-button size="mini" :disabled="!state.canRedo" @click="redo">重做</el-button>
        <el-button size="mini" @click="exportJson">导出 JSON</el-button>
        <el-button size="mini" @click="loadJson">载入 JSON</el-button>
        <el-button size="mini" @click="clearAll">清空</el-button>
      </div>

      <div class="status">
        标注数：{{ state.size }} ｜ 可撤销：{{ state.canUndo ? '是' : '否' }} ｜ 可重做：{{ state.canRedo ? '是' : '否' }}
      </div>
      <pre v-if="jsonPreview" class="json-preview">{{ jsonPreview }}</pre>
    </el-card>
  </div>
</template>

<script>
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'
import { AnnotationStore, AnnotationLayer } from '@/utils/cesiumPluginsExtends/annotation/index'
import {
  defineDrawToolbar,
  bindDrawToolbar
} from '@/utils/cesiumPluginsExtends/web-components/index'

// 演示区域中心（成都附近）
const CENTER = [104.09, 30.65]

export default {
  data () {
    return {
      state: { size: 0, canUndo: false, canRedo: false },
      jsonPreview: ''
    }
  },
  mounted () {
    this.initMap()
  },
  beforeUnmount () {
    if (this.unbindToolbar) this.unbindToolbar()
    if (this.layer) this.layer.destroy()
    this.c_viewer = null
  },
  methods: {
    async addWorldTerrainAsync (viewer) {
      try {
        const terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(1)
        viewer.terrainProvider = terrainProvider
      } catch (error) {
        console.log(`Failed to add world terrain: ${error}`)
      }
    },
    async initMap () {
      const { viewer } = new initCesium({
        cesiumGlobal: Cesium,
        containerId: 'cesiumContainer',
        viewerConfig: {
          infoBox: false,
          shouldAnimate: true
        },
        extraConfig: {
          depthTest: true,
          AccessToken:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmYzkwZWEwYy1mMmIwLTQwYjctOWJlOC00OWU4ZWU1YTZhOTkiLCJpZCI6MTIxODIsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1NjA0OTUyNDN9.wagvw7GxUjxvHXO6m2jjX5Jh9lN0UyTJhNGEcSm2pgE'
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
      this.addWorldTerrainAsync(viewer)

      // 数据层 + Cesium 绑定层
      this.store = new AnnotationStore()
      this.layer = new AnnotationLayer({ Cesium, viewer, store: this.store })
      this.store.subscribe((snapshot) => {
        this.state = {
          size: snapshot.annotations.length,
          canUndo: snapshot.canUndo,
          canRedo: snapshot.canRedo
        }
      })

      // 注册并使用 Web Component 工具条
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
      this.seed()
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
    addAnnotation (type) {
      const p1 = this.randomPoint()
      if (type === 'point') {
        this.store.add({
          type: 'point',
          positions: [p1],
          style: { color: '#ffcc00', pointSize: 10 }
        })
        return
      }
      if (type === 'polyline') {
        const p2 = this.randomPoint()
        this.store.add({
          type: 'polyline',
          positions: [p1, p2],
          style: { color: '#4fc3f7', lineWidth: 3 }
        })
        return
      }
      // polygon
      const p2 = this.randomPoint()
      const p3 = this.randomPoint()
      this.store.add({
        type: 'polygon',
        positions: [p1, p2, p3],
        style: { color: '#66bb6a', clampToGround: true }
      })
    },
    seed () {
      this.store.add({
        type: 'point',
        positions: [[CENTER[0], CENTER[1]]],
        style: { color: '#ff5252', pointSize: 12 }
      })
      this.store.add({
        type: 'polyline',
        positions: [
          [CENTER[0] - 0.004, CENTER[1] - 0.004],
          [CENTER[0] + 0.004, CENTER[1] + 0.004]
        ],
        style: { color: '#ffd740', lineWidth: 3 }
      })
    },
    undo () {
      this.store.undo()
    },
    redo () {
      this.store.redo()
    },
    exportJson () {
      this.jsonPreview = JSON.stringify(this.store.toJSON(), null, 2)
    },
    loadJson () {
      if (!this.jsonPreview) {
        this.jsonPreview = JSON.stringify(this.store.toJSON(), null, 2)
        return
      }
      try {
        this.store.load(JSON.parse(this.jsonPreview))
      } catch (error) {
        console.warn('JSON 解析失败', error)
      }
    },
    clearAll () {
      this.store.clear()
    }
  }
}
</script>

<style lang="scss" scoped>
.annotation-plane {
  position: relative;
  .map3d-contaner {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .box-card {
    width: 320px;
    position: absolute;
    top: 3px;
    right: 3px;
    z-index: 3;
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .toolbar-host {
      margin-bottom: 10px;
    }
    .group-btn {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      .el-button {
        margin-left: 0;
      }
    }
    .status {
      margin-top: 10px;
      font-size: 12px;
      color: #cfd8e3;
    }
    .json-preview {
      margin-top: 10px;
      max-height: 180px;
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
