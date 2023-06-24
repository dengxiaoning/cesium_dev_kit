czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;

    if(texture2D(image, vec2(0.0, 0.0)).a == 1.0){
        discard;
    }else{
         material.alpha = texture2D(image, st).a * color.a;
    }

   /* if(texture2D(image, st).a > 0.9){
       material.diffuse = vec3(1.0);
    }else{
     material.diffuse = color.rgb;
    }*/

    material.diffuse = max( material.diffuse* material.alpha * 3.0,  material.diffuse);

    return material;
}