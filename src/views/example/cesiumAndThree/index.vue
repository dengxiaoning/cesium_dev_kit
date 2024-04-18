<template>
  <div class="content-main">
    <div id="cesiumContainer"></div>
    <div id="threeContainer"></div>
  </div>
</template>

<script>
import * as Cesium from 'cesium';
import * as THREE from 'three';
// import { initCesium } from '@/utils/cesiumPluginsExtends/index';
import { ThreeJs } from '@/utils/cesiumPluginsExtends/singleImport'
import { defaultStatic } from '../defaultStaticConf';

let minWGS84 = [115.23, 39.55];
let maxWGS84 = [116.23, 41.55];
let ce = [];
export default {
  mounted () {
    this.initMap()
  },
  methods: {
    initMap () {
      const ThreeJsObj = new ThreeJs({
        cesiumGlobal: Cesium,
        threeGlobal: THREE,
        containerId: 'cesiumContainer',
        viewerConfig: {
          useDefaultRenderLoop: false,
          selectionIndicator: false,
          infoBox: false,
          shouldAnimate: true,
        },
        extreaConfig: {
          depthTest: true
        },
        MapImageryList: [],
        defaultStatic
      })
      this.c_viewer = ThreeJsObj.viewer;
      this.threeJs = ThreeJsObj.threeJs;

      this.flyto();
      this.initThree(this.threeJs);
    },

    initThree (ThreeJs) {
      const threeDObject = this.create3DOject(ThreeJs, this.c_viewer);
      ThreeJs.addThreeObjects(threeDObject)

      this.c_viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)//解除视角锁定
    },
    flyto () {
      let center = Cesium.Cartesian3.fromDegrees(
        (minWGS84[0] + maxWGS84[0]) / 2,
        ((minWGS84[1] + maxWGS84[1]) / 2) - 1,
        200000
      );
      ce = center;
      // this.c_viewer.camera.flyTo({
      //   destination: center,
      //   orientation: {
      //     heading: Cesium.Math.toRadians(0),
      //     pitch: Cesium.Math.toRadians(-60),
      //     roll: Cesium.Math.toRadians(0)
      //   },
      //   duration: 3
      // });
      const offsetPos = new Cesium.HeadingPitchRange(Cesium.Math.toRadians(0), Cesium.Math.toRadians(-60), 196000.0);
      this.c_viewer.camera.lookAt(center, offsetPos);

    },
    create3DOject (threeObj, viewer) {
      let three = threeObj._three;
      let _3Dobjects = [], _3DOB;
      let entity = {
        name: 'Polygon',
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray([
            minWGS84[0], minWGS84[1],
            maxWGS84[0], minWGS84[1],
            maxWGS84[0], maxWGS84[1],
            minWGS84[0], maxWGS84[1]
          ]),
          material: Cesium.Color.RED.withAlpha(0.1)
        }
      }
      let Polypon = viewer.entities.add(entity);
      let doubleSideMaterial = new THREE.MeshNormalMaterial({
        side: THREE.DoubleSide
      });

      let geometry = new THREE.SphereGeometry(1, 32, 32);
      let sphere = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide }));   //12面体
      // sphere.scale.set(5000,5000,5000);
      // sphere.position.z+=15000;
      // translate "up" in Three.js space so the "bottom" of the mesh is the handle
      sphere.scale.set(5000, 5000, 5000);
      sphere.uuid = "sphere";
      var sphereYup = new THREE.Group();
      sphereYup.add(sphere)
      three.scene.add(sphereYup); // don’t forget to add it to the Three.js scene manually
      sphereYup.position.set(ce.x, ce.y, ce.z);
      _3DOB = threeObj.createThreeObject();
      _3DOB.threeMesh = sphereYup;
      _3DOB.minWGS84 = minWGS84;
      _3DOB.maxWGS84 = maxWGS84;
      _3Dobjects.push(_3DOB);
      geometry = new THREE.DodecahedronGeometry();
      let dodecahedronMesh = new THREE.Mesh(geometry, new THREE.MeshNormalMaterial());   //12面体
      dodecahedronMesh.scale.set(5000, 5000, 5000);
      dodecahedronMesh.position.z += 15000;
      // translate "up" in Three.js space so the "bottom" of the mesh is the handle
      dodecahedronMesh.rotation.x = Math.PI / 2; // rotate mesh for Cesium's Y-up system
      dodecahedronMesh.uuid = "12面体";
      var dodecahedronMeshYup = new THREE.Group();
      dodecahedronMeshYup.add(dodecahedronMesh)
      three.scene.add(dodecahedronMeshYup); // don’t forget to add it to the Three.js scene manually
      dodecahedronMeshYup.position.set(ce.x, ce.y, ce.z);
      //    Assign Three.js object mesh to our object array
      _3DOB = threeObj.createThreeObject();
      _3DOB.threeMesh = dodecahedronMeshYup;
      _3DOB.minWGS84 = minWGS84;
      _3DOB.maxWGS84 = maxWGS84;
      _3Dobjects.push(_3DOB);
      //添加灯光
      //添加点光源
      var spotLight = new THREE.SpotLight(0xffffff);
      spotLight.position.set(0, 0, 50000);
      spotLight.castShadow = true; //设置光源投射阴影
      spotLight.intensity = 1;
      sphereYup.add(spotLight)
      //添加环境光
      var hemiLight = new THREE.HemisphereLight(0xff0000, 0xff0000, 1);
      sphereYup.add(hemiLight);

      return _3Dobjects;
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