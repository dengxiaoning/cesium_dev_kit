<template>
  <div class="content-main">
    <div id="cesiumContainer"></div>
    <div id="threeContainer"></div>
  </div>
</template>

<script>
import * as Cesium from 'cesium';
import * as THREE from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { initCesium } from '@/utils/cesiumPluginsExtends/index';
import { defaultStatic } from '../defaultStaticConf';
let mixer;
let dirLight;
let plane;
let clock = new THREE.Clock();
let center = [104.081701757991, 30.627042558105988];
export default {
  mounted () {
    this.initMap()
  },
  methods: {
    initMap () {
      const { viewer, threeJs, passEffect, graphics } = new initCesium({
        cesiumGlobal: Cesium,
        threeGlobal: THREE,
        containerId: 'cesiumContainer',
        threeContainerId: 'threeContainer',
        viewerConfig: {
          useDefaultRenderLoop: false,
          selectionIndicator: false,
          sceneModePicker: false
        },
        extreaConfig: {
          depthTest: true
        },
        imageryProvider: {
          type: "WebMapTileServiceImageryProvider",
          option: {
            url: "http://t0.tianditu.gov.cn/img_w/wmts?tk=65a5f62a964c1d5b23fa81bc34147973",
            layer: "img",
            style: "default",
            tileMatrixSetID: "w",
            format: "tiles",
            maximumLevel: 18,
          },
        },
        MapImageryList: [{
          type: "WebMapTileServiceImageryProvider",
          option: {
            url: "http://t0.tianditu.gov.cn/cia_w/wmts?tk=65a5f62a964c1d5b23fa81bc34147973",
            layer: "cia",
            style: "default",
            tileMatrixSetID: "w",
            format: "tiles",
            maximumLevel: 18,
          },
        }],
        defaultStatic
      })
      this.c_viewer = viewer;
      this.threeJs = threeJs;
      this.passEffect = passEffect;
      this.graphics = graphics;
      this.initThree(this.threeJs);
      // this.getClickPosition()
      this.loadTiles();
      this.createFireParticle();
      this.createRadarScan();
    },
    loadTiles () {
      let tileset = this.c_viewer.scene.primitives.add(
        new Cesium.Cesium3DTileset({
          url: 'static/data/3DTiles/building/tileset.json',
        }),
      )
      tileset.style = new Cesium.Cesium3DTileStyle({
        color: {
          conditions: [
            ["${height} >= 300", "rgba(0, 149, 251, 0.3)"],
            ["${height} >= 200", "rgb(0, 149, 251, 0.3)"],
            ["${height} >= 100", "rgb(0, 149, 251, 0.3)"],
            ["${height} >= 50", "rgb(0, 149, 251, 0.3)"],
            ["${height} >= 25", "rgb(0, 149, 251, 0.3)"],
            ["${height} >= 10", "rgb(0, 149, 251, 0.3)"],
            ["${height} >= 5", "rgb(0, 149, 251, 0.3)"],
            ["true", "rgb(0, 149, 251, 0.3)"]
          ]
        }
      })
    },
    createFireParticle () {
      const fireParticle = this.passEffect.createFireParticleSystem({
        position: Cesium.Cartesian3.fromDegrees(104.08131979123445, 30.627074837307173, -14.482627767618593),
        emitter: new Cesium.ConeEmitter(Cesium.Math.toRadians(30.0))
      })
      this.c_viewer.scene.primitives.add(fireParticle);
      this.fireParticle = fireParticle;
    },
    initThree (ThreeJs) {
      const { scene, renderer } = ThreeJs.initThree({ center, threeHabit: false, });
      this.initLight(scene)

      this.initMeshes(scene, () => {
        ThreeJs.loop(function () {
          scene.update();

          const delta = clock.getDelta();
          mixer.update(delta);
        })
      });
      this.enableShadow(renderer)
      this.flyto(scene);
      this.getClickPosition()
    },
    initMeshes (scene, cb) {
      // plane
      // plane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshPhongMaterial({ color: 0x999999 }));
      // plane.rotation.x = -Math.PI / 2;
      // scene.add(plane);
      // model
      const loader = new GLTFLoader();
      loader.load("static/data/model/Soldier.glb", function (gltf) {
        scene.add(gltf.scene);
        gltf.scene.traverse(function (object) {
          if (object.isMesh) {
            object.castShadow = true;
          }
        });
        const animation = gltf.animations[1];
        mixer = new THREE.AnimationMixer(gltf.scene);
        const action = mixer.clipAction(animation);
        action.play();
        cb && cb();
      })
    },
    initLight (scene) {
      const hemiLight = new THREE.HemisphereLight(0xffffffff, 0x44444444);
      scene.add(hemiLight);
      dirLight = new THREE.DirectionalLight(0xffffff);
      dirLight.position.set(-3, 10, -10);
      scene.add(dirLight);
    },
    enableShadow (renderer) {
      renderer.shadowMap.enabled = true;
      dirLight.castShadow = true;
      // plane.receiveShadow = true;
    },
    // 创建卫星扫描
    createRadarScan () {
      this.graphics.createPointsGraphics({
        positions: [Cesium.Cartesian3.fromDegrees(104.08166673689728, 30.627102250046814, 10.0)],
        billboard: {
          b_img: 'static/data/images/file/satellite.svg',
          b_width: 50,
          b_height: 40,
          b_scale: 1,
          b_pixelOffset: new Cesium.Cartesian2(20, -10)
        }
      })
      this.passEffect.satelliteScan({
        position: [104.08166673689728, 30.627102250046814],
        length: 10.0,
        color: Cesium.Color.LIGHTGREEN,
        repeat: 40,
        thickness: 0.1
      })
    },
    // 左键点击获取相机位置
    getClickPosition () {
      var $this = this;
      this.passEffect.bindHandelEvent({
        leftClick: function (event, _handlers) {
          const resPos = $this.passEffect.getHandlerClickPosition(event);
          console.log(resPos);
        }
      })
    },
    flyto () {
      this.passEffect.flyTo({
        position: {
          x: -1336530.9847799568,
          y: 5328100.491679563,
          z: 3230393.568189583
        },
        orientation: {
          heading: Cesium.Math.toRadians(257.9375062282311),
          pitch: Cesium.Math.toRadians(-17.89912102479697),
          roll: Cesium.Math.toRadians(359.99998263864757),
        },
        duration: 1.5
      })
    },
  },
  beforeUnmount () {
    this.threeJs.destroyThreeJS();
    this.c_viewer = null;
    this.threeJs = null;
  }
}
</script>
<style scoped>
.content-main {
  width: 100%;
  height: 100vh;
}
#cesiumContainer {
  position: absolute;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100%;
  margin: 0;
  overflow: hidden;
  padding: 0;
  font-family: sans-serif;
}

#threeContainer {
  position: absolute;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100%;
  margin: 0;
  overflow: hidden;
  padding: 0;
  font-family: sans-serif;
  pointer-events: none;
}
</style>