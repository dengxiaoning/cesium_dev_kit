import Cesium from 'Cesium';

import {PolylineAttackLinkMaterialProperty} from './MaterialProperty/PolylineAttackLinkMaterialProperty';
import {PolylineArrowLinkMaterialProperty} from './MaterialProperty/PolylineArrowLinkMaterialProperty';
import {PolylineGlowLinkMaterialProperty} from './MaterialProperty/PolylineGlowLinkMaterialProperty';
import {PolylinePulseLinkMaterialProperty} from './MaterialProperty/PolylinePulseLinkMaterialProperty';
import {PolylineTrailLinkMaterialProperty} from './MaterialProperty/PolylineTrailLinkMaterialProperty';
import {ElliposidFadeMaterialProperty} from './MaterialProperty/ElliposidFadeMaterialProperty';

import polylineLinkMaterial from './Shaders/polylineLinkMaterial.glsl';
import polylinePulseMaterial from './Shaders/polylinePulseMaterial.glsl';
import polylineGlowMaterial from './Shaders/polylineGlowMaterial.glsl';
import polylineTrailMaterial from './Shaders/polylineTrailMaterial.glsl';
import ElliposidFadeMaterial from './Shaders/ElliposidFadeMaterial.glsl';
import {util} from '../Core/util';

var Color = Cesium.Color;
var ShaderSource = Cesium.ShaderSource;
var Material = Cesium.Material;
var baseUrl = util.getBaseUrl();

/**
 * 线的攻击特效Material
 */
Material.PolylineAttackLinkType = 'PolylineAttackLink';
Material.PolylineAttackLinkImage = baseUrl + 'Textures/DotTransparent.png';
Material._materialCache.addMaterial(Material.PolylineAttackLinkType, {
    fabric: {
        type: Material.PolylineAttackLinkType,
        uniforms: {
            color: new Color(1, 0, 0, 1.0),
            image: Material.PolylineAttackLinkImage,
            time: 0,
        },
        source: polylineLinkMaterial
    },
    translucent: function () {
        return true;
    }
});

/**
 * 线的箭头特效Material
 */
Material.PolylineArrowLinkType = 'PolylineArrowLink';
Material.PolylineArrowLinkImage = baseUrl + 'Textures/ArrowOpacity.png';
Material._materialCache.addMaterial(Material.PolylineArrowLinkType, {
    fabric: {
        type: Material.PolylineArrowLinkType,
        uniforms: {
            color: new Color(1, 0, 0, 1.0),
            image: Material.PolylineArrowLinkImage,
            time: 0,
        },
        source: polylineLinkMaterial
    },
    translucent: function () {
        return true;
    }
});

/**
 * 线的滋滋滋特效Material
 */
Material.PolylinePulseLinkType = 'PolylinePulseLink';
Material.PolylinePulseLinkImage = baseUrl + 'Textures/LinkPulse.png';
Material._materialCache.addMaterial(Material.PolylinePulseLinkType, {
    fabric: {
        type: Material.PolylinePulseLinkType,
        uniforms: {
            color: new Color(1, 0, 0, 1.0),
            image: Material.PolylinePulseLinkImage,
            time: 0,
        },
        source: polylineLinkMaterial
    },
    translucent: function () {
        return true;
    }
});

Material.PolylineGrowLinkType = 'PolylineGrowLinkType';
Material._materialCache.addMaterial(Material.PolylineGrowLinkType, {
    fabric: {
        type: Material.PolylineGrowLinkType,
        uniforms: {
            glowPower: 0.1,
            color: new Color(1, 0, 0, 1.0)
        },
        source: polylineGlowMaterial
    },
    translucent: function () {
        return true;
    }
});

Material.PolylineTrailLinkType = 'PolylineTrailLinkType';
Material.PolylineTrailLinkImage = baseUrl + 'Textures/LinkTrail.png';
Material._materialCache.addMaterial(Material.PolylineTrailLinkType, {
    fabric: {
        type: Material.PolylineTrailLinkType,
        uniforms: {
            image:Material.PolylineTrailLinkImage,
            color: new Color(1, 0, 0, 1.0)
        },
        source: polylineTrailMaterial
    },
    translucent: function () {
        return true;
    }
});

/**
 * 渐变的气泡
 * @type {string}
 */
Material.EllipsoidFadeType = 'EllipsoidFade';
Material._materialCache.addMaterial(Material.EllipsoidFadeType, {
    fabric: {
        type: Material.EllipsoidFadeType,
        uniforms: {
            color: new Color(1, 0, 0, 1.0),
            time: 1,

        },
        source: ElliposidFadeMaterial
    },
    translucent: function () {
        return true;
    }
});

Cesium.PolylineAttackLinkMaterialProperty = PolylineAttackLinkMaterialProperty;
Cesium.PolylineArrowLinkMaterialProperty = PolylineArrowLinkMaterialProperty;
Cesium.PolylineGlowLinkMaterialProperty = PolylineGlowLinkMaterialProperty;
Cesium.PolylinePulseLinkMaterialProperty = PolylinePulseLinkMaterialProperty;
Cesium.PolylineTrailLinkMaterialProperty = PolylineTrailLinkMaterialProperty;
Cesium.ElliposidFadeMaterialProperty = ElliposidFadeMaterialProperty;
