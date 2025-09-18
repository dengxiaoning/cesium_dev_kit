const nightFs = `
void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
    // 将法线值，直接作为颜色输出，这样可以确定模型的坐标轴
    // material.diffuse = normalize(v_normalMC);
    vec3 positionMC = fsInput.attributes.positionMC;
    // 如果片元在楼顶上，就不用贴图，直接给一个颜色
    if(dot(vec3(0., 0., 1.), v_normalMC) > 0.95) {
        material.diffuse = vec3(0.01, 0.1, 0.1);
    } else {
        // 先尝试使用x,z两个方向上的坐标来贴图
        // z的取值大概是0-500左右，x,y大概是0-200左右的取值
        vec2 uv = vec2(1., 1.);
        // // 确定uv的x轴
        // uv.x=fract(positionMC.x/pictureSize);
        // uv.y=fract(positionMC.z/pictureSize);
        // material.diffuse=texture(u_texture,uv).rgb;
        // 结论：只使用x，z进行贴图，在模型面垂直于x轴的情况下，由于x的变化非常小，所以导致贴图的质量很低
 
        // 所以我们需要判断，x轴和当前面的法向量的夹角
        float dotX = dot(vec3(1.0, 0.0, 0.0), v_normalMC);
        // 当前面和法向量垂直，这时，我们使用y，z贴图,这里注意，还考虑cos为负数的情况
        if(dotX > 0.9 || dotX < -0.9) {
            uv.x = fract(positionMC.y / u_pictureSize);
        } else {
            uv.x = fract(positionMC.x / u_pictureSize);
        }
        uv.y = fract(positionMC.z / u_pictureSize);
        material.diffuse = texture(u_texture, uv).rgb;
    }
}`

export {nightFs}