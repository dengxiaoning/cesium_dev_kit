import Cesium from 'Cesium';

var BoundingSphere = Cesium.BoundingSphere,
    Cartesian3 = Cesium.Cartesian3,
    ComponentDatatype = Cesium.ComponentDatatype,
    defaultValue = Cesium.defaultValue,
    defined = Cesium.defined,
    DeveloperError = Cesium.DeveloperError,
    Ellipsoid = Cesium.Ellipsoid,
    Geometry = Cesium.Geometry,
    GeometryAttribute = Cesium.GeometryAttribute,
    GeometryAttributes = Cesium.GeometryAttributes,
    IndexDatatype = Cesium.IndexDatatype,
    CesiumMath = Cesium.Math,
    PrimitiveType = Cesium.PrimitiveType;

var defaultRadii = new Cartesian3(1.0, 1.0, 1.0);
var cos = Math.cos;
var sin = Math.sin;

function ConicArcSensorOutlineGeometry(options) {
    options = defaultValue(options, defaultValue.EMPTY_OBJECT);

    var angle = options.angle;
    var radius = options.radius;

    var stackPartitions = Math.round(defaultValue(options.stackPartitions, 10));
    var slicePartitions = Math.round(defaultValue(options.slicePartitions, 8));
    var subdivisions = Math.round(defaultValue(options.subdivisions, 128));

    //>>includeStart('debug', pragmas.debug);
    if (stackPartitions < 1) {
        throw new DeveloperError('options.stackPartitions cannot be less than 1');
    }
    if (slicePartitions < 0) {
        throw new DeveloperError('options.slicePartitions cannot be less than 0');
    }
    if (subdivisions < 0) {
        throw new DeveloperError('options.subdivisions must be greater than or equal to zero.');
    }
    //>>includeEnd('debug');

    this._angle = angle;
    this._radius = radius;
    this._stackPartitions = stackPartitions;
    this._slicePartitions = slicePartitions;
    this._subdivisions = subdivisions;
}

ConicArcSensorOutlineGeometry.createGeometry = function (conicSensorGeometry) {

    var angle = conicSensorGeometry._angle;
    var radius = conicSensorGeometry._radius;

    if (radius <= 0 || angle <= 0) {
        return;
    }

    var stackPartitions = conicSensorGeometry._stackPartitions;
    var slicePartitions = conicSensorGeometry._slicePartitions;
    var subdivisions = conicSensorGeometry._subdivisions;

    var indicesSize = subdivisions * (stackPartitions + slicePartitions - 1);
    var positionSize = indicesSize - slicePartitions + 2;
    var positions = new Float64Array(positionSize * 3);
    var indices = IndexDatatype.createTypedArray(positionSize, indicesSize * 2);

    var i;
    var j;
    var theta;
    var phi;
    var cosPhi;
    var sinPhi;
    var index = 0;

    var cosTheta = new Array(subdivisions);
    var sinTheta = new Array(subdivisions);
    for (i = 0; i < subdivisions; i++) {
        theta = CesiumMath.TWO_PI * i / subdivisions;
        cosTheta[i] = cos(theta);
        sinTheta[i] = sin(theta);
    }

    for (i = 1; i < stackPartitions; i++) {
        phi = angle * i / (stackPartitions - 1);
        cosPhi = cos(phi);
        sinPhi = sin(phi);

        for (j = 0; j < subdivisions; j++) {
            positions[index++] = radius * cosTheta[j] * sinPhi;
            positions[index++] = radius * sinTheta[j] * sinPhi;
            positions[index++] = -radius * cosPhi;
        }
    }

    cosTheta.length = slicePartitions;
    sinTheta.length = slicePartitions;
    for (i = 0; i < slicePartitions; i++) {
        theta = CesiumMath.TWO_PI * i / slicePartitions;
        cosTheta[i] = cos(theta);
        sinTheta[i] = sin(theta);
    }

    positions[index++] = 0;
    positions[index++] = 0;
    positions[index++] = -radius;

    for (i = 1; i < subdivisions; i++) {
        phi = angle * i / subdivisions;
        cosPhi = cos(phi);
        sinPhi = sin(phi);

        for (j = 0; j < slicePartitions; j++) {
            positions[index++] = radius * cosTheta[j] * sinPhi;
            positions[index++] = radius * sinTheta[j] * sinPhi;
            positions[index++] = -radius * cosPhi;
        }
    }

    /*positions[index++] = 0;
     positions[index++] = 0;
     positions[index++] = -radii.z;*/

    index = 0;
    for (i = 0; i < stackPartitions - 1; ++i) {
        var topRowOffset = (i * subdivisions);
        for (j = 0; j < subdivisions - 1; ++j) {
            indices[index++] = topRowOffset + j;
            indices[index++] = topRowOffset + j + 1;
        }

        indices[index++] = topRowOffset + subdivisions - 1;
        indices[index++] = topRowOffset;
    }

    var sliceOffset = subdivisions * (stackPartitions - 1);
    for (j = 1; j < slicePartitions + 1; ++j) {
        indices[index++] = sliceOffset;
        indices[index++] = sliceOffset + j;
    }

    for (i = 0; i < subdivisions - 2; ++i) {
        var topOffset = (i * slicePartitions) + 1 + sliceOffset;
        var bottomOffset = ((i + 1) * slicePartitions) + 1 + sliceOffset;

        for (j = 0; j < slicePartitions - 1; ++j) {
            indices[index++] = bottomOffset + j;
            indices[index++] = topOffset + j;
        }

        indices[index++] = bottomOffset + slicePartitions - 1;
        indices[index++] = topOffset + slicePartitions - 1;
    }

    /*var lastPosition = positions.length / 3 - 1;
     for (j = lastPosition - 1; j > lastPosition - slicePartitions - 1; --j) {
     indices[index++] = lastPosition;
     indices[index++] = j;
     }*/

    var attributes = new GeometryAttributes({
        position: new GeometryAttribute({
            componentDatatype: ComponentDatatype.DOUBLE,
            componentsPerAttribute: 3,
            values: positions
        })
    });

    return new Geometry({
        attributes: attributes,
        indices: indices,
        primitiveType: PrimitiveType.LINES,
        boundingSphere: new BoundingSphere(Cartesian3.ZERO, radius)
    });
};

export {ConicArcSensorOutlineGeometry}
