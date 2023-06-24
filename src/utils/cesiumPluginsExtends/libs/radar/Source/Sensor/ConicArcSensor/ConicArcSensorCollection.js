import Cesium from "Cesium";
import {ConicArcSensorGeometry} from "./ConicArcSensorGeometry";
import {ConicArcSensorOutlineGeometry} from "./ConicArcSensorOutlineGeometry";
import {ConicArcSensor} from "./ConicArcSensor";

var defaultValue = Cesium.defaultValue;
var defined = Cesium.defined;
var Viewer = Cesium.Viewer;
var Transforms = Cesium.Transforms;
var DeveloperError = Cesium.DeveloperError;
var ColorGeometryInstanceAttribute = Cesium.ColorGeometryInstanceAttribute;
var Color = Cesium.Color;
var Primitive = Cesium.Primitive;
var PerInstanceColorAppearance = Cesium.PerInstanceColorAppearance;
var Cartesian3 = Cesium.Cartesian3;
var VertexFormat = Cesium.VertexFormat;
var Quaternion = Cesium.Quaternion;
var Matrix3 = Cesium.Matrix3;
var Matrix4 = Cesium.Matrix4;
var Property = Cesium.Property;
var Event = Cesium.Event;
var DistanceDisplayCondition = Cesium.DistanceDisplayCondition;
var DistanceDisplayConditionGeometryInstanceAttribute = Cesium.DistanceDisplayConditionGeometryInstanceAttribute;

function ConicArcSensorCollection(viewer) {
    var self = this;
    if (!defined(viewer)) {
        throw new DeveloperError('viewer is required.');
    }

    this._viewer = viewer;

    var scene = viewer.scene;
    this._scene = scene;

    var clock = viewer.clock;
    this._clock = clock;

    this._primitives = scene.primitives;
    this._primitive = undefined;
    this._outlinePrimitive = undefined;

    this._conicArcSensorCollection = [];

    clock.onTick.addEventListener(function () {
        self.update();
    });
}

var matrix3Scratch = new Matrix3();
var matrix4Scratch = new Matrix4();
var positionScratch = new Cartesian3();
var targetPositionScratch = new Cartesian3();
var diffVectorScratch = new Cartesian3();
var orientationScratch = new Quaternion();

ConicArcSensorCollection.prototype.add = function (conicArcSensor) {

    if (!(conicArcSensor instanceof ConicArcSensor)) {
        conicArcSensor = new ConicArcSensor(conicArcSensor);
    }

    this._conicArcSensorCollection.push(conicArcSensor);

    return conicArcSensor;
};

ConicArcSensorCollection.prototype.remove = function (conicArcSensor) {
    var index = this._conicArcSensorCollection.indexOf(conicArcSensor);
    if (index !== -1) {
        this._conicArcSensorCollection.splice(index, 1);
    }
};

ConicArcSensorCollection.prototype.removeAll = function () {
    this._conicArcSensorCollection.length = 0;
};

