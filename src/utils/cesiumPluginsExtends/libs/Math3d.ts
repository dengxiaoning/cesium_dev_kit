
import type { CesiumGlobal, WGS84Type } from './Base'
import { createScopedConstructor } from './Base'

/** 模块内部持有的 cesium 全局对象 */

/* ===== 由原 JSDoc @typedef 生成的类型 ===== */

/** 经纬度坐标对象（角度制） */
export interface LonLatType {
  /** 经度（角度制） */
  lon: number
  /** 纬度（角度制） */
  lat: number
}

/** - 坐标系对象（角度制经纬度数组，兼容旧命名） */
export type lonlatType = LonLatType[]

/** 计算两点角度的参数 */
export interface PositionsAngleOptions {
  /** 第一个点坐标 */
  position1: any
  /** 第二个点坐标 */
  position2: any
  /** 角度类型：pitch 俯仰角 / heading 偏航角 */
  type?: 'pitch' | 'heading'
}

/** raisePositionsToHeight 的参数 */
export interface RaisePositionsToHeightOptions {
  /** 椭球对象 */
  ellipsoid: any
  /** 缩放比例 */
  height: number
  /** 拉伸高度 */
  extrudedHeight?: number
}

/** computeEllipseEdgePositions / computeSectorEdgePositions 的参数 */
export interface EllipseEdgeOptions {
  /** 短半轴 */
  semiMinorAxis: number
  /** 长半轴 */
  semiMajorAxis: number
  /** 旋转角度（弧度） */
  rotation: number
  /** 中心点（笛卡尔坐标） */
  center: any
  /** 粒度（弧度） */
  granularity?: number
  /** 角度（弧度，仅 computeSectorEdgePositions 使用） */
  angle?: number
}

/** 椭圆 / 扇形边界位置计算结果 */
export interface EllipseEdgeResult {
  /** 边界点数量 */
  numPts: number
  /** 边界位置坐标（扁平数组 [x,y,z,x,y,z,...]） */
  outerPositions: number[]
}

/** 地理坐标对象（弧度制，用于线段插值） */
export interface CartographicLike {
  /** 经度（弧度） */
  longitude: number
  /** 纬度（弧度） */
  latitude: number
  /** 高度 */
  height?: number
}

/**
 * 数学3d计算模块
 * @class
 * @param viewer - cesium 实例
 * @param cesiumGlobal - cesium 全局对象
 * @exports Math3d
 */
/**
 * 为每个实例创建独立闭包，避免模块级 Cesium/dfSt 及交互状态在多个 viewer 间共享。
 * 由 createScopedConstructor 在每次 new 时调用。
 */
