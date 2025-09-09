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



## API 文档

API文档详情 [:bookmark_tabs: https://benpaodehenji.com/cesiumDevKitDoc](https://benpaodehenji.com/cesiumDevKitDoc)


## 功能展示

| ![material](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/material.gif) |        ![analysis](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/analysis.gif)        |       ![plot](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/plot.gif)       |
| :---------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------: |
|                                                    材质                                                     |                                                           分析                                                            |                                                      标绘                                                       |
| ![dnyRiver](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/dnyRiver.gif) |         ![extrude](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/extrude.gif)         |     ![effect](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/effect.gif)     |
|                                                    河流                                                     |                                                         图形挤压                                                          |                                                      特效                                                       |
|    ![radar](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/radar.gif)    |        ![roaming](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/pathRoam.gif)         |       ![drag](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/drag.gif)       |
|                                                  雷达案例                                                   |                                                       第一人称漫游                                                        |                                                      拖拽                                                       |
|  ![rayCast](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/rayCast.gif)  | ![fireworksEffect](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/fireworksEffect.gif) | ![aniSoldier](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/aniSoldier.gif) |
|                                                  光线投射                                                   |                                                         烟花效果                                                          |                                                   奔跑的士兵                                                    |
|   ![路线规划](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/pathPlan.gif)   |![自定义图元](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/custPrimitive.gif) |
|  路线规划                                                     | 自定义图元  |

[更多>>](https://benpaodehenji.com/cesiumDevKit)

## 安装

```shell
npm install cesium_dev_kit
```

## 使用

### 1、完整引入

通过初始化`initCesium` 可以获取到所有扩展模块

```javaScript
 import { initCesium } from 'cesium_dev_kit'

 // 自定义viewer
var myViewer = new Cesium.Viewer('cesiumContainer', {
  animation: false, //是否显示动画控件
  homeButton: false, //是否显示home键
  geocoder: false, //是否显示地名查找控件        如果设置为true，则无法查询
  baseLayerPicker: false, //是否显示图层选择控件
  timeline: false, //是否显示时间线控件
  fullscreenButton: true, //是否全屏显示
  scene3DOnly: false, //如果设置为true，则所有几何图形以3D模式绘制以节约GPU资源
  infoBox: false, //是否显示点击要素之后显示的信息
  sceneModePicker: false, //是否显示投影方式控件  三维/二维
  navigationInstructionsInitiallyVisible: false,
  navigationHelpButton: false, //是否显示帮助信息控件
  selectionIndicator: false //是否显示指示器组件
});

// 允许传入一个现有的 Viewer，cesium_dev_kit 将直接使用传入的 Viewer，而不会使用“new Cesium.Viewer()”重新实例化它。
 const {  viewer,  material, ... } = new initCesium({
  cesiumGlobal: Cesium,
  containerId: 'cesiumContainer',
  viewer: myViewer,
  ...})
```

### 2、按需引入

可根据功能需求导出单一扩展类，减少代码冗余

```javaScript
import {Graphics} from 'cesium_dev_kit'

// 自定义viewer
var myViewer = new Cesium.Viewer('cesiumContainer', {
  animation: false, //是否显示动画控件
  homeButton: false, //是否显示home键
  geocoder: false, //是否显示地名查找控件        如果设置为true，则无法查询
  baseLayerPicker: false, //是否显示图层选择控件
  timeline: false, //是否显示时间线控件
  fullscreenButton: true, //是否全屏显示
  scene3DOnly: false, //如果设置为true，则所有几何图形以3D模式绘制以节约GPU资源
  infoBox: false, //是否显示点击要素之后显示的信息
  sceneModePicker: false, //是否显示投影方式控件  三维/二维
  navigationInstructionsInitiallyVisible: false,
  navigationHelpButton: false, //是否显示帮助信息控件
  selectionIndicator: false //是否显示指示器组件
});

// 允许传入一个现有的 Viewer，cesium_dev_kit 将直接使用传入的 Viewer，而不会使用“new Cesium.Viewer()”重新实例化它。
const {viewer,graphics} = new Graphics({
      cesiumGlobal: Cesium,
      //containerId: 'cesiumContainer',
      viewer: myViewer
  })
  graphics.getPointGraphics({
      color:Cesium.Color.GREEN,
      pixelSize:5,
      outlineColor:Cesium.Color.WHITE,
      outlineWidth:1
  })
```



---

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

- React Use case
  [https://github.com/dengxiaoning/react-cesium](https://github.com/dengxiaoning/react-cesium)
- H5 使用案例
  [https://github.com/dengxiaoning/cesium_kit_test_h5](https://github.com/dengxiaoning/cesium_kit_test_h5)

## 捐赠

你是否使用并喜欢 cesium_dev_kit，但你没有找到一种方式来表达你的喜欢? 如果是，请考虑捐款来支持这个项目。或许不是也不用担心，不管有没有支持，我都会继续维护这个项目。不过，如果你请我喝杯咖啡，我会非常高兴 😄

- [![Support via PayPal](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/paypal-logo-129x32.svg)](https://paypal.me/xiaoningdeng?country.x=C2&locale.x=en_US)

- 微信 / 支付宝
  <div style="display: flex">
    <img alt="wechat" title="wechat" src="https://benpaodehenji.com/cesium_dev_kit/static/data/images/wechat.png">
    <img alt="alipay" title="alipay" src="https://benpaodehenji.com/cesium_dev_kit/static/data/images/alipay.png">
  </div>

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
- 2、未作异常捕捉和处理

## 如何贡献

<a href="https://github.com/dengxiaoning/cesium_dev_kit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=dengxiaoning/cesium_dev_kit" />
</a>

你可以[提一个 issue](https://github.com/dengxiaoning/cesium_dev_kit/issues/new) 或者提交一个 Pull Request。

更多贡献详情见[CONTRIBUTING](./CONTRIBUTING.md)...

---

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
[npm-download]: https://img.shields.io/npm/dy/cesium_dev_kit?logo=npm
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
