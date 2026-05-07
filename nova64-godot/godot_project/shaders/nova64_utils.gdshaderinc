// nova64_utils.gdshaderinc
// Nova64 Shader Utility Functions
//
// Based on educational shaders from assets_v14 (Jettelly Godot Course)
// Licensed for commercial use under MIT (code) / CC BY-NC 4.0 (assets)
//
// These utilities provide common shader operations for enhanced visual effects:
// - Lighting models (Lambert, Blinn-Phong, Fresnel)
// - Color space conversions (sRGB, HSV)
// - Procedural noise and effects
//
// Usage: #include "res://shaders/nova64_utils.gdshaderinc"

// ============================================================================
// COLOR SPACE CONVERSIONS
// ============================================================================

// Convert linear RGB to sRGB color space for proper display
// Source: assets_v14/assets/chapter_02/include/functions.gdshaderinc
vec3 to_sRGB(vec3 linearRGB) {
    vec3 a = vec3(1.055) * pow(linearRGB.rgb, vec3(1.0/2.4)) - vec3(0.055);
    vec3 b = linearRGB.rgb * vec3(12.92);
    bvec3 c = lessThan(linearRGB, vec3(0.0031308));
    return vec3(mix(a, b, c));
}

// Convert sRGB to linear RGB color space
vec3 to_linear(vec3 sRGB) {
    vec3 a = pow((sRGB + vec3(0.055)) / vec3(1.055), vec3(2.4));
    vec3 b = sRGB / vec3(12.92);
    bvec3 c = lessThan(sRGB, vec3(0.04045));
    return vec3(mix(a, b, c));
}

// Hue shift in radians (HSV color manipulation)
// Source: assets_v14/assets/chapter_02/include/functions.gdshaderinc
vec3 hue_radians_float(vec3 input, float offset) {
    vec4 k = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(input.bg, k.wz), vec4(input.gb, k.xy), step(input.b, input.g));
    vec4 q = mix(vec4(p.xyw, input.r), vec4(input.r, p.yzx), step(p.x, input.r));
    float d = q.x - min(q.w, q.y);
    float e = 0.0000000001;
    vec3 hsv = vec3(abs(q.z + (q.w - q.y)/(6.0 * d + e)), d / (q.x + e), q.x);

    float hue = hsv.x + offset;
    hsv.x = (hue < 0.0) ? hue + 1.0 : (hue > 1.0) ? hue - 1.0 : hue;

    // HSV to RGB
    vec4 k2 = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p2 = abs(fract(hsv.xxx + k2.xyz) * 6.0 - k2.www);
    return hsv.z * mix(k2.xxx, clamp(p2 - k2.xxx, 0.0, 1.0), hsv.y);
}

// ============================================================================
// LIGHTING MODELS
// ============================================================================

// Lambert diffuse lighting (basic diffuse)
// Source: assets_v14/assets/chapter_02/include/functions.gdshaderinc
float lambert(float attenuation, vec3 light, vec3 normal) {
    return max(0.0, dot(normal, light)) * attenuation;
}

// Blinn-Phong specular lighting (highlights)
// Source: assets_v14/assets/chapter_02/include/functions.gdshaderinc
float blinn_phong(vec3 v, vec3 l, vec3 n, float m) {
    vec3 h = normalize(l + v);
    float s = pow(max(0.0, dot(n, h)), m);
    return s;
}

// Fresnel effect with power and scale (rim lighting, reflections)
// Source: assets_v14/assets/chapter_02/include/functions.gdshaderinc
float fresnel(vec3 n, vec3 v, float m, float s) {
    float f = 1.0 - max(0.0, dot(n, v));
    return s * pow(f, m);
}

// Simple fresnel (2-parameter version)
float fresnel_simple(vec3 n, vec3 v, float power) {
    return pow(1.0 - max(0.0, dot(normalize(n), normalize(v))), power);
}

// Hemisphere lighting (sky + ground ambient)
vec3 hemisphere_light(vec3 normal, vec3 sky_color, vec3 ground_color) {
    float t = dot(normal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
    return mix(ground_color, sky_color, t);
}

// ============================================================================
// PROCEDURAL FUNCTIONS
// ============================================================================

// Procedural hash for noise generation
// Source: assets_v14/assets/chapter_02/include/functions.gdshaderinc
vec3 hash33(vec3 p) {
    p = fract(p * 0.4567);
    p += dot(p, p.yzx + 1.3456);
    p.x *= p.x;
    p.y *= p.y;
    p.z *= p.z;
    return fract(p);
}

// Simple 2D noise
float noise2d(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // Smoothstep

    float a = fract(sin(dot(i, vec2(12.9898, 78.233))) * 43758.5453);
    float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(12.9898, 78.233))) * 43758.5453);
    float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453);
    float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453);

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// ============================================================================
// BLEND MODES
// ============================================================================

