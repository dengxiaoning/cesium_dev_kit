import Cesium from 'Cesium';

var BoundingSphere = Cesium.BoundingSphere,
    Cartesian3 = Cesium.Cartesian3,
    Check = Cesium.Check,
    ComponentDatatype = Cesium.ComponentDatatype,
    defaultValue = Cesium.defaultValue,
    defined = Cesium.defined,
    Geometry = Cesium.Geometry,
    GeometryAttribute = Cesium.GeometryAttribute,
    GeometryAttributes = Cesium.GeometryAttributes,
    PrimitiveType = Cesium.PrimitiveType,
    VertexFormat = Cesium.VertexFormat,
    CesiumMath = Cesium.Math,
    GeometryPipeline = Cesium.GeometryPipeline,
    IndexDatatype = Cesium.IndexDatatype,
    Ellipsoid = Cesium.Ellipsoid;

var cos = Math.cos;
var sin = Math.sin;

function ConicArcSensorGeometry(options) {
    options = defaultValue(options, defaultValue.EMPTY_OBJECT);

    var angle = options.angle;
    var radius = options.radius;

    var stackPartitions = Math.round(defaultValue(options.stackPartitions, 12));
    var slicePartitions = Math.round(defaultValue(options.slicePartitions, 64));

    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number('angle', angle);
    Check.typeOf.number('radius', radius);
    //>>includeEnd('debug');

    var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);

    this._angle = angle;
    this._radius = radius;
    this._stackPartitions = stackPartitions;
    this._slicePartitions = slicePartitions;
    this._vertexFormat = vertexFormat;
}

ConicArcSensorGeometry.fromDimensions = function (options) {
    options = defaultValue(options, defaultValue.EMPTY_OBJECT);
    var angle = options.angle;
    var radius = options.radius;
    var stackPartitions = options.stackPartitions;
    var slicePartitions = options.slicePartitions;

    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number('angle', angle);
    Check.typeOf.number('radius', radius);
    Check.typeOf.number.greaterThanOrEquals('angle', angle, 0);
    Check.typeOf.number.greaterThanOrEquals('height', height, 0);
    //>>includeEnd('debug');

    return new ConicArcSensorGeometry({
        angle: angle,
        radius: radius,
        stackPartitions: stackPartitions,
        slicePartitions: slicePartitions,
        vertexFormat: options.vertexFormat
    });
};

ConicArcSensorGeometry.createGeometry = function (conicSensorGeometry) {
    console.time('createGeometry');

    var angle = conicSensorGeometry._angle;
    var radius = conicSensorGeometry._radius;
    var stackPartitions = conicSensorGeometry._stackPartitions + 1;
    var slicePartitions = conicSensorGeometry._slicePartitions + 1;
    var vertexFormat = conicSensorGeometry._vertexFormat;

    var attributes = new GeometryAttributes();

    var bottomIndex;

    var numIndices = 3 * (slicePartitions - 1) + 6 * (slicePartitions - 1) * (stackPartitions - 2) + (slicePartitions - 1) * 1 * 3;
    var vertexCount = stackPartitions * slicePartitions;
    var indices = IndexDatatype.createTypedArray(vertexCount, numIndices);
    var positions = new Float64Array(vertexCount * 3 + (slicePartitions - 1) * 3 * 3);

    if (vertexFormat.position) {
        var positionIndex = 0;

        //bottom plat
        var cosTheta = new Array(slicePartitions);
        var sinTheta = new Array(slicePartitions);

        for (var i = 0; i < slicePartitions; i++) {
            var theta = CesiumMath.TWO_PI * i / (slicePartitions - 1);
            cosTheta[i] = cos(theta);
            sinTheta[i] = sin(theta);

            positions[positionIndex++] = 0.0;
            positions[positionIndex++] = 0.0;
            positions[positionIndex++] = -radius;
        }

        for (i = 1; i < stackPartitions; i++) {
            var phi = angle * i / (stackPartitions - 1);
            var sinPhi = sin(phi);

            var xSinPhi = radius * sinPhi;
            var ySinPhi = radius * sinPhi;
            var zCosPhi = radius * cos(phi);

            for (var j = 0; j < slicePartitions; j++) {
                positions[positionIndex++] = cosTheta[j] * xSinPhi;
                positions[positionIndex++] = sinTheta[j] * ySinPhi;
                positions[positionIndex++] = -zCosPhi;
            }
        }

        //side plat
        bottomIndex = positionIndex;
        for (var i = 0; i < slicePartitions - 1; i++) {
            positions[positionIndex++] = 0;
            positions[positionIndex++] = 0;
            positions[positionIndex++] = 0;

            positions[positionIndex++] = positions[bottomIndex - (slicePartitions - i - 1) * 3];
            positions[positionIndex++] = positions[bottomIndex - (slicePartitions - i - 1) * 3 + 1];
            positions[positionIndex++] = positions[bottomIndex - (slicePartitions - i - 1) * 3 + 2];

            positions[positionIndex++] = positions[bottomIndex - (slicePartitions - i) * 3];
            positions[positionIndex++] = positions[bottomIndex - (slicePartitions - i) * 3 + 1];
            positions[positionIndex++] = positions[bottomIndex - (slicePartitions - i) * 3 + 2];
        }

        attributes.position = new GeometryAttribute({
            componentDatatype: ComponentDatatype.DOUBLE,
            componentsPerAttribute: 3,
            values: positions
        });
    }

    var indicesIndex = 0;

    //bottom plat
    for (var j = 0; j < slicePartitions - 1; j++) {
        indices[indicesIndex++] = slicePartitions + j;
        indices[indicesIndex++] = slicePartitions + j + 1;
        indices[indicesIndex++] = j + 1;
    }

    var topOffset;
    var bottomOffset;
    for (var i = 1; i < stackPartitions - 1; i++) {
        topOffset = i * slicePartitions;
        bottomOffset = (i + 1) * slicePartitions;

        for (j = 0; j < slicePartitions - 1; j++) {
            indices[indicesIndex++] = bottomOffset + j;
            indices[indicesIndex++] = bottomOffset + j + 1;
            indices[indicesIndex++] = topOffset + j + 1;

            indices[indicesIndex++] = bottomOffset + j;
            indices[indicesIndex++] = topOffset + j + 1;
            indices[indicesIndex++] = topOffset + j;
        }
    }

    //side plat
    for (var i = 0, len = (slicePartitions - 1) * 3; i < len; i++) {
        indices[indicesIndex++] = i + bottomIndex / 3;
    }


    var geometry = new Geometry({
        attributes: attributes,
        indices: indices,
        primitiveType: PrimitiveType.TRIANGLES,
        boundingSphere: new BoundingSphere(Cartesian3.ZERO, radius)
    });
    geometry = GeometryPipeline.computeNormal(geometry);
    console.timeEnd('createGeometry');
    return geometry;
};

export {ConicArcSensorGeometry}
