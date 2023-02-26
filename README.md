<p align="center">
    <a href="https://npmjs.com/package/node"><img src="https://img.shields.io/node/v/vite.svg" alt="node compatility"></a>
    <a href="https://npmjs.com/package/npm"><img src="https://img.shields.io/badge/npm-v6.14.10-blue" alt="npm package"></a>
    <a href="https://npmjs.com/package/vue"><img src="https://img.shields.io/badge/vue-v3.0.5-success" alt="vue package"></a>
    <a href="https://npmjs.com/package/vite"><img src="https://img.shields.io/badge/vite-v2.6.10-blue" alt="vite package"></a>
    <a href="https://jestjs.io"><img src="https://github.com/openlayers/openlayers/workflows/Test/badge.svg" alt="Test Status"></a>
</p>

## cersium_kit

## 简介

一个封装 cesium 操作的工具包，提供简单的方法调用来实现复制的操作，减少对于 ceiusm 原文档的学习成本，降低入门难度，同时提高工作中开发效率。

## 目录结构

```md
├── public # 静态资源
│ ├── config.js # 配置文件
| └── favicon.ico # favicon 图标
├── src # 源代码
| ├── api # api 请求
| ├── assets # 主题 变量等资源
| | ├── scss # scss 变量
| | └──theme # elemet 主题
| ├──components # 全局公共组件
| ├──hooks # 全局 hooks
| ├── config # 全局公共配置
| ├── layout # 全局 layout
| ├── locale # 国际化
| ├── plugin # 三方插件
| ├── router # 全局路由
| ├── store # 全局 vuex
| ├── utils # 全局公用方法
| ├── views # 所有页面
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

- 登录
  ![loginpage](https://github.com/dengxiaoning/vue3-vite-elementPlus-ts/blob/master/src/assets/image/example/loginpagenew.png)
- 首页
  ![mainpage](https://github.com/dengxiaoning/vue3-vite-elementPlus-ts/blob/master/src/assets/image/example/firstPage.gif)
- 二维
  ![twodimensional](https://github.com/dengxiaoning/vue3-vite-elementPlus-ts/blob/master/src/assets/image/example/twoDimensional.gif)
- 三维
  ![threedimensional](https://github.com/dengxiaoning/vue3-vite-elementPlus-ts/blob/master/src/assets/image/example/threeDimensional.gif)

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

https://www.benpaodehenji.com/csdata
