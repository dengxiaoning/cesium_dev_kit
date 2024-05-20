let Cesium = null;
let dfSt = undefined;
/**
 * 材质模块
 * @class
 * @augments  module:Base
 * @param {object}  viewer - cesium 实例
 * @param {object}  cesiumGlobal - cesium 全局对象
 * @param {Array}  defaultStatic - 静态资源
 * @exports  Material
 */
function Material(viewer, cesiumGlobal, defaultStatic) {
  if (viewer) {
    Cesium = cesiumGlobal;
    dfSt = defaultStatic;
    this._installMaterial();
  }
}

Material.prototype = {
  /**
   * 安装默认拓展材质
   * @private
   */
  _installMaterial: function () {
    this._installWaveCircleMaterial();

    this._installCircleFadeMaterial();

    this._installCityLineMaterial();

    this._installWarnMaterial();

    this._installFlowMaterial();
    this._installPolylineTrailLinkMaterial();
  },
  /**
   * 添加动态炫光线材质
   * @function
   * @param {object} options
   * @param {string} options.image - 图片url
   * @param {Cartesian3} options.positions - 坐标
   * @param {Color} options.color - 颜色
   * @param {number} options.duration - 持续时长
   * @param {number} options.width - 宽度
   * @example
   *  import { Material } from 'cesium_dev_kit'
   * const {material,viewer} = new Material({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   *  material.addMaterialLineGraphics({
   *     positions:Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 400.0)
   *     color:Cesium.Color.GREEN,
   *     image:'static/data/images/Textures/billboard2.png',
   *     duration:500,
   *     width:2
   * })
   * @returns {polyline} 返回polyline实例
   */
  addMaterialLineGraphics: function (options) {
    if (this._viewer && options && options.image) {
      var _entity = this.createGraphics();

      _entity.polyline = {
        positions: options.positions,
        material: new Cesium.PolylineCustomMaterialProperty({
          color: options.color || Cesium.Color.RED,
          duration: options.duration || 500,
        }),
        width: options.width,
      };

      return this._viewer.entities.add(_entity);
    }
  },
  /**
   * 获取一个动态线材质
   * @param {object} options
   * @param {string} options.image - 图片url
   * @param {number} options.duration - 持续时长
   * @param {Color} options.color - 颜色
   * @param {JulianDate} options.time - Julian时间
   * @example
   * import { initCesium } from 'cesium_dev_kit'
   * const {viewer,graphics,material} = new initCesium({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * const materialCust =   material.getCustomMaterialLine({
   *     color:Cesium.Color.GREEN,
   *     image:'static/data/images/Textures/billboard2.png',
   *     duration:1005,
   *     time:Cesium.JulianDate.fromIso8601("2024-05-19 15:36"),
   * })
   *  graphics.getLineGraphics({
   *     positions:Cesium.Cartesian3.fromDegreesArray([
          104.09816110606057,
          30.659821965447698,
          104.1120972824757,
          30.65330300319938,
          104.10758419863926,
          30.64592470850288,
          104.09351691196979,
          30.652434826507452,
          104.09816110606057,
          30.659821965447698
        ]),
   *      material:materialCust,
   *      clampToGround:false,
   *      width:1
   * })
   * @returns {PolylineCustomMaterialProperty}
   */
  getCustomMaterialLine: function (options) {
    if (this._viewer && options && options.image) {
      // 初始化自定义材质线
      return this._initPolylineCustomMaterialProperty(options);
    }
  },
  /**
   * 动态线材质
   * @private
   * @param {string} options.image - 图片url
   * @param {number} options.duration - 持续时长
   * @param {Color} options.color - 颜色
   * @param {JulianDate} options.time - Julian时间
   * @returns {PolylineCustomMaterialProperty}
   */
  _initPolylineCustomMaterialProperty(options) {
    if (options) {
      var Color = Cesium.Color,
        defaultValue = Cesium.defaultValue,
        defined = Cesium.defined,
        defineProperties = Object.defineProperties,
        Event = Cesium.Event,
        createPropertyDescriptor = Cesium.createPropertyDescriptor,
        Property = Cesium.Property,
        Material = Cesium.Material,
        defaultColor = Color.WHITE,
        MaterialType = options.MaterialType || "wallType" + parseInt(Math.random() * 1000);

      const PolylineCustomMaterialProperty = function (options) {
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
          get: function () {
            return this._definitionChanged;
          },
        },
        color: createPropertyDescriptor("color"),
      });
      PolylineCustomMaterialProperty.prototype.getType = function () {
        return MaterialType;
      };
      PolylineCustomMaterialProperty.prototype.getValue = function (time, result) {
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
      PolylineCustomMaterialProperty.prototype.equals = function (other) {
        return (
          this === other || //
          (other instanceof PolylineCustomMaterialProperty && Property.equals(this._color, other._color))
        );
      };
      Material._materialCache.addMaterial(MaterialType, {
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
      return new PolylineCustomMaterialProperty(options);
    }
  },
  /**
   * 添加 动态围栏/炫光墙体
   * @function
   * @param {string} options.image - 图片url
   * @param {number} options.duration - 持续时长
   * @param {Color} options.color - 颜色
   * @param {number} options.width - 宽度
  * @see {@link module:Graphics#createFanShape|Graphics#createFanShape}
   * @example
   *  import { Material } from 'cesium_dev_kit'
   * const {material,viewer} = new Material({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * // 创建炫光墙体
      material.addMaterialWallGraphics({
         positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          104.07263175401185,
          30.647622150198725,
          500.0,
          104.06369117158526,
          30.648834374000277,
          500.0,
          104.06437182811021,
          30.62274533905387,
          500.0,
          104.07463538167119,
          30.62285687644371,
          500.0,
          104.07263175401185,
          30.647622150198725,
          500.0
        ]),
        width:1200,
        image:  'static/data/images/Textures/test1.png',,
        color:   Cesium.Color.BLUE,,
        duration: 2000
      });
   * @returns {wall} 返回wall实例
   */
  addMaterialWallGraphics: function (options) {
    if (this._viewer && options && options.image) {
      var _entity = this.createGraphics();
      _entity.wall = {
        positions: options.positions,
        material: this.getCustomMaterialWall(options),
        width: options.width,
      };

      return this._viewer.entities.add(_entity);
    }
  },
  /**
   * 获取一个材质围栏
   * @function
   * @param {object} options
   * @param {string} options.image - 图片url
   * @param {number} options.duration - 持续时长
   * @param {Color} options.color - 颜色
   * @param {number} options.count - 频率
   * @param {string} options.freely - 方向，可选["vertical"|"cross"]
   * @param {string} options.direction - 方向,可选["-"|"+"]
   * @see {@link module:Graphics#createFanShape|Graphics#createFanShape}
   * @example
   *  import { initCesium } from 'cesium_dev_kit'
   * const {material,graphics,viewer} = new initCesium({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * // 创建动态材质
    const custMaterial = material.getCustomMaterialWall({
        image:  'static/data/images/Textures/test1.png',,
        freely:  'cross',
        direction: '+',
        count: 0.0,,
        color:   Cesium.Color.BLUE,,
        duration: 2000
      });

      // 创建扇形扫描
      graphics.createFanShape({
        viewer,
        longitude: 104.06417395476578,
        latitude: 30.636185094244944,
        alt: 700,
        speed: 2.0,
        direction: '+',
        custMaterial
      })
   * @returns {WallLinkCustomMaterialProperty}
   */
  getCustomMaterialWall: function (options) {
    if (this._viewer && options && options.image) {
      return this._initWallCustomMaterialProperty(options);
    }
  },
  /**
   * 动态墙材质
   * @private
   * @param {object} options
   * @param {string} options.image - 图片url
   * @param {number} options.duration - 持续时长
   * @param {Color} options.color - 颜色
   * @param {number} options.count - 频率
   * @param {string} options.freely - 方向，可选["vertical"|"cross"]
   * @param {string} options.direction - 方向,可选["-"|"+"]
   */
  _initWallCustomMaterialProperty(options) {
    var Color = Cesium.Color,
      defaultValue = Cesium.defaultValue,
      defined = Cesium.defined,
      defineProperties = Object.defineProperties,
      Event = Cesium.Event,
      createPropertyDescriptor = Cesium.createPropertyDescriptor,
      Property = Cesium.Property,
      Material = Cesium.Material,
      MaterialType = options.MaterialType || "wallType" + parseInt(Math.random() * 1000);
    const WallLinkCustomMaterialProperty = function (options) {
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
        get: function () {
          return this._definitionChanged;
        },
      },
      color: createPropertyDescriptor("color"),
    });
    WallLinkCustomMaterialProperty.prototype.getType = function () {
      return MaterialType;
    };
    WallLinkCustomMaterialProperty.prototype.getValue = function (time, result) {
      if (!defined(result)) {
        result = {};
      }
      result.color = Property.getValueOrClonedDefault(this._color, time, Color.WHITE, result.color);
      result.image = options.image;

      result.time = ((new Date().getTime() - this._time) % this.duration) / this.duration;
      return result;
    };
    WallLinkCustomMaterialProperty.prototype.equals = function (other) {
      return (
        this === other || (other instanceof WallLinkCustomMaterialProperty && Property.equals(this._color, other._color))
      );
    };
    //动态墙
    Material._materialCache.addMaterial(MaterialType, {
      fabric: {
        type: MaterialType,
        uniforms: {
          color: new Color(1.0, 0.0, 0.0, 0.5),
          image: options.image,
          time: 0,
        },
        source: this._getDirectionWallShader({
          get: true,
          count: options.count,
          freely: options.freely,
          direction: options.direction,
        }),
      },
      translucent: function () {
        return true;
      },
    });
    return new WallLinkCustomMaterialProperty(options);
  },
  // 波动圆材质
  _installWaveCircleMaterial: function () {
    var _self = this,
      Color = Cesium.Color,
      defaultValue = Cesium.defaultValue,
      defineProperties = Object.defineProperties,
      Event = Cesium.Event,
      Property = Cesium.Property,
      Material = Cesium.Material;

    /**
     * 波动圆材质
     * @global
     * @param {object} options
     * @param {number} options.duration - 持续时长
     * @param {Color} options.color - 颜色
     * @param {number} options.count -频率
     * @param {number} options.gradient - 渐进频率
     * @example
     *     const custMaterial =  new Cesium.Scene.CircleWaveMaterialProperty({
                  count: 2,
                  color:   Cesium.Color.BLUE,,
                  gradient: 0.3,
                  duration:60
                });
     */
    function CircleWaveMaterialProperty(options) {
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
        get: function () {
          return this._definitionChanged;
        },
      },
    });

    CircleWaveMaterialProperty.prototype.getType = function () {
      return Material.CircleWaveType;
    };
    CircleWaveMaterialProperty.prototype.getValue = function (time, result) {
      if (!result) {
        result = {};
      }
      result.color = Property.getValueOrUndefined(this._color, time);
      result.duration = this._duration;
      result.count = this.count;
      result.gradient = this.gradient;
      return result;
    };
    CircleWaveMaterialProperty.prototype.equals = function (other) {
      return (
        this === other || (other instanceof CircleWaveMaterialProperty && Cesium.Property.equals(this._color, other._color))
      );
    };

    defineProperties(CircleWaveMaterialProperty.prototype, {
      color: Cesium.createPropertyDescriptor("color"),
      duration: Cesium.createPropertyDescriptor("duration"),
    });

    Cesium.Scene.CircleWaveMaterialProperty = CircleWaveMaterialProperty;
    Material.CircleWaveType = "CircleWave";
    Material._materialCache.addMaterial(Material.CircleWaveType, {
      fabric: {
        type: Material.CircleWaveType,
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
  },
  // 渐变圆
  _installCircleFadeMaterial: function () {
    var Color = Cesium.Color,
      defaultValue = Cesium.defaultValue,
      defineProperties = Object.defineProperties,
      Event = Cesium.Event,
      Property = Cesium.Property,
      Material = Cesium.Material,
      _color = new Color(0, 0, 0, 0);

    /**
     * 渐变圆材质
     * @global
     * @param {object} options
     * @param {number} options.duration - 持续时长
     * @param {Color} options.color - 颜色
    * @see {@link module:Graphics#createFadeCylinderGraphics|createFadeCylinderGraphics}
    * @example
      const  circleFadeMaterial = new Cesium.Scene.CircleFadeMaterialProperty({
        color:   Cesium.Color.fromCssColorString("#02ff00"),
        duration:  2000,
      });
     */
    function CircleFadeMaterialProperty(options) {
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
        get: function () {
          return this._definitionChanged;
        },
      },
    });

    CircleFadeMaterialProperty.prototype.getType = function () {
      return Material.CircleFadeMaterialType;
    };
    CircleFadeMaterialProperty.prototype.getValue = function (time, result) {
      if (!result) {
        result = {};
      }
      (result.color = Property.getValueOrClonedDefault(this._color, time, _color, result.color)),
        void 0 === this._time && (this._time = new Date().getTime()),
        (result.time = (new Date().getTime() - this._time) / this._duration);
      return result;
    };
    CircleFadeMaterialProperty.prototype.equals = function (other) {
      return (
        this === other || (other instanceof CircleFadeMaterialProperty && Cesium.Property.equals(this._color, other._color))
      );
    };
    defineProperties(CircleFadeMaterialProperty.prototype, {
      color: Cesium.createPropertyDescriptor("color"),
    });
    Cesium.Scene.CircleFadeMaterialProperty = CircleFadeMaterialProperty;
    Material.CircleFadeMaterialType = "CircleFadeMaterial";
    Material._materialCache.addMaterial(Material.CircleFadeMaterialType, {
      fabric: {
        type: Material.CircleFadeMaterialType,
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
  },
  // 城市光效线
  _installCityLineMaterial: function () {
    var Color = Cesium.Color,
      defaultValue = Cesium.defaultValue,
      defined = Cesium.defined,
      defineProperties = Object.defineProperties,
      Event = Cesium.Event,
      createPropertyDescriptor = Cesium.createPropertyDescriptor,
      Property = Cesium.Property,
      Material = Cesium.Material,
      defaultColor = Color.WHITE;
    /**
     *动态泛光线(随机颜色)
     * @global
     * @param {object} options
     * @param {Color} options.color - 颜色
     * @param {number} options.duration -持续时长
     * @param {string} options.imgUrl - 图片
     * @see {@link module:Graphics#getLineGraphics|getLineGraphics}
     * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * const  polylineCityLinkMaterial = new Cesium.Scene.PolylineCityLinkMaterialProperty({
            color: new Cesium.Color(5.0, 5.0, 10.0),
            duration: 2000
          });
   * graphicObj.graphics.getLineGraphics({
   *     positions:Cesium.Cartesian3.fromDegreesArray([
          104.09816110606057,
          30.659821965447698,
          104.1120972824757,
          30.65330300319938,
          104.10758419863926,
          30.64592470850288,
          104.09351691196979,
          30.652434826507452,
          104.09816110606057,
          30.659821965447698
        ]),
   *      material:polylineCityLinkMaterial,
   *      clampToGround:false,
   *      width:1
   * })
     */
    function PolylineCityLinkMaterialProperty(options) {
      options = defaultValue(options, defaultValue.EMPTY_OBJECT);
      this._definitionChanged = new Event();
      this._color = undefined;
      this._colorSubscription = undefined;
      this.color = options.color || Cesium.Color.BLUE;
      this.duration = options.duration || 1000;
      this._time = undefined;
      this._img = options.imgUrl || Material.PolylineCityLinkImage;
    }

    defineProperties(PolylineCityLinkMaterialProperty.prototype, {
      isvarant: {
        get: function () {
          return false;
        },
      },
      definitionChanged: {
        get: function () {
          return this._definitionChanged;
        },
      },
      color: createPropertyDescriptor("color"),
    });
    PolylineCityLinkMaterialProperty.prototype.getType = function () {
      return Material.PolylineCityLinkType;
    };
    PolylineCityLinkMaterialProperty.prototype.getValue = function (time, result) {
      if (!defined(result)) {
        result = {};
      }

      result.color = Property.getValueOrClonedDefault(this._color, time, defaultColor, result.color);
      result.image = this._img; //Material.PolylineCityLinkImage
      if (this._time === undefined) {
        this._time = time.secondsOfDay;
      }
      result.time = ((time.secondsOfDay - this._time) * 1000) / this.duration;
      return result;
    };
    PolylineCityLinkMaterialProperty.prototype.equals = function (other) {
      return (
        this === other || //
        (other instanceof PolylineCityLinkMaterialProperty && Property.equals(this._color, other._color))
      );
    };

    Cesium.Scene.PolylineCityLinkMaterialProperty = PolylineCityLinkMaterialProperty;
    Material.PolylineCityLinkType = "PolylineCityLink";
    Material.PolylineCityLinkImage =
      this.getDfSt(["material", "PolylineCityLinkMaterialProperty"]) || "static/data/images/Textures/meteor_01.png";
    Material._materialCache.addMaterial(Material.PolylineCityLinkType, {
      fabric: {
        type: Material.PolylineCityLinkType,
        uniforms: {
          color: new Color(1, 0, 0, 1.0),
          image: Material.PolylineCityLinkImage,
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
  },
  // 城市警示墙
  _installWarnMaterial: function () {
    var Color = Cesium.Color,
      defaultValue = Cesium.defaultValue,
      defined = Cesium.defined,
      defineProperties = Object.defineProperties,
      Event = Cesium.Event,
      createPropertyDescriptor = Cesium.createPropertyDescriptor,
      Property = Cesium.Property,
      Material = Cesium.Material;
    /**
     * 警示标线材质
     * @global
     * @param {object} options
     * @param {number} options.duration - 持续时长
     * @param {Color} options.color - 颜色
    * @param {number} options.count - 频率
    * @param {string} options.freely - 方向，可选["vertical"|"cross"]
    * @param {string} options.direction - 方向,可选["-"|"+"]
    * @see {@link module:Graphics#craeteCorridorGraphics|craeteCorridorGraphics}
    * @example
      const  warnLinkMaterial = new Cesium.Scene.WarnLinkMaterialProperty({
            freely: "cross",
            color: Cesium.Color.YELLOW,
            duration: 1000,
            count: 1.0,
            direction: "+",
          })
     */
    function WarnLinkMaterialProperty(options) {
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
        get: function () {
          return this._definitionChanged;
        },
      },
    });
    WarnLinkMaterialProperty.prototype.getType = function () {
      return Material.WarnLinkType;
    };
    WarnLinkMaterialProperty.prototype.getValue = function (time, result) {
      if (!defined(result)) {
        result = {};
      }
      result.color = Property.getValueOrClonedDefault(this._color, time, Color.WHITE, result.color);
      result.image = Material.WarnLinkImage;
      result.time = ((new Date().getTime() - this._time) % this.duration) / this.duration;
      return result;
    };
    WarnLinkMaterialProperty.prototype.equals = function (other) {
      return this === other || (other instanceof WarnLinkMaterialProperty && Property.equals(this._color, other._color));
    };

    defineProperties(WarnLinkMaterialProperty.prototype, {
      color: createPropertyDescriptor("color"),
    });

    Cesium.Scene.WarnLinkMaterialProperty = WarnLinkMaterialProperty;
    Material.WarnLinkType = "WarnWallLinkType";
    Material.WarnLinkImage =
      this.getDfSt(["material", "WarnLinkMaterialProperty"]) || "static/data/images/Textures/jsx2.png";
    Material._materialCache.addMaterial(Material.WarnLinkType, {
      fabric: {
        type: Material.WarnLinkType,
        uniforms: {
          color: new Color(1.0, 0.0, 0.0, 0.5),
          image: Material.WarnLinkImage,
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
  },
  // 轨迹流动线
  _installFlowMaterial: function () {
    var Color = Cesium.Color,
      defaultValue = Cesium.defaultValue,
      defineProperties = Object.defineProperties,
      Event = Cesium.Event,
      createPropertyDescriptor = Cesium.createPropertyDescriptor,
      Property = Cesium.Property,
      Material = Cesium.Material;
    /**
     * 流动线材质
     * @global
     * @param {object} options
     * @param {number} options.duration - 持续时长
     * @param {Color} options.color - 颜色
     * @example
       * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
     *const polylineMaterial =  new Cesium.Scene.PolylineFlowMaterialProperty({
        color: new Cesium.Color(77 / 255, 201 / 255, 255 / 255, 1),
        duration: 200
      })
   * graphicObj.graphics.getLineGraphics({
        positions:Cesium.Cartesian3.fromDegreesArray([
              104.09816110606057,
              30.659821965447698,
              104.1120972824757,
              30.65330300319938,
              104.10758419863926,
              30.64592470850288,
              104.09351691196979,
              30.652434826507452,
              104.09816110606057,
              30.659821965447698
            ]),
   *      material:polylineMaterial,
   *      clampToGround:false,
   *      width:1
   * })
     */
    function PolylineFlowMaterialProperty(options) {
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
        get: function () {
          return this._definitionChanged;
        },
      },
    });

    PolylineFlowMaterialProperty.prototype.getType = function () {
      return Material.PolylineFlowType;
    };

    PolylineFlowMaterialProperty.prototype.getValue = function (time, result) {
      if (!result) {
        result = {};
      }
      result.color = Property.getValueOrClonedDefault(this._color, time, Cesium.Color.WHITE, result.color);
      result.duration = this._duration;
      return result;
    };
    PolylineFlowMaterialProperty.prototype.equals = function (other) {
      return (
        this === other || (other instanceof PolylineFlowMaterialProperty && Property.equals(this._color, other._color))
      );
    };
    defineProperties(PolylineFlowMaterialProperty.prototype, {
      color: createPropertyDescriptor("color"),
      duration: createPropertyDescriptor("duration"),
    });

    Cesium.Scene.PolylineFlowMaterialProperty = PolylineFlowMaterialProperty;
    Material.PolylineFlowType = "PolylineFlow";
    Material._materialCache.addMaterial(Material.PolylineFlowType, {
      fabric: {
        type: Material.PolylineFlowType,
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
  },
  // 多线段尾链
  _installPolylineTrailLinkMaterial: function () {
    var Color = Cesium.Color,
      defaultValue = Cesium.defaultValue,
      defineProperties = Object.defineProperties,
      createPropertyDescriptor = Cesium.createPropertyDescriptor,
      Event = Cesium.Event,
      Property = Cesium.Property,
      Material = Cesium.Material,
      waterImg = this.getDfSt(["primitive", "WaterPrimitive"]);
    /**
     * 多线段尾链
     * @global
     * @param {object} options
     * @param {number} options.duration - 持续时长
     * @param {number} options.speed - 速度
     * @param {Color} options.color - 颜色
     * @param {string} options.image - 图片
     * @see {@link module:Graphics#craeteCorridorGraphics|craeteCorridorGraphics}
    * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * // 创建材质
   * const  polylineMaterial = new Cesium.Scene.PolylineTrailLinkMaterial({
          color: Cesium.Color.BLUE.withAlpha(0.4),
          duration: 15000,
          image: 'static/data/images/Textures/river.png',
          speed: 0.5
        })
   * 
   * graphicObj.graphics.craeteCorridorGraphics({
   *     positions: Cesium.Cartesian3.fromDegreesArray(
   *            110.16018735617934, 31.036076859828338, 
   *            110.17845812703679,31.033686527335444,
   *            110.19261040403379, 31.02892781958261, 
   *            110.20775152895165,31.02475678594998,
   *            110.2247484728178,31.019315371809977, 
   *            110.24033095328579,31.017866033294506),
        width: 1500.0,
        height: 0,
        extrudedHeight: 50，
        cornerType: Cesium.CornerType.MITERED,
        outline: false,
        material:polylineMaterial
   * })
     */
    function PolylineTrailLinkMaterial(options) {
      options = defaultValue(options, defaultValue.EMPTY_OBJECT);
      this._definitionChanged = new Event();
      this._color = undefined;
      this.color = options.color || Cesium.Color.WHITE;
      this.image = options.image || waterImg;
      this._colorSubscription = undefined;
      this.duration = options.duration || 3000;
      this._time = new Date().getTime();
      this.speed = options.speed; // speed, larger is faster
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
        get: function () {
          return this._definitionChanged;
        },
        configurable: true,
      },
      color: createPropertyDescriptor("color"),
      duration: createPropertyDescriptor("duration"),
    });

    PolylineTrailLinkMaterial.prototype.getType = function () {
      return Material.PolylineTrailLinkType;
    };

    PolylineTrailLinkMaterial.prototype.getValue = function (time, result) {
      if (!Cesium.defined(result)) {
        result = {};
      }
      result.color = Property.getValueOrClonedDefault(this._color, time, this.color, result.color);
      result.image = Material.PolylineTrailLinkImage;
      result.time = (((new Date().getTime() - this._time) % this.duration) / this.duration) * this.speed;
      return result;
    };
    PolylineTrailLinkMaterial.prototype.equals = function (other) {
      return this === other || (other instanceof PolylineTrailLinkMaterial && Property.equals(this._color, other._color));
    };

    Material.PolylineTrailLinkSource = `
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
    Material.PolylineTrailLinkType = "PolylineTrailLinkMaterial";
    Material.PolylineTrailLinkImage = this.image || waterImg || "static/data/images/Textures/river.png";
    Material._materialCache.addMaterial(Material.PolylineTrailLinkType, {
      fabric: {
        type: Material.PolylineTrailLinkType,
        uniforms: {
          color: new Color(1.0, 1.0, 1.0, 1),
          image: Material.PolylineTrailLinkImage,
          time: -20,
        },
        source: Material.PolylineTrailLinkSource,
      },
      translucent: function () {
        return true;
      },
    });
  },
};
export { Material };
