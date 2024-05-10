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

## Import

```
import { initCesium } from 'cesium_dev_kit'
```

## Use

### 1、Import all

The initialization of 'initCesium' allows for the acquisition of all extension modules.

### 1.1 The initCesium method configuration parameter list

| Property         | Type   | Description                                                                                                               | Default   |
| ---------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- | --------- |
| cesiumGlobal     | Object | Cesium Object                                                                                                             | undefined |
| threeGlobal      | Object | THREE Object                                                                                                              | undefined |
| containerId      | String | Cesium mounts dom container id                                                                                            | undefined |
| threeContainerId | String | Three mounts dom container id                                                                                             | undefined |
| viewerConfig     | Object | viewer base configuration (same as official website)                                                                      | {}        |
| extreaConfig     | Object | Configure additional parameters, such as {logo: true// Whether to display logo, depthTest: true// Enable depth detection} | {}        |
| MapImageryList   | Array  | To configure the base image, see ImageryProvider                                                                          | []        |
| defaultStatic    | Array  | Static resource configurations used by shaders (such as image urls)                                                       | undefined |

### 1.2 The initCesium method returns the result

| name               | Type   | Description                                                                    |
| ------------------ | ------ | ------------------------------------------------------------------------------ |
| viewer             | Object | Cesium instance object                                                         |
| material           | Object | Material module (Modify physical material)                                     |
| graphics           | Object | Graphics modules (e.g. creating PolygonGraphics objects, etc.)                 |
| math3d             | Object | Three-dimensional mathematical tool                                            |
| primitive          | Object | Primitives manipulate objects (such as creating polygon using primivite, etc.) |
| draw               | Object | Drawing modules (e.g. polygons, rectangles)                                    |
| passEffect         | Object | Post-processing module                                                         |
| customCesiumPlugin | Object | Custom sensor extensions                                                       |
| control            | Object | Control modules (such as model positioning, dragging, etc.)                    |
| plugin             | Object | Additional plugins (such as expanding css3 animation, terrain cropping)        |
| base               | Object | Basic modules (e.g. coordinate conversion, layer initialization, etc.)         |
| analysis           | Object | Analysis modules (e.g., slope, direction, visibility, visibility analysis)     |
| attackArrowObj     | Object | Plotting (attack)                                                              |
| straightArrowObj   | Object | Plotting (straight hit)                                                        |
| pincerArrowObj     | Object | Plotting（Pincer attack）                                                      |
| ThreeJs            | Object | Integrate ThreeJS extension objects                                            |

### 1.3 Use case

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
          name: 'gaodeMap02',
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

### 2、Import on demand

The import of a single extension class can be tailored to meet specific functional requirements, thereby minimizing code redundancy.

```javaScript
import {Graphics, Material,Primitive,Draw,Analysis,CustomCesiumPlugin,PassEffect,Plugin,ThreeJs} from 'cesium_dev_kit'
```

### 2.1 Extension class：

- Graphics:Various graphic operations
- Material: Material manipulation
- Primitive: Cooperate with various primitive operations of shader
- Draw: Various drawing objects
- Analysis: Various analysis objects
- CustomCesiumPlugin: Custom sensor expansion
- PassEffect: Post effect object
- Plugin: Various extension functions
- ThreeJs: Integrate ThreeJS extension objects

### 2.2 Draw Use case：

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
          name: 'gaodeMap02',
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
        cesiumGlobal: Cesium, //Global Cesium object
        containerId: 'cesiumContainer', // Container id
        viewerConfig: { // Same as the official viewer configuration
          infoBox: false,
          shouldAnimate: true,
        },
        extraConfig: {// Other configuration
          logo:true, // Whether to display logo
          depthTest:true // Whether to enable the depth test
        },
        MapImageryList: tempData // Base map configuration
        defaultStatic // default server address and material and other basic information configuration, please refer to src\views\example\defaultStaticConf\index.js
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

### Used in h5

- Import index.umd.js directly into html

```javaScript
<script type="text/javascript" src="index.umd.js"></script>
```

- Initialize object

```javaScript
new cesium_dev_kit.initCesium({...})
```

## Use example

- ES6 Use case
  [https://github.com/dengxiaoning/cesium_kit_test](https://github.com/dengxiaoning/cesium_kit_test)

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
- 2、No usage documentation (please refer to the case)
- 3、No exception catching and handling

## How to contribute

This project exists thanks to all the people who contribute.<br/>

<a href="https://github.com/dengxiaoning/cesium_dev_kit/graphs/contributors">
<img src="https://contrib.rocks/image?repo=dengxiaoning/cesium_dev_kit" />
</a>

- If you want to contribute, you can [Raise an issue](https://github.com/dengxiaoning/cesium_dev_kit/issues/new) Or submit a Pull Request.

**Pull Request:**

- The procedure for submitting a `pull request` is as follows

1. Fork [cesium_dev_kit](https://github.com/dengxiaoning/cesium_dev_kit)
2. Clone a new repository made with forking.
3. Create your own branch: `git checkout -b feat/xxxx`
4. Install modules with npm or yarn command.
5. Let's develop!
6. Submit your changes: `git commit -am 'feat(function): add xxxxx'`
7. Push your branch: `git push origin feat/xxxx`
8. Make a new `pull request` in [cesium_dev_kit](https://github.com/dengxiaoning/cesium_dev_kit) repository.

## Git Contribution submission specification

- `feat` New features
- `fix` Fix bugs
- `docs` document
- `style` Format and style (changes that do not affect code operation)
- `refactor` Refactor
- `perf` Optimize related, such as improving performance and experience
- `test` Add test
- `build` Compilation related modifications, changes to project construction or dependencies
- `ci` Continuous integration modification
- `chore` Changes in the construction process or auxiliary tools
- `revert` Rollback to previous version
- `workflow` Workflow improvement
- `mod` Uncertain modification classification
- `wip` Under development
- `types` type

---

Welcome interested friends to join together to improve the function, so that the work is more efficient, the development is simpler, and the life is more comfortable.

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