// Negation blend (from vfx_gem shader)
vec3 blend_negation(vec3 base, vec3 blend, float opacity) {
    vec3 v = 1.0 - abs(1.0 - blend - base);
    return mix(base, v, opacity);
}

// Additive blend
vec3 blend_add(vec3 base, vec3 blend, float opacity) {
    return base + blend * opacity;
}

// Multiply blend
vec3 blend_multiply(vec3 base, vec3 blend, float opacity) {
    return mix(base, base * blend, opacity);
}

// Screen blend
vec3 blend_screen(vec3 base, vec3 blend, float opacity) {
    vec3 result = 1.0 - (1.0 - base) * (1.0 - blend);
    return mix(base, result, opacity);
}

// Overlay blend
vec3 blend_overlay(vec3 base, vec3 blend, float opacity) {
    vec3 result = vec3(0.0);
    for (int i = 0; i < 3; i++) {
        if (base[i] < 0.5) {
            result[i] = 2.0 * base[i] * blend[i];
        } else {
            result[i] = 1.0 - 2.0 * (1.0 - base[i]) * (1.0 - blend[i]);
        }
    }
    return mix(base, result, opacity);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Remap value from one range to another
float remap(float value, float in_min, float in_max, float out_min, float out_max) {
    return out_min + (value - in_min) * (out_max - out_min) / (in_max - in_min);
}

// Smooth minimum (organic blending of distances)
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// Color mixing with three color stops (from vfx_gem shader)
vec3 color_mix_3(float t, vec3 color01, vec3 color02, vec3 color03) {
    return (t <= 0.5) ? mix(color01, color02, t * 2.0) : mix(color02, color03, (t - 0.5) * 2.0);
}

// ============================================================================
// ROTATION MATRICES (for procedural effects)
// ============================================================================

// Rotation around X axis
#define RX(a) mat3(				\
    vec3(1, 0, 0), 				\
    vec3(0, cos(a), -sin(a)), 	\
    vec3(0, sin(a), cos(a)))

// Rotation around Y axis
#define RY(a) mat3(				\
    vec3(cos(a), 0, sin(a)), 	\
    vec3(0, 1, 0), 				\
    vec3(-sin(a), 0, cos(a)))

// Rotation around Z axis
#define RZ(a) mat3(				\
    vec3(cos(a), -sin(a), 0), 	\
    vec3(sin(a), cos(a), 0), 	\
    vec3(0, 0, 1))

// ============================================================================
// MATRIX UTILITIES
// ============================================================================

// Convert view vector to tangent-binormal-normal space
vec3 view_to_tangent(vec3 tangent, vec3 bitangent, vec3 normal, vec3 view) {
    float t = dot(tangent, view);
    float b = dot(bitangent, view);
    float n = dot(normal, view);
    return normalize(vec3(t, b, n));
}

// ============================================================================
// DOCUMENTATION & EXAMPLES
// ============================================================================
//
// Example usage in a spatial shader:
//
// shader_type spatial;
// #include "res://shaders/nova64_utils.gdshaderinc"
//
// void fragment() {
//     // Basic PBR with fresnel rim
//     ALBEDO = vec3(1.0, 0.5, 0.2);
//     ROUGHNESS = 0.5;
//     METALLIC = 0.0;
//
//     // Add fresnel rim lighting
//     float rim = fresnel_simple(NORMAL, VIEW, 5.0);
//     EMISSION = vec3(rim) * ALBEDO * 0.5;
// }
//
// void light() {
//     // Enhanced lighting with sRGB correction
//     float diffuse = lambert(ATTENUATION, LIGHT, NORMAL);
//     float specular = blinn_phong(VIEW, LIGHT, NORMAL, 64.0);
//
//     DIFFUSE_LIGHT += vec3(diffuse);
//     SPECULAR_LIGHT += to_sRGB(vec3(specular));
// }
//
// ============================================================================
