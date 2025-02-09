const fragStr = `in vec2 v_st;
uniform sampler2D wenli;
uniform vec2 iResolution;
void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float r = 0.01;
  // 使用length 实现圆弧光带
  uv.x *= iResolution.x / iResolution.y;
  float d = length(uv);
  r = abs(sin(r * czm_frameNumber) * iResolution.x / iResolution.y);
  vec4 wenli = texture(wenli, v_st);
  vec4 centerColor = vec4(0.0, 255.0, 0.0, 1.0);
  float ratio =
      smoothstep(r, r + 0.02, d) - smoothstep(r + 0.0029, r + 0.06, d);
  vec4 mixColor = vec4(mix(vec4(ratio), centerColor, ratio));
  out_FragColor = vec4(mix(wenli, mixColor, ratio));
}
`
export default fragStr;
