<template>
  <div>
    <div id="cesiumContainer" class="map3d-contaner"></div>
  </div>
</template>
<script >
import * as Cesium from 'cesium'
import * as THREE from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { initCesium } from '@/utils/cesiumPluginsExtends/index'
let mixer;
let dirLight;
let clock = new THREE.Clock();
let threeJsCenter = [104.01832061855143, 30.66413246586581];
const colors_pre = [
  new Cesium.Color(77 / 255, 201 / 255, 255 / 255, 1),
  new Cesium.Color(255 / 255, 201 / 255, 38 / 255, 1),
  new Cesium.Color(221 / 255, 221 / 255, 221 / 255, 1)
];
const HEAT_DATA = [{ lng: 104.009628, lat: 30.736313, num: 857 },
{ lng: 104.042587, lat: 30.682755, num: 2043 },
{ lng: 104.038467, lat: 30.693741, num: 2021 },
{ lng: 104.04808, lat: 30.700607, num: 616 },
{ lng: 104.013748, lat: 30.732193, num: 213 },
{ lng: 104.005508, lat: 30.751419, num: 78 },
{ lng: 104.063187, lat: 30.71022, num: 86 },
{ lng: 104.042587, lat: 30.748672, num: 1346 },
{ lng: 104.017868, lat: 30.692368, num: 6000 },
{ lng: 104.061813, lat: 30.700607, num: 53 },
{ lng: 103.962936, lat: 30.717087, num: 513 },
{ lng: 104.100266, lat: 30.766525, num: 129 },
{ lng: 104.045334, lat: 30.741806, num: 327 },
{ lng: 104.039841, lat: 30.719833, num: 516 },
{ lng: 104.028854, lat: 30.71434, num: 1268 },
{ lng: 104.030228, lat: 30.708847, num: 243 },
{ lng: 104.030228, lat: 30.725327, num: 477 },
{ lng: 104.015121, lat: 30.719833, num: 15 },
{ lng: 104.005508, lat: 30.690994, num: 339 },
{ lng: 104.053574, lat: 30.733566, num: 739 },
{ lng: 104.002762, lat: 30.725327, num: 1201 },
{ lng: 104.135971, lat: 30.758286, num: 1384 },
{ lng: 104.043961, lat: 30.696487, num: 998 },
{ lng: 104.039841, lat: 30.725327, num: 300 },
{ lng: 104.085159, lat: 30.793991, num: 4 },
{ lng: 104.043961, lat: 30.697861, num: 154 },
{ lng: 104.021988, lat: 30.736313, num: 383 },
{ lng: 104.071426, lat: 30.682755, num: 245 },
{ lng: 104.075546, lat: 30.682755, num: 1832 },
{ lng: 104.074173, lat: 30.695114, num: 5941 },
{ lng: 104.0522, lat: 30.689621, num: 676 },
{ lng: 104.096146, lat: 30.7267, num: 148 },
{ lng: 104.127731, lat: 30.750046, num: 467 },
{ lng: 104.021988, lat: 30.699234, num: 1118 }];
export default {
  mounted () {
    this.initMap()
  },
  methods: {
    async initMap () {
      const { viewer,
        threeJs,
        material,
        primitive,
        passEffect,
        graphics,
        math3d } = new initCesium(
          {
            cesiumGlobal: Cesium,
            threeGlobal: THREE,
            containerId: 'cesiumContainer',
            viewerConfig: {
              infoBox: false,
              shouldAnimate: true,
              contextOptions: {
                requestWebgl2: true,
              }
            },
            extraConfig: {},
            MapImageryList: []
          })


      this.c_viewer = viewer;
      this.graphics = graphics;
      this.material = material;
      this.passEffect = passEffect;
      this.math3d = math3d;
      this.primitiveObj = primitive;
      this.threeJs = threeJs;
      this.passEffect.setDefSceneConfig()
      this.passEffect.setBloomLightScene()
      viewer.imageryLayers.addImageryProvider(
        new Cesium.Scene.TdtImageryProvider({
          key: '7eb11c0c503429878691ac917238f87f',
          style: 'cia',
        }),
      );
      this.createHeatmap();
      let custPrim = this.primitiveObj.customPrimivive({
        center: [104.04955351965756, 30.71658149756256],
        height1: 0,
        height2: 280,
        scale: 0.006,
        img: 'static/data/images/Textures/beautiful.jpg'
      })
      this.c_viewer.scene.primitives.add(custPrim)

      this.createModel(new Cesium.Cartesian3(-1332295.414560024, 5323929.62021439, 3238927.391234091),
        new Cesium.Cartesian3(-1324363.3465625115, 5326325.315307873, 3239187.462619164));
      this.createModel(new Cesium.Cartesian3(-1332295.414560024, 5323929.62021439, 3238927.391234091),
        new Cesium.Cartesian3(-1336434.2124124765, 5320440.64573102, 3243773.3418101203));
      this.createModel(new Cesium.Cartesian3(-1332295.414560024, 5323929.62021439, 3238927.391234091),
        new Cesium.Cartesian3(-1331220.7799512758, 5322770.7604429675, 3242087.6668156767));
      this.createModel(new Cesium.Cartesian3(-1332295.414560024, 5323929.62021439, 3238927.391234091),
        new Cesium.Cartesian3(-1335328.7458149802, 5325582.975396149, 3235656.4490397833));
      this.createModel(new Cesium.Cartesian3(-1332295.414560024, 5323929.62021439, 3238927.391234091),
        new Cesium.Cartesian3(-1329652.4119767922, 5323869.79833273, 3240808.659022114));
      this.createModel(new Cesium.Cartesian3(-1332295.414560024, 5323929.62021439, 3238927.391234091),
        new Cesium.Cartesian3(-1329843.6405181033, 5326386.837841139, 3236605.1972402423));
      this.createModel(new Cesium.Cartesian3(-1332295.414560024, 5323929.62021439, 3238927.391234091),
        new Cesium.Cartesian3(-1332204.3581683815, 5326367.313051588, 3235961.382028184));


      this.createRadarScan();
      this.createCircleScan();
      this.getClickPosition();
      // this.flyto();
      this.createSatelliteScan();
      this.initThree(this.threeJs);
    },
    flyto () {
      this.material.flyTo({
        position: {
          "x": -1333918.4838154477,
          "y": 5333666.232167955,
          "z": 3228364.0737481005
        },
        orientation: {
          "heading": 6.243674985466009,
          "pitch": -0.17166755275714096,
          "roll": 0.000443376324779976
        }
      })
    },
    createHeatmap () {
      const headMapObjectPivmitive = this.primitiveObj.createHeatmap3d({
        heatData: HEAT_DATA,
        boundsArr: [103.8258, 30.58595, 104.252263, 30.87]
      });
      let primitiveObj = this.c_viewer.scene.primitives.add(headMapObjectPivmitive);
      primitiveObj.show = true;
    },
    createModel (startPoint, endPoint) {
      const _self = this;
      var positions = this.math3d.getLinkedPointList(startPoint, endPoint, 46600, 50);
      this.c_viewer.entities.add({
        polyline: {
          positions: positions,
          width: 5,
          material: _self.getCustomMaterialLine(colors_pre[Math.floor((Math.random() * 3)) % 3]),
        }
      });
    },
    getCustomMaterialLine (colors) {
      return new Cesium.Scene.PolylineFlowMaterialProperty({
        color: colors,
        duration: 200
      })
    },
    createRadarScan () {
      this.passEffect.setRadarScanEffect({
        id: 'radarScanA',
        position: {
          "x": -1332289.9286735181,
          "y": 5323940.662468833,
          "z": 3238914.5052353037
        },
        color: Cesium.Color.LIGHTGREEN.withAlpha(0.8),
        duration: 2000,
        radius: 9800,
        border: -1,
        width: 5.0
      })
    },
    createCircleScan () {
      this.passEffect.setCircleScanEffect({
        id: 'CircleScan',
        position: {
          "x": -1332289.9286735181,
          "y": 5323940.662468833,
          "z": 3238914.5052353037
        },
        color: Cesium.Color.MEDIUMTURQUOISE.withAlpha(0.5),
        duration: 5000,
        border: 10,
        radius: 10000
      })
    },
    createSatelliteScan () {
      this.graphics.createPointsGraphics({
        positions: [Cesium.Cartesian3.fromDegrees(104.13792311260194, 30.770184996113095, 4000.0)],
        billboard: {
          b_img: 'static/data/images/file/satellite.svg',
          b_width: 50,
          b_height: 40,
          b_scale: 1,
          b_pixelOffset: new Cesium.Cartesian2(20, -10)
        }
      })
      this.passEffect.satelliteScan({
        position: [104.13792311260194, 30.770184996113095],
        length: 4000.0,
        color: Cesium.Color.LIGHTGREEN,
        repeat: 40,
        thickness: 0.1
      })
    },
    initThree (ThreeJs) {
      const { scene, renderer } = ThreeJs.initThree({ center: threeJsCenter, threeHabit: false, axesHelper: false });
      this.initLight(scene)

      this.initMeshes(scene, () => {
        ThreeJs.loop(function () {
          scene.update();

          const delta = clock.getDelta();
          mixer && mixer.update(delta);
        })
      });
      this.enableShadow(renderer)
      this.flyto(scene);
    },
    initMeshes (scene, cb) {
      // plane
      // plane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshPhongMaterial({ color: 0x999999 }));
      // plane.rotation.x = -Math.PI / 2;
      // scene.add(plane);
      // model
      const loader = new GLTFLoader();
      loader.load("static/data/model/Soldier.glb", function (gltf) {
        gltf.scene.scale.set(200, 200, 200);
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
    // 左键点击后位置
    getClickPosition () {
      var $this = this;
      this.passEffect.bindHandelEvent({
        leftClick: function click (event, _handlers) {
          const pos = $this.passEffect.getHandlerClickPosition(event);
          console.log(pos);
        }
      })
    },
  },
  beforeUnmount () {
    this.c_viewer = null;
    this.material = null;
    this.passEffect = null;
    this.math3d = null;
    this.primitiveObj = null;
    this.graphics = null;
    this.threeJs = null;
  }
}
</script>
<style lang="scss" scoped>
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
