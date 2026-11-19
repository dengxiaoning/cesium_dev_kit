import type { CesiumGlobal, StaticResourceConf } from './Base'
import { asProperty } from './Base'
import { createScopedConstructor } from './Base'
import { createDefaultStatic } from '../defaultStatic'

/** 模块内部持有的 cesium 全局对象 */

/** Cesium.Property 静态工具方法（.d.ts 未导出，手动补充） */
type PropertyStatic = any & {
  getValueOrClonedDefault(property: unknown, time: any, defaultVal: unknown, result?: unknown): unknown
  getValueOrUndefined(property: unknown, time: any, result?: unknown): unknown
  equals(left: unknown, right: unknown): boolean
}

/** Cesium.defaultValue（含内部 EMPTY_OBJECT 静态成员） */
type DefaultValueWithEmpty = any & { EMPTY_OBJECT: Record<string, never> }

/* ===== 由原 JSDoc @typedef 生成的类型 ===== */

/** addMaterialLineGraphics 的参数 */
export interface MaterialLineGraphicsOptions {
  /** 坐标（单个或数组） */
  positions?: any | any[]
  /** 颜色 */
  color?: any
  /** 持续时长 */
  duration?: number
  /** 宽度 */
  width?: number
  /** 图片 url */
  image?: string
}

/** getCustomMaterialLine / _initPolylineCustomMaterialProperty 的参数 */
export interface CustomMaterialLineOptions {
  /** 颜色 */
  color?: any
  /** 图片 url */
  image?: string
  /** 持续时长 */
  duration?: number
  /** Julian 时间（或秒数） */
  time?: any | number
  /** 自定义材质类型名 */
  MaterialType?: string
}

/** getCustomMaterialWall / _initWallCustomMaterialProperty 的参数 */
export interface CustomMaterialWallOptions extends CustomMaterialLineOptions {
  /** 频率 */
  count?: number
  /** 方向，可选 ["vertical"|"cross"] */
  freely?: string
  /** 方向，可选 ["-"|"+"] */
  direction?: string
}

/** 动态材质属性实例（各 _installXxx 内定义的 MaterialProperty 类实例） */
interface DynamicMaterialProperty {
  _definitionChanged: any
  _color: unknown
  _colorSubscription: unknown
  color: unknown
  duration: number
  _time: any
  _duration: any
  _durationSubscription: unknown
  count: number
  gradient: number
  _img: string
  image: string
  speed: number
  isTranslucent: () => boolean
}

/** Material 实例类型 */

/** Material 构造函数类型 */

/**
 * 材质模块
 * @class
 * @augments  module:Base
 * @param {object}  viewer - cesium 实例
 * @param {object}  cesiumGlobal - cesium 全局对象
 * @param {Array}  defaultStatic - 静态资源
 * @exports  Material
 */
/** 材质属性构造函数类型 */
type MaterialPropertyCtor = new (options?: Record<string, unknown>) => DynamicMaterialProperty

/**
 * 为每个实例创建独立闭包，避免模块级 Cesium/dfSt 及交互状态在多个 viewer 间共享。
 * 由 createScopedConstructor 在每次 new 时调用。
 */
