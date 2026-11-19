
import localDefaultValue from '../../defaultValue'

/* 原实现中依赖的运行时全局变量（未显式声明），此处补充声明以通过类型检查 */
declare var viewer: any
let Cesium: any = null;/** RadarPlugin 实例类型 */
export interface RadarPluginInstance {
  viewer: any
  _installPlugin(): void,
  _installCylinderGeometry(): any,
  /** 相控雷达 */
  _installRadarPrimitive(): any,
  _installCounputeVertex(): any,
  length: any
  topRadius: any
  bottomRadius: any
  slices: any
  zReverse: any
  _geometry: any
  _angle: any
  _radius: any
  _position: any
  _rotation: any
  _trackedEntity: any
  defaultColor: any
  defaultLineColor: any
  _show: any
  _outline: any
  _topShow: any
  _topOutline: any
  _modelMatrix: any
  _quaternion: any
  _translation: any
  _scale: any
  _matrix: any
  _inverseMatrix: any
  _positionCartographic: any
  _positionCartesian: any
  _drawCommands: any
  _outlinePositions: any
  updateGeometry: any
  _groundArea: any
  addGroundAreaEntity: any
  updateGroundCircleRadius: any
  _ground_radius: any
  groundAreaEntity: any
  _trackedEntityPosition: any
  position: any
  radius: any
  angle: any
  _topGeometry: any
  getTopGeometry: any
  _topOutlineGeometry: any
  getTopOutlineGeometry: any
  _outlineGeometry: any
  _positions: any
  computeMatrix: any
  createDrawCommand: any
  getVertexShaderSource: any
  getFragmentShaderSource: any
}

/** RadarPlugin 构造函数类型 */
export interface RadarPluginConstructor {
  new (viewer?: any, cesiumGlobal?: any): RadarPluginInstance
  prototype: RadarPluginInstance
}


//外部插件模块
const RadarPlugin: any = function (this: RadarPluginInstance, viewer?: any, cesiumGlobal?: any) {
  if (viewer) {
    this.viewer = viewer;
    Cesium = cesiumGlobal;
    this._installPlugin();
  }
} as unknown as RadarPluginConstructor

