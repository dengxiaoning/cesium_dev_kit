//直线箭头
var StraightArrow = function(viewer) {
	this.type = "StraightArrow";
	this.objId = Number((new Date()).getTime() + "" + Number(Math.random() * 1000).toFixed(0)); //用于区分多个相同箭头时
	this.viewer = viewer;
	this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
	this.pointImageUrl = "img/point.png";
	this.fillMaterial = Cesium.Color.fromCssColorString('#0000FF').withAlpha(0.8);
	this.positions = [];
	this.firstPoint = null;
	this.floatPoint = null;
	this.arrowEntity = null;
	this.state = -1; //state用于区分当前的状态 0 为删除 1为添加 2为编辑 
	this.selectPoint = null;
	this.clickStep = 0;
	this.modifyHandler = null;
}
StraightArrow.prototype = {
	disable: function() {
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
	disableHandler: function() {
		if (this.handler) {
			this.handler.destroy();
			this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
		}
		if (this.modifyHandler) {
			this.modifyHandler.destroy();
			this.modifyHandler = null;
		}
	},
	startDraw: function() {
		var $this = this;
		this.state = 1;
		this.handler.setInputAction(function(evt) { //单机开始绘制
			var cartesian;
			cartesian = getCatesian3FromPX(evt.position, $this.viewer);
			if (!cartesian) return;

			if ($this.positions.length == 0) {
				$this.firstPoint = $this.creatPoint(cartesian);
				$this.firstPoint.type = "firstPoint";
				$this.floatPoint = $this.creatPoint(cartesian);
				$this.floatPoint.type = "floatPoint";
				$this.positions.push(cartesian);
			}
			$this.firstPoint.position.setValue(cartesian);
			$this.firstPoint.show = true;
			if ($this.positions && $this.positions.length == 3) {
				$this.firstPoint.show = false;
				$this.positions = [];
				$this.pointArr = [];
				$this.arrowEntity = null;
			}
			// 增加最后一个光标点
			$this.positions.push(cartesian.clone());
		}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
		this.handler.setInputAction(function(evt) { //移动时绘制面
			if ($this.positions.length < 1) return;
			var cartesian;
			cartesian = getCatesian3FromPX(evt.endPosition, $this.viewer);
			if (!cartesian) return;
			// 修改浮动光标位置
			$this.floatPoint.position.setValue(cartesian);
			if ($this.positions.length >= 2) {
				if (!Cesium.defined($this.arrowEntity)) {
					$this.positions.push(cartesian);
					$this.arrowEntity = $this.showArrowOnMap($this.positions);
				} else {
					$this.positions.pop();
					$this.positions.push(cartesian);
				}
			}
		}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
		this.handler.setInputAction(function(evt) {
			var cartesian;
			cartesian = getCatesian3FromPX(evt.position, $this.viewer);
			if (!cartesian) return;
			$this.firstPoint.show = false;
			$this.positions = [];
			$this.pointArr = [];
			$this.arrowEntity = null;
			$this.positions.push(cartesian.clone());
		}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
	},
	startModify: function() { //修改箭头
		this.state = 2;
		this.firstPoint.show = true;
		this.floatPoint.show = true;
		var $this = this;
		this.clickStep = 0;
		if (!this.modifyHandler) this.modifyHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene
			.canvas);
		this.modifyHandler.setInputAction(function(evt) { //单机开始绘制
			var pick = $this.viewer.scene.pick(evt.position);
			if (Cesium.defined(pick) && pick.id) {
				$this.clickStep++;
				if (!pick.id.objId)
					$this.selectPoint = pick.id;
			} else { //激活移动点之后 单机面之外 移除这个事件
				$this.modifyHandler.destroy();
				$this.modifyHandler = null;
				$this.firstPoint.show = false;
				$this.floatPoint.show = false;
				$this.state = -1;
			}

			//选中点后 第二次点击 则重新定位该点
			if ($this.clickStep == 2) {
				$this.clickStep = 0;
				var cartesian;
				cartesian = getCatesian3FromPX(evt.position, $this.viewer);
				if (!cartesian) return;
				if ($this.selectPoint) {
					$this.selectPoint.position.setValue(cartesian);
					$this.selectPoint = null;
				}
			};
		}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
		this.modifyHandler.setInputAction(function(evt) {
			if ($this.selectPoint) {
				var cartesian;
				cartesian = getCatesian3FromPX(evt.endPosition, $this.viewer);
				if (!cartesian) return;
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
	createByData: function(data) { //通过传入的经纬度数组 构建箭头
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
	clear: function() { //清除绘制箭头
		this.state = 0;
		if (this.firstPoint) this.viewer.entities.remove(this.firstPoint);
		if (this.floatPoint) this.viewer.entities.remove(this.floatPoint);
		if (this.arrowEntity) this.viewer.entities.remove(this.arrowEntity);
		this.state = -1;
	},
	getLnglats: function() {
		var arr = [];
		for (var i = 0; i < this.positions.length; i++) {
			var item = this.cartesianToLatlng(this.positions[i]);
			arr.push(item);
		}
		return arr;
	},
	getPositions: function() { //获取直角箭头中的关键点
		return this.positions;
	},
	creatPoint: function(cartesian) {
		var point = this.viewer.entities.add({
			position: cartesian,
			point: {
				pixelSize: 10,
				color: Cesium.Color.YELLOW,
			}
		});
		point.attr = "editPoint";
		return point;
	},
	showArrowOnMap: function(positions) {
		var $this = this;
		var update = function() {
			if (positions.length < 2) {
				return null;
			}
			var p1 = positions[1];
			var p2 = positions[2];
			var firstPoint = $this.cartesianToLatlng(p1);
			var endPoints = $this.cartesianToLatlng(p2);
			var arrow = [];
			var res = xp.algorithm.fineArrow([firstPoint[0], firstPoint[1]], [endPoints[0], endPoints[1]]);
			var index = JSON.stringify(res).indexOf("null");
			if (index != -1) return [];
			for (var i = 0; i < res.length; i++) {
				var c3 = new Cesium.Cartesian3(res[i].x, res[i].y, res[i].z);
				arrow.push(c3);
			}
			return new Cesium.PolygonHierarchy(arrow);
		}
		return this.viewer.entities.add({
			polygon: new Cesium.PolygonGraphics({
				hierarchy: new Cesium.CallbackProperty(update, false),
				show: true,
				fill: true,
				material: $this.fillMaterial
			})
		});
	},
	cartesianToLatlng: function(cartesian) {
		var latlng = this.viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian);
		var lat = Cesium.Math.toDegrees(latlng.latitude);
		var lng = Cesium.Math.toDegrees(latlng.longitude);
		return [lng, lat];
	}
}

function getCatesian3FromPX(px, viewer) {
	var cartesian;
	var ray = viewer.camera.getPickRay(px);
	if (!ray) return null;
	cartesian = viewer.scene.globe.pick(ray, viewer.scene);
	return cartesian;
}
