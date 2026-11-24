import { loadDatGui } from './lazyLoad'
import type { BindHandleEventOptions } from './Base'
import type { Entity, ImageryLayer } from 'cesium'
import { createScopedConstructor, attachDestroy } from './Base'

/** 带场景特效扩展（colorCorrection/bloomEffect/hdrEnabled/lightSource）的 Viewer */
type SceneEffectViewer = any & { scene: any & Record<string, any> }

/** 外部全局对象 d3kit（由使用方注入到 window 上） */
declare const d3kit: any

/* ===== 由原 JSDoc @typedef 生成的类型 ===== */

/** - 模型拖拽标识 */
export interface ctrlManualFlag {
  /** 是否选中 */
  selected?: boolean
  /** 左键按下 */
  leftDown?: boolean
}

/** 图层参数 */
export interface LayerParam {
  [key: string]: unknown
}

/** definedMouseEvent 的参数 */
export interface DefinedMouseEventOptions {
  /** 要拖拽/编辑的目标实体 */
  targetEntity?: Entity
  /** 拖拽状态标识，一般传 `{ selected: false, leftDown: false }` */
  ctrlFlag?: ctrlManualFlag
}

/** Control 实例类型 */
export interface ControlInstance {
  _viewer: any
  _installFileDragDropHandler(): void,
  showLoadDataToScenePanel(param?: Record<string, unknown>): Promise<void>,
  /** 后处理面板 */
  showPostProcessStagesPanel(param?: Record<string, unknown>): Promise<void>,
  /** 环境控制 */
  showSceneBloomPanel(param?: Record<string, unknown>): Promise<void>,
  /** 模型，3ditiles等实体位置调整面板， */
  showPrimitiveMatrixPanel(param?: Record<string, unknown>): Promise<unknown>,
  /** 图层参数调整 */
  showLayerParamPanel(layer: ImageryLayer, param?: Record<string, unknown>): Promise<void>,
  /** 图层切换 */
  showLayerSwitchPanel(layers?: ImageryLayer[], param?: Record<string, unknown>, cb?: () => void): Promise<void>,
  /** 场景效果调整面板 */
  showSceneEffectEditPanel(options?: Record<string, unknown>): Promise<void>,
  /** 实体位置、角度编辑面板 */
  showEntityOrientationEditPanel(param?: Record<string, unknown>): Promise<void>,
  /** 定义事件 */
  definedMouseEvent(options?: DefinedMouseEventOptions): void,
  defMouseMove(movement?: unknown): unknown,
  defLeftDown(movement?: unknown): void,
  defMouseWheel(movement?: unknown): unknown,
  defLeftUp(movement?: unknown): void,
  /** 平移模型 */
  manualMoveModel(modifyMode: string): void,
  /** 旋转模型 */
  manualRotateModel(modifyMode: string): void,
  /** 缩放模型 */
  manualScaleModel(modifyMode: string): void,
  _dragBox: HTMLElement
  _parentDiv: HTMLElement
  fileDragDropCallBack: ((...args: unknown[]) => void) | undefined
  callBackParms: unknown
  result: unknown
  blackAndWhiteShow: boolean
  blackAndWhiteGradations: number
  brightnessShow: boolean
  brightnessValue: number
  nightVisionShow: boolean
  silhouette: boolean
  contrast: number
  brightness: number
  delta: number
  gamma: number
  enabled: boolean
  highDynamicRange: boolean
  shadows: boolean
  glowOnly: boolean
  sigma: number
  stepSize: number
  alpha: number
  hue: number
  dayAlpha: number
  nightAlpha: number
  saturation: number
  bloomEffectShow: boolean
  bloomThreshold: number
  bloomIntensity: number
  ambientLightColor: any
  hdrEnabled: boolean
  colorCorrectionShow: boolean
  colorCorrectionSaturation: number
  colorCorrectionBrightness: number
  colorCorrectionContrast: number
  colorCorrectionHue: number
  heading: number
  pitch: number
  roll: number
  bindHandleEvent: (options?: BindHandleEventOptions) => void
  /** @deprecated 拼写有误，请使用 `bindHandleEvent` */
  bindHandelEvent: (options?: BindHandleEventOptions) => void
}

/** Control 构造函数类型 */
export interface ControlConstructor {
  new (viewer?: any, cesiumGlobal?: unknown): ControlInstance
  prototype: ControlInstance
}

/**
 * @typedef {object} ctrlManualFlag - 模型拖拽标识
 * @property {boolean} selected - 是否选中
 * @property {boolean} leftDown - 左键按下
 */
/**
 * 控件模块
 * @class
 * @augments  module:Base
 * @param {object} params
 * @param {object} params.viewer - cesium 实例
 * @param {object} params.cesiumGlobal - cesium 全局对象
 * @param {Array} params.defaultStatic - 静态资源
 * @exports Control
 */
/**
 * 为每个实例创建独立闭包，避免模块级 Cesium/dfSt 及交互状态在多个 viewer 间共享。
 * 由 createScopedConstructor 在每次 new 时调用。
 */
