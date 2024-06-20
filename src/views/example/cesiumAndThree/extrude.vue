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
      this.graphics = graphics;
      this.material = material
      this.initThree(this.threeJs);
      // this.getClickPosition()
      this.createAEllipsoid();
      this.createAFanShape();
    },

    initThree (ThreeJs) {
      const { scene, camera } = ThreeJs.initThree({ center, axesHelper: true, threeHabit: false });
      this.initLight(scene, camera)
      this.initMeshes(scene);
      this.flyto(scene);
      ThreeJs.loop(function () {
        scene.update();
      })
    },
    initMeshes (scene) {
      // 环形 extrude
      /**
       * 1、创建path
       *     #------------
       *      \            \
       *       #             #
       *       /             /
       *      /             #
       *      # ------------
       *
       */
      const closedSpline = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-60, 30, 60), // 左下
        new THREE.Vector3(-60, 100, 60), // 左中
        new THREE.Vector3(-60, 220, 60), // 左上
        new THREE.Vector3(60, 80, -60), // 右中
        new THREE.Vector3(60, 30, -60), // 右下
      ]);
      // 2、extrude settings
      closedSpline.curveType = "catmullrom";
      closedSpline.closed = true;
      const extrudeSettings = {
        steps: 100,
        bevelEnabled: false,
        extrudePath: closedSpline,
      };
      // 3、construct shape
      const r = 20; // 截面半径
      const pts1 = [];
      const count = 3; // 截面的棱边数量
      for (let index = 0; index < count; index++) {
        // index/count 几分之几，2π为周长
        const a = (index / count) * Math.PI * 2;
        pts1.push(new THREE.Vector2(r * Math.cos(a), r * Math.sin(a)));
      }
      const shape1 = new THREE.Shape(pts1);
      // create geometry
      const geometry1 = new THREE.ExtrudeGeometry(shape1, extrudeSettings);
      // create material
      const material1 = new THREE.MeshLambertMaterial({
        color: 0xb00000,
      });
      // assembly meshes
      const mesh1 = new THREE.Mesh(geometry1, material1);
      // add mesh to scene
      scene.add(mesh1);

      // 第二个物体
      // path
      const randomPoints = [];
      for (let index = 0; index < 10; index++) {
        randomPoints.push(
          new THREE.Vector3((index - 4.5) * 80, THREE.MathUtils.randFloat(100, 150), THREE.MathUtils.randFloat(-50, 50))
        );
      }
      const randomSpline = new THREE.CatmullRomCurve3(randomPoints);
      const extrudeSettings2 = {
        steps: 200,
        bevelEnabled: false,
        extrudePath: randomSpline,
      };
      // shape
      const pts2 = [],
        numPts = 5;
      // 五角星是五个角十条边
      for (let i = 0; i < numPts * 2; i++) {
        // 计算radius 半径，基数为10反正20（就是内外圆计算）
        const r = i % 2 == 1 ? 10 : 20;
        // 角度
        const a = (i / numPts) * Math.PI;
        pts2.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
      }
      const shape2 = new THREE.Shape(pts2);
      const geometry2 = new THREE.ExtrudeGeometry(shape2, extrudeSettings2);
      const material2 = new THREE.MeshLambertMaterial({ color: 0xff8000 });
      const mesh2 = new THREE.Mesh(geometry2, material2);
      scene.add(mesh2);

      // 第三个物体
      const material3 = [material1, material2];
      const extrudeSettings3 = {
        depth: 20,
        steps: 1,
        bevelEnabled: true,
        bevelThickness: 2,
        bevelSize: 4,
        bevelSegments: 1,
      };
      const geometry3 = new THREE.ExtrudeGeometry(shape2, extrudeSettings3);
      const mesh3 = new THREE.Mesh(geometry3, material3);
      mesh3.position.set(50, 220, 50);
      scene.add(mesh3);
    },
    initLight (scene) {
      scene.add(new THREE.AmbientLight(0xffffff, 0.2));
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x888888);
      hemiLight.position.set(0, 1, 0);
      scene.add(hemiLight);
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
    flyto () {
      this.base.flyTo({
        position: {
          x: -1337040.1191728008,
          y: 5329573.2418631995,
          z: 3229397.360308857
        },
        orientation: {
          roll: Cesium.Math.toRadians(0.0018649408425688095),
          heading: Cesium.Math.toRadians(345.96071189778115),
          pitch: Cesium.Math.toRadians(-23.882613138384933)
        },
        duration: 1.5
      })
    },
    createCustMaterialWall (imgUrl, colorVal, durationNum, countNum, directionStr) {
      return this.material.getCustomMaterialWall({
        image: imgUrl,
        freely: 'cross',
        direction: directionStr || '+',
        count: countNum,
        color: colorVal,
        duration: durationNum
      })
    },
    // 创建椭圆体
    createAEllipsoid () {
      var position = Cesium.Cartesian3.fromDegrees(
        104.07846516112014,
        30.628804685534107,
      )
      var ellipsoid = this.graphics.getEllipsoidGraphics({
        radii: 200,
        material: Cesium.Color.AQUAMARINE.withAlpha(0.3),
        outline: true,
        outlineColor: Cesium.Color.AQUAMARINE.withAlpha(0.5),
      })
      let three2 = this.c_viewer.entities.add({
        name: 'oneEllipsoid',
        position: position,
        ellipsoid: ellipsoid
      });

    },
    // 创建一个扫描扇形
    createAFanShape () {
      /**
        * @param {Object} viewer cesium 视图对象
        * @param {Material} custMaterial 自定义材质
        * @param {Number} speed 运动速度(为0停止扫描)
        * @param {Number} longitude 纬度
        * @param {Number} latitude 经度
        * @param {Number} alt 高度(z轴)
        * @param {String} direction 扫描方向（"-"顺时针，"+"逆时针）
       */
      const fanEntity = this.graphics.createFanShape({
        viewer: this.c_viewer,
        longitude: 104.07846516112014,
        latitude: 30.628804685534107,
        alt: 200,
        speed: 2.0,
        direction: '+',
        // custMaterial: Cesium.Color.AQUAMARINE.withAlpha(0.5)
        custMaterial: this.createCustMaterialWall(
          'static/data/images/Textures/b2.png',
          Cesium.Color.GOLD,
          2000,
          1.0,
          '+'
        )
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