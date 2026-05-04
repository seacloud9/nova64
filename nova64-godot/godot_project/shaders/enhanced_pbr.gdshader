// enhanced_pbr.gdshader
// Nova64 Enhanced PBR Material
//
// Advanced physically-based rendering with additional effects:
// - Standard PBR (albedo, metallic, roughness, normal, AO)
// - Fresnel rim lighting for edge definition
// - Optional holographic/iridescent effects
// - Emissive pulsing animation
// - Triplanar texture mapping option
//
// Based on techniques from assets_v14 and Three.js materials

shader_type spatial;

#include "res://shaders/nova64_utils.gdshaderinc"

// === TEXTURES ===
uniform sampler2D albedo_texture : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D normal_map : hint_normal, filter_linear_mipmap, repeat_enable;
uniform sampler2D roughness_texture : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform sampler2D metallic_texture : hint_default_black, filter_linear_mipmap, repeat_enable;
uniform sampler2D ao_texture : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform sampler2D emission_map : source_color, filter_linear_mipmap, repeat_enable;

// === MATERIAL PROPERTIES ===
uniform vec4 albedo_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float roughness : hint_range(0.0, 1.0) = 0.5;
uniform float metallic : hint_range(0.0, 1.0) = 0.0;
uniform float specular : hint_range(0.0, 1.0) = 0.5;
uniform float ao_strength : hint_range(0.0, 1.0) = 1.0;

// === EMISSION ===
uniform vec3 emission_color : source_color = vec3(0.0, 0.0, 0.0);
uniform float emission_energy : hint_range(0.0, 16.0) = 1.0;
uniform bool emission_pulse = false;
uniform float pulse_speed : hint_range(0.0, 10.0) = 2.0;

// === RIM LIGHTING ===
uniform bool enable_rim = true;
uniform float rim_strength : hint_range(0.0, 1.0) = 0.15;
uniform float rim_power : hint_range(1.0, 16.0) = 5.0;
uniform vec3 rim_color : source_color = vec3(1.0, 1.0, 1.0);

// === HOLOGRAPHIC EFFECT ===
uniform bool enable_holographic = false;
uniform float holographic_intensity : hint_range(0.0, 1.0) = 0.5;
uniform float holographic_speed : hint_range(0.0, 5.0) = 1.0;

// === UV SETTINGS ===
uniform vec2 uv_scale = vec2(1.0, 1.0);
uniform vec2 uv_offset = vec2(0.0, 0.0);
uniform bool use_triplanar = false;
uniform float triplanar_sharpness : hint_range(1.0, 32.0) = 8.0;

// Triplanar texture sampling
vec4 triplanar_texture(sampler2D tex, vec3 world_pos, vec3 world_normal, float sharpness) {
    vec3 blend = abs(world_normal);
    blend = pow(blend, vec3(sharpness));
    blend /= (blend.x + blend.y + blend.z);

    vec4 x_proj = texture(tex, world_pos.zy * uv_scale + uv_offset);
    vec4 y_proj = texture(tex, world_pos.xz * uv_scale + uv_offset);
    vec4 z_proj = texture(tex, world_pos.xy * uv_scale + uv_offset);

    return x_proj * blend.x + y_proj * blend.y + z_proj * blend.z;
}

void fragment() {
    // UV calculation
    vec2 uv = UV * uv_scale + uv_offset;

    // World-space coordinates for triplanar
    vec3 world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
    vec3 world_normal = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);

    // Sample textures (triplanar or standard UV)
    vec4 albedo_tex;
    vec4 roughness_tex;
    vec4 metallic_tex;
    vec4 ao_tex;

    if (use_triplanar) {
        albedo_tex = triplanar_texture(albedo_texture, world_pos, world_normal, triplanar_sharpness);
        roughness_tex = triplanar_texture(roughness_texture, world_pos, world_normal, triplanar_sharpness);
        metallic_tex = triplanar_texture(metallic_texture, world_pos, world_normal, triplanar_sharpness);
        ao_tex = triplanar_texture(ao_texture, world_pos, world_normal, triplanar_sharpness);
    } else {
        albedo_tex = texture(albedo_texture, uv);
        roughness_tex = texture(roughness_texture, uv);
        metallic_tex = texture(metallic_texture, uv);
        ao_tex = texture(ao_texture, uv);
    }

    // Apply material properties
    ALBEDO = albedo_color.rgb * albedo_tex.rgb;
    ROUGHNESS = roughness * roughness_tex.r;
    METALLIC = metallic * metallic_tex.r;
    SPECULAR = specular;
    AO = mix(1.0, ao_tex.r, ao_strength);

    // Normal mapping
    if (!use_triplanar) {
        NORMAL_MAP = texture(normal_map, uv).rgb;
    }

    // Rim lighting (fresnel effect)
    vec3 rim_light = vec3(0.0);
    if (enable_rim) {
        float rim = fresnel_simple(NORMAL, VIEW, rim_power);
        rim_light = rim * rim_strength * rim_color * ALBEDO;
    }

    // Holographic/iridescent effect
    vec3 holographic = vec3(0.0);
    if (enable_holographic) {
        float time = TIME * holographic_speed;
        float holo_pattern = sin(VERTEX.x * 10.0 + time) * cos(VERTEX.y * 10.0 + time * 0.7);
        holo_pattern = holo_pattern * 0.5 + 0.5;

        // Create rainbow effect with hue shift
        vec3 holo_color = hue_radians_float(ALBEDO, holo_pattern);
        holographic = holo_color * holographic_intensity;
    }

    // Emission with optional pulsing
    vec3 emission = emission_color * emission_energy;
    if (emission_pulse) {
        float pulse = sin(TIME * pulse_speed) * 0.5 + 0.5;
        emission *= (0.5 + pulse * 0.5);
    }

    vec4 emission_tex = texture(emission_map, uv);
    emission += emission_tex.rgb * emission_energy;

    // Combine all effects
    EMISSION = rim_light + holographic + emission;

    // Alpha
    ALPHA = albedo_color.a * albedo_tex.a;
}

void light() {
    // Enhanced lighting with proper sRGB handling
    float diffuse = lambert(ATTENUATION, LIGHT, NORMAL);
    float spec = blinn_phong(VIEW, LIGHT, NORMAL, mix(128.0, 8.0, ROUGHNESS));

    DIFFUSE_LIGHT += vec3(diffuse);
    SPECULAR_LIGHT += to_sRGB(vec3(spec)) * (1.0 - ROUGHNESS);
}
