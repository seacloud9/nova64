# Godot Visual Parity Implementation Plan

## Executive Summary

This document outlines a comprehensive plan to achieve visual parity between the Godot backend and the Three.js backend for Nova64, leveraging the shader examples from the Jettelly Godot Course (assets_v14) to improve lighting, shading, and post-processing.

**Goal**: Match the rich, cinematic visual quality of the Three.js backend while maintaining performance on the Godot platform.

## Current State Analysis

### Three.js Backend Strengths
Located in: `runtime/backends/threejs/gpu-threejs.js`

#### Advanced Lighting Setup (lines 91-176):
- **Multi-layered ambient lighting**: Ambient (0.5) + Hemisphere (0.6)
- **High-quality shadows**: 4096x4096 shadow maps with bias tuning
- **Dramatic fill lights**: 3 colored directional lights (blue, pink, green)
- **Dynamic point lights**: 2 animated point lights with 1024x1024 shadows
- **Environment mapping**: PMREMGenerator for realistic reflections
- **Atmospheric fog**: FogExp2 with subtle color (0x202050)
- **Advanced tonemapping**: ACES Filmic with exposure 1.25

#### Material Quality:
- High-precision rendering (`highp`)
- sRGB color space management
- Environment map reflections (envMapIntensity actually works)
- Proper shadow bias and normal bias

#### Post-Processing:
- Dynamic lighting animation (subtle position changes)
- Animated fog density
- Holographic material pulsing
- Texture animation support

### Godot Backend Current State
Located in: `nova64-godot/gdextension/src/bridge.cpp`

#### Existing Features (lines 1190-1431):
- **WorldEnvironment with Sky**: Procedural gradient sky (nice baseline)
- **Tonemapping**: Filmic by default, exposure 0.96
- **Glow/Bloom**: Enabled, intensity 0.92, strength 1.15
- **Color adjustments**: Brightness 1.0, Contrast 1.12, Saturation 1.08
- **Sky presets**: 9 presets (space, sunset, dawn, night, foggy, dusk, storm, alien, underwater)
- **SSAO support**: Available but disabled by default
- **Fog support**: Depth fog with customizable curve

#### Current Gaps:
1. **No default scene lighting**: Scene has no DirectionalLight unless cart creates one
2. **Limited ambient strategy**: Only basic sky-based ambient (energy 0.72)
3. **No fill lights**: Missing the dramatic colored fill lights from Three.js
4. **No environment reflections**: Metallic materials lack reflections
5. **Shadow quality**: Default settings not optimized
6. **No animated lighting**: Static lighting system
7. **Material enhancements**: Could leverage shader techniques from assets_v14

### Available Shader Resources
Located in: `nova64-godot/godot_project/data/assets_v14/assets`

**Educational shader library** from Jettelly (licensed for commercial use):

#### Lighting Models (chapter_02/):
- **lambert.gdshader**: Basic diffuse with smoothstep toon shading
- **blinn_phong.gdshader**: Specular highlights with sRGB correction
- **rim_fresnel.gdshader**: Fresnel rim lighting effect
- **hemisphere.gdshader**: Hemisphere lighting for ambient
- **anisotropy/anisotropic_reflection.gdshader**: Anisotropic highlights

