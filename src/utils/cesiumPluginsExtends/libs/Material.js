let Cesium = null;
let dfSt = undefined;
/**
 * 材质模块
 * @param {*} viewer
 */
function Material(viewer, cesiumGlobal,defaultStatic) {
  if (viewer) {
    Cesium = cesiumGlobal;
    dfSt = defaultStatic;
    this._installMaterial()

  }
}

Material.prototype = {
  /**
   * 添加材质线
   * 动态炫光线
   * @param {*} options
   */
  addMaterialLineGraphics: function (options) {

    if (this._viewer && options && options.image) {
      // 初始化自定义材质线
      this._initPolylineCustomMaterialProperty(options)

      var _entity = this.createGraphics()

      _entity.polyline = {
        positions: options.positions,
        material: new Cesium.PolylineCustomMaterialProperty({
          color: options.color || Cesium.Color.RED,
          duration: options.duration || 500
        }),
        width: options.width
      }

      return this._viewer.entities.add(_entity)
    }

  },
  /**
   * 获取一个材质线
   * @param {*} options
   */
  getCustomMaterialLine: function (options) {

    if (this._viewer && options && options.image) {
      // 初始化自定义材质线
      return this._initPolylineCustomMaterialProperty(options)
    }
  },
  // 动态初始化材质线
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
        MaterialType = options.MaterialType || 'wallType' + parseInt(Math.random() * 1000)

      const PolylineCustomMaterialProperty = function (options) {

        options = defaultValue(options, defaultValue.EMPTY_OBJECT)
        this._definitionChanged = new Event()
        this._color = undefined
        this._colorSubscription = undefined
        this.color = options.color || Cesium.Color.BLUE
        this.duration = options.duration || 1000
        this._time = undefined
      }

      defineProperties(PolylineCustomMaterialProperty.prototype, {
        isvarant: {
          get: function () {
            return false
          }
        },
        definitionChanged: {
          get: function () {
            return this._definitionChanged
          }
        },
        color: createPropertyDescriptor('color')
      })
      PolylineCustomMaterialProperty.prototype.getType = function () {
        return MaterialType
      }
      PolylineCustomMaterialProperty.prototype.getValue = function (time, result) {
        if (!defined(result)) {
          result = {}
        }
        result.color = Property.getValueOrClonedDefault(this._color, time, defaultColor, result.color)
        result.image = options.image
        if (this._time === undefined) {
          this._time = time.secondsOfDay
        }
        result.time = (time.secondsOfDay - this._time) * 1000 / this.duration
        return result
      }
      PolylineCustomMaterialProperty.prototype.equals = function (other) {
        return this === other || //
          (other instanceof PolylineCustomMaterialProperty &&
            Property.equals(this._color, other._color))
      }
      Material._materialCache.addMaterial(MaterialType, {
        fabric: {
          type: MaterialType,
          uniforms: {
            color: options.color || new Cesium.Color(1.0, 0.0, 0.0, 0.5),
            image: options.image,
            time: options.color.time || 0
          },
          source: this._getDynamicLineShader({
            get: true
          })
        },
        translucent: function () {
          return true
        }
      })
      return new PolylineCustomMaterialProperty(options)
    }
  },
  /**
   * 动态围栏
   * 炫光墙体
   * @param {*} options
   */
  addMaterialWallGraphics: function (options) {
    if (this._viewer && options && options.image) {
      // 初始化自定义材质
      this._initWallCustomMaterialProperty(options)

      var _entity = this.createGraphics()

      _entity.wall = {
        positions: options.positions,
        material: new Cesium.Scene.WallLinkCustomMaterialProperty({
          color: options.color || Cesium.Color.RED,
          duration: options.duration || 500
        }),
        width: options.width
      }

      return this._viewer.entities.add(_entity)
    }

  },
  /**
   * 获取一个材质围栏
   * @param {*} options
   */
  getCustomMaterialWall: function (options) {
    if (this._viewer && options && options.image) {

      return this._initWallCustomMaterialProperty(options)
    }
  },
  // 动态初始化材质线
  _initWallCustomMaterialProperty(options) {

    var Color = Cesium.Color,
      defaultValue = Cesium.defaultValue,
      defined = Cesium.defined,
      defineProperties = Object.defineProperties,
      Event = Cesium.Event,
      createPropertyDescriptor = Cesium.createPropertyDescriptor,
      Property = Cesium.Property,
      Material = Cesium.Material,
      MaterialType = options.MaterialType || 'wallType' + parseInt(Math.random() * 1000)

    const WallLinkCustomMaterialProperty = function (options) {

      options = defaultValue(options, defaultValue.EMPTY_OBJECT)
      this._definitionChanged = new Event()
      this._color = undefined
      this._colorSubscription = undefined
      this.color = options.color || Color.BLUE
      this.duration = options.duration || 3000
      this._time = new Date().getTime()
    }

    defineProperties(WallLinkCustomMaterialProperty.prototype, {
      isvarant: {
        get: function () {
          return false
        }
      },
      definitionChanged: {
        get: function () {
          return this._definitionChanged
        }
      },
      color: createPropertyDescriptor('color')
    })
    WallLinkCustomMaterialProperty.prototype.getType = function () {
      return MaterialType
    }
    WallLinkCustomMaterialProperty.prototype.getValue = function (time, result) {
      if (!defined(result)) {
        result = {}
      }
      result.color = Property.getValueOrClonedDefault(
        this._color,
        time,
        Color.WHITE,
        result.color
      )
      result.image = options.image

      result.time =
        ((new Date().getTime() - this._time) % this.duration) / this.duration
      return result
    }
    WallLinkCustomMaterialProperty.prototype.equals = function (other) {
      return (
        this === other ||
        (other instanceof WallLinkCustomMaterialProperty &&
          Property.equals(this._color, other._color))
      )
    }
    //动态墙
    Material._materialCache.addMaterial(MaterialType, {
      fabric: {
        type: MaterialType,
        uniforms: {
          color: new Color(1.0, 0.0, 0.0, 0.5),
          image: options.image,
          time: 0
        },
        source: this._getDirectionWallShader({
          get: true,
          count: options.count,
          freely: options.freely,
          direction: options.direction
        })
      },
      translucent: function () {
        return true
      }
    })
    Cesium.Scene.WallLinkCustomMaterialProperty = WallLinkCustomMaterialProperty;
    return new WallLinkCustomMaterialProperty(options)
  },
  /**
   * 安装默认拓展材质
   */
  _installMaterial: function () {

    this._installWaveCircleMaterial()

    this._installCircleFadeMaterial()

    this._installCityLineMaterial()

    this._installWarnMaterial()

    this._installFlowMaterial()

  },
  // 波动圆材质
  _installWaveCircleMaterial: function () {
    var _self = this,
      Color = Cesium.Color,
      defaultValue = Cesium.defaultValue,
      defineProperties = Object.defineProperties,
      Event = Cesium.Event,
      Property = Cesium.Property,
      Material = Cesium.Material

    function CircleWaveMaterialProperty(options) {

      options = options || {}
      this._definitionChanged = new Event()
      this._color = undefined
      this._colorSubscription = undefined
      this._duration = undefined
      this._durationSubscription = undefined
      this.color = defaultValue(
        options.color,
        Color.fromBytes(0, 255, 255, 255)
      )
      this.duration = defaultValue(options.duration, 45)
      this.count = Math.max(defaultValue(options.count, 2), 1)
      this.gradient = defaultValue(options.gradient, 0.1)
      if (this.gradient < 0) {
        this.gradient = 0
      } else if (this.gradient > 1) {
        this.gradient = 1
      }
    }

    defineProperties(CircleWaveMaterialProperty.prototype, {
      isConstant: {
        get: function () {
          return false
        }
      },
      definitionChanged: {
        get: function () {
          return this._definitionChanged
        }
      }
    })

    CircleWaveMaterialProperty.prototype.getType = function () {
      return Material.CircleWaveType
    }
    CircleWaveMaterialProperty.prototype.getValue = function (time, result) {
      if (!result) {
        result = {}
      }
      result.color = Property.getValueOrUndefined(this._color, time)
      result.duration = this._duration
      result.count = this.count
      result.gradient = this.gradient
      return result
    }
    CircleWaveMaterialProperty.prototype.equals = function (other) {
      return (
        this === other ||
        (other instanceof CircleWaveMaterialProperty &&
          Cesium.Property.equals(this._color, other._color))
      )
    }

    defineProperties(CircleWaveMaterialProperty.prototype, {
      color: Cesium.createPropertyDescriptor('color'),
      duration: Cesium.createPropertyDescriptor('duration')
    })

    Cesium.Scene.CircleWaveMaterialProperty = CircleWaveMaterialProperty
    Material.CircleWaveType = 'CircleWave'
    Material._materialCache.addMaterial(Material.CircleWaveType, {
      fabric: {
        type: Material.CircleWaveType,
        uniforms: {
          color: new Color(1.0, 0.0, 0.0, 0.7),
          duration: 45,
          count: 1,
          gradient: 0.1
        },
        source: _self._getDynamicCircleShader({
          get: true
        })
      },
      translucent: function () {
        return true
      }
    })
  },
  // 渐变圆
  _installCircleFadeMaterial: function () {
    var Color = Cesium.Color,
      defaultValue = Cesium.defaultValue,
      defineProperties = Object.defineProperties,
      Event = Cesium.Event,
      Property = Cesium.Property,
      Material = Cesium.Material,
      _color = new Color(0, 0, 0, 0)

    function CircleFadeMaterialProperty(options) {

      options = defaultValue(options, defaultValue.EMPTY_OBJECT)
      this._definitionChanged = new Event
      this._color = void 0
      this._colorSubscription = void 0
      this.color = defaultValue(options.color, _color)
      this._duration = options.duration || 1e3
      this._time = void 0
    }

    defineProperties(CircleFadeMaterialProperty.prototype, {
      isConstant: {
        get: function () {
          return false
        }
      },
      definitionChanged: {
        get: function () {
          return this._definitionChanged
        }
      }
    })

    CircleFadeMaterialProperty.prototype.getType = function () {
      return Material.CircleFadeMaterialType
    }
    CircleFadeMaterialProperty.prototype.getValue = function (time, result) {
      if (!result) {
        result = {}
      }
      result.color = Property.getValueOrClonedDefault(this._color, time, _color, result.color),
        void 0 === this._time && (this._time = (new Date).getTime()),
        result.time = ((new Date).getTime() - this._time) / this._duration
      return result
    }
    CircleFadeMaterialProperty.prototype.equals = function (other) {
      return (
        this === other ||
        (other instanceof CircleFadeMaterialProperty &&
          Cesium.Property.equals(this._color, other._color))
      )
    }
    defineProperties(CircleFadeMaterialProperty.prototype, {
      color: Cesium.createPropertyDescriptor('color')
    })
    Cesium.Scene.CircleFadeMaterialProperty = CircleFadeMaterialProperty
    Material.CircleFadeMaterialType = 'CircleFadeMaterial'
    Material._materialCache.addMaterial(Material.CircleFadeMaterialType, {
      fabric: {
        type: Material.CircleFadeMaterialType,
        uniforms: {
          color: new Color(1, 0, 0, 1),
          time: 1
        },
        source: this._getCircleFadeShader({
          get: true
        })
      },
      translucent: function () {
        return !0
      }
    })
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
      defaultColor = Color.WHITE

    function PolylineCityLinkMaterialProperty(options) {

      options = defaultValue(options, defaultValue.EMPTY_OBJECT)
      this._definitionChanged = new Event()
      this._color = undefined
      this._colorSubscription = undefined
      this.color = options.color || Cesium.Color.BLUE
      this.duration = options.duration || 1000
      this._time = undefined
      this._img=options.imgUrl||Material.PolylineCityLinkImage
    }

    defineProperties(PolylineCityLinkMaterialProperty.prototype, {
      isvarant: {
        get: function () {
          return false
        }
      },
      definitionChanged: {
        get: function () {
          return this._definitionChanged
        }
      },
      color: createPropertyDescriptor('color')
    })
    PolylineCityLinkMaterialProperty.prototype.getType = function () {
      return Material.PolylineCityLinkType
    }
    PolylineCityLinkMaterialProperty.prototype.getValue = function (time, result) {
      if (!defined(result)) {
        result = {}
      }
 
      result.color = Property.getValueOrClonedDefault(this._color, time, defaultColor, result.color)
      result.image = this._img//Material.PolylineCityLinkImage
      if (this._time === undefined) {
        this._time = time.secondsOfDay
      }
      result.time = (time.secondsOfDay - this._time) * 1000 / this.duration
      return result
    }
    PolylineCityLinkMaterialProperty.prototype.equals = function (other) {
      return this === other || //
        (other instanceof PolylineCityLinkMaterialProperty &&
          Property.equals(this._color, other._color))
    }

    Cesium.Scene.PolylineCityLinkMaterialProperty = PolylineCityLinkMaterialProperty
    Material.PolylineCityLinkType = 'PolylineCityLink'
    Material.PolylineCityLinkImage = this.getDfSt(['material','PolylineCityLinkMaterialProperty'])||'static/data/images/Textures/meteor_01.png'
    Material._materialCache.addMaterial(Material.PolylineCityLinkType, {
      fabric: {
        type: Material.PolylineCityLinkType,
        uniforms: {
          color: new Color(1, 0, 0, 1.0),
          image: Material.PolylineCityLinkImage,
          time: 0,
        },
        source: this._getDynamicLightLineShader({
          get: true
        })
      },
      translucent: function () {
        return true
      }
    })
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
      Material = Cesium.Material

    function WarnLinkMaterialProperty(options) {

      options = defaultValue(options, defaultValue.EMPTY_OBJECT)
      this._definitionChanged = new Event()
      this._color = undefined
      this._colorSubscription = undefined
      this.color = options.color || Color.BLUE
      this.duration = options.duration || 3000
      this._time = new Date().getTime()
    }

    defineProperties(WarnLinkMaterialProperty.prototype, {
      isvarant: {
        get: function () {
          return false
        }
      },
      definitionChanged: {
        get: function () {
          return this._definitionChanged
        }
      }
    })
    WarnLinkMaterialProperty.prototype.getType = function () {
      return Material.WarnLinkType
    }
    WarnLinkMaterialProperty.prototype.getValue = function (time, result) {
      if (!defined(result)) {
        result = {}
      }
      result.color = Property.getValueOrClonedDefault(
        this._color,
        time,
        Color.WHITE,
        result.color
      )
      result.image = Material.WarnLinkImage
      result.time =
        ((new Date().getTime() - this._time) % this.duration) / this.duration
      return result
    }
    WarnLinkMaterialProperty.prototype.equals = function (other) {
      return (
        this === other ||
        (other instanceof WarnLinkMaterialProperty &&
          Property.equals(this._color, other._color))
      )
    }

    defineProperties(WarnLinkMaterialProperty.prototype, {
      color: createPropertyDescriptor('color')
    })


    Cesium.Scene.WarnLinkMaterialProperty = WarnLinkMaterialProperty
    Material.WarnLinkType = 'WarnWallLinkType'
    Material.WarnLinkImage = this.getDfSt(['material','WarnLinkMaterialProperty'])||'static/data/images/Textures/jsx2.png'
    Material._materialCache.addMaterial(Material.WarnLinkType, {
      fabric: {
        type: Material.WarnLinkType,
        uniforms: {
          color: new Color(1.0, 0.0, 0.0, 0.5),
          image: Material.WarnLinkImage,
          time: 0
        },
        source: this._getDirectionWallShader({
          get: true,
          count: 10.0,
          freely: 'cross',
          direction: '-'
        })
      },
      translucent: function () {
        return true
      }
    })
  },
  // 轨迹流动线
  _installFlowMaterial: function () {

    var Color = Cesium.Color,
      defaultValue = Cesium.defaultValue,
      defineProperties = Object.defineProperties,
      Event = Cesium.Event,
      createPropertyDescriptor = Cesium.createPropertyDescriptor,
      Property = Cesium.Property,
      Material = Cesium.Material

    function PolylineFlowMaterialProperty(options) {

      options = defaultValue(options, defaultValue.EMPTY_OBJECT)
      this._definitionChanged = new Event()
      this._color = undefined
      this._colorSubscription = undefined
      this.color = options.color || Color.fromBytes(0, 255, 255, 255)
      this._duration = undefined
      this._durationSubscription = undefined
      this.duration = defaultValue(options.duration, 45)
    }

    defineProperties(PolylineFlowMaterialProperty.prototype, {
      isConstant: {
        get: function () {
          return false
        }
      },
      definitionChanged: {
        get: function () {
          return this._definitionChanged
        }
      }
    })

    PolylineFlowMaterialProperty.prototype.getType = function () {
      return Material.PolylineFlowType
    }

    PolylineFlowMaterialProperty.prototype.getValue = function (time, result) {
      if (!result) {
        result = {}
      }
      result.color = Property.getValueOrClonedDefault(
        this._color,
        time,
        Cesium.Color.WHITE,
        result.color
      )
      result.duration = this._duration
      return result
    }
    PolylineFlowMaterialProperty.prototype.equals = function (other) {
      return (
        this === other ||
        (other instanceof PolylineFlowMaterialProperty &&
          Property.equals(this._color, other._color))
      )
    }
    defineProperties(PolylineFlowMaterialProperty.prototype, {
      color: createPropertyDescriptor('color'),
      duration: createPropertyDescriptor('duration')
    })

    Cesium.Scene.PolylineFlowMaterialProperty = PolylineFlowMaterialProperty
    Material.PolylineFlowType = 'PolylineFlow'
    Material._materialCache.addMaterial(Material.PolylineFlowType, {
      fabric: {
        type: Material.PolylineFlowType,
        uniforms: {
          color: new Color(1.0, 1.0, 2.0, 0.7),
          duration: 45
        },
        source: this._getFlowLineShader({
          get: true
        })
      },
      translucent: function () {
        return true
      }
    })
  }
}

export {
  Material
}