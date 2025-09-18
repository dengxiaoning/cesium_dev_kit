vec3 createPointLight(vec3 positionWC){
    // pow(clamp(1.-lightDistance/u_lightRadius,0. ,1.),2. );
    // lightDistance就是当前片元和点光源中心点的距离
    // length可以计算向量模,这里用当前的世界坐标-点光源的世界坐标
    float lightDistance=length(positionWC-u_lightPosition);
    float intensity=pow(clamp(1.-lightDistance/u_lightRadius,0. ,1.),2.);
    return u_lightColor*intensity;
}
vec3 createReflectColor(vec3 normal,vec3 positionEC){
    vec3 worldNormal=normalize(normal);
    vec3 eyeToSurfaceDir=normalize(positionEC);
    vec3 direction=reflect(eyeToSurfaceDir,worldNormal);
    // 使用反射向量的x,z进行贴图,看一下效果
    vec4 color=texture2D(u_envTexture,vec2(direction.x,direction.z));
    return color.rgb;
}
void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material){
    vec3 positionWC=fsInput.attributes.positionWC;
    vec3 normalEC=fsInput.attributes.normalEC;
    // positionEC就是物体在相机坐标系下的坐标，在这里也可以理解为相机--->物体的向量
    vec3 positionEC=fsInput.attributes.positionEC;
    vec3 lightColor=createPointLight(positionWC);
    // 构造反射贴图的函数
    vec3 reflectColor=createReflectColor(normalEC,positionEC);
    // 将模型的颜色应用反射
    material.diffuse=reflectColor;
    vec3 positionMC=fsInput.attributes.positionMC;
    float czm_height=clamp((positionMC.z-380.)/320.,0.0,1.0);
    // 给白膜添加渐变
    material.diffuse*=czm_height;
    // 添加点光源
    material.diffuse+=lightColor;
}