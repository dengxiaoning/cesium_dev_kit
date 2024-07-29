<template>
  <div class="sky-box">
    <div id="cesiumContainer"
         class="map3d-contaner"></div>

    <div class="cust-gui-box"
         id="cust-gui-box"></div>
    <div v-cust-drag-dialog>
      <el-dialog v-model="dialogDirectiveVisible"
                 title="获取模型矩阵"
                 width="30%"
                 :close-on-click-modal="false">
        <p>【modelTransformMatrix】{{ modelTransformMatrix }}</p>
        <p>【modelMatrix】{{ modelMatrix }}</p>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="dialogDirectiveVisible = false">取消</el-button>
            <el-button type="primary"
                       @click="dialogDirectiveVisible = false">
              确定
            </el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  </div>
</template>
<script >
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'
export default {
  data () {
    return {
      dialogDirectiveVisible: false,
      modelMatrix: '',
      modelTransformMatrix: ''
    }
  },
  mounted () {
    this.initMap()
  },
  methods: {
    // 添加地形数据
    async addWorldTerrainAsync (viewer) {
      try {
        const terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(1);
        viewer.terrainProvider = terrainProvider;
      } catch (error) {
        console.log(`Failed to add world imagery: ${error}`);
      }
    },
    initMap () {
      const tempData = [
        {
          type: 'UrlTemplateImageryProvider',
          option: {
            url: 'https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
          }
        }]
      const {
        viewer,
        control,
      } = new initCesium(
        {
          cesiumGlobal: Cesium,
          containerId: 'cesiumContainer',
          viewerConfig: {
            infoBox: false,
            shouldAnimate: true,
          },
          extraConfig: {},
          MapImageryList: tempData
        })


      this.c_viewer = viewer;
      this.addWorldTerrainAsync(viewer);
      this.control = control;
      this.control.setDefSceneConfig()
      this.control.setBloomLightScene()
      let tileset = this.c_viewer.scene.primitives.add(
        new Cesium.Cesium3DTileset({
          url: 'static/data/3DTiles/building/tileset.json',
        }),
      )
      tileset.style = new Cesium.Cesium3DTileStyle({
        color: {
          conditions: [
            ['${height} >= 300', 'rgba(0, 149, 251, 0.3)'],
            ['${height} >= 200', 'rgb(0, 149, 251, 0.3)'],
            ['${height} >= 100', 'rgb(0, 149, 251, 0.3)'],
            ['${height} >= 50', 'rgb(0, 149, 251, 0.3)'],
            ['${height} >= 25', 'rgb(0, 149, 251, 0.3)'],
            ['${height} >= 10', 'rgb(0, 149, 251, 0.3)'],
            ['${height} >= 5', 'rgb(0, 149, 251, 0.3)'],
            ['true', 'rgb(0, 149, 251, 0.3)'],
          ],
        },
      })

      this.c_viewer.flyTo(tileset);
      // 调整后获取到模型矩阵（modelMatrix）和平移矩阵（modelTransformMatrix）
      this.control.showPrimitiveMatrixPanel({
        elementId: 'cust-gui-box', primitives: tileset, cb: resModelMatrix => {
          this.modelTransformMatrix = resModelMatrix.modelTransformMatrix;
          this.modelMatrix = resModelMatrix.modelMatrix;
          this.dialogDirectiveVisible = true;
        }
      });
      // 将获取到的modelMatrix 设置到3dtiles 上面，
      const modelMatrixOrg = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 540, 0, 1]
      //可以注释下面这行 掉看看效果
      tileset.modelMatrix = Cesium.Matrix4.fromArray(modelMatrixOrg);
    }
  },
  beforeUnmount () {
    this.c_viewer = null;
    this.control = null;
  }
}
</script>
<style lang="scss" scoped>
.sky-box {
  position: relative;
}
.map3d-contaner {
  width: 100%;
  height: 100%;
  overflow: hidden;
  .ctrl-group {
    position: absolute;
    top: 10px;
    right: 20px;
    z-index: 999;
    .reset-home-btn {
      color: #36a3f7;
      cursor: pointer;
    }
  }
}
.cust-gui-box {
  position: absolute;
  right: 0px;
  top: 0px;
}
</style>
