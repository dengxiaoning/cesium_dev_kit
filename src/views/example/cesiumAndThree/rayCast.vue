<template>
  <div class="content-main">
    <div id="cesiumContainer"></div>
    <div id="threeContainer"></div>
  </div>
</template>

<script>
import * as Cesium from 'cesium';
import * as THREE from 'three';
import { initCesium } from '@/utils/cesiumPluginsExtends/index';
// import { ThreeJs } from '@/utils/cesiumPluginsExtends/singleImport'
import { defaultStatic } from '../defaultStaticConf';

let meshes;
let amount = 5;
let count = Math.pow(amount, 3);
let white = new THREE.Color().setHex(0xffffff);
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2(1, 1);
let color = new THREE.Color();
let center = [104.081701757991, 30.627042558105988];
export default {
  mounted () {
    this.initMap()
    document.addEventListener("mousemove", function (event) {
      mouse.x = (event.clientX / (window.innerWidth + 100)) * 2 - 1; //-1~1
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1; // -1~1
    });
  },
  methods: {
    initMap () {
      const { viewer, threeJs, base } = new initCesium({
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
      this.base = base;
      this.initThree(this.threeJs);
    },

    initThree (ThreeJs) {
      const _this = this;
      const { scene, camera, renderer } = ThreeJs.initThree({ center, axesHelper: true });
      this.initMeshes(scene);
      this.initLight(scene)
      this.flyto(scene);
      ThreeJs.loop(function () {
        _this.modifyColor(camera);
        scene.update();
      })
      // linstener window resize
      window.addEventListener("resize", function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth + 100, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
      });
    },
    initMeshes (scene) {
      const geometry = new THREE.IcosahedronGeometry(0.5, 3); //正二十面体
      const material = new THREE.MeshPhongMaterial({ color: 0xffffff }); // 白色
      meshes = new THREE.InstancedMesh(geometry, material, count);
      let index = 0;
      const offset = (amount - 1) / 2;
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < amount; i++) {
        for (let j = 0; j < amount; j++) {
          for (let k = 0; k < amount; k++) {
            matrix.setPosition(offset - i, offset - j + 2, offset - k); // -4.5~4.5
            meshes.setMatrixAt(index, matrix);
            meshes.setColorAt(index, white);
            index = index + 1;
          }
        }
      }
      scene.add(meshes);
      // scene.add(new THREE.AxesHelper(8000000))
    },
    initLight (scene) {
      const light = new THREE.HemisphereLight(0xffffff, 0x888888);
      light.position.set(0, 1, 0);
      scene.add(light);
    },
    modifyColor (camera) {
      raycaster.setFromCamera(mouse, camera);

      const intersection = raycaster.intersectObject(meshes);

      if (intersection.length > 0) {
        const instanceId = intersection[0].instanceId;
        meshes.getColorAt(instanceId, color);
        if (color.equals(white)) {
          meshes.setColorAt(instanceId, color.setHex(Math.random() * 0xffffff));
          meshes.instanceColor.needsUpdate = true;
        }
      }
    },
    flyto () {
      this.base.flyTo({
        position: Cesium.Cartesian3.fromDegrees(center[0], center[1] - 0.00006, 15),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-60),
          roll: Cesium.Math.toRadians(0),
        },
        distance: 30,
        duration: 1.5
      })
    }
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