import Cesium from 'Cesium';
var defaultValue = Cesium.defaultValue,
    defined = Cesium.defined,
    defineProperties = Cesium.defineProperties,
    DeveloperError = Cesium.DeveloperError,
    Event = Cesium.Event,
    createMaterialPropertyDescriptor = Cesium.createMaterialPropertyDescriptor,
    createPropertyDescriptor = Cesium.createPropertyDescriptor;

function ConicArcSensorGraphics(options) {
    this._angle = undefined;
    this._angleSubscription = undefined;
    this._radius = undefined;
    this._radiusSubscription = undefined;
    this._stack = undefined;
    this._stackSubscription = undefined;
    this._slice = undefined;
    this._sliceSubscription = undefined;
    this._color = undefined;
    this._colorSubscription = undefined;
    this._show = undefined;
    this._showSubscription = undefined;
    this._fill = undefined;
    this._fillSubscription = undefined;
    this._color = undefined;
    this._colorSubscription = undefined;
    this._material = undefined;
    this._materialSubscription = undefined;
    this._outline = undefined;
    this._outlineSubscription = undefined;
    this._outlineColor = undefined;
    this._outlineColorSubscription = undefined;
    this._outlineWidth = undefined;
    this._outlineWidthSubscription = undefined;
    this._shadows = undefined;
    this._shadowsSubscription = undefined;
    this._distanceDisplayCondition = undefined;
    this._distanceDisplayConditionSubscription = undefined;
    this._definitionChanged = new Event();

    this._gaze = undefined;
    this._gazeSubscription = undefined;

    this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
}

defineProperties(ConicArcSensorGraphics.prototype, {
    /**
     * Gets the event that is raised whenever a property or sub-property is changed or modified.
     * @memberof BoxGraphics.prototype
     * @type {Event}
     * @readonly
     */
    definitionChanged: {
        get: function () {
            return this._definitionChanged;
        }
    },

    /**
     * Gets or sets the boolean Property specifying the visibility of the box.
     * @memberof BoxGraphics.prototype
     * @type {Property}
     * @default true
     */
    show: createPropertyDescriptor('show'),

   /* angle: createPropertyDescriptor('angle'),

    radius: createPropertyDescriptor('radius'),

    stack: createPropertyDescriptor('stack'),

    slice: createPropertyDescriptor('slice'),

    color: createPropertyDescriptor('color'),*/

    /**
     * Gets or sets the material used to fill the box.
     * @memberof BoxGraphics.prototype
     * @type {MaterialProperty}
     * @default Color.WHITE
     */
    material: createMaterialPropertyDescriptor('material'),

    /**
     * Gets or sets the boolean Property specifying whether the box is filled with the provided material.
     * @memberof BoxGraphics.prototype
     * @type {Property}
     * @default true
     */
    fill: createPropertyDescriptor('fill'),

    /**
     * Gets or sets the Property specifying whether the box is outlined.
     * @memberof BoxGraphics.prototype
     * @type {Property}
     * @default false
     */
    //outline: createPropertyDescriptor('outline'),

    /**
     * Gets or sets the Property specifying the {@link Color} of the outline.
     * @memberof BoxGraphics.prototype
     * @type {Property}
     * @default Color.BLACK
     */
    //outlineColor: createPropertyDescriptor('outlineColor'),

    /**
     * Gets or sets the numeric Property specifying the width of the outline.
     * @memberof BoxGraphics.prototype
     * @type {Property}
     * @default 1.0
     */
    //outlineWidth: createPropertyDescriptor('outlineWidth'),

    /**
     * Get or sets the enum Property specifying whether the box
     * casts or receives shadows from each light source.
     * @memberof BoxGraphics.prototype
     * @type {Property}
     * @default ShadowMode.DISABLED
     */
    shadows: createPropertyDescriptor('shadows'),

    /**
     * Gets or sets the {@link DistanceDisplayCondition} Property specifying at what distance from the camera that this box will be displayed.
     * @memberof BoxGraphics.prototype
     * @type {Property}
     */
    distanceDisplayCondition: createPropertyDescriptor('distanceDisplayCondition'),
});

ConicArcSensorGraphics.prototype.clone = function (result) {
    if (!defined(result)) {
        return new ConicArcSensorGraphics(this);
    }
    result.angle = this.angle;
    result.radius = this.radius;
    result.stack = this.stack;
    result.slice = this.slice;
    result.show = this.show;
    result.material = this.material;
    result.color = this.color;
    result.fill = this.fill;
    result.outline = this.outline;
    result.outlineColor = this.outlineColor;
    result.outlineWidth = this.outlineWidth;
    result.shadows = this.shadows;
    result.distanceDisplayCondition = this.distanceDisplayCondition;
    result.gaze = this.gaze;
    return result;
};

ConicArcSensorGraphics.prototype.merge = function (source) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(source)) {
        throw new DeveloperError('source is required.');
    }
    //>>includeEnd('debug');

    this.angle = defaultValue(this.angle, source.angle);
    this.radius = defaultValue(this.radius, source.radius);
    this.stack = defaultValue(this.stack, source.stack);
    this.slice = defaultValue(this.slice, source.slice);
    this.show = defaultValue(this.show, source.show);
    this.color = defaultValue(this.color, source.color);
    this.material = defaultValue(this.material, source.material);
    this.fill = defaultValue(this.fill, source.fill);
    this.outline = defaultValue(this.outline, source.outline);
    this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
    this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
    this.shadows = defaultValue(this.shadows, source.shadows);
    this.distanceDisplayCondition = defaultValue(this.distanceDisplayCondition, source.distanceDisplayCondition);
    this.gaze = defaultValue(this.gaze, source.gaze);
};

export {ConicArcSensorGraphics};
