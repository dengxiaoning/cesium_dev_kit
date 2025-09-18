const scanFs = `void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material){
    // 1.尝试在模型的中间生成一条光带
    vec3 positionMC=fsInput.attributes.positionMC;
    // czm_height取值范围在0-1之间,由于模型在地下有一段高度groundHeight，所以需要减去
    float czm_height=clamp((positionMC.z-groundHeight)/maxHeight,0.0,1.0);
    // 通过czm_height能够很快速的确定片元的高度
    // if(czm_height>0.5 && czm_height<0.505){
    //     material.diffuse=vec3(1.,1.,1.);
    // }else{
    //     material.diffuse=vec3(0.01,0.1,0.1);
    // }
    // 假设我们只需要一条固定光带 宽度为0.05
    // 将0.5变为iTime，这样可以让光带动起来
    float iTime=czm_frameNumber/120.;
    // 可以将iTime修改为一个来回运动的函数，这样光带的运动轨迹也是来回运动的
    iTime=abs(fract(iTime)*2.-1.);
    float czm_diff = step(u_scanWidth, abs(czm_height - iTime));
    // 添加渐变色,czm_height就是渐变因子
    material.diffuse=mix(vec3(0.1,1.0,0.2),vec3(1.,1.,1.),czm_height);
    material.diffuse += (material.diffuse * (1.0 - czm_diff)*3.0);
}`
export {scanFs}