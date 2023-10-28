/**
 * 着色器模块
 * @param {*} viewer
 */
function Shaders() {}

Shaders.prototype = {
  // 流动线
  _getFlowLineShader: function () {
    return 'uniform vec4 color;\n\
              uniform float duration;\n\
              \n\
              czm_material czm_getMaterial(czm_materialInput materialInput){\n\
                  czm_material material = czm_getDefaultMaterial(materialInput);\n\
                  vec2 st = materialInput.st;\n\
                  float t =fract(czm_frameNumber / duration);\n\
                  t *= 1.03;\n\
                  float alpha = smoothstep(t- 0.03, t, st.s) * step(-t, -st.s);\n\
                  alpha += 0.1;\n\
                  vec4 fragColor;\n\
                  fragColor.rgb = (color.rgb) / 0.5;\n\
                  fragColor = czm_gammaCorrect(fragColor);\n\
                  material.diffuse = fragColor.rgb;\n\
                  material.alpha = alpha;\n\
                  material.emission = fragColor.rgb;\n\
                  return material;\n\
              }\n\
              '
  },
  // 动态线
  _getDynamicLineShader: function (options) {
    if (options && options.get) {
      return 'czm_material czm_getMaterial(czm_materialInput materialInput)\n\
              {\n\
                  czm_material material = czm_getDefaultMaterial(materialInput);\n\
                  vec2 st = materialInput.st;\n\
                  \n\
                  if(texture(image, vec2(0.0, 0.0)).a == 1.0){\n\
                      discard;\n\
                  }else{\n\
                      material.alpha = texture(image, vec2(1.0 - fract(time - st.s), st.t)).a * color.a;\n\
                  }\n\
                  \n\
                  material.diffuse = max(color.rgb * material.alpha * 3.0, color.rgb);\n\
                  \n\
                  return material;\n\
              }\n\
              '
    }
  },
  // 动态泛光线
  _getDynamicLightLineShader: function (options) {
    if (options && options.get) {
      return 'czm_material czm_getMaterial(czm_materialInput materialInput)\n\
              {\n\
                  czm_material material = czm_getDefaultMaterial(materialInput);\n\
                  vec2 st = materialInput.st;\n\
                  \n\
                  vec4 colorImage = texture(image, vec2(fract(1.0 *st.s - time), fract(st.t)));\n\
                  \n\
                  vec4 fragColor;\n\
                  fragColor.rgb = (colorImage.rgb+color.rgb) / 1.0;\n\
                  fragColor = czm_gammaCorrect(fragColor);\n\
                  material.diffuse = colorImage.rgb;\n\
                  material.alpha = colorImage.a;\n\
                  material.emission = fragColor.rgb;\n\
                  \n\
                  return material;\n\
              }\n\
              '
      // material.diffuse = max(color.rgb * material.alpha * 3.0, color.rgb);\n\
      // material.alpha = texture2D(image, vec2(1.0 - fract(time - st.s), st.t)).a * color.a;\n\
    }
  },
  /**
   * 带方向的墙体
   * @param {*} options
   */
  _getDirectionWallShader: function (options) {
    if (options && options.get) {
      var materail =
        'czm_material czm_getMaterial(czm_materialInput materialInput)\n\
                  {\n\
                  czm_material material = czm_getDefaultMaterial(materialInput);\n\
                  vec2 st = materialInput.st;\n\
                  \n '
      if (options.freely == 'vertical') {
        //（由下到上）
        materail +=
          'vec4 colorImage = texture(image, vec2(fract(float(' +
          options.count +
          ')*st.t ' +
          options.direction +
          ' time), fract(st.s)));\n '
      } else {
        //（direction顺[-]/逆[+]时针）
        materail +=
          'vec4 colorImage = texture(image, vec2(fract(float(' +
          options.count +
          ')*st.s ' +
          options.direction +
          ' time), fract(st.t)));\n '
      }
      //泛光
      materail +=
        'vec4 fragColor;\n\
                  fragColor.rgb = (colorImage.rgb+color.rgb) / 1.0;\n\
                  fragColor = czm_gammaCorrect(fragColor);\n '

      materail +=
        ' material.diffuse = colorImage.rgb;\n\
                  material.alpha = colorImage.a;\n\
                  material.emission = fragColor.rgb;\n\
                  \n\
                  return material;\n\
                  }\n\
                  '

      return materail
    }
  },
  _getCircleFadeShader: function (options) {
    if (options && options.get) {
      return `czm_material czm_getMaterial(czm_materialInput materialInput)\n                
                  {\n                    
                      czm_material material = czm_getDefaultMaterial(materialInput);\n                    
                      material.diffuse = 1.5 * color.rgb;\n                    
                      vec2 st = materialInput.st;\n                    
                      float dis = distance(st, vec2(0.5, 0.5));\n                    
                      float per = fract(time);\n                    
                      if(dis > per * 0.5){\n                        
                          //material.alpha = 0.0;\n                        
                          discard;\n                    
                      }else {\n                            
                          material.alpha = color.a  * dis / per / 2.0;\n                    
                      }\n                    
                      return material;\n                
                  }`
    }
  },
  // 波动圆
  _getDynamicCircleShader: function (options) {
    if (options && options.get) {
      return 'uniform vec4 color;\n\
              uniform float duration;\n\
              uniform float count;\n\
              uniform float gradient;\n\
              \n\
              czm_material czm_getMaterial(czm_materialInput materialInput)\n\
              {\n\
                  czm_material material = czm_getDefaultMaterial(materialInput);\n\
                  material.diffuse = 1.5 * color.rgb;\n\
                  vec2 st = materialInput.st;\n\
                  vec3 str = materialInput.str;\n\
                  float dis = distance(st, vec2(0.5, 0.5));\n\
                  float per = fract(czm_frameNumber / duration);\n\
                  if(abs(str.z) > 0.001){\n\
                      discard;\n\
                  }\n\
                  if(dis > 0.5){\n\
                      discard;\n\
                  } else {\n\
                      float perDis = 0.5 / count;\n\
                      float disNum;\n\
                      float bl = .0;\n\
                      for (int i = 0; i <= 10; i++) {\n\
                          if (float(i) <= count) {\n\
                              disNum = perDis * float(i) - dis + per / count;\n\
                              if (disNum > 0.0) {\n\
                                  if (disNum < perDis) {\n\
                                      bl = 1.0 - disNum / perDis;\n\
                                  } else if (disNum - perDis < perDis) {\n\
                                      bl = 1.0 - abs(1.0 - disNum / perDis);\n\
                                  }\n\
                                  material.alpha = pow(bl, gradient);\n\
                              }\n\
                          }\n\
                      }\n\
                  }\n\
                  return material;\n\
              }\n\
              '
    }
  },
  // 雷达扫描
  _getRadarScanShader: function (options) {
    if (options && options.get) {
      return (
        'uniform sampler2D colorTexture;\n\
              uniform sampler2D depthTexture;\n\
              in vec2 v_textureCoordinates;\n\
              uniform vec4 u_scanCenterEC;\n\
              uniform vec3 u_scanPlaneNormalEC;\n\
              uniform vec3 u_scanLineNormalEC;\n\
              out vec4 myOutputColor;\n\
              uniform float u_radius;\n\
              uniform vec4 u_scanColor;\n\
              \n\
              vec4 toEye(in vec2 uv, in float depth){\n\
              vec2 xy = vec2((uv.x * 2.0 - 1.0),(uv.y * 2.0 - 1.0));\n\
              vec4 posInCamera =czm_inverseProjection * vec4(xy, depth, 1.0);\n\
              posInCamera =posInCamera / posInCamera.w;\n\
              return posInCamera;\n\
              }\n\
              \n\
              bool isPointOnLineRight(in vec3 ptOnLine, in vec3 lineNormal, in vec3 testPt){\n\
              vec3 v01 = testPt - ptOnLine;\n\
              normalize(v01);\n\
              vec3 temp = cross(v01, lineNormal);\n\
              float d = dot(temp, u_scanPlaneNormalEC);\n\
              return d > 0.5;\n\
              }\n\
              \n\
              vec3 pointProjectOnPlane(in vec3 planeNormal, in vec3 planeOrigin, in vec3 point){\n\
              vec3 v01 = point -planeOrigin;\n\
              float d = dot(planeNormal, v01) ;\n\
              return (point - planeNormal * d);\n\
              }\n\
              \n\
              float distancePointToLine(in vec3 ptOnLine, in vec3 lineNormal, in vec3 testPt){\n\
              vec3 tempPt = pointProjectOnPlane(lineNormal, ptOnLine, testPt);\n\
              return length(tempPt - ptOnLine);\n\
              }\n\
              \n\
              float getDepth(in vec4 depth){\n\
              float z_window = czm_unpackDepth(depth);\n\
              z_window = czm_reverseLogDepth(z_window);\n\
              float n_range = czm_depthRange.near;\n\
              float f_range = czm_depthRange.far;\n\
              return (2.0 * z_window - n_range - f_range) / (f_range - n_range);\n\
              }\n\
              \n\
              void main(){\n\
              myOutputColor = texture(colorTexture, v_textureCoordinates);\n\
              float depth = getDepth( texture(depthTexture, v_textureCoordinates));\n\
              vec4 viewPos = toEye(v_textureCoordinates, depth);\n\
              vec3 prjOnPlane = pointProjectOnPlane(u_scanPlaneNormalEC.xyz, u_scanCenterEC.xyz, viewPos.xyz);\n\
              float dis = length(prjOnPlane.xyz - u_scanCenterEC.xyz);\n\
              float twou_radius = u_radius * 2.0;\n\
              if(dis < u_radius){\n\
                  float f0 = 1.0 -abs(u_radius - dis) / u_radius;\n\
                  f0 = pow(f0, 64.0);\n\
                  vec3 lineEndPt = vec3(u_scanCenterEC.xyz) + u_scanLineNormalEC * u_radius;\n\
                  float f = 0.0;\n\
                  if(isPointOnLineRight(u_scanCenterEC.xyz, u_scanLineNormalEC.xyz, prjOnPlane.xyz)){\n\
                      float dis1= length(prjOnPlane.xyz - lineEndPt);\n\
                      f = abs(twou_radius -dis1) / twou_radius;\n\
                      f = pow(f, float(' +
        options.width +
        '));\n\
                  }\n\
                  if(float(' +
        options.border +
        ') > 0.0){\n\
                    myOutputColor = mix(myOutputColor, u_scanColor, f + f0);\n\
                  } else {\n\
                    myOutputColor = mix(myOutputColor, u_scanColor, f);\n\
                  }\n\
                  }\n\
              }\n\
              '
      )
    }
  },
  // 圆形扫描
  _getCircleScanShader: function (options) {
    if (options && options.get) {
      return (
        'uniform sampler2D colorTexture;\n\
              uniform sampler2D depthTexture;\n\
              in vec2 v_textureCoordinates;\n\
              uniform vec4 u_scanCenterEC;\n\
              uniform vec3 u_scanPlaneNormalEC;\n\
              uniform float u_radius;\n\
              out vec4 myOutputColor;\n\
              uniform vec4 u_scanColor;\n\
              \n\
              vec4 toEye(in vec2 uv, in float depth){\n\
                vec2 xy = vec2((uv.x * 2.0 - 1.0),(uv.y * 2.0 - 1.0));\n\
                vec4 posInCamera = czm_inverseProjection * vec4(xy, depth, 1.0);\n\
                posInCamera =posInCamera / posInCamera.w;\n\
                return posInCamera;\n\
              }\n\
              \n\
              vec3 pointProjectOnPlane(in vec3 planeNormal, in vec3 planeOrigin, in vec3 point){\n\
                  vec3 v01 = point - planeOrigin;\n\
                  float d = dot(planeNormal, v01) ;\n\
                  return (point - planeNormal * d);\n\
              }\n\
              \n\
              float getDepth(in vec4 depth){\n\
                  float z_window = czm_unpackDepth(depth);\n\
                  z_window = czm_reverseLogDepth(z_window);\n\
                  float n_range = czm_depthRange.near;\n\
                  float f_range = czm_depthRange.far;\n\
                  return (2.0 * z_window - n_range - f_range) / (f_range - n_range);\n\
              }\n\
              \n\
              void main(){\n\
                myOutputColor = texture(colorTexture, v_textureCoordinates);\n\
                  float depth = getDepth(texture(depthTexture, v_textureCoordinates));\n\
                  vec4 viewPos = toEye(v_textureCoordinates, depth);\n\
                  vec3 prjOnPlane = pointProjectOnPlane(u_scanPlaneNormalEC.xyz, u_scanCenterEC.xyz, viewPos.xyz);\n\
                  float dis = length(prjOnPlane.xyz - u_scanCenterEC.xyz);\n\
                  if(dis < u_radius){\n\
                    float f = 1.0 - abs(u_radius - dis) / u_radius;\n\
                    f = pow(f, float(' +
        options.border +
        '));\n\
                    myOutputColor = mix(myOutputColor, u_scanColor, f);\n\
                  }\n\
                }\n\
                '
      )
    }
  }
}

export { Shaders }