export function createMath3dModule() {
  let Cesium = {} as CesiumGlobal

class Math3d {
  /** cesium viewer 实例 */
  _viewer!: any
  /** WGS84 转地理坐标（由 Base 混入） */
  transformWGS84ToCartographic!: (position?: WGS84Type) => any
  /** WGS84 转笛卡尔（由 Base 混入） */
  transformWGS84ToCartesian!: (position?: WGS84Type, alt?: number) => any | undefined

  constructor(viewer?: any, cesiumGlobal?: CesiumGlobal) {
    if (viewer) {
      this._viewer = viewer
      Cesium = cesiumGlobal as CesiumGlobal
    }
  }

  /**
   * 拆分组合坐标数组
   * @param cartesianArr - 坐标数组
   * @returns Cartesian3 类型的数组
   */
  splitCartesians3(cartesianArr: number[]): any[] {
    var positions: any[] = [];
    for (var i = 0; i < cartesianArr.length; i += 3) {
      var cartesian = new Cesium.Cartesian3(cartesianArr[i], cartesianArr[i + 1], cartesianArr[i + 2]);
      positions.push(cartesian);
    }
    positions.push(positions[0]);

    return positions;
  }

  /**
   * 计算两点的点集
   * @param startPoint - 开始节点
   * @param endPoint - 结束节点
   * @param angularityFactor - 曲率
   * @param numOfSingleLine - 点集数量
   */
  getLinkedPointList(startPoint: any, endPoint: any, angularityFactor: number, numOfSingleLine: number): any[] | undefined {
    if (this._viewer) {
      var result: any[] = [];
      var startPosition = Cesium.Cartographic.fromCartesian(startPoint);
      var endPosition = Cesium.Cartographic.fromCartesian(endPoint);

      var startLon = (startPosition.longitude * 180) / Math.PI;
      var startLat = (startPosition.latitude * 180) / Math.PI;
      var endLon = (endPosition.longitude * 180) / Math.PI;
      var endLat = (endPosition.latitude * 180) / Math.PI;

      var dist = Math.sqrt((startLon - endLon) * (startLon - endLon) + (startLat - endLat) * (startLat - endLat));
      var angularity = dist * angularityFactor;

      var startVec = Cesium.Cartesian3.clone(startPoint);
      var endVec = Cesium.Cartesian3.clone(endPoint);

      var startLength = Cesium.Cartesian3.distance(startVec, Cesium.Cartesian3.ZERO);
      var endLength = Cesium.Cartesian3.distance(endVec, Cesium.Cartesian3.ZERO);

      Cesium.Cartesian3.normalize(startVec, startVec);
      Cesium.Cartesian3.normalize(endVec, endVec);

      if (Cesium.Cartesian3.distance(startVec, endVec) == 0) {
        return result;
      }

      var omega = Cesium.Cartesian3.angleBetween(startVec, endVec);

      result.push(startPoint);
      for (var i = 1; i < numOfSingleLine - 1; i++) {
        var t = (i * 1.0) / (numOfSingleLine - 1);
        var invT = 1 - t;

        var startScalar = Math.sin(invT * omega) / Math.sin(omega);
        var endScalar = Math.sin(t * omega) / Math.sin(omega);

        var startScalarVec = Cesium.Cartesian3.multiplyByScalar(startVec, startScalar, new Cesium.Cartesian3());
        var endScalarVec = Cesium.Cartesian3.multiplyByScalar(endVec, endScalar, new Cesium.Cartesian3());

        var centerVec = Cesium.Cartesian3.add(startScalarVec, endScalarVec, new Cesium.Cartesian3());

        var ht = t * Math.PI;
        var centerLength = startLength * invT + endLength * t + Math.sin(ht) * angularity;
        centerVec = Cesium.Cartesian3.multiplyByScalar(centerVec, centerLength, centerVec);

        result.push(centerVec);
      }

      result.push(endPoint);

      return result;
    }
  }

  /**
   * 计算两点的角度
   * @param option - 参数
   * @returns 角度
   */
  getPositionsAngle(option?: PositionsAngleOptions): number | undefined {
    if (option) {
      var position1 = option.position1,
        position2 = option.position2,
        localToWorld_Matrix = Cesium.Transforms.eastNorthUpToFixedFrame(position1),
        worldToLocal_Matrix = Cesium.Matrix4.inverse(localToWorld_Matrix, new Cesium.Matrix4()),
        localPosition_A = Cesium.Matrix4.multiplyByPoint(worldToLocal_Matrix, position1, new Cesium.Cartesian3()),
        localPosition_B = Cesium.Matrix4.multiplyByPoint(worldToLocal_Matrix, position2, new Cesium.Cartesian3()),
        angle: number | undefined;
      if ("pitch" === option.type) {
        //俯仰角
        angle = Math.atan2(localPosition_B.z - localPosition_A.z, localPosition_B.x - localPosition_A.x);
      } else if ("heading" === option.type) {
        //偏航角
        angle = Math.atan2(localPosition_B.y - localPosition_A.y, localPosition_B.x - localPosition_A.x);
      }
      var theta = (angle as number) * (180 / Math.PI); //角度
      if (theta < 0) {
        theta = theta + 360;
      }
      return theta;
    }
  }

  /**
   * 计算一组坐标组成的面的面积
   * @param positions - 需要计算的84数组
   */
  getPositionsArea(positions: WGS84Type[]): number | string {
    let result: number | string = 0;
    if (positions) {
      let h = 0;
      let ellipsoid = Cesium.Ellipsoid.WGS84;
      positions.push(positions[0]);
      for (let i = 1; i < positions.length; i++) {
        let oel = ellipsoid.cartographicToCartesian(this.transformWGS84ToCartographic(positions[i - 1]));
        let el = ellipsoid.cartographicToCartesian(this.transformWGS84ToCartographic(positions[i]));
        h += oel.x * el.y - el.x * oel.y;
      }
      result = Math.abs(h).toFixed(2);
    }
    return result;
  }

  /**
   * 计算多边形的面积
   * @param positions - 多边形数组
   */
  getPolygonArea(positions?: WGS84Type[]): number | undefined {
    if (this._viewer) {
      let radiansPerDegree = Math.PI / 180.0;
      let degreesPerRadian = 180.0 / Math.PI;
      // 方向
      const Bearing = function (from: WGS84Type, to: WGS84Type) {
        var lat1 = (from.lat || 0) * radiansPerDegree,
          lon1 = (from.lng || from.lon || 0) * radiansPerDegree,
          lat2 = (to.lat || 0) * radiansPerDegree,
          lon2 = (to.lng || to.lon || 0) * radiansPerDegree;

        let angle = -Math.atan2(
          Math.sin(lon1 - lon2) * Math.cos(lat2),
          Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2)
        );
        if (angle < 0) {
          angle += Math.PI * 2.0;
        }
        angle = angle * degreesPerRadian;
        return angle;
      };
      // 角度
      const pointAngle = function (point1: WGS84Type, point2: WGS84Type, point3: WGS84Type) {
        let bearing21 = Bearing(point2, point1);
        let bearing23 = Bearing(point2, point3);
        let angle = bearing21 - bearing23;
        if (angle < 0) {
          angle += 360;
        }
        return angle;
      };
      //拆分三角曲面
      let res = 0;
      for (let i = 0; i < positions!.length - 2; i++) {
        let j = (i + 1) % positions!.length;
        let k = (i + 2) % positions!.length;
        let totalAngle = pointAngle(positions![i], positions![j], positions![k]);
        let tempLength1 = this.getPointDistance(
          this.transformWGS84ToCartesian(positions![i]) as any,
          this.transformWGS84ToCartesian(positions![j]) as any
        );
        let tempLength2 = this.getPointDistance(
          this.transformWGS84ToCartesian(positions![j]) as any,
          this.transformWGS84ToCartesian(positions![k]) as any
        );
        res += (tempLength1 as number) * (tempLength2 as number) * Math.abs(Math.sin(totalAngle));
      }
      return (res as number).toFixed(2) as unknown as number;
    }
  }

  /**
   * 获取两点距离
   * @param point1 - 坐标1
   * @param point2 - 坐标2
   */
  getPointDistance(point1: any, point2: any): number | undefined {
    if (this._viewer) {
      var point1cartographic = Cesium.Cartographic.fromCartesian(point1),
        point2cartographic = Cesium.Cartographic.fromCartesian(point2);
      /**根据经纬度计算出距离**/
      var geodesic = new Cesium.EllipsoidGeodesic();
      geodesic.setEndPoints(point1cartographic, point2cartographic);
      var s = geodesic.surfaceDistance;

      //返回两点之间的距离
      s = Math.sqrt(Math.pow(s, 2) + Math.pow(point2cartographic.height - point1cartographic.height, 2));

      return s;
    }
  }

  /**
   * 获取84坐标的距离
   * @param positions - 84坐标数组
   */
  getPositionDistance(positions: WGS84Type[]): string {
    let distance = 0;
    for (let i = 0; i < positions.length - 1; i++) {
      let point1cartographic = this.transformWGS84ToCartographic(positions[i]);
      let point2cartographic = this.transformWGS84ToCartographic(positions[i + 1]);
      let geodesic = new Cesium.EllipsoidGeodesic();
      geodesic.setEndPoints(point1cartographic, point2cartographic);
      let s = geodesic.surfaceDistance;
      s = Math.sqrt(Math.pow(s, 2) + Math.pow(point2cartographic.height - point1cartographic.height, 2));
      distance = distance + s;
    }
    return distance.toFixed(3);
  }

  /**
   * 获取相交对象
   * @param startPos - 起始点坐标
   * @param endPos - 终点坐标
   * @param excludeArr - 排除对象数组
   * @param bDrillPick - 只pick首个物体
   */
  getIntersectObj(startPos: any, endPos: any, excludeArr: unknown[] = [], bDrillPick: boolean = false): any[] | object[] | undefined {
    if (this._viewer) {
      var direction = Cesium.Cartesian3.normalize(
        Cesium.Cartesian3.subtract(endPos, startPos, new Cesium.Cartesian3()),
        new Cesium.Cartesian3()
      );
      var ray = new Cesium.Ray(startPos, direction); //无限延长的射线

      var results: any[] | object[] = [];
      var scene = this._viewer.scene as any & Record<string, any>;

      if (bDrillPick) {
        results = scene.drillPickFromRay(ray, 10, excludeArr);
      } //只pick首个物体
      else {
        var result = scene.pickFromRay(ray, excludeArr);
        if (Cesium.defined(result)) {
          results = [result];
        }
      }
      return results;
    }
  }

  /**
   * 椭圆计算
   * @param theta - 角度θ
   * @param rotation - 旋转角度
   * @param northVec - 东北角
   * @param eastVec - 西南角
   * @param aSqr - 短半轴平方根
   * @param ab - 长半轴与短半轴乘积
   * @param bSqr - 长半轴平方根
   * @param mag - 中心坐标最大长度
   * @param unitPos - 中心坐标归一化
   * @param result - 椭圆坐标
   */
  getPointOnEllipsoid(theta: number, rotation: number, northVec: any, eastVec: any, aSqr: number, ab: number, bSqr: number, mag: number, unitPos: any, result: any): any {
    if (this._viewer) {
      var rotAxis = new Cesium.Cartesian3();
      var tempVec = new Cesium.Cartesian3();
      var unitQuat = new Cesium.Quaternion();
      var rotMtx = new Cesium.Matrix3();

      var azimuth = theta + rotation;

      Cesium.Cartesian3.multiplyByScalar(eastVec, Math.cos(azimuth), rotAxis);
      Cesium.Cartesian3.multiplyByScalar(northVec, Math.sin(azimuth), tempVec);
      Cesium.Cartesian3.add(rotAxis, tempVec, rotAxis);

      var cosThetaSquared = Math.cos(theta);
      cosThetaSquared = cosThetaSquared * cosThetaSquared;

      var sinThetaSquared = Math.sin(theta);
      sinThetaSquared = sinThetaSquared * sinThetaSquared;

      var radius = ab / Math.sqrt(bSqr * cosThetaSquared + aSqr * sinThetaSquared);
      var angle = radius / mag;

      // Create the quaternion to rotate the position vector to the boundary of the ellipse.
      Cesium.Quaternion.fromAxisAngle(rotAxis, angle, unitQuat);
      Cesium.Matrix3.fromQuaternion(unitQuat, rotMtx);

      Cesium.Matrix3.multiplyByVector(rotMtx, unitPos, result);
      Cesium.Cartesian3.normalize(result, result);
      Cesium.Cartesian3.multiplyByScalar(result, mag, result);
      return result;
    }
  }

  /**
   * 计算坐标数组插值高度
   * @param positions - 插值数组[x,y,z,x,y,z,...]
   * @param options - 参数
   * @param extrude - 是否拉伸
   * @returns Returns the positions raised to the given heights
   */
  raisePositionsToHeight(positions: number[], options?: RaisePositionsToHeightOptions, extrude?: boolean): Float64Array | undefined {
    if (this._viewer) {
      var scratchCartesian1 = new Cesium.Cartesian3();
      var scratchCartesian2 = new Cesium.Cartesian3();
      var scratchCartesian3 = new Cesium.Cartesian3();
      var scratchNormal = new Cesium.Cartesian3();

      var ellipsoid = options!.ellipsoid;
      var height = options!.height;
      var extrudedHeight = options!.extrudedHeight;
      var size = extrude ? (positions.length / 3) * 2 : positions.length / 3;

      var finalPositions = new Float64Array(size * 3);

      var length = positions.length;
      var bottomOffset = extrude ? length : 0;
      for (var i = 0; i < length; i += 3) {
        var i1 = i + 1;
        var i2 = i + 2;

        var position = Cesium.Cartesian3.fromArray(positions, i, scratchCartesian1);
        ellipsoid.scaleToGeodeticSurface(position, position);

        var extrudedPosition = Cesium.Cartesian3.clone(position, scratchCartesian2);
        var normal = ellipsoid.geodeticSurfaceNormal(position, scratchNormal);
        var scaledNormal = Cesium.Cartesian3.multiplyByScalar(normal, height, scratchCartesian3);
        Cesium.Cartesian3.add(position, scaledNormal, position);

        if (extrude) {
          Cesium.Cartesian3.multiplyByScalar(normal, extrudedHeight!, scaledNormal);
          Cesium.Cartesian3.add(extrudedPosition, scaledNormal, extrudedPosition);

          finalPositions[i + bottomOffset] = extrudedPosition.x;
          finalPositions[i1 + bottomOffset] = extrudedPosition.y;
          finalPositions[i2 + bottomOffset] = extrudedPosition.z;
        }

        finalPositions[i] = position.x;
        finalPositions[i1] = position.y;
        finalPositions[i2] = position.z;
      }

      return finalPositions;
    }
  }

  /**
   * 计算范围当前椭圆位置的数组
   * @param options - 参数
   */
  computeEllipseEdgePositions(options?: EllipseEdgeOptions): EllipseEdgeResult | undefined {
    if (this._viewer) {
      var unitPosScratch = new Cesium.Cartesian3();
      var eastVecScratch = new Cesium.Cartesian3();
      var northVecScratch = new Cesium.Cartesian3();
      var scratchCartesian1 = new Cesium.Cartesian3();

      var semiMinorAxis = options!.semiMinorAxis;
      var semiMajorAxis = options!.semiMajorAxis;
      var rotation = options!.rotation; //法线
      var center = options!.center;
      var granularity =
        options!.granularity && typeof options!.granularity === "number" ? options!.granularity : Math.PI / 180.0; // 角度间隔
      if (granularity > Math.PI / 12.0) {
        granularity = Math.PI / 12.0;
      }
      if (granularity < Math.PI / 180.0) {
        granularity = Math.PI / 180.0;
      }
      var aSqr = semiMinorAxis * semiMinorAxis;
      var bSqr = semiMajorAxis * semiMajorAxis;
      var ab = semiMajorAxis * semiMinorAxis;
      var mag = Cesium.Cartesian3.magnitude(center);
      var unitPos = Cesium.Cartesian3.normalize(center, unitPosScratch);
      var eastVec = Cesium.Cartesian3.cross(Cesium.Cartesian3.UNIT_Z, center, eastVecScratch);
      eastVec = Cesium.Cartesian3.normalize(eastVec, eastVec);
      var northVec = Cesium.Cartesian3.cross(unitPos, eastVec, northVecScratch);
      var numPts = Math.ceil((Cesium.Math.PI * 2) / granularity);
      var deltaTheta = granularity;
      var theta = 0;

      var position = scratchCartesian1;
      var i: number;
      var outerIndex = 0;
      var outerPositions: number[] = [];
      for (i = 0; i < numPts; i++) {
        theta = i * deltaTheta;
        position = this.getPointOnEllipsoid(theta, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, position) as any;

        outerPositions[outerIndex++] = position.x;
        outerPositions[outerIndex++] = position.y;
        outerPositions[outerIndex++] = position.z;
      }

      var r: EllipseEdgeResult = { numPts: numPts, outerPositions: outerPositions };
      return r;
    }
  }

  /**
   * 计算某角度下椭圆位置坐标
   * @param options - 参数
   */
  computeSectorEdgePositions(options?: EllipseEdgeOptions): EllipseEdgeResult | undefined {
    if (this._viewer) {
      var unitPosScratch = new Cesium.Cartesian3();
      var eastVecScratch = new Cesium.Cartesian3();
      var northVecScratch = new Cesium.Cartesian3();
      var scratchCartesian1 = new Cesium.Cartesian3();

      var semiMinorAxis = options!.semiMinorAxis;
      var semiMajorAxis = options!.semiMajorAxis;
      var rotation = options!.rotation;
      var angle = options!.angle ? options!.angle : Math.PI * 2.0;
      var center = options!.center;
      var granularity =
        options!.granularity && typeof options!.granularity === "number" ? options!.granularity : Math.PI / 180.0;
      if (granularity > Math.PI / 12.0) {
        granularity = Math.PI / 12.0;
      }
      if (granularity < Math.PI / 180.0) {
        granularity = Math.PI / 180.0;
      }
      var aSqr = semiMinorAxis * semiMinorAxis;
      var bSqr = semiMajorAxis * semiMajorAxis;
      var ab = semiMajorAxis * semiMinorAxis;
      var mag = Cesium.Cartesian3.magnitude(center);
      var unitPos = Cesium.Cartesian3.normalize(center, unitPosScratch);
      var eastVec = Cesium.Cartesian3.cross(Cesium.Cartesian3.UNIT_Z, center, eastVecScratch);
      eastVec = Cesium.Cartesian3.normalize(eastVec, eastVec);
      var northVec = Cesium.Cartesian3.cross(unitPos, eastVec, northVecScratch);
      var numPts = Math.ceil(angle / granularity);
      var deltaTheta = granularity;
      var theta = 0;

      var position = scratchCartesian1;
      var i: number;
      var outerIndex = 0;
      var outerPositions: number[] = [];
      for (i = 0; i < numPts; i++) {
        theta = i * deltaTheta;
        position = this.getPointOnEllipsoid(theta, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, position) as any;

        outerPositions[outerIndex++] = position.x;
        outerPositions[outerIndex++] = position.y;
        outerPositions[outerIndex++] = position.z;
      }

      var r: EllipseEdgeResult = { numPts: numPts, outerPositions: outerPositions };
      return r;
    }
  }

  /**
   * 获取3DTiles高度（传入角度制 lon lat 数组）
   * @param lonlats - 坐标数组
   * @param callback - 回调
   */
  computeLonlatPointsTerrainData(lonlats: lonlatType, callback: Function): void {
    if (this._viewer) {
      var pointArrInput: any[] = [];
      for (var i = 0; i < lonlats.length; i++) {
        pointArrInput.push(Cesium.Cartographic.fromDegrees(lonlats[i].lon, lonlats[i].lat));
      }
      var promise = this._viewer.scene.clampToHeightMostDetailed(pointArrInput as unknown as any[]);
      promise.then(function (updatedPositions: any[]) {
        callback(updatedPositions);
      });
    }
  }

  /**
   * 传入Cartographic类型数组（弧度制经纬度），计算位于地形中的高度
   * @param Cartographics - 地理坐标数组
   * @param callback - 回调
   */
  computeCartographicPointsTerrainData(Cartographics: any[], callback?: (result: any[]) => void): void {
    if (this._viewer) {
      if (Cartographics.length <= 0) {
        return;
      }
      var pointArrInput: any[] = [];
      for (var i = 0; i < Cartographics.length; i++) {
        pointArrInput.push(
          Cesium.Cartesian3.fromRadians(Cartographics[i].longitude, Cartographics[i].latitude, Cartographics[i].height)
        );
      }
      var promise = this._viewer.scene.clampToHeightMostDetailed(pointArrInput),
        $this = this;
      promise
        .then(function (updatedPositions: any[]) {
          var result: any[] = [];
          var ellipsoid = $this._viewer.scene.globe.ellipsoid;
          for (var j = 0; j < updatedPositions.length; j++) {
            result.push(ellipsoid.cartesianToCartographic(updatedPositions[j]));
          }
          callback && callback(result);
        })
        .catch(function (error: unknown) {
          console.log(error);
        });
    }
  }

  _checkLonDegree(value?: number): boolean {
    if (value! > 180 || value! < -180) {
      return false;
    }
    return true;
  }

  _checkLatDegree(value?: number): boolean {
    if (value! > 90 || value! < -90) {
      return false;
    }
    return true;
  }

  /** 线段插值（经纬度坐标插值，角度制） */
  computeInterpolateLineLonlat(start?: LonLatType, end?: LonLatType): number[][] | null {
    if (!start || !end) {
      return null;
    }
    if (start.lon || !start.lat || !end.lon || !end.lat) {
      return null;
    }
    if (
      !this._checkLonDegree(start.lon) ||
      !this._checkLonDegree(end.lon) ||
      !this._checkLatDegree(start.lat) ||
      !this._checkLatDegree(end.lat)
    ) {
      return null;
    }
    var result: number[][] = [];
    result.push([start.lon, start.lat]);
    var interval = Math.sqrt(Math.pow(end.lon - start.lon, 2) + Math.pow(end.lat - start.lat, 2));
    if (interval <= 0.00001) {
      result.push([end.lon, end.lat]);
      return result;
    } else {
      var num = interval / 0.00001;
      var stepLon = (end.lon - start.lon) / num;
      var stepLat = (end.lat - start.lat) / num;
      for (var i = 0; i < num; i++) {
        var lon = start.lon + (i + 1) * stepLon;
        var lat = start.lat + (i + 1) * stepLat;
        result.push([lon, lat]);
      }
    }
    return result;
  }

  /** 线段插值（Cartographic 弧度制） */
  computeInterpolateLineCartographic(start?: CartographicLike, end?: CartographicLike, _Delta?: number): any[] | null {
    if (!start || !end) {
      return null;
    }
    if (!start.longitude || !start.latitude || !end.longitude || !end.latitude) {
      return null;
    }
    var result: any[] = [];
    result.push(new Cesium.Cartographic(start.longitude, start.latitude));
    var interval = Math.sqrt(Math.pow(end.longitude - start.longitude, 2) + Math.pow(end.latitude - start.latitude, 2));
    var delta = _Delta && typeof _Delta === "number" ? _Delta : (0.00001 * Math.PI) / 180.0;
    if (interval <= delta) {
      result.push(new Cesium.Cartographic(end.longitude, end.latitude));
      return result;
    } else {
      var num = interval / delta;
      var stepLon = (end.longitude - start.longitude) / num;
      var stepLat = (end.latitude - start.latitude) / num;
      for (var i = 0; i < num; i++) {
        var lon = start.longitude + (i + 1) * stepLon;
        var lat = start.latitude + (i + 1) * stepLat;
        result.push(new Cesium.Cartographic(lon, lat));
      }
      result.push(new Cesium.Cartographic(end.longitude, end.latitude, end.height));
    }
    return result;
  }

  /** 线段插值（经纬度高程插值） */
  computeInterpolateLineHeightCartographic(start?: CartographicLike, end?: CartographicLike): any[] | null {
    if (!start || !end) {
      return null;
    }
    if (!start.longitude || !start.latitude || !end.longitude || !end.latitude) {
      return null;
    }
    var result: any[] = [];
    result.push(new Cesium.Cartographic(start.longitude, start.latitude, start.height));
    var interval = Math.sqrt(Math.pow(end.longitude - start.longitude, 2) + Math.pow(end.latitude - start.latitude, 2));
    if (interval <= (0.00001 * Math.PI) / 180.0) {
      result.push(new Cesium.Cartographic(end.longitude, end.latitude, end.height));
      return result;
    } else {
      var num = ((interval / 0.00001) * Math.PI) / 180.0;
      var stepLon = (end.longitude - start.longitude) / num;
      var stepLat = (end.latitude - start.latitude) / num;
      var stepHeight = ((end.height || 0) - (start.height || 0)) / num;
      for (var i = 0; i < num; i++) {
        var lon = start.longitude + (i + 1) * stepLon;
        var lat = start.latitude + (i + 1) * stepLat;
        var hieght = (start.height || 0) + (i + 1) * stepHeight;
        result.push(new Cesium.Cartographic(lon, lat, hieght));
      }
      result.push(new Cesium.Cartographic(end.longitude, end.latitude, end.height));
    }
    return result;
  }

  /** 线段插值/经纬度高程插值 */
  computeInterpolate2IndexLineHeightCartographic(start?: CartographicLike, end?: CartographicLike, num?: number, curIndex?: number): any[] | null {
    if (!start || !end) {
      return null;
    }
    if (!start.longitude || !start.latitude || !end.longitude || !end.latitude) {
      return null;
    }
    var result: any[] = [];
    result.push(new Cesium.Cartographic(start.longitude, start.latitude, start.height));
    var stepLon = (end.longitude - start.longitude) / num!;
    var stepLat = (end.latitude - start.latitude) / num!;
    var stepHeight = ((end.height || 0) - (start.height || 0)) / num!;
    for (var i = 0; i < curIndex!; i++) {
      var lon = start.longitude + (i + 1) * stepLon;
      var lat = start.latitude + (i + 1) * stepLat;
      var hieght = (start.height || 0) + (i + 1) * stepHeight;
      result.push(new Cesium.Cartographic(lon, lat, hieght));
    }
    return result;
  }

  /** 经纬度高程插值，指定插值位置 index */
  computeInterpolateIndexLineHeightCartographic(start?: CartographicLike, end?: CartographicLike, num?: number, index?: number): any | null {
    if (!start || !end) {
      return null;
    }
    if (!start.longitude || !start.latitude || !end.longitude || !end.latitude) {
      return null;
    }
    var stepLon = (end.longitude - start.longitude) / num!;
    var stepLat = (end.latitude - start.latitude) / num!;
    var stepHeight = ((end.height || 0) - (start.height || 0)) / num!;
    var lon = start.longitude + index! * stepLon;
    var lat = start.latitude + index! * stepLat;
    var hieght = (start.height || 0) + index! * stepHeight;
    var result = new Cesium.Cartographic(lon, lat, hieght);
    return result;
  }
}

/** Math3d 实例类型（兼容旧导出） */
  return Math3d
}

export const Math3d = createScopedConstructor(createMath3dModule)
export type Math3dInstance = InstanceType<typeof Math3d>

/** Math3d 构造函数类型（兼容旧导出） */
export type Math3dConstructor = typeof Math3d
