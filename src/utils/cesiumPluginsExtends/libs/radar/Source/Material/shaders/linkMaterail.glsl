czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;
    material.diffuse = color.rgb;

    if(texture2D(image, vec2(0.0, 0.0)).a == 1.0){
        material.alpha = 0.0;
    }else{
         material.alpha = texture2D(image, vec2(1.0 - fract(time - st.s), st.t)).a * color.a;
    }
    return material;
}