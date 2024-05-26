let Cesium = {};
let dfSt = undefined;
/**
 * @typedef {Object} cameraPosType - 相机位置信息
 * @property {number} lon -  经度
 * @property {number} lat - 纬度
 * @property {number} height - 高度
 * @property {number} heading - 朝向
 * @property {number} pitch - 倾斜度
 * @property {number} roll - 翻滚角
 * @property {Array} position - 位置坐标
 * @property {number} cameraHeading - 相机朝向
 * @property {number} cameraPitch - 相机倾斜度
 * @property {number} cameraRoll - 相机翻滚角
 * @property {object} center - 中心坐标
 * @property {object} direction - 方向
 */
/**
 * @typedef {Object}  WGS84Type - 84坐标信息
 * @property {number} lng - 经度
 * @property {number} lat - 纬度
 * @property {number} alt - 高度
 */
/**
 * 基本构造方法base
 * @class
 * @param {object} params
 * @param {object} params.viewer - cesium 实例
 * @param {object} params.cesiumGlobal - cesium 全局对象
 * @param {Array} params.defaultStatic - 静态资源
 * @exports Base
 */
function Base(viewer, cesiumGlobal, defaultStatic) {
  if (viewer) {
    /** @access private */
    this._viewer = viewer;
    /** @access private */
    Cesium = cesiumGlobal;
    /** @access private */
    dfSt = defaultStatic;
    //Cesium.Ion.defaultAccessToken =
    //  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmYzkwZWEwYy1mMmIwLTQwYjctOWJlOC00OWU4ZWU1YTZhOTkiLCJpZCI6MTIxODIsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1NjA0OTUyNDN9.wagvw7GxUjxvHXO6m2jjX5Jh9lN0UyTJhNGEcSm2pgE'
    /** @private */
    this._drawLayer = new Cesium.CustomDataSource("drawLayer");
    viewer && viewer.dataSources.add(this._drawLayer);
    this.myname = "BASE";
    /** @private */
    this._installBaiduImageryProvider();
    /** @private */
    this._installGooGleImageryProvider();
    /** @private */
    this._installAmapImageryProvider();
    /** @private */
    this._installTencentImageryProvider();
    /** @private */
    this._installTdtImageryProvider();
    /** @private */
    this._installGroundSkyBox();
  }
}

