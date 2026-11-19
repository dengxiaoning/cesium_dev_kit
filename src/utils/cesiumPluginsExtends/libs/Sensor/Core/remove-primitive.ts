
//import Cesium from "Cesium";

var defined = Cesium.defined;



export function removePrimitive(entity: any, hash: any, primitives: any) {
    var data = hash[entity.id];
    if (defined(data)) {
        var primitive = data.primitive;
        primitives.remove(primitive);
        if (primitive&&!primitive.isDestroyed()) {
            primitive.destroy();
        }
        delete hash[entity.id];
    }
};

/* 原实现依赖的运行时全局变量，补充声明以通过类型检查 */
declare var Cesium: any
