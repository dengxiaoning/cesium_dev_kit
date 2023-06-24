import Cesium from 'Cesium';
import {util} from '../../Core/util';

var Color = Cesium.Color;
var defaultValue = Cesium.defaultValue;
var defined = Cesium.defined;
var defineProperties = Cesium.defineProperties;
var Event = Cesium.Event;
var createPropertyDescriptor = Cesium.createPropertyDescriptor;
var Property = Cesium.Property;
var Material = Cesium.Material;

var defaultColor = Color.WHITE;

function PolylineTrailLinkMaterialProperty(options) {
    options = defaultValue(options, defaultValue.EMPTY_OBJECT);

    this._definitionChanged = new Event();
    this._color = undefined;
    this._colorSubscription = undefined;

    this.color = options.color;

    this._time = undefined;
}

defineProperties(PolylineTrailLinkMaterialProperty.prototype, {
    /**
     * Gets a value indicating if this property is constant.  A property is considered
     * constant if getValue always returns the same result for the current definition.
     * @memberof PolylineGlowMaterialProperty.prototype
     * @type {Boolean}
     * @readonly
     */
    isConstant: {
        get: function () {
            return false;
        }
    },
    /**
     * Gets the event that is raised whenever the definition of this property changes.
     * The definition is considered to have changed if a call to getValue would return
     * a different result for the same time.
     * @memberof PolylineGlowMaterialProperty.prototype
     * @type {Event}
     * @readonly
     */
    definitionChanged: {
        get: function () {
            return this._definitionChanged;
        }
    },
    /**
     * Gets or sets the Property specifying the {@link Color} of the line.
     * @memberof PolylineGlowMaterialProperty.prototype
     * @type {Property}
     */
    color: createPropertyDescriptor('color')
});

/**
 * Gets the {@link Material} type at the provided time.
 *
 * @param {JulianDate} time The time for which to retrieve the type.
 * @returns {String} The type of material.
 */
PolylineTrailLinkMaterialProperty.prototype.getType = function (time) {
    return Material.PolylineTrailLinkType;
};

/**
 * Gets the value of the property at the provided time.
 *
 * @param {JulianDate} time The time for which to retrieve the value.
 * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
 * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
 */
PolylineTrailLinkMaterialProperty.prototype.getValue = function (time, result) {
    if (!defined(result)) {
        result = {};
    }
    result.color = Property.getValueOrClonedDefault(this._color, time, defaultColor, result.color);
    result.image = Material.PolylineTrailLinkImage;
    return result;
};

/**
 * Compares this property to the provided property and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Property} [other] The other property.
 * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
PolylineTrailLinkMaterialProperty.prototype.equals = function (other) {
    return this === other || //
        (other instanceof PolylineTrailLinkMaterialProperty &&
        Property.equals(this._color, other._color));
};

export {PolylineTrailLinkMaterialProperty};