export function createControlModule() {
  let Cesium: any = null;
  let currManualFlag: ctrlManualFlag = {};
  let pickedObject: any;
  let dragEntity: any;
  let mode = "move";
  let _global_viewer: any = null;

const Control = function (this: ControlInstance, viewer?: any, cesiumGlobal?: unknown) {
  if (viewer) {
    this._viewer = viewer;
    _global_viewer = viewer;
    Cesium = cesiumGlobal;
    attachDestroy(this);
    this._installFileDragDropHandler();
  }
} as unknown as ControlConstructor

Control.prototype = {
  /*
   * 拖拽加载
   */
  _installFileDragDropHandler(this: ControlInstance) {
    function FileDragDropHandler(this: any, targetDiv: any, viewer: any) {
      var dragBox = document.createElement("div");
      dragBox.id = "fileDragDrop";
      dragBox.classList.add("filedragdrop");
      dragBox.innerHTML = "请将Json文件拖拽到此区域";
      this._dragBox = dragBox;
      this._viewer = viewer;
      this._parentDiv = targetDiv;
      targetDiv.appendChild(dragBox);
      this.fileDragDropCallBack = undefined;
      this.callBackParms = undefined;
    }

    FileDragDropHandler.prototype.startuploadfile = function (this: any) {
      var _this = this;
      var oBox = _this._dragBox;
      var timer: any = null;
      document.ondragover = function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          //  oBox.style.display = 'none';
          oBox.innerHTML = "请将文件拖拽到此区域";
        }, 200);
        // oBox.style.display = 'block';
      };
      //进入子集的时候 会触发ondragover 频繁触发 不给ondrop机会
      oBox.ondragenter = function () {
        oBox.innerHTML = "请释放鼠标";
      };
      oBox.ondragover = function () {
        return false;
      };
      oBox.ondragleave = function () {
        oBox.innerHTML = "请将文件拖拽到此区域";
      };
      oBox.ondrop = function (ev: any) {
        ev.preventDefault();
        var oFile = ev.dataTransfer.files[0];
        var reader = new FileReader();
        reader.readAsText(oFile, "UTF-8");
        //读取成功
        reader.onload = function (this: any) {
          var data = JSON.parse(this.result);
          if (_this.fileDragDropCallBack) {
            //回调函数，callBackParms为回调函数的参数,需要自己传入，data与_this._viewer不需要传入，但是声明的回调函数中要有该参数
            _this.fileDragDropCallBack(_this.callBackParms, data, _this._viewer);
          }
        };
        reader.onloadstart = function () {
          //alert('读取开始');
        };
        reader.onloadend = function () {
          // alert('读取结束');
        };
        reader.onabort = function () {
          alert("读取数据中断");
        };
        reader.onerror = function () {
          alert("读取数据失败");
        };
        return false;
      };
    };

    function FileDragDropMixin(viewer: any) {
      var fileDragDropHandler = new (FileDragDropHandler as any)(document.querySelector(".cesium-viewer"), viewer);
      Object.defineProperties(viewer, {
        fileDragDropMixin: {
          get: function () {
            return fileDragDropHandler;
          },
        },
      });
    }

    Cesium.Scene.FileDragDropMixin = FileDragDropMixin;
  },
  /*
   * 加载本地数据
   * @param {object} param
   */
  async showLoadDataToScenePanel(this: ControlInstance, param?: any) {
    const dat = await loadDatGui()
    param = param || {};
    if (param) {
      let gui = new dat.GUI();
      let viewer = this._viewer;
      let geojson = gui.addFolder("加载数据文件");
      let commonUpload = (callback: any) => {
        let inputUpload = document.createElement("input");
        inputUpload.type = "file";
        inputUpload.className = "datgui_upload";
        inputUpload.onchange = function () {
          if (typeof callback === "function" && inputUpload!.files!.length) {
            callback(URL.createObjectURL(inputUpload!.files![0]));
          }
        };
        document.getElementsByTagName("body") && document.getElementsByTagName("body")[0].appendChild(inputUpload);
        inputUpload.click();
      };
      let geojsonParam = {
        point: () => {
          commonUpload((fileData: any) => {
            var promise = Cesium.GeoJsonDataSource.load(fileData);
            promise.then(function (dataSource: any) {
              viewer.dataSources.add(dataSource);
              var entities = dataSource.entities.values;
              for (var o = 0; o < entities.length; o++) {
                var r = entities[o];
                r.nameID = o;
                r.point = {
                  color: Cesium.Color.BLUE,
                };
              }
              viewer.flyTo(dataSource);
            });
          });
        },
        polyline: () => {
          commonUpload((fileData: any) => {
            var promise = Cesium.GeoJsonDataSource.load(fileData);
            promise.then(function (dataSource: any) {
              viewer.dataSources.add(dataSource);
              var entities = dataSource.entities.values;
              for (var o = 0; o < entities.length; o++) {
                var r = entities[o];
                r.nameID = o;
                r.polyline.width = 5;
                (r.polyline.material = new Cesium.PolylineGlowMaterialProperty({
                  glowPower: 0.1,
                  color: Cesium.Color.ORANGERED.withAlpha(0.9),
                })),
                  10;
              }
              viewer.flyTo(dataSource);
            });
          });
        },
        polygon: () => {
          commonUpload((fileData: any) => {
            var promise = Cesium.GeoJsonDataSource.load(fileData);
            promise.then(function (dataSource: any) {
              viewer.dataSources.add(dataSource);
              var entities = dataSource.entities.values;
              for (var o = 0; o < entities.length; o++) {
                var r = entities[o];
                r.nameID = o;
                r.polygon.width = 10;
                r.polygon.material = Cesium.Color.BLUE.withAlpha(0.9);
              }
              viewer.flyTo(dataSource);
            });
          });
        },
        model: () => {
          commonUpload((fileData: any) => {
            viewer.flyTo(
              d3kit.createModelGraphics({
                position: Cesium.Cartesian3.fromDegrees(120.38105869, 31.10115627),
                m_url: fileData,
              })
            );
          });
        },
        czml: () => {
          commonUpload((fileData: any) => {
            viewer.flyTo(viewer.dataSources.add(Cesium.CzmlDataSource.load(fileData)));
          });
        },
        "3dtilset": () => {
          commonUpload((fileData: any) => {
            viewer.flyTo(
              viewer.scene.primitives.add(
                new Cesium.Cesium3DTileset({
                  url: fileData,
                })
              )
            );
          });
        },
      };
      geojson.add(geojsonParam, "point");
      geojson.add(geojsonParam, "polyline");
      geojson.add(geojsonParam, "polygon");
      geojson.add(geojsonParam, "model");
      geojson.add(geojsonParam, "czml");
      geojson.add(geojsonParam, "3dtilset");
      geojson.open();
    }
  },
  /**
   * 后处理面板
   * @param {object} param
   * @param {string} param.elementId - gui 组件绑定的dom
   * @param {object} param.silhouetteColor - 轮廓颜色
   * @example
   * import { Control } from 'cesium_dev_kit/control'
   * const {control} = new Control({
   *    cesiumGlobal: Cesium,
        containerId: 'cesiumContainer'
      })
   * control.showPostProcessStagesPanel({ elementId: 'cust-gui-box' });
   */
  async showPostProcessStagesPanel(this: ControlInstance, param?: any) {
    const dat = await loadDatGui()
    param = param || {};
    let Options = function (this: any) {
      this.blackAndWhiteShow = false;
      this.blackAndWhiteGradations = 5.0;
      this.brightnessShow = false;
      this.brightnessValue = 0.5;
      this.nightVisionShow = false;
      this.silhouette = false;
    };
    let gui: any = null;
    let option = new (Options as any)();
    // 修改gui原本的位置，如果提供绑定的父元素id<elementId>就将gui domEmelemt append到对应的dom
    if (param && param.elementId) {
      gui = new dat.GUI({
        autoPlace: false,
      });
      var customContainer = document.getElementById(param.elementId);
      customContainer!.appendChild(gui.domElement);
    } else {
      gui = new dat.GUI();
    }
    let viewer = this._viewer;
    let stages = viewer.scene.postProcessStages;
    let silhouette = stages.add(Cesium.PostProcessStageLibrary.createSilhouetteStage());
    let blackAndWhite = stages.add(Cesium.PostProcessStageLibrary.createBlackAndWhiteStage());
    let brightness = stages.add(Cesium.PostProcessStageLibrary.createBrightnessStage());
    let nightVision = stages.add(Cesium.PostProcessStageLibrary.createNightVisionStage());
    //config
    silhouette.uniforms.color = param.silhouetteColor || Cesium.Color.YELLOW;
    silhouette.enabled = false;
    blackAndWhite.enabled = false;
    blackAndWhite.uniforms.gradations = 5.0;
    brightness.enabled = false;
    brightness.uniforms.brightness = 0.5;
    nightVision.enabled = false;
    gui
      .add(option, "blackAndWhiteShow")
      .name("blackAndWhiteShow")
      .onChange(function (value: any) {
        blackAndWhite.enabled = value;
      });
    gui
      .add(option, "blackAndWhiteGradations", 0, 10, 0.1)
      .name("blackAndWhiteGradations")
      .onChange(function (value: any) {
        blackAndWhite.uniforms.gradations = value;
      });
    gui
      .add(option, "brightnessShow")
      .name("brightnessShow")
      .onChange(function (value: any) {
        brightness.enabled = value;
      });
    gui
      .add(option, "brightnessValue", 0, 10, 0.1)
      .name("brightnessValue")
      .onChange(function (value: any) {
        brightness.uniforms.brightness = value;
      });
    gui
      .add(option, "nightVisionShow")
      .name("nightVisionShow")
      .onChange(function (value: any) {
        nightVision.enabled = value;
      });
    gui
      .add(option, "silhouette")
      .name("silhouette")
      .onChange(function (value: any) {
        silhouette.enabled = value;
      });
  },
  /**
   * 环境控制
   * @param {object} param
   * @param {string} param.elementId - gui 组件绑定的dom
   * @example
   * import { Control } from 'cesium_dev_kit/control'
   * const {control} = new Control({
   *    cesiumGlobal: Cesium,
        containerId: 'cesiumContainer'
      })
   * control.showSceneBloomPanel({ elementId: 'cust-gui-box' });
   */
  async showSceneBloomPanel(this: ControlInstance, param?: any) {
    const dat = await loadDatGui()
    let Options = function (this: any) {
      this.contrast = 128;
      this.brightness = -0.3;
      this.delta = 1;
      this.gamma = 3.5;
      this.enabled = false;
      this.highDynamicRange = false;
      this.shadows = false;
      this.glowOnly = false;
      this.sigma = 1.0;
      this.stepSize = 5.0;
    };
    let gui: any = null;
    let option = new (Options as any)();
    // 修改gui原本的位置，如果提供绑定的父元素id<elementId>就将gui domEmelemt append到对应的dom
    if (param && param.elementId) {
      gui = new dat.GUI({
        autoPlace: false,
      });
      var customContainer = document.getElementById(param.elementId);
      customContainer!.appendChild(gui.domElement);
    } else {
      gui = new dat.GUI();
    }
    let viewer = this._viewer;
    gui.__closeButton.innerHTML = "收缩面板";

    let bloom = viewer.scene.postProcessStages.bloom;

    gui
      .add(option, "enabled")
      .name("bloom")
      .onChange(function (value: any) {
        bloom.enabled = value;
      });
    gui
      .add(option, "glowOnly")
      .name("发光")
      .onChange(function (value: any) {
        bloom.uniforms.glowOnly = value;
      });
    gui
      .add(option, "enabled")
      .name("启用模糊")
      .onChange(function (value: any) {
        bloom.enabled = value;
      });
    gui
      .add(option, "contrast", -255.0, 255.0, 0.01)
      .name("对比度")
      .onChange(function (value: any) {
        bloom.uniforms.contrast = value;
      });
    gui
      .add(option, "brightness", -1.0, 1.0, 0.01)
      .name("光泽亮度")
      .onChange(function (value: any) {
        bloom.uniforms.brightness = value;
      });
    gui
      .add(option, "delta", 1, 5, 0.01)
      .name("因子")
      .onChange(function (value: any) {
        bloom.uniforms.delta = value;
      });
    gui
      .add(option, "sigma", 1, 10, 0.01)
      .name("sigma")
      .onChange(function (value: any) {
        bloom.uniforms.sigma = value;
      });
    gui
      .add(option, "stepSize", 0.1, 10)
      .name("stepSize")
      .onChange(function (value: any) {
        bloom.uniforms.stepSize = value;
      });
    gui
      .add(option, "shadows")
      .name("启用阴影")
      .onChange(function (value: any) {
        viewer.shadows = value;
      });
    gui
      .add(option, "highDynamicRange")
      .name("高动态范围")
      .onChange(function (value: any) {
        viewer.scene.highDynamicRange = value;
      });
    gui
      .add(option, "gamma", 1, 10, 0.01)
      .name("伽马亮度")
      .onChange(function (value: any) {
        viewer.scene.gamma = value;
      });
  },
  /**
   * 模型，3ditiles等实体位置调整面板，
   * 获取调整后的模型矩阵与平移矩阵
   * @param {object} param
   * @param {Primitive} param.primitives - 操作的目标图元
   * @param {string} param.elementId - gui对象绑定的dom id
   * @param {function} param.cb - 回调函数，返回{modelTransformMatrix: [1,0,0,0,1],modelMatrix:[ -1.1639525282088383,-0.2919152481050832,0]}
   * @example
   * import { Control } from 'cesium_dev_kit/control'
   * const {control,viewer} = new Control({
   *    cesiumGlobal: Cesium,
        containerId: 'cesiumContainer'
      })
     let tileset =  viewer.scene.primitives.add(new Cesium.Cesium3DTileset({url: 'static/data/3DTiles/building/tileset.json'}));
      control.showPrimitiveMatrixPanel({
         elementId: 'cust-gui-box',
         primitives: tileset, 
         cb: resModelMatrix => {
          console.log(resModelMatrix);
        }
      });
   */
  async showPrimitiveMatrixPanel(this: ControlInstance, param?: any) {
    const dat = await loadDatGui()
    let primitive = param.primitives._delegate || param.primitives,
      primitives = param.primitives,
      // 全局定义
      viewer = this._viewer;

    // eslint-disable-next-line no-unused-vars
    const update3dtilesMaxtrix = function (currParam: any) {
      //旋转
      let mx = Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(currParam.rx));
      let my = Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(currParam.ry));
      let mz = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(currParam.rz));
      let rotationX = Cesium.Matrix4.fromRotationTranslation(mx);
      let rotationY = Cesium.Matrix4.fromRotationTranslation(my);
      let rotationZ = Cesium.Matrix4.fromRotationTranslation(mz);
      //平移
      let position = Cesium.Cartesian3.fromDegrees(currParam.tx, currParam.ty, currParam.tz);
      let m = Cesium.Transforms.eastNorthUpToFixedFrame(position);

      let scale = Cesium.Matrix4.fromUniformScale(0.85);
      // //缩放
      Cesium.Matrix4.multiply(m, scale, m);
      //旋转、平移矩阵相乘
      Cesium.Matrix4.multiply(m, rotationX, m);
      Cesium.Matrix4.multiply(m, rotationY, m);
      Cesium.Matrix4.multiply(m, rotationZ, m);
      //赋值给tileset
      return m;
    };

    let gui: any = null;
    if (param && param.elementId) {
      gui = new dat.GUI({
        autoPlace: false,
      });
      var customContainer = document.getElementById(param.elementId);
      customContainer!.appendChild(gui.domElement);
    } else {
      gui = new dat.GUI();
    }
    /* Here is the update */
    var resetSliders = function (name: any, val: any) {
      for (var i = 0; i < gui.__controllers.length; i++) {
        if (!gui.__controllers.property == name) {
          gui.__controllers[i].setValue(val);
        }
      }
    };
    //高度
    let heightMatrix = {
      height: 100,
    };
    let height = gui.addFolder("离地高度");
    height.add(heightMatrix, "height", 0, 1000, 1).onChange(function (value: any) {
      var boundingSphere = primitives.boundingSphere;
      var cartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center);
      var surface = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0.0);
      var offset = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, value);
      var translation = Cesium.Cartesian3.subtract(offset, surface, new Cesium.Cartesian3());
      primitives.modelMatrix = Cesium.Matrix4.fromTranslation(translation);
    });
    height.open();
    //缩放矩阵
    let scale = gui.addFolder("缩放大小");
    let scaleParam = {
      "m+Scale": () => {
        primitive.readyPromise.then((data: any) => {
          let modelMatrix = data.root.transform;
          Cesium.Matrix4.multiplyByUniformScale(modelMatrix, 1.2, modelMatrix);
          data.root.transform = modelMatrix;
        });
      },
      "m-Scale": () => {
        primitive.readyPromise.then((data: any) => {
          let modelMatrix = data.root.transform;
          Cesium.Matrix4.multiplyByUniformScale(modelMatrix, 0.8, modelMatrix);
          data.root.transform = modelMatrix;
        });
      },
    };
    scale.add(scaleParam, "m+Scale");
    scale.add(scaleParam, "m-Scale");
    scale.open();

    let translationMatrix = {
      x: 0,
      y: 0,
      z: 0,
    };
    //平移矩阵
    let translationParam = {
      "x+Axis": () => {
        translationMatrix.x += 1;
        const translation = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(20, 0, 0));
        Cesium.Matrix4.multiply(primitive.modelMatrix, translation, primitive.modelMatrix);
      },
      "x-Axis": () => {
        translationMatrix.x -= 1;
        const translation = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(-20, 0, 0));
        Cesium.Matrix4.multiply(primitive.modelMatrix, translation, primitive.modelMatrix);
      },
      "y+Axis": () => {
        translationMatrix.y += 1;
        const translation = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(0, 20, 0));
        Cesium.Matrix4.multiply(primitive.modelMatrix, translation, primitive.modelMatrix);
      },
      "y-Axis": () => {
        translationMatrix.y -= 1;
        const translation = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(0, -20, 0));
        Cesium.Matrix4.multiply(primitive.modelMatrix, translation, primitive.modelMatrix);
      },
      "z+Axis": () => {
        translationMatrix.z += 1;
        const translation = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(0, 0, 20));
        Cesium.Matrix4.multiply(primitive.modelMatrix, translation, primitive.modelMatrix);
      },
      "z-Axis": () => {
        translationMatrix.z -= 1;
        const translation = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(0, 0, -20));
        Cesium.Matrix4.multiply(primitive.modelMatrix, translation, primitive.modelMatrix);
      },
    };
    let translation = gui.addFolder("矩阵平移");
    translation.add(translationParam, "x+Axis");
    translation.add(translationParam, "x-Axis");
    translation.add(translationParam, "y+Axis");
    translation.add(translationParam, "y-Axis");
    translation.add(translationParam, "z+Axis");
    translation.add(translationParam, "z-Axis");
    translation.open();

    //旋转矩阵
    let rotationMatrix = {
      x: 0,
      y: 0,
      z: 0,
    };
    let rotationParam = {
      "x+Axis": () => {
        rotationMatrix.x += 15;
        primitive.readyPromise.then((data: any) => {
          const angel = Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(rotationMatrix.x));
          const rotation = Cesium.Matrix4.fromRotationTranslation(angel);
          const m = Cesium.Transforms.eastNorthUpToFixedFrame(data.boundingSphere.center);
          Cesium.Matrix4.multiply(m, rotation, m);
          // const rotationX =  Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(rotationMatrix.x)))
          // const rotationY =  Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(rotationMatrix.y)))
          // const rotationZ =  Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(rotationMatrix.z)))
          // Cesium.Matrix4.multiply(m, rotationX, m);
          // Cesium.Matrix4.multiply(m, rotationY, m);
          // Cesium.Matrix4.multiply(m, rotationZ, m);

          data._root.transform = m;
        });
      },
      "x-Axis": () => {
        rotationMatrix.x -= 15;
        primitive.readyPromise.then((data: any) => {
          const angel = Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(rotationMatrix.x));
          const rotation = Cesium.Matrix4.fromRotationTranslation(angel);
          const m = Cesium.Transforms.eastNorthUpToFixedFrame(data.boundingSphere.center);
          Cesium.Matrix4.multiply(m, rotation, m);
          data._root.transform = m;
        });
      },
      "y+Axis": () => {
        rotationMatrix.y += 15;
        primitive.readyPromise.then((data: any) => {
          const angel = Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(rotationMatrix.y));
          const rotation = Cesium.Matrix4.fromRotationTranslation(angel);
          const m = Cesium.Transforms.eastNorthUpToFixedFrame(data.boundingSphere.center);
          Cesium.Matrix4.multiply(m, rotation, m);
          data._root.transform = m;
        });
      },
      "y-Axis": () => {
        rotationMatrix.y -= 15;
        primitive.readyPromise.then((data: any) => {
          const angel = Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(rotationMatrix.y));
          const rotation = Cesium.Matrix4.fromRotationTranslation(angel);
          const m = Cesium.Transforms.eastNorthUpToFixedFrame(data.boundingSphere.center);
          Cesium.Matrix4.multiply(m, rotation, m);
          data._root.transform = m;
        });
      },
      "z+Axis": () => {
        rotationMatrix.z += 15;
        primitive.readyPromise.then((data: any) => {
          const angel = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(rotationMatrix.z));
          const rotation = Cesium.Matrix4.fromRotationTranslation(angel);
          const m = Cesium.Transforms.eastNorthUpToFixedFrame(data.boundingSphere.center);
          Cesium.Matrix4.multiply(m, rotation, m);
          data._root.transform = m;
        });
      },
      "z-Axis": () => {
        rotationMatrix.z -= 15;
        primitive.readyPromise.then((data: any) => {
          const angel = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(rotationMatrix.z));
          const rotation = Cesium.Matrix4.fromRotationTranslation(angel);
          const m = Cesium.Transforms.eastNorthUpToFixedFrame(data.boundingSphere.center);
          Cesium.Matrix4.multiply(m, rotation, m);
          data._root.transform = m;
        });
      },
    };
    let rotation = gui.addFolder("旋转矩阵");
    rotation.add(rotationParam, "x+Axis");
    rotation.add(rotationParam, "x-Axis");
    rotation.add(rotationParam, "y+Axis");
    rotation.add(rotationParam, "y-Axis");
    rotation.add(rotationParam, "z+Axis");
    rotation.add(rotationParam, "z-Axis");
    rotation.open();
    if (param.cb) {
      let getModelInfo = gui.addFolder("获取调整后的模型矩阵");
      getModelInfo
        .add(
          {
            getModelMaterix: () => {
              primitive.readyPromise.then((data: any) => {
                let modelTransformMatrix = data.root.transform;
                param.cb({
                  modelTransformMatrix: Cesium.Matrix4.toArray(modelTransformMatrix),
                  modelMatrix: Cesium.Matrix4.toArray(primitives.modelMatrix),
                });
              });
            },
          },
          "getModelMaterix"
        )
        .name("获取模型矩阵");
      getModelInfo.open();
    }
    gui.__closeButton.innerHTML = "收缩面板";
  },
  /**
   * 图层参数调整
   * @param {ImageryLayer} layer - ImageryLayer对象
   * @param {string} param.elementId - gui对象绑定的dom id
   * @example
   * import { Control } from 'cesium_dev_kit/control'
   * const {viewer,control} = new Control({
   *    cesiumGlobal: Cesium,
        containerId: 'cesiumContainer'
      })
      let layer = viewer.imageryLayers.addImageryProvider(new Cesium.Scene.GoogleImageryProvider({}));
   * control.showLayerParamPanel(layer, { elementId: 'cust-gui-box' });
   */
  showLayerParamPanel: async function (this: ControlInstance, layer: any, param?: any) {
    const dat = await loadDatGui()
    if (layer) {
      let gui: any = null;
      // 修改gui原本的位置，如果提供绑定的父元素id<elementId>就将gui domEmelemt append到对应的dom
      if (param && param.elementId) {
        gui = new dat.GUI({
          autoPlace: false,
        });
        var customContainer = document.getElementById(param.elementId);
        customContainer!.appendChild(gui.domElement);
      } else {
        gui = new dat.GUI();
      }

      var layerObj = new( (function (this: any) {
        this.alpha = layer.alpha;
        this.brightness = layer.brightness;
        this.contrast = layer.contrast;
        this.gamma = layer.gamma;
        this.hue = layer.hue;
        this.dayAlpha = layer.dayAlpha;
        this.nightAlpha = layer.nightAlpha;
        this.saturation = layer.saturation;
      }) as any)();
      var layerParam = gui.addFolder("图层调整");
      layerParam
        .add(layerObj, "alpha", 0, 1, 0.05)
        .name("透明度")
        .onChange(function (value: any) {
          layer.alpha = value;
        });
      layerParam
        .add(layerObj, "brightness", 0, 5, 0.05)
        .name("亮度")
        .onChange(function (value: any) {
          layer.brightness = value;
        });
      layerParam
        .add(layerObj, "contrast", 0, 5, 0.05)
        .name("对比")
        .onChange(function (value: any) {
          layer.contrast = value;
        });
      layerParam
        .add(layerObj, "gamma", 0, 5, 0.05)
        .name("伽马")
        .onChange(function (value: any) {
          layer.gamma = value;
        });
      layerParam
        .add(layerObj, "hue", 0, 5, 0.05)
        .name("色调")
        .onChange(function (value: any) {
          layer.hue = value;
        });
      layerParam
        .add(layerObj, "dayAlpha", 0, 1, 0.05)
        .name("白天透明")
        .onChange(function (value: any) {
          layer.dayAlpha = value;
        });
      layerParam
        .add(layerObj, "nightAlpha", 0, 1, 0.05)
        .name("夜晚透明")
        .onChange(function (value: any) {
          layer.nightAlpha = value;
        });
      layerParam
        .add(layerObj, "saturation", 0, 5, 0.05)
        .name("饱和")
        .onChange(function (value: any) {
          layer.saturation = value;
        });

      layerParam.open();
    }
  },
  /**
   * 图层切换
   * @param {object} layers
   * @param {object} param
   * @param {function} cb
   */
  showLayerSwitchPanel: async function (this: ControlInstance, layers?: any, param?: any, cb?: any) {
    const dat = await loadDatGui()
    if (layers && layers.length) {
      let gui: any = null;
      // 修改gui原本的位置，如果提供绑定的父元素id<elementId>就将gui domEmelemt append到对应的dom
      if (param && param.elementId) {
        gui = new dat.GUI({
          autoPlace: false,
        });
        var customContainer = document.getElementById(param.elementId);
        customContainer!.appendChild(gui.domElement);
      } else {
        gui = new dat.GUI();
      }
      // 注意使用for in 会读取到原型上所有可枚举属性，容易引起异常
      var layerObj = new( (function (this: any) {
        // for (let i in layers) {
        //   this[layers[i].id] = layers[i].show
        // }
        layers.forEach((item: any) => {
          this[item.id] = item.show;
        });
      }) as any)();
      var layerSwitch = gui.addFolder("图层切换");
      layers.forEach((item: any) => {
        layerSwitch
          .add(layerObj, item.id)
          .name(item.name)
          .onChange(function (value: any) {
            item.show = value;
            cb && cb({ key: item.id, val: value });
          });
      });
      // for (let i in layers) {
      //   layerSwitch.add(layerObj, layers[i].id).name(layers[i].name).onChange(function (value) {
      //     layers[i].show = value
      //   })
      // }
      var layerAlphaObj = new( (function (this: any) {
        // for (let i in layers) {
        //   this[layers[i].id] = layers[i].alpha
        // }
        layers.forEach((item: any) => {
          this[item.id] = item.alpha;
        });
      }) as any)();
      var layerAlpha = gui.addFolder("透明度");
      // for (let i in layers) {
      //   layerAlpha.add(layerAlphaObj, layers[i].id, 0, 1, 0.05).name(layers[i].name).onChange(function (value) {
      //     layers[i].alpha = value
      //   })
      // }

      layers.forEach((item: any) => {
        layerAlpha
          .add(layerAlphaObj, item.id, 0, 1, 0.05)
          .name(item.name)
          .onChange(function (value: any) {
            item.alpha = value;
          });
      });
      layerSwitch.open();
      layerAlpha.open();
    }
  },
  /**
   * 场景效果调整面板
   * @param {object} options
   * @param {boolean} options.colorCorrection - 开启颜色校正
   * @param {boolean}  options.bloomEffect - 泛光开关
   * @param {number} options.threshold - 泛光阈值
   * @param {number} options.bloomIntensity - 泛光强度
   * @param {number}  options.ambientLightColor - 环境光
   * @param {boolean}  options.hdrEnabled - HDR开关
   * @param {number}  options.saturation - 饱和度
   * @param {number} options.brightness - 亮度
   * @param {number} options.contrast - 对比度
   * @param {number} options.hue - 色调
   * @example
   * import { Control } from 'cesium_dev_kit/control'
   * const {control} = new Control({
   *    cesiumGlobal: Cesium,
        containerId: 'cesiumContainer'
      })
   * control.showSceneEffectEditPanel({
        colorCorrection:false,
        saturation :3.1,
        brightness : 1.8,
        contrast :1.2,
        hue :0,
        bloomEffect: false,
        hdrEnabled : true,
        threshold :1,
        bloomIntensity : 2,
        ambientLightColor: new Cesium.Color(0.3, 0.3, 0.3, 1)
     });
   */
  showSceneEffectEditPanel: async function (this: ControlInstance, options?: any) {
    const dat = await loadDatGui()
    options = options || {};
    if (dat.GUI && (this._viewer.scene as any & Record<string, any>).colorCorrection) {
      var gui = new dat.GUI(),
        viewer = this._viewer as SceneEffectViewer;

      /*
       * 初始化场景
       */
      //设置环境光
      viewer.scene.lightSource.ambientLightColor = options.ambientLightColor || new Cesium.Color(0.3, 0.3, 0.3, 1);
      //开启颜色校正
      viewer.scene.colorCorrection.show = options.colorCorrection || false;
      viewer.scene.colorCorrection.saturation = options.saturation || 3.1;
      viewer.scene.colorCorrection.brightness = options.brightness || 1.8;
      viewer.scene.colorCorrection.contrast = options.contrast || 1.2;
      viewer.scene.colorCorrection.hue = options.hue || 0;

      //开启泛光和HDR
      viewer.scene.bloomEffect.show = options.bloomEffect || false;
      viewer.scene.hdrEnabled = options.hdrEnabled || true;
      viewer.scene.bloomEffect.threshold = options.threshold || 1;
      viewer.scene.bloomEffect.bloomIntensity = options.bloomIntensity || 2;

      /*
       * 初始化dat
       */
      var sceneObj = new( (function (this: any) {
        //泛光开关
        this.bloomEffectShow = options.bloomEffect || false;
        //泛光阈值
        this.bloomThreshold = options.threshold || 1;
        //泛光强度
        this.bloomIntensity = options.bloomIntensity || 2;
        //环境光
        this.ambientLightColor = options.ambientLightColor || 0.3;
        //HDR开关
        this.hdrEnabled = options.hdrEnabled || true;
        //颜色校正
        this.colorCorrectionShow = false;
        //饱和度
        this.colorCorrectionSaturation = options.saturation || 3.1;
        //亮度
        this.colorCorrectionBrightness = options.brightness || 1.8;
        //对比度
        this.colorCorrectionContrast = options.contrast || 1.2;
        //色调
        this.colorCorrectionHue = options.hue || 0;
      }) as any)();
      var sceneEffect = gui.addFolder("场景效果");
      sceneEffect
        .add(sceneObj, "bloomEffectShow")
        .name("泛光开关")
        .onChange(function (value: any) {
          viewer.scene.bloomEffect.show = value;
          viewer.scene.bloomEffect.threshold = sceneObj.bloomThreshold;
          viewer.scene.bloomEffect.bloomIntensity = sceneObj.bloomIntensity;
        });
      sceneEffect
        .add(sceneObj, "bloomThreshold", 0, 1, 0.1)
        .name("泛光阈值")
        .onChange(function (value: any) {
          viewer.scene.bloomEffect.threshold = value;
        });
      sceneEffect
        .add(sceneObj, "bloomIntensity", 0, 10, 0.1)
        .name("泛光强度")
        .onChange(function (value: any) {
          viewer.scene.bloomEffect.bloomIntensity = value;
        });
      sceneEffect
        .add(sceneObj, "hdrEnabled")
        .name("HDR开关")
        .onChange(function (value: any) {
          viewer.scene.hdrEnabled = value;
        });
      sceneEffect
        .add(sceneObj, "colorCorrectionShow")
        .name("颜色校正")
        .onChange(function (value: any) {
          viewer.scene.colorCorrection.show = value;
        });
      sceneEffect
        .add(sceneObj, "colorCorrectionSaturation", 0, 5, 0.1)
        .name("饱和度")
        .onChange(function (value: any) {
          viewer.scene.colorCorrection.saturation = value;
        });
      sceneEffect
        .add(sceneObj, "colorCorrectionBrightness", 0, 5, 0.1)
        .name("亮度")
        .onChange(function (value: any) {
          viewer.scene.colorCorrection.brightness = value;
        });
      sceneEffect
        .add(sceneObj, "colorCorrectionContrast", 0, 5, 0.1)
        .name("对比度")
        .onChange(function (value: any) {
          viewer.scene.colorCorrection.contrast = value;
        });
      sceneEffect
        .add(sceneObj, "colorCorrectionHue", 0, 5, 0.1)
        .name("色调")
        .onChange(function (value: any) {
          viewer.scene.hdrEnabled = value;
        });
      sceneEffect
        .add(sceneObj, "colorCorrectionHue", 0, 1, 0.1)
        .name("环境光")
        .onChange(function (value: any) {
          viewer.scene.lightSource.ambientLightColor = new Cesium.Color(value, value, value, 1);
        });
      sceneEffect.open();
    }
  },
  /**
   * 实体位置、角度编辑面板
   * @param {object} param
   * @param {Entity} param.entity - 控制的目标实体
   * @param {string} param.elementId - gui 绑定的dom id
   * @param {function} param.cb - 回调函数
   * @example
   * import { Control } from 'cesium_dev_kit/control'
   * const {control} = new Control({
   *    cesiumGlobal: Cesium,
        containerId: 'cesiumContainer'
      })
      // 调用base 的createGraphics创建一个实体
      const crEnt = control.createGraphics()
      control.showEntityOrientationEditPanel({
        elementId: 'cust-gui-box', 
        entity:crEnt, 
        cb: orientationRes => {
          console.log(orientationRes)
        }
      });
   */
  showEntityOrientationEditPanel: async function (this: ControlInstance, param: any = {}) {
    const dat = await loadDatGui()
    if (param.entity) {
      let Entity = param.entity;
      var gui = new dat.GUI();
      // 修改gui原本的位置，如果提供绑定的父元素id<elementId>就将gui domEmelemt append到对应的dom
      if (param && param.elementId) {
        gui = new dat.GUI({
          autoPlace: false,
        });
        var customContainer = document.getElementById(param.elementId);
        customContainer!.appendChild(gui.domElement);
      } else {
        gui = new dat.GUI();
      }

      var OrientationObj = new( (function (this: any) {
        this.heading = 360;

        this.pitch = 1;

        this.roll = 1;
      }) as any)();
      var Orientation = gui.addFolder("实体姿态调整"),
        $this = this;
      Orientation.add(OrientationObj, "heading", 0, 360, 1)
        .name("角度")
        .onChange(function (value: any) {
          OrientationObj.heading = value;
          let changeOrientation = Cesium.Transforms.headingPitchRollQuaternion(
            Entity.position.getValue($this._viewer.clock.currentTime),
            new Cesium.HeadingPitchRoll(
              Cesium.Math.toRadians(OrientationObj.heading),
              Cesium.Math.toRadians(OrientationObj.pitch),
              Cesium.Math.toRadians(OrientationObj.roll)
            )
          );
          Entity.orientation = changeOrientation;
          param.cb && param.cb({ orientation: changeOrientation });
        });

      Orientation.add(OrientationObj, "pitch", 0, 360, 1)
        .name("航向")
        .onChange(function (value: any) {
          OrientationObj.pitch = value;
          let changeOrientation = Cesium.Transforms.headingPitchRollQuaternion(
            Entity.position.getValue($this._viewer.clock.currentTime),
            new Cesium.HeadingPitchRoll(
              Cesium.Math.toRadians(OrientationObj.heading),
              Cesium.Math.toRadians(OrientationObj.pitch),
              Cesium.Math.toRadians(OrientationObj.roll)
            )
          );
          Entity.orientation = changeOrientation;
          param.cb && param.cb({ orientation: changeOrientation });
        });

      Orientation.add(OrientationObj, "roll", 0, 360, 1)
        .name("翻转")
        .onChange(function (value: any) {
          OrientationObj.roll = value;
          let changeOrientation = Cesium.Transforms.headingPitchRollQuaternion(
            Entity.position.getValue($this._viewer.clock.currentTime),
            new Cesium.HeadingPitchRoll(
              Cesium.Math.toRadians(OrientationObj.heading),
              Cesium.Math.toRadians(OrientationObj.pitch),
              Cesium.Math.toRadians(OrientationObj.roll)
            )
          );
          Entity.orientation = changeOrientation;
          param.cb && param.cb({ orientation: changeOrientation });
        });
      Orientation.open();
    }
  },

  /**
   * 定义事件（拖拽 / 旋转 / 缩放）
   * @param {object} options
   * @param {Entity} options.targetEntity - 操作的目标实体
   * @param {ctrlManualFlag} options.ctrlFlag - 操作状态标识，如 `{ selected: false, leftDown: false }`
   * @example
   * import { Control } from 'cesium_dev_kit/control'
   * const {control} = new Control({
   *    cesiumGlobal: Cesium,
        containerId: 'cesiumContainer'
      })
   * let ctrlManualFlag = {
        selected: false,
        leftDown: false
      }
     // 调用base 的createGraphics创建一个实体
      const entity = control.createGraphics()
   * control.definedMouseEvent({ targetEntity: entity, ctrlFlag: ctrlManualFlag })
   */
  definedMouseEvent(this: ControlInstance, { targetEntity, ctrlFlag }: DefinedMouseEventOptions = {}) {
    dragEntity = targetEntity;
    currManualFlag = ctrlFlag || {};
    this.bindHandleEvent({
      leftDown: this.defLeftDown,
      mouseMove: this.defMouseMove,
      mouseWheel: this.defMouseWheel,
      leftUp: this.defLeftUp,
    });
  },
  defMouseMove(this: ControlInstance, movement?: any) {
    if (currManualFlag.leftDown && pickedObject) {
      //鼠标在场景中移动的位置
      let ray = _global_viewer.camera.getPickRay(movement.endPosition);
      //鼠标在移动过程中与三维场景中移动的坐标位置
      let cartesian = _global_viewer.scene.globe.pick(ray, _global_viewer.scene);
      //改变鼠标样式
      document.body.style.cursor = "pointer";
      if (pickedObject && pickedObject.id && mode === "move") {
        //获取到物体当前的位置
        let currentTime = Cesium.JulianDate.fromDate(new Date());
        let positionC3 = dragEntity.position.getValue(currentTime);
        let catographic = Cesium.Cartographic.fromCartesian(positionC3);
        let height = Number(catographic.height.toFixed(3));
        //动态回调改变物体的位置
        dragEntity.position = new Cesium.CallbackProperty(() => {
          let cartographic = _global_viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian);
          let longitude = Cesium.Math.toDegrees(cartographic.longitude);
          let latitude = Cesium.Math.toDegrees(cartographic.latitude);
          let position = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
          return position;
        }, false);
      } else if (pickedObject && pickedObject.id && mode === "rotate") {
        let currentTime = Cesium.JulianDate.fromDate(new Date());
        let center = dragEntity.position.getValue(currentTime);

        //获取鼠标移动起始位置与地球球面求交的开始位置和结束位置
        let start = _global_viewer.scene.camera.pickEllipsoid(movement.startPosition);
        let end = _global_viewer.scene.camera.pickEllipsoid(movement.endPosition);

        //计算旋转轴
        const vector2 = Cesium.Cartesian3.subtract(center, end, new Cesium.Cartesian3());
        //归一化
        const normal = Cesium.Cartesian3.normalize(vector2, new Cesium.Cartesian3());

        //计算起始点的旋转角度
        let startNormal = Cesium.Cartesian3.subtract(start, center, new Cesium.Cartesian3());
        let endNormal = Cesium.Cartesian3.subtract(end, center, new Cesium.Cartesian3());
        let angleBetween = Cesium.Cartesian3.angleBetween(startNormal, endNormal);
        //旋转因子
        const rotate = 100;
        //计算出朝向
        const quaternion = Cesium.Quaternion.fromAxisAngle(normal, angleBetween * rotate);
        dragEntity.orientation = quaternion;
      }
    }
  },
  defLeftDown(this: ControlInstance, movement?: any) {
    //选中物体
    pickedObject = _global_viewer.scene.pick(movement.position);
    if (Cesium.defined(pickedObject) && mode) {
      //选中
      currManualFlag.selected = true;
      currManualFlag.leftDown = true;
    } else {
      currManualFlag.selected = false;
    }
  },
  defMouseWheel(this: ControlInstance, movement?: any) {
    if (pickedObject && pickedObject.id && mode === "scale") {
      //计算出当前盒子的尺寸
      let currentTime = Cesium.JulianDate.fromDate(new Date());
      let dimensions = dragEntity.box.dimensions.getValue(currentTime);
      //计算缩放因子
      let scale = movement > 0 ? 2 : 0.5;
      dragEntity.box.dimensions = new Cesium.CallbackProperty(() => {
        let cartesian3 = Cesium.Cartesian3.multiplyByScalar(dimensions, scale, new Cesium.Cartesian3());
        return cartesian3;
      }, false);
    }
  },
  defLeftUp(this: ControlInstance, movement?: any) {
    currManualFlag.leftDown = false;
    document.body.style.cursor = "default";
  },
  /**
   * 平移模型
   * @param {string} modifyMode - 移动标识，可选['move','rotate','scale']
   * @example
   * import { Control } from 'cesium_dev_kit/control'
   * const {control} = new Control({
   *    cesiumGlobal: Cesium,
        containerId: 'cesiumContainer'
      })
   * control.manualMoveModel('move')
   */
  manualMoveModel: function (this: ControlInstance, modifyMode: string) {
    mode = modifyMode;
    this._viewer.scene.screenSpaceCameraController.enableRotate = false;
    this._viewer.scene.screenSpaceCameraController.enableZoom = true;
  },
  /**
   *  旋转模型
   * @param {string} modifyMode - 移动标识，可选['move','rotate','scale']
   * @example
   * import { Control } from 'cesium_dev_kit/control'
   * const {control} = new Control({
   *    cesiumGlobal: Cesium,
        containerId: 'cesiumContainer'
      })
   * control.manualRotateModel('rotate')
   */
  manualRotateModel: function (this: ControlInstance, modifyMode: string) {
    mode = modifyMode;
    this._viewer.scene.screenSpaceCameraController.enableRotate = false;
    this._viewer.scene.screenSpaceCameraController.enableZoom = true;
  },
  /**
   *  缩放模型
   * @param {string} modifyMode - 移动标识，可选['move','rotate','scale']
   * @example
   * import { Control } from 'cesium_dev_kit/control'
   * const {control} = new Control({
   *    cesiumGlobal: Cesium,
        containerId: 'cesiumContainer'
      })
   * control.manualScaleModel('scale')
   */
  manualScaleModel: function (this: ControlInstance, modifyMode: string) {
    mode = modifyMode;
    this._viewer.scene.screenSpaceCameraController.enableZoom = false;
  },
} as unknown as ControlInstance;

  return Control
}

export const Control = createScopedConstructor(createControlModule) as unknown as ControlConstructor