export function createMaterialModule() {
  let Cesium = null as unknown as CesiumGlobal
  let dfSt: StaticResourceConf | undefined = undefined

class Material {
  _viewer!: any
  createGraphics!: () => any
  getDfSt!: (attrArr: string[]) => string | undefined
  _getDynamicLineShader!: (options?: { get?: boolean }) => string | undefined
  _getDirectionWallShader!: (options?: { get?: boolean; count?: number; freely?: string; direction?: string }) => string | undefined
  _getDynamicCircleShader!: (options?: { get?: boolean }) => string | undefined
  _getCircleFadeShader!: (options?: { get?: boolean }) => string | undefined
  _getDynamicLightLineShader!: (options?: { get?: boolean }) => string | undefined
  _getFlowLineShader!: (options?: { get?: boolean }) => string | undefined
  image?: string

  constructor(viewer?: any, cesiumGlobal?: CesiumGlobal, defaultStatic?: StaticResourceConf) {
  if (viewer) {
    Cesium = cesiumGlobal as CesiumGlobal;
    // 未显式传入时回退到库内置配置，避免图片地址变成相对路径后静默 404
    dfSt = defaultStatic || createDefaultStatic();
    this._installMaterial();
  }
}



  /**
   * 安装默认拓展材质
   * @private
   */
  _installMaterial() {
    this._installWaveCircleMaterial();

    this._installCircleFadeMaterial();

    this._installCityLineMaterial();

    this._installWarnMaterial();

    this._installFlowMaterial();
    this._installPolylineTrailLinkMaterial();
  }
  /**
   * 添加动态炫光线材质
   * @function
   * @param {object} options
   * @returns {polyline} 返回polyline实例
   * @example
   * const material = new Material({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
   * // image 指向流光贴图，positions 传 Cartesian3 数组
   * material.addMaterialLineGraphics({
   *   positions: Cesium.Cartesian3.fromDegreesArray([104.06, 30.60, 104.10, 30.66]),
   *   image: 'static/data/images/material/line.png',
   *   color: Cesium.Color.CYAN,
   *   duration: 2000,
   *   width: 8
   * })
   */
  addMaterialLineGraphics( options?: MaterialLineGraphicsOptions) {
    if (this._viewer && options && options.image) {
      var _entity = this.createGraphics();

      _entity.polyline = {
        positions: asProperty(options.positions),
        material: new Cesium.PolylineCustomMaterialProperty({
          color: options.color || Cesium.Color.RED,
          duration: options.duration || 500,
        }),
        width: asProperty(options.width),
      } as unknown as any;

      return this._viewer.entities.add(_entity);
    }
  }
  /**
   * 获取一个动态线材质
   * @param {object} options
   * @returns {PolylineCustomMaterialProperty}
   */
  getCustomMaterialLine( options?: CustomMaterialLineOptions) {
    if (this._viewer && options && options.image) {
      // 初始化自定义材质线
      return this._initPolylineCustomMaterialProperty(options) as unknown as any | undefined;
    }
  }
  /**
   * 动态线材质
   * @private
   * @returns {PolylineCustomMaterialProperty}
   */
  _initPolylineCustomMaterialProperty( options?: CustomMaterialLineOptions) {
    if (options) {
      var Color = Cesium.Color,
        defaultValue = Cesium.defaultValue as unknown as DefaultValueWithEmpty,
        defined = Cesium.defined,
        defineProperties = Object.defineProperties,
        Event = Cesium.Event,
        createPropertyDescriptor = Cesium.createPropertyDescriptor,
        Property = Cesium.Property as unknown as PropertyStatic,
        Material = Cesium.Material,
        defaultColor = Color.WHITE,
        MaterialType = options.MaterialType || "wallType" + parseInt(String(Math.random() * 1000));

      const PolylineCustomMaterialProperty = function (this: DynamicMaterialProperty, options: CustomMaterialLineOptions) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        this._definitionChanged = new Event();
        this._color = undefined;
        this._colorSubscription = undefined;
        this.color = options.color || Cesium.Color.BLUE;
        this.duration = options.duration || 1000;
        this._time = undefined;
      };

      defineProperties(PolylineCustomMaterialProperty.prototype, {
        isvarant: {
          get: function () {
            return false;
          },
        },
        definitionChanged: {
          get: function (this: DynamicMaterialProperty) {
            return this._definitionChanged;
          },
        },
        color: createPropertyDescriptor("color"),
      });
      PolylineCustomMaterialProperty.prototype.getType = function () {
        return MaterialType;
      };
      PolylineCustomMaterialProperty.prototype.getValue = function (this: DynamicMaterialProperty, time: any, result: Record<string, unknown>) {
        if (!defined(result)) {
          result = {};
        }
        result.color = Property.getValueOrClonedDefault(this._color, time, defaultColor, result.color);
        result.image = options.image;
        if (this._time === undefined) {
          this._time = time.secondsOfDay;
        }
        result.time = ((time.secondsOfDay - this._time) * 1000) / this.duration;
        return result;
      };
      PolylineCustomMaterialProperty.prototype.equals = function (this: DynamicMaterialProperty, other: DynamicMaterialProperty) {
        return (
          this === other || //
          (other instanceof (PolylineCustomMaterialProperty as unknown as MaterialPropertyCtor) && Property.equals(this._color, other._color))
        );
      };
      (Material as unknown as { _materialCache: { addMaterial: (type: string, fabric: Record<string, unknown>) => void } })._materialCache.addMaterial(MaterialType, {
        fabric: {
          type: MaterialType,
          uniforms: {
            color: options.color || new Cesium.Color(1.0, 0.0, 0.0, 0.5),
            image: options.image,
            time: options.time || 0,
          },
          source: this._getDynamicLineShader({
            get: true,
          }),
        },
        translucent: function () {
          return true;
        },
      });
      return new (PolylineCustomMaterialProperty as unknown as MaterialPropertyCtor)(options as unknown as Record<string, unknown>);
    }
  }
  /**
   * 添加 动态围栏/炫光墙体
   * @function
   * @returns {wall} 返回wall实例
   * @example
   * const material = new Material({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
   * // 传入面状坐标（首尾可重复），自动生成带流光效果的围墙
   * material.addMaterialWallGraphics({
   *   positions: Cesium.Cartesian3.fromDegreesArray([104.06, 30.60, 104.10, 30.60, 104.10, 30.64]),
   *   image: 'static/data/images/material/wall.png',
   *   color: Cesium.Color.ORANGE,
   *   duration: 3000
   * })
   */
  addMaterialWallGraphics( options?: MaterialLineGraphicsOptions) {
    if (this._viewer && options && options.image) {
      var _entity = this.createGraphics();
      _entity.wall = {
        positions: asProperty(options.positions),
        material: this.getCustomMaterialWall(options) as any,
        width: asProperty(options.width),
      } as unknown as any;

      return this._viewer.entities.add(_entity);
    }
  }
  /**
   * 获取一个材质围栏
   * @function
   * @returns {WallLinkCustomMaterialProperty}
   */
  getCustomMaterialWall( options?: CustomMaterialWallOptions) {
    if (this._viewer && options && options.image) {
      return this._initWallCustomMaterialProperty(options) as unknown as any | undefined;
    }
  }
  /**
   * 动态墙材质
   * @private
   */
  _initWallCustomMaterialProperty( options?: CustomMaterialWallOptions) {
    var Color = Cesium.Color,
      defaultValue = Cesium.defaultValue as unknown as DefaultValueWithEmpty,
      defined = Cesium.defined,
      defineProperties = Object.defineProperties,
      Event = Cesium.Event,
      createPropertyDescriptor = Cesium.createPropertyDescriptor,
      Property = Cesium.Property as unknown as PropertyStatic,
      Material = Cesium.Material,
      MaterialType = options!.MaterialType || "wallType" + parseInt(String(Math.random() * 1000));
    const WallLinkCustomMaterialProperty = function (this: DynamicMaterialProperty, options: CustomMaterialWallOptions) {
      options = defaultValue(options, defaultValue.EMPTY_OBJECT);
      this._definitionChanged = new Event();
      this._color = undefined;
      this._colorSubscription = undefined;
      this.color = options.color || Color.BLUE;
      this.duration = options.duration || 3000;
      this._time = new Date().getTime();
    };

    defineProperties(WallLinkCustomMaterialProperty.prototype, {
      isvarant: {
        get: function () {
          return false;
        },
      },
      definitionChanged: {
        get: function (this: DynamicMaterialProperty) {
          return this._definitionChanged;
        },
      },
      color: createPropertyDescriptor("color"),
    });
    WallLinkCustomMaterialProperty.prototype.getType = function () {
      return MaterialType;
    };
    WallLinkCustomMaterialProperty.prototype.getValue = function (this: DynamicMaterialProperty, time: any, result: Record<string, unknown>) {
      if (!defined(result)) {
        result = {};
      }
      result.color = Property.getValueOrClonedDefault(this._color, time, Color.WHITE, result.color);
      result.image = options!.image;

      result.time = ((new Date().getTime() - (this._time as number)) % this.duration) / this.duration;
      return result;
    };
    WallLinkCustomMaterialProperty.prototype.equals = function (this: DynamicMaterialProperty, other: DynamicMaterialProperty) {
      return (
        this === other || (other instanceof (WallLinkCustomMaterialProperty as unknown as MaterialPropertyCtor) && Property.equals(this._color, other._color))
      );
    };
    //动态墙
    (Material as unknown as { _materialCache: { addMaterial: (type: string, fabric: Record<string, unknown>) => void } })._materialCache.addMaterial(MaterialType, {
      fabric: {
        type: MaterialType,
        uniforms: {
          color: new Color(1.0, 0.0, 0.0, 0.5),
          image: options!.image,
          time: 0,
        },
        source: this._getDirectionWallShader({
          get: true,
          count: options!.count,
          freely: options!.freely,
          direction: options!.direction,
        }),
      },
      translucent: function () {
        return true;
      },
    });
    return new (WallLinkCustomMaterialProperty as unknown as MaterialPropertyCtor)(options as unknown as Record<string, unknown>);
  }
  // 波动圆材质
  _installWaveCircleMaterial() {
    var _self = this,
      Color = Cesium.Color,
      defaultValue = Cesium.defaultValue as unknown as DefaultValueWithEmpty,
      defineProperties = Object.defineProperties,
      Event = Cesium.Event,
      Property = Cesium.Property as unknown as PropertyStatic,
      Material = Cesium.Material;

    /**
     * 波动圆材质
     * @global
     */
    function CircleWaveMaterialProperty(this: DynamicMaterialProperty, options: { color?: any; duration?: number; count?: number; gradient?: number }) {
      options = options || {};
      this._definitionChanged = new Event();
      this._color = undefined;
      this._colorSubscription = undefined;
      this._duration = undefined;
      this._durationSubscription = undefined;
      this.color = defaultValue(options.color, Color.fromBytes(0, 255, 255, 255));
      this.duration = defaultValue(options.duration, 45);
      this.count = Math.max(defaultValue(options.count, 2), 1);
      this.gradient = defaultValue(options.gradient, 0.1);
      if (this.gradient < 0) {
        this.gradient = 0;
      } else if (this.gradient > 1) {
        this.gradient = 1;
      }
    }

    defineProperties(CircleWaveMaterialProperty.prototype, {
      isConstant: {
        get: function () {
          return false;
        },
      },
      definitionChanged: {
        get: function (this: DynamicMaterialProperty) {
          return this._definitionChanged;
        },
      },
    });

    CircleWaveMaterialProperty.prototype.getType = function () {
      return (Material as unknown as { CircleWaveType: string }).CircleWaveType;
    };
    CircleWaveMaterialProperty.prototype.getValue = function (this: DynamicMaterialProperty, time: any, result: Record<string, unknown>) {
      if (!result) {
        result = {};
      }
      result.color = Property.getValueOrUndefined(this._color, time);
      result.duration = this._duration;
      result.count = this.count;
      result.gradient = this.gradient;
      return result;
    };
    CircleWaveMaterialProperty.prototype.equals = function (this: DynamicMaterialProperty, other: DynamicMaterialProperty) {
      return (
        this === other || (other instanceof (CircleWaveMaterialProperty as unknown as MaterialPropertyCtor) && Property.equals(this._color, other._color))
      );
    };

    defineProperties(CircleWaveMaterialProperty.prototype, {
      color: Cesium.createPropertyDescriptor("color"),
      duration: Cesium.createPropertyDescriptor("duration"),
    });

    Cesium.Scene.CircleWaveMaterialProperty = CircleWaveMaterialProperty;
    (Material as unknown as { CircleWaveType: string }).CircleWaveType = "CircleWave";
    (Material as unknown as { _materialCache: { addMaterial: (type: string, fabric: Record<string, unknown>) => void } })._materialCache.addMaterial((Material as unknown as { CircleWaveType: string }).CircleWaveType, {
      fabric: {
        type: (Material as unknown as { CircleWaveType: string }).CircleWaveType,
        uniforms: {
          color: new Color(1.0, 0.0, 0.0, 0.7),
          duration: 45,
          count: 1,
          gradient: 0.1,
        },
        source: _self._getDynamicCircleShader({
          get: true,
        }),
      },
      translucent: function () {
        return true;
      },
    });
  }
  // 渐变圆
  _installCircleFadeMaterial() {
    var Color = Cesium.Color,
      defaultValue = Cesium.defaultValue as unknown as DefaultValueWithEmpty,
      defineProperties = Object.defineProperties,
      Event = Cesium.Event,
      Property = Cesium.Property as unknown as PropertyStatic,
      Material = Cesium.Material,
      _color = new Color(0, 0, 0, 0);

    /**
     * 渐变圆材质
     * @global
     */
    function CircleFadeMaterialProperty(this: DynamicMaterialProperty, options: { color?: any; duration?: number }) {
      options = defaultValue(options, defaultValue.EMPTY_OBJECT);
      this._definitionChanged = new Event();
      this._color = void 0;
      this._colorSubscription = void 0;
      this.color = defaultValue(options.color, _color);
      this._duration = options.duration || 1e3;
      this._time = void 0;
    }

    defineProperties(CircleFadeMaterialProperty.prototype, {
      isConstant: {
        get: function () {
          return false;
        },
      },
      definitionChanged: {
        get: function (this: DynamicMaterialProperty) {
          return this._definitionChanged;
        },
      },
    });

    CircleFadeMaterialProperty.prototype.getType = function () {
      return (Material as unknown as { CircleFadeMaterialType: string }).CircleFadeMaterialType;
    };
    CircleFadeMaterialProperty.prototype.getValue = function (this: DynamicMaterialProperty, time: any, result: Record<string, unknown>) {
      if (!result) {
        result = {};
      }
      (result.color = Property.getValueOrClonedDefault(this._color, time, _color, result.color)),
        void 0 === this._time && (this._time = new Date().getTime()),
        (result.time = (new Date().getTime() - this._time) / (this._duration as number));
      return result;
    };
    CircleFadeMaterialProperty.prototype.equals = function (this: DynamicMaterialProperty, other: DynamicMaterialProperty) {
      return (
        this === other || (other instanceof (CircleFadeMaterialProperty as unknown as MaterialPropertyCtor) && Property.equals(this._color, other._color))
      );
    };
    defineProperties(CircleFadeMaterialProperty.prototype, {
      color: Cesium.createPropertyDescriptor("color"),
    });
    Cesium.Scene.CircleFadeMaterialProperty = CircleFadeMaterialProperty;
    (Material as unknown as { CircleFadeMaterialType: string }).CircleFadeMaterialType = "CircleFadeMaterial";
    (Material as unknown as { _materialCache: { addMaterial: (type: string, fabric: Record<string, unknown>) => void } })._materialCache.addMaterial((Material as unknown as { CircleFadeMaterialType: string }).CircleFadeMaterialType, {
      fabric: {
        type: (Material as unknown as { CircleFadeMaterialType: string }).CircleFadeMaterialType,
        uniforms: {
          color: new Color(1, 0, 0, 1),
          time: 1,
        },
        source: this._getCircleFadeShader({
          get: true,
        }),
      },
      translucent: function () {
        return !0;
      },
    });
  }
  // 城市光效线
  _installCityLineMaterial() {
    var Color = Cesium.Color,
      defaultValue = Cesium.defaultValue as unknown as DefaultValueWithEmpty,
      defined = Cesium.defined,
      defineProperties = Object.defineProperties,
      Event = Cesium.Event,
      createPropertyDescriptor = Cesium.createPropertyDescriptor,
      Property = Cesium.Property as unknown as PropertyStatic,
      Material = Cesium.Material,
      defaultColor = Color.WHITE;
    /**
     *动态泛光线(随机颜色)
     * @global
     */
    function PolylineCityLinkMaterialProperty(this: DynamicMaterialProperty, options: { color?: any; duration?: number; imgUrl?: string }) {
      options = defaultValue(options, defaultValue.EMPTY_OBJECT);
      this._definitionChanged = new Event();
      this._color = undefined;
      this._colorSubscription = undefined;
      this.color = options.color || Cesium.Color.BLUE;
      this.duration = options.duration || 1000;
      this._time = undefined;
      this._img = options.imgUrl || (Material as unknown as { PolylineCityLinkImage: string }).PolylineCityLinkImage;
    }

    defineProperties(PolylineCityLinkMaterialProperty.prototype, {
      isvarant: {
        get: function () {
          return false;
        },
      },
      definitionChanged: {
        get: function (this: DynamicMaterialProperty) {
          return this._definitionChanged;
        },
      },
      color: createPropertyDescriptor("color"),
    });
    PolylineCityLinkMaterialProperty.prototype.getType = function () {
      return (Material as unknown as { PolylineCityLinkType: string }).PolylineCityLinkType;
    };
    PolylineCityLinkMaterialProperty.prototype.getValue = function (this: DynamicMaterialProperty, time: any, result: Record<string, unknown>) {
      if (!defined(result)) {
        result = {};
      }

      result.color = Property.getValueOrClonedDefault(this._color, time, defaultColor, result.color);
      result.image = this._img;
      if (this._time === undefined) {
        this._time = time.secondsOfDay;
      }
      result.time = ((time.secondsOfDay - this._time) * 1000) / this.duration;
      return result;
    };
    PolylineCityLinkMaterialProperty.prototype.equals = function (this: DynamicMaterialProperty, other: DynamicMaterialProperty) {
      return (
        this === other || //
        (other instanceof (PolylineCityLinkMaterialProperty as unknown as MaterialPropertyCtor) && Property.equals(this._color, other._color))
      );
    };

    Cesium.Scene.PolylineCityLinkMaterialProperty = PolylineCityLinkMaterialProperty;
    (Material as unknown as { PolylineCityLinkType: string }).PolylineCityLinkType = "PolylineCityLink";
    (Material as unknown as { PolylineCityLinkImage: string }).PolylineCityLinkImage =
      this.getDfSt(["material", "PolylineCityLinkMaterialProperty"]) || "static/data/images/Textures/meteor_01.png";
    (Material as unknown as { _materialCache: { addMaterial: (type: string, fabric: Record<string, unknown>) => void } })._materialCache.addMaterial((Material as unknown as { PolylineCityLinkType: string }).PolylineCityLinkType, {
      fabric: {
        type: (Material as unknown as { PolylineCityLinkType: string }).PolylineCityLinkType,
        uniforms: {
          color: new Color(1, 0, 0, 1.0),
          image: (Material as unknown as { PolylineCityLinkImage: string }).PolylineCityLinkImage,
          time: 0,
        },
        source: this._getDynamicLightLineShader({
          get: true,
        }),
      },
      translucent: function () {
        return true;
      },
    });
  }
  // 城市警示墙
  _installWarnMaterial() {
    var Color = Cesium.Color,
      defaultValue = Cesium.defaultValue as unknown as DefaultValueWithEmpty,
      defined = Cesium.defined,
      defineProperties = Object.defineProperties,
      Event = Cesium.Event,
      createPropertyDescriptor = Cesium.createPropertyDescriptor,
      Property = Cesium.Property as unknown as PropertyStatic,
      Material = Cesium.Material;
    /**
     * 警示标线材质
     * @global
     */
    function WarnLinkMaterialProperty(this: DynamicMaterialProperty, options: { color?: any; duration?: number }) {
      options = defaultValue(options, defaultValue.EMPTY_OBJECT);
      this._definitionChanged = new Event();
      this._color = undefined;
      this._colorSubscription = undefined;
      this.color = options.color || Color.BLUE;
      this.duration = options.duration || 3000;
      this._time = new Date().getTime();
    }

    defineProperties(WarnLinkMaterialProperty.prototype, {
      isvarant: {
        get: function () {
          return false;
        },
      },
      definitionChanged: {
        get: function (this: DynamicMaterialProperty) {
          return this._definitionChanged;
        },
      },
    });
    WarnLinkMaterialProperty.prototype.getType = function () {
      return (Material as unknown as { WarnLinkType: string }).WarnLinkType;
    };
    WarnLinkMaterialProperty.prototype.getValue = function (this: DynamicMaterialProperty, time: any, result: Record<string, unknown>) {
      if (!defined(result)) {
        result = {};
      }
      result.color = Property.getValueOrClonedDefault(this._color, time, Color.WHITE, result.color);
      result.image = (Material as unknown as { WarnLinkImage: string }).WarnLinkImage;
      result.time = ((new Date().getTime() - (this._time as number)) % this.duration) / this.duration;
      return result;
    };
    WarnLinkMaterialProperty.prototype.equals = function (this: DynamicMaterialProperty, other: DynamicMaterialProperty) {
      return this === other || (other instanceof (WarnLinkMaterialProperty as unknown as MaterialPropertyCtor) && Property.equals(this._color, other._color));
    };

    defineProperties(WarnLinkMaterialProperty.prototype, {
      color: createPropertyDescriptor("color"),
    });

    Cesium.Scene.WarnLinkMaterialProperty = WarnLinkMaterialProperty;
    (Material as unknown as { WarnLinkType: string }).WarnLinkType = "WarnWallLinkType";
    (Material as unknown as { WarnLinkImage: string }).WarnLinkImage =
      this.getDfSt(["material", "WarnLinkMaterialProperty"]) || "static/data/images/Textures/jsx2.png";
    (Material as unknown as { _materialCache: { addMaterial: (type: string, fabric: Record<string, unknown>) => void } })._materialCache.addMaterial((Material as unknown as { WarnLinkType: string }).WarnLinkType, {
      fabric: {
        type: (Material as unknown as { WarnLinkType: string }).WarnLinkType,
        uniforms: {
          color: new Color(1.0, 0.0, 0.0, 0.5),
          image: (Material as unknown as { WarnLinkImage: string }).WarnLinkImage,
          time: 0,
        },
        source: this._getDirectionWallShader({
          get: true,
          count: 10.0,
          freely: "cross",
          direction: "-",
        }),
      },
      translucent: function () {
        return true;
      },
    });
  }
  // 轨迹流动线
  _installFlowMaterial() {
    var Color = Cesium.Color,
      defaultValue = Cesium.defaultValue as unknown as DefaultValueWithEmpty,
      defineProperties = Object.defineProperties,
      Event = Cesium.Event,
      createPropertyDescriptor = Cesium.createPropertyDescriptor,
      Property = Cesium.Property as unknown as PropertyStatic,
      Material = Cesium.Material;
    /**
     * 流动线材质
     * @global
     */
    function PolylineFlowMaterialProperty(this: DynamicMaterialProperty, options: { color?: any; duration?: number }) {
      options = defaultValue(options, defaultValue.EMPTY_OBJECT);
      this._definitionChanged = new Event();
      this._color = undefined;
      this._colorSubscription = undefined;
      this.color = options.color || Color.fromBytes(0, 255, 255, 255);
      this._duration = undefined;
      this._durationSubscription = undefined;
      this.duration = defaultValue(options.duration, 45);
    }

    defineProperties(PolylineFlowMaterialProperty.prototype, {
      isConstant: {
        get: function () {
          return false;
        },
      },
      definitionChanged: {
        get: function (this: DynamicMaterialProperty) {
          return this._definitionChanged;
        },
      },
    });

    PolylineFlowMaterialProperty.prototype.getType = function () {
      return (Material as unknown as { PolylineFlowType: string }).PolylineFlowType;
    };

    PolylineFlowMaterialProperty.prototype.getValue = function (this: DynamicMaterialProperty, time: any, result: Record<string, unknown>) {
      if (!result) {
        result = {};
      }
      result.color = Property.getValueOrClonedDefault(this._color, time, Cesium.Color.WHITE, result.color);
      result.duration = this._duration;
      return result;
    };
    PolylineFlowMaterialProperty.prototype.equals = function (this: DynamicMaterialProperty, other: DynamicMaterialProperty) {
      return (
        this === other || (other instanceof (PolylineFlowMaterialProperty as unknown as MaterialPropertyCtor) && Property.equals(this._color, other._color))
      );
    };
    defineProperties(PolylineFlowMaterialProperty.prototype, {
      color: createPropertyDescriptor("color"),
      duration: createPropertyDescriptor("duration"),
    });

    Cesium.Scene.PolylineFlowMaterialProperty = PolylineFlowMaterialProperty;
    (Material as unknown as { PolylineFlowType: string }).PolylineFlowType = "PolylineFlow";
    (Material as unknown as { _materialCache: { addMaterial: (type: string, fabric: Record<string, unknown>) => void } })._materialCache.addMaterial((Material as unknown as { PolylineFlowType: string }).PolylineFlowType, {
      fabric: {
        type: (Material as unknown as { PolylineFlowType: string }).PolylineFlowType,
        uniforms: {
          color: new Color(1.0, 1.0, 2.0, 0.7),
          duration: 45,
        },
        source: this._getFlowLineShader({
          get: true,
        }),
      },
      translucent: function () {
        return true;
      },
    });
  }
  // 多线段尾链
  _installPolylineTrailLinkMaterial() {
    var Color = Cesium.Color,
      defaultValue = Cesium.defaultValue as unknown as DefaultValueWithEmpty,
      defineProperties = Object.defineProperties,
      createPropertyDescriptor = Cesium.createPropertyDescriptor,
      Event = Cesium.Event,
      Property = Cesium.Property as unknown as PropertyStatic,
      Material = Cesium.Material,
      waterImg = this.getDfSt(["primitive", "WaterPrimitive"]);
    /**
     * 多线段尾链
     * @global
     */
    function PolylineTrailLinkMaterial(this: DynamicMaterialProperty, options: { color?: any; image?: string; duration?: number; speed?: number }) {
      options = defaultValue(options, defaultValue.EMPTY_OBJECT);
      this._definitionChanged = new Event();
      this._color = undefined;
      this.color = options.color || Cesium.Color.WHITE;
      this.image = (options.image || waterImg) as string;
      this._colorSubscription = undefined;
      this.duration = options.duration || 3000;
      this._time = new Date().getTime();
      this.speed = options.speed as number;
      this.isTranslucent = function () {
        return true;
      };
    }

    defineProperties(PolylineTrailLinkMaterial.prototype, {
      isConstant: {
        get: function () {
          return false;
        },
        configurable: true,
      },
      definitionChanged: {
        get: function (this: DynamicMaterialProperty) {
          return this._definitionChanged;
        },
        configurable: true,
      },
      color: createPropertyDescriptor("color"),
      duration: createPropertyDescriptor("duration"),
    });

    PolylineTrailLinkMaterial.prototype.getType = function () {
      return (Material as unknown as { PolylineTrailLinkType: string }).PolylineTrailLinkType;
    };

    PolylineTrailLinkMaterial.prototype.getValue = function (this: DynamicMaterialProperty, time: any, result: Record<string, unknown>) {
      if (!Cesium.defined(result)) {
        result = {};
      }
      result.color = Property.getValueOrClonedDefault(this._color, time, this.color, result.color);
      result.image = (Material as unknown as { PolylineTrailLinkImage: string }).PolylineTrailLinkImage;
      result.time = (((new Date().getTime() - (this._time as number)) % this.duration) / this.duration) * this.speed;
      return result;
    };
    PolylineTrailLinkMaterial.prototype.equals = function (this: DynamicMaterialProperty, other: DynamicMaterialProperty) {
      return this === other || (other instanceof (PolylineTrailLinkMaterial as unknown as MaterialPropertyCtor) && Property.equals(this._color, other._color));
    };

    (Material as unknown as { PolylineTrailLinkSource: string }).PolylineTrailLinkSource = `
    uniform vec4 color;
    uniform float time;
    uniform sampler2D image;
    czm_material czm_getMaterial(czm_materialInput materialInput)
    {
        czm_material material = czm_getDefaultMaterial(materialInput);
        vec2 st = materialInput.st;
        vec4 colorImage = texture(image, vec2(fract(st.s - time), st.t));
        material.alpha = colorImage.a * color.a;
        material.diffuse = (colorImage.rgb+color.rgb)/2.0;
        return material;
    }`;
    Cesium.Scene.PolylineTrailLinkMaterial = PolylineTrailLinkMaterial;
    (Material as unknown as { PolylineTrailLinkType: string }).PolylineTrailLinkType = "PolylineTrailLinkMaterial";
    (Material as unknown as { PolylineTrailLinkImage: string }).PolylineTrailLinkImage = this.image || waterImg || "static/data/images/Textures/river.png";
    (Material as unknown as { _materialCache: { addMaterial: (type: string, fabric: Record<string, unknown>) => void } })._materialCache.addMaterial((Material as unknown as { PolylineTrailLinkType: string }).PolylineTrailLinkType, {
      fabric: {
        type: (Material as unknown as { PolylineTrailLinkType: string }).PolylineTrailLinkType,
        uniforms: {
          color: new Color(1.0, 1.0, 1.0, 1),
          image: (Material as unknown as { PolylineTrailLinkImage: string }).PolylineTrailLinkImage,
          time: -20,
        },
        source: (Material as unknown as { PolylineTrailLinkSource: string }).PolylineTrailLinkSource,
      },
      translucent: function () {
        return true;
      },
    });
  }
}
  return Material
}

export const Material = createScopedConstructor(createMaterialModule)
export type MaterialInstance = InstanceType<typeof Material>

export type MaterialConstructor = typeof Material
