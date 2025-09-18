<template>
  <div class="sky-box">
    <div id="cesiumContainer" class="map3d-contaner"></div>
  </div>
</template>
<script >
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'
import { PointLightClass } from './pointLightClass'
import { scanFs } from './glsl/scanFs.js'
import { nightFs } from './glsl/nightFs.js'
let lightSource = null;
export default {
  data () {
    return {
      activeId: 'light',
    }
  },
  mounted () {
    this.initMap()
  },
  methods: {
    async initMap () {
      const tempData = [
        {
          type: 'UrlTemplateImageryProvider',
          option: {
            url: 'https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
          }
        }]
      const {
        viewer,
        material,
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

      this.material = material;
      // let tileset = this.c_viewer.scene.primitives.add(
      //   new Cesium.Cesium3DTileset({
      //     url: 'static/data/3DTiles/building/tileset.json',
      //   }),
      // )
      let tiles = await Cesium.Cesium3DTileset.fromUrl('static/data/3DTiles/building/tileset.json');
      let tileset = this.c_viewer.scene.primitives.add(tiles)
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

      // this.pointLight(viewer)
      // this.material.setRainEffect();
      viewer.scene.postProcessStages.bloom.enabled = true
      viewer.scene.postProcessStages.bloom.uniforms.contrast = 119
      viewer.scene.postProcessStages.bloom.uniforms.brightness = -0.4
      viewer.scene.postProcessStages.bloom.uniforms.glowOnly = false
      viewer.scene.postProcessStages.bloom.uniforms.delta = 0.9
      viewer.scene.postProcessStages.bloom.uniforms.sigma = 3.78
      viewer.scene.postProcessStages.bloom.uniforms.stepSize = 5

      tileset.customShader = this.addPointLight()
      // this.addNightTexture(tileset)
      // this.addScanCircle(tileset)
      this.handleMapClick(tileset)
    },
    // test场景点击取点
    handleMapClick (tileset) {
      const viewer = this.c_viewer;
      let scene = viewer.scene;
      let handler = new Cesium.ScreenSpaceEventHandler(scene.canvas)
      handler.setInputAction(e => {
        let pickPositionElliposid = scene.camera.pickEllipsoid(e.position, scene.globe.elliposid);
        let cameraPosition = {
          cameraPosistion: viewer.camera.position,
          heading: viewer.camera.heading,
          pitch: viewer.camera.pitch,
          roll: viewer.camera.roll
        };
        console.log('cameraPosition : ', cameraPosition)

        // 将迪卡转换为地理坐标
        let cartographic = Cesium.Cartographic.fromCartesian(pickPositionElliposid)
        if (cartographic.height < 0) cartographic.height = 0
        let graphicCoor = {
          lon: Cesium.Math.toDegrees(cartographic.longitude),
          lat: Cesium.Math.toDegrees(cartographic.latitude),
          height: cartographic.height
        };
        const cartesians1 = Cesium.Cartesian3.fromDegrees(Cesium.Math.toDegrees(cartographic.longitude), Cesium.Math.toDegrees(cartographic.latitude));

        viewer.scene.clampToHeightMostDetailed([cartesians1])
          .then(clampedCartesians => {
            console.log(clampedCartesians);
            this.pointLight(viewer, clampedCartesians[0])
          })
        tileset.customShader.uniforms.u_lightPosition.value = Cesium.Cartesian3.fromDegrees(graphicCoor.lon, graphicCoor.lat, graphicCoor.height),
          console.log('点击位置：', graphicCoor)
        console.log("longitude:", cartographic.longitude, "latitude：", cartographic.latitude)
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    },
    addNightTexture (tileset) {
      const customShader = new Cesium.CustomShader({
        uniforms: {
          u_texture: {
            type: Cesium.UniformType.SAMPLER_2D,
            value: new Cesium.TextureUniform({
              url: 'static/data/images/Textures/g1.png',
            }),
          },
          u_pictureSize: {
            type: Cesium.UniformType.FLOAT,
            value: 100.0,
          },
        },
        varyings: {
          v_normalMC: Cesium.VaryingType.VEC3,
        },
        vertexShaderText: /*glsl*/ `
            void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput) {
                // normalMC可以在顶点中，通过vsInput获取
                v_normalMC=vsInput.attributes.normalMC;
            }
        `,
        fragmentShaderText: nightFs,
      })
      tileset.customShader = customShader
    },
    // 白膜的上下扫光功能
    addScanCircle (tileset) {
      const customShader = new Cesium.CustomShader({
        uniforms: {
          // 地上的最高高度
          maxHeight: {
            type: Cesium.UniformType.FLOAT,
            value: 320.0,
          },
          //经过debug法线，在模型的地下，还有一截高度，这个高度，我测试出来是380m左右
          groundHeight: {
            type: Cesium.UniformType.FLOAT,
            value: 380.0,
          },
          u_scanWidth: {
            type: Cesium.UniformType.FLOAT,
            value: 0.005,
          },
        },
        varyings: {
          v_normalMC: Cesium.VaryingType.VEC3,
        },
        vertexShaderText: /*glsl*/ `
            void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput) {
                // normalMC可以在顶点中，通过vsInput获取
                v_normalMC=vsInput.attributes.normalMC;
            }
        `,
        fragmentShaderText: scanFs,
      })
      tileset.customShader = customShader
    },
    pointLight (viewer, pos) {
      if (lightSource) viewer.entities.remove(lightSource)
      lightSource = viewer.entities.add({
        position: pos,// Cesium.Cartesian3.fromDegrees(pos[0], pos[1], 0), // 经度、纬度、高度
        point: {
          pixelSize: 10, // 点光源的大小
          color: new Cesium.Color(1.0, 1.0, 0.0, 1.0), // 黄色
          outlineColor: new Cesium.Color(1.0, 1.0, 0.0, 1.0), // 黄色轮廓
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
        }
      });

    },
    addPointLight () {
      const customShader = new Cesium.CustomShader({
        uniforms: {
          // [121.44835554037566, 31.2328027614941]
          u_lightPosition: {
            type: Cesium.UniformType.VEC3,
            value: Cesium.Cartesian3.fromDegrees(104.0781440394156, 30.636487106351836, 0),
          },
          u_lightColor: {
            type: Cesium.UniformType.VEC3,
            value: Cesium.Color.fromCssColorString('#6900ff'),
          },
          u_lightRadius: {
            type: Cesium.UniformType.FLOAT,
            value: 1000,
          },
        },
        varyings: {
          v_normalMC: Cesium.VaryingType.VEC3,
        },
        vertexShaderText: /*glsl*/ `
                void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput) {
                    // normalMC可以在顶点中，通过vsInput获取
                    v_normalMC=vsInput.attributes.normalMC;
                }
            `,
        fragmentShaderText: /*glsl*/ `
            vec3 createPointLight(vec3 positionWC){
                // pow(clamp(1.-lightDistance/u_lightRadius,0. ,1.),2. );
                // lightDistance就是当前片元和点光源中心点的距离
                // length可以计算向量模,这里用当前的世界坐标-点光源的世界坐标
                float lightDistance=length(positionWC-u_lightPosition);
                float intensity=pow(clamp(1.-lightDistance/u_lightRadius,0. ,1.),2.);
                return u_lightColor*intensity;
            }
            void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material){
                vec3 positionWC=fsInput.attributes.positionWC;
                vec3 lightColor=createPointLight(positionWC);
                vec3 positionMC=fsInput.attributes.positionMC;
                float czm_height=clamp((positionMC.z-380.)/320.,0.0,1.0);
                // 给白膜添加渐变
                material.diffuse*=czm_height;
                // 添加点光源
                material.diffuse+=lightColor;
            }
        `,
      })
      return customShader
    }
  },
  beforeUnmount () {
    this.c_viewer = null;
    this.material = null;
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
</style>
