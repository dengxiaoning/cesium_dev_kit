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
import { vertexShaderSource, fragmentShaderSource } from './shader/fireworksGlsl'
import { defaultStatic } from '../defaultStaticConf';
let plane;

let center = [104.081701757991, 30.627042558105988];
export default {
  mounted () {
    this.initMap()
  },
  methods: {
    initMap () {
      const { viewer, threeJs, base, graphics, material } = new initCesium({
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
        MapImageryList: [],
        defaultStatic
      })
      this.c_viewer = viewer;
      this.threeJs = threeJs;
      this.base = base;
      this.graphics = graphics;
      this.material = material
      this.loadTiles()
      // this.material.setDarkEffect();
      this.initThree(this.threeJs);
      // this.getClickPosition()
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
    },
    // 左键点击获取相机位置
    getClickPosition () {
      var $this = this;
      this.base.bindHandelEvent({
        leftClick: function click (event, _handlers) {
          const pos = $this.base.getCameraPosition();
          console.log(pos);
        }
      })
    },
    initThree (ThreeJs) {
      const { scene, camera, renderer } = ThreeJs.initThree({ center, axesHelper: true, fov: 60 });
      // camera.position.z = 4;
      // camera.position.set(0, 0, 500);
      this.initMeshes(scene, renderer);
      this.flyto(scene);
      const _this = this;
      ThreeJs.loop(function (time) {
        scene.update();
        _this.intervalChangeFire(scene, camera, renderer, time)
      })
    },
    initMeshes (scene, renderer) {
      const canvas = renderer.domElement;


      const geometry = new THREE.PlaneGeometry(20000, 20000);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          iResolution: { value: new THREE.Vector2(canvas.clientWidth, canvas.clientHeight) },
          iTime: { value: 0 }
        },
        vertexShader: vertexShaderSource,
        fragmentShader: fragmentShaderSource
      })
      plane = new THREE.Mesh(geometry, material);
      plane.position.set(0, 0, 900);
      scene.add(plane);

    },
    intervalChangeFire (scene, camera, renderer, time) {
      const canvas = renderer.domElement
      if (this.resizeRendererToDisplaySize(renderer)) {
        camera.aspect = canvas.clientWidth / canvas.clientHeight
        camera.updateProjectionMatrix()
      }

      plane.scale.set(4.61 * canvas.clientWidth / canvas.clientHeight, 4.61, 1)
      plane.material.uniforms.iTime = { value: time / 100 }
      plane.material.uniforms.iResolution = { value: new THREE.Vector2(canvas.clientWidth, canvas.clientHeight) }
      renderer.render(scene, camera)
    },
    resizeRendererToDisplaySize (renderer) {
      const canvas = renderer.domElement
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const needResize = canvas.width !== width || canvas.height !== height
      if (needResize) {
        renderer.setSize(width, height, false)
      }
      return needResize
    },
    flyto () {
      this.base.flyTo({
        position: {
          x: -1336901.6349831806,
          y: 5329315.248264118,
          z: 3228217.7598203463
        },
        orientation: {
          heading: Cesium.Math.toRadians(357.8497622450999),
          pitch: Cesium.Math.toRadians(11.114736256126017),
          roll: Cesium.Math.toRadians(0.001503122069652099),
        },
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