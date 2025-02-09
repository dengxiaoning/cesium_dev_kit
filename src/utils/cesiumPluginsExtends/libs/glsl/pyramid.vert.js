const vertStr = `in vec3 position3DHigh;
in vec3 position3DLow;
in float batchId;
in vec3 position;
in vec2 st;
out vec2 v_st;
uniform vec3 v1;
uniform vec3 v2;

// 罗德里格旋转公式
mat4 RodriguesRotation(vec3 v1, vec3 v2, float theta) {

  vec3 _p = v2 - v1;
  vec3 p = normalize(_p);

  float x = p.x;
  float y = p.y;
  float z = p.z;

  float xy = x * y;
  float xx = x * x;
  float xz = x * z;
  float yy = y * y;
  float yz = y * z;
  float zz = z * z;

  float sintheta = sin(radians(theta));
  float costheta = cos(radians(theta));

  float _m00 = costheta + xx * (1.0 - costheta);
  float _m01 = z * sintheta + xy * (1.0 - costheta);
  float _m02 = -y * sintheta + xz * (1.0 - costheta);
  float _m03 = 0.0;
  float _m10 = -z * sintheta + xy * (1.0 - costheta);
  float _m11 = costheta + yy * (1.0 - costheta);
  float _m12 = x * sintheta + yz * (1.0 - costheta);
  float _m13 = 0.0;
  float _m20 = y * sintheta + xz * (1.0 - costheta);
  float _m21 = -x * sintheta + yz * (1.0 - costheta);
  float _m22 = costheta + zz * (1.0 - costheta);
  float _m23 = 0.0;

  return mat4(_m00, _m01, _m02, _m03, _m10, _m11, _m12, _m13, _m20, _m21, _m22,
              _m23, 0, 0, 0, 1.0);
}

void main() {
  float ty = abs(cos(czm_frameNumber / 60.0)) * 0.3;
  mat4 translateY = mat4(1, 0, 0, 0, 0, 1, 0, ty, 0, 0, 1, 0, 0, 0, 0, 1);
  mat4 roatateAxis = RodriguesRotation(v1, v2, czm_frameNumber);
  //vec4 roatePosition = roatateAxis * vec4(position, 1.0);
  vec4 roatePosition =  vec4(position, 1.0);
  v_st = st;
  gl_Position = czm_projection * czm_modelView * roatePosition * translateY;
}`
export default vertStr
