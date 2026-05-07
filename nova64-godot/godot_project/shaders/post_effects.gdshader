// post_effects.gdshader
// Nova64 Post-Processing Effects
//
// Ported from Three.js backend (runtime/api-effects.js) for visual parity
// Includes: Chromatic Aberration, Glitch/Damage, Vignette, Scanlines
//
// Usage: Apply to a ColorRect or full-screen quad as post-process
// Can be controlled via shader parameters for dynamic effects

shader_type canvas_item;

// Effect controls
uniform float chromatic_aberration : hint_range(0.0, 0.01) = 0.002;
uniform float glitch_intensity : hint_range(0.0, 1.0) = 0.0;
uniform float vignette_darkness : hint_range(0.0, 3.0) = 1.5;
uniform float vignette_offset : hint_range(0.0, 2.0) = 0.95;
uniform float scanline_intensity : hint_range(0.0, 1.0) = 0.0;
uniform float time : hint_range(0.0, 1000.0) = 0.0;

// Noise function for glitch effects
float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

// Chromatic Aberration effect
// Source: Three.js ChromaticAberrationShader
vec3 apply_chromatic_aberration(sampler2D tex, vec2 uv, float amount) {
    if (amount <= 0.0) {
        return texture(tex, uv).rgb;
    }

    vec2 dir = uv - 0.5;
    float dist = length(dir);
    vec2 offset = normalize(dir) * dist * amount;

    float r = texture(tex, uv + offset).r;
    float g = texture(tex, uv).g;
    float b = texture(tex, uv - offset).b;

    return vec3(r, g, b);
}

// Glitch/Damage effect
// Source: Three.js GlitchShader
vec3 apply_glitch(sampler2D tex, vec2 uv, float intensity, float time_val) {
    if (intensity <= 0.0) {
        return texture(tex, uv).rgb;
    }

    vec2 glitch_uv = uv;

    // Scanline displacement — horizontal bands shift left/right
    float scanJitter = step(0.99 - intensity * 0.3, rand(vec2(time_val * 1.3, floor(uv.y * 40.0))))
                      * (rand(vec2(time_val, floor(uv.y * 40.0))) - 0.5) * intensity * 0.15;
    glitch_uv.x += scanJitter;

    // Block glitch — large rectangular regions shift
    float blockY = floor(uv.y * 8.0);
    float blockShift = step(0.97 - intensity * 0.15, rand(vec2(blockY, time_val * 0.7)))
                      * (rand(vec2(blockY + 1.0, time_val)) - 0.5) * intensity * 0.1;
    glitch_uv.x += blockShift;

    // RGB channel split
    float rgbShift = intensity * 0.012;
    float r = texture(tex, vec2(glitch_uv.x + rgbShift, glitch_uv.y + rgbShift * 0.5)).r;
    float g = texture(tex, glitch_uv).g;
    float b = texture(tex, vec2(glitch_uv.x - rgbShift, glitch_uv.y - rgbShift * 0.3)).b;

    // Color corruption — random bright pixels
    float noise = step(0.995 - intensity * 0.05, rand(uv + time_val)) * intensity;

    return vec3(r + noise, g, b + noise * 0.5);
}

// Vignette effect
// Source: Three.js VignetteShader
vec3 apply_vignette(vec3 color, vec2 uv, float darkness, float offset) {
    if (darkness <= 0.0) {
        return color;
    }

    vec2 center = uv - 0.5;
    float dist = length(center);
    float vignette = smoothstep(offset, offset - 0.7, dist);

    return mix(color * (1.0 - darkness), color, vignette);
}

// CRT Scanlines effect
vec3 apply_scanlines(vec3 color, vec2 uv, float intensity, float time_val) {
    if (intensity <= 0.0) {
        return color;
    }

    // Horizontal scanlines
    float scanline = sin(uv.y * 800.0 + time_val * 10.0) * 0.5 + 0.5;
    scanline = mix(1.0, scanline, intensity * 0.5);

    return color * scanline;
}

void fragment() {
    vec2 uv = UV;

    // Apply effects in order
    vec3 color;

    // 1. Glitch (affects UVs and color channels)
    if (glitch_intensity > 0.0) {
        color = apply_glitch(TEXTURE, uv, glitch_intensity, time);
    } else if (chromatic_aberration > 0.0) {
        // 2. Chromatic aberration (if no glitch)
        color = apply_chromatic_aberration(TEXTURE, uv, chromatic_aberration);
    } else {
        // No distortion effects
        color = texture(TEXTURE, uv).rgb;
    }

    // 3. Scanlines
    color = apply_scanlines(color, uv, scanline_intensity, time);

    // 4. Vignette (always applied last)
    color = apply_vignette(color, uv, vignette_darkness, vignette_offset);

    COLOR = vec4(color, 1.0);
}
