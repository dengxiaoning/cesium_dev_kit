

    
const   PointLightClass =function(Cesium,lightSource){
  const MaterialType = 'PointLight'
const PointLightCustomMaterial = function () {

      };  

PointLightCustomMaterial.prototype.getType = function () {
        return MaterialType;
      };

Cesium.Material._materialCache.addMaterial(MaterialType, {
           fabric: {
          type: MaterialType,
          uniforms: {
            color: new Cesium.Color(1.0, 1.0, 0.0, 0.3), // 点光源颜色
            lightPosition: () => {
              return lightSource.position.getValue(new Cesium.JulianDate()); // 获取光源位置

            }
          },
          source: `
            czm_material czm_getMaterial(czm_materialInput materialInput) {
                czm_material material = czm_getDefaultMaterial(materialInput);
                vec3 lightDir = normalize(u_lightPosition - czm_inverseView * materialInput.positionMC);
                float lightStrength = pow(dot(materialInput.normalEC, lightDir), 50.0); // 点光源强度模拟
                material.diffuse = vec3(lightStrength) * u_color; // 应用颜色和强度
                material.alpha = 0.4; // 不透明度
                return material;
            }
        `
        }
});
  return PointLightCustomMaterial()
}
export {PointLightClass}