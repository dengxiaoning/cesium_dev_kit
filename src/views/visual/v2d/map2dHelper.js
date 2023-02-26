import 'ol/ol.css';
import olMap from 'ol/Map';
import olView from 'ol/View';
import * as olExtent from 'ol/extent';
import * as olControl from 'ol/control';
import * as olCoordinate from 'ol/coordinate';
import WMTSTileGrid from 'ol/tilegrid/WMTS';
import {
  DragRotateAndZoom,
  defaults as defaultInteractions,
} from 'ol/interaction';
import {
  get as projGet,
} from 'ol/proj';

import {
  WMTS,
  Vector as VectorSource,
} from 'ol/source';
import {
  Tile as TileLayer,
  Vector as VectorLayer,
} from 'ol/layer';

class Map2dHelper {
  constructor() {
    this.initBaseVar();
  }
  // 初始基础数据
  initBaseVar() {
    var resolutions = [2445.9849047851562, 1222.9924523925781, 611.4962261962891, 305.74811309814453, 152.87405654907226, 76.43702827453613, 38.218514137268066];
    var projection = projGet("EPSG:4326");
    this.projectionExtent = projection.getExtent();
    var size = olExtent.getWidth(this.projectionExtent) / 256;
    var resolutions = [];
    for (var z = 2; z < 19; ++z) {
      resolutions[z] = size / Math.pow(2, z);
    }
    this.resolutions = resolutions;
    this.laymap = new Map();
    this.nowLayer = null;
    this.layerId = [];
    this.geometryObj = null;
    this.drawObj = null;
    this.drawing = false;
    this.wktStr = null;
  }

  //实例化鼠标位置控件
  mousePositionControl() {
    return new olControl.MousePosition({
      coordinateFormat: olCoordinate.createStringXY(8), //坐标格式
      projection: 'EPSG:4326', //地图投影坐标系
      className: 'custom-mouse-position', //坐标信息显示样式
      // 显示鼠标位置信息的目标容器
      target: document.getElementById('mouse-position'),
      undefinedHTML: '&nbsp' //未定义坐标的标记
    })
  }
  /**
   * 地图初始化
   * @param {String} targeId 容器id
   * @param {Function} singleclickCB 单击回调
   */
  initMap(targeId, viewConfig) {
    const viewCon = {
      center: [119.571419, 33.55001],
      zoom: 6,
      minZoom: 4,
      maxZoom: 20,
      projection: "EPSG:4326",
      ...viewConfig
    }
    //map start//
    var view = new olView(viewCon);

    var map = new olMap({
      controls: olControl.defaults().extend([
        new olControl.FullScreen(), this.mousePositionControl()
      ]),
      interactions: defaultInteractions().extend([new DragRotateAndZoom()]),
      layers: this.initLayers(),
      view: view,
      target: targeId,
      logo: false
    });

    this.map = map;

  }
  // initiation layer array
  initLayers() {
    var vectorSource = new VectorSource({});
    var vectorLayerBase = new VectorLayer({
      source: vectorSource
    });
    this.vecLayerObj = this.vecLayer();
    this.cvaLayerObj = this.cvaLayer();

    var layerArr = [this.vecLayerObj, this.cvaLayerObj];
    return layerArr;
  }
  // 天地图矢量
  vecLayer() {
    return new TileLayer({
      source: new WMTS({
        name: "中国矢量",
        url: "http://t0.tianditu.com/vec_c/wmts?tk=7eb11c0c503429878691ac917238f87f",
        layer: "vec",
        style: "default",
        matrixSet: "c",
        format: "tiles",
        wrapX: true,
        crossOrigin: 'anonymous', // 跨域
        tileGrid: new WMTSTileGrid({
          origin: olExtent.getTopLeft(this.projectionExtent),
          resolutions: this.resolutions,
          matrixIds: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
        })

      }),
      //设置不可见
      visible: true,
    });
  }
  // 矢量标记
  cvaLayer() {
    return new TileLayer({
      source: new WMTS({
        name: "中国矢量注记1-4级",
        url: "http://t0.tianditu.com/cva_c/wmts?tk=7eb11c0c503429878691ac917238f87f",
        layer: "cva",
        style: "default",
        matrixSet: "c",
        format: "tiles",
        wrapX: true,
        crossOrigin: 'anonymous', // 跨域
        tileGrid: new WMTSTileGrid({
          origin: olExtent.getTopLeft(this.projectionExtent),
          resolutions: this.resolutions,
          matrixIds: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
        })

      }),
      //设置不可见
      visible: true
    });
  }
}

export default Map2dHelper;