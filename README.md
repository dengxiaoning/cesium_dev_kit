## cesium_dev_kit

[![Build Status][build-main]][build-status]
[![NPM Package][npm]][npm-url]
[![Build Size][build-size]][build-size-url]
[![NPM DownloadsWeekly][npm-download]][npmtrends-url]
[![license][license-uri]][license-link]

## 简介

这是一个 Cesium 开发工具包，包含图层加载、坐标转换、坐标拾取、相机控制、测量、标绘、模型加载、模型平移旋转缩放、模型/3Dtiles 视角位置调整、模型拖拽、天气（雨，雪，雾）场景、雷达扫描、信息框、流动线、发光线、动态墙等各种发光材质、后置场景效果、通视分析、透视分析、坡度分析、淹没分析、方量分析、地形开挖等各种分析案例。

## 功能展示

- 材质
  ![material](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/material.gif)
- 分析
  ![analysis](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/analysis.gif)
- 标绘
  ![plot](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/plot.gif)
- 拖拽
  ![drag](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/drag.gif)
- 雷达扫描
  ![radar](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/radar.gif)
- 第一人称漫游
  ![radar](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/pathRoam.gif)

## 在线预览

[https://www.benpaodehenji.com/cesiumDevKit](https://www.benpaodehenji.com/cesiumDevKit)

## 安装

```shell

 npm install cesium_dev_kit

```

## 引入

```

import { initCesium } from 'cesium_dev_kit'

```

## 使用

### 1、引入所有模块

```javaScript
// test.vue
<template>
  <div id="cesiumContainer"
       class="map3d-contaner"></div>
</template>
<script>
import { initCesium } from 'cesium_dev_kit'
export default {
  mounted() {
    this.initMap()
  },
  methods: {
    initMap() {
      const {
        viewer,   // viewer
        material, // 材质模块（修改实体材质）
        graphics, // 图形模块（如创建PolygonGraphics对象等）
        math3d, // 三维数学工具
        primitive, // 图元操作对象（如使用primivite创建polygon等）
        draw, // 绘制模块（如多边形，矩形）
        passEffect, // 后置处理模块
        customCesiumPlugin,
        control, // 控制模块（如模型位置调整，拖拽等）
        plugin, // 额外插件（如拓展css3的动画 ，地形裁剪）
        base, // 基础模块（如坐标转换，图层初始化等）
        analysis, // 分析模块（如坡度，坡向，可视域，通视分析）
        attackArrowObj, // 标绘（攻击）
        straightArrowObj,// 标绘（直击）
        pincerArrowObj, // 标绘（钳击）
      } = new initCesium(
          {
            cesiumGlobal: Cesium,
            containerId: 'cesiumContainer',
            viewerConfig: {
              infoBox: false,
              shouldAnimate: true,
            },
            extraConfig: {},
            MapImageryList: []
          })
    }
  }
}
</script>
```

### 2、按需引入

```javaScript
// test.vue
<template>
  <div id="cesiumContainer"
       class="map3d-contaner"></div>
</template>
<script>

  /**
  * 可导出对象 {Graphics, Material,Primitive,Draw,Analysis,CustomCesiumPlugin,PassEffect,Plugin}
  * Graphics:各种图形操作、Material: 材质操作、Primitive: 配合shader的各种图元操作
  * Draw: 各种绘制对象、Analysis: 各种分析对象、CustomCesiumPlugin: 自定义相控扩展
  * PassEffect: 后期特效对象、Plugin: 各种扩展功能
   */
import { Draw } from 'cesium_dev_kit'
export default {
  mounted() {
    this.initMap()
  },
  methods: {
    initMap() {
        const tempData = [
        {
          id: 3,
          name: '高德地图02',
          type: 'UrlTemplateImageryProvider',
          classConfig: {
            url: 'https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
          },
          interfaceConfig: {},
          offset: '0,0',
          invertswitch: 0,
          filterRGB: '#ffffff',
          showswitch: 1,
          weigh: 13,
          createtime: 1624346908,
          updatetime: 1647395260,
        }]

      const drawObj = new Draw({
        cesiumGlobal: Cesium, // 全局Cesium对象
        containerId: 'cesiumContainer', // 容器id
        viewerConfig: { // 同官方的viewer配置相同
          infoBox: false,
          shouldAnimate: true,
        },
        extraConfig: {// 其他配置
          logo:true, // 是否显示logo
          depthTest:true // 是否开启深度测试
        },
        MapImageryList: tempData // 底图配置
        defaultStatic // 默认服务器地址以及材质等基础信息配置，具体请参考src\views\example\defaultStaticConf\index.js
      })

      this.c_viewer = drawObj.viewer
      this.draw = drawObj.draw
      this.draw.setDefSceneConfig()
      this.draw.setBloomLightScene()
      this.load3dTiles(drawObj.viewer)

      this.StraightArrowObj = drawObj.straightArrowObj
      this.AttackArrowObj = drawObj.attackArrowObj
      this.PincerArrowObj = drawObj.pincerArrowObj
    }
  }
}
</script>
```

### 如需在 H5 中使用

- html 中直接引入 index.umd.js

```javaScript
	<script type="text/javascript" src="index.umd.js"></script>
```

- 初始化对象

```javaScript
  new cesium_dev_kit.initCesium({...})
```

## API

### initCesium

**参数**

- `cesiumGlobal` **Object** Ceiusm 对象
- `containerId` **String** 容器 id
- `viewerConfig` **Object** viewer 基础配置（与官网一致）
- `extreaConfig` **Object** 额外参数配置，如 {logo：true// 是否显示 logo, depthTest：true //开启深度检测}
- `MapImageryList` **Object** 配置底图,参考 ImageryProvider

```javaScript
  /**
   * 初始化入口函数
   * @param {*} param0
   * {
   *   cesiumGlobal：{Object} Ceiusm对象（项目需要安装配置获取Cesium传入）
   *   containerId:{String} 容器id
   *   viewerConfig:{Object} viewer基础配置
   *      【参数格式】：{与官网一致}
   *   extreaConfig：{Object }
   *     【参数格式】：
   *       {
   *        logo：true，// 是否显示logo
   *        depthTest：true， //开启深度检测
   *      }
   *   MapImageryList:{Array} 配置底图，每一个元素格式为
   *    【参数格式】 ：
   *      [{
   *        id: 3,
   *        name: '',
   *        type: '',//ImageryProvider类型
   *         classConfig: {
   *          url:  链接地址
   *        },
   *        interfaceConfig: {},
   *        offset: '0,0',
   *        invertswitch: 0,
   *        filterRGB: '#ffffff',
   *        showswitch: 1,
   *        weight: 13,
   *        createtime: 创建时间
   *        updatetime: 更新时间,
   *    }]
   *
   * }
   * @returns
   */
```

## 使用范例

- ES6 使用案例
  [https://github.com/dengxiaoning/cesium_kit_test](https://github.com/dengxiaoning/cesium_kit_test)

- H5 使用案例
  [https://github.com/dengxiaoning/cesium_kit_test_h5](https://github.com/dengxiaoning/cesium_kit_test_h5)

##

## 浏览器支持

本地开发推荐使用`Chrome 80+` 浏览器

支持现代（chrome，Firefox，Microsoft edge，etc.）浏览器, 不支持 IE

## 鸣谢

[cesium-d3kit](https://github.com/zhangti0708/cesium-d3kit)<br/>
[drawarrowforcesium](https://gitcode.net/mirrors/gitgitczl/drawarrowforcesium)<br/>
[vue3-ts-cesium-map-show](https://gitee.com/hawk86104/vue3-ts-cesium-map-show)<br/>

本项目包括但不限于借鉴和参考以上资料，非常感谢作者分享

## 项目不足与优化

- 1、cesium 工具类未使用 typeScript
- 2、未配备使用文档（请参考案例）
- 3、未作异常捕捉和处理

<small>感兴趣朋友可以一起讨论交流继续完善功能，让工作效更高效、开发更简单、生活更惬意。</small>

[npm]: https://img.shields.io/npm/v/cesium_dev_kit
[npm-url]: https://www.npmjs.com/package/cesium_dev_kit
[build-size]: https://img.shields.io/bundlephobia/minzip/cesium_dev_kit/1.0.57
[build-size-url]: https://img.shields.io/bundlephobia/minzip/cesium_dev_kit
[npm-download]: https://img.shields.io/npm/dt/cesium_dev_kit
[npmtrends-url]: https://www.npmtrends.com/cesium_dev_kit
[license-uri]: https://img.shields.io/npm/l/cesium_dev_kit.svg
[license-link]: https://npm.im/cesium_dev_kit
[build-status]: https://github.com/dengxiaoning/cesium_dev_kit
[build-main]: https://img.shields.io/github/actions/workflow/status/dengxiaoning/cesium_dev_kit/project-build.yml?branch=main
