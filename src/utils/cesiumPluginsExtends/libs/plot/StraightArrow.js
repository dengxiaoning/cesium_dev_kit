import { BasePlot } from "./BasePlot";
let Cesium = null;
/**
 * 标会（直线箭头）模块
 * @class
 * @param {object} viewer - cesium 实例
 * @param {object}  cesiumGlobal - cesium 全局对象
 * @exports StraightArrow
 */
var StraightArrow = function (viewer, cesiumGlobal) {
  BasePlot.call(this, viewer, cesiumGlobal);
  Cesium = cesiumGlobal;
  this.type = "StraightArrow";
  this.fillMaterial = Cesium.Color.fromCssColorString("#0000FF").withAlpha(0.8);
};
StraightArrow.prototype = {
  /**
   * 销毁绘制操作
   * @function
   */
  disable: function () {
    this.positions = [];
    if (this.firstPoint) {
      this.viewer.entities.remove(this.firstPoint);
      this.firstPoint = null;
    }
    if (this.floatPoint) {
      this.viewer.entities.remove(this.floatPoint);
      this.floatPoint = null;
    }
    if (this.arrowEntity) {
      this.viewer.entities.remove(this.arrowEntity);
      this.arrowEntity = null;
    }
    this.state = -1;
    if (this.handler) {
      this.handler.destroy();
      this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    }
    if (this.selectPoint) {
      this.viewer.entities.remove(this.selectPoint);
      this.selectPoint = null;
    }
    if (this.modifyHandler) {
      this.modifyHandler.destroy();
      this.modifyHandler = null;
    }
    this.clickStep = 0;
  },
  /**
   * 开始绘制直线箭头
   * @function
  * @param {object|function} options - 兼容老版本(可以是回调函数callback(),也可以为参数对象{fillMaterial:object(),callback:function()})
  * @param {function} options.callback - 回调函数
  * @param {Material} options.fillMaterial - 填充材质
   * @example
   * import { StraightArrow } from 'cesium_dev_kit'
  * const straightArrow = new StraightArrow(viewer, Cesium)
  * straightArrow.startDraw({fillMaterial: Cesium.Color.DARKKHAKI.withAlpha(0.8),callback:(res)=>{console.log(res)})
   */
  startDraw: function (options) {
    let cb=null;
    if (typeof (options) === "object") {
      this.fillMaterial = options.fillMaterial;
      cb = options.callback;
    } else {
      cb = options;
    }
    // 创建唯一id
    this.objId = Number(new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)); //用于区分多个相同箭头时
    var $this = this;
    this.state = 1;
    if (!this.handler) {
      this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    }
    this.handler.setInputAction(function (evt) {
      //单机开始绘制
      var cartesian = getCatesian3FromPX(evt.position, $this.viewer);
      if (!cartesian) return;

      if ($this.positions.length == 0) {
        $this.firstPoint = $this.creatPoint(cartesian);
        $this.firstPoint.type = "firstPoint";
        $this.floatPoint = $this.creatPoint(cartesian);
        $this.floatPoint.type = "floatPoint";
        $this.positions.push(cartesian);
        $this.firstPoint.position.setValue(cartesian);
        $this.firstPoint.show = true;
      }
      
  
    
      if ($this.positions && $this.positions.length == 3) {
        $this.firstPoint.show = false;
        $this.floatPoint.show = false;
        // 结束绘制
        $this.handler.destroy();
        $this.handler = null;
        $this.tooltip.setVisible(false);
        // $this.positions = [];
        // $this.pointArr = [];
        $this.arrowEntity = null;
      }
        // 增加最后一个光标点
        $this.positions.push(cartesian.clone());
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.handler.setInputAction(function (evt) {
      //移动时绘制面
      if ($this.positions.length < 1) return;
      var cartesian  = getCatesian3FromPX(evt.endPosition, $this.viewer);
      if (!cartesian) return;
      $this.tooltip.showAtCartesian(cartesian,'左键单击结束!')
      // 修改浮动光标位置
      $this.floatPoint.position.setValue(cartesian);
      if ($this.positions.length >= 2) {
        if (!Cesium.defined($this.arrowEntity)) {
           // 删除最后一个点，确保最后一个点是最后的位置
          // $this.positions.pop();
          $this.positions.push(cartesian);
          $this.arrowEntity = $this.showArrowOnMap($this.positions);
          cb && cb($this.objId);
        } else {
          $this.positions.pop();
          $this.positions.push(cartesian);
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  },
    /**
   * 直线箭头 - 编辑
   * @function
   * @example
   * import { StraightArrow } from 'cesium_dev_kit'
   * const straightArrow = new StraightArrow(viewer, Cesium)
   * straightArrow.startModify()
   */
  startModify: function () {
    //修改箭头
    this.state = 2;
    this.firstPoint.show = true;
    this.floatPoint.show = true;
    var $this = this;
    this.clickStep = 0;
    if (!this.modifyHandler) this.modifyHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.modifyHandler.setInputAction(function (evt) {
      //单机开始绘制
      var pick = $this.viewer.scene.pick(evt.position);
      if (Cesium.defined(pick) && pick.id) {
        $this.clickStep++;
        if (!pick.id.objId) $this.selectPoint = pick.id;
      } else {
        //激活移动点之后 单机面之外 移除这个事件
        $this.modifyHandler.destroy();
        $this.modifyHandler = null;
        $this.firstPoint.show = false;
        $this.floatPoint.show = false;
        $this.state = -1;
        $this.tooltip.setVisible(false);
      }

      //选中点后 第二次点击 则重新定位该点
      if ($this.clickStep == 2) {
        $this.clickStep = 0;
        var cartesian = getCatesian3FromPX(evt.position, $this.viewer);
        if (!cartesian) return;
        if ($this.selectPoint&&$this.selectPoint.position) {
          $this.selectPoint.position.setValue(cartesian);
          $this.selectPoint = null;
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.modifyHandler.setInputAction(function (evt) {
      var cartesian = getCatesian3FromPX(evt.endPosition, $this.viewer);
      if (!cartesian) return;
      $this.tooltip.showAtCartesian(cartesian,'左键选取圆点开始修改，单击停止修改，点击图形之外结束!')
      if ($this.selectPoint&&$this.selectPoint.position) {
        $this.selectPoint.position.setValue(cartesian);
        if ($this.selectPoint.type == "firstPoint") {
          $this.positions[1] = cartesian;
        }
        if ($this.selectPoint.type == "floatPoint") {
          $this.positions[2] = cartesian;
        }
      } else {
        return;
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  },
  /**
   * 通过数据 绘制直线箭头
   * @function
   * @param {Array} data  - 绘制箭头的数据
   * @example
   * import { StraightArrow } from 'cesium_dev_kit'
   * const straightArrow = new StraightArrow(viewer, Cesium)
   * straightArrow.createByData([
   * [110.16018735617934, 31.036076859828338],
   * [ 104.10758419863926,30.64592470850288],
   * [ 104.09351691196979, 30.652434826507452],
   * [104.09816110606057,30.659821965447698]])
   */
  createByData: function (data) {
    //通过传入的经纬度数组 构建箭头
    this.state = -1;
    this.positions = [];
    var arr = [];
    for (var i = 0; i < data.length; i++) {
      var cart3 = Cesium.Cartesian3.fromDegrees(data[i][0], data[i][1]);
      arr.push(cart3);
    }
    this.positions = arr;
    this.firstPoint = this.creatPoint(this.positions[1]);
    this.firstPoint.type = "firstPoint";
    this.floatPoint = this.creatPoint(this.positions[2]);
    this.floatPoint.type = "floatPoint";
    this.arrowEntity = this.showArrowOnMap(this.positions);
    this.firstPoint.show = false;
    this.floatPoint.show = false;
    this.arrowEntity.objId = this.objId;
  },
   /**
   *获取直线箭头中的关键点 经纬度 
   * @function
   * @example
   * import { StraightArrow } from 'cesium_dev_kit'
   * const straightArrow = new StraightArrow(viewer, Cesium)
   *  const res = straightArrow.getLnglats()
   * @returns {Array}
   */
  getLnglats: function () {
    var arr = [];
    for (var i = 0; i < this.positions.length; i++) {
      var item = this.cartesianToLatlng(this.positions[i]);
      arr.push(item);
    }
    return arr;
  },
  /**
   * 获取直线箭头中的关键点 世界坐标
   * @function
   * @example
   * import { StraightArrow } from 'cesium_dev_kit'
   * const straightArrow = new StraightArrow(viewer, Cesium)
   *  const res = straightArrow.getPositions()
   * @returns {Array}
   */
  getPositions: function () {
    //获取直角箭头中的关键点
    return this.positions;
  },
  creatPoint: function (cartesian) {
    var point = this.viewer.entities.add({
      position: cartesian,
      point: {
        pixelSize: 10,
        color: Cesium.Color.RED,
      },
    });
    point.attr = "editPoint";
    return point;
  },
  showArrowOnMap: function (positions) {
    var $this = this;
    var update = function () {
      if (positions.length < 2) {
        return null;
      }
      var p1 = positions[1];
      var p2 = positions[2];
      var firstPoint = $this.cartesianToLatlng(p1);
      var endPoints = $this.cartesianToLatlng(p2);
      var arrow = [];
      var res = $this.xp.algorithm.fineArrow([firstPoint[0], firstPoint[1]], [endPoints[0], endPoints[1]], Cesium);
      var index = JSON.stringify(res).indexOf("null");
      if (index != -1) return [];
      for (var i = 0; i < res.length; i++) {
        var c3 = new Cesium.Cartesian3(res[i].x, res[i].y, res[i].z);
        arrow.push(c3);
      }
      return new Cesium.PolygonHierarchy(arrow);
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
StraightArrow.prototype = Object.create(Object.assign({}, StraightArrow.prototype, BasePlot.prototype));
StraightArrow.prototype.constructor = StraightArrow;

function getCatesian3FromPX(px, viewer) {
  var cartesian;
  var ray = viewer.camera.getPickRay(px);
  if (!ray) return null;
  cartesian = viewer.scene.globe.pick(ray, viewer.scene);
  return cartesian;
}

export { StraightArrow };
