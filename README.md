## cesium_dev_kit

[![NPM Package][npm]][npm-url]
[![Build Size][build-size]][build-size-url]
[![NPM DownloadsWeekly][npm-download]][npmtrends-url]
[![Build Status][build-main]][build-status]
[![NPM Downloads][npm-downloads]][npmdownloads-url]

## 简介

旨在封装一个 Cesium 基本操作的工具包，提供简单的方法调用来实现复杂的 API 操作；达到节省阅读 Cesium 原文档时间，从而降低入门难度提升学习信心，同时也希望能提高工作效率减少重复劳动；案例中封装了常用功能配备使用案例，npm 安装后可以直接在项目中使用。

## 功能展示

- 材质
  ![material](https://github.com/dengxiaoning/cesium_dev_kit/blob/master/src/assets/image/preview/material.gif)
- 分析
  ![analysis](https://github.com/dengxiaoning/cesium_dev_kit/blob/master/src/assets/image/preview/analysis.gif)
- 标绘
  ![plot](https://github.com/dengxiaoning/cesium_dev_kit/blob/master/src/assets/image/preview/plot.gif)
- 拖拽
  ![drag](https://github.com/dengxiaoning/cesium_dev_kit/blob/master/src/assets/image/preview/drag.gif)
- 雷达扫描
  ![radar](https://github.com/dengxiaoning/cesium_dev_kit/blob/master/src/assets/image/preview/radar.gif)

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

[https://github.com/dengxiaoning/cesium_kit_test](https://github.com/dengxiaoning/cesium_kit_test)这是一个 vue 项目已安装 cesium_dev_kit,其中有使用 demo,可直接下载到本地运行查看参照

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

<small>感兴趣朋友可以一起讨论交流继续完善功能，让工作效率更高、开发更加容易、生活更加惬意。</small>

[npm]: https://img.shields.io/npm/v/cesium_dev_kit
[npm-url]: https://www.npmjs.com/package/cesium_dev_kit
[build-size]: https://badgen.net/bundlephobia/minzip/cesium_dev_kit
[build-size-url]: https://bundlephobia.com/result?p=cesium_dev_kit
[npm-download]: https://img.shields.io/npm/dw/cesium_dev_kit
[npmtrends-url]: https://www.npmtrends.com/cesium_dev_kit
[build-main]: https://api.travis-ci.com/dengxiaoning/cesium_dev_kit.svg?branch=main
[build-status]: https://travis-ci.com/dengxiaoning/cesium_dev_kit
[npm-downloads]: https://img.shields.io/npm/dt/cesium_dev_kit.svg
[npmdownloads-url]: https://www.npmjs.com/package/cesium_dev_kit
