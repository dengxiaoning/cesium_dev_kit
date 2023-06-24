import Cesium from "Cesium";

var defined = Cesium.defined;

export function removePrimitive(entity, hash, primitives) {
    var data = hash[entity.id];
    if (defined(data)) {
        var primitive = data.primitive;
        primitives.remove(primitive);
        if (!primitive.isDestroyed()) {
            primitive.destroy();
        }
        delete hash[entity.id];
    }
};