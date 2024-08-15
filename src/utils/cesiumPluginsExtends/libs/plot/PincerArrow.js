import { BasePlot } from "./BasePlot";
let Cesium = null;
/**
 * 标会（钳击箭头）模块
 * @class
 * @param {object} viewer - cesium 实例
 * @param {object}  cesiumGlobal - cesium 全局对象
 * @exports PincerArrow
 */
var PincerArrow = function (viewer, cesiumGlobal) {
  BasePlot.call(this, viewer, cesiumGlobal);
  Cesium = cesiumGlobal;
  this.type = "PincerArrow";

  this.fillMaterial = Cesium.Color.YELLOW.withAlpha(0.8);
};

PincerArrow.prototype = {
  /**
   * 销毁绘制操作
   * @function
   */
  disable: function () {
    this.positions = [];
    if (this.arrowEntity) {
      this.viewer.entities.remove(this.arrowEntity);
      this.arrowEntity = null;
    }
    this.state = -1;
    if (this.handler) {
      this.handler.destroy();
      this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    }
    if (this.floatPoint) {
      this.viewer.entities.remove(this.floatPoint);
      this.floatPoint = null;
    }
    if (this.selectPoint) {
      this.viewer.entities.remove(this.selectPoint);
      this.selectPoint = null;
    }
    for (var i = 0; i < this.pointArr.length; i++) {
      if (this.pointArr[i]) this.viewer.entities.remove(this.pointArr[i]);
    }
    if (this.modifyHandler) {
      this.modifyHandler.destroy();
      this.modifyHandler = null;
    }
    this.clickStep = 0;
  },
   /**
   * 开始绘制钳击箭头
   * @function
  * @param {object|function} options - 兼容老版本(可以是回调函数callback(),也可以为参数对象{fillMaterial:object(),callback:function()})
  * @param {function} options.callback - 回调函数
  * @param {Material} options.fillMaterial - 填充材质
  * @example
  * import { PincerArrow } from 'cesium_dev_kit'
  * const pincerArrowObj = new PincerArrow(viewer, Cesium)
  * pincerArrowObj.startDraw({fillMaterial: Cesium.Color.DARKKHAKI.withAlpha(0.8),callback:(res)=>{console.log(res)})
  */
  startDraw: function (options) {
    let cb=null;
    if (typeof (options) === "object") {
      this.fillMaterial = options.fillMaterial;
      cb = options.callback;
    } else {
      cb = options;
    }

    // 创建id
    this.objId = Number(new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0));
    var $this = this;
    this.state = 1;
    if (!this.handler) {
      this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    }
    this.handler.setInputAction(function (evt) {
      //单机开始绘制
      var cartesian= getCatesian3FromPX(evt.position, $this.viewer);
      if (!cartesian) return;

      if ($this.positions.length == 0) {
        $this.floatPoint = $this.creatPoint(cartesian);
      }
      if ($this.positions.length > 4) {
        //结束绘制
        var point = $this.creatPoint(cartesian);
        point.wz = $this.positions.length;
        $this.pointArr.push(point);
        for (var i = 0; i < $this.pointArr.length; i++) {
          $this.pointArr[i].show = false;
        }

        if ($this.floatPoint) {
          //移除动态点
          $this.floatPoint.show = false;
          $this.viewer.entities.remove($this.floatPoint);
          $this.floatPoint = null;
        }
        // $this.positions = [];
        // $this.pointArr = [];
        // $this.arrowEntity = null;
      } else {
        $this.positions.push(cartesian);
        var point = $this.creatPoint(cartesian);
        if ($this.positions.length > 2) {
          point.wz = $this.positions.length - 1; //点对应的在positions中的位置  屏蔽mouseMove里往postions添加时 未创建点
        } else {
          point.wz = $this.positions.length; //点对应的在positions中的位置
        }
        $this.pointArr.push(point);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    this.handler.setInputAction(function (evt) {
      //移动时绘制面
      if (!$this.floatPoint || $this.positions.length < 2) return;
      // var ray = viewer.camera.getPickRay(evt.endPosition);
      // if (!ray) return;
      // var cartesian = viewer.scene.globe.pick(ray, $this.viewer.scene);
      var cartesian= getCatesian3FromPX(evt.endPosition, $this.viewer);
      if (!cartesian) return;
      $this.floatPoint.position.setValue(cartesian);
      $this.tooltip.showAtCartesian(cartesian,'右键单击结束!')
      if ($this.positions.length >= 2) {
        if (!Cesium.defined($this.arrowEntity)) {
          $this.positions.push(cartesian);
          $this.arrowEntity = $this.showArrowOnMap($this.positions);
          $this.arrowEntity.objId = $this.objId;
          cb && cb($this.objId); // 将实体id 返回
        } else {
          $this.positions.pop();
          $this.positions.push(cartesian);
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    this.handler.setInputAction(function (evt) {
      //右击结束绘制
      if ($this.positions.length >= 4) {
        var cartesian = getCatesian3FromPX(evt.position, $this.viewer);
        if (!cartesian) return;
        for (var i = 0; i < $this.pointArr.length; i++) {
          $this.pointArr[i].show = false;
        }
       if( $this.floatPoint) {$this.floatPoint.show = false;}
        $this.viewer.entities.remove($this.floatPoint);
        $this.floatPoint = null;
        var point = $this.creatPoint(cartesian);
        point.show = false;
        point.wz = $this.positions.length;
        $this.pointArr.push(point);
        $this.handler.destroy();
        $this.handler = null;
        $this.tooltip.setVisible(false);
        // $this.positions = [];
        // $this.pointArr = [];
        $this.arrowEntity = null;
      }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  },
    /**
   * 通过数据 绘制钳击箭头
   * @function
   * @param {Array} data  - 绘制箭头的数据
   * @example
   * import { PincerArrow } from 'cesium_dev_kit'
   * const pincerArrowObj = new PincerArrow(viewer, Cesium)
   * pincerArrowObj.createByData([
   * [110.16018735617934, 31.036076859828338],
   * [ 104.10758419863926,30.64592470850288],
   * [ 104.09351691196979, 30.652434826507452],
   * [104.09816110606057,30.659821965447698]])
   */
  createByData: function (data) {
    //根据传入的数据构建箭头
    this.positions = []; //控制点
    this.state = -1; //state用于区分当前的状态 0 为删除 1为添加 2为编辑
    this.floatPoint = null;
    this.pointArr = []; //中间各点
    this.selectPoint = null;
    this.clickStep = 0; //用于控制点的移动结束
    this.modifyHandler = null;
    var arr = [];
    for (var i = 0; i < data.length; i++) {
      var cart3 = Cesium.Cartesian3.fromDegrees(data[i][0], data[i][1]);
      arr.push(cart3);
    }
    this.positions = arr;
    //构建控制点
    for (var i = 0; i < this.positions.length; i++) {
      var point = this.creatPoint(this.positions[i]);
      point.show = false;
      point.wz = i + 1;
      this.pointArr.push(point);
    }
    this.arrowEntity = this.showArrowOnMap(this.positions);
    this.arrowEntity.objId = this.objId;
  },
  /**
   * 钳击箭头 - 编辑
   * @function
   * @example
   * import { PincerArrow } from 'cesium_dev_kit'
   * const pincerArrowObj = new PincerArrow(viewer, Cesium)
   * pincerArrowObj.startModify()
   */
  startModify: function () {
    //修改箭头
    this.state = 2;
    var $this = this;
    for (let j = 0; j < $this.pointArr.length; j++) {
      $this.pointArr[j].show = true;
    }
    if (!this.modifyHandler) this.modifyHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.modifyHandler.setInputAction(function (evt) {
      //单机开始绘制
      var pick = $this.viewer.scene.pick(evt.position);
      if (Cesium.defined(pick) && pick.id) {
        $this.clickStep++;
        if (!pick.id.objId) $this.selectPoint = pick.id;
      } else {
        for (let i = 0; i < $this.pointArr.length; i++) {
          $this.pointArr[i].show = false;
        }
        $this.state = -1;
        $this.modifyHandler.destroy(); //激活移动点之后 单机面之外 移除这个事件
        $this.modifyHandler = null;
        $this.tooltip.setVisible(false);
      }
      if ($this.clickStep == 2) {
        $this.clickStep = 0;
        // var ray = $this.viewer.camera.getPickRay(evt.position);
        // if (!ray) return;
        // var cartesian = $this.viewer.scene.globe.pick(ray, $this.viewer.scene);
        var cartesian = getCatesian3FromPX(evt.position, $this.viewer);
        if (!cartesian) return;
        if ($this.selectPoint) {
          $this.selectPoint.position.setValue(cartesian);
          $this.selectPoint = null;
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.modifyHandler.setInputAction(function (evt) {
      //单机开始绘制
      // var ray = $this.viewer.camera.getPickRay(evt.endPosition);
      // if (!ray) return;
      // var cartesian = $this.viewer.scene.globe.pick(ray, $this.viewer.scene);
      var cartesian = getCatesian3FromPX(evt.endPosition, $this.viewer);
      if (!cartesian) return;
      $this.tooltip.showAtCartesian(cartesian,'左键选取圆点开始修改，单击停止修改，点击图形之外结束!')
      if ($this.selectPoint) {
        $this.selectPoint.position.setValue(cartesian);
        $this.positions[$this.selectPoint.wz - 1] = cartesian; //上方的wz用于此处辨识修改positions数组里的哪个元素
      } else {
        return;
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  },
 /**
   *获取钳击箭头中的关键点 经纬度 
   * @function
   * @example
   * import { PincerArrow } from 'cesium_dev_kit'
   * const pincerArrowObj = new PincerArrow(viewer, Cesium)
   *  const res = pincerArrowObj.getLnglats()
   * @returns {Array}
   */
  getLnglats: function () {
    //获取直角箭头中的关键点 经纬度
    var arr = [];
    for (var i = 0; i < this.positions.length; i++) {
      var item = this.cartesianToLatlng(this.positions[i]);
      arr.push(item);
    }
    return arr;
  },
   /**
   * 获取钳击箭头中的关键点 世界坐标
   * @function
   * @example
   * import { PincerArrow } from 'cesium_dev_kit'
   * const pincerArrowObj = new PincerArrow(viewer, Cesium)
   *  const res = pincerArrowObj.getPositions()
   * @returns {Array}
   */
  getPositions: function () {
    //获取直角箭头中的关键点 世界坐标
    return this.positions;
  },
  creatPoint: function (cartesian) {
    return this.viewer.entities.add({
      position: cartesian,
      point: {
        pixelSize: 10,
        color: Cesium.Color.RED,
      },
      show:true
    });
  },
  showArrowOnMap: function (positions) {
    var $this = this;
    var update = function () {
      //计算面
      if (positions.length < 3) {
        return null;
      }
      var lnglatArr = [];
      for (var i = 0; i < positions.length; i++) {
        var lnglat = $this.cartesianToLatlng(positions[i]);
        lnglatArr.push(lnglat);
      }
      var res = $this.xp.algorithm.doubleArrow(lnglatArr, Cesium);
      var returnData = [];
      var index = JSON.stringify(res.polygonalPoint).indexOf("null");
      if (index == -1) returnData = res.polygonalPoint;
      return new Cesium.PolygonHierarchy(returnData);
    };
    return this.viewer.entities.add({
      id: $this.objId,
      polygon: new Cesium.PolygonGraphics({
        hierarchy: new Cesium.CallbackProperty(update, false),
        show: true,
        fill: true,
        material: $this.fillMaterial,
      }),
    });
  },
  cartesianToLatlng: function (cartesian) {
    var latlng = this.viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian);
    var lat = Cesium.Math.toDegrees(latlng.latitude);
    var lng = Cesium.Math.toDegrees(latlng.longitude);
    return [lng, lat];
  },
};

PincerArrow.prototype = Object.create(Object.assign({}, PincerArrow.prototype, BasePlot.prototype));
PincerArrow.prototype.constructor = PincerArrow;

function getCatesian3FromPX(px, viewer) {
  var cartesian;
  var ray = viewer.camera.getPickRay(px);
  if (!ray) return null;
  cartesian = viewer.scene.globe.pick(ray, viewer.scene);
  return cartesian;
}

export { PincerArrow };
