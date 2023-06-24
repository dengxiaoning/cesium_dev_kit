import Cesium from "Cesium";
import {ConicArcSensorGraphics} from "./ConicArcSensorGraphics";

var Entity = Cesium.Entity;
var Event = Cesium.Event;
var ConstantPositionProperty = Cesium.ConstantPositionProperty;
var createPropertyDescriptor = Cesium.createPropertyDescriptor;
var DistanceDisplayCondition = Cesium.DistanceDisplayCondition;
var DistanceDisplayConditionGeometryInstanceAttribute = Cesium.DistanceDisplayConditionGeometryInstanceAttribute;

function createConstantPositionProperty(value) {
    return new ConstantPositionProperty(value);
}

function createPositionPropertyDescriptor(name) {
    return createPropertyDescriptor(name, undefined, createConstantPositionProperty);
}

function ConicArcSensor(options) {
    options = options || {};

    this._position = undefined;
    this._orientation = undefined;
    this._show = undefined;

    var conicArcSensor = options.conicArcSensor;
    if (!(conicArcSensor instanceof ConicArcSensorGraphics)) {
        conicArcSensor = new ConicArcSensorGraphics(conicArcSensor);
    }
    this._conicArcSensor = conicArcSensor;


    this._distanceDisplayCondition = new DistanceDisplayCondition();
    this._geometry = undefined;
    this._outlineGeometry = undefined;

    this._definitionChanged = new Event();

    this.merge(options);
}

Object.defineProperties(ConicArcSensor.prototype, {
    position: createPositionPropertyDescriptor('position'),
    orientation: createPropertyDescriptor('orientation'),
    show: createPropertyDescriptor('show'),
});

ConicArcSensor.prototype.merge = function (options) {
    this.position = options.position;
    this.orientation = options.orientation;
    this.show = options.show;
};

ConicArcSensor.prototype.gazeAt = function (entity) {
    if (entity instanceof Entity) {
        this._conicArcSensor.gaze = entity;
    }
};

export {ConicArcSensor};