Base.prototype = {
  /**
   * 创建一个Graphics实体
   * @function
   * @returns {Entity} Entity
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   *  const entity = baseObj.base.createGraphics()
   */
  createGraphics: function () {
    return new Cesium.Entity();
  },
  getDfSt(attrArr) {
    if (dfSt) {
      const res = attrArr.reduce((pre, curr) => {
        if (pre) {
          return pre[curr];
        } else {
          return dfSt[curr];
        }
      }, undefined);
      return dfSt.baseService + res;
    }
    return undefined;
  },

  /**
   * 天空盒
   *  @function
   * @returns {SkyBox} SkyBox
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * baseObj.base.setOneSkyBox()
   */
  setOneSkyBox: function () {
    return new Cesium.SkyBox({
      sources: {
        positiveX: this.getDfSt(["skyBox", "one", "positiveX"]) || "static/data/images/SkyBox/00h+00.jpg",
        negativeX: this.getDfSt(["skyBox", "one", "negativeX"]) || "static/data/images/SkyBox/12h+00.jpg",
        positiveY: this.getDfSt(["skyBox", "one", "positiveY"]) || "static/data/images/SkyBox/06h+00.jpg",
        negativeY: this.getDfSt(["skyBox", "one", "negativeY"]) || "static/data/images/SkyBox/18h+00.jpg",
        positiveZ: this.getDfSt(["skyBox", "one", "positiveZ"]) || "static/data/images/SkyBox/06h+90.jpg",
        negativeZ: this.getDfSt(["skyBox", "one", "negativeZ"]) || "static/data/images/SkyBox/06h-90.jpg",
      },
    });
  },

  /**
   * 天空盒2
   *  @function
   * @returns {SkyBox} SkyBox
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * baseObj.base.setTwoSkyBox()
   */
  setTwoSkyBox: function () {
    return new Cesium.SkyBox({
      sources: {
        positiveX: this.getDfSt(["skyBox", "two", "negativeZ"]) || "static/data/images/SkyBox/Version2_dark_px.jpg",
        negativeX: this.getDfSt(["skyBox", "two", "negativeX"]) || "static/data/images/SkyBox/Version2_dark_mx.jpg",
        positiveY: this.getDfSt(["skyBox", "two", "positiveY"]) || "static/data/images/SkyBox/Version2_dark_py.jpg",
        negativeY: this.getDfSt(["skyBox", "two", "negativeY"]) || "static/data/images/SkyBox/Version2_dark_my.jpg",
        positiveZ: this.getDfSt(["skyBox", "two", "positiveZ"]) || "static/data/images/SkyBox/Version2_dark_pz.jpg",
        negativeZ: this.getDfSt(["skyBox", "two", "negativeZ"]) || "static/data/images/SkyBox/Version2_dark_mz.jpg",
      },
    });
  },
  /**
   * 天空盒3
   *  @function
   * @returns {SkyBox} SkyBox
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * baseObj.base.setThreeSkyBox()
   */
  setThreeSkyBox: function () {
    return new Cesium.SkyBox({
      sources: {
        positiveX: this.getDfSt(["skyBox", "three", "negativeZ"]) || "static/data/images/SkyBox/tycho2t3_80_pxs.jpg",
        negativeX: this.getDfSt(["skyBox", "three", "negativeX"]) || "static/data/images/SkyBox/tycho2t3_80_mxs.jpg",
        positiveY: this.getDfSt(["skyBox", "three", "positiveY"]) || "static/data/images/SkyBox/tycho2t3_80_pys.jpg",
        negativeY: this.getDfSt(["skyBox", "three", "negativeY"]) || "static/data/images/SkyBox/tycho2t3_80_mys.jpg",
        positiveZ: this.getDfSt(["skyBox", "three", "positiveZ"]) || "static/data/images/SkyBox/tycho2t3_80_pzs.jpg",
        negativeZ: this.getDfSt(["skyBox", "three", "negativeZ"]) || "static/data/images/SkyBox/tycho2t3_80_mzs.jpg",
      },
    });
  },
  /**
   * 近景天空盒
   *  @function
   * @returns {GroundSkyBox} SkyBox
   * @see {@link module:Base#SkyBoxOnGround|SkyBoxOnGround}
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * baseObj.base.setOneGroundSkyBox()
   */
  setOneGroundSkyBox: function () {
    return new Cesium.Scene.GroundSkyBox({
      sources: {
        positiveX: this.getDfSt(["skyBox", "nearOne", "positiveX"]) || "static/data/images/SkyBox/rightav9.jpg",
        negativeX: this.getDfSt(["skyBox", "nearOne", "negativeX"]) || "static/data/images/SkyBox/leftav9.jpg",
        positiveY: this.getDfSt(["skyBox", "nearOne", "positiveY"]) || "static/data/images/SkyBox/frontav9.jpg",
        negativeY: this.getDfSt(["skyBox", "nearOne", "negativeY"]) || "static/data/images/SkyBox/backav9.jpg",
        positiveZ: this.getDfSt(["skyBox", "nearOne", "positiveZ"]) || "static/data/images/SkyBox/topav9.jpg",
        negativeZ: this.getDfSt(["skyBox", "nearOne", "negativeZ"]) || "static/data/images/SkyBox/bottomav9.jpg",
      },
    });
  },
  /**
   * 近景天空盒2
   *  @function
   * @returns {GroundSkyBox} SkyBox
   * @see {@link module:Base#SkyBoxOnGround|SkyBoxOnGround}
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * baseObj.base.setTwoGroundSkyBox()
   */
  setTwoGroundSkyBox: function () {
    return new Cesium.Scene.GroundSkyBox({
      sources: {
        positiveX: this.getDfSt(["skyBox", "nearTwo", "positiveX"]) || "static/data/images/SkyBox/SunSetRight.png",
        negativeX: this.getDfSt(["skyBox", "nearTwo", "negativeX"]) || "static/data/images/SkyBox/SunSetLeft.png",
        positiveY: this.getDfSt(["skyBox", "nearTwo", "positiveY"]) || "static/data/images/SkyBox/SunSetFront.png",
        negativeY: this.getDfSt(["skyBox", "nearTwo", "negativeY"]) || "static/data/images/SkyBox/SunSetBack.png",
        positiveZ: this.getDfSt(["skyBox", "nearTwo", "positiveZ"]) || "static/data/images/SkyBox/SunSetUp.png",
        negativeZ: this.getDfSt(["skyBox", "nearTwo", "negativeZ"]) || "static/data/images/SkyBox/SunSetDown.png",
      },
    });
  },
  /**
   * 近景天空盒3
   * @function
   * @returns {GroundSkyBox} SkyBox
   * @see {@link module:Base#SkyBoxOnGround|SkyBoxOnGround}
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * baseObj.base.setThreeGroundSkyBox()
   */
  setThreeGroundSkyBox: function () {
    return new Cesium.Scene.GroundSkyBox({
      sources: {
        positiveX: this.getDfSt(["skyBox", "nearThree", "positiveX"]) || "static/data/images/SkyBox/Right.jpg",
        negativeX: this.getDfSt(["skyBox", "nearThree", "negativeX"]) || "static/data/images/SkyBox/Left.jpg",
        positiveY: this.getDfSt(["skyBox", "nearThree", "positiveY"]) || "static/data/images/SkyBox/Front.jpg",
        negativeY: this.getDfSt(["skyBox", "nearThree", "negativeY"]) || "static/data/images/SkyBox/Back.jpg",
        positiveZ: this.getDfSt(["skyBox", "nearThree", "positiveZ"]) || "static/data/images/SkyBox/Up.jpg",
        negativeZ: this.getDfSt(["skyBox", "nearThree", "negativeZ"]) || "static/data/images/SkyBox/Down.jpg",
      },
    });
  },
  /**
   * 黑夜特效
   * @function
   * @param {object} options
   * @param {Cartesian3} options.offset - 偏移
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * baseObj.base.setDarkEffect({offset:new Cesium.Cartesian3(0.1, 0.2, 0.3)})
   * @returns {postProcessStages} postProcessStages 实例
   */
  setDarkEffect: function (options) {
    options = options || {};
    var fs =
      "uniform sampler2D colorTexture;\n" +
      "in vec2 v_textureCoordinates;\n" +
      "uniform float scale;\n" +
      "uniform vec3 offset;\n" +
      "void main() {\n" +
      " vec4 color = texture(colorTexture, v_textureCoordinates);\n" +
      " out_FragColor = vec4(color.r*0.2,color.g * 0.4,color.b*0.6, 1.0);\n" +
      "}\n";
    return this._viewer.scene.postProcessStages.add(
      new Cesium.PostProcessStage({
        name: "darkEffect",
        fragmentShader: fs,
        uniforms: {
          scale: 1.0,
          offset: function () {
            return options.offset || new Cesium.Cartesian3(0.1, 0.2, 0.3);
          },
        },
      })
    );
  },
  /**
   * 场景蓝光
   * @function
   * @param {object} options
   * @param {number} options.width - 曝光区域宽度
   * @param {number} options.height - 曝光区域高度
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * baseObj.base.setBlurBloom({width:80,height:97})
   * @returns {postProcessStages} postProcessStages 实例
   */
  setBlurBloom: function (options) {
    if (this._viewer && options) {
      var fs =
        "uniform float height;\n" +
        "uniform float width;\n" +
        "uniform sampler2D colorTexture1;\n" +
        "\n" +
        "in vec2 v_textureCoordinates;\n" +
        "\n" +
        "const int SAMPLES = 9;\n" +
        "void main()\n" +
        "{\n" +
        "vec2 st = v_textureCoordinates;\n" +
        "float wr = float(1.0 / width);\n" +
        "float hr = float(1.0 / height);\n" +
        "vec4 result = vec4(0.0);\n" +
        "int count = 0;\n" +
        "for(int i = -SAMPLES; i <= SAMPLES; ++i){\n" +
        "for(int j = -SAMPLES; j <= SAMPLES; ++j){\n" +
        "vec2 offset = vec2(float(i) * wr, float(j) * hr);\n" +
        "result += texture(colorTexture1, st + offset);\n" +
        "}\n" +
        "}\n" +
        "result = result / float(count);\n" +
        "out_FragColor = result;\n" +
        "}\n";

      return this._viewer.scene.postProcessStages.add(
        new Cesium.PostProcessStage({
          name: "blur_x_direction",
          fragmentShader: fs,
          uniforms: {
            width: options.width,
            height: options.height,
            colorTexture1: "Bright",
          },
        })
      );
    }
  },

  /**
   * 雨天特效
   * @function
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * baseObj.base.setRainEffect()
   * @returns {postProcessStages} postProcessStages 实例
   */
  setRainEffect: function () {
    if (this._viewer) {
      var fs =
        "uniform sampler2D colorTexture;\n\
                  in vec2 v_textureCoordinates;\n\
                  \n\
                  float hash(float x){\n\
                  return fract(sin(x*23.3)*13.13);\n\
                  }\n\
                  \n\
                  void main(){\n\
                      float time = czm_frameNumber / 60.0;\n\
                      vec2 resolution = czm_viewport.zw;\n\
                      vec2 uv=(gl_FragCoord.xy*2.-resolution.xy)/min(resolution.x,resolution.y);\n\
                      vec3 c=vec3(.6,.7,.8);\n\
                      float a=-.4;\n\
                      float si=sin(a),co=cos(a);\n\
                      uv*=mat2(co,-si,si,co);\n\
                      uv*=length(uv+vec2(0,4.9))*.3+1.;\n\
                      float v=1.-sin(hash(floor(uv.x*100.))*2.);\n\
                      float b=clamp(abs(sin(20.*time*v+uv.y*(5./(2.+v))))-.95,0.,1.)*20.;\n\
                      c*=v*b;\n\
                      out_FragColor = mix(texture(colorTexture, v_textureCoordinates), vec4(c, 1), 0.2);\n\
                  }\n\
                  ";
      return this._viewer.scene.postProcessStages.add(
        new Cesium.PostProcessStage({
          name: "rainEffect",
          fragmentShader: fs,
        })
      );
    }
  },
  /**
   * 雪天特效
   * @function
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * baseObj.base.setSnowEffect()
   * @returns {postProcessStages} postProcessStages 实例
   */
  setSnowEffect: function () {
    if (this._viewer) {
      var fs =
        "uniform sampler2D colorTexture;\n\
                      in vec2 v_textureCoordinates;\n\
                      float snow(vec2 uv,float scale){\n\
                          float time = czm_frameNumber / 60.0;\n\
                          float w=smoothstep(1.,0.,-uv.y*(scale/10.));\n\
                          if(w<.1)return 0.;\n\
                          uv+=time/scale;\n\
                          uv.y+=time*2./scale;\n\
                          uv.x+=sin(uv.y+time*.5)/scale;\n\
                          uv*=scale;\n\
                          vec2 s=floor(uv),f=fract(uv),p;\n\
                          float k=3.,d;\n\
                          p=.5+.35*sin(11.*fract(sin((s+p+scale)*mat2(7,3,6,5))*5.))-f;\n\
                          d=length(p);\n\
                          k=min(d,k);\n\
                          k=smoothstep(0.,k,sin(f.x+f.y)*0.01);\n\
                          return k*w;\n\
                      }\n\
                      \n\
                      void main(){\n\
                          vec2 resolution = czm_viewport.zw;\n\
                          vec2 uv=(gl_FragCoord.xy*2.-resolution.xy)/min(resolution.x,resolution.y);\n\
                          vec3 finalColor=vec3(0);\n\
                          float c = 0.0;\n\
                          c+=snow(uv,30.)*.0;\n\
                          c+=snow(uv,20.)*.0;\n\
                          c+=snow(uv,15.)*.0;\n\
                          c+=snow(uv,10.);\n\
                          c+=snow(uv,8.);\n\
                          c+=snow(uv,6.);\n\
                          c+=snow(uv,5.);\n\
                          finalColor=(vec3(c));\n\
                          out_FragColor = mix(texture(colorTexture, v_textureCoordinates), vec4(finalColor,1), 0.3);\n\
                          \n\
                      }\n\
                      ";
      return this._viewer.scene.postProcessStages.add(
        new Cesium.PostProcessStage({
          name: "snowEffect",
          fragmentShader: fs,
        })
      );
    }
  },
  /**
   *  雾天
   * @function
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * baseObj.base.setFogEffect()
   * @returns {postProcessStages} postProcessStages 实例
   */
  setFogEffect: function () {
    if (this._viewer) {
      var fs =
        "float getDistance(sampler2D depthTexture, vec2 texCoords) \n" +
        "{ \n" +
        "    float depth = czm_unpackDepth(texture(depthTexture, texCoords)); \n" +
        "    if (depth == 0.0) { \n" +
        "        return czm_infinity; \n" +
        "    } \n" +
        "    vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth); \n" +
        "    return -eyeCoordinate.z / eyeCoordinate.w; \n" +
        "} \n" +
        "float interpolateByDistance(vec4 nearFarScalar, float distance) \n" +
        "{ \n" +
        "    float startDistance = nearFarScalar.x; \n" +
        "    float startValue = nearFarScalar.y; \n" +
        "    float endDistance = nearFarScalar.z; \n" +
        "    float endValue = nearFarScalar.w; \n" +
        "    float t = clamp((distance - startDistance) / (endDistance - startDistance), 0.0, 1.0); \n" +
        "    return mix(startValue, endValue, t); \n" +
        "} \n" +
        "vec4 alphaBlend(vec4 sourceColor, vec4 destinationColor) \n" +
        "{ \n" +
        "    return sourceColor * vec4(sourceColor.aaa, 1.0) + destinationColor * (1.0 - sourceColor.a); \n" +
        "} \n" +
        "uniform sampler2D colorTexture; \n" +
        "uniform sampler2D depthTexture; \n" +
        "uniform vec4 fogByDistance; \n" +
        "uniform vec4 fogColor; \n" +
        "in vec2 v_textureCoordinates; \n" +
        "void main(void) \n" +
        "{ \n" +
        "    float distance = getDistance(depthTexture, v_textureCoordinates); \n" +
        "    vec4 sceneColor = texture(colorTexture, v_textureCoordinates); \n" +
        "    float blendAmount = interpolateByDistance(fogByDistance, distance); \n" +
        "    vec4 finalFogColor = vec4(fogColor.rgb, fogColor.a * blendAmount); \n" +
        "    out_FragColor = alphaBlend(finalFogColor, sceneColor); \n" +
        "} \n";

      return this._viewer.scene.postProcessStages.add(
        new Cesium.PostProcessStage({
          fragmentShader: fs,
          uniforms: {
            fogByDistance: new Cesium.Cartesian4(10, 0.0, 200, 0.3),
            fogColor: Cesium.Color.AZURE,
          },
        })
      );
    }
  },
  /**
   * 默认场景配置
   * @function
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * baseObj.base.setDefSceneConfig()
   */
  setDefSceneConfig: function () {
    if (this._viewer) {
      this._viewer.scene.sun.show = false;
      this._viewer.scene.moon.show = false;
      this._viewer.scene.fxaa = true;
      this._viewer.scene.globe.depthTestAgainstTerrain = true;
      this._viewer.scene.undergroundMode = false;
      this._viewer.scene.terrainProvider.isCreateSkirt = false;
      this._viewer.scene.skyAtmosphere.show = false;
      this._viewer.scene.globe.showGroundAtmosphere = false;
      this._viewer.scene.globe.enableLighting = true;
      this._viewer.scene.fog.enabled = false;
      this._viewer.cesiumWidget.creditContainer.style.display = "none";
    }
  },
  /**
   * 场景泛光
   * @function
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * baseObj.base.setBloomLightScene()
   */
  setBloomLightScene: function () {
    if (this._viewer) {
      this._viewer.scene.postProcessStages.bloom.enabled = true;
      this._viewer.scene.postProcessStages.bloom.uniforms.contrast = 119;
      this._viewer.scene.postProcessStages.bloom.uniforms.brightness = -0.4;
      this._viewer.scene.postProcessStages.bloom.uniforms.glowOnly = false;
      this._viewer.scene.postProcessStages.bloom.uniforms.delta = 0.9;
      this._viewer.scene.postProcessStages.bloom.uniforms.sigma = 3.78;
      this._viewer.scene.postProcessStages.bloom.uniforms.stepSize = 5;
      this._viewer.scene.postProcessStages.bloom.uniforms.isSelected = false;
    }
  },
  /**
   * 删除后置效果
   * @function
   * @param {Array} stage -后置场景对象数组
   */
  removePostProcessStage: function (stage) {
    if (stage) {
      if (Array.isArray(stage)) {
        stage.forEach((e) => {
          if (this._viewer.scene.postProcessStages.contains(e)) {
            this._viewer.scene.postProcessStages.remove(e);
          }
        });
      } else {
        if (this._viewer.scene.postProcessStages.contains(stage)) {
          this._viewer.scene.postProcessStages.remove(stage);
        }
      }
    }
  },
  /**
   * 相机定位
   * @function
   * @param {object} options
   * @param {Cartesian3} options.position - 目标位置数组
   * @param {number} options.distance - 距离
   * @param {object} options.orientation - 方位，包含[朝向|倾斜角|翻滚角]
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * baseObj.base.setView({
      position: new Cesium.Cartesian3(-1337035.7496454942, 5285202.940044943, 3305373.990594733),
      orientation: {
        heading: 6.108097731064569,
        pitch: -0.15254104473396812,
        roll: 6.283157460498558,
      },
    });
   */
  setView: function (options) {
    if (this._viewer && options && options.position) {
      if (options.distance) {
        //距离

        var pos1 = new Cesium.Cartesian3(0, options.distance, window.opt.distance);
        options.position = Cesium.Cartesian3.add(options.position, pos1, new Cesium.Cartesian3());
      }
      this._viewer.scene.camera.setView({
        destination: options.position,
        orientation: options.orientation || {
          heading: Cesium.Math.toRadians(90.0),
          pitch: Cesium.Math.toRadians(90.0),
          roll: Cesium.Math.toRadians(0.0),
        },
      });
    }
  },
  /**
   * 相机飞行
   * @param {object} options
   * @param {Cartesian3} options.position - 目标位置数组
   * @param {number} options.distance - 距离
   * @param {number} options.duration - 过度时长
   * @param {object} options.orientation - 方位，包含[朝向|倾斜角|翻滚角]
   * @param {object} options.easingFunction - 飞行中在duration时间内插值方式
   * @param {Function} options.callback - 操作完成后的回调
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * baseObj.base.flyTo({
        position: { x: -1337132.0092982147, y: 5330611.474631115, z: 3228680.029449292 },
        orientation: {
          heading: Cesium.Math.toRadians(1.0114629015290062),
          pitch: Cesium.Math.toRadians(-23.53661660731824),
          roll: Cesium.Math.toRadians(0.00324596311071617)
        },,
        distance：300,
        duration:3
      })
   */
  flyTo: function (options) {
    if (this._viewer && options && options.position) {
      if (options.distance) {
        //距离
        var pos1 = new Cesium.Cartesian3(0, options.distance, options.distance);
        options.position = Cesium.Cartesian3.add(options.position, pos1, new Cesium.Cartesian3());
      }
      this._viewer.scene.camera.flyTo({
        destination: options.position,
        orientation: options.orientation || {
          heading: Cesium.Math.toRadians(90.0),
          pitch: Cesium.Math.toRadians(90.0),
          roll: Cesium.Math.toRadians(0.0),
        },
        // pitchAdjustHeight: 500,
        easingFunction: options.easingFunction || Cesium.EasingFunction.LINEAR_NONE,
        duration: options.duration || 3,
        complete: options.callback,
      });
    }
  },

  /**
   *笛卡尔转坐标WGS84
   * @param {cartesian} cartesian -  笛卡尔积坐标数组
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * baseObj.base.transformCartesianToWGS84(Cesium.Cartesian3.fromDegrees(110.16018735617934, 31.036076859828338))
   * @returns {WGS84Type}  转换后wgs84坐标对象
   *
   */
  transformCartesianToWGS84: function (cartesian) {
    if (this._viewer && cartesian) {
      var ellipsoid = Cesium.Ellipsoid.WGS84;
      var cartographic = ellipsoid.cartesianToCartographic(cartesian);
      return {
        lng: Cesium.Math.toDegrees(cartographic.longitude),
        lat: Cesium.Math.toDegrees(cartographic.latitude),
        alt: cartographic.height,
      };
    }
  },
  /**
   * 坐标数组转换 笛卡尔转84
   * @function
   * @param {Array} WSG84Arr  -WSG84Arr坐标数组
   * @param {number} alt - z轴高层
   * @see {@link module:Base#transformWGS84ToCartesian|transformWGS84ToCartesian}
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * baseObj.base.transformWGS84ArrayToCartesianArray([{lng:110.16018735617934, lat:31.036076859828338, alt:0 }])
   * @returns {Cartesian3|Array} 转换后的笛卡尔积数组
   */
  transformWGS84ArrayToCartesianArray: function (WSG84Arr, alt) {
    if (this._viewer && WSG84Arr) {
      var $this = this;
      return WSG84Arr
        ? WSG84Arr.map(function (item) {
            return $this.transformWGS84ToCartesian(item, alt);
          })
        : [];
    }
  },
  /**
   * 坐标转换 84转笛卡尔
   * @function
   * @param {object} position  坐标数组
   * @param {number} position.lng  - 经度
   * @param {number} position.lon  - 纬度
   * @param {number} position.lat  - z轴
   * @param {number} alt - 高层
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * baseObj.base.transformWGS84ToCartesian({lng:110.16018735617934, lat:31.036076859828338, alt:0 },30)
   * @returns {Cartesian3} 转换后的笛卡尔积数组
   */
  transformWGS84ToCartesian: function (position, alt) {
    if (this._viewer) {
      return position
        ? Cesium.Cartesian3.fromDegrees(
            position.lng || position.lon,
            position.lat,
            (position.alt = alt || position.alt),
            Cesium.Ellipsoid.WGS84
          )
        : Cesium.Cartesian3.ZERO;
    }
  },
  /**
   * 笛卡尔积坐标数组转换 84地理坐标
   * @param {Array} cartesianArr
   * @see {@link module:Base#transformCartesianToWGS84|transformCartesianToWGS84}
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * baseObj.base.transformCartesianArrayToWGS84Array(Cesium.Cartesian3.fromDegreesArray( 110.16018735617934, 31.036076859828338, 110.17845812703679,31.033686527335444))
   * @returns {Cartesian3} 转换后的笛卡尔积数组
   */
  transformCartesianArrayToWGS84Array: function (cartesianArr) {
    if (this._viewer) {
      var $this = this;
      return cartesianArr
        ? cartesianArr.map(function (item) {
            return $this.transformCartesianToWGS84(item);
          })
        : [];
    }
  },
  /**
   * 相机绕点旋转
   * @function
   * @param {object} options
   * @param {number} options.lng - 经度
   * @param {number} options.lat - 纬度
   * @param {number} options.height - z轴高度
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const BaseObj = new Base({
   *    cesiumGlobal: Cesium,
        containerId: 'cesiumContainer'
      })
   * BaseObj.base.setCameraEotateHeading({
                lng: 117.1423291616,
                lat: 39.0645831633,
                height: 15.8
            })
   */
  setCameraEotateHeading(options) {
    if (options) {
      let viewer = this._viewer;
      let position = Cesium.Cartesian3.fromDegrees(options.lng, options.lat, options.height);
      // 相机看点的角度，如果大于0那么则是从地底往上看，所以要为负值，这里取-30度
      let pitch = Cesium.Math.toRadians(-30);
      // 给定飞行一周所需时间，比如10s, 那么每秒转动度数
      let angle = 360 / 30;
      // 给定相机距离点多少距离飞行，这里取值为5000m
      let distance = 5000;
      let startTime = Cesium.JulianDate.fromDate(new Date());
      viewer.clock.startTime = startTime.clone(); // 开始时间
      viewer.clock.currentTime = startTime.clone(); // 当前时间
      viewer.clock.clockRange = Cesium.ClockRange.CLAMPED; // 行为方式
      viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK; // 时钟设置为当前系统时间; 忽略所有其他设置。
      //相机的当前heading
      let initialHeading = viewer.camera.heading;
      let Exection = function TimeExecution() {
        // 当前已经过去的时间，单位s
        let delTime = Cesium.JulianDate.secondsDifference(viewer.clock.currentTime, viewer.clock.startTime);
        let heading = Cesium.Math.toRadians(delTime * angle) + initialHeading;
        viewer.scene.camera.setView({
          destination: position, // 点的坐标
          orientation: {
            heading: heading,
            pitch: pitch,
          },
        });
        viewer.scene.camera.moveBackward(distance);

        if (Cesium.JulianDate.compare(viewer.clock.currentTime, viewer.clock.stopTime) >= 0) {
          viewer.clock.onTick.removeEventListener(Exection);
        }
      };
      viewer.clock.onTick.addEventListener(Exection);
    }
  },
  /**
   * wgs84坐标转地图坐标
   * @param {object} position
   * @param {number} position.lng  - 经度
   * @param {number} position.lon  - 经度
   * @param {number} position.lat  - 纬度
   * @param {number} position.alt  - z轴
   * @see {@link module:Base#transformCartesianToWGS84|transformCartesianToWGS84}
   * @example
   * import { Base } from 'cesium_dev_kit'
   * const baseObj = new Base({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * const wgs84 =  baseObj.base.transformCartesianToWGS84(Cesium.Cartesian3.fromDegrees(110.16018735617934, 31.036076859828338));
   * const cartographic = baseObj.base.transformWGS84ToCartographic(wgs84)
   * // or
   * const cartographic2 = baseObj.base.transformWGS84ToCartographic({lng:110.16018735617934, lat:31.036076859828338, alt:0 });
   * @returns {Cartographic} 地理坐标
   *
   */
  transformWGS84ToCartographic: function (position) {
    return position
      ? Cesium.Cartographic.fromDegrees(position.lng || position.lon, position.lat, position.alt)
      : Cesium.Cartographic.ZERO;
  },
  // 拾取位置点
  getCatesian3FromPX: function (px) {
    if (this._viewer && px) {
      // var picks = this._viewer.scene.drillPick(px); // 3dtilset
      // for (var i = 0; i < picks.length; i++) {
      //     if (picks[i] instanceof Cesium.Cesium3DTileFeature) { //模型上拾取
      //         isOn3dtiles = true;
      //     }
      // }
      var picks = this._viewer.scene.pick(px);
      var cartesian = null;
      var isOn3dtiles = false,
        isOnTerrain = false;
      if (picks instanceof Cesium.Cesium3DTileFeature) {
        //模型上拾取
        isOn3dtiles = true;
      }
      // 3dtilset
      if (isOn3dtiles) {
        cartesian = this._viewer.scene.pickPosition(px);
        if (cartesian) {
          let cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          if (cartographic.height < 0) cartographic.height = 0;
          let lon = Cesium.Math.toDegrees(cartographic.longitude),
            lat = Cesium.Math.toDegrees(cartographic.latitude),
            height = cartographic.height; //模型高度
          cartesian = this.transformWGS84ToCartesian({
            lng: lon,
            lat: lat,
            alt: height,
          });
        }
      }
      // 地形
      if (!picks) {
        var ray = this._viewer.scene.camera.getPickRay(px);
        if (!ray) return null;
        cartesian = this._viewer.scene.globe.pick(ray, this._viewer.scene);
        isOnTerrain = true;
      }
      // 地球
      if (!isOn3dtiles && !isOnTerrain) {
        cartesian = this._viewer.scene.camera.pickEllipsoid(px, this._viewer.scene.globe.ellipsoid);
      }
      if (cartesian) {
        let position = this.transformCartesianToWGS84(cartesian);
        if (position.alt < 0) {
          cartesian = this.transformWGS84ToCartesian(position, 0.1);
        }
        return cartesian;
      }
      return false;
    }
  },

  /**
   * 获取相机位置
   * @function
   * @returns {cameraPosType} 相机位置信息
   *
   */
  getCameraPosition: function () {
    if (this._viewer) {
      var result = this._viewer.scene.camera.pickEllipsoid(
        new Cesium.Cartesian2(this._viewer.canvas.clientWidth / 2, this._viewer.canvas.clientHeight / 2)
      );
      if (result) {
        var curPosition = Cesium.Ellipsoid.WGS84.cartesianToCartographic(result),
          lon = (curPosition.longitude * 180) / Math.PI,
          lat = (curPosition.latitude * 180) / Math.PI;

        var direction = this._viewer.camera._direction,
          x = Cesium.Math.toDegrees(direction.x),
          y = Cesium.Math.toDegrees(direction.y),
          z = Cesium.Math.toDegrees(direction.z),
          height = this._viewer.camera.positionCartographic.height,
          heading = Cesium.Math.toDegrees(this._viewer.camera.heading),
          pitch = Cesium.Math.toDegrees(this._viewer.camera.pitch),
          roll = Cesium.Math.toDegrees(this._viewer.camera.roll);

        var rectangle = this._viewer.camera.computeViewRectangle(),
          west = (rectangle.west / Math.PI) * 180,
          north = (rectangle.north / Math.PI) * 180,
          east = (rectangle.east / Math.PI) * 180,
          south = (rectangle.south / Math.PI) * 180,
          centerx = (west + east) / 2,
          cnetery = (north + south) / 2;

        return {
          lon: lon,
          lat: lat,
          height: height,
          heading: heading,
          pitch: pitch,
          roll: roll,
          position: this._viewer.camera.position,
          cameraHeading: this._viewer.camera.heading,
          cameraPitch: this._viewer.camera.pitch,
          cameraRoll: this._viewer.camera.roll,
          center: {
            x: centerx,
            y: cnetery,
          },
          direction: new Cesium.Cartesian3(x, y, z),
        };
      }
    }
  },
  //修改相机状态
  updateCameraState: function (flag) {
    this._viewer.scene._screenSpaceCameraController.enableRotate = flag;
    this._viewer.scene._screenSpaceCameraController.enableTranslate = flag;
    this._viewer.scene._screenSpaceCameraController.enableZoom = flag;
    this._viewer.scene._screenSpaceCameraController.enableTilt = flag;
    this._viewer.scene._screenSpaceCameraController.enableLook = flag;
  },

  /**
   * 鼠标事件注册
   * @function
   * @param {object} options
   * @param {string} options.leftClick - 左键点击
   * @param {object} options.mouseMove - 移动
   * @param {object} options.dubleClick - 双击
   * @param {object} options.leftDown - 左键按下
   * @param {object} options.mouseWheel - 鼠标滚动
   * @param {object} options.leftUp - 左键弹起
   */
  bindHandelEvent: function ({
    leftClick: _mouseLeftClickHandler,
    mouseMove: _mouseMoveHandler,
    doubleClick: _mouseDbClickHandler,
    leftDown: _mouseLeftDownHandler,
    mouseWheel: _mouseWheelHandler,
    leftUp: _mouseLeftUpHandler,
  }) {
    if (this._viewer) {
      var _handlers = new Cesium.ScreenSpaceEventHandler(this._viewer.canvas);
      _mouseLeftClickHandler &&
        _handlers.setInputAction(function (movement) {
          _mouseLeftClickHandler(movement, _handlers);
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      _mouseMoveHandler &&
        _handlers.setInputAction(function (movement) {
          _mouseMoveHandler(movement, _handlers);
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

      _mouseDbClickHandler &&
        _handlers.setInputAction(function (movement) {
          _mouseDbClickHandler(movement, _handlers);
        }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

      _mouseLeftDownHandler &&
        _handlers.setInputAction(function (movement) {
          _mouseLeftDownHandler(movement, _handlers);
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

      _mouseWheelHandler &&
        _handlers.setInputAction(function (movement) {
          _mouseWheelHandler(movement, _handlers);
        }, Cesium.ScreenSpaceEventType.WHEEL);

      _mouseLeftUpHandler &&
        _handlers.setInputAction(function (movement) {
          _mouseLeftUpHandler(movement, _handlers);
        }, Cesium.ScreenSpaceEventType.LEFT_UP);
    }
  },
  //获取鼠标信息
  getHandelPosition: function (callback) {
    if (this._viewer) {
      var _handler = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas),
        $this = this;
      _handler.setInputAction(function (movement) {
        var cartesian = $this._viewer.scene.camera.pickEllipsoid(movement.endPosition, $this._viewer.scene.globe.ellipsoid);

        if (typeof callback === "function") {
          callback($this.transformCartesianToWGS84(cartesian), _handler);
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }
  },
  //保存当前场景png
  saveSceneImages: function () {
    if (this._viewer) {
      const dataURLtoBlob = function (dataurl) {
        var arr = dataurl.split(","),
          mime = arr[0].match(/:(.*?);/)[1],
          bstr = atob(arr[1]),
          n = bstr.length,
          u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {
          type: mime,
        });
      };

      var canvas = this._viewer.scene.canvas;
      var image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
      var link = document.createElement("a");
      // var strDataURI = image.substr(22, image.length)
      var blob = dataURLtoBlob(image);
      var objurl = URL.createObjectURL(blob);
      link.download = "scene.png";
      link.href = objurl;
      link.click();
    }
  },
  /**
   * amap
   * @private
   *
   */
  _installAmapImageryProvider: function () {
    const IMG_URL = "https://webst{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}";
    const ELEC_URL = "http://webrd{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}";
    /**
     * @global
     * @param {object} options
     * @param {string} options.style - 图层类型，可选['elec'| 'img']
     * @param {string} options.url - 地址
     * @param {boolean} options.subdomains - 子域
     * @returns {UrlTemplateImageryProvider}
     * @example
     * viewer.imageryLayers.addImageryProvider(new Cesium.Scene.AmapImageryProvider({
        style: 'img'
      }));
     */
    function AmapImageryProvider(options) {
      options["url"] = options.style === "img" ? IMG_URL : ELEC_URL;
      if (!options.subdomains) {
        options["subdomains"] = ["01", "02", "03", "04"];
      }
      return new Cesium.UrlTemplateImageryProvider(options);
    }

    Cesium.Scene.AmapImageryProvider = AmapImageryProvider;
  },
  /**
   * 天地图
   * @private
   */
  _installTdtImageryProvider: function () {
    const MAP_URL =
      "https://{s}.tianditu.gov.cn/{layer}_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER={layer}&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk={key}";
    /**
     * 天地图加载方法
     * @global
     * @param {object} options
     * @param {string} options.key - 天地图key
     * @param {string} options.style - 图层类型，可选['cva'|'img'|'ter']
     * @returns  {WebMapTileServiceImageryProvider}
     * @example
     * viewer.imageryLayers.addImageryProvider(new Cesium.Scene.TdtImageryProvider({
        key: '7eb11c0c503429878691ac917238f87f',
        style: 'cva'
      }));
     */
    function TdtImageryProvider(options) {
      return new Cesium.WebMapTileServiceImageryProvider({
        url: MAP_URL.replace(/\{layer\}/g, options.style || "vec").replace(/\{key\}/g, options.key || ""),
        layer: options.style + "_w",
        style: "default", // WMTS请求的样式名称
        format: "tiles", // MIME类型，用于从服务器检索图像
        tileMatrixSetID: "GoogleMapsCompatible", //	用于WMTS请求的TileMatrixSet的标识符
        subdomains: ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7"], // 天地图8个服务器
        minimumLevel: 0, // 最小层级
        maximumLevel: 18, // 最大层级
      });
    }

    Cesium.Scene.TdtImageryProvider = TdtImageryProvider;
  },
  /**
   * 腾讯
   * @private
   */
  _installTencentImageryProvider: function () {
    const IMG_URL = "https://p2.map.gtimg.com/sateTiles/{z}/{sx}/{sy}/{x}_{reverseY}.jpg?version=229";
    const ELEC_URL = "https://rt3.map.gtimg.com/tile?z={z}&x={x}&y={reverseY}&type=vector&styleid=1";
    /**
     * 腾讯底图加载方法
     * @global
     * @param {object} options
     * @param {string} options.layer - 图层类型，可选['elec'| 'img']
     * @param {string} options.url - 地址
     * @param {boolean} options.subdomains - 子域
     * @returns {ImageryProvider}
     * @example
     * viewer.imageryLayers.addImageryProvider(
        new Cesium.Scene.TencentImageryProvider({
          layer: 'img',
          url: 'https://p2.map.gtimg.com/sateTiles/{z}/{sx}/{sy}/{x}_{reverseY}.jpg?version=229'
        }));
     */
    function TencentImageryProvider(options) {
      if (options.layer === "img") {
        if (!options["url"]) {
          options["url"] = IMG_URL;
        }
        if (!options.subdomains) {
          options["subdomains"] = ["0", "1", "2"];
        }
        options["customTags"] = {
          sx: function (imageryProvider, x, y, level) {
            return x >> 4;
          },
          sy: function (imageryProvider, x, y, level) {
            return ((1 << level) - y) >> 4;
          },
        };
      } else {
        if (!options["url"]) {
          options["url"] = ELEC_URL;
        }
      }
      return new Cesium.UrlTemplateImageryProvider(options);
    }
    Cesium.Scene.TencentImageryProvider = TencentImageryProvider;
  },
  /**
   * google
   * @private
   */
  _installGooGleImageryProvider: function () {
    //标注 影像 地形三种
    const ELEC_URL = "http://mt{s}.google.cn/vt/lyrs=m@207000000&hl=zh-CN&gl=CN&src=app&x={x}&y={y}&z={z}&s=Galile";
    const IMG_URL = "http://mt{s}.google.cn/vt/lyrs=s&hl=zh-CN&x={x}&y={y}&z={z}&s=Gali";
    const TER_URL = "http://mt{s}.google.cn/vt/lyrs=t@131,r@227000000&hl=zh-CN&gl=cn&x={x}&y={y}&z={z}&s=Galile";
    /**
     * 谷歌地图加载方法
     * @global
     * @param {object} options
     * @param {boolean} options.subdomains - 子域
     * @param {string} options.style - 图层类型，可选['img'|'ter']
     * @returns  {ImageryProvider}
     * @example
     *viewer.imageryLayers.addImageryProvider(new Cesium.Scene.GoogleImageryProvider({
        style: 'img'
      }));
     */
    function GoogleImageryProvider(options) {
      options["url"] = options.style === "img" ? IMG_URL : options.style === "ter" ? TER_URL : ELEC_URL;
      if (!options.subdomains) {
        options["subdomains"] = ["1", "2", "3", "4", "5"];
      }
      return new Cesium.UrlTemplateImageryProvider(options);
    }

    Cesium.Scene.GoogleImageryProvider = GoogleImageryProvider;
  },
  /**
   * 百度影像拓展
   * @private
   */
  _installBaiduImageryProvider: function () {
    var TEMP_MAP_URL = "http://api{s}.map.bdimg.com/customimage/tile?&x={x}&y={y}&z={z}&scale=1&customid={style}";
    /**
     * 百度影像拓展
     * @global
     * @param {Object} options
     * @param {string} url - 图层路径
     * @param {string} style - 样式,可选['normal'|'midnight'|'dark'|'googlelite'|'redalert']
     * @example
     * const opts = {
     *   url: 'https://api.map.baidu.com/customimage/tile?udt=20181205&scale=1&ak=1XjLLEhZhQNUzd93EjU5nOGQ',
     *  style: 'midnight'
     * }
     *viewer.imageryLayers.addImageryProvider(new Cesium.Scene.BaiduImageryProvider(commonOption));
     */
    function BaiduImageryProvider(options) {
      TEMP_MAP_URL = options.url || TEMP_MAP_URL;

      this._url = TEMP_MAP_URL;
      this._tileWidth = 256;
      this._tileHeight = 256;
      this._maximumLevel = 18;
      this._minimumLevel = 1;
      this._tilingScheme = new Cesium.WebMercatorTilingScheme({
        rectangleSouthwestInMeters: new Cesium.Cartesian2(-33554054, -33746824),
        rectangleNortheastInMeters: new Cesium.Cartesian2(33554054, 33746824),
      });
      this._rectangle = this._tilingScheme.rectangle;
      this._credit = undefined;
      this._style = options.style || "normal";
      this._ready = true;
    }

    Object.defineProperties(BaiduImageryProvider.prototype, {
      url: {
        get: function () {
          return this._url;
        },
      },
      token: {
        get: function () {
          return this._token;
        },
      },
      tileWidth: {
        get: function () {
          if (!this.ready) {
            throw new Cesium.DeveloperError("tileWidth must not be called before the imagery provider is ready.");
          }
          return this._tileWidth;
        },
      },
      tileHeight: {
        get: function () {
          if (!this.ready) {
            throw new Cesium.DeveloperError("tileHeight must not be called before the imagery provider is ready.");
          }
          return this._tileHeight;
        },
      },
      maximumLevel: {
        get: function () {
          if (!this.ready) {
            throw new Cesium.DeveloperError("tileHeight must not be called before the imagery provider is ready.");
          }
          return this._tileHeight;
        },
      },
      minimumLevel: {
        get: function () {
          if (!this.ready) {
            throw new Cesium.DeveloperError("minimumLevel must not be called before the imagery provider is ready.");
          }
          return 0;
        },
      },
      tilingScheme: {
        get: function () {
          if (!this.ready) {
            throw new Cesium.DeveloperError("tilingScheme must not be called before the imagery provider is ready.");
          }
          return this._tilingScheme;
        },
      },

      rectangle: {
        get: function () {
          if (!this.ready) {
            throw new Cesium.DeveloperError("rectangle must not be called before the imagery provider is ready.");
          }
          return this._rectangle;
        },
      },

      ready: {
        get: function () {
          return !!this._url;
        },
      },

      credit: {
        get: function () {
          return this._credit;
        },
      },
      readyPromise: {
        get: function () {
          return this._readyPromise.promise;
        },
      },
      usingPrecachedTiles: {
        get: function () {
          return this._useTiles;
        },
      },
      hasAlphaChannel: {
        get: function () {
          return true;
        },
      },
      layers: {
        get: function () {
          return this._layers;
        },
      },
    });
    function buildImageUrl(imageryProvider, x, y, level, _style) {
      var url = imageryProvider._url + "&x={x}&y={y}&z={z}&customid={style}";
      var tileW = imageryProvider._tilingScheme.getNumberOfXTilesAtLevel(level);
      var tileH = imageryProvider._tilingScheme.getNumberOfYTilesAtLevel(level);

      url = url
        .replace("{x}", x - tileW / 2)
        .replace("{y}", tileH / 2 - y - 1)
        .replace("{z}", level)
        .replace("{style}", _style);
      return url;
    }
    BaiduImageryProvider.prototype.getTileCredits = function (x, y, level) {
      return undefined;
    };

    BaiduImageryProvider.prototype.requestImage = function (x, y, level) {
      if (!this.ready) {
        throw new Cesium.DeveloperError("requestImage must not be called before the imagery provider is ready.");
      }
      var url = buildImageUrl(this, x, y, level, this._style);

      return Cesium.ImageryProvider.loadImage(this, url);
    };

    Cesium.Scene.BaiduImageryProvider = BaiduImageryProvider;
  },
  // 拓展近景天空盒
  _installGroundSkyBox: function () {
    var BoxGeometry = Cesium.BoxGeometry,
      Cartesian3 = Cesium.Cartesian3,
      defaultValue = Cesium.defaultValue,
      defined = Cesium.defined,
      destroyObject = Cesium.destroyObject,
      DeveloperError = Cesium.DeveloperError,
      GeometryPipeline = Cesium.GeometryPipeline,
      Matrix3 = Cesium.Matrix3,
      Matrix4 = Cesium.Matrix4,
      Transforms = Cesium.Transforms,
      VertexFormat = Cesium.VertexFormat,
      BufferUsage = Cesium.BufferUsage,
      CubeMap = Cesium.CubeMap,
      DrawCommand = Cesium.DrawCommand,
      loadCubeMap = Cesium.loadCubeMap,
      RenderState = Cesium.RenderState,
      VertexArray = Cesium.VertexArray,
      BlendingState = Cesium.BlendingState,
      SceneMode = Cesium.SceneMode,
      ShaderProgram = Cesium.ShaderProgram,
      ShaderSource = Cesium.ShaderSource;
    //片元着色器，直接从源码复制
    var SkyBoxFS =
      "uniform samplerCube u_cubeMap;\n\
                    in vec3 v_texCoord;\n\
                    void main()\n\
                    {\n\
                    vec4 color = texture(u_cubeMap, normalize(v_texCoord));\n\
                    out_FragColor = vec4(czm_gammaCorrect(color).rgb, czm_morphTime);\n\
                    }\n\
                    ";

    //顶点着色器有修改，主要是乘了一个旋转矩阵
    var SkyBoxVS =
      "in vec3 position;\n\
                    out vec3 v_texCoord;\n\
                    uniform mat3 u_rotateMatrix;\n\
                    void main()\n\
                    {\n\
                    vec3 p = czm_viewRotation * u_rotateMatrix * (czm_temeToPseudoFixed * (czm_entireFrustum.y * position));\n\
                    gl_Position = czm_projection * vec4(p, 1.0);\n\
                    v_texCoord = position.xyz;\n\
                    }\n\
                    ";
    /**
     * 为了兼容高版本的Cesium，因为新版cesium中getRotation被移除
     */
    if (!defined(Matrix4.getRotation)) {
      Matrix4.getRotation = Matrix4.getMatrix3;
    }
    /**
     * 拓展近景天空盒
     * @function
     * @param {object} options
     * @param {object} options.sources - 配置天空盒六面的图片
     * @param {boolean} options.show - 是否显示
     * @example
     * new Cesium.Scene.GroundSkyBox({
            sources: {
              positiveX: "static/data/images/SkyBox/rightav9.jpg",
              negativeX:  "static/data/images/SkyBox/leftav9.jpg",
              positiveY:  "static/data/images/SkyBox/frontav9.jpg",
              negativeY: "static/data/images/SkyBox/backav9.jpg",
              positiveZ: "static/data/images/SkyBox/topav9.jpg",
              negativeZ: "static/data/images/SkyBox/bottomav9.jpg",
            },
          })
     */
    function SkyBoxOnGround(options) {
      this.sources = options.sources;
      this._sources = undefined;
      /**
       * Determines if the sky box will be shown.
       *
       * @type {Boolean}
       * @default true
       */
      this.show = defaultValue(options.show, true);

      this._command = new DrawCommand({
        modelMatrix: Matrix4.clone(Matrix4.IDENTITY),
        owner: this,
      });
      this._cubeMap = undefined;

      this._attributeLocations = undefined;
      this._useHdr = undefined;
    }

    var skyboxMatrix3 = new Matrix3();
    SkyBoxOnGround.prototype.update = function (frameState, useHdr) {
      var that = this;

      if (!this.show) {
        return undefined;
      }

      if (frameState.mode !== SceneMode.SCENE3D && frameState.mode !== SceneMode.MORPHING) {
        return undefined;
      }

      if (!frameState.passes.render) {
        return undefined;
      }

      var context = frameState.context;

      if (this._sources !== this.sources) {
        this._sources = this.sources;
        var sources = this.sources;

        if (
          !defined(sources.positiveX) ||
          !defined(sources.negativeX) ||
          !defined(sources.positiveY) ||
          !defined(sources.negativeY) ||
          !defined(sources.positiveZ) ||
          !defined(sources.negativeZ)
        ) {
          throw new DeveloperError(
            "this.sources is required and must have positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ properties."
          );
        }

        if (
          typeof sources.positiveX !== typeof sources.negativeX ||
          typeof sources.positiveX !== typeof sources.positiveY ||
          typeof sources.positiveX !== typeof sources.negativeY ||
          typeof sources.positiveX !== typeof sources.positiveZ ||
          typeof sources.positiveX !== typeof sources.negativeZ
        ) {
          throw new DeveloperError("this.sources properties must all be the same type.");
        }

        if (typeof sources.positiveX === "string") {
          // Given urls for cube-map images.  Load them.
          loadCubeMap(context, this._sources).then(function (cubeMap) {
            that._cubeMap = that._cubeMap && that._cubeMap.destroy();
            that._cubeMap = cubeMap;
          });
        } else {
          this._cubeMap = this._cubeMap && this._cubeMap.destroy();
          this._cubeMap = new CubeMap({
            context: context,
            source: sources,
          });
        }
      }

      var command = this._command;

      command.modelMatrix = Transforms.eastNorthUpToFixedFrame(frameState.camera._positionWC);
      if (!defined(command.vertexArray)) {
        command.uniformMap = {
          u_cubeMap: function () {
            return that._cubeMap;
          },
          u_rotateMatrix: function () {
            return Matrix4.getRotation(command.modelMatrix, skyboxMatrix3);
          },
        };

        var geometry = BoxGeometry.createGeometry(
          BoxGeometry.fromDimensions({
            dimensions: new Cartesian3(2.0, 2.0, 2.0),
            vertexFormat: VertexFormat.POSITION_ONLY,
          })
        );
        var attributeLocations = (this._attributeLocations = GeometryPipeline.createAttributeLocations(geometry));

        command.vertexArray = VertexArray.fromGeometry({
          context: context,
          geometry: geometry,
          attributeLocations: attributeLocations,
          bufferUsage: BufferUsage._DRAW,
        });

        command.renderState = RenderState.fromCache({
          blending: BlendingState.ALPHA_BLEND,
        });
      }

      if (!defined(command.shaderProgram) || this._useHdr !== useHdr) {
        var fs = new ShaderSource({
          defines: [useHdr ? "HDR" : ""],
          sources: [SkyBoxFS],
        });
        command.shaderProgram = ShaderProgram.fromCache({
          context: context,
          vertexShaderSource: SkyBoxVS,
          fragmentShaderSource: fs,
          attributeLocations: this._attributeLocations,
        });
        this._useHdr = useHdr;
      }

      if (!defined(this._cubeMap)) {
        return undefined;
      }

      return command;
    };
    SkyBoxOnGround.prototype.isDestroyed = function () {
      return false;
    };
    SkyBoxOnGround.prototype.destroy = function () {
      var command = this._command;
      command.vertexArray = command.vertexArray && command.vertexArray.destroy();
      command.shaderProgram = command.shaderProgram && command.shaderProgram.destroy();
      this._cubeMap = this._cubeMap && this._cubeMap.destroy();
      return destroyObject(this);
    };

    Cesium.Scene.GroundSkyBox = SkyBoxOnGround;
  },
  /**
   * 移除绑定的handler事件
   *@function
   * @param {Array} eventNameArr  handler名称数组，如['LEFT_CLICK','MOUSE_MOVE']
   */
  removeHandlerByName(eventNameArr = []) {
    eventNameArr.forEach((eHandler) => {
      this._viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType[eHandler]);
    });
  },
};

export { Base };
