## cesium_dev_kit

[![Build Status][build-main]][build-status]
[![NPM Package][npm]][npm-url]
[![NPM DownloadsWeekly][npm-download]][npmtrends-url]
[![Build Size][build-size]][build-size-url]
[![GitHub Repo stars][repo-stars]][star-chart]
[![license][license-uri]][license-link]

[English](./README.md) | **中文**

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

[https://benpaodehenji.com/cesiumDevKit](https://benpaodehenji.com/cesiumDevKit)

## 安装

```shell
npm install cesium_dev_kit
```

## 引入

```
import { initCesium } from 'cesium_dev_kit'
```

## 使用

### 1、完整引入

通过初始化`initCesium` 可以获取到所有扩展模块

### 1.1 initCesium 参数配置

| Property         | Type   | Description                                                                   | Default   |
| ---------------- | ------ | ----------------------------------------------------------------------------- | --------- |
| cesiumGlobal     | Object | Cesium 对象                                                                   | undefined |
| threeGlobal      | Object | THREE 对象                                                                    | undefined |
| containerId      | String | Cesium 挂载 dom 容器 id                                                       | undefined |
| threeContainerId | String | Three 挂载 dom 容器 id                                                        | undefined |
| viewerConfig     | Object | viewer 基础配置（与官网一致）                                                 | {}        |
| extreaConfig     | Object | 额外参数配置，如 {logo：true// 是否显示 logo, depthTest：true //开启深度检测} | {}        |
| MapImageryList   | Array  | 配置底图,参考 ImageryProvider                                                 | []        |
| defaultStatic    | Array  | 着色器使用的静态资源配置(如图片 url)                                          | undefined |

### 1.2 initCesium 返回对象

| name               | Type   | Description                                      |
| ------------------ | ------ | ------------------------------------------------ |
| viewer             | Object | Cesium 实例对象                                  |
| material           | Object | 材质模块（修改实体材质）                         |
| graphics           | Object | 图形模块（如创建 PolygonGraphics 对象等）        |
| math3d             | Object | 三维数学工具                                     |
| primitive          | Object | 图元操作对象（如使用 primivite 创建 polygon 等） |
| draw               | Object | 绘制模块（如多边形，矩形）                       |
| passEffect         | Object | 后置处理模块                                     |
| customCesiumPlugin | Object | 自定义传感器扩展                                 |
| control            | Object | 控制模块（如模型位置调整，拖拽等）               |
| plugin             | Object | 额外插件（如拓展 css3 的动画 ，地形裁剪）        |
| base               | Object | 基础模块（如坐标转换，图层初始化等）             |
| analysis           | Object | 分析模块（如坡度，坡向，可视域，通视分析）       |
| attackArrowObj     | Object | 标绘（攻击）                                     |
| straightArrowObj   | Object | 标绘（直击）                                     |
| pincerArrowObj     | Object | 标绘（钳击）                                     |
| ThreeJs            | Object | 集成 ThreeJS 扩展对象                            |

### 1.3 使用案例

```javaScript
// test.vue
<template>
  <div id="cesiumContainer" class="map3d-contaner"></div>
</template>
<script>
import { initCesium } from 'cesium_dev_kit'
import { defaultStatic } from '../defaultStaticConf'
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
        }
      ]
      const { viewer,material,graphics} =
          new initCesium({
            cesiumGlobal: Cesium,
            containerId: 'cesiumContainer',
            viewerConfig: {
              infoBox: false,
              shouldAnimate: true,
            },
            extraConfig: {
              depthTest: true
            },
            MapImageryList: tempData,
            defaultStatic
          })
    }
  }
}
</script>
```

### 2、按需引入

可根据功能需求导出单一扩展类，减少代码冗余

```javaScript
import {Graphics, Material,Primitive,Draw,Analysis,CustomCesiumPlugin,PassEffect,Plugin,ThreeJs} from 'cesium_dev_kit'
```

### 2.1 扩展类：

- Graphics:各种图形操作
- Material: 材质操作
- Primitive: 配合 shader 的各种图元操作
- Draw: 各种绘制对象
- Analysis: 各种分析对象
- CustomCesiumPlugin: 自定义相控扩展
- PassEffect: 后期特效对象
- Plugin: 各种扩展功能
- ThreeJs: 集成 ThreeJS 扩展对象

### 2.2 Draw 使用案例：

```javaScript
// test.vue
<template>
  <div id="cesiumContainer" class="map3d-contaner"></div>
</template>
<script>
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

- 1、扩展类未使用类型检测(TS)
- 2、未配备使用文档（请参考案例）
- 3、未作异常捕捉和处理

## 如何贡献

<a href="https://github.com/dengxiaoning/cesium_dev_kit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=dengxiaoning/cesium_dev_kit" />
</a>

你可以[提一个 issue](https://github.com/dengxiaoning/cesium_dev_kit/issues/new) 或者提交一个 Pull Request。

**Pull Request:**

1. Fork 代码
2. 创建自己的分支: `git checkout -b feat/xxxx`
3. 提交你的修改: `git commit -am 'feat(function): add xxxxx'`
4. 推送您的分支: `git push origin feat/xxxx`
5. 提交 `pull request`

## Git 贡献提交规范

- `feat` 新功能
- `fix` 修补 bug
- `docs` 文档
- `style` 格式、样式(不影响代码运行的变动)
- `refactor` 重构(即不是新增功能，也不是修改 BUG 的代码)
- `perf` 优化相关，比如提升性能、体验
- `test` 添加测试
- `build` 编译相关的修改，对项目构建或者依赖的改动
- `ci` 持续集成修改
- `chore` 构建过程或辅助工具的变动
- `revert` 回滚到上一个版本
- `workflow` 工作流改进
- `mod` 不确定分类的修改
- `wip` 开发中
- `types` 类型

<small>欢迎感兴趣朋友加入一起完善功能，让工作效更高效、开发更简单、生活更惬意。</small>

## `Star`

非常感谢留下星星的好心人，感谢您的支持 :heart:

[![Stargazers repo roster for @dengxiaoning/cesium_dev_kit][stargazers-url]][stargazers-link]

## `Fork`

@sincely、`@ooil929`、 @InPanda、 `luyufanzhi`、AllenChiangCN、`Liquid-Zhangliquan` :heart:

[![Forkers repo roster for @dengxiaoning/cesium_dev_kit][forkers-url]][forkers-link]

[npm]: https://img.shields.io/npm/v/cesium_dev_kit
[npm-url]: https://www.npmjs.com/package/cesium_dev_kit
[build-size]: https://img.shields.io/bundlephobia/minzip/cesium_dev_kit/1.0.70?logo=travis
[build-size-url]: https://img.shields.io/bundlephobia/minzip/cesium_dev_kit
[npm-download]: https://img.shields.io/npm/dt/cesium_dev_kit?logo=npm
[npmtrends-url]: https://www.npmtrends.com/cesium_dev_kit
[license-uri]: https://img.shields.io/npm/l/cesium_dev_kit.svg
[license-link]: https://npm.im/cesium_dev_kit
[build-status]: https://github.com/dengxiaoning/cesium_dev_kit
[build-main]: https://img.shields.io/github/actions/workflow/status/dengxiaoning/cesium_dev_kit/project-build.yml?branch=main&logo=github
[repo-stars]: https://img.shields.io/github/stars/dengxiaoning/cesium_dev_kit?style=plastic&logo=github
[forkers-url]: https://bytecrank.com/nastyox/reporoster/php/forkersSVG.php?user=dengxiaoning&repo=cesium_dev_kit
[forkers-link]: https://github.com/dengxiaoning/cesium_dev_kit/network/members
[stargazers-url]: https://bytecrank.com/nastyox/reporoster/php/stargazersSVG.php?user=dengxiaoning&repo=cesium_dev_kit
[stargazers-link]: https://github.com/dengxiaoning/cesium_dev_kit/stargazers
[star-chart]: https://api.star-history.com/svg?repos=dengxiaoning/cesium_dev_kit&type=Date
