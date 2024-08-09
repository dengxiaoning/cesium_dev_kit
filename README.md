## cesium_dev_kit

[![Build Status][build-main]][build-status]
[![NPM Package][npm]][npm-url]
[![NPM DownloadsWeekly][npm-download]][npmtrends-url]
[![Build Size][build-size]][build-size-url]
[![GitHub Repo stars][repo-stars]][star-chart]
[![license][license-uri]][license-link]

**English** | [中文](./README.zh-CN.md)

## Introduction

&emsp;This is a Cesium development kit that includes functionalities such as layer loading, coordinate conversion, coordinate picking, camera control, measurement, plotting, model loading and manipulation (translation, rotation scaling), 3Dtiles view position adjustment, weather effects (rain, snow, fog), scene rendering with radar scan and information box display capabilities. It also provides features for flow line visualization, lighting effects including dynamic wall and other luminous materials rendering.
Additionally it supports Post effects, visibility analysis tools for perspective analysis and slope analysis. Furthermore it offers Inundation analysis as well as volume analysis capabilities and terrain excavation functionality.

## Features

|   ![material](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/material.gif)   |        ![analysis](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/analysis.gif)        |       ![plot](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/plot.gif)       |
| :-------------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------: |
|                                                    material                                                     |                                                         analysis                                                          |                                                      plot                                                       |
| ![dynamicRiver](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/dnyRiver.gif) |         ![extrude](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/extrude.gif)         |     ![effect](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/effect.gif)     |
|                                                  dynamicRiver                                                   |                                                          extrude                                                          |                                                     effect                                                      |
|      ![radar](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/radar.gif)      |        ![roaming](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/pathRoam.gif)         |       ![drag](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/drag.gif)       |
|                                                      radar                                                      |                                                          roaming                                                          |                                                      drag                                                       |
|    ![rayCast](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/rayCast.gif)    | ![fireworksEffect](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/fireworksEffect.gif) | ![aniSoldier](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/aniSoldier.gif) |
|                                                     rayCast                                                     |                                                      fireworksEffect                                                      |                                                   aniSoldier                                                    |
|   ![pathPlan](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/pathPlan.gif)   |
|                                                    pathPlan                                                     |

