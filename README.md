<p align="center">
    <a href="https://npmjs.com/package/node"><img src="https://img.shields.io/node/v/vite.svg" alt="node compatility"></a>
    <a href="https://npmjs.com/package/npm"><img src="https://img.shields.io/badge/npm-v6.14.10-blue" alt="npm package"></a>
    <a href="https://npmjs.com/package/vue"><img src="https://img.shields.io/badge/vue-v3.0.5-success" alt="vue package"></a>
    <a href="https://npmjs.com/package/vite"><img src="https://img.shields.io/badge/vite-v2.6.10-blue" alt="vite package"></a>
    <a href="https://jestjs.io"><img src="https://github.com/openlayers/openlayers/workflows/Test/badge.svg" alt="Test Status"></a>
</p>

## cersium_kit

## 简介

本项目是一个封装 Cesium 基本操作的工具包，提供简单的方法调用来实现复杂的 API 操作；节省阅读 Cesium 原文档时间，从而降低入门难度增加学习信心，同时也希望能提高工作效率。

## 目录结构

```md
├── public # 静态资源
│ ├── static # 模型文件
│ │ ├── data # 3dtiles 及 model
| └── favicon.ico # favicon 图标
├── src # 源代码
| ├── api # api 请求
| ├── assets # 主题 变量等资源
| | ├── scss # scss 变量
| | └──theme # elemet 主题
| ├── libs
| | ├── directive # 全局指令
| | └──element.ts # elemet 全局样式重写
| ├──components # 全局公共组件
| ├──hooks # 全局 hooks
| ├── config # 全局公共配置
| ├── layout # 全局 layout
| ├── locale # 国际化
| ├── plugin # 三方插件
| ├── router # 全局路由
| ├── store # 全局 vuex
| ├── utils # 全局公用方法
| | └──cesiumPluginsExtends # cesium 扩展工具包
| ├── views # 所有页面
| | └──example # cesium 扩展工具包案例
| ├── App.tsx # 入口页面
| ├── main.ts # 入口文件
| ├── permission.ts #权限认证
| └── shims-vue.d.ts # ts 声明文件
├── static # 静态资源
| ├── img # img
| └── svg # svg
├── .editorconfig # editorconfig
├── .env.development # 环境变量 开发
├── .env.production # 环境变量 生产
├── .eslintignore # eslintignore
├── .eslintrc.js # eslint 配置项
├── .gitignore # gitignore
├── .babelrc # babel 配置项
├── index.html # html 模板
├── package.json # package.json
├── README.md # README
├── tsconfig.json # tsconfig
└── vite.config.ts # vite 配置文件
```

##

## 项目演示

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

## 项目设置

```
yarn  or  npm install
```

### 编译开发环境

```
yarn dev  or  npm run dev
```

### 编译正式环境

```
yarn build or npm run build
```

## iconify 使用方法

[官网 https://icon-sets.iconify.design](https://icon-sets.iconify.design)

```
 <CIcon icon-class="bx:time-five" icon-color="#333" />
```

## 浏览器支持

本地开发推荐使用`Chrome 80+` 浏览器

支持现代（chrome，Firefox，Microsoft edge，etc.）浏览器, 不支持 IE

## 在线预览

https://www.benpaodehenji.com/cesiumDevKit

## cesium glsl 文档

https://cesium.com/downloads/cesiumjs/releases/b23/Documentation/index.html

## 本项目不足

- 1、cesium 工具类未使用 typeScript
- 2、未配备使用文档
- 3、为发布 npm 包

## 鸣谢

[cesium-d3kit](https://github.com/zhangti0708/cesium-d3kit)<br/>
[drawarrowforcesium](https://gitcode.net/mirrors/gitgitczl/drawarrowforcesium)<br/>
[vue3-ts-cesium-map-show](https://gitee.com/hawk86104/vue3-ts-cesium-map-show)<br/>
本项目借鉴和参考以上几个资料文件，非常感谢作者分享

<small>如有感兴趣朋友可以一起讨论交流完善功能，为有需要的朋友提供帮助。也欢迎大家 fork,同时也请给个 star 以示鼓励谢谢。</small>
