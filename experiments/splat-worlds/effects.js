// Shared GLSL semantics. Input position is world space; source colors are baked.
export const effectGLSL = `
vec4 worldEffect(vec3 p, vec4 color, float time, float mode) {
  float radius = length(p.xz);
  if (mode > 0.5 && mode < 1.5) {
    float edge = mod(time * 1.4, 16.0);
    color.a *= 1.0 - smoothstep(edge - 0.18, edge, radius);
    float ring = exp(-pow((radius - edge + 0.12) * 12.0, 2.0));
    color.rgb = mix(color.rgb, vec3(0.15, 0.85, 1.0), ring * 0.8);
  } else if (mode > 1.5 && mode < 2.5) {
    float noise = fract(sin(dot(floor(p * 12.0), vec3(12.9898,78.233,37.719))) * 43758.5453);
    float amount = 0.5 + 0.5 * sin(time * 0.7);
    color.a *= smoothstep(amount - 0.06, amount + 0.06, noise);
    color.rgb = mix(vec3(0.1, 0.85, 1.0), color.rgb,
      smoothstep(amount + 0.06, amount + 0.16, noise));
  } else if (mode > 2.5 && mode < 3.5) {
    float ring = exp(-pow((radius - mod(time * 2.0, 16.0)) * 5.0, 2.0));
    color.rgb = mix(color.rgb, vec3(0.15, 0.9, 1.0), ring * 0.85);
  } else if (mode > 3.5) {
    color.rgb *= vec3(0.55, 0.85, 1.0);
  }
  return color;
}`;
