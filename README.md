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

- materials
  ![material](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/material.gif)
- analysis
  ![analysis](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/analysis.gif)
- plotting
  ![plot](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/plot.gif)
- dragging
  ![drag](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/drag.gif)
- radar scan
  ![radar](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/radar.gif)
- First-person roaming
  ![roaming](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/assets/image/preview/pathRoam.gif)

## Preview

[https://benpaodehenji.com/cesiumDevKit](https://benpaodehenji.com/cesiumDevKit)

## Install

```shell
npm install cesium_dev_kit
```

## Use

### 1、Import all

The initialization of 'initCesium' allows for the acquisition of all extension modules.

```javaScript
 import { initCesium } from 'cesium_dev_kit'
  const {  viewer,  material, ... } = new initCesium({  cesiumGlobal: Cesium,containerId: 'cesiumContainer',...})
```

### 2、Import on demand

The import of a single extension class can be tailored to meet specific functional requirements, thereby minimizing code redundancy.

```javaScript
import {Graphics} from 'cesium_dev_kit'
const {viewer,graphics} = new Graphics({
      cesiumGlobal: Cesium,
      containerId: 'cesiumContainer'
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

See [API documentation](https://benpaodehenji.com/cesiumDevKitDoc) for more details...

---

## Use example

- Vue Use case
  [https://github.com/dengxiaoning/cesium_kit_test](https://github.com/dengxiaoning/cesium_kit_test)

- React Use case
  [https://github.com/dengxiaoning/react-cesium](https://github.com/dengxiaoning/react-cesium)
- H5 Use case
  [https://github.com/dengxiaoning/cesium_kit_test_h5](https://github.com/dengxiaoning/cesium_kit_test_h5)

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
