let Cesium = {};

/**
 * 数学3d计算模块
 * @class
 * @param {object} params
 * @param {object} params.viewer - cesium 实例
 * @param {object} params.cesiumGlobal - cesium 全局对象
 * @exports Math3d
 */
function Math3d(viewer, cesiumGlobal) {
  if (viewer) {
    this._viewer = viewer;
    Cesium = cesiumGlobal;
  }
}

Math3d.prototype = {
  /**
   * 拆分组合坐标数组
   * @function
   * @param {Array} cartesianArr
   * @example
   * import { Math3d } from 'cesium_dev_kit'
   * const math3d = new Math3d(viewer,Cesium);
   * const res = math3d.splitCartesians3(
   * [[104.09816110606057, 30.659821965447698],
   *  [104.1120972824757,30.65330300319938],
   * [104.10758419863926, 30.64592470850288],
   * [104.09351691196979, 30.652434826507452]])
   * @returns {Array } 返回Cartesian3 类型的数组
   */
  splitCartesians3: function (cartesianArr) {
    var positions = [];
    for (var i = 0; i < cartesianArr.length; i += 3) {
      var cartesian = new Cesium.Cartesian3(cartesianArr[i], cartesianArr[i + 1], cartesianArr[i + 2]);
      positions.push(cartesian);
    }
    positions.push(positions[0]);

    return positions;
  },

  /**
   * 计算两点的点集
   * @param {	Cartesian3} startPoint - 开始节点
   * @param {	Cartesian3} endPoint - 结束节点
   * @param {number} angularityFactor - 曲率
   * @param {number} numOfSingleLine - 点集数量
   * @example
   * import { Math3d } from 'cesium_dev_kit'
   * const math3d = new Math3d(viewer,Cesium);
   * var startPoint = Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988)
     var endPoint = Cesium.Cartesian3.fromDegrees((Math.random() / 100) + 104.081701757991, (Math.random() / 100) + 30.627042558105988);

     var positions = math3d.getLinkedPointList(startPoint, endPoint, 100000, 50);
   * @returns {Array}
   */
  getLinkedPointList: function (startPoint, endPoint, angularityFactor, numOfSingleLine) {
    if (this._viewer) {
      var result = [];
      var startPosition = Cesium.Cartographic.fromCartesian(startPoint);
      var endPosition = Cesium.Cartographic.fromCartesian(endPoint);

      var startLon = (startPosition.longitude * 180) / Math.PI;
      var startLat = (startPosition.latitude * 180) / Math.PI;
      var endLon = (endPosition.longitude * 180) / Math.PI;
      var endLat = (endPosition.latitude * 180) / Math.PI;

      var dist = Math.sqrt((startLon - endLon) * (startLon - endLon) + (startLat - endLat) * (startLat - endLat));
      //var dist = Cesium.Cartesian3.distance(startPoint, endPoint);
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
  },
  /**
   * 计算两点的角度
   * @param {object} option
   */
  getPositionsAngle: function (option) {
    if (option) {
      var position1 = option.position1,
        position2 = option.position2,
        localToWorld_Matrix = Cesium.Transforms.eastNorthUpToFixedFrame(position1), //以a点为原点建立局部坐标系（东方向为x轴,北方向为y轴,垂直于地面为z轴），得到一个局部坐标到世界坐标转换的变换矩阵
        worldToLocal_Matrix = Cesium.Matrix4.inverse(localToWorld_Matrix, new Cesium.Matrix4()), //求世界坐标到局部坐标的变换矩阵
        localPosition_A = Cesium.Matrix4.multiplyByPoint(worldToLocal_Matrix, position1, new Cesium.Cartesian3()), //a点在局部坐标的位置，其实就是局部坐标原点
        localPosition_B = Cesium.Matrix4.multiplyByPoint(worldToLocal_Matrix, position2, new Cesium.Cartesian3()), //B点在以A点为原点的局部的坐标位置
        angle; //弧度
      if ("pitch" === option.type) {
        //俯仰角

        angle = Math.atan2(localPosition_B.z - localPosition_A.z, localPosition_B.x - localPosition_A.x);
      } else if ("heading " === option.type) {
        //偏航角

        angle = Math.atan2(localPosition_B.y - localPosition_A.y, localPosition_B.x - localPosition_A.x);
      }
      var theta = angle * (180 / Math.PI); //角度
      if (theta < 0) {
        theta = theta + 360;
      }
      return theta;
    }
  },
  /**
   * 计算一组坐标组成的面的面积
   * @param {Array} positions - 需要计算的84数组（数据格式见： {@link WGS84Type}）
   * @example
   * import { Math3d } from 'cesium_dev_kit'
   * const math3d = new Math3d(viewer,Cesium);
   *const orgArr = [
      { lng: 110.16018735617934, lat: 31.036076859828338, alt: 0 },
      { lng: 110.17845812703679, lat: 31.033686527335444, alt: 0 },
      { lng: 110.19261040403379, lat: 31.02892781958261, alt: 0 },
      { lng: 110.20775152895165, lat: 31.02475678594998, alt: 0 },
    ];
   * const areaNum =  math3d.getPositionsArea(orgArr)
   * @returns {number} 面积数据
   * @see {@link module:Base#transformWGS84ToCartographic|transformWGS84ToCartographic}
   */
  getPositionsArea: function (positions) {
    let result = 0;
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
  },
  /**
   * 计算多边形的面积
   * @function
   * @param {Array} points - 多边形数组（数据格式见： {@link WGS84Type}）
   * @example
   * import { Math3d } from 'cesium_dev_kit'
   * const math3d = new Math3d(viewer,Cesium);
   *const orgArr = [
      { lon: 110.16018735617934, lat: 31.036076859828338, alt: 0 },
      { lon: 110.17845812703679, lat: 31.033686527335444, alt: 0 },
      { lon: 110.19261040403379, lat: 31.02892781958261, alt: 0 },
      { lon: 110.20775152895165, lat: 31.02475678594998, alt: 0 },
    ];
   * const areaNum =  math3d.getPolygonArea(orgArr)
   * @returns {number} 面积数据
   * @see {@link module:Base#transformWGS84ToCartesian|transformWGS84ToCartesian}
   * @see {@link module:Math3d#getPointDistance|getPointDistance}
   */
  getPolygonArea: function (positions) {
    if (this._viewer) {
      let radiansPerDegree = Math.PI / 180.0; //角度转化为弧度(rad)
      let degreesPerRadian = 180.0 / Math.PI; //弧度转化为角度
      // 方向
      const Bearing = function (from, to) {
        var lat1 = from.lat * radiansPerDegree,
          lon1 = from.lon * radiansPerDegree,
          lat2 = to.lat * radiansPerDegree,
          lon2 = to.lon * radiansPerDegree;

        let angle = -Math.atan2(
          Math.sin(lon1 - lon2) * Math.cos(lat2),
          Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2)
        );
        if (angle < 0) {
          angle += Math.PI * 2.0;
        }
        angle = angle * degreesPerRadian; //角度
        return angle;
      };
      // 角度
      const pointAngle = function (point1, point2, point3) {
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
      for (let i = 0; i < positions.length - 2; i++) {
        let j = (i + 1) % positions.length;
        let k = (i + 2) % positions.length;
        let totalAngle = pointAngle(positions[i], positions[j], positions[k]);
        let tempLength1 = this.getPointDistance(
          this.transformWGS84ToCartesian(positions[i]),
          this.transformWGS84ToCartesian(positions[j])
        );
        let tempLength2 = this.getPointDistance(
          this.transformWGS84ToCartesian(positions[j]),
          this.transformWGS84ToCartesian(positions[k])
        );
        res += tempLength1 * tempLength2 * Math.abs(Math.sin(totalAngle));
      }
      return res.toFixed(2);
    }
  },
  /**
   * 获取两点距离
   * @function
   * @param {Cartesian3} point1 - 坐标1
   * @param {Cartesian3} point2 - 坐标2
   * @example
   * import { Math3d } from 'cesium_dev_kit'
   * const math3d = new Math3d(viewer,Cesium);
   * const dis =  math3d.getPointDistance(Cesium.Cartesian3.fromDegrees(110.16018735617934, 31.036076859828338),Cesium.Cartesian3.fromDegrees(110.20775152895165,31.02475678594998))
   * @returns {number} 距离
   */
  getPointDistance: function (point1, point2) {
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
  },
  /**
   * 获取84坐标的距离
   * @param {Array} positions - 84坐标数组（数据格式见： {@link WGS84Type}）
   * @example
   * import { Math3d } from 'cesium_dev_kit'
   * const math3d = new Math3d(viewer,Cesium);
   * const res = math3d.getPositionDistance([{lng: 104.09816110606057, lat:30.659821965447698, lat:0 },{lng:104.1120972824757, lat:30.65330300319938, lat:0 },{lng:104.09816110606057,lat: 30.659821965447698, lat:0 }])
   *
   */
  getPositionDistance: function (positions) {
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
  },
  /*
   * 获取相交对象
   * @param {*} startPos
   * @param {*} endPos
   * @param {*} excludeArr
   * @param {*} bDrillPick
   */
  getIntersectObj: function (startPos, endPos, excludeArr = [], bDrillPick = false) {
    if (this._viewer) {
      var direction = Cesium.Cartesian3.normalize(
        Cesium.Cartesian3.subtract(endPos, startPos, new Cesium.Cartesian3()),
        new Cesium.Cartesian3()
      );
      var ray = new Cesium.Ray(startPos, direction); //无限延长的射线

      var results = [];

      if (bDrillPick) {
        results = this._viewer.scene.drillPickFromRay(ray, 10, excludeArr);
      } //只pick首个物体
      else {
        var result = this._viewer.scene.pickFromRay(ray, excludeArr);
        if (Cesium.defined(result)) {
          results = [result];
        }
      }
      return results;
    }
  },
  /*
   * 椭圆计算
   * @param {*} theta
   * @param {*} rotation
   * @param {*} northVec
   * @param {*} eastVec
   * @param {*} aSqr
   * @param {*} ab
   * @param {*} bSqr
   * @param {*} mag
   * @param {*} unitPos
   * @param {*} result
   */
  getPointOnEllipsoid: function (theta, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, result) {
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
  },
  /**
   * 计算点的插值高度
   * Returns the positions raised to the given heights
   * @private
   */
  raisePositionsToHeight: function (positions, options, extrude) {
    if (this._viewer) {
      var scratchCartesian1 = new Cesium.Cartesian3();
      var scratchCartesian2 = new Cesium.Cartesian3();
      var scratchCartesian3 = new Cesium.Cartesian3();
      var scratchNormal = new Cesium.Cartesian3();

      var ellipsoid = options.ellipsoid;
      var height = options.height;
      var extrudedHeight = options.extrudedHeight;
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
          Cesium.Cartesian3.multiplyByScalar(normal, extrudedHeight, scaledNormal);
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
  },

  /**
   * options.semiMinorAxis：短半轴
   * options.semiMajorAxis：长半轴
   * options.rotation：旋转角度 弧度
   * options.center：中心点 笛卡尔坐标
   * options.granularity：粒度 弧度
   * Returns an array of positions that make up the ellipse.
   * @private
   */
  computeEllipseEdgePositions: function (options) {
    if (this._viewer) {
      var unitPosScratch = new Cesium.Cartesian3();
      var eastVecScratch = new Cesium.Cartesian3();
      var northVecScratch = new Cesium.Cartesian3();
      var scratchCartesian1 = new Cesium.Cartesian3();

      var semiMinorAxis = options.semiMinorAxis;
      var semiMajorAxis = options.semiMajorAxis;
      var rotation = options.rotation; //法线
      var center = options.center;
      var granularity =
        options.granularity && typeof options.granularity === "number" ? options.granularity : Math.PI / 180.0; // 角度间隔
      if (granularity > Math.PI / 12.0) {
        granularity = Math.PI / 12.0;
      } //最小分24
      if (granularity < Math.PI / 180.0) {
        granularity = Math.PI / 180.0;
      } //最大分360
      var aSqr = semiMinorAxis * semiMinorAxis;
      var bSqr = semiMajorAxis * semiMajorAxis;
      var ab = semiMajorAxis * semiMinorAxis;
      var mag = Cesium.Cartesian3.magnitude(center); //
      var unitPos = Cesium.Cartesian3.normalize(center, unitPosScratch);
      var eastVec = Cesium.Cartesian3.cross(Cesium.Cartesian3.UNIT_Z, center, eastVecScratch);
      eastVec = Cesium.Cartesian3.normalize(eastVec, eastVec);
      var northVec = Cesium.Cartesian3.cross(unitPos, eastVec, northVecScratch);
      var numPts = Math.ceil((Cesium.Math.PI * 2) / granularity);
      var deltaTheta = granularity;
      var theta = 0;

      var position = scratchCartesian1;
      var i;
      var outerIndex = 0;
      var outerPositions = [];
      for (i = 0; i < numPts; i++) {
        theta = i * deltaTheta;
        position = this.getPointOnEllipsoid(theta, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, position);

        outerPositions[outerIndex++] = position.x;
        outerPositions[outerIndex++] = position.y;
        outerPositions[outerIndex++] = position.z;
      }

      var r = {};
      r.numPts = numPts;
      r.outerPositions = outerPositions;
      return r;
    }
  },

  /**
   * options.semiMinorAxis：短半轴
   * options.semiMajorAxis：长半轴
   * options.rotation：旋转角度 弧度
   * options.center：中心点 笛卡尔坐标
   * options.granularity：粒度 弧度
   * options.angle：角度 弧度
   * Returns an array of positions that make up the ellipse.
   * @private
   */
  computeSectorEdgePositions: function (options) {
    if (this._viewer) {
      var unitPosScratch = new Cesium.Cartesian3();
      var eastVecScratch = new Cesium.Cartesian3();
      var northVecScratch = new Cesium.Cartesian3();
      var scratchCartesian1 = new Cesium.Cartesian3();

      var semiMinorAxis = options.semiMinorAxis;
      var semiMajorAxis = options.semiMajorAxis;
      var rotation = options.rotation;
      var angle = options.angle ? options.angle : Math.PI * 2.0;
      var center = options.center;
      var granularity =
        options.granularity && typeof options.granularity === "number" ? options.granularity : Math.PI / 180.0; // 角度间隔
      if (granularity > Math.PI / 12.0) {
        granularity = Math.PI / 12.0;
      } //最小分24
      if (granularity < Math.PI / 180.0) {
        granularity = Math.PI / 180.0;
      } //最大分360
      var aSqr = semiMinorAxis * semiMinorAxis;
      var bSqr = semiMajorAxis * semiMajorAxis;
      var ab = semiMajorAxis * semiMinorAxis;
      var mag = Cesium.Cartesian3.magnitude(center); //
      var unitPos = Cesium.Cartesian3.normalize(center, unitPosScratch);
      var eastVec = Cesium.Cartesian3.cross(Cesium.Cartesian3.UNIT_Z, center, eastVecScratch);
      eastVec = Cesium.Cartesian3.normalize(eastVec, eastVec);
      var northVec = Cesium.Cartesian3.cross(unitPos, eastVec, northVecScratch);
      var numPts = Math.ceil(angle / granularity); //Math.ceil(Cesium.Math.PI * 2 / granularity);
      var deltaTheta = granularity;
      var theta = 0;

      var position = scratchCartesian1;
      var i;
      var outerIndex = 0;
      var outerPositions = [];
      for (i = 0; i < numPts; i++) {
        theta = i * deltaTheta;
        position = this.getPointOnEllipsoid(theta, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, position);

        outerPositions[outerIndex++] = position.x;
        outerPositions[outerIndex++] = position.y;
        outerPositions[outerIndex++] = position.z;
      }

      var r = {};
      r.numPts = numPts;
      r.outerPositions = outerPositions;
      return r;
    }
  },
  /**
   * 获取3DTiles高度
   * 传入lonlat数组 角度制的lon lat
   * @param {*} lonlats
   * @param {*} callback
   */
  computeLonlatPointsTerrainData: function (lonlats, callback) {
    if (this._viewer) {
      var pointArrInput = [];
      for (var i = 0; i < lonlats.length; i++) {
        pointArrInput.push(Cesium.Cartographic.fromDegrees(lonlats[i].lon, lonlats[i].lat));
      }
      var promise = this._viewer.scene.clampToHeightMostDetailed(pointArrInput); //pointArrInput
      promise.then(function (updatedPositions) {
        callback(updatedPositions);
      });
    }
  },
  /**
   * 传入Cartographic类型数组 弧度制经纬度,计算位于地形中高度
   * @param {Array<CartographicType>} Cartographics - 地理坐标数组
   * @param {function} callback
   * @example
   * import { Math3d } from 'cesium_dev_kit'
   * const math3d = new Math3d(viewer,Cesium);
   * const coors = [new Cesium.Cartographic(110.16018735617934, 31.036076859828338,5000), new Cesium.Cartographic(110.17845812703679,31.033686527335444,5000)];
   * math3d.computeCartographicPointsTerrainData(coors,res=>{console.log(res)});
   */
  computeCartographicPointsTerrainData: function (Cartographics, callback) {
    if (this._viewer) {
      if (Cartographics.length <= 0) {
        return;
      }
      var pointArrInput = [];
      for (var i = 0; i < Cartographics.length; i++) {
        pointArrInput.push(
          Cesium.Cartesian3.fromRadians(Cartographics[i].longitude, Cartographics[i].latitude, Cartographics[i].height)
        );
      }
      var promise = this._viewer.scene.clampToHeightMostDetailed(pointArrInput),
        $this = this; //pointArrInput
      promise
        .then(function (updatedPositions) {
          var result = [];
          var ellipsoid = $this._viewer.scene.globe.ellipsoid;
          for (var j = 0; j < updatedPositions.length; j++) {
            result.push(ellipsoid.cartesianToCartographic(updatedPositions[j]));
          }
          callback(result);
        })
        .catch(function (error) {
          console.log(error);
        });
    }
  },
  _checkLonDegree: function (value) {
    if (value > 180 || value < -180) {
      return false;
    }
    return true;
  },
  _checkLatDegree: function (value) {
    if (value > 90 || value < -90) {
      return false;
    }
    return true;
  },
  /*
        线段插值
        经纬度坐标插值
        start.lon start.lat  单位:度
        return [[lon,lat],...]
        */
  computeInterpolateLineLonlat: function (start, end) {
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
    var result = [];
    result.push([start.lon, start.lat]);
    var interval = Math.sqrt(Math.pow(end.lon - start.lon, 2) + Math.pow(end.lat - start.lat, 2));
    if (interval <= 0.00001) {
      //小于最小间隔
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
  },
  /*
        线段插值
        经纬度坐标插值
        Cartographic start.longitude start.latitude 单位:弧度
        return [Cartographic,...]
        */
  computeInterpolateLineCartographic: function (start, end, _Delta) {
    if (!start || !end) {
      return null;
    }
    if (!start.longitude || !start.latitude || !end.longitude || !end.latitude) {
      return null;
    }
    var result = [];
    //开始点
    result.push(new Cesium.Cartographic(start.longitude, start.latitude));
    var interval = Math.sqrt(Math.pow(end.longitude - start.longitude, 2) + Math.pow(end.latitude - start.latitude, 2));
    var delta = _Delta && typeof _Delta === "number" ? _Delta : (0.00001 * Math.PI) / 180.0;
    if (interval <= delta) {
      //小于最小间隔
      result.push(new Cesium.Cartographic(end.longitude, end.latitude));
      return result;
    } else {
      var num = interval / delta;
      var stepLon = (end.longitude - start.longitude) / num;
      var stepLat = (end.latitude - start.latitude) / num;
      for (var i = 0; i < num; i++) {
        var lon = start.longitude + (i + 1) * stepLon;
        var lat = start.latitude + (i + 1) * stepLat;
        result.push(new Cesium.Cartographic(lon, lat)); //与最后一个点有偏差
      }
      result.push(new Cesium.Cartographic(end.longitude, end.latitude, end.height));
    }
    return result;
  },

  /*
        线段插值
        经纬度高程插值
        Cartographic start.longitude start.latitude 单位:弧度 start.height 高程单位m
        return [Cartographic,...]
        */
  computeInterpolateLineHeightCartographic: function (start, end) {
    if (!start || !end) {
      return null;
    }
    if (!start.longitude || !start.latitude || !end.longitude || !end.latitude) {
      return null;
    }
    var result = [];
    result.push(new Cesium.Cartographic(start.longitude, start.latitude, start.height));
    var interval = Math.sqrt(Math.pow(end.longitude - start.longitude, 2) + Math.pow(end.latitude - start.latitude, 2));
    if (interval <= (0.00001 * Math.PI) / 180.0) {
      //小于最小间隔
      result.push(new Cesium.Cartographic(end.longitude, end.latitude, end.height));
      return result;
    } else {
      var num = ((interval / 0.00001) * Math.PI) / 180.0;
      var stepLon = (end.longitude - start.longitude) / num;
      var stepLat = (end.latitude - start.latitude) / num;
      var stepHeight = (end.height - start.height) / num;
      for (var i = 0; i < num; i++) {
        var lon = start.longitude + (i + 1) * stepLon;
        var lat = start.latitude + (i + 1) * stepLat;
        var hieght = start.height + (i + 1) * stepHeight;
        result.push(new Cesium.Cartographic(lon, lat, hieght));
      }
      result.push(new Cesium.Cartographic(end.longitude, end.latitude, end.height));
    }
    return result;
  },
  /**
   * 线段插值/经纬度高程插值
   * @param {CartographicType} start - 开始坐标点
   * @param {CartographicType} end - 结束坐标点
   * @param {number} num - 分总段数  传入数组长度
   * @param {Array} curIndex - 第index个插值点数组
   * @example
   * import { Math3d } from 'cesium_dev_kit'
   * const math3d = new Math3d(viewer,Cesium);
   * const strCartCoor = new Cesium.Cartographic(110.16018735617934, 31.036076859828338,5000)
   * const endCartCoor = new Cesium.Cartographic(110.17845812703679,31.033686527335444,5000)
   * let curPoint = math3d.computeInterpolate2IndexLineHeightCartographic(strCartCoor, endCartCoor,20,[0,3,7,9]);
   * @returns {Array<CartographicType>}
   */
  computeInterpolate2IndexLineHeightCartographic: function (start, end, num, curIndex) {
    if (!start || !end) {
      return null;
    }
    if (!start.longitude || !start.latitude || !end.longitude || !end.latitude) {
      return null;
    }
    var result = [];
    result.push(new Cesium.Cartographic(start.longitude, start.latitude, start.height));
    var stepLon = (end.longitude - start.longitude) / num;
    var stepLat = (end.latitude - start.latitude) / num;
    var stepHeight = (end.height - start.height) / num;
    for (var i = 0; i < curIndex; i++) {
      var lon = start.longitude + (i + 1) * stepLon;
      var lat = start.latitude + (i + 1) * stepLat;
      var hieght = start.height + (i + 1) * stepHeight;
      result.push(new Cesium.Cartographic(lon, lat, hieght));
    }
    //result.push(new Cesium.Cartographic(end.longitude, end.latitude, end.height));
    return result;
  },
  /**
   * 经纬度高程插值,指定插值位置index
   * @param {CartographicType} start - 开始坐标点
   * @param {CartographicType} end - 结束坐标点
   * @param {number} num - 分总段数  传入数组长度
   * @param {number} index - 获取第index个插值点  0点是开始点
   * @example
   * import { Math3d } from 'cesium_dev_kit'
   * const math3d = new Math3d(viewer,Cesium);
   * const strCartCoor = new Cesium.Cartographic(110.16018735617934, 31.036076859828338,5000)
   * const endCartCoor = new Cesium.Cartographic(110.17845812703679,31.033686527335444,5000)
   * let curPoint = math3d.computeInterpolateIndexLineHeightCartographic(strCartCoor, endCartCoor,1,0 );
   * @returns {CartographicType}
   */
  computeInterpolateIndexLineHeightCartographic: function (start, end, num, index) {
    if (!start || !end) {
      return null;
    }
    if (!start.longitude || !start.latitude || !end.longitude || !end.latitude) {
      return null;
    }
    //var delta = _Delta && (typeof _Delta === 'number') ? _Delta :  0.00001 * Math.PI / 180.0;
    var stepLon = (end.longitude - start.longitude) / num;
    var stepLat = (end.latitude - start.latitude) / num;
    var stepHeight = (end.height - start.height) / num;
    var lon = start.longitude + index * stepLon;
    var lat = start.latitude + index * stepLat;
    var hieght = start.height + index * stepHeight;
    var result = new Cesium.Cartographic(lon, lat, hieght);
    return result;
  },
};
export { Math3d };