RadarPlugin.prototype = {
  // 安装插件
  _installPlugin: function (this: RadarPluginInstance) {
    this._installCounputeVertex();
    this._installCylinderGeometry();
    this._installRadarPrimitive();
  },
  _installCylinderGeometry: function (this: RadarPluginInstance) {
    function n(this: any, t: any) {
      (this.length = t.length),
        (this.topRadius = t.topRadius),
        (this.bottomRadius = t.bottomRadius),
        (this.slices = t.slices ? t.slices : 64),
        (this.zReverse = t.zReverse);
    }

    var s: any = new Cesium.Cartesian2(),
      u: any = new Cesium.Cartesian3(),
      l: any = new Cesium.Ray();
    n._createGeometry = function (t: any) {
      var e: any = t.length,
        i: any = t.topRadius,
        n: any = t.bottomRadius,
        r: any = t.slices,
        a: any = (2 * Math.PI) / (r - 1),
        u: any = t.zReverse,
        l: any = [],
        h: any = [],
        d: any = [],
        m: any = [],
        f: any = [n, i],
        p: any = [0, u ? -e : e],
        c: any = 0,
        _: any = Math.atan2(n - i, e),
        g: any = s;
      g.z = Math.sin(_);
      for (var v: any = Math.cos(_), y: any = 0; y < p.length; y++) {
        m[y] = [];
        for (var C: any = f[y], w: any = 0; w < r; w++) {
          m[y].push(c++);
          var x: any = a * w,
            A: any = C * Math.cos(x),
            b: any = C * Math.sin(x);
          l.push(A, b, p[y]),
            (A = v * Math.cos(x)),
            (b = v * Math.sin(x)),
            h.push(A, b, g.z),
            d.push(y / (p.length - 1), 0);
        }
      }
      for (var M: any = [], y: any = 1; y < p.length; y++)
        for (var w: any = 1; w < r; w++) {
          var P: any = m[y - 1][w - 1],
            S: any = m[y][w - 1],
            F: any = m[y][w],
            E: any = m[y - 1][w];
          M.push(F),
            M.push(E),
            M.push(P),
            M.push(F),
            M.push(P),
            M.push(S),
            w == m[y].length - 1 &&
              ((P = m[y - 1][w]),
              (S = m[y][w]),
              (F = m[y][0]),
              (E = m[y - 1][0]),
              M.push(F),
              M.push(E),
              M.push(P),
              M.push(F),
              M.push(P),
              M.push(S));
        }
      (M = new Int16Array(M)), (l = new Float32Array(l)), (h = new Float32Array(h)), (d = new Float32Array(d));
      var T: any = {
          position: new Cesium.GeometryAttribute({
            componentDatatype: Cesium.ComponentDatatype.DOUBLE,
            componentsPerAttribute: 3,
            values: l,
          }),
          normal: new Cesium.GeometryAttribute({
            componentDatatype: Cesium.ComponentDatatype.FLOAT,
            componentsPerAttribute: 3,
            values: h,
          }),
          st: new Cesium.GeometryAttribute({
            componentDatatype: Cesium.ComponentDatatype.FLOAT,
            componentsPerAttribute: 2,
            values: d,
          }),
        },
        R: any = Cesium.BoundingSphere.fromVertices(l),
        G: any = new Cesium.Geometry({
          attributes: T,
          indices: M,
          primitiveType: Cesium.PrimitiveType.TRIANGLES,
          boundingSphere: R,
        });
      return (l = []), (M = []), (d = []), G;
    };
    n.createGeometry = function (t: any, e: any) {
      if (!e) return n._createGeometry(t);
      Cesium.Matrix4.multiplyByPoint(e, Cesium.Cartesian3.ZERO, u), u.clone(l.origin);
      var i: any = t.length,
        r: any = t.topRadius,
        s: any = (t.bottomRadius, t.slices),
        h: any = (2 * Math.PI) / (s - 1),
        d: any = t.zReverse,
        m: any = [],
        f: any = [],
        p: any = [],
        c: any = [],
        _: any = [0, d ? -i : i],
        g: any = 0,
        g: any = 0;
      m.push(0, 0, 0), f.push(1, 1), g++;
      for (var v: any = new Cesium.Cartesian3(), y: any = r / 15, C: any = 0; C < 16; C++) {
        for (var w: any = y * C, x: any = [], A: any = 0; A < s; A++) {
          var b: any = h * A,
            M: any = w * Math.cos(b),
            P: any = w * Math.sin(b);
          (v.x = M), (v.y = P), (v.z = _[1]);
          var S: any = (0, Cesium.Scene.extend2Earth)(v, e, l);
          S ? (x.push(g), m.push(M, P, _[1]), f.push(C / 15, 1), g++) : ((S = u), x.push(-1));
        }
        c.push(x);
      }
      for (var F: any, E: any, T: any = [0, c.length - 1], R: any = 0; R < T.length; R++)
        for (var C: any = T[R], A: any = 1; A < c[C].length; A++)
          (F = c[C][A - 1]), (E = c[C][A]), F >= 0 && E >= 0 && p.push(0, F, E);
      (m = new Float32Array(m)), (p = new Int32Array(p)), (f = new Float32Array(f));
      var G: any = {
          position: new Cesium.GeometryAttribute({
            componentDatatype: Cesium.ComponentDatatype.DOUBLE,
            componentsPerAttribute: 3,
            values: m,
          }),
          st: new Cesium.GeometryAttribute({
            componentDatatype: Cesium.ComponentDatatype.FLOAT,
            componentsPerAttribute: 2,
            values: f,
          }),
        },
        V: any = Cesium.BoundingSphere.fromVertices(m),
        D: any = new Cesium.Geometry({
          attributes: G,
          indices: p,
          primitiveType: Cesium.PrimitiveType.TRIANGLES,
          boundingSphere: V,
        });
      return (0, Cesium.Scene.computeVertexNormals)(D), (m = []), (p = []), D;
    };
    n.createOutlineGeometry = function (t: any) {
      var e: any = t.length,
        i: any = t.topRadius,
        n: any = t.bottomRadius,
        r: any = t.slices,
        a: any = (2 * Math.PI) / (r - 1),
        u: any = t.zReverse,
        l: any = [],
        h: any = [],
        d: any = [],
        m: any = [],
        f: any = [n, i],
        p: any = [0, u ? -e : e],
        c: any = 0,
        _: any = Math.atan2(n - i, e),
        g: any = s;
      g.z = Math.sin(_);
      for (var v: any = Math.cos(_), y: any = 0; y < p.length; y++) {
        m[y] = [];
        for (var C: any = f[y], w: any = 0; w < r; w++) {
          m[y].push(c++);
          var x: any = a * w,
            A: any = C * Math.cos(x),
            b: any = C * Math.sin(x);
          l.push(A, b, p[y]),
            (A = v * Math.cos(x)),
            (b = v * Math.sin(x)),
            h.push(A, b, g.z),
            d.push(y / (p.length - 1), 0);
        }
      }
      for (var M: any = [], y: any = 1; y < p.length; y++)
        for (var w: any = 1; w < r; w += 1) {
          var P: any = m[y - 1][w - 1],
            S: any = m[y][w - 1];
          m[y][w], m[y - 1][w];
          w % 8 == 1 && M.push(P, S);
        }
      (M = new Int16Array(M)), (l = new Float32Array(l)), (h = new Float32Array(h)), (d = new Float32Array(d));
      var F: any = {
          position: new Cesium.GeometryAttribute({
            componentDatatype: Cesium.ComponentDatatype.DOUBLE,
            componentsPerAttribute: 3,
            values: l,
          }),
          normal: new Cesium.GeometryAttribute({
            componentDatatype: Cesium.ComponentDatatype.FLOAT,
            componentsPerAttribute: 3,
            values: h,
          }),
          st: new Cesium.GeometryAttribute({
            componentDatatype: Cesium.ComponentDatatype.FLOAT,
            componentsPerAttribute: 2,
            values: d,
          }),
        },
        E: any = Cesium.BoundingSphere.fromVertices(l),
        T: any = new Cesium.Geometry({
          attributes: F,
          indices: M,
          primitiveType: Cesium.PrimitiveType.LINES,
          boundingSphere: E,
        });
      return (l = []), (M = []), (d = []), T;
    };
    n.fromAngleAndLength = function (t: any, e: any, i: any) {
      return (
        (t = Cesium.Math.toRadians(t)),
        new (n as any)({
          topRadius: (Math.tan(t) * e) / 2,
          bottomRadius: 0,
          length: e,
          zReverse: i,
        })
      );
    };

    Cesium.Scene.CylinderGeometry = n;
  },
  /**
   * 相控雷达
   * @private
   */
  _installRadarPrimitive: function (this: RadarPluginInstance) {
    var r: any;
    /**
    * 锥形传感器
   * @global
   * @name ConeSensorPrimitive
   * @param {viewer} t - viewer 实例
   * @param {object} e
   * @param {Cartesian3} e.position - 坐标
   * @param {number} e.angle - 角度
   * @param {number} e.radius - 半径
   * @param {number} e.heading - 方向
   * @param {number} e.pitch - 倾斜度
   * @param {object} e.roll - 翻滚角
   * @param {object} e.color - 颜色
   * @param {object} e.lineColor - 线条颜色
   * @example
        new Cesium.Scene.ConeSensorPrimitive(viewer,{
                position: Cesium.Cartesian3.fromDegrees(117.224, 31.819, 128),
                angle:  80,
                radius:  700000,
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(40),
                roll: Cesium.Math.toRadians(0),
                color:{
                  red: 1,
                  green: 0,
                  blue: 0,
                  alpha: 0.4,
                },
                lineColor {
                  red: 1,
                  green: 1,
                  blue: 1,
                  alpha: 0.9,
                }
          })
     */
    function n (this: any, t: any, e: any) {
      let defaultValue: any = Cesium.defaultValue || localDefaultValue;
      (e = e || {}),
        (r = t.scene.globe.ellipsoid),
        (this._geometry = null),
        (this._angle = e.angle),
        (this._radius = e.radius ? e.radius : 5),
        (this._position = e.position),
        (this._rotation = e.rotation
          ? e.rotation
          : {
              heading: 0,
              pitch: 0,
              roll: 0,
            }),
        (this._trackedEntity = e.trackedEntity),
        (this.defaultColor = e.color ? e.color : Cesium.Color.YELLOW),
        (this.defaultLineColor = e.lineColor ? e.lineColor : this.defaultColor),
        (this._show = defaultValue(e.show, !0)),
        (this._outline = defaultValue(e.outline, !1)),
        (this._topShow = defaultValue(e.top, !0)),
        (this._topOutline = defaultValue(e.topOutline, !0)),
        (this._modelMatrix = Cesium.Matrix4.clone(Cesium.Matrix4.IDENTITY)),
        (this._quaternion = new Cesium.Quaternion()),
        (this._translation = new Cesium.Cartesian3()),
        (this._scale = new Cesium.Cartesian3(1, 1, 1)),
        (this._matrix = new Cesium.Matrix4()),
        (this._inverseMatrix = new Cesium.Matrix4()),
        (this._positionCartographic = new Cesium.Cartographic()),
        (this._positionCartesian = null),
        (this._drawCommands = []),
        (this._outlinePositions = []),
        (this.viewer = t),
        this.viewer.scene.primitives.add(this),
        this.updateGeometry(),
        (this._groundArea = defaultValue(e.groundArea, !1)),
        this.addGroundAreaEntity(this._groundArea);
    }

    Object.defineProperties(n.prototype, {
      trackedEntity: {
        get: function (this: any) {
          return this._trackedEntity;
        },
        set: function (this: any, t: any) {
          this._trackedEntity = t;
        },
      },
      color: {
        get: function (this: any) {
          return this.defaultColor;
        },
        set: function (this: any, t: any) {
          this.defaultColor = t;
        },
      },
      lineColor: {
        get: function (this: any) {
          return this.defaultLineColor;
        },
        set: function (this: any, t: any) {
          this.defaultLineColor = t;
        },
      },
      show: {
        get: function (this: any) {
          return this._show;
        },
        set: function (this: any, t: any) {
          this._show = t;
        },
      },
      outline: {
        get: function (this: any) {
          return this._outline;
        },
        set: function (this: any, t: any) {
          (this._outline = t), this.updateGeometry();
        },
      },
      top: {
        get: function (this: any) {
          return this._topShow;
        },
        set: function (this: any, t: any) {
          (this._topShow = t), this.updateGeometry();
        },
      },
      topOutline: {
        get: function (this: any) {
          return this._topOutline;
        },
        set: function (this: any, t: any) {
          (this._topOutline = t), this.updateGeometry();
        },
      },
      groundArea: {
        get: function (this: any) {
          return this._groundArea;
        },
        set: function (this: any, t: any) {
          (this._groundArea = t), this.addGroundAreaEntity(this._groundArea);
        },
      },
      angle: {
        get: function (this: any) {
          return this._angle;
        },
        set: function (this: any, t: any) {
          (this._angle = t), this.updateGroundCircleRadius(), this.updateGeometry();
        },
      },
      radius: {
        get: function (this: any) {
          return this._radius;
        },
        set: function (this: any, t: any) {
          (this._radius = t), this.updateGroundCircleRadius(), this.updateGeometry();
        },
      },
      heading: {
        get: function (this: any) {
          return this._rotation.heading;
        },
        set: function (this: any, t: any) {
          this._rotation.heading = t;
        },
      },
      pitch: {
        get: function (this: any) {
          return this._rotation.pitch;
        },
        set: function (this: any, t: any) {
          this._rotation.pitch = t;
        },
      },
      roll: {
        get: function (this: any) {
          return this._rotation.roll;
        },
        set: function (this: any, t: any) {
          this._rotation.roll = t;
        },
      },
      position: {
        get: function (this: any) {
          return this._position;
        },
        set: function (this: any, t: any) {
          this._position = t;
        },
      },
    });
    n.prototype.updateGroundCircleRadius = function (this: any) {
      this._ground_radius = this._radius * Math.cos(Cesium.Math.toRadians(this._angle));
    };
    n.prototype.isDestroyed = function () {
      return false
    }
    n.prototype.addGroundAreaEntity = function (this: any, t: any) {
      if (t && !this.groundAreaEntity) {
        var e: any = this;
        this.updateGroundCircleRadius(),
          (this.groundAreaEntity = viewer.entities.add({
            position: this._position,
            ellipse: {
              show: 0 === this._rotation.pitch && 0 === this._rotation.roll,
              semiMinorAxis: new Cesium.CallbackProperty(function (t: any) {
                return e._ground_radius;
              }, !1),
              semiMajorAxis: new Cesium.CallbackProperty(function (t: any) {
                return e._ground_radius;
              }, !1),
              material: this.defaultColor,
            },
            polyline: {
              show: this._trackedEntityPosition && (0 !== this._rotation.pitch || 0 !== this._rotation.roll),
              positions: new Cesium.CallbackProperty(function (t: any) {
                return e._trackedEntityPosition
                  ? Cesium.Cartesian3.distance(e._position, e._trackedEntityPosition) > e._radius
                    ? []
                    : [e._position, e._trackedEntityPosition]
                  : [];
              }, !1),
              followSurface: !1,
              material: new Cesium.PolylineDashMaterialProperty({
                color: Cesium.Color.CYAN,
              }),
              width: 1,
            },
          }));
      }
    };
    var l: any = new Cesium.Cartesian3();
    n.prototype.computeMatrix = function (this: any, t: any, e: any) {
      if (
        (this._positionCartesian || (this._positionCartesian = new Cesium.Cartesian3()),
        this.position instanceof Cesium.Cartesian3
          ? (this._positionCartesian = this.position)
          : "function" == typeof this.position.getValue
          ? (this._positionCartesian = this.position.getValue(t))
          : this.position._value &&
            this.position._value instanceof Cesium.Cartesian3 &&
            (this._positionCartesian = this.position._value),
        this._trackedEntity && this._trackedEntity.position)
      ) {
        var i: any = this._positionCartesian,
          n: any = Cesium.Property.getValueOrUndefined(this._trackedEntity.position, t, l);
        if (n) {
          this._trackedEntityPosition = n;
          this._rotation.heading = 0;
          this._rotation.pitch = 40;
          this._rotation.roll = 0;
        }
      }
      return (
        (this._modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(this._positionCartesian, r, this._modelMatrix)),
        (this._positionCartographic = Cesium.Cartographic.fromCartesian(
          this._positionCartesian,
          r,
          this._positionCartographic
        )),
        Cesium.Transforms.eastNorthUpToFixedFrame(this._positionCartesian, r, this._modelMatrix),
        Cesium.Quaternion.fromHeadingPitchRoll(this._rotation, this._quaternion),
        (this._matrix = Cesium.Matrix4.fromTranslationQuaternionRotationScale(
          this._translation,
          this._quaternion,
          this._scale,
          this._matrix
        )),
        Cesium.Matrix4.multiplyTransformation(this._modelMatrix, this._matrix, this._matrix),
        Cesium.Matrix4.inverseTransformation(this._matrix, this._inverseMatrix),
        this._matrix
      );
    };
    n.prototype.getTopGeometry = function (this: any) {
      for (
        var t: any = this.radius,
          e: any = [],
          i: any = [],
          n: any = [],
          r: any = [],
          o: any = 90 - parseInt(this.angle),
          s: any = o < 1 ? o / 8 : 1,
          l: any = (2 * Math.PI) / 127,
          h: any = 0,
          d: any = this.angle;
        d < 91;
        d += s
      ) {
        var m: any = Cesium.Math.toRadians(d < 90 ? d : 90);
        m = Math.cos(m) * t;
        for (var f: any = [], p: any = 0; p < 128; p++) {
          var c: any = l * p,
            _: any = m * Math.cos(c),
            g: any = m * Math.sin(c),
            v: any = Math.sqrt(t * t - _ * _ - g * g);
          e.push(_, g, v), i.push(1, 1), f.push(h++);
        }
        r.push(f);
      }
      for (var d: any = 1; d < r.length; d++)
        for (var p: any = 1; p < r[d].length; p++) {
          var y: any = r[d - 1][p - 1],
            C: any = r[d][p - 1],
            w: any = r[d][p],
            x: any = r[d - 1][p];
          n.push(y, C, w), n.push(y, w, x);
        }
      (e = new Float32Array(e)), (n = new Int32Array(n)), (i = new Float32Array(i));
      var A: any = {
          position: new Cesium.GeometryAttribute({
            componentDatatype: Cesium.ComponentDatatype.DOUBLE,
            componentsPerAttribute: 3,
            values: e,
          }),
          st: new Cesium.GeometryAttribute({
            componentDatatype: Cesium.ComponentDatatype.FLOAT,
            componentsPerAttribute: 2,
            values: i,
          }),
        },
        b: any = Cesium.BoundingSphere.fromVertices(e),
        M: any = new Cesium.Geometry({
          attributes: A,
          indices: n,
          primitiveType: Cesium.PrimitiveType.TRIANGLES,
          boundingSphere: b,
        });
      return (0, Cesium.Scene.computeVertexNormals)(M), M;
    };
    n.prototype.getTopOutlineGeometry = function (this: any) {
      for (
        var t: any = this.radius,
          e: any = [],
          i: any = [],
          n: any = [],
          r: any = [],
          o: any = 90 - parseInt(this.angle),
          s: any = o < 1 ? o / 8 : 1,
          l: any = (2 * Math.PI) / 127,
          h: any = 0,
          d: any = this.angle;
        d < 91;
        d += s
      ) {
        var m: any = Cesium.Math.toRadians(d < 90 ? d : 90);
        m = Math.cos(m) * t;
        for (var f: any = [], p: any = 0; p < 128; p++) {
          var c: any = l * p,
            _: any = m * Math.cos(c),
            g: any = m * Math.sin(c),
            v: any = Math.sqrt(t * t - _ * _ - g * g);
          e.push(_, g, v), i.push(1, 1), f.push(h++);
        }
        r.push(f);
      }
      for (var d: any = 1; d < r.length; d++)
        for (var p: any = 1; p < r[d].length; p++) {
          var y: any = r[d - 1][p - 1],
            C: any = r[d][p - 1],
            w: any = r[d][p];
          r[d - 1][p];
          p % 8 == 1 && n.push(y, C), d % 8 == 1 && n.push(C, w);
        }
      (e = new Float32Array(e)), (n = new Int32Array(n)), (i = new Float32Array(i));
      var x: any = {
          position: new Cesium.GeometryAttribute({
            componentDatatype: Cesium.ComponentDatatype.DOUBLE,
            componentsPerAttribute: 3,
            values: e,
          }),
          st: new Cesium.GeometryAttribute({
            componentDatatype: Cesium.ComponentDatatype.FLOAT,
            componentsPerAttribute: 2,
            values: i,
          }),
        },
        A: any = Cesium.BoundingSphere.fromVertices(e),
        b: any = new Cesium.Geometry({
          attributes: x,
          indices: n,
          primitiveType: Cesium.PrimitiveType.LINES,
          boundingSphere: A,
        });
      return (0, Cesium.Scene.computeVertexNormals)(b), b;
    };
    n.prototype.updateGeometry = function (this: any) {
      (this._geometry = Cesium.Scene.CylinderGeometry.createGeometry(
        new Cesium.Scene.CylinderGeometry({
          topRadius: this._radius * Math.cos(Cesium.Math.toRadians(this.angle)),
          bottomRadius: 0,
          length: this._radius * Math.sin(Cesium.Math.toRadians(this.angle)),
        })
      )),
        (this._topGeometry = this.getTopGeometry()),
        (this._topOutlineGeometry = this.getTopOutlineGeometry()),
        (this._outlineGeometry = Cesium.Scene.CylinderGeometry.createOutlineGeometry(
          new Cesium.Scene.CylinderGeometry({
            topRadius: this._radius * Math.cos(Cesium.Math.toRadians(this.angle)),
            bottomRadius: 0,
            slices: 128,
            length: this._radius * Math.sin(Cesium.Math.toRadians(this.angle)),
          })
        )),
        (this._positions = new Float32Array(this._geometry.attributes.position.values.length));
      for (var t: any = 0; t < this._positions.length; t++) this._positions[t] = this._geometry.attributes.position.values[t];
      this._drawCommands &&
        this._drawCommands.length &&
        (this._drawCommands.forEach(function (t: any) {
          t.vertexArray = t.vertexArray && t.vertexArray.destroy();
        }),
        this._drawCommands.splice(0, this._drawCommands.length));
    };
    n.prototype.update = function (this: any, t: any) {
      if (this._show) {
        this.computeMatrix(t.time);
        t.mode === Cesium.SceneMode.SCENE3D
          ? ((this._geometry.boundingSphere = Cesium.BoundingSphere.fromVertices(
              this._geometry.attributes.position.values
            )),
            (this._drawCommands && this._drawCommands.length) ||
              (this._drawCommands.push(this.createDrawCommand(this._geometry, t)),
              this._outline && this._drawCommands.push(this.createDrawCommand(this._outlineGeometry, t)),
              this._topShow &&
                (this._drawCommands.push(this.createDrawCommand(this._topGeometry, t)),
                this._topOutline && this._drawCommands.push(this.createDrawCommand(this._topOutlineGeometry, t)))),
            this._drawCommands.forEach(function (e: any) {
              t.commandList.push(e);
            }),
            this.groundAreaEntity &&
              ((this.groundAreaEntity.ellipse.show =
                this._groundArea && 0 === this._rotation.pitch && 0 === this._rotation.roll),
              (this.groundAreaEntity.polyline.show = !1)))
          : (this.groundAreaEntity || this.addGroundAreaEntity(!0),
            (this.groundAreaEntity.ellipse.show = 0 === this._rotation.pitch && 0 === this._rotation.roll),
            (this.groundAreaEntity.polyline.show =
              this._trackedEntityPosition && (0 !== this._rotation.pitch || 0 !== this._rotation.roll)));
      }
    };
    n.prototype.getFragmentShaderSource = function (t: any) {
      return "#version 300 es\n\
              in vec3 v_position;\n\
              in vec3 v_normal; \n\
              uniform float picked; \n\
              uniform vec4  pickedColor; \n\
              uniform vec4  defaultColor; \n\
              uniform float specular; \n\
              uniform float shininess; \n\
              uniform vec3  emission; \n\
              in vec2 v_st; \n\
              uniform bool isLine; \n\
              uniform float glowPower; \n\
              void main() { \n\
                vec3 positionToEyeEC = -v_position; \n\
                vec3 normalEC = normalize(v_normal); \n\
                vec4 color = defaultColor; \n\
                 if (picked != 0.0) { \n\
                        color = pickedColor; \n\
                 } \n\
                  czm_material material; \n\
                  material.specular = specular; \n\
                  material.shininess = shininess; \n\
                  material.normal = normalEC; \n\
                  material.emission = emission;//vec3(0.2,0.2,0.2);\n\
                  material.diffuse = color.rgb ;\n\
                  if(isLine){\n\
                        material.alpha = 1.0; \n\
                    }\n\
                  else{ \n\
                    material.alpha = color.a; \n\
                   }\n\
                  if(v_st.x==0.0){ \n\
                    out_FragColor =color ;\n\
                  }else { \n\
                    out_FragColor = czm_phong(normalize(positionToEyeEC), material,czm_lightDirectionEC) ; \n\
                  } \n\
                  }";
    };
    n.prototype.getVertexShaderSource = function (t: any) {
      return "#version 300 es\n\
              #ifdef GL_ES\n\
                precision highp float;\n\
              #endif\n\n\
              in vec3 position;\n\
              in vec2 st;\n\
              in vec3 normal;\n\
              uniform mat4 modelViewMatrix;\n\
              uniform mat3 normalMatrix;\n\
              uniform mat4 projectionMatrix;\n\
              out vec3 v_position;\n\
              out vec3 v_normal;\n\
              out vec2 v_st;\n\n\
              out vec3 v_light0Direction;\n\n\
              void main(void) \n\
              {\n\
                    vec4 pos =  modelViewMatrix * vec4( position,1.0);\n\
                    v_normal =  normalMatrix *  normal;\n\
                    v_st = st;\n\
                    v_position = pos.xyz;\n\
                    v_light0Direction = mat3( modelViewMatrix) * vec3(1.0,1.0,1.0);\n\
                    gl_Position =  projectionMatrix * pos;\n\
                }";
    };
    n.prototype.createDrawCommand = function (this: any, t: any, e: any, i: any) {
      var n: any = e.context,
        r: any = new Cesium.Cartesian3();
      Cesium.Matrix4.multiplyByPoint(this._matrix, t.boundingSphere.center, r);
      var o: any = new Cesium.BoundingSphere(r, t.boundingSphere.radius),
        s: any = new Cesium.DrawCommand({
          modelMatrix: i || this._matrix,
          owner: this,
          primitiveType: t.primitiveType,
          pass: Cesium.Pass.TRANSLUCENT,
          boundingVolume: o,
        }),
        u: any = this,
        l: any = Cesium.GeometryPipeline.createAttributeLocations(t);
      return (
        (s.vertexArray = Cesium.VertexArray.fromGeometry({
          context: n,
          geometry: t,
          attributeLocations: l,
          bufferUsage: Cesium.BufferUsage.STATIC_DRAW,
        })),
        (s.vertexArray._attributeLocations = l),
        (s.shaderProgram = Cesium.ShaderProgram.replaceCache({
          context: n,
          vertexShaderSource: this.getVertexShaderSource(t),
          fragmentShaderSource: this.getFragmentShaderSource(t),
          attributeLocations: l,
        })),
        (s.renderState = Cesium.RenderState.fromCache({
          blending: Cesium.BlendingState.ALPHA_BLEND,
          depthTest: {
            enabled: !0,
            func: Cesium.DepthFunction.LESS,
          },
          cull: {
            enabled: !1,
            face: Cesium.CullFace.BACK,
          },
        })),
        (s.uniformMap = {}),
        (s.uniformMap.projectionMatrix = function () {
          return e.context.uniformState.projection;
        }),
        (s.uniformMap.modelViewMatrix = function () {
          return e.context.uniformState.modelView;
        }),
        (s.uniformMap.shininess = function () {
          return u.shininess || (u.shininess = 0), u.shininess;
        }),
        (s.uniformMap.emission = function () {
          return u.emission || (u.emission = new Cesium.Cartesian3(0.2, 0.2, 0.2)), u.emission;
        }),
        (s.uniformMap.specular = function () {
          return u.specular || (u.specular = 0), u.specular;
        }),
        (s.uniformMap.isLine = function () {
          return t.primitiveType == Cesium.PrimitiveType.LINES || t.primitiveType == Cesium.PrimitiveType.LINE_STRIP;
        }),
        (s.uniformMap.defaultColor = function () {
          return t.primitiveType == Cesium.PrimitiveType.LINES || t.primitiveType == Cesium.PrimitiveType.LINE_STRIP
            ? (u.defaultLineColor || (u.defaultLineColor = new Cesium.Color(1, 1, 0, 1)), u.defaultLineColor)
            : (u.defaultColor || (u.defaultColor = new Cesium.Color(1, 0, 0, 1)), u.defaultColor);
        }),
        (s.uniformMap.picked = function () {
          return u.picked || (u.picked = 0), u.picked;
        }),
        (s.uniformMap.pickedColor = function () {
          return u.pickedColor || (u.pickedColor = new Cesium.Color(1, 1, 0, 1)), u.pickedColor;
        }),
        (s.uniformMap.normalMatrix = function () {
          return e.context.uniformState.normal;
        }),
        (s.uniformMap.glowPower = function () {
          return 0.25;
        }),
        s
      );
    };
    n.prototype.remove = function (this: any) {
      this.viewer.scene.primitives.remove(this),
        this.groundAreaEntity && this.viewer.entities.remove(this.groundAreaEntity);
    };
    n.prototype.addToScene = function (this: any) {
      this.viewer.scene.primitives.add(this), this.groundAreaEntity && this.viewer.entities.add(this.groundAreaEntity);
    };
    n.prototype.destroy = function (this: any, t: any) {
      t &&
        (this.viewer.scene.primitives.remove(this),
        this.groundAreaEntity && this.viewer.entities.remove(this.groundAreaEntity),
        this._drawCommands.forEach(function (t: any) {
          t.vertexArray = t.vertexArray && t.vertexArray.destroy();
        }),
        (this._drawCommands = []));
    };

    Cesium.Scene.ConeSensorPrimitive = n;
  },
  _installCounputeVertex: function (this: RadarPluginInstance) {
    function n(t: any) {
      var e: any = t.indices,
        i: any = t.attributes,
        n: any = e.length;
      if (i.position) {
        var o: any = i.position.values;
        if (void 0 === i.normal)
          i.normal = new Cesium.GeometryAttribute({
            componentDatatype: Cesium.ComponentDatatype.FLOAT,
            componentsPerAttribute: 3,
            values: new Float32Array(o.length),
          });
        else for (var a: any = i.normal.values, s: any = 0; s < n; s++) a[s] = 0;
        for (
          var u: any,
            l: any,
            h: any,
            d: any = i.normal.values,
            m: any = new Cesium.Cartesian3(),
            f: any = new Cesium.Cartesian3(),
            p: any = new Cesium.Cartesian3(),
            c: any = new Cesium.Cartesian3(),
            _: any = new Cesium.Cartesian3(),
            s: any = 0;
          s < n;
          s += 3
        )
          (u = 3 * e[s + 0]),
            (l = 3 * e[s + 1]),
            (h = 3 * e[s + 2]),
            Cesium.Cartesian3.fromArray(o, u, m),
            Cesium.Cartesian3.fromArray(o, l, f),
            Cesium.Cartesian3.fromArray(o, h, p),
            Cesium.Cartesian3.subtract(p, f, c),
            Cesium.Cartesian3.subtract(m, f, _),
            Cesium.Cartesian3.cross(c, _, c),
            (d[u] += c.x),
            (d[u + 1] += c.y),
            (d[u + 2] += c.z),
            (d[l] += c.x),
            (d[l + 1] += c.y),
            (d[l + 2] += c.z),
            (d[h] += c.x),
            (d[h + 1] += c.y),
            (d[h + 2] += c.z);
        r(t), (i.normal.needsUpdate = !0);
      }
      return t;
    }
    function r(t: any) {
      for (var e: any, i: any, n: any, r: any, o: any = t.attributes.normal.values, a: any = 0; a < o.length; a += 3)
        (e = o[a]),
          (i = o[a + 1]),
          (n = o[a + 2]),
          (r = 1 / Math.sqrt(e * e + i * i + n * n)),
          (o[a] = e * r),
          (o[a + 1] = i * r),
          (o[a + 2] = n * r);
    }
    function o(t: any, e: any, i: any, n: any) {
      (n = n || Cesium.Ellipsoid.WGS84),
        Cesium.Matrix4.multiplyByPoint(e, t, a),
        Cesium.Cartesian3.subtract(a, i.origin, i.direction),
        Cesium.Cartesian3.normalize(i.direction, i.direction);
      var r: any = Cesium.IntersectionTests.rayEllipsoid(i, n),
        o: any = null;
      if ((r && (o = Cesium.Ray.getPoint(i, r.start)), o))
        try {
          Cesium.Cartographic.fromCartesian(o, null, s);
        } catch (t: any) {
          return null;
        }
      return o;
    }
    var a: any = new Cesium.Cartesian3(),
      s: any = (new Cesium.Ray(), new Cesium.Cartographic());
    (Cesium.Scene.computeVertexNormals = n), (Cesium.Scene.extend2Earth = o);
  },
} as unknown as RadarPluginInstance;

export { RadarPlugin };