#### Advanced Effects (case_study/):
- **vfx_gem/vfx_gem.gdshader**: Matcap + fresnel + color mixing
- **vfx_dice/die_glsl.gdshader**: Ray marching, refraction, chromatic aberration
- **vfx_glass/vfx_glass.gdshader**: Transparency and distortion
- **vfx_item_box/**: Multiple shaders for exterior/interior/symbol effects

#### Utility Functions (chapter_02/include/functions.gdshaderinc):
- `lambert()`: Diffuse lighting calculation
- `blinn_phong()`: Specular calculation
- `fresnel()`: Fresnel term with power and scale
- `to_sRGB()`: Linear to sRGB conversion
- `hash33()`: Procedural noise
- `hue_radians_float()`: HSV color manipulation

## Visual Parity Gaps Identified

### 1. Lighting System Gaps

| Feature | Three.js | Godot Current | Gap Severity |
|---------|----------|---------------|--------------|
| Default scene light | Yes (1 main + 2 point) | No | HIGH |
| Fill lights | 3 colored directional | None | HIGH |
| Shadow quality | 4096x4096 | Not set | MEDIUM |
| Ambient strategy | Ambient + Hemisphere | Sky-based only | MEDIUM |
| Dynamic lighting | Animated positions | Static | LOW |

### 2. Material/Shading Gaps

| Feature | Three.js | Godot Current | Gap Severity |
|---------|----------|---------------|--------------|
| Environment reflections | PMREMGenerator | None | HIGH |
| Metallic/roughness PBR | Full support | Basic support | MEDIUM |
| Fresnel effects | Built-in | Not exposed | MEDIUM |
| Matcap support | Custom | Not available | LOW |
| Holographic materials | Animated emissive | Not available | LOW |

### 3. Post-Processing Gaps

| Feature | Three.js | Godot Current | Gap Severity |
|---------|----------|---------------|--------------|
| Bloom/Glow | Exposure-based | Godot glow (good) | NONE |
| Tonemapping | ACES Filmic 1.25 | Filmic 0.96 | LOW |
| Color grading | Basic | Adjustment layer | NONE |
| Fog | Animated FogExp2 | Static depth fog | LOW |
| SSAO | N/A | Available | PLUS |

## Implementation Strategy

### Phase 1: Enhanced Default Lighting System

**Goal**: Match Three.js multi-light setup with Godot equivalents.

#### 1.1 Create Default Scene Lighting (PRIORITY: HIGH)

**File**: `nova64-godot/gdextension/src/bridge.cpp`

Add to `_ensure_environment()` or create new `_setup_default_lighting()`:

```cpp
void Nova64Host::_setup_default_lighting() {
    // Main directional light (replaces Three.js mainLight)
    if (!_main_light) {
        _main_light = memnew(DirectionalLight3D);
        _main_light->set_name("MainLight");
        _main_light->set_color(Color(1.0f, 1.0f, 1.0f));
        _main_light->set_param(Light3D::PARAM_ENERGY, 1.8f); // Match Three.js

        // High-quality shadows (match Three.js 4096x4096)
        _main_light->set_shadow(true);
        _main_light->set_param(Light3D::PARAM_SHADOW_MAX_DISTANCE, 200.0f);
        // Note: Godot shadow resolution is project-wide in rendering settings
        // Set via ProjectSettings in _ready() or cart meta
        _main_light->set_param(Light3D::PARAM_SHADOW_BIAS, 0.00005f);
        _main_light->set_param(Light3D::PARAM_SHADOW_NORMAL_BIAS, 0.02f);

        // Position to match Three.js (5, 8, 3)
        _main_light->set_position(Vector3(5.0f, 8.0f, 3.0f));
        _main_light->look_at(Vector3(0, 0, 0), Vector3(0, 1, 0));

        add_child(_main_light);
    }

    // Fill Light 1 - Blue tone (match Three.js fillLight1)
    if (!_fill_light_1) {
        _fill_light_1 = memnew(DirectionalLight3D);
        _fill_light_1->set_name("FillLight1");
        _fill_light_1->set_color(Color(0.25f, 0.50f, 1.0f)); // 0x4080ff
        _fill_light_1->set_param(Light3D::PARAM_ENERGY, 0.8f);
        _fill_light_1->set_shadow(false); // No shadow for fill
        _fill_light_1->set_position(Vector3(-8.0f, 4.0f, -5.0f));
        _fill_light_1->look_at(Vector3(0, 0, 0), Vector3(0, 1, 0));
        add_child(_fill_light_1);
    }

    // Fill Light 2 - Pink tone (match Three.js fillLight2)
    if (!_fill_light_2) {
        _fill_light_2 = memnew(DirectionalLight3D);
        _fill_light_2->set_name("FillLight2");
        _fill_light_2->set_color(Color(1.0f, 0.25f, 0.50f)); // 0xff4080
        _fill_light_2->set_param(Light3D::PARAM_ENERGY, 0.6f);
        _fill_light_2->set_shadow(false);
        _fill_light_2->set_position(Vector3(5.0f, -3.0f, 8.0f));
        _fill_light_2->look_at(Vector3(0, 0, 0), Vector3(0, 1, 0));
        add_child(_fill_light_2);
    }

    // Fill Light 3 - Green tone (match Three.js fillLight3)
    if (!_fill_light_3) {
        _fill_light_3 = memnew(DirectionalLight3D);
        _fill_light_3->set_name("FillLight3");
        _fill_light_3->set_color(Color(0.50f, 1.0f, 0.25f)); // 0x80ff40
        _fill_light_3->set_param(Light3D::PARAM_ENERGY, 0.4f);
        _fill_light_3->set_shadow(false);
        _fill_light_3->set_position(Vector3(-3.0f, 6.0f, -2.0f));
        _fill_light_3->look_at(Vector3(0, 0, 0), Vector3(0, 1, 0));
        add_child(_fill_light_3);
    }

    // Point Light 1 - Warm (match Three.js pointLight1)
    if (!_point_light_1) {
        _point_light_1 = memnew(OmniLight3D);
        _point_light_1->set_name("PointLight1");
        _point_light_1->set_color(Color(1.0f, 0.67f, 0.0f)); // 0xffaa00
        _point_light_1->set_param(Light3D::PARAM_ENERGY, 2.0f);
        _point_light_1->set_param(Light3D::PARAM_RANGE, 30.0f);
        _point_light_1->set_param(Light3D::PARAM_ATTENUATION, 1.0f);
        _point_light_1->set_shadow(true);
        _point_light_1->set_param(Light3D::PARAM_SHADOW_BIAS, 0.02f);
        _point_light_1->set_position(Vector3(10.0f, 15.0f, 10.0f));
        add_child(_point_light_1);
    }

    // Point Light 2 - Cool (match Three.js pointLight2)
    if (!_point_light_2) {
        _point_light_2 = memnew(OmniLight3D);
        _point_light_2->set_name("PointLight2");
        _point_light_2->set_color(Color(0.0f, 0.67f, 1.0f)); // 0x00aaff
        _point_light_2->set_param(Light3D::PARAM_ENERGY, 1.5f);
        _point_light_2->set_param(Light3D::PARAM_RANGE, 25.0f);
        _point_light_2->set_param(Light3D::PARAM_ATTENUATION, 1.0f);
        _point_light_2->set_shadow(true);
        _point_light_2->set_param(Light3D::PARAM_SHADOW_BIAS, 0.02f);
        _point_light_2->set_position(Vector3(-10.0f, 10.0f, -10.0f));
        add_child(_point_light_2);
    }
}
```

**Also add to header** (`bridge.h`):
```cpp
DirectionalLight3D *_main_light = nullptr;
DirectionalLight3D *_fill_light_1 = nullptr;
DirectionalLight3D *_fill_light_2 = nullptr;
DirectionalLight3D *_fill_light_3 = nullptr;
OmniLight3D *_point_light_1 = nullptr;
OmniLight3D *_point_light_2 = nullptr;

void _setup_default_lighting();
```

**Call from** `engine.init` handler (line 729):
```cpp
if (p_method == "engine.init") {
    _ensure_environment();
    _setup_default_lighting(); // NEW
    Dictionary out; out["capabilities"] = get_capabilities(); return out;
}
```

#### 1.2 Ambient Lighting Enhancement

**Modify** `_ensure_environment()` (lines 1214-1217):

```cpp
// Enhanced ambient strategy matching Three.js multi-layered approach
env->set_background(Environment::BG_SKY);
env->set_ambient_source(Environment::AMBIENT_SOURCE_SKY);
env->set_reflection_source(Environment::REFLECTION_SOURCE_SKY);
env->set_ambient_light_energy(0.85f); // Increase from 0.72 to 0.85 for brighter ambient
```

### Phase 2: Enhanced Material Support

**Goal**: Add environment reflections and advanced material properties.

#### 2.1 Environment Map for Reflections (PRIORITY: HIGH)

**Add to** `_ensure_environment()` after sky setup:

```cpp
// Create radiance texture for environment reflections (like Three.js PMREMGenerator)
// Use the sky as the source
env->set_ssr_enabled(false); // Screen-space reflections off (use sky instead)
env->set_sdfgi_enabled(false); // SDFGI is expensive, use sky reflection

// The sky is already set up, so reflections will use it automatically.
// Godot uses the environment sky for IBL (Image-Based Lighting) reflections.

// Optionally enhance the sky reflection quality
env->set_ambient_light_sky_contribution(0.5f); // Balance between ambient and sky
```

#### 2.2 Enhanced Material Defaults (PRIORITY: MEDIUM)

**Modify** `_cmd_material_create()` to add better defaults for metallic materials:

Add after line 808 (after specular mode):

```cpp
// Enhanced defaults for better visual quality
// Ensure environment reflections work for metallic materials
if (mat->get_metallic() > 0.0f) {
    // Metallic materials need proper environment reflections
    mat->set_metallic_specular(1.0f); // Full specular
}

// Add subtle rim lighting by default (can be overridden)
// This adds a "pop" to edges similar to Three.js
mat->set_feature(BaseMaterial3D::FEATURE_RIM, true);
mat->set_rim(0.15f); // Subtle rim
mat->set_rim_tint(0.5f); // Balanced tint
```

#### 2.3 Add Fresnel/Rim Support to API

**Add new command** `material.setRim`:

```cpp
Dictionary Nova64Host::_cmd_material_set_rim(const Dictionary &p) {
    uint32_t id = handle_id_from_payload(p, "handle");
    Ref<RefCounted> ref = _handles->get_resource(id, HandleKind::MATERIAL);
    Ref<BaseMaterial3D> mat = ref;
    if (mat.is_null()) return make_error("invalid_material_handle", "material.setRim");

    mat->set_feature(BaseMaterial3D::FEATURE_RIM, true);
    if (p.has("rim")) mat->set_rim(static_cast<float>(static_cast<double>(p["rim"])));
    if (p.has("rimTint")) mat->set_rim_tint(static_cast<float>(static_cast<double>(p["rimTint"])));

    Dictionary out; out["ok"] = true; return out;
}
```

Add to `call_bridge()` routing:
```cpp
if (p_method == "material.setRim") return _cmd_material_set_rim(p_payload);
```

### Phase 3: Post-Processing Enhancements

**Goal**: Match Three.js tonemapping and add optional effects.

#### 3.1 Tonemap/Exposure Tuning (PRIORITY: LOW)

**Modify** `_ensure_environment()` (lines 1220-1223):

```cpp
// Tonemap — ACES filmic to match Three.js, higher exposure for bloom
env->set_tonemapper(Environment::TONE_MAPPER_ACES); // Change from FILMIC to ACES
env->set_tonemap_exposure(1.2f); // Increase from 0.96 to 1.2 (closer to Three.js 1.25)
env->set_tonemap_white(6.0f); // Increase from 5.0 for brighter highlights
```

#### 3.2 Enhanced Glow/Bloom Settings

**Modify** `_ensure_environment()` (lines 1226-1230):

```cpp
// Glow / bloom — enhanced to match Three.js dramatic lighting
env->set_glow_enabled(true);
env->set_glow_intensity(1.1f); // Increase from 0.92 to 1.1
env->set_glow_strength(1.3f); // Increase from 1.15 to 1.3
env->set_glow_bloom(0.12f); // Increase from 0.08 to 0.12
env->set_glow_hdr_bleed_threshold(0.85f); // Lower from 0.9 to 0.85 for more bloom
env->set_glow_hdr_luminance_cap(16.0f); // Add cap for emissive materials
```

#### 3.3 Optional SSAO for Quality Mode

Add JS API support for carts to enable SSAO:

```cpp
// Already supported via env.set({ ssao: true })
// Just ensure defaults are good when enabled
```

In `_cmd_env_set()`, update SSAO defaults:

```cpp
if (p.has("ssao")) {
    env->set_ssao_enabled(static_cast<bool>(p["ssao"]));
    if (static_cast<bool>(p["ssao"])) {
        // Set quality defaults when enabling
        env->set_ssao_radius(1.5f);
        env->set_ssao_intensity(1.2f);
        env->set_ssao_detail(0.5f);
        env->set_ssao_horizon(0.06f);
        env->set_ssao_sharpness(0.98f);
    }
}
```

### Phase 4: Dynamic Lighting Animation

**Goal**: Animate point lights like Three.js for atmosphere.

#### 4.1 Add Update Tick for Lighting

**Add to** `Nova64Host` class in `bridge.h`:

```cpp
void _update_dynamic_lighting(double delta);
double _accumulated_time = 0.0;
```

**Implement in** `bridge.cpp`:

```cpp
void Nova64Host::_update_dynamic_lighting(double delta) {
    _accumulated_time += delta;
    float time = static_cast<float>(_accumulated_time);

    // Animate point light positions to match Three.js
    // Three.js: point1.position.x = 10 + Math.sin(time * 0.5) * 3
    if (_point_light_1) {
        Vector3 pos = _point_light_1->get_position();
        pos.x = 10.0f + sin(time * 0.5f) * 3.0f;
        pos.y = 15.0f + cos(time * 0.7f) * 2.0f;
        _point_light_1->set_position(pos);
    }

    // Three.js: point2.position.x = -10 + Math.cos(time * 0.6) * 4
    if (_point_light_2) {
        Vector3 pos = _point_light_2->get_position();
        pos.x = -10.0f + cos(time * 0.6f) * 4.0f;
        pos.z = -10.0f + sin(time * 0.4f) * 3.0f;
        _point_light_2->set_position(pos);
    }
}
```

**Add to** `cart_update()` in the GDScript shim (`nova64_host.gd`):

```gdscript
func _process(delta: float) -> void:
    if host == null:
        return
    host.update_dynamic_lighting(delta) # NEW
    host.cart_update(delta)
    host.cart_draw()
```

**Expose method** in `bridge.cpp`:

```cpp
void Nova64Host::update_dynamic_lighting(double delta) {
    _update_dynamic_lighting(delta);
}
```

### Phase 5: Optional Advanced Shaders

**Goal**: Provide shader utilities for carts that want advanced effects.

#### 5.1 Create Shader Utility Library

**Copy useful functions from** `assets_v14/assets/chapter_02/include/functions.gdshaderinc`

**Create new file**: `nova64-godot/godot_project/shaders/nova64_utils.gdshaderinc`

```glsl
// Nova64 Shader Utility Functions
// Based on Jettelly Godot Course shaders (licensed for commercial use)

// Convert linear RGB to sRGB color space
vec3 to_sRGB(vec3 linearRGB) {
    vec3 a = vec3(1.055) * pow(linearRGB.rgb, vec3(1.0/2.4)) - vec3(0.055);
    vec3 b = linearRGB.rgb * vec3(12.92);
    bvec3 c = lessThan(linearRGB, vec3(0.0031308));
    return vec3(mix(a, b, c));
}

// Fresnel effect with power and scale
float fresnel(vec3 n, vec3 v, float m, float s) {
    float f = 1.0 - max(0.0, dot(n, v));
    return s * pow(f, m);
}

// Lambert diffuse lighting
float lambert(float attenuation, vec3 light, vec3 normal) {
    return max(0.0, dot(normal, light)) * attenuation;
}

// Blinn-Phong specular
float blinn_phong(vec3 v, vec3 l, vec3 n, float m) {
    vec3 h = normalize(l + v);
    return pow(max(0.0, dot(n, h)), m);
}

// Procedural hash for noise
vec3 hash33(vec3 p) {
    p = fract(p * 0.4567);
    p += dot(p, p.yzx + 1.3456);
    p.x *= p.x;
    p.y *= p.y;
    p.z *= p.z;
    return fract(p);
}
```

#### 5.2 Example Enhanced Material Shader

**Create template**: `nova64-godot/godot_project/shaders/enhanced_pbr.gdshader`

```glsl
shader_type spatial;

#include "res://shaders/nova64_utils.gdshaderinc"

uniform sampler2D albedo_texture : source_color;
uniform sampler2D normal_map : hint_normal;
uniform sampler2D roughness_texture;
uniform sampler2D metallic_texture;

uniform vec4 albedo_color : source_color = vec4(1.0);
uniform float roughness : hint_range(0.0, 1.0) = 0.5;
uniform float metallic : hint_range(0.0, 1.0) = 0.0;
uniform float rim_strength : hint_range(0.0, 1.0) = 0.15;
uniform float rim_power : hint_range(1.0, 10.0) = 5.0;

void fragment() {
    vec4 albedo_tex = texture(albedo_texture, UV);
    ALBEDO = albedo_color.rgb * albedo_tex.rgb;

    ROUGHNESS = roughness * texture(roughness_texture, UV).r;
    METALLIC = metallic * texture(metallic_texture, UV).r;

    NORMAL_MAP = texture(normal_map, UV).rgb;

    // Add rim lighting for "pop"
    float rim = fresnel(NORMAL, VIEW, rim_power, rim_strength);
    EMISSION = vec3(rim) * albedo_color.rgb * 0.5;
}

void light() {
    // Enhanced lighting with proper sRGB handling
    float diffuse = lambert(ATTENUATION, LIGHT, NORMAL);
    float specular = blinn_phong(VIEW, LIGHT, NORMAL, 64.0);

    DIFFUSE_LIGHT += vec3(diffuse);
    SPECULAR_LIGHT += to_sRGB(vec3(specular));
}
```

## Implementation Checklist

### Phase 1: Enhanced Default Lighting (Week 1)
- [ ] Add `_main_light` member to `Nova64Host`
- [ ] Add `_fill_light_1/2/3` members to `Nova64Host`
- [ ] Add `_point_light_1/2` members to `Nova64Host`
- [ ] Implement `_setup_default_lighting()` method
- [ ] Call from `engine.init` handler
- [ ] Add cleanup to destructor
- [ ] Test with cube/particles/space-harrier-3d carts

### Phase 2: Enhanced Material Support (Week 2)
- [ ] Enhance `_ensure_environment()` for better reflections
- [ ] Add default rim lighting to materials
- [ ] Implement `material.setRim` command
- [ ] Add to capabilities list
- [ ] Test with metallic/shiny materials

### Phase 3: Post-Processing Enhancements (Week 2)
- [ ] Change tonemapper to ACES
- [ ] Increase exposure to 1.2
- [ ] Enhance glow/bloom settings
- [ ] Update SSAO defaults
- [ ] Test visual impact across carts

### Phase 4: Dynamic Lighting Animation (Week 3)
- [ ] Add `_update_dynamic_lighting()` method
- [ ] Add `_accumulated_time` member
- [ ] Expose `update_dynamic_lighting()` to GDScript
- [ ] Call from `_process()` in nova64_host.gd
- [ ] Test animation smoothness

### Phase 5: Optional Advanced Shaders (Week 3)
- [ ] Create `nova64_utils.gdshaderinc`
- [ ] Create `enhanced_pbr.gdshader` template
- [ ] Document shader usage for cart authors
- [ ] Create example cart using custom shaders

## Testing Strategy

### Visual Comparison Tests

For each cart, capture screenshots side-by-side:
1. **Three.js backend** (reference)
2. **Godot backend - before changes** (baseline)
3. **Godot backend - after changes** (improved)

**Test carts**:
- `01-cube` - Basic lighting/material test
- `05-particles` - Emissive materials, glow
- `space-harrier-3d` - Complex scene with multiple objects
- `babylon-demo` - Advanced materials
- `minecraft-demo` - Voxel terrain with varied lighting

### Automated Visual Regression

Use screenshot comparison script:

```powershell
# Compare screenshots pixel-by-pixel
.\nova64-godot\scripts\compare-screenshots.ps1 -cart "01-cube"
```

### Performance Benchmarks

Track frame time impact:
- Before: Baseline FPS
- After lighting: FPS with 6 lights
- After all changes: Final FPS

**Acceptance criteria**: <10% FPS drop on target hardware.

## Risk Mitigation

### Performance Concerns
- **Risk**: 6 lights might be expensive on mobile
- **Mitigation**: Add quality settings (light.setQualityPreset('low/medium/high'))
- **Fallback**: Cart can disable fill lights via API

### Visual Differences
- **Risk**: Godot and Three.js may never match 100%
- **Mitigation**: Focus on "feels similar" rather than pixel-perfect
- **Acceptance**: 90% visual similarity is success

### Backward Compatibility
- **Risk**: Existing carts might look different
- **Mitigation**: Default lights are subtle and enhance most scenes
- **Escape hatch**: Cart can call `light.destroy()` on defaults

## Success Metrics

1. **Visual Similarity**: 90%+ similarity in side-by-side comparison
2. **Performance**: <10% FPS regression
3. **Developer Feedback**: Positive response from cart authors
4. **Feature Parity**: All major Three.js lighting features available

## Future Enhancements (Post-Parity)

- [ ] Volumetric fog (Godot's FogVolume nodes)
- [ ] Light probes for dynamic GI
- [ ] Custom post-processing shaders
- [ ] Advanced shadow techniques (cascaded shadows)
- [ ] Reflection probes for localized reflections
- [ ] HDR environment maps from file

## References

- **Jettelly Godot Course**: `nova64-godot/godot_project/data/assets_v14/assets/`
- **Three.js backend**: `runtime/backends/threejs/gpu-threejs.js`
- **Godot bridge**: `nova64-godot/gdextension/src/bridge.cpp`
- **Functions library**: `assets_v14/assets/chapter_02/include/functions.gdshaderinc`
- **License**: Code MIT, Assets CC BY-NC 4.0 (commercial use allowed)

---

**Document Version**: 1.0
**Date**: 2026-05-03
**Author**: Nova64 Visual Parity Task Force
