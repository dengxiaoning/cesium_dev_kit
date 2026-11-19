import { Base } from "./Base";
import { Graphics } from "./Graphics";
import { TooltipUtil } from './TooltipUtil'
import type { CesiumGlobal, StaticResourceConf, WGS84Type } from './Base'
import { asProperty, mixinPrototype, attachDestroy, registerCleanup, disposeModule } from './Base'
import type { GraphicsInstance } from './Graphics'
import { createScopedConstructor } from './Base'
import { createDefaultStatic } from '../defaultStatic'


/* ===== 由原 JSDoc @typedef 生成的类型 ===== */

/** - 绘制多边形边线样式类型 */
export interface PolylineStyleType {
  /** polyine线宽 */
  width?: number
  /** polyine边线材质 */
  material?: any | any | string
  /** 是否贴地 */
  clampToGround?: boolean
  /** 转角锐化值 */
  granularity?: number
  /** 线段类型 */
  arcType?: any
  /** 其它自定义字段 */
  [key: string]: unknown
}

/** Draw 各方法的通用参数 */
export interface DrawOptions {
  style?: PolylineStyleType
  callback?: (...args: any[]) => void
  measure?: boolean
  width?: number
  height?: number
  material?: any | any | string
  clampToGround?: boolean
  clampToS3M?: boolean
  granularity?: number
  arcType?: any
  type?: string
  topRadius?: number
  bottomRadius?: number
  length?: number
  extrudedHeight?: number
  color?: any
  rOuter?: number
  rInner?: number
  arms?: number
  circleRadius?: number
  shape?: string
  [key: string]: unknown
}

/** Draw 实例类型 */
export interface DrawInstance {
  _drawLayer: any
  $graphics: GraphicsInstance
  tooltip: TooltipUtil
  /** 画点 */
  drawPointGraphics(options?: DrawOptions): void,
  _drawComand(options?: DrawOptions, drawingMode?: string): void,
  _excludeDuplicatesCartesian(orgCartesianArr?: any[]): any[],
  /** 画线 or 测距 */
  drawLineGraphics(options?: DrawOptions): void,
  /** 画面 or 测面积 */
  drawPolygonGraphics(options?: DrawOptions): void,
  /** 画矩形 */
  drawRectangleGraphics(options?: DrawOptions): void,
  /** 画圆 */
  drawCircleGraphics(options?: DrawOptions): void,
  /** 画三角量测 */
  drawTrianglesGraphics(options?: DrawOptions): void,
  /** 画围栏 */
  drawWallGraphics(options?: DrawOptions): void,
  /** 绘制球体 */
  drawEllipsoidGraphics(options?: DrawOptions): void,
  /** 判断对象是否有某个属性 */
  _objHasOwnProperty<T>(obj?: object, field?: string, defVal?: T): T,
  /** 绘制圆柱体 or 圆锥 */
  drawCylinderGraphics(options?: DrawOptions): void,
  /** 绘制走廊 */
  drawCorridorGraphics(options?: DrawOptions): void,
  /** 绘制管道 */
  drawPolylineVolumeGraphics(options?: DrawOptions): void,
  /** 移除所有实体 */
  removeAll(): void,
  /** 移除所以handler 监听 */
  removeEventHandler(): void,
  /** 释放当前模块持有的监听器 / DataSource（幂等） */
  destroy(): void,
  getDfSt: (attrArr: string[]) => string | undefined
  _viewer: any
  getCatesian3FromPX: (px: any) => boolean | any | null | undefined
  transformCartesianArrayToWGS84Array: (cartesianArr: any[]) => (WGS84Type | undefined)[] | undefined
  transformWGS84ArrayToCartesianArray: (wgs84Arr: any[], alt?: number) => any[]
  getPositionDistance: (positions: WGS84Type[]) => number
  getPositionsArea: (positions: WGS84Type[]) => number
  createGraphics: () => any
  computeStar2d: (arms: number, rOuter: number, rInner: number) => any[]
  computeCircleShap: (radius: number) => any[]
}

/** Draw 构造函数类型 */
export interface DrawConstructor {
  new (viewer?: any, cesiumGlobal?: CesiumGlobal, defaultStatic?: StaticResourceConf): DrawInstance
  prototype: DrawInstance
}

/**
 * 画笔模块
 * @class
 * @augments  module:Base
 * @augments  module:Math3d
 * @augments  module:Math2d
 * @param {object} params
 * @param {Cesium.Viewer} params.viewer - cesium 实例
 * @param {object} params.cesiumGlobal - cesium 全局对象
 * @param {Array} params.defaultStatic - 静态资源
 * @exports Draw
 */
