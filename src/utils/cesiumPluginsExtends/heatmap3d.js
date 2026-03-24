// 热力地图
import _axios from "axios";
import { sm4Decrypt } from "./secureKit";
let heatmap = null,
  height = 1080,
  width = 1920,
  bounds = [103.8258, 30.58595, 104.252263, 30.87];
const heatmap3d = {
  async queryHeatmapData() {
    const service = _axios.create();
    service.interceptors.request.use(
      (config) => {
        // 设置请求头
        config.headers["Authorization"] = sessionStorage["map-interface-token"];
        config.headers["Token"] = sessionStorage["token"];
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    const list = await service({
      url: "/api-event01/dataway-hinglo/cim/rkpt/rkrlt",
      method: "GET",
    })
      .then((res) => {
        //对数据进行解密
        let resData = sm4Decrypt(res.data.data);
        return resData;
      })
      .catch(function(error) {
        console.log(error);
      });
    const data = [];
    for (const i of list) {
      let lon = i.lng;
      let lat = i.lat;
      let x = Math.round(((lon - bounds[0]) / (bounds[2] - bounds[0])) * width);
      let y = height - Math.round(((lat - bounds[1]) / (bounds[3] - bounds[1])) * height);

      data.push({ x: x, y: y, value: i.num / 30 });
    }
    //创建热力图
    this.createHeatmap(data);
    //创建primitive
    const primitive = this.createPrimitive();
    return primitive;
  },
  createHeatmap(data) {
    var domElement = document.createElement("div");
    domElement.setAttribute("style", "width: " + width + "px; height: " + height + "px; margin: 0px; display: none;");
    document.body.appendChild(domElement);
    heatmap = h337.create({
      container: domElement,
      radius: 24,
      maxOpacity: 1,
      minOpacity: 0.1,
      blur: 0.85,
      gradient: {
        ".2": "blue",
        ".4": "green",
        ".6": "yellow",
        ".8": "orange",
        ".9": "red",
      },
    });
    heatmap.setData({
      min: 0,
      max: 100,
      data: data,
    });
  },
  createPrimitive() {
    let material = new Cesium.ImageMaterialProperty({
      image: heatmap._renderer.canvas,
    });
    let instance = this.generateGeometryInstance();
    let appearance = new Cesium.MaterialAppearance({
      material: Cesium.Material.fromType(Cesium.Material.ImageType, material.getValue(new Cesium.JulianDate())),
    });
    let opt = {
      geometryInstances: instance,
      appearance: appearance,
      allowPicking: false,
      asynchronous: false,
      show: false,
    };

    let primitive = viewer.scene.primitives.add(new Cesium.Primitive(opt));
    return primitive;
  },
  generateGeometryInstance() {
    const dWidth = bounds[2] - bounds[0],
      dHeight = bounds[3] - bounds[1],
      left = bounds[0],
      bottom = bounds[1];
    const dx = 0.001,
      dy = 0.001,
      h = 0,
      dh = 5;
    let r = Math.floor(dWidth / dx),
      l = Math.floor(dHeight / dy);
    const grids = [];
    for (let i = 0; i < l + 1; i++) {
      let row = [];
      for (let u = 0; u < r + 1; u++) {
        let x = left + (u == r ? dWidth : u * dx),
          y = bottom + (i == l ? dHeight : i * dy);
        let screen = {
          x: Math.round(((x - left) / dWidth) * width),
          y: height - Math.round(((y - bottom) / dHeight) * height),
        };
        let v = heatmap.getValueAt(screen);
        let color = heatmap._renderer.ctx.getImageData(screen.x, screen.y, 1, 1).data;
        row.push([x, y, h + v * dh, color.map((c) => c / 255), [(x - left) / dWidth, (y - bottom) / dHeight]]);
      }
      grids.push(row);
    }

    const wgs84Positions = [];
    const indices = [];
    const colors = [];
    const sts = [];
    let vtxCursor = 0;
    let idxCursor = 0;
    for (let i = 0; i < l; i++) {
      for (let u = 0; u < r; u++) {
        let p1 = grids[i][u];
        let p2 = grids[i][u + 1];
        let p3 = grids[i + 1][u + 1];
        let p4 = grids[i + 1][u];

        this.addVertices(p1, wgs84Positions, colors, sts);
        this.addVertices(p2, wgs84Positions, colors, sts);
        this.addVertices(p3, wgs84Positions, colors, sts);
        this.addVertices(p1, wgs84Positions, colors, sts);
        this.addVertices(p3, wgs84Positions, colors, sts);
        this.addVertices(p4, wgs84Positions, colors, sts);
        indices.push(idxCursor + 0, idxCursor + 1, idxCursor + 2, idxCursor + 3, idxCursor + 4, idxCursor + 5);
        idxCursor += 6;
      }
    }
    return new Cesium.GeometryInstance({
      geometry: Cesium.GeometryPipeline.computeNormal(this.generateGeometry(wgs84Positions, colors, indices, sts)),
    });
  },
  addVertices(p, positions, colors, sts) {
    const c3Position = Cesium.Cartesian3.fromDegrees(p[0], p[1], p[2]);
    positions.push(c3Position.x, c3Position.y, c3Position.z);
    colors.push(p[3][0], p[3][1], p[3][2], p[3][3]);
    sts.push(p[4][0], p[4][1]);
  },
  generateGeometry(positions, colors, indices, sts) {
    var attributes = new Cesium.GeometryAttributes({
      position: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: new Float64Array(positions),
      }),
      color: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.FLOAT,
        componentsPerAttribute: 4,
        values: new Float32Array(colors),
      }),
      st: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        values: new Float32Array(sts),
      }),
    });
    // 包围球
    const boundingSphere = Cesium.BoundingSphere.fromVertices(positions, new Cesium.Cartesian3(0.0, 0.0, 0.0), 3);
    //
    const geometry = new Cesium.Geometry({
      attributes: attributes,
      indices: indices,
      primitiveType: Cesium.PrimitiveType.LINES,
      boundingSphere: boundingSphere,
    });
    return geometry;
  },
};
export { heatmap3d };
