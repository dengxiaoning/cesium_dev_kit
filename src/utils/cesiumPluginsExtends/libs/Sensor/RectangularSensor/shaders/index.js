const RectangularSensorScanPlaneFS = `#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif

    uniform bool u_showIntersection;
uniform bool u_showThroughEllipsoid;

uniform float u_radius;
uniform float u_xHalfAngle;
uniform float u_yHalfAngle;
uniform float u_normalDirection;
uniform vec4 u_color;

in vec3 v_position;
in vec3 v_positionWC;
in vec3 v_positionEC;
in vec3 v_normalEC;

vec4 getColor(float sensorRadius, vec3 pointEC) {
  czm_materialInput materialInput;

  vec3 pointMC = (czm_inverseModelView * vec4(pointEC, 1.0)).xyz;
  materialInput.st = sensor2dTextureCoordinates(sensorRadius, pointMC);
  materialInput.str = pointMC / sensorRadius;

  vec3 positionToEyeEC = -v_positionEC;
  materialInput.positionToEyeEC = positionToEyeEC;

  vec3 normalEC = normalize(v_normalEC);
  materialInput.normalEC = u_normalDirection * normalEC;

  czm_material material = czm_getMaterial(materialInput);

  material.diffuse = u_color.rgb;
  material.alpha = u_color.a;

  return mix(
      czm_phong(normalize(positionToEyeEC), material, czm_lightDirectionEC),
      vec4(material.diffuse, material.alpha), 0.4);
}

bool isOnBoundary(float value, float epsilon) {
  float width = getIntersectionWidth();
  float tolerance = width * epsilon;

#ifdef GL_OES_standard_derivatives
  float delta = max(abs(dFdx(value)), abs(dFdy(value)));
  float pixels = width * delta;
  float temp = abs(value);
  // There are a couple things going on here.
  // First we test the value at the current fragment to see if it is within the
  // tolerance. We also want to check if the value of an adjacent pixel is
  // within the tolerance, but we don't want to admit points that are obviously
  // not on the surface. For example, if we are looking for "value" to be close
  // to 0, but value is 1 and the adjacent value is 2, then the delta would be 1
  // and "temp - delta" would be "1 - 1" which is zero even though neither of
  // the points is close to zero.
  return temp < tolerance && temp < pixels ||
         (delta < 10.0 * tolerance && temp - delta < tolerance &&
          temp < pixels);
#else
  return abs(value) < tolerance;
#endif
}

vec4 shade(bool isOnBoundary) {
  if (u_showIntersection && isOnBoundary) {
    return getIntersectionColor();
  }
  return getColor(u_radius, v_positionEC);
}

float ellipsoidSurfaceFunction(vec3 inverseRadii, vec3 point) {
  vec3 scaled = inverseRadii * point;
  return dot(scaled, scaled) - 1.0;
}

void main() {
  vec3 sensorVertexWC =
      czm_model[3].xyz; // (0.0, 0.0, 0.0) in model coordinates
  vec3 sensorVertexEC =
      czm_modelView[3].xyz; // (0.0, 0.0, 0.0) in model coordinates

  // vec3 pixDir = normalize(v_position);
  float positionX = v_position.x;
  float positionY = v_position.y;
  float positionZ = v_position.z;

  vec3 zDir = vec3(0.0, 0.0, 1.0);
  vec3 lineX = vec3(positionX, 0, positionZ);
  vec3 lineY = vec3(0, positionY, positionZ);
  float resX = dot(normalize(lineX), zDir);
  if (resX < cos(u_xHalfAngle) - 0.0001) {
    discard;
  }
  float resY = dot(normalize(lineY), zDir);
  if (resY < cos(u_yHalfAngle) - 0.0001) {
    discard;
  }

  // czm_ellipsoid ellipsoid = czm_getWgs84EllipsoidEC();
  float ellipsoidValue =
      ellipsoidSurfaceFunction(czm_ellipsoidInverseRadii, v_positionWC);

  // Occluded by the ellipsoid?
  if (!u_showThroughEllipsoid) {
    // Discard if in the ellipsoid
    // PERFORMANCE_IDEA: A coarse check for ellipsoid intersection could be done
    // on the CPU first.
    if (ellipsoidValue < 0.0) {
      discard;
    }

    // Discard if in the sensor's shadow
    if (inSensorShadow(sensorVertexWC, czm_ellipsoidInverseRadii,
                       v_positionWC)) {
      discard;
    }
  }

  // Notes: Each surface functions should have an associated tolerance based on
  // the floating point error.
  bool isOnEllipsoid = isOnBoundary(ellipsoidValue, czm_epsilon3);
  out_FragColor = shade(isOnEllipsoid);
}`
const RectangularSensorVS = `in vec4 position;
in vec3 normal;

out vec3 v_position;
out vec3 v_positionWC;
out vec3 v_positionEC;
out vec3 v_normalEC;

void main() {
  gl_Position = czm_modelViewProjection * position;
  v_position = vec3(position);
  v_positionWC = (czm_model * position).xyz;
  v_positionEC = (czm_modelView * position).xyz;
  v_normalEC = czm_normal * normal;
}`
const RectangularSensor = `uniform vec4 u_intersectionColor;
uniform float u_intersectionWidth;
uniform vec4 u_lineColor;

bool inSensorShadow(vec3 coneVertexWC, vec3 inverseRadii, vec3 pointWC) {
  // Diagonal matrix from the unscaled ellipsoid space to the scaled space.
  vec3 D = inverseRadii;

  // Sensor vertex in the scaled ellipsoid space
  vec3 q = D * coneVertexWC;
  float qMagnitudeSquared = dot(q, q);
  float test = qMagnitudeSquared - 1.0;

  // Sensor vertex to fragment vector in the ellipsoid's scaled space
  vec3 temp = D * pointWC - q;
  float d = dot(temp, q);

  // Behind silhouette plane and inside silhouette cone
  return (d < -test) && (d / length(temp) < -sqrt(test));
}

///////////////////////////////////////////////////////////////////////////////

vec4 getLineColor() { return u_lineColor; }

vec4 getIntersectionColor() { return u_intersectionColor; }

float getIntersectionWidth() { return u_intersectionWidth; }

vec2 sensor2dTextureCoordinates(float sensorRadius, vec3 pointMC) {
  // (s, t) both in the range [0, 1]
  float t = pointMC.z / sensorRadius;
  float s = 1.0 + (atan(pointMC.y, pointMC.x) / czm_twoPi);
  s = s - floor(s);

  return vec2(s, t);
}`
const RectangularSensorFS = `#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif

    uniform bool u_showIntersection;
uniform bool u_showThroughEllipsoid;

uniform float u_radius;
uniform float u_xHalfAngle;
uniform float u_yHalfAngle;
uniform float u_normalDirection;
uniform float u_type;

in vec3 v_position;
in vec3 v_positionWC;
in vec3 v_positionEC;
in vec3 v_normalEC;

vec4 getColor(float sensorRadius, vec3 pointEC) {
  czm_materialInput materialInput;

  vec3 pointMC = (czm_inverseModelView * vec4(pointEC, 1.0)).xyz;
  materialInput.st = sensor2dTextureCoordinates(sensorRadius, pointMC);
  materialInput.str = pointMC / sensorRadius;

  vec3 positionToEyeEC = -v_positionEC;
  materialInput.positionToEyeEC = positionToEyeEC;

  vec3 normalEC = normalize(v_normalEC);
  materialInput.normalEC = u_normalDirection * normalEC;

  czm_material material = czm_getMaterial(materialInput);

  return mix(
      czm_phong(normalize(positionToEyeEC), material, czm_lightDirectionEC),
      vec4(material.diffuse, material.alpha), 0.4);
}

bool isOnBoundary(float value, float epsilon) {
  float width = getIntersectionWidth();
  float tolerance = width * epsilon;

#ifdef GL_OES_standard_derivatives
  float delta = max(abs(dFdx(value)), abs(dFdy(value)));
  float pixels = width * delta;
  float temp = abs(value);
  // There are a couple things going on here.
  // First we test the value at the current fragment to see if it is within the
  // tolerance. We also want to check if the value of an adjacent pixel is
  // within the tolerance, but we don't want to admit points that are obviously
  // not on the surface. For example, if we are looking for "value" to be close
  // to 0, but value is 1 and the adjacent value is 2, then the delta would be 1
  // and "temp - delta" would be "1 - 1" which is zero even though neither of
  // the points is close to zero.
  return temp < tolerance && temp < pixels ||
         (delta < 10.0 * tolerance && temp - delta < tolerance &&
          temp < pixels);
#else
  return abs(value) < tolerance;
#endif
}

vec4 shade(bool isOnBoundary) {
  if (u_showIntersection && isOnBoundary) {
    return getIntersectionColor();
  }
  if (u_type == 1.0) {
    return getLineColor();
  }
  return getColor(u_radius, v_positionEC);
}

float ellipsoidSurfaceFunction(vec3 inverseRadii, vec3 point) {
  vec3 scaled = inverseRadii * point;
  return dot(scaled, scaled) - 1.0;
}

void main() {
  vec3 sensorVertexWC =
      czm_model[3].xyz; // (0.0, 0.0, 0.0) in model coordinates
  vec3 sensorVertexEC =
      czm_modelView[3].xyz; // (0.0, 0.0, 0.0) in model coordinates

  // vec3 pixDir = normalize(v_position);
  float positionX = v_position.x;
  float positionY = v_position.y;
  float positionZ = v_position.z;

  vec3 zDir = vec3(0.0, 0.0, 1.0);
  vec3 lineX = vec3(positionX, 0, positionZ);
  vec3 lineY = vec3(0, positionY, positionZ);
  float resX = dot(normalize(lineX), zDir);
  if (resX < cos(u_xHalfAngle) - 0.00001) {
    discard;
  }
  float resY = dot(normalize(lineY), zDir);
  if (resY < cos(u_yHalfAngle) - 0.00001) {
    discard;
  }

  // czm_ellipsoid ellipsoid = czm_getWgs84EllipsoidEC();
  float ellipsoidValue =
      ellipsoidSurfaceFunction(czm_ellipsoidInverseRadii, v_positionWC);

  // Occluded by the ellipsoid?
  if (!u_showThroughEllipsoid) {
    // Discard if in the ellipsoid
    // PERFORMANCE_IDEA: A coarse check for ellipsoid intersection could be done
    // on the CPU first.
    if (ellipsoidValue < 0.0) {
      discard;
    }

    // Discard if in the sensor's shadow
    if (inSensorShadow(sensorVertexWC, czm_ellipsoidInverseRadii,
                       v_positionWC)) {
      discard;
    }
  }

  // Notes: Each surface functions should have an associated tolerance based on
  // the floating point error.
  bool isOnEllipsoid = isOnBoundary(ellipsoidValue, czm_epsilon3);
  // isOnEllipsoid = false;
  // if((resX >= 0.8 && resX <= 0.81)||(resY >= 0.8 && resY <= 0.81)){
  /*if(false){
    out_FragColor = vec4(1.0,0.0,0.0,1.0);
  }else{
    out_FragColor = shade(isOnEllipsoid);
  }
*/
out_FragColor = shade(isOnEllipsoid);
}`

export {
  RectangularSensorVS,
  RectangularSensorFS,
  RectangularSensor,
  RectangularSensorScanPlaneFS
}