ConicArcSensorCollection.prototype.update = function () {
    var time = this._clock.currentTime;

    var conicArcSensorCollection = this._conicArcSensorCollection;
    var primitives = this._primitives;
    var primitive = this._primitive;
    var outlinePrimitive = this._outlinePrimitive;
    var instances = [];
    var outlineInstances = [];

    if (defined(primitive)) {
        primitives.removeAndDestroy(primitive);
    }
    if (defined(outlinePrimitive)) {
        primitives.removeAndDestroy(outlinePrimitive);
    }

    for (var i = 0, len = conicArcSensorCollection.length; i < len; i++) {
        var entity = conicArcSensorCollection[i];
        var conicArcSensor = entity._conicArcSensor;

        if (!Property.getValueOrDefault(conicArcSensor.show, time, true)) {
            continue;
        }

        var angle = conicArcSensor.angle;
        var radius = conicArcSensor.radius;
        var stack = conicArcSensor.stack;
        var slice = conicArcSensor.slice;

        if (!defined(angle)) {
            continue;
        }

        var show = Property.getValueOrDefault(entity.show, time, true);
        if (!show) {
            continue;
        }

        var position = Property.getValueOrUndefined(entity.position, time, positionScratch);

        if (!defined(position)) {
            continue;
        }

        var modelMatrix;
        var gaze = conicArcSensor.gaze;
        if (defined(gaze)) {
            //ignore original orientation
            var targetPosition = Property.getValueOrUndefined(gaze.position, time, targetPositionScratch);

            if (!defined(position) || !defined(targetPosition)) {
                continue;
            }

            var diffVector = Cartesian3.subtract(position, targetPosition, diffVectorScratch);
            var rotate = Cartesian3.angleBetween(Cesium.Cartesian3.UNIT_Z, diffVector);
            var cross = Cartesian3.cross(Cesium.Cartesian3.UNIT_Z, diffVector, diffVectorScratch);
            //朝上
            //var orientation = Quaternion.fromAxisAngle(cross, (rotate - Math.PI), orientationScratch);
            var orientation = Quaternion.fromAxisAngle(cross, rotate, orientationScratch);

            //replace original dimensions
            var distance = Cartesian3.distance(position, targetPosition);

            radius = 1;
            modelMatrix = Matrix4.fromRotationTranslation(
                Cesium.Matrix3.multiplyByScalar(Matrix3.fromQuaternion(orientation, matrix3Scratch), distance, matrix3Scratch),
                position, matrix4Scratch);

        } else {
            var orientation = Property.getValueOrUndefined(entity.orientation, time, orientationScratch);
            if (!defined(orientation)) {
                modelMatrix = Transforms.eastNorthUpToFixedFrame(position, undefined, matrix4Scratch);
            } else {
                modelMatrix = Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(orientation, matrix3Scratch), position, matrix4Scratch);
            }
        }

        if (!defined(modelMatrix)) {
            continue;
        }

        var geometry = entity._geometry;
        if (!defined(geometry)) {
            var conic;
            conic = new ConicArcSensorGeometry({
                vertexFormat: Cesium.VertexFormat.POSITION_AND_NORMAL,
                angle: angle,
                radius: radius,
                stackPartitions: stack,
                slicePartitions: slice,
            });
            entity._geometry = ConicArcSensorGeometry.createGeometry(conic);
            geometry = entity._geometry;
        }

        //var distanceDisplayCondition = Property.getValueOrDefault(conicArcSensor.distanceDisplayCondition, time, entity._distanceDisplayCondition);
        //var distanceDisplayConditionAttribute = DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition);
        //var shadows = Property.getValueOrDefault(conicArcSensor.shadows, time, ShadowMode.DISABLED);
        var color = conicArcSensor.color;
        var outline = conicArcSensor.outline;
        var outlineWidth = conicArcSensor.outlineWidth;
        if (!defined(outlineWidth)) {
            outlineWidth = 1;
        }
        var outlineColor = conicArcSensor.outlineColor;
        if (!defined(outlineColor)) {
            outlineColor = Color.WHITE;
        }

        var instance = new Cesium.GeometryInstance({
            geometry: geometry,
            modelMatrix: modelMatrix,
            attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(color),
                //distanceDisplayCondition: distanceDisplayConditionAttribute
            }
        });
        instances.push(instance);

        if (outline) {
            var outlineGeometry = entity._outlineGeometry;
            if (!defined(outlineGeometry)) {
                var conicOutline;
                conicOutline = new ConicArcSensorOutlineGeometry({
                    vertexFormat: Cesium.VertexFormat.POSITION_ONLY,
                    angle: angle,
                    radius: radius
                });
                entity._outlineGeometry = ConicArcSensorOutlineGeometry.createGeometry(conicOutline);
                outlineGeometry = entity._outlineGeometry;
            }

            var instance = new Cesium.GeometryInstance({
                geometry: outlineGeometry,
                modelMatrix: modelMatrix,
                attributes: {
                    color: Cesium.ColorGeometryInstanceAttribute.fromColor(outlineColor),
                    //distanceDisplayCondition: distanceDisplayConditionAttribute
                }
            });
            outlineInstances.push(instance);
        }
    }

    if (instances.length > 0) {
        this._primitive = this._primitives.add(new Primitive({
            asynchronous: false,
            geometryInstances: instances,
            appearance: new PerInstanceColorAppearance({
                flat: false,
                translucent: true,
                closed: true
            })
        }));
    }

    if (outlineInstances.length > 0) {
        this._outlinePrimitive = this._primitives.add(new Primitive({
            asynchronous: false,
            geometryInstances: outlineInstances,
            appearance: new PerInstanceColorAppearance({
                flat: true,
                translucent: true,
                renderState: {
                    lineWidth: this._scene.clampLineWidth(outlineWidth)
                }
            })
        }));
    }
};

export {ConicArcSensorCollection};