[More>>](https://benpaodehenji.com/cesiumDevKit)

## Install

```shell
npm install cesium_dev_kit
```

## Use

### 1、Import all

The initialization of 'initCesium' allows for the acquisition of all extension modules.

```javaScript
 import { initCesium } from 'cesium_dev_kit'
 // custom viewer
var myViewer = new Cesium.Viewer('cesiumContainer', {
  animation: false, //Whether to display animation controls
  homeButton: false, //Whether to display the home button
  geocoder: false, //Whether to display the place name lookup control If set to true, it cannot be queried
  baseLayerPicker: false, //Whether to display layer selection controls
  timeline: false, //Whether to display the timeline control
  fullscreenButton: true, //Whether to display the button in full screen
  scene3DOnly: false, //If set to true, all geometry is drawn in 3D mode to save GPU resources
  infoBox: false, //Whether to display the information displayed after clicking the element
  sceneModePicker: false, //Whether to display projection mode controls 3D / 2D
  navigationInstructionsInitiallyVisible: false,
  navigationHelpButton: false, //Whether to display the help control
  selectionIndicator: false //Whether to display indicator components
});

 //Allowing an existing Viewer to be passed in, cesium_dev_kit will use the passed Viewer directly without re-instantiating it with "new Cesium.Viewer()".
 const {  viewer,  material, ... } = new initCesium({
  cesiumGlobal: Cesium,
  containerId: 'cesiumContainer',
  viewer: myViewer,
  ...})
```

### 2、Import on demand

The import of a single extension class can be tailored to meet specific functional requirements, thereby minimizing code redundancy.

```javaScript
import {Graphics} from 'cesium_dev_kit'
 // custom viewer
var myViewer = new Cesium.Viewer('cesiumContainer', {
  animation: false, //Whether to display animation controls
  homeButton: false, //Whether to display the home button
  geocoder: false, //Whether to display the place name lookup control If set to true, it cannot be queried
  baseLayerPicker: false, //Whether to display layer selection controls
  timeline: false, //Whether to display the timeline control
  fullscreenButton: true, //Whether to display the button in full screen
  scene3DOnly: false, //If set to true, all geometry is drawn in 3D mode to save GPU resources
  infoBox: false, //Whether to display the information displayed after clicking the element
  sceneModePicker: false, //Whether to display projection mode controls 3D / 2D
  navigationInstructionsInitiallyVisible: false,
  navigationHelpButton: false, //Whether to display the help control
  selectionIndicator: false //Whether to display indicator components
});

 //Allowing an existing Viewer to be passed in, cesium_dev_kit will use the passed Viewer directly without re-instantiating it with "new Cesium.Viewer()".
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

### Used in h5

- Import index.umd.js directly into html

```javaScript
<script type="text/javascript" src="index.umd.js"></script>
```

- Initialize object

```javaScript
new cesium_dev_kit.initCesium({...})
```

See [API documentation :bookmark_tabs: ](https://benpaodehenji.com/cesiumDevKitDoc) (Cheap server, please be patient) for more details...

---

## Use example

- Vue Use case
  [https://github.com/dengxiaoning/cesium_kit_test](https://github.com/dengxiaoning/cesium_kit_test)

- React Use case
  [https://github.com/dengxiaoning/react-cesium](https://github.com/dengxiaoning/react-cesium)
- H5 Use case
  [https://github.com/dengxiaoning/cesium_kit_test_h5](https://github.com/dengxiaoning/cesium_kit_test_h5)

## Donate

Do you use and like cesium_dev_kit but you don’t find a way to show some love? If yes, please consider donating to support this project. Otherwise, no worries, regardless of whether there is support or not, I will keep maintaining this project. Still, if you buy me a cup of coffee I would be more than happy though😄

- [![Support via PayPal](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/paypal-logo-129x32.svg)](https://paypal.me/xiaoningdeng?country.x=C2&locale.x=en_US)

- WeChat / AliPay
  <div style="display: flex">
    <img alt="wechat" title="wechat" src="https://benpaodehenji.com/cesium_dev_kit/static/data/images/wechat.png">
    <img alt="alipay" title="alipay" src="https://benpaodehenji.com/cesium_dev_kit/static/data/images/alipay.png">
  </div>

##

## Browser support

The 'Chrome 80+' browser is recommended for local development

Modern browsers (chrome, Firefox, Microsoft edge, etc.) are supported. Internet Explorer is not supported

## Thanks

[cesium-d3kit](https://github.com/zhangti0708/cesium-d3kit)<br/>
[drawarrowforcesium](https://gitcode.net/mirrors/gitgitczl/drawarrowforcesium)<br/>
[vue3-ts-cesium-map-show](https://gitee.com/hawk86104/vue3-ts-cesium-map-show)<br/>

This project includes but is not limited to the reference and reference of the above materials, thank you very much for sharing

## Project deficiency and optimization

- 1、Extended classes not using type detection (TS)
- 2、No exception catching and handling

## How to contribute

This project exists thanks to all the people who contribute.<br/>

<a href="https://github.com/dengxiaoning/cesium_dev_kit/graphs/contributors">
<img src="https://contrib.rocks/image?repo=dengxiaoning/cesium_dev_kit" />
</a>

- If you want to contribute, you can [Raise an issue](https://github.com/dengxiaoning/cesium_dev_kit/issues/new) Or submit a Pull Request.

See [CONTRIBUTING](./CONTRIBUTING.md) for more details on donations...

---

## `Star`

I am grateful to the generous individuals who awarded me these little stars, thank you for your support :heart:

[![Stargazers repo roster for @dengxiaoning/cesium_dev_kit][stargazers-url]][stargazers-link]

## `Fork`

@sincely、`@ooil929`、 @InPanda、 `luyufanzhi`、AllenChiangCN、`Liquid-Zhangliquan`... thank you for your attention :heart:

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