/**
 * 为每个实例创建独立闭包，避免模块级 Cesium/dfSt 及交互状态在多个 viewer 间共享。
 * 由 createScopedConstructor 在每次 new 时调用。
 */
export function createDrawModule() {
  let dfSt: StaticResourceConf | undefined = undefined;
  let Cesium = null as unknown as CesiumGlobal;
  let drawHandler: any | null = null;

const Draw = function (this: DrawInstance, viewer?: any, cesiumGlobal?: CesiumGlobal, defaultStatic?: StaticResourceConf) {
  if (viewer) {
    /** @access private */
    Cesium = cesiumGlobal as CesiumGlobal;
    /** @access private */
    // 未显式传入时回退到库内置配置，避免图片地址变成相对路径后静默 404
    dfSt = defaultStatic || createDefaultStatic();
    /** @access private */
    this._drawLayer = new Cesium.CustomDataSource("drawLayer");
    // 继承base，避免公共方法无法使用
    mixinPrototype(Graphics, Base);
    /** @access private */
    this.$graphics = new Graphics(viewer, cesiumGlobal);
    viewer && viewer.dataSources.add(this._drawLayer);
    this.tooltip = new TooltipUtil(viewer, cesiumGlobal);
    this.tooltip.initTool();
    const drawLayer = this._drawLayer;
    const graphics = this.$graphics;
    const tooltip = this.tooltip;
    attachDestroy(this);
    registerCleanup(this, () => {
      this.removeEventHandler();
      this.removeAll();
      disposeModule(tooltip);
      disposeModule(graphics);
      if (this._viewer && drawLayer) {
        this._viewer.dataSources.remove(drawLayer, true);
        if (this._drawLayer === drawLayer) this._drawLayer = undefined;
      }
    });
  }
} as unknown as DrawConstructor

Draw.prototype = {
  /**
   * 画点
   * @function
   * @param {object} options
   * @example
   * const drawObj = new Draw({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
   * drawObj.drawPointGraphics({
   *   style: { image: 'static/data/images/file/location4.png', width: 35, height: 40, clampToGround: true },
   *   callback: (positions, entity) => {
   *     // positions: [{ lng, lat, alt }]；entity: 本次绘制出的实体
   *     console.log(positions, entity)
   *   }
   * })
   */
  drawPointGraphics: function (this: DrawInstance, options?: DrawOptions) {
    options = options || {};
    /** @default */
    options.style = options.style || {
      image: this.getDfSt(["drawPointGraphics"]) || "static/data/images/file/location4.png",
      width: 35,
      height: 40,
      clampToGround: true,
      scale: 1,
      pixelOffset: new Cesium.Cartesian2(0, -20),
    };

    if (this._viewer && options) {
      var _poiEntity = new Cesium.Entity(),
        position: any | null | undefined,
        positions: any[] = [],
        poiObj: any | undefined,
        $this = this,
        _handlers = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas);
      // 获取handler
      drawHandler = _handlers;
      // left
      _handlers.setInputAction(function (movement: any) {
        var cartesian = $this.getCatesian3FromPX(movement.position) as any;
        $this.tooltip.showAtCartesian(cartesian, '右键单击结束!')
        if (cartesian && cartesian.x) {
          position = cartesian;

          positions.push(cartesian);
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      // right
      _handlers.setInputAction(function (movement: any) {
        var cartesian = $this.getCatesian3FromPX(movement.endPosition) as any;
        if (cartesian && cartesian.x) {
          positions = []
          position = cartesian;

          positions.push(cartesian);
        }
        _handlers.destroy();
        _handlers = null as unknown as any;
        $this.tooltip.setVisible(false);
        if (typeof options.callback === "function") {
          options.callback($this.transformCartesianArrayToWGS84Array(positions), poiObj);
        }
      }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

      _poiEntity.billboard = options.style as unknown as any;
      _poiEntity.position = asProperty(new Cesium.CallbackProperty(function () {
        return position;
      }, false));

      poiObj = this._drawLayer.entities.add(_poiEntity);
    }
  },
  // 绘制操作
  _drawComand: function (this: DrawInstance, options?: DrawOptions, drawingMode?: string) {
    var activeShapePoints: any[] = [],
      $this = this,
      lineObj: any | undefined,
      activeShape: any | undefined,
      floatingPoint: any | undefined,
      // straightLine 分支会先回调一次（供通视分析直接使用 Cartesian3），
      // terminateShape 里不应再回调第二次
      callbackFired = false,
      polygonObj = new Cesium.PolygonHierarchy(),
      _handlers = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas);
    // 获取全局handler
    drawHandler = _handlers;

    // 绘制几何图形
    function drawShape(positionData: any[], positionDataPolygon: any[] | any) {
      let objEntity = new Cesium.Entity();
      if (drawingMode == "line") {
        objEntity.polyline = {
          positions: positionData,
          width: options!.width || 5,
          granularity: $this._objHasOwnProperty(options, 'granularity', Cesium.Math.RADIANS_PER_DEGREE),
          arcType: $this._objHasOwnProperty(options, 'arcType', Cesium.ArcType.GEODESIC),
          material: options!.material || Cesium.Color.BLUE.withAlpha(0.8),
          clampToGround: $this._objHasOwnProperty(options, 'clampToGround', false),
          clampToS3M: $this._objHasOwnProperty(options, 'clampToS3M', false),
        } as unknown as any;
      } else if (drawingMode === "polygon") {
        objEntity.polyline = options!.style as unknown as any;

        objEntity.polyline['positions'] = asProperty(positionData);

        objEntity.polygon = {
          hierarchy: positionDataPolygon,
          material: options!.material || Cesium.Color.WHITE.withAlpha(0.7),
          clampToGround: $this._objHasOwnProperty(options, 'clampToGround', false),
        } as unknown as any;
        ;(objEntity as unknown as Record<string, unknown>).clampToS3M = true;
      }
      return $this._drawLayer.entities.add(objEntity);

    }
    // 右键点击事件，结束绘制
    function terminateShape() {
      if (drawingMode == "polygon") {
        activeShapePoints.push(activeShapePoints[0]);
        polygonObj.positions.push(activeShapePoints[0]);
      }
      lineObj = drawShape(activeShapePoints, activeShapePoints);
      if (options!.height) {
        //立体
        lineObj.polygon!.extrudedHeight = asProperty(options!.height);
        lineObj.polygon!.material = asProperty(Cesium.Color.BLUE.withAlpha(0.5));
      }
      if (options!.measure && drawingMode == "polygon") {
        _addInfoPoint(activeShapePoints[0], true);
      }

      // 将数据传回调用函数
      // 约定：回调返回 WGS84 经纬度数组（{ lng, lat, alt }），与
      // transformCartesianArrayToWGS84Array 保持一致；
      // 早期版本直接回传 Cartesian3，导致按 `.lng` 读取的调用方拿到 undefined。
      if (typeof options!.callback === "function" && !callbackFired) {
        options!.callback($this.transformCartesianArrayToWGS84Array(activeShapePoints), lineObj);
      }
      $this._drawLayer.entities.remove(floatingPoint!);
      $this._drawLayer.entities.remove(activeShape!);
      floatingPoint = undefined;
      activeShape = undefined;
      activeShapePoints = [];
    }

    //添加坐标点
    const _addInfoPoint = function (position: any, endDraw: boolean = false, isFloatingPoint: boolean = false) {
      var _labelEntity = new Cesium.Entity();
      _labelEntity.position = asProperty(position);
      _labelEntity.point = asProperty({
        pixelSize: 10,
        outlineColor: Cesium.Color.BLUE,
        outlineWidth: 5,
      });
      var textStr = '';
      var convertCoor = $this.transformCartesianArrayToWGS84Array(activeShapePoints) || []
      if (drawingMode === "line") {
        textStr = ($this.getPositionDistance(convertCoor as WGS84Type[]) / 1000).toFixed(4) + "公里";
      } else if (drawingMode === "polygon" && endDraw) {
        textStr = ($this.getPositionsArea(convertCoor as WGS84Type[]) / 1000000.0).toFixed(4) + "平方公里";
      }
      if ((drawingMode === "line" || (drawingMode === "polygon" && endDraw)) && !isFloatingPoint) {
        _labelEntity.label = {
          text: textStr,
          show: true,
          showBackground: true,
          font: "14px monospace",
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(-20, -80), //left top
        } as unknown as any;
      }

      return $this._drawLayer.entities.add(_labelEntity);
    };

    // left click
    _handlers.setInputAction(function (movement: any) {
      const cartesian = $this.getCatesian3FromPX(movement.position) as any;
      if (Cesium.defined(cartesian)) {
        const cartesianClone = cartesian.clone()
        if (activeShapePoints.length === 0) {
          floatingPoint = _addInfoPoint(cartesianClone, false, true);
          polygonObj.positions.push(cartesian.clone());
          activeShapePoints.push(cartesianClone);

          const dynamicPositions = new Cesium.CallbackProperty(function () {
            return activeShapePoints;
          }, false);
          const dynamicPositionsPolygon = new Cesium.CallbackProperty(function () {
            if (drawingMode === "polygon") {
              return polygonObj;
            }
            return activeShapePoints;
          }, false);
          activeShape = drawShape(dynamicPositions as unknown as any[], dynamicPositionsPolygon);
        }
        // 这个很关键，否决多边形转换wgs84 高程会丢失
        polygonObj.positions.push(cartesian.clone());
        activeShapePoints.push(cartesianClone);
        if (options!.measure) {
          _addInfoPoint(cartesianClone);
        }

        // 绘制直线 两个点,用于可视域分析,判断等于三，因为第一次加了两个点
        if (options!.type === "straightLine" && activeShapePoints.length == 3) {
          activeShapePoints.pop();//删除掉第一个重复点
          _handlers.destroy();
          _handlers = null as unknown as any;
          $this.tooltip.setVisible(false);
          if (typeof options!.callback === "function") {
            // 去除重复的cartesian3，因为在mouse 悬停后会获取到重复坐标
            activeShapePoints = $this._excludeDuplicatesCartesian(activeShapePoints);
            // 通视分析内部直接使用 Cartesian3，这里保持原样；
            // 置位后 terminateShape 不再重复回调
            callbackFired = true;
            options!.callback(activeShapePoints, activeShape);
            terminateShape();
          }
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // mouse move
    _handlers.setInputAction(function (movement: any) {
      var newPosition = $this.getCatesian3FromPX(movement.endPosition) as any;
      $this.tooltip.showAtCartesian(newPosition, '右键单击结束!')
      if (Cesium.defined(floatingPoint)) {
        if (Cesium.defined(newPosition)) {
          activeShapePoints.pop();
          activeShapePoints.push(newPosition.clone());
          polygonObj.positions.pop();
          polygonObj.positions.push(newPosition.clone());
          (floatingPoint!.position as unknown as { setValue: (v: any) => void }).setValue(newPosition);
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // right click
    _handlers.setInputAction(function (movement: any) {
      // 去除重复的cartesian3，因为在mouse 悬停后会获取到重复坐标
      activeShapePoints = $this._excludeDuplicatesCartesian(activeShapePoints);
      terminateShape();
      lineObj = undefined;
      $this.tooltip.setVisible(false);
      _handlers.destroy();
      _handlers = null as unknown as any;
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  },
  // Cartesian3去重
  _excludeDuplicatesCartesian(this: DrawInstance, orgCartesianArr?: any[]) {
    var arr5 = orgCartesianArr!.reduce((pre: any[], cur: any) => {
      const leng = pre.length;
      if (leng < 1 || !pre[leng - 1].equals(cur)) {
        return pre.concat(cur)
      } else {
        return pre
      }
    }, [])
    return arr5
  },
  /**
   * 画线 or 测距
   * @function
   * @param {object} options
   * @example
   * const drawObj = new Draw({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
   * drawObj.drawLineGraphics({
   *   width: 8,
   *   material: Cesium.Color.MEDIUMBLUE,
   *   clampToGround: true,
   *   callback: (positions, entity) => {
   *     // positions: [{ lng, lat, alt }]，可直接交给 buildPathRoaming 等能力继续使用
   *     console.log(positions, entity)
   *   }
   * })
   */
  drawLineGraphics: function (this: DrawInstance, options?: DrawOptions) {
    options = options || {};
    if (this._viewer && options) {
      this._drawComand(options, "line");
    }
  },
  /**
   * 画面 or 测面积
   * @function
   * @param {object} options
   * @example
   * const drawObj = new Draw({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
   * drawObj.drawPolygonGraphics({
   *   style: { material: Cesium.Color.RED.withAlpha(0.3), clampToGround: true },
   *   callback: (positions, entity) => {
   *     // 绘制过程中会实时显示面积，positions 为 [{ lng, lat, alt }]
   *     console.log(positions, entity)
   *   }
   * })
   */
  drawPolygonGraphics: function (this: DrawInstance, options?: DrawOptions) {
    options = options || {};
    const orgStyle = {
      width: 3,
      material: Cesium.Color.BLUE.withAlpha(0.8),
      clampToGround: true,
    };
    if (options.style) {
      options.style = Object.assign({}, orgStyle, options.style)
    } else {
      options.style = orgStyle
    }


    if (this._viewer && options) {
      this._drawComand(options, "polygon");
    }
  },
  /**
   * 画矩形
   * @function
   * @param {object} options
   * @example
   * const drawObj = new Draw({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
   * drawObj.drawRectangleGraphics({
   *   style: { material: Cesium.Color.GREEN.withAlpha(0.3) },
   *   callback: (positions, entity) => console.log(positions, entity)
   * })
   */
  drawRectangleGraphics: function (this: DrawInstance, options?: DrawOptions) {
    options = options || {};
    options.style = options.style || {
      width: 3,
      material: Cesium.Color.BLUE.withAlpha(0.5),
      clampToGround: true,
    };
    if (this._viewer && options) {
      var _positions: any[] = [],
        _rectangleEntity = new Cesium.Entity(),
        _coordinates = new Cesium.Rectangle(),
        $this = this,
        rectangleObj: any | undefined,
        _handler = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas);
      // 获取handler
      drawHandler = _handler;
      // left
      _handler.setInputAction(function (movement: any) {
        var cartesian = $this.getCatesian3FromPX(movement.position) as any;
        if (cartesian && cartesian.x) {
          if (_positions.length == 0) {
            _positions.push(cartesian.clone());
          } else {
            _handler.destroy();

            _positions.push(cartesian.clone());

            _coordinates = Cesium.Rectangle.fromCartesianArray([..._positions, cartesian], Cesium.Ellipsoid.WGS84);

            if (typeof options.callback === "function") {
              options.callback($this.transformCartesianArrayToWGS84Array(_positions), rectangleObj);
            }
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      // mouse
      _handler.setInputAction(function (movement: any) {
        var cartesian = $this.getCatesian3FromPX(movement.endPosition) as any;

        if (cartesian) {
          _coordinates = Cesium.Rectangle.fromCartesianArray([..._positions, cartesian], Cesium.Ellipsoid.WGS84);
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

      _rectangleEntity.rectangle = options.style as unknown as any;

      if (options.height) _rectangleEntity.rectangle.extrudedHeight = asProperty(options.height);
      _rectangleEntity.rectangle.coordinates = new Cesium.CallbackProperty(function () {
        return _coordinates;
      }, false);
      rectangleObj = this._drawLayer.entities.add(_rectangleEntity);
    }
  },
  /**
   * 画圆
   * @function
   * @param {object} options
   * @example
   * const drawObj = new Draw({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
   * drawObj.drawCircleGraphics({
   *   callback: ({ center, radius }, entity) => {
   *     // center 为圆心（Cartesian3），radius 为半径（米）
   *     console.log(center, radius, entity)
   *   }
   * })
   */
  drawCircleGraphics: function (this: DrawInstance, options?: DrawOptions) {
    options = options || {};
    options.style = options.style || {
      width: 3,
      material: Cesium.Color.BLUE.withAlpha(0.5),
      clampToGround: true,
    };
    if (this._viewer && options) {
      var _center: any | undefined = undefined,
        _circleEntity = new Cesium.Entity(),
        $this = this,
        circleObj: any | undefined,
        _radius = 1,
        _handler = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas);
      // 获取handler
      drawHandler = _handler;

      // 计算半径
      const computeRadius = function (src: any, dest: any) {
        let srcCartographic = Cesium.Cartographic.fromCartesian(src);
        let destCartographic = Cesium.Cartographic.fromCartesian(dest);
        let geodesic = new Cesium.EllipsoidGeodesic();
        geodesic.setEndPoints(srcCartographic, destCartographic);
        let s = geodesic.surfaceDistance;
        //开平方
        _radius = Math.sqrt(Math.pow(s, 2) + Math.pow(destCartographic.height - srcCartographic.height, 2));
      };

      //
      const drawGraphics = function () {
        _circleEntity.ellipse = options.style as unknown as any;
        _circleEntity.ellipse.semiMajorAxis = new Cesium.CallbackProperty(function () {
          return _radius;
        }, false);
        _circleEntity.ellipse.semiMinorAxis = new Cesium.CallbackProperty(function () {
          return _radius;
        }, false);
        _circleEntity.position = asProperty(new Cesium.CallbackProperty(function () {
          return _center;
        }, false));

        _circleEntity.point = asProperty({
          pixelSize: 5,
          outlineColor: Cesium.Color.RED,
          outlineWidth: 3,
        });

        if (options.height) _circleEntity.ellipse.extrudedHeight = asProperty(options.height);

        circleObj = $this._drawLayer.entities.add(_circleEntity);
      };

      // left
      _handler.setInputAction(function (movement: any) {
        var cartesian = $this.getCatesian3FromPX(movement.position) as any;
        $this.tooltip.showAtCartesian(cartesian, '左键单击结束!')
        if (cartesian && cartesian.x) {
          if (!_center) {
            _center = cartesian;

            drawGraphics();
          } else {
            computeRadius(_center, cartesian);
            $this.tooltip.setVisible(false)
            _handler.destroy();

            if (typeof options.callback === "function") {
              options.callback({
                center: _center,
                radius: _radius,
              },
                circleObj
              );
            }
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      // mouse
      _handler.setInputAction(function (movement: any) {
        var cartesian = $this._viewer.scene.camera.pickEllipsoid(movement.endPosition, $this._viewer.scene.globe.ellipsoid);
        if (_center && cartesian && cartesian.x) {
          computeRadius(_center, cartesian);
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }
  },
  /**
   * 画三角量测
   * @function
   * @param {object} options
   */
  drawTrianglesGraphics: function (this: DrawInstance, options?: DrawOptions) {
    options = options || {};
    options.style = options.style || {
      width: 3,
      material: Cesium.Color.BLUE.withAlpha(0.5),
    };
    if (this._viewer && options) {
      var _trianglesEntity = new Cesium.Entity(),
        _tempLineEntity = new Cesium.Entity(),
        _tempLineEntity2 = new Cesium.Entity(),
        _positions: any[] = [],
        _tempPoints: any[] = [],
        _tempPoints2: any[] = [],
        $this = this,
        _handler = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas);
      // 获取handler
      drawHandler = _handler;

      // 高度
      const _getHeading = function (startPosition: any, endPosition: any) {
        if (!startPosition && !endPosition) return 0;
        if (Cesium.Cartesian3.equals(startPosition, endPosition)) return 0;
        let cartographic = Cesium.Cartographic.fromCartesian(startPosition);
        let cartographic2 = Cesium.Cartographic.fromCartesian(endPosition);
        return (cartographic2.height - cartographic.height).toFixed(2);
      };

      // 偏移点
      const _computesHorizontalLine = function (positions: any[]) {
        let cartographic = Cesium.Cartographic.fromCartesian(positions[0]);
        let cartographic2 = Cesium.Cartographic.fromCartesian(positions[1]);
        return Cesium.Cartesian3.fromDegrees(
          Cesium.Math.toDegrees(cartographic.longitude),
          Cesium.Math.toDegrees(cartographic.latitude),
          cartographic2.height
        );
      };

      // left
      _handler.setInputAction(function (movement: any) {
        var position = $this.getCatesian3FromPX(movement.position) as any;
        if (!position) return false;
        if (_positions.length == 0) {
          _positions.push(position.clone());
          _positions.push(position.clone());
          _tempPoints.push(position.clone());
          _tempPoints.push(position.clone());
        } else {
          _handler.destroy();
          if (typeof options.callback === "function") {
            options.callback({
              e: _trianglesEntity,
              e2: _tempLineEntity,
              e3: _tempLineEntity2,
            });
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      // mouse
      _handler.setInputAction(function (movement: any) {
        var position = $this.getCatesian3FromPX(movement.endPosition) as any;
        if (position && _positions.length > 0) {
          //直线
          _positions.pop();
          _positions.push(position.clone());
          let horizontalPosition = _computesHorizontalLine(_positions);
          //高度
          _tempPoints.pop();
          _tempPoints.push(horizontalPosition.clone());
          //水平线
          _tempPoints2.pop(), _tempPoints2.pop();
          _tempPoints2.push(position.clone());
          _tempPoints2.push(horizontalPosition.clone());
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

      // create entity

      //直线
      _trianglesEntity.polyline = {
        positions: new Cesium.CallbackProperty(function () {
          return _positions;
        }, false),
        ...options.style,
      } as unknown as any;
      _trianglesEntity.position = asProperty(new Cesium.CallbackProperty(function () {
        return _positions[0];
      }, false));
      _trianglesEntity.point = asProperty({
        pixelSize: 5,
        outlineColor: Cesium.Color.BLUE,
        outlineWidth: 5,
      });
      _trianglesEntity.label = {
        text: new Cesium.CallbackProperty(function () {
          return "直线:" + $this.getPositionDistance($this.transformCartesianArrayToWGS84Array(_positions) as WGS84Type[]) + "米";
        }, false),
        show: true,
        showBackground: true,
        font: "14px monospace",
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(50, -100), //left top
      } as unknown as any;
      //高度
      _tempLineEntity.polyline = {
        positions: new Cesium.CallbackProperty(function () {
          return _tempPoints;
        }, false),
        ...options.style,
      } as unknown as any;
      _tempLineEntity.position = asProperty(new Cesium.CallbackProperty(function () {
        return _tempPoints2[1];
      }, false));
      _tempLineEntity.point = asProperty({
        pixelSize: 5,
        outlineColor: Cesium.Color.BLUE,
        outlineWidth: 5,
      });
      _tempLineEntity.label = {
        text: new Cesium.CallbackProperty(function () {
          return "高度:" + _getHeading(_tempPoints[0], _tempPoints[1]) + "米";
        }, false),
        show: true,
        showBackground: true,
        font: "14px monospace",
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(-20, 100), //left top
      } as unknown as any;
      //水平
      _tempLineEntity2.polyline = {
        positions: new Cesium.CallbackProperty(function () {
          return _tempPoints2;
        }, false),
        ...options.style,
      } as unknown as any;
      _tempLineEntity2.position = asProperty(new Cesium.CallbackProperty(function () {
        return _positions[1];
      }, false));
      _tempLineEntity2.point = asProperty({
        pixelSize: 5,
        outlineColor: Cesium.Color.BLUE,
        outlineWidth: 5,
      });
      _tempLineEntity2.label = {
        text: new Cesium.CallbackProperty(function () {
          return "水平距离:" + $this.getPositionDistance($this.transformCartesianArrayToWGS84Array(_tempPoints2) as WGS84Type[]) + "米";
        }, false),
        show: true,
        showBackground: true,
        font: "14px monospace",
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(-150, -20), //left top
      } as unknown as any;
      this._drawLayer.entities.add(_tempLineEntity2);
      this._drawLayer.entities.add(_tempLineEntity);
      this._drawLayer.entities.add(_trianglesEntity);
    }
  },
  /**
   * 画围栏
   * @function
   * @param {object} options
   */
  drawWallGraphics: function (this: DrawInstance, options?: DrawOptions) {
    options = options || {};
    const orgStyle = {
      material: Cesium.Color.BLUE.withAlpha(0.5),
      outline: true,
      outlineColor: Cesium.Color.WHITE,
    }
    if (options.style) {
      options.style = Object.assign({}, orgStyle, options.style)
    } else {
      options.style = orgStyle
    }

    if (this._viewer && options) {
      var $this = this;
      this.drawPolygonGraphics({
        clampToGround: $this._objHasOwnProperty(options.style, 'clampToGround', true),
        style: {
          material: options.style.material
        },
        callback: function (polygon: unknown, polygonObj: unknown) {
          // 公开回调给的是 WGS84，墙体几何需要 Cartesian3
          const drawPos = $this.transformWGS84ArrayToCartesianArray(polygon as any[]) as any[];
          const maximumHeights: number[] = [];
          const minimumHeights: number[] = []
          if (options.style!.maximumHeights) {
            let numPos = 0
            while (numPos < drawPos.length) {
              maximumHeights.push((options.style!.maximumHeights as number[])[numPos % 2])
              numPos++;
            }
            options.style!.maximumHeights = maximumHeights
          }
          if (options.style!.minimumHeights) {
            let numPos2 = 0;
            while (numPos2 < drawPos.length) {
              minimumHeights.push((options.style!.minimumHeights as number[])[numPos2 % 2])
              numPos2++;
            }
            options.style!.minimumHeights = minimumHeights
          }
          var wallEntity = $this._drawLayer.entities.add({
            wall: {
              positions: drawPos,
              ...options.style,
            },
          } as unknown as any);
          if (typeof options.callback === "function") {
            options.callback(polygon, wallEntity);
          }
        },
      });
    }
  },
  /**
   * 绘制球体
   * @function
   * @param {object} options
   */
  drawEllipsoidGraphics: function (this: DrawInstance, options?: DrawOptions) {
    options = options || {};
    options.style = options.style || {};
    if (this._viewer && options) {
      var $this = this;
      this.drawCircleGraphics({
        callback: function (result: { center: any; radius: number }, obj: unknown) {
          var entity = $this.createGraphics();
          entity.ellipsoid = $this.$graphics.getEllipsoidGraphics({
            radii: result.radius,
          }) as unknown as any;
          entity.position = asProperty(result.center);

          $this._drawLayer.entities.remove(obj as any);

          var ellipsoidObj = $this._drawLayer.entities.add(entity);

          if (typeof options.callback === "function") {
            options.callback(
              {
                center: result.center,
                radius: result.radius,
              },
              ellipsoidObj
            );
          }
        },
      });
    }
  },
  /**
   * 判断对象是否有某个属性
   * @private
   * @param {object} obj 对象
   * @param {string} field  属性字段
   * @param {string} defVal  默认返回
   * @returns {string}
   */
  _objHasOwnProperty<T>(this: DrawInstance, obj?: object, field?: string, defVal?: T): T {
    return obj && (obj as Record<string, unknown>).hasOwnProperty(field as string) ? (obj as Record<string, unknown>)[field as string] as T : defVal as T
  },
  /**
   * 绘制圆柱体 or 圆锥
   * @function
   * @param {object} options
   */
  drawCylinderGraphics: function (this: DrawInstance, options?: DrawOptions) {
    options = options || {};
    options.style = options.style || {};
    if (this._viewer && options) {
      var $this = this;
      this.drawCircleGraphics({
        callback: function (result: { center: any; radius: number }, obj: unknown) {
          var cylinderObj = $this._drawLayer.entities.add({
            position: result.center,
            cylinder: {
              length: result.radius * 2 || options.length,
              topRadius: options.topRadius || result.radius,
              bottomRadius: options.bottomRadius || result.radius,
              material: Cesium.Color.BLUE.withAlpha(0.5),
              outline: true,
              outlineColor: Cesium.Color.WHITE,
            },
          });
          $this._drawLayer.entities.remove(obj as any);

          if (typeof options.callback === "function") {
            options.callback(
              {
                center: result.center,
                radius: result.radius,
              },
              cylinderObj
            );
          }
        },
      });
    }
  },
  /**
   * 绘制走廊
   * @function
   * @param {object} options
   */
  drawCorridorGraphics: function (this: DrawInstance, options?: DrawOptions) {
    options = options || {};
    options.style = options.style || {};
    if (this._viewer && options) {
      var $this = this;
      $this.drawLineGraphics({
        callback: function (line: unknown, lineObj: unknown) {
          var entity = $this.createGraphics();
          entity.corridor = {
            // 公开回调给的是 WGS84，几何需要 Cartesian3
            positions: $this.transformWGS84ArrayToCartesianArray(line as any[]),
            height: options.height || 1,
            width: options.width || 100,
            cornerType: Cesium.CornerType.BEVELED,
            extrudedHeight: options.extrudedHeight || 1,
            material: Cesium.Color.BLUE.withAlpha(0.5),
            outline: true, // height required for outlines to display
            outlineColor: Cesium.Color.WHITE,
          } as unknown as any;

          $this._drawLayer.entities.remove(lineObj as any);

          var corridorObj = $this._drawLayer.entities.add(entity);

          if (typeof options.callback === "function") {
            options.callback(line, corridorObj);
          }
        },
      });
    }
  },

  /**
   * 绘制管道
   * @function
   * @param {object} options
   */
  drawPolylineVolumeGraphics: function (this: DrawInstance, options?: DrawOptions) {
    options = options || {};
    options.style = options.style || {};
    const circleRadius = options.circleRadius || 20,
      arms = options.arms || 7,
      rOuter = options.rOuter || 150,
      rInner = options.rInner || 75;
    if (this._viewer && options) {
      var $this = this;
      $this.drawLineGraphics({
        callback: function (line: unknown, lineObj: unknown) {
          var entity = $this.createGraphics();
          let shapeVal =
            options.shape === "fivePoint"
              ? $this.computeStar2d(arms, rOuter, rInner)
              : $this.computeCircleShap(circleRadius);
          entity.polylineVolume = {
            // 公开回调给的是 WGS84，几何需要 Cartesian3
            positions: $this.transformWGS84ArrayToCartesianArray(line as any[]),
            shape: shapeVal,
            cornerType: Cesium.CornerType.MITERED,
            material: options.color || Cesium.Color.RED,
          } as unknown as any;
          $this._drawLayer.entities.remove(lineObj as any);

          var polylineVolumeObj = $this._drawLayer.entities.add(entity);

          if (typeof options.callback === "function") {
            options.callback(line, polylineVolumeObj);
          }
        },
      });
    }
  },
  /**
   * 移除所有实体
   * @function
   */
  removeAll(this: DrawInstance) {
    this._drawLayer.entities.removeAll();
  },
  /**
   * 移除所以handler 监听
   * @function
   */
  removeEventHandler(this: DrawInstance) {
    if (drawHandler && !drawHandler.isDestroyed()) {
      drawHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      drawHandler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
      drawHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK); //移除事件
      drawHandler.destroy();
    }
    drawHandler = null;
  },
} as unknown as DrawInstance;
  return Draw
}

export const Draw = createScopedConstructor(createDrawModule) as unknown as DrawConstructor
