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
  } else if (mode > 3.5 && mode < 4.5) {
    color.rgb *= vec3(0.55, 0.85, 1.0);
  } else if (mode > 4.5 && mode < 5.5) {
    float section = 1.2 + 1.6 * sin(time * 0.4);
    float contour = pow(0.5 + 0.5 * cos(p.y * 42.0), 14.0);
    float edge = exp(-pow((p.y - section) * 14.0, 2.0));
    color.a *= 1.0 - smoothstep(section, section + 0.15, p.y);
    color.rgb = mix(color.rgb * 0.16, vec3(0.08, 0.8, 1.0), contour * 0.85);
    color.rgb += vec3(0.2, 0.8, 1.0) * edge * 0.7;
  } else if (mode > 5.5 && mode < 6.5) {
    vec3 spectrum = 0.5 + 0.5 * cos(p.y * 2.2 - time * 0.4 + vec3(0.0, 2.1, 4.2));
    float luminance = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    color.rgb = mix(color.rgb, spectrum * (0.3 + luminance), 0.85);
  } else if (mode > 6.5 && mode < 7.5) {
    float wave = 0.5 + 0.5 * sin(p.x * 2.5 + p.z * 1.8 - time * 2.0);
    float band = pow(wave, 12.0);
    color.rgb = mix(color.rgb * 0.45, vec3(0.8, 0.2, 1.0), band * 0.8);
    color.rgb += vec3(0.05, 0.6, 0.8) * pow(1.0 - wave, 12.0);
  } else if (mode > 7.5) {
    float front = 1.3 + 1.8 * sin(time * 0.45);
    float edge = exp(-pow((p.y - front) * 7.0, 2.0));
    float heat = 0.5 + 0.5 * sin(p.x * 18.0 + p.z * 12.0 + time * 2.0);
    color.rgb = mix(color.rgb * 0.22, vec3(1.0, 0.18 + heat * 0.45, 0.03), edge);
    color.rgb += vec3(0.35, 0.04, 0.0) * pow(heat, 8.0);
  }
  return color;
}`;
