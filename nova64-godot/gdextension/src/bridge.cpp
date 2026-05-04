// bridge.cpp
// Nova64Host — QuickJS-backed host bridge for the Nova64 Godot adapter (G1).
//
// Adds to the G0 spike:
//   - ES module-mode cart evaluation with export resolution via the module
//     namespace object.
//   - HandleTable-backed resource lifecycle.
//   - First batch of adapter commands: material, geometry, mesh, transform,
//     camera, light.
//
// Higher-level features (texture upload, instancing, particles, audio) come
// at G2+.

#include "bridge.h"

#include "handles.h"

#include <godot_cpp/classes/box_mesh.hpp>
#include <godot_cpp/classes/camera3d.hpp>
#include <godot_cpp/classes/canvas_layer.hpp>
#include <godot_cpp/classes/control.hpp>
#include <godot_cpp/classes/cylinder_mesh.hpp>
#include <godot_cpp/classes/directional_light3d.hpp>
#include <godot_cpp/classes/environment.hpp>
#include <godot_cpp/classes/file_access.hpp>
#include <godot_cpp/classes/dir_access.hpp>
#include <godot_cpp/classes/font.hpp>
#include <godot_cpp/classes/image.hpp>
#include <godot_cpp/classes/image_texture.hpp>
#include <godot_cpp/classes/input.hpp>
#include <godot_cpp/classes/audio_stream.hpp>
#include <godot_cpp/classes/audio_stream_player.hpp>
#include <godot_cpp/classes/gpu_particles3d.hpp>
#include <godot_cpp/classes/light3d.hpp>
#include <godot_cpp/classes/omni_light3d.hpp>
#include <godot_cpp/classes/particle_process_material.hpp>
#include <godot_cpp/classes/multi_mesh.hpp>
#include <godot_cpp/classes/multi_mesh_instance3d.hpp>
#include <godot_cpp/classes/procedural_sky_material.hpp>
#include <godot_cpp/classes/rendering_server.hpp>
#include <godot_cpp/classes/resource_loader.hpp>
#include <godot_cpp/classes/mesh_instance3d.hpp>
#include <godot_cpp/classes/plane_mesh.hpp>
#include <godot_cpp/classes/sky.hpp>
#include <godot_cpp/classes/array_mesh.hpp>
#include <godot_cpp/classes/sphere_mesh.hpp>
#include <godot_cpp/classes/spot_light3d.hpp>
#include <godot_cpp/classes/surface_tool.hpp>
#include <godot_cpp/classes/shader.hpp>
#include <godot_cpp/classes/shader_material.hpp>
#include <godot_cpp/classes/standard_material3d.hpp>
#include <godot_cpp/classes/torus_mesh.hpp>
#include <godot_cpp/classes/world_environment.hpp>
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/variant/array.hpp>
#include <godot_cpp/variant/color.hpp>
#include <godot_cpp/variant/transform3d.hpp>
#include <godot_cpp/variant/utility_functions.hpp>
#include <godot_cpp/variant/variant.hpp>
#include <godot_cpp/variant/vector2.hpp>
#include <godot_cpp/variant/vector3.hpp>

#include "quickjs.h"

#include <chrono>
#include <cstring>
#include <string>
#include <algorithm>

using namespace godot;
using nova64::HandleKind;
using nova64::HandleTable;

namespace {

constexpr const char *ADAPTER_CONTRACT_VERSION = "1.0.0";
constexpr const char *GODOT_ADAPTER_VERSION = "0.5.0";
constexpr const char *HOST_OPAQUE_KEY = "__nova64_host_ptr";

Nova64Host *get_host_from_context(JSContext *ctx) {
    JSValue global = JS_GetGlobalObject(ctx);
    JSValue ptr_val = JS_GetPropertyStr(ctx, global, HOST_OPAQUE_KEY);
    int64_t raw = 0;
    JS_ToInt64(ctx, &raw, ptr_val);
    JS_FreeValue(ctx, ptr_val);
    JS_FreeValue(ctx, global);
    return reinterpret_cast<Nova64Host *>(static_cast<intptr_t>(raw));
}

// ---- Variant <-> JSValue marshaling -------------------------------------

JSValue variant_to_js(JSContext *ctx, const Variant &v);

JSValue dictionary_to_js(JSContext *ctx, const Dictionary &dict) {
    JSValue obj = JS_NewObject(ctx);
    Array keys = dict.keys();
    for (int i = 0; i < keys.size(); ++i) {
        Variant k = keys[i];
        String key_s = k.operator String();
        CharString key_utf8 = key_s.utf8();
        JS_SetPropertyStr(ctx, obj, key_utf8.get_data(), variant_to_js(ctx, dict[k]));
    }
    return obj;
}

JSValue array_to_js(JSContext *ctx, const Array &arr) {
    JSValue jarr = JS_NewArray(ctx);
    for (int i = 0; i < arr.size(); ++i) {
        JS_SetPropertyUint32(ctx, jarr, static_cast<uint32_t>(i), variant_to_js(ctx, arr[i]));
    }
    return jarr;
}

JSValue variant_to_js(JSContext *ctx, const Variant &v) {
    switch (v.get_type()) {
        case Variant::NIL:
            return JS_NULL;
        case Variant::BOOL:
            return JS_NewBool(ctx, static_cast<bool>(v));
        case Variant::INT:
            return JS_NewInt64(ctx, static_cast<int64_t>(v));
        case Variant::FLOAT:
            return JS_NewFloat64(ctx, static_cast<double>(v));
        case Variant::STRING:
        case Variant::STRING_NAME: {
            String s = v.operator String();
            CharString utf8 = s.utf8();
            return JS_NewString(ctx, utf8.get_data());
        }
        case Variant::DICTIONARY:
            return dictionary_to_js(ctx, v.operator Dictionary());
        case Variant::ARRAY:
            return array_to_js(ctx, v.operator Array());
        default: {
            CharString s = v.operator String().utf8();
            return JS_NewString(ctx, s.get_data());
        }
    }
}

Variant js_to_variant(JSContext *ctx, JSValueConst v);

Dictionary js_to_dictionary(JSContext *ctx, JSValueConst v) {
    Dictionary out;
    JSPropertyEnum *tab = nullptr;
    uint32_t len = 0;
    if (JS_GetOwnPropertyNames(ctx, &tab, &len, v,
                JS_GPN_STRING_MASK | JS_GPN_ENUM_ONLY) < 0) {
        return out;
    }
    for (uint32_t i = 0; i < len; ++i) {
        const char *key_c = JS_AtomToCString(ctx, tab[i].atom);
        JSValue prop = JS_GetProperty(ctx, v, tab[i].atom);
        if (key_c) {
            out[String::utf8(key_c)] = js_to_variant(ctx, prop);
            JS_FreeCString(ctx, key_c);
        }
        JS_FreeValue(ctx, prop);
        JS_FreeAtom(ctx, tab[i].atom);
    }
    js_free(ctx, tab);
    return out;
}

Array js_to_array(JSContext *ctx, JSValueConst v) {
    Array out;
    JSValue len_v = JS_GetPropertyStr(ctx, v, "length");
    uint32_t len = 0;
    JS_ToUint32(ctx, &len, len_v);
    JS_FreeValue(ctx, len_v);
    for (uint32_t i = 0; i < len; ++i) {
        JSValue el = JS_GetPropertyUint32(ctx, v, i);
        out.append(js_to_variant(ctx, el));
        JS_FreeValue(ctx, el);
    }
    return out;
}

Variant js_to_variant(JSContext *ctx, JSValueConst v) {
    if (JS_IsNull(v) || JS_IsUndefined(v)) {
        return Variant();
    }
    if (JS_IsBool(v)) {
        return Variant(static_cast<bool>(JS_ToBool(ctx, v)));
    }
    if (JS_IsNumber(v)) {
        double d = 0.0;
        JS_ToFloat64(ctx, &d, v);
        return Variant(d);
    }
    if (JS_IsString(v)) {
        const char *s = JS_ToCString(ctx, v);
        if (!s) return Variant(String());
        String out = String::utf8(s);
        JS_FreeCString(ctx, s);
        return out;
    }
    if (JS_IsArray(v)) return js_to_array(ctx, v);
    if (JS_IsObject(v)) return js_to_dictionary(ctx, v);
    return Variant();
}

// ---- JS callbacks --------------------------------------------------------

JSValue js_print(JSContext *ctx, JSValueConst, int argc, JSValueConst *argv) {
    std::string buf;
    for (int i = 0; i < argc; ++i) {
        const char *s = JS_ToCString(ctx, argv[i]);
        if (s) {
            if (i > 0) buf += " ";
            buf += s;
            JS_FreeCString(ctx, s);
        }
    }
    UtilityFunctions::print(String("[nova64-js] ") + String::utf8(buf.c_str()));
    return JS_UNDEFINED;
}

JSValue js_engine_call(JSContext *ctx, JSValueConst, int argc, JSValueConst *argv) {
    if (argc < 1 || !JS_IsString(argv[0])) {
        return JS_ThrowTypeError(ctx, "engine.call: method must be a string");
    }
    const char *method_c = JS_ToCString(ctx, argv[0]);
    if (!method_c) return JS_EXCEPTION;
    String method = String::utf8(method_c);
    JS_FreeCString(ctx, method_c);

    Dictionary payload;
    if (argc >= 2 && JS_IsObject(argv[1]) && !JS_IsNull(argv[1])) {
        payload = js_to_dictionary(ctx, argv[1]);
    }

    Nova64Host *host = get_host_from_context(ctx);
    if (!host) {
        return JS_ThrowInternalError(ctx, "engine.call: host pointer missing");
    }

    Dictionary result = host->call_bridge(method, payload);
    return variant_to_js(ctx, result);
}

// engine.flush(commands) — batched dispatch.
// commands is an Array of either [method, payload] pairs or {m, p} objects.
// Returns an Array of result Dictionaries in the same order.
JSValue js_engine_flush(JSContext *ctx, JSValueConst, int argc, JSValueConst *argv) {
    if (argc < 1 || !JS_IsArray(argv[0])) {
        return JS_ThrowTypeError(ctx, "engine.flush: expected array of commands");
    }
    Nova64Host *host = get_host_from_context(ctx);
    if (!host) return JS_ThrowInternalError(ctx, "engine.flush: host pointer missing");

    JSValue len_v = JS_GetPropertyStr(ctx, argv[0], "length");
    int32_t len = 0;
    JS_ToInt32(ctx, &len, len_v);
    JS_FreeValue(ctx, len_v);

    JSValue out = JS_NewArray(ctx);
    for (int32_t i = 0; i < len; i++) {
        JSValue cmd = JS_GetPropertyUint32(ctx, argv[0], i);
        String method;
        Dictionary payload;
        bool ok = false;

        if (JS_IsArray(cmd)) {
            JSValue m = JS_GetPropertyUint32(ctx, cmd, 0);
            JSValue p = JS_GetPropertyUint32(ctx, cmd, 1);
            if (JS_IsString(m)) {
                const char *s = JS_ToCString(ctx, m);
                if (s) { method = String::utf8(s); JS_FreeCString(ctx, s); ok = true; }
            }
            if (JS_IsObject(p) && !JS_IsNull(p)) payload = js_to_dictionary(ctx, p);
            JS_FreeValue(ctx, m);
            JS_FreeValue(ctx, p);
        } else if (JS_IsObject(cmd)) {
            JSValue m = JS_GetPropertyStr(ctx, cmd, "m");
            JSValue p = JS_GetPropertyStr(ctx, cmd, "p");
            if (JS_IsString(m)) {
                const char *s = JS_ToCString(ctx, m);
                if (s) { method = String::utf8(s); JS_FreeCString(ctx, s); ok = true; }
            }
            if (JS_IsObject(p) && !JS_IsNull(p)) payload = js_to_dictionary(ctx, p);
            JS_FreeValue(ctx, m);
            JS_FreeValue(ctx, p);
        }
        JS_FreeValue(ctx, cmd);

        Dictionary result;
        if (!ok) {
            result["error"] = String("flush_bad_command");
            result["index"] = i;
        } else {
            result = host->call_bridge(method, payload);
        }
        JS_SetPropertyUint32(ctx, out, i, variant_to_js(ctx, result));
    }
    return out;
}

// ---- Payload helpers -----------------------------------------------------

Color color_from_payload(const Dictionary &p, const String &key, Color fallback) {
    if (!p.has(key)) return fallback;
    Variant v = p[key];
    if (v.get_type() == Variant::ARRAY) {
        Array a = v;
        if (a.size() >= 3) {
            return Color(
                static_cast<float>(static_cast<double>(a[0])),
                static_cast<float>(static_cast<double>(a[1])),
                static_cast<float>(static_cast<double>(a[2])),
                a.size() >= 4 ? static_cast<float>(static_cast<double>(a[3])) : 1.0f);
        }
    } else if (v.get_type() == Variant::DICTIONARY) {
        Dictionary d = v;
        return Color(
            static_cast<float>(d.get("r", 1.0)),
            static_cast<float>(d.get("g", 1.0)),
            static_cast<float>(d.get("b", 1.0)),
            static_cast<float>(d.get("a", 1.0)));
    }
    return fallback;
}

Vector3 vec3_from_payload(const Dictionary &p, const String &key, Vector3 fallback) {
    if (!p.has(key)) return fallback;
    Variant v = p[key];
    if (v.get_type() == Variant::ARRAY) {
        Array a = v;
        if (a.size() >= 3) {
            return Vector3(
                static_cast<float>(static_cast<double>(a[0])),
                static_cast<float>(static_cast<double>(a[1])),
                static_cast<float>(static_cast<double>(a[2])));
        }
    } else if (v.get_type() == Variant::DICTIONARY) {
        Dictionary d = v;
        return Vector3(
            static_cast<float>(d.get("x", fallback.x)),
            static_cast<float>(d.get("y", fallback.y)),
            static_cast<float>(d.get("z", fallback.z)));
    }
    return fallback;
}

Dictionary make_handle_result(uint32_t p_id) {
    Dictionary out;
    out["handle"] = static_cast<int64_t>(p_id);
    return out;
}

Dictionary make_error(const String &p_code, const String &p_method) {
    Dictionary out;
    out["error"] = p_code;
    out["method"] = p_method;
    return out;
}

uint32_t handle_id_from_payload(const Dictionary &p, const String &key) {
    if (!p.has(key)) return 0;
    return static_cast<uint32_t>(static_cast<int64_t>(p[key]));
}

static constexpr int VOXEL_ATLAS_COLS = 8;
static constexpr int VOXEL_ATLAS_ROWS = 4;
static constexpr int VOXEL_TILE_PX = 16;

Color color_from_hex_rgb(int hex, float alpha = 1.0f) {
    return Color(
            ((hex >> 16) & 0xFF) / 255.0f,
            ((hex >> 8) & 0xFF) / 255.0f,
            (hex & 0xFF) / 255.0f,
            alpha);
}

uint32_t voxel_rng_next(uint32_t &state) {
    state = state * 1664525u + 1013904223u;
    return state;
}

float voxel_rng_unit(uint32_t &state) {
    return ((voxel_rng_next(state) >> 8) & 0x00FFFFFF) / static_cast<float>(0x01000000);
}

void atlas_noise_rect(const Ref<Image> &img, int x, int y, int w, int h, int base_hex,
        int variation, uint32_t &rng_state) {
    Color base = color_from_hex_rgb(base_hex, 1.0f);
    const int br = static_cast<int>(base.r * 255.0f);
    const int bg = static_cast<int>(base.g * 255.0f);
    const int bb = static_cast<int>(base.b * 255.0f);
    for (int py = 0; py < h; ++py) {
        for (int px = 0; px < w; ++px) {
            float rv = voxel_rng_unit(rng_state) - 0.5f;
            int dv = static_cast<int>(rv * static_cast<float>(variation));
            int rr = std::clamp(br + dv, 0, 255);
            int rg = std::clamp(bg + dv, 0, 255);
            int rb = std::clamp(bb + dv, 0, 255);
            img->set_pixel(x + px, y + py,
                    Color(rr / 255.0f, rg / 255.0f, rb / 255.0f, 1.0f));
        }
    }
}

void atlas_fill_tile_noise(const Ref<Image> &img, int tile_idx, int base_hex,
        int variation, uint32_t &rng_state) {
    int tx = (tile_idx % VOXEL_ATLAS_COLS) * VOXEL_TILE_PX;
    int ty = (tile_idx / VOXEL_ATLAS_COLS) * VOXEL_TILE_PX;
    atlas_noise_rect(img, tx, ty, VOXEL_TILE_PX, VOXEL_TILE_PX, base_hex, variation, rng_state);
}

Ref<Texture2D> get_voxel_atlas_texture() {
    static Ref<ImageTexture> atlas_tex;
    if (atlas_tex.is_valid()) return atlas_tex;

    Ref<Image> img = Image::create_empty(
            VOXEL_ATLAS_COLS * VOXEL_TILE_PX,
            VOXEL_ATLAS_ROWS * VOXEL_TILE_PX,
            false,
            Image::FORMAT_RGBA8);
    if (img.is_null()) return Ref<Texture2D>();

    uint32_t rng_state = 42u;
    const int tile_base[27] = {
        0x55cc33, 0x55cc33, 0x996644, 0xaaaaaa, 0xffdd88, 0x2288dd, 0x774422, 0x997744,
        0x116622, 0x667788, 0xddaa55, 0xccffff, 0xcc4433, 0xeeeeff, 0x99ddff, 0x333333,
        0x444444, 0xccaa88, 0xffcc33, 0x44ffee, 0x888888, 0xbbaa99, 0xffdd44, 0xffeeaa,
        0xff4400, 0x220033, 0x668855
    };
    for (int i = 0; i < 27; ++i) {
        atlas_fill_tile_noise(img, i, tile_base[i], 28, rng_state);
    }

    // Texture accents for better parity with the web procedural atlas.
    int x = VOXEL_TILE_PX;
    int y = 0;
    atlas_noise_rect(img, x, y, VOXEL_TILE_PX, 4, 0x55cc33, 24, rng_state); // grass side top strip

    x = 6 * VOXEL_TILE_PX;
    y = 0;
    for (int sx = 0; sx < VOXEL_TILE_PX; sx += 3) {
        for (int sy = 0; sy < VOXEL_TILE_PX; ++sy) {
            img->set_pixel(x + sx, y + sy, color_from_hex_rgb(0x5e3518));
        }
    }

    x = 10 * VOXEL_TILE_PX;
    y = VOXEL_TILE_PX;
    for (int sy = 0; sy < VOXEL_TILE_PX; sy += 4) {
        for (int sx = 0; sx < VOXEL_TILE_PX; ++sx) {
            img->set_pixel(x + sx, y + sy, color_from_hex_rgb(0xc89940));
        }
    }

    x = 12 * VOXEL_TILE_PX;
    y = VOXEL_TILE_PX;
    for (int sy = 0; sy < VOXEL_TILE_PX; sy += 4) {
        for (int sx = 0; sx < VOXEL_TILE_PX; ++sx) {
            img->set_pixel(x + sx, y + sy, color_from_hex_rgb(0xccbbaa));
        }
    }

    atlas_tex.instantiate();
    atlas_tex->set_image(img);
    return atlas_tex;
}

int voxel_tile_index_for_face(int block_id, bool is_top, bool is_bottom) {
    switch (block_id) {
        case 1: return is_top ? 0 : (is_bottom ? 2 : 1); // grass
        case 2: return 2;  // dirt
        case 3: return 3;  // stone
        case 4: return 4;  // sand
        case 5: return 5;  // water
        case 6: return (is_top || is_bottom) ? 7 : 6; // wood
        case 7: return 8;  // leaves
        case 8: return 9;  // cobblestone
        case 9: return 10; // planks
        case 10: return 11; // glass
        case 11: return 12; // brick
        case 12: return 13; // snow
        case 13: return 14; // ice
        case 14: return 15; // bedrock
        case 15: return 16; // coal ore
        case 16: return 17; // iron ore
        case 17: return 18; // gold ore
        case 18: return 19; // diamond ore
        case 19: return 20; // gravel
        case 20: return 21; // clay
        case 21: return 22; // torch
        case 22: return 23; // glowstone
        case 23: return 24; // lava
        case 24: return 25; // obsidian
        case 25: return 26; // mossy cobblestone
        default: return 3;  // fallback to stone-like texture
    }
}

Vector2 voxel_tile_origin_uv(int tile_idx) {
    if (tile_idx < 0) return Vector2(0.0f, 0.0f);
    const int col = tile_idx % VOXEL_ATLAS_COLS;
    const int row = tile_idx / VOXEL_ATLAS_COLS;
    const float u = static_cast<float>(col) / static_cast<float>(VOXEL_ATLAS_COLS);
    const float v = 1.0f - static_cast<float>(row + 1) / static_cast<float>(VOXEL_ATLAS_ROWS);
    return Vector2(u, v);
}

Ref<Shader> get_voxel_chunk_shader() {
    static Ref<Shader> voxel_shader;
    if (voxel_shader.is_valid()) return voxel_shader;

    voxel_shader.instantiate();
    voxel_shader->set_code(R"(
shader_type spatial;
render_mode cull_back, diffuse_lambert, specular_disabled;

uniform sampler2D atlas_tex : source_color, filter_nearest, repeat_enable;
uniform vec2 tile_size = vec2(0.125, 0.25);

void fragment() {
    vec2 atlas_uv = UV2 + fract(UV) * tile_size;
    vec4 texel = texture(atlas_tex, atlas_uv);
    ALBEDO = texel.rgb * COLOR.rgb;
    ALPHA = texel.a;
}
)");
    return voxel_shader;
}

} // namespace

// ===========================================================================
// Nova64Host
// ===========================================================================

Nova64Host::Nova64Host() {
    _cart_init_fn = JS_UNDEFINED;
    _cart_update_fn = JS_UNDEFINED;
    _cart_draw_fn = JS_UNDEFINED;
    _handles = std::make_unique<HandleTable>();
    _ensure_runtime();
}

Nova64Host::~Nova64Host() {
    _shutdown_runtime();
}

void Nova64Host::_bind_methods() {
    ClassDB::bind_method(D_METHOD("get_capabilities"), &Nova64Host::get_capabilities);
    ClassDB::bind_method(D_METHOD("call_bridge", "method", "payload"), &Nova64Host::call_bridge);
    ClassDB::bind_method(D_METHOD("load_cart", "res_path"), &Nova64Host::load_cart);
    ClassDB::bind_method(D_METHOD("cart_init"), &Nova64Host::cart_init);
    ClassDB::bind_method(D_METHOD("cart_update", "delta"), &Nova64Host::cart_update);
    ClassDB::bind_method(D_METHOD("cart_draw"), &Nova64Host::cart_draw);
    ClassDB::bind_method(D_METHOD("update_dynamic_lighting", "delta"), &Nova64Host::update_dynamic_lighting);
    ClassDB::bind_method(D_METHOD("read_global", "name"), &Nova64Host::read_global);
    ClassDB::bind_method(D_METHOD("get_perf_stats"), &Nova64Host::get_perf_stats);
}

void Nova64Host::_ensure_runtime() {
    if (_runtime) return;
    _runtime = JS_NewRuntime();
    _context = JS_NewContext(_runtime);
    _install_host_globals();
}

void Nova64Host::_release_cart_exports() {
    if (!_context) return;
    JS_FreeValue(_context, _cart_init_fn);   _cart_init_fn   = JS_UNDEFINED;
    JS_FreeValue(_context, _cart_update_fn); _cart_update_fn = JS_UNDEFINED;
    JS_FreeValue(_context, _cart_draw_fn);   _cart_draw_fn   = JS_UNDEFINED;
}

void Nova64Host::_shutdown_runtime() {
    _release_cart_exports();
    // Detach ArrayMesh refs from any chunk MeshInstance3D children before the
    // scene tree frees them.  SurfaceTool-built ArrayMesh objects hold
    // RenderingServer GPU rids that must be released while the RS is live.
    for (int i = get_child_count() - 1; i >= 0; --i) {
        if (MeshInstance3D *mi = Object::cast_to<MeshInstance3D>(get_child(i))) {
            mi->set_mesh(Ref<Mesh>());
        }
    }
    // Do NOT queue_free nodes here: the scene tree owns them and will free
    // them when Nova64Host is freed (via ~Node children teardown).  Calling
    // queue_free AND letting ~Node free the same child is a double-free that
    // causes a SIGSEGV on carts with many mesh nodes (e.g. voxel chunks).
    if (_handles) _handles->clear(false);
    // Detach the WorldEnvironment we may have spawned so its Sky /
    // ProceduralSkyMaterial Refs aren't dropped from inside the JS
    // runtime teardown — that ordering trips a SIGSEGV on shutdown for
    // some carts.
    // Null the sun and default lighting so they don't outlive the scene.
    _sun_light = nullptr;
    _main_light = nullptr;
    _fill_light_1 = nullptr;
    _fill_light_2 = nullptr;
    _fill_light_3 = nullptr;
    _point_light_1 = nullptr;
    _point_light_2 = nullptr;
    if (_world_env) {
        Ref<Environment> env = _world_env->get_environment();
        if (env.is_valid()) env->set_sky(Ref<Sky>());
        _world_env->set_environment(Ref<Environment>());
        _world_env->queue_free();
        _world_env = nullptr;
    }
    if (_overlay_layer) {
        _overlay_layer->queue_free();
        _overlay_layer = nullptr;
        _overlay = nullptr;
    }
    if (_context) {
        JS_FreeContext(_context);
        _context = nullptr;
    }
    if (_runtime) {
        JS_FreeRuntime(_runtime);
        _runtime = nullptr;
    }
    _cart_loaded = false;
    _shim_loaded = false;
}

void Nova64Host::_install_host_globals() {
    JSContext *ctx = _context;
    JSValue global = JS_GetGlobalObject(ctx);

    JS_SetPropertyStr(ctx, global, HOST_OPAQUE_KEY,
            JS_NewInt64(ctx, static_cast<int64_t>(reinterpret_cast<intptr_t>(this))));

    JS_SetPropertyStr(ctx, global, "print",
            JS_NewCFunction(ctx, js_print, "print", 1));

    JSValue engine_obj = JS_NewObject(ctx);
    JS_SetPropertyStr(ctx, engine_obj, "call",
            JS_NewCFunction(ctx, js_engine_call, "call", 2));
    JS_SetPropertyStr(ctx, engine_obj, "flush",
            JS_NewCFunction(ctx, js_engine_flush, "flush", 1));
    const char *shim = "(function(){ return engine.call('host.getCapabilities', {}).capabilities; })";
    JSValue shim_fn = JS_Eval(ctx, shim, std::strlen(shim), "<engine.getCapabilities>", JS_EVAL_TYPE_GLOBAL);
    JS_SetPropertyStr(ctx, engine_obj, "getCapabilities", shim_fn);
    JS_SetPropertyStr(ctx, global, "engine", engine_obj);

    JS_FreeValue(ctx, global);
}

void Nova64Host::_load_compat_shim() {
    if (_shim_loaded || !_context) return;
    const String shim_path = "res://shim/nova64-compat.js";
    if (!FileAccess::file_exists(shim_path)) {
        // Optional — carts that talk directly to engine.call work without it.
        return;
    }
    Ref<FileAccess> f = FileAccess::open(shim_path, FileAccess::READ);
    if (f.is_null()) return;
    String src = f->get_as_text();
    f->close();
    CharString utf8 = src.utf8();
    JSValue r = JS_Eval(_context, utf8.get_data(), utf8.length(),
            "<nova64-compat>", JS_EVAL_TYPE_GLOBAL);
    if (JS_IsException(r)) {
        JSValue exc = JS_GetException(_context);
        const char *msg = JS_ToCString(_context, exc);
        UtilityFunctions::printerr("[nova64] compat shim error: ",
                msg ? String::utf8(msg) : String("(unknown)"));
        if (msg) JS_FreeCString(_context, msg);
        JS_FreeValue(_context, exc);
    } else {
        _shim_loaded = true;
    }
    JS_FreeValue(_context, r);
}

Dictionary Nova64Host::get_capabilities() const {
    Dictionary caps;
    caps["backend"] = "godot";
    caps["contractVersion"] = ADAPTER_CONTRACT_VERSION;
    caps["adapterVersion"] = GODOT_ADAPTER_VERSION;

    Array features;
    features.append("host.getCapabilities");
    features.append("engine.init");
    features.append("material.create");
    features.append("material.destroy");
    features.append("geometry.createBox");
    features.append("geometry.createSphere");
    features.append("geometry.createPlane");
    features.append("mesh.create");
    features.append("mesh.setMaterial");
    features.append("mesh.destroy");
    features.append("transform.set");
    features.append("camera.create");
    features.append("camera.setActive");
    features.append("light.createDirectional");
    features.append("light.createPoint");
    features.append("light.createSpot");
    features.append("light.setColor");
    features.append("light.setEnergy");
    features.append("light.setSun");
    features.append("env.set");
    features.append("camera.setParams");
    features.append("geometry.createCylinder");
    features.append("geometry.createCone");
    features.append("geometry.createTorus");
    features.append("input.poll");
    features.append("texture.createFromImage");
    features.append("texture.destroy");
    features.append("audio.loadStream");
    features.append("audio.play");
    features.append("audio.stop");
    features.append("mesh.createInstanced");
    features.append("instance.setTransform");
    features.append("particles.create");
    features.append("particles.destroy");
    features.append("engine.flush");
    features.append("material.emission");
    features.append("material.blend.add");
    features.append("overlay.cls");
    features.append("overlay.pset");
    features.append("overlay.rect");
    features.append("overlay.line");
    features.append("overlay.circle");
    features.append("overlay.text");
    features.append("overlay.batch");
    caps["features"] = features;

    return caps;
}

Dictionary Nova64Host::call_bridge(const String &p_method, const Dictionary &p_payload) {
    if (p_method == "host.getCapabilities") {
        Dictionary out; out["capabilities"] = get_capabilities(); return out;
    }
    if (p_method == "engine.init") {
        // Spawn the default WorldEnvironment so every cart starts with a
        // sensible sky/glow/tonemap baseline rather than a black void.
        _ensure_environment();
        // Setup default scene lighting (matches Three.js backend for visual parity)
        _setup_default_lighting();
        Dictionary out; out["capabilities"] = get_capabilities(); return out;
    }
    if (p_method == "material.create")          return _cmd_material_create(p_payload);
    if (p_method == "material.destroy")         return _cmd_material_destroy(p_payload);
    if (p_method == "geometry.createBox")       return _cmd_geometry_create_box(p_payload);
    if (p_method == "geometry.createSphere")    return _cmd_geometry_create_sphere(p_payload);
    if (p_method == "geometry.createPlane")     return _cmd_geometry_create_plane(p_payload);
    if (p_method == "geometry.createCylinder")  return _cmd_geometry_create_cylinder(p_payload);
    if (p_method == "geometry.createCone")      return _cmd_geometry_create_cone(p_payload);
    if (p_method == "geometry.createTorus")     return _cmd_geometry_create_torus(p_payload);
    if (p_method == "mesh.create")              return _cmd_mesh_create(p_payload);
    if (p_method == "mesh.setMaterial")         return _cmd_mesh_set_material(p_payload);
    if (p_method == "mesh.destroy")             return _cmd_mesh_destroy(p_payload);
    if (p_method == "transform.set")            return _cmd_transform_set(p_payload);
    if (p_method == "camera.create")            return _cmd_camera_create(p_payload);
    if (p_method == "camera.setActive")         return _cmd_camera_set_active(p_payload);
    if (p_method == "camera.setParams")         return _cmd_camera_set_params(p_payload);
    if (p_method == "light.createDirectional")  return _cmd_light_create_directional(p_payload);
    if (p_method == "light.createPoint")        return _cmd_light_create_point(p_payload);
    if (p_method == "light.createSpot")         return _cmd_light_create_spot(p_payload);
    if (p_method == "light.setColor")           return _cmd_light_set_color(p_payload);
    if (p_method == "light.setEnergy")          return _cmd_light_set_energy(p_payload);
    if (p_method == "light.setSun")             return _cmd_light_set_sun(p_payload);
    if (p_method == "env.set")                  return _cmd_env_set(p_payload);
    if (p_method == "input.poll")               return _cmd_input_poll(p_payload);
    if (p_method == "texture.createFromImage")  return _cmd_texture_create_from_image(p_payload);
    if (p_method == "texture.destroy")           return _cmd_texture_destroy(p_payload);
    if (p_method == "audio.loadStream")          return _cmd_audio_load_stream(p_payload);
    if (p_method == "audio.play")                return _cmd_audio_play(p_payload);
    if (p_method == "audio.stop")                return _cmd_audio_stop(p_payload);
    if (p_method == "mesh.createInstanced")      return _cmd_mesh_create_instanced(p_payload);
    if (p_method == "instance.setTransform")     return _cmd_instance_set_transform(p_payload);
    if (p_method == "particles.create")           return _cmd_particles_create(p_payload);
    if (p_method == "particles.destroy")          return _cmd_particles_destroy(p_payload);
    if (p_method == "voxel.uploadChunk")           return _cmd_voxel_upload_chunk(p_payload);
    if (p_method == "overlay.cls")                return _cmd_overlay_cls(p_payload);
    if (p_method == "overlay.pset")               return _cmd_overlay_pset(p_payload);
    if (p_method == "overlay.rect")               return _cmd_overlay_rect(p_payload);
    if (p_method == "overlay.line")               return _cmd_overlay_line(p_payload);
    if (p_method == "overlay.circle")             return _cmd_overlay_circle(p_payload);
    if (p_method == "overlay.text")               return _cmd_overlay_text(p_payload);
    if (p_method == "overlay.batch")              return _cmd_overlay_batch(p_payload);

    return make_error("unsupported_method", p_method);
}

// ---- Command handlers ----------------------------------------------------

Dictionary Nova64Host::_cmd_material_create(const Dictionary &p) {
    Ref<StandardMaterial3D> mat;
    mat.instantiate();
    mat->set_albedo(color_from_payload(p, "albedo", Color(1.0f, 1.0f, 1.0f, 1.0f)));
    if (p.has("metallic")) mat->set_metallic(static_cast<float>(static_cast<double>(p["metallic"])));
    if (p.has("roughness")) mat->set_roughness(static_cast<float>(static_cast<double>(p["roughness"])));
    if (p.has("specular")) mat->set_specular(static_cast<float>(static_cast<double>(p["specular"])));

    // Shading mode: 'per_pixel' (default), 'per_vertex' (cheap), 'unshaded'.
    if (p.has("shadingMode")) {
        String s = p["shadingMode"];
        if (s == "unshaded") mat->set_shading_mode(BaseMaterial3D::SHADING_MODE_UNSHADED);
        else if (s == "per_vertex") mat->set_shading_mode(BaseMaterial3D::SHADING_MODE_PER_VERTEX);
        else mat->set_shading_mode(BaseMaterial3D::SHADING_MODE_PER_PIXEL);
    }
    if (p.has("unshaded") && static_cast<bool>(p["unshaded"])) {
        mat->set_shading_mode(BaseMaterial3D::SHADING_MODE_UNSHADED);
    }

    // Diffuse / specular shading models — toon kicks in cel-shaded look.
    if (p.has("diffuseMode")) {
        String d = p["diffuseMode"];
        if (d == "lambert_wrap") mat->set_diffuse_mode(BaseMaterial3D::DIFFUSE_LAMBERT_WRAP);
        else if (d == "toon") mat->set_diffuse_mode(BaseMaterial3D::DIFFUSE_TOON);
        else if (d == "burley") mat->set_diffuse_mode(BaseMaterial3D::DIFFUSE_BURLEY);
        else mat->set_diffuse_mode(BaseMaterial3D::DIFFUSE_LAMBERT);
    }
    if (p.has("specularMode")) {
        String s = p["specularMode"];
        if (s == "toon") mat->set_specular_mode(BaseMaterial3D::SPECULAR_TOON);
        else if (s == "disabled") mat->set_specular_mode(BaseMaterial3D::SPECULAR_DISABLED);
        else mat->set_specular_mode(BaseMaterial3D::SPECULAR_SCHLICK_GGX);
    }

    if (p.has("emission")) {
        Color em = color_from_payload(p, "emission", Color(0, 0, 0, 1));
        mat->set_feature(BaseMaterial3D::FEATURE_EMISSION, true);
        mat->set_emission(em);
        if (p.has("emissionEnergy")) {
            mat->set_emission_energy_multiplier(
                    static_cast<float>(static_cast<double>(p["emissionEnergy"])));
        }
    }
    if (p.has("rim")) {
        mat->set_feature(BaseMaterial3D::FEATURE_RIM, true);
        mat->set_rim(static_cast<float>(static_cast<double>(p["rim"])));
        if (p.has("rimTint")) mat->set_rim_tint(static_cast<float>(static_cast<double>(p["rimTint"])));
    }
    if (p.has("clearcoat")) {
        mat->set_feature(BaseMaterial3D::FEATURE_CLEARCOAT, true);
        mat->set_clearcoat(static_cast<float>(static_cast<double>(p["clearcoat"])));
        if (p.has("clearcoatRoughness")) mat->set_clearcoat_roughness(
                static_cast<float>(static_cast<double>(p["clearcoatRoughness"])));
    }
    if (p.has("anisotropy")) {
        mat->set_feature(BaseMaterial3D::FEATURE_ANISOTROPY, true);
        mat->set_anisotropy(static_cast<float>(static_cast<double>(p["anisotropy"])));
    }

    // Transparency / blend.
    if (p.has("transparency")) {
        String t = p["transparency"];
        if (t == "alpha") mat->set_transparency(BaseMaterial3D::TRANSPARENCY_ALPHA);
        else if (t == "scissor") mat->set_transparency(BaseMaterial3D::TRANSPARENCY_ALPHA_SCISSOR);
        else if (t == "hash") mat->set_transparency(BaseMaterial3D::TRANSPARENCY_ALPHA_HASH);
        else if (t == "depth_prepass") mat->set_transparency(BaseMaterial3D::TRANSPARENCY_ALPHA_DEPTH_PRE_PASS);
        else mat->set_transparency(BaseMaterial3D::TRANSPARENCY_DISABLED);
    }
    if (p.has("alphaCut")) {
        mat->set_alpha_scissor_threshold(static_cast<float>(static_cast<double>(p["alphaCut"])));
        mat->set_transparency(BaseMaterial3D::TRANSPARENCY_ALPHA_SCISSOR);
    }
    if (p.has("blend")) {
        String b = p["blend"];
        if (b == "add") {
            mat->set_transparency(BaseMaterial3D::TRANSPARENCY_ALPHA);
            mat->set_blend_mode(BaseMaterial3D::BLEND_MODE_ADD);
            mat->set_depth_draw_mode(BaseMaterial3D::DEPTH_DRAW_DISABLED);
        } else if (b == "sub") {
            mat->set_transparency(BaseMaterial3D::TRANSPARENCY_ALPHA);
            mat->set_blend_mode(BaseMaterial3D::BLEND_MODE_SUB);
        } else if (b == "mul") {
            mat->set_transparency(BaseMaterial3D::TRANSPARENCY_ALPHA);
            mat->set_blend_mode(BaseMaterial3D::BLEND_MODE_MUL);
        } else if (b == "alpha") {
            mat->set_transparency(BaseMaterial3D::TRANSPARENCY_ALPHA);
        }
    }

    // Cull mode.
    if (p.has("cull")) {
        String c = p["cull"];
        if (c == "front") mat->set_cull_mode(BaseMaterial3D::CULL_FRONT);
        else if (c == "disabled" || c == "none") mat->set_cull_mode(BaseMaterial3D::CULL_DISABLED);
        else mat->set_cull_mode(BaseMaterial3D::CULL_BACK);
    }
    if (p.has("doubleSided") && static_cast<bool>(p["doubleSided"])) {
        mat->set_cull_mode(BaseMaterial3D::CULL_DISABLED);
    }

    // Texture maps.
    auto bind_tex = [&](const String &key, BaseMaterial3D::TextureParam slot) {
        if (!p.has(key)) return;
        uint32_t tex_id = handle_id_from_payload(p, key);
        Ref<RefCounted> tex_res = _handles->get_resource(tex_id, HandleKind::TEXTURE);
        Ref<Texture2D> tex = tex_res;
        if (tex.is_valid()) mat->set_texture(slot, tex);
    };
    bind_tex("albedoTexture",   BaseMaterial3D::TEXTURE_ALBEDO);
    if (p.has("normalMap")) {
        bind_tex("normalMap", BaseMaterial3D::TEXTURE_NORMAL);
        mat->set_feature(BaseMaterial3D::FEATURE_NORMAL_MAPPING, true);
        if (p.has("normalScale")) mat->set_normal_scale(
                static_cast<float>(static_cast<double>(p["normalScale"])));
    }
    if (p.has("emissionMap")) {
        bind_tex("emissionMap", BaseMaterial3D::TEXTURE_EMISSION);
        mat->set_feature(BaseMaterial3D::FEATURE_EMISSION, true);
    }
    bind_tex("roughnessMap", BaseMaterial3D::TEXTURE_ROUGHNESS);
    bind_tex("metallicMap",  BaseMaterial3D::TEXTURE_METALLIC);
    bind_tex("aoMap",        BaseMaterial3D::TEXTURE_AMBIENT_OCCLUSION);

    // UV scale (uv1_scale Vector3 — z is a layer)
    if (p.has("uvScale")) {
        Vector3 us = vec3_from_payload(p, "uvScale", Vector3(1, 1, 1));
        mat->set_uv1_scale(us);
    }

    // Enhanced defaults for better visual quality (Phase 2: Visual Parity)
    // Add subtle rim lighting by default if not explicitly disabled
    if (!p.has("rim") && !p.has("disableRim")) {
        mat->set_feature(BaseMaterial3D::FEATURE_RIM, true);
        mat->set_rim(0.15f);        // Subtle rim for edge definition
        mat->set_rim_tint(0.5f);    // Balanced tint
    }

    // Note: Godot's PBR workflow automatically handles metallic specular reflections
    // via environment maps when metallic > 0. No additional setup needed.

    uint32_t id = _handles->put_resource(HandleKind::MATERIAL, mat);
    return make_handle_result(id);
}

Dictionary Nova64Host::_cmd_material_destroy(const Dictionary &p) {
    uint32_t id = handle_id_from_payload(p, "handle");
    bool ok = _handles->destroy(id, false);
    Dictionary out; out["ok"] = ok; return out;
}

Dictionary Nova64Host::_cmd_geometry_create_box(const Dictionary &p) {
    Ref<BoxMesh> m; m.instantiate();
    m->set_size(vec3_from_payload(p, "size", Vector3(1.0f, 1.0f, 1.0f)));
    uint32_t id = _handles->put_resource(HandleKind::GEOMETRY, m);
    return make_handle_result(id);
}

Dictionary Nova64Host::_cmd_geometry_create_sphere(const Dictionary &p) {
    Ref<SphereMesh> m; m.instantiate();
    if (p.has("radius")) m->set_radius(static_cast<float>(static_cast<double>(p["radius"])));
    if (p.has("height")) m->set_height(static_cast<float>(static_cast<double>(p["height"])));
    uint32_t id = _handles->put_resource(HandleKind::GEOMETRY, m);
    return make_handle_result(id);
}

Dictionary Nova64Host::_cmd_geometry_create_plane(const Dictionary &p) {
    Ref<PlaneMesh> m; m.instantiate();
    if (p.has("size")) {
        Vector3 s = vec3_from_payload(p, "size", Vector3(1.0f, 0.0f, 1.0f));
        m->set_size(Vector2(s.x, s.z != 0.0f ? s.z : s.y));
    }
    uint32_t id = _handles->put_resource(HandleKind::GEOMETRY, m);
    return make_handle_result(id);
}

Dictionary Nova64Host::_cmd_geometry_create_cylinder(const Dictionary &p) {
    Ref<CylinderMesh> m; m.instantiate();
    if (p.has("topRadius"))    m->set_top_radius(static_cast<float>(static_cast<double>(p["topRadius"])));
    if (p.has("bottomRadius")) m->set_bottom_radius(static_cast<float>(static_cast<double>(p["bottomRadius"])));
    if (p.has("height"))       m->set_height(static_cast<float>(static_cast<double>(p["height"])));
    if (p.has("sides"))        m->set_radial_segments(static_cast<int>(static_cast<int64_t>(p["sides"])));
    uint32_t id = _handles->put_resource(HandleKind::GEOMETRY, m);
    return make_handle_result(id);
}

Dictionary Nova64Host::_cmd_geometry_create_cone(const Dictionary &p) {
    // A cone is just a cylinder with topRadius = 0.
    Ref<CylinderMesh> m; m.instantiate();
    m->set_top_radius(0.0f);
    if (p.has("radius")) m->set_bottom_radius(static_cast<float>(static_cast<double>(p["radius"])));
    if (p.has("height")) m->set_height(static_cast<float>(static_cast<double>(p["height"])));
    if (p.has("sides"))  m->set_radial_segments(static_cast<int>(static_cast<int64_t>(p["sides"])));
    uint32_t id = _handles->put_resource(HandleKind::GEOMETRY, m);
    return make_handle_result(id);
}

Dictionary Nova64Host::_cmd_geometry_create_torus(const Dictionary &p) {
    Ref<TorusMesh> m; m.instantiate();
    if (p.has("innerRadius")) m->set_inner_radius(static_cast<float>(static_cast<double>(p["innerRadius"])));
    if (p.has("outerRadius")) m->set_outer_radius(static_cast<float>(static_cast<double>(p["outerRadius"])));
    uint32_t id = _handles->put_resource(HandleKind::GEOMETRY, m);
    return make_handle_result(id);
}

Dictionary Nova64Host::_cmd_mesh_create(const Dictionary &p) {
    uint32_t geom_id = handle_id_from_payload(p, "geometry");
    Ref<RefCounted> geom_ref = _handles->get_resource(geom_id, HandleKind::GEOMETRY);
    if (geom_ref.is_null()) return make_error("invalid_geometry_handle", "mesh.create");

    Ref<Mesh> mesh = geom_ref;
    if (mesh.is_null()) return make_error("geometry_handle_not_mesh", "mesh.create");

    MeshInstance3D *node = memnew(MeshInstance3D);
    node->set_mesh(mesh);
    if (p.has("material")) {
        uint32_t mat_id = handle_id_from_payload(p, "material");
        Ref<RefCounted> mat_ref = _handles->get_resource(mat_id, HandleKind::MATERIAL);
        Ref<Material> mat = mat_ref;
        if (mat.is_valid()) node->set_surface_override_material(0, mat);
    }
    add_child(node);

    uint32_t id = _handles->put_node(HandleKind::MESH_INSTANCE, node);
    return make_handle_result(id);
}

Dictionary Nova64Host::_cmd_mesh_set_material(const Dictionary &p) {
    uint32_t mesh_id = handle_id_from_payload(p, "mesh");
    uint32_t mat_id  = handle_id_from_payload(p, "material");

    Object *obj = _handles->get_node(mesh_id, HandleKind::MESH_INSTANCE);
    MeshInstance3D *mi = Object::cast_to<MeshInstance3D>(obj);
    if (!mi) return make_error("invalid_mesh_handle", "mesh.setMaterial");

    Ref<RefCounted> mat_ref = _handles->get_resource(mat_id, HandleKind::MATERIAL);
    Ref<Material> mat = mat_ref;
    if (mat.is_null()) return make_error("invalid_material_handle", "mesh.setMaterial");

    mi->set_surface_override_material(0, mat);
    Dictionary out; out["ok"] = true; return out;
}

Dictionary Nova64Host::_cmd_mesh_destroy(const Dictionary &p) {
    uint32_t id = handle_id_from_payload(p, "handle");
    bool ok = _handles->destroy(id, true);
    Dictionary out; out["ok"] = ok; return out;
}

Node3D *Nova64Host::_resolve_node3d(uint32_t p_handle_id) const {
    if (Object *o = _handles->get_node(p_handle_id, HandleKind::MESH_INSTANCE)) return Object::cast_to<Node3D>(o);
    if (Object *o = _handles->get_node(p_handle_id, HandleKind::CAMERA))        return Object::cast_to<Node3D>(o);
    if (Object *o = _handles->get_node(p_handle_id, HandleKind::LIGHT))         return Object::cast_to<Node3D>(o);
    if (Object *o = _handles->get_node(p_handle_id, HandleKind::MULTI_MESH))    return Object::cast_to<Node3D>(o);
    if (Object *o = _handles->get_node(p_handle_id, HandleKind::PARTICLES))     return Object::cast_to<Node3D>(o);
    return nullptr;
}

Dictionary Nova64Host::_cmd_transform_set(const Dictionary &p) {
    uint32_t id = handle_id_from_payload(p, "handle");
    Node3D *n = _resolve_node3d(id);
    if (!n) return make_error("invalid_node_handle", "transform.set");

    if (p.has("position")) n->set_position(vec3_from_payload(p, "position", n->get_position()));
    if (p.has("rotation")) {
        Vector3 r = vec3_from_payload(p, "rotation", n->get_rotation());
        n->set_rotation(r);
    }
    if (p.has("scale")) n->set_scale(vec3_from_payload(p, "scale", n->get_scale()));
    if (p.has("visible")) n->set_visible(static_cast<bool>(p["visible"]));

    Dictionary out; out["ok"] = true; return out;
}

Dictionary Nova64Host::_cmd_camera_create(const Dictionary &p) {
    Camera3D *cam = memnew(Camera3D);
    add_child(cam);
    // Saner defaults than Godot's camera (FOV 75, near 0.05, far 4000):
    // closer to the Three.js defaults Nova carts grew up on.
    double fov  = p.has("fov")  ? static_cast<double>(p["fov"])  : 60.0;
    double near = p.has("near") ? static_cast<double>(p["near"]) : 0.1;
    double far  = p.has("far")  ? static_cast<double>(p["far"])  : 1000.0;
    cam->set_fov(static_cast<float>(fov));
    cam->set_near(static_cast<float>(near));
    cam->set_far(static_cast<float>(far));
    uint32_t id = _handles->put_node(HandleKind::CAMERA, cam);
    return make_handle_result(id);
}

Dictionary Nova64Host::_cmd_camera_set_active(const Dictionary &p) {
    uint32_t id = handle_id_from_payload(p, "handle");
    Object *o = _handles->get_node(id, HandleKind::CAMERA);
    Camera3D *cam = Object::cast_to<Camera3D>(o);
    if (!cam) return make_error("invalid_camera_handle", "camera.setActive");
    cam->make_current();
    Dictionary out; out["ok"] = true; return out;
}

Dictionary Nova64Host::_cmd_camera_set_params(const Dictionary &p) {
    uint32_t id = handle_id_from_payload(p, "handle");
    Object *o = _handles->get_node(id, HandleKind::CAMERA);
    Camera3D *cam = Object::cast_to<Camera3D>(o);
    if (!cam) return make_error("invalid_camera_handle", "camera.setParams");
    if (p.has("fov"))  cam->set_fov(static_cast<float>(static_cast<double>(p["fov"])));
    if (p.has("near")) cam->set_near(static_cast<float>(static_cast<double>(p["near"])));
    if (p.has("far"))  cam->set_far(static_cast<float>(static_cast<double>(p["far"])));
    Dictionary out; out["ok"] = true; return out;
}

Dictionary Nova64Host::_cmd_light_set_sun(const Dictionary &p) {
    // Creates or updates a shared DirectionalLight3D that acts as the sun.
    // Called by setVoxelDayTime() in the shim to replicate the day/night
    // ambient + sun brightness the web voxel engine applies via skylight.
    if (!_sun_light) {
        _sun_light = memnew(DirectionalLight3D);
        _sun_light->set_shadow(true);
        _sun_light->set_param(Light3D::PARAM_SHADOW_BIAS, 0.02f);
        _sun_light->set_param(Light3D::PARAM_SHADOW_NORMAL_BIAS, 1.0f);
        add_child(_sun_light);
    }
    if (p.has("energy"))
        _sun_light->set_param(Light3D::PARAM_ENERGY,
                static_cast<float>(static_cast<double>(p["energy"])));
    if (p.has("color"))
        _sun_light->set_color(color_from_payload(p, "color", Color(1, 1, 1, 1)));
    // pitch and yaw are in degrees.
    float pitch = p.has("pitch") ? static_cast<float>(static_cast<double>(p["pitch"])) : -45.0f;
    float yaw   = p.has("yaw")   ? static_cast<float>(static_cast<double>(p["yaw"]))   : -45.0f;
    _sun_light->set_rotation(Vector3(
        Math::deg_to_rad(pitch),
        Math::deg_to_rad(yaw),
        0.0f));
    Dictionary out; out["ok"] = true; return out;
}

Dictionary Nova64Host::_cmd_light_create_directional(const Dictionary &p) {
    DirectionalLight3D *light = memnew(DirectionalLight3D);
    add_child(light);
    if (p.has("color")) light->set_color(color_from_payload(p, "color", Color(1, 1, 1, 1)));
    light->set_param(Light3D::PARAM_ENERGY,
            p.has("energy") ? static_cast<float>(static_cast<double>(p["energy"])) : 1.0f);
    // Shadows on by default — most carts expect rim/cast shadows for shape
    // readability. Cheap mode keeps perf reasonable on mobile.
    bool shadow = p.has("shadow") ? static_cast<bool>(p["shadow"]) : true;
    light->set_shadow(shadow);
    if (shadow) {
        light->set_param(Light3D::PARAM_SHADOW_BIAS, 0.03f);
        light->set_param(Light3D::PARAM_SHADOW_NORMAL_BIAS, 1.0f);
    }
    // Tilt the default sun a bit so flat-lit scenes still have shading.
    light->set_rotation(Vector3(-0.9f, -0.6f, 0.0f));
    uint32_t id = _handles->put_node(HandleKind::LIGHT, light);
    return make_handle_result(id);
}

Dictionary Nova64Host::_cmd_light_create_point(const Dictionary &p) {
    OmniLight3D *light = memnew(OmniLight3D);
    add_child(light);
    if (p.has("color")) light->set_color(color_from_payload(p, "color", Color(1, 1, 1, 1)));
    light->set_param(Light3D::PARAM_ENERGY,
            p.has("energy") ? static_cast<float>(static_cast<double>(p["energy"])) : 1.0f);
    if (p.has("range")) {
        light->set_param(Light3D::PARAM_RANGE,
                static_cast<float>(static_cast<double>(p["range"])));
    } else {
        light->set_param(Light3D::PARAM_RANGE, 20.0f);
    }
    if (p.has("attenuation")) {
        light->set_param(Light3D::PARAM_ATTENUATION,
                static_cast<float>(static_cast<double>(p["attenuation"])));
    }
    if (p.has("position")) {
        Vector3 pos = vec3_from_payload(p, "position", Vector3());
        light->set_position(pos);
    }
    uint32_t id = _handles->put_node(HandleKind::LIGHT, light);
    return make_handle_result(id);
}

Dictionary Nova64Host::_cmd_light_create_spot(const Dictionary &p) {
    SpotLight3D *light = memnew(SpotLight3D);
    add_child(light);
    if (p.has("color")) light->set_color(color_from_payload(p, "color", Color(1, 1, 1, 1)));
    light->set_param(Light3D::PARAM_ENERGY,
            p.has("energy") ? static_cast<float>(static_cast<double>(p["energy"])) : 1.0f);
    if (p.has("range")) {
        light->set_param(Light3D::PARAM_RANGE,
                static_cast<float>(static_cast<double>(p["range"])));
    } else {
        light->set_param(Light3D::PARAM_RANGE, 20.0f);
    }
    if (p.has("angle")) {
        light->set_param(Light3D::PARAM_SPOT_ANGLE,
                static_cast<float>(static_cast<double>(p["angle"])));
    } else {
        light->set_param(Light3D::PARAM_SPOT_ANGLE, 35.0f);
    }
    if (p.has("position")) {
        Vector3 pos = vec3_from_payload(p, "position", Vector3());
        light->set_position(pos);
    }
    uint32_t id = _handles->put_node(HandleKind::LIGHT, light);
    return make_handle_result(id);
}

Dictionary Nova64Host::_cmd_light_set_color(const Dictionary &p) {
    uint32_t id = handle_id_from_payload(p, "handle");
    Light3D *light = Object::cast_to<Light3D>(_handles->get_node(id, HandleKind::LIGHT));
    if (!light) return make_error("invalid_light_handle", "light.setColor");
    light->set_color(color_from_payload(p, "color", Color(1, 1, 1, 1)));
    Dictionary out; out["ok"] = true; return out;
}

Dictionary Nova64Host::_cmd_light_set_energy(const Dictionary &p) {
    uint32_t id = handle_id_from_payload(p, "handle");
    Light3D *light = Object::cast_to<Light3D>(_handles->get_node(id, HandleKind::LIGHT));
    if (!light) return make_error("invalid_light_handle", "light.setEnergy");
    light->set_param(Light3D::PARAM_ENERGY,
            p.has("energy") ? static_cast<float>(static_cast<double>(p["energy"])) : 1.0f);
    Dictionary out; out["ok"] = true; return out;
}

// ---- Environment ---------------------------------------------------------

Environment *Nova64Host::_ensure_environment() {
    if (_world_env != nullptr) {
        Ref<Environment> env = _world_env->get_environment();
        if (env.is_valid()) return env.ptr();
    }
    if (_world_env == nullptr) {
        _world_env = memnew(WorldEnvironment);
        add_child(_world_env);
    }
    Ref<Environment> env;
    env.instantiate();

    // Sky — procedural gradient so empty scenes don't render black.
    Ref<Sky> sky;
    sky.instantiate();
    Ref<ProceduralSkyMaterial> sky_mat;
    sky_mat.instantiate();
    sky_mat->set_sky_top_color(Color(0.12f, 0.22f, 0.40f, 1.0f));
    sky_mat->set_sky_horizon_color(Color(0.42f, 0.50f, 0.62f, 1.0f));
    sky_mat->set_ground_horizon_color(Color(0.28f, 0.28f, 0.30f, 1.0f));
    sky_mat->set_ground_bottom_color(Color(0.06f, 0.06f, 0.08f, 1.0f));
    sky_mat->set_sun_angle_max(30.0f);
    sky->set_material(sky_mat);
    env->set_sky(sky);
    env->set_background(Environment::BG_SKY);
    env->set_ambient_source(Environment::AMBIENT_SOURCE_SKY);
    env->set_reflection_source(Environment::REFLECTION_SOURCE_SKY);
    env->set_ambient_light_energy(0.85f); // Increased from 0.72 for brighter ambient (closer to Three.js)

    // Tonemap — ACES filmic to match Three.js, higher exposure for dramatic lighting
    // (Phase 3: Visual Parity - matches Three.js ACESFilmicToneMapping with exposure 1.25)
    env->set_tonemapper(Environment::TONE_MAPPER_ACES);  // Changed from FILMIC to ACES
    env->set_tonemap_exposure(1.2f);                      // Increased from 0.96 to 1.2
    env->set_tonemap_white(6.0f);                         // Increased from 5.0 for brighter highlights

    // Glow / bloom — enhanced to match Three.js dramatic lighting
    // (Phase 3: Visual Parity - more intense bloom for cinematic effect)
    env->set_glow_enabled(true);
    env->set_glow_intensity(1.1f);              // Increased from 0.92 to 1.1
    env->set_glow_strength(1.3f);               // Increased from 1.15 to 1.3
    env->set_glow_bloom(0.12f);                 // Increased from 0.08 to 0.12
    env->set_glow_hdr_bleed_threshold(0.85f);   // Lower from 0.9 to 0.85 for more bloom
    env->set_glow_hdr_luminance_cap(16.0f);     // Add cap for emissive materials

    // SSAO — subtle, off by default (can be expensive on mobile). Carts
    // enable explicitly via env.set.
    env->set_ssao_enabled(false);
    env->set_ssao_radius(1.0f);
    env->set_ssao_intensity(1.0f);

    // Subtle adjustments for that warm retro feel.
    env->set_adjustment_enabled(true);
    env->set_adjustment_brightness(1.0f);
    env->set_adjustment_contrast(1.12f);
    env->set_adjustment_saturation(1.08f);

    _world_env->set_environment(env);
    return env.ptr();
}

Dictionary Nova64Host::_cmd_env_set(const Dictionary &p) {
    Environment *env = _ensure_environment();
    if (!env) return make_error("env_unavailable", "env.set");

    if (p.has("ambient")) {
        // When a cart explicitly sets ambient light color, switch to COLOR mode
        // to match Three.js behavior (AmbientLight sets a flat color, not sky-based).
        env->set_ambient_source(Environment::AMBIENT_SOURCE_COLOR);
        env->set_ambient_light_color(color_from_payload(p, "ambient", Color(0.2f, 0.2f, 0.2f, 1.0f)));
        // NOTE: Background remains SKY unless cart explicitly sets background or fog color
    }
    if (p.has("ambientEnergy")) {
        env->set_ambient_light_energy(static_cast<float>(static_cast<double>(p["ambientEnergy"])));
    }
    if (p.has("background")) {
        Color bg = color_from_payload(p, "background", Color(0, 0, 0, 1));
        env->set_background(Environment::BG_COLOR);
        env->set_bg_color(bg);
    } else if (p.has("sky") && static_cast<bool>(p["sky"])) {
        env->set_background(Environment::BG_SKY);
    }

    if (p.has("glow")) env->set_glow_enabled(static_cast<bool>(p["glow"]));
    if (p.has("glowIntensity")) env->set_glow_intensity(
            static_cast<float>(static_cast<double>(p["glowIntensity"])));
    if (p.has("glowStrength")) env->set_glow_strength(
            static_cast<float>(static_cast<double>(p["glowStrength"])));
    if (p.has("glowBloom")) env->set_glow_bloom(
            static_cast<float>(static_cast<double>(p["glowBloom"])));
    if (p.has("glowThreshold")) env->set_glow_hdr_bleed_threshold(
            static_cast<float>(static_cast<double>(p["glowThreshold"])));

    if (p.has("fog")) env->set_fog_enabled(static_cast<bool>(p["fog"]));
    if (p.has("fogColor")) {
        Color fog_color = color_from_payload(p, "fogColor", Color(0.5f, 0.6f, 0.7f, 1.0f));
        env->set_fog_light_color(fog_color);
        // Match Three.js behavior: when fog is set, the background should be the fog color
        // so distant objects fade into the background seamlessly
        env->set_background(Environment::BG_COLOR);
        env->set_bg_color(fog_color);
    }
    if (p.has("fogDensity")) env->set_fog_density(
            static_cast<float>(static_cast<double>(p["fogDensity"])));
    if (p.has("fogNear") || p.has("fogFar")) {
        // Match Three.js linear fog semantics by driving Godot depth fog.
        env->set_fog_mode(Environment::FOG_MODE_DEPTH);
        if (p.has("fogNear")) {
            env->set_fog_depth_begin(static_cast<float>(static_cast<double>(p["fogNear"])));
        }
        if (p.has("fogFar")) {
            env->set_fog_depth_end(static_cast<float>(static_cast<double>(p["fogFar"])));
        }
        if (p.has("fogCurve")) {
            env->set_fog_depth_curve(static_cast<float>(static_cast<double>(p["fogCurve"])));
        }
    }

    if (p.has("ssao")) env->set_ssao_enabled(static_cast<bool>(p["ssao"]));
    if (p.has("ssaoIntensity")) env->set_ssao_intensity(
            static_cast<float>(static_cast<double>(p["ssaoIntensity"])));

    if (p.has("tonemap")) {
        String t = p["tonemap"];
        if (t == "linear")  env->set_tonemapper(Environment::TONE_MAPPER_LINEAR);
        else if (t == "reinhard") env->set_tonemapper(Environment::TONE_MAPPER_REINHARDT);
        else if (t == "filmic") env->set_tonemapper(Environment::TONE_MAPPER_FILMIC);
        else if (t == "aces")  env->set_tonemapper(Environment::TONE_MAPPER_ACES);
    }
    if (p.has("exposure")) env->set_tonemap_exposure(
            static_cast<float>(static_cast<double>(p["exposure"])));

    if (p.has("brightness")) env->set_adjustment_brightness(
            static_cast<float>(static_cast<double>(p["brightness"])));
    if (p.has("contrast")) env->set_adjustment_contrast(
            static_cast<float>(static_cast<double>(p["contrast"])));
    if (p.has("saturation")) env->set_adjustment_saturation(
            static_cast<float>(static_cast<double>(p["saturation"])));

    // Depth-of-field is on CameraAttributes in Godot 4 — handled via
    // camera.setParams once we wire that up. Skipped here.

    // Screen-space reflections.
    if (p.has("ssr")) env->set_ssr_enabled(static_cast<bool>(p["ssr"]));
    if (p.has("ssrSteps")) env->set_ssr_max_steps(
            static_cast<int>(static_cast<int64_t>(p["ssrSteps"])));

    // Volumetric fog (cheap god-rays).
    if (p.has("volumetricFog")) env->set_volumetric_fog_enabled(static_cast<bool>(p["volumetricFog"]));
    if (p.has("volumetricFogDensity")) env->set_volumetric_fog_density(
            static_cast<float>(static_cast<double>(p["volumetricFogDensity"])));

    // Procedural sky tweaks.
    Ref<Sky> sky = env->get_sky();
    Ref<ProceduralSkyMaterial> sky_mat;
    if (sky.is_valid()) sky_mat = sky->get_material();

    if (sky_mat.is_valid()) {
        if (p.has("skyTopColor")) sky_mat->set_sky_top_color(
                color_from_payload(p, "skyTopColor", Color(0.18f, 0.32f, 0.55f, 1)));
        if (p.has("skyHorizonColor")) sky_mat->set_sky_horizon_color(
                color_from_payload(p, "skyHorizonColor", Color(0.55f, 0.62f, 0.72f, 1)));
        if (p.has("groundHorizonColor")) sky_mat->set_ground_horizon_color(
                color_from_payload(p, "groundHorizonColor", Color(0.42f, 0.40f, 0.38f, 1)));
        if (p.has("groundBottomColor")) sky_mat->set_ground_bottom_color(
                color_from_payload(p, "groundBottomColor", Color(0.10f, 0.10f, 0.12f, 1)));
        if (p.has("sunAngleMax")) sky_mat->set_sun_angle_max(
                static_cast<float>(static_cast<double>(p["sunAngleMax"])));
        if (p.has("sunCurve")) sky_mat->set_sun_curve(
                static_cast<float>(static_cast<double>(p["sunCurve"])));
    }

    // Sky presets — the heavy hitter for instant atmosphere.
    if (p.has("skyPreset") && sky_mat.is_valid()) {
        String name = p["skyPreset"];
        if (name == "space") {
            sky_mat->set_sky_top_color(Color(0.01f, 0.01f, 0.03f));
            sky_mat->set_sky_horizon_color(Color(0.05f, 0.05f, 0.12f));
            sky_mat->set_ground_horizon_color(Color(0.02f, 0.02f, 0.05f));
            sky_mat->set_ground_bottom_color(Color(0.0f, 0.0f, 0.0f));
            sky_mat->set_sun_angle_max(5.0f);
            env->set_ambient_light_energy(0.15f);
            env->set_glow_intensity(1.4f);
        } else if (name == "sunset") {
            sky_mat->set_sky_top_color(Color(0.12f, 0.18f, 0.40f));
            sky_mat->set_sky_horizon_color(Color(1.0f, 0.45f, 0.20f));
            sky_mat->set_ground_horizon_color(Color(0.55f, 0.20f, 0.10f));
            sky_mat->set_ground_bottom_color(Color(0.10f, 0.05f, 0.05f));
            sky_mat->set_sun_angle_max(35.0f);
            env->set_ambient_light_color(Color(1.0f, 0.6f, 0.4f));
            env->set_ambient_source(Environment::AMBIENT_SOURCE_SKY);
            env->set_ambient_light_energy(1.2f);
        } else if (name == "dawn") {
            sky_mat->set_sky_top_color(Color(0.55f, 0.50f, 0.75f));
            sky_mat->set_sky_horizon_color(Color(1.0f, 0.75f, 0.55f));
            sky_mat->set_ground_horizon_color(Color(0.50f, 0.40f, 0.45f));
            sky_mat->set_ground_bottom_color(Color(0.18f, 0.18f, 0.22f));
            env->set_ambient_light_energy(1.0f);
        } else if (name == "night") {
            sky_mat->set_sky_top_color(Color(0.01f, 0.02f, 0.06f));
            sky_mat->set_sky_horizon_color(Color(0.05f, 0.08f, 0.18f));
            sky_mat->set_ground_horizon_color(Color(0.02f, 0.02f, 0.05f));
            sky_mat->set_ground_bottom_color(Color(0.0f, 0.0f, 0.0f));
            env->set_ambient_light_color(Color(0.20f, 0.30f, 0.55f));
            env->set_ambient_source(Environment::AMBIENT_SOURCE_COLOR);
            env->set_ambient_light_energy(0.4f);
        } else if (name == "foggy") {
            sky_mat->set_sky_top_color(Color(0.55f, 0.58f, 0.62f));
            sky_mat->set_sky_horizon_color(Color(0.75f, 0.78f, 0.82f));
            sky_mat->set_ground_horizon_color(Color(0.55f, 0.55f, 0.55f));
            sky_mat->set_ground_bottom_color(Color(0.30f, 0.30f, 0.32f));
            env->set_fog_enabled(true);
            env->set_fog_light_color(Color(0.75f, 0.78f, 0.82f));
            env->set_fog_density(0.04f);
        } else if (name == "dusk") {
            sky_mat->set_sky_top_color(Color(0.20f, 0.10f, 0.35f));
            sky_mat->set_sky_horizon_color(Color(0.85f, 0.40f, 0.55f));
            sky_mat->set_ground_horizon_color(Color(0.30f, 0.15f, 0.30f));
            sky_mat->set_ground_bottom_color(Color(0.05f, 0.02f, 0.10f));
            env->set_ambient_light_energy(0.7f);
        } else if (name == "storm") {
            sky_mat->set_sky_top_color(Color(0.18f, 0.20f, 0.22f));
            sky_mat->set_sky_horizon_color(Color(0.30f, 0.32f, 0.30f));
            sky_mat->set_ground_horizon_color(Color(0.15f, 0.16f, 0.15f));
            sky_mat->set_ground_bottom_color(Color(0.05f, 0.05f, 0.05f));
            env->set_fog_enabled(true);
            env->set_fog_light_color(Color(0.40f, 0.42f, 0.40f));
            env->set_fog_density(0.06f);
            env->set_ambient_light_energy(0.5f);
        } else if (name == "alien") {
            sky_mat->set_sky_top_color(Color(0.20f, 0.05f, 0.35f));
            sky_mat->set_sky_horizon_color(Color(0.60f, 0.25f, 0.55f));
            sky_mat->set_ground_horizon_color(Color(0.30f, 0.55f, 0.25f));
            sky_mat->set_ground_bottom_color(Color(0.10f, 0.20f, 0.10f));
            env->set_ambient_light_color(Color(0.65f, 0.40f, 0.85f));
            env->set_ambient_source(Environment::AMBIENT_SOURCE_COLOR);
            env->set_ambient_light_energy(0.8f);
        } else if (name == "underwater") {
            sky_mat->set_sky_top_color(Color(0.05f, 0.20f, 0.35f));
            sky_mat->set_sky_horizon_color(Color(0.10f, 0.45f, 0.55f));
            sky_mat->set_ground_horizon_color(Color(0.05f, 0.20f, 0.30f));
            sky_mat->set_ground_bottom_color(Color(0.02f, 0.08f, 0.15f));
            env->set_fog_enabled(true);
            env->set_fog_light_color(Color(0.10f, 0.40f, 0.55f));
            env->set_fog_density(0.08f);
            env->set_ambient_light_color(Color(0.20f, 0.55f, 0.80f));
            env->set_ambient_source(Environment::AMBIENT_SOURCE_COLOR);
            env->set_ambient_light_energy(0.9f);
        }
        env->set_background(Environment::BG_SKY);
    }

    Dictionary out; out["ok"] = true; return out;
}

// ---- Default Scene Lighting (Visual Parity with Three.js) ---------------

void Nova64Host::_setup_default_lighting() {
    // This lighting setup matches the Three.js backend (gpu-threejs.js lines 91-176)
    // to achieve visual parity: 1 main light, 3 colored fill lights, 2 point lights.

    // Main directional light with high-quality shadows (matches Three.js mainLight)
    if (!_main_light) {
        _main_light = memnew(DirectionalLight3D);
        _main_light->set_name("Nova64_MainLight");
        _main_light->set_color(Color(1.0f, 1.0f, 1.0f));
        _main_light->set_param(Light3D::PARAM_ENERGY, 1.8f); // Match Three.js intensity

        // High-quality shadows (Three.js uses 4096x4096 shadow maps)
        _main_light->set_shadow(true);
        _main_light->set_param(Light3D::PARAM_SHADOW_MAX_DISTANCE, 200.0f);
        _main_light->set_param(Light3D::PARAM_SHADOW_BIAS, 0.00005f);
        _main_light->set_param(Light3D::PARAM_SHADOW_NORMAL_BIAS, 0.02f);

        // Position and aim to match Three.js (5, 8, 3) looking at origin
        _main_light->set_position(Vector3(5.0f, 8.0f, 3.0f));
        _main_light->look_at(Vector3(0, 0, 0), Vector3(0, 1, 0));

        add_child(_main_light);
    }

    // Fill Light 1 - Blue tone (matches Three.js fillLight1: 0x4080ff, intensity 0.8)
    if (!_fill_light_1) {
        _fill_light_1 = memnew(DirectionalLight3D);
        _fill_light_1->set_name("Nova64_FillLight1_Blue");
        _fill_light_1->set_color(Color(0.25f, 0.50f, 1.0f)); // 0x4080ff
        _fill_light_1->set_param(Light3D::PARAM_ENERGY, 0.8f);
        _fill_light_1->set_shadow(false); // Fill lights don't cast shadows

        _fill_light_1->set_position(Vector3(-8.0f, 4.0f, -5.0f));
        _fill_light_1->look_at(Vector3(0, 0, 0), Vector3(0, 1, 0));

        add_child(_fill_light_1);
    }

    // Fill Light 2 - Pink tone (matches Three.js fillLight2: 0xff4080, intensity 0.6)
    if (!_fill_light_2) {
        _fill_light_2 = memnew(DirectionalLight3D);
        _fill_light_2->set_name("Nova64_FillLight2_Pink");
        _fill_light_2->set_color(Color(1.0f, 0.25f, 0.50f)); // 0xff4080
        _fill_light_2->set_param(Light3D::PARAM_ENERGY, 0.6f);
        _fill_light_2->set_shadow(false);

        _fill_light_2->set_position(Vector3(5.0f, -3.0f, 8.0f));
        _fill_light_2->look_at(Vector3(0, 0, 0), Vector3(0, 1, 0));

        add_child(_fill_light_2);
    }

    // Fill Light 3 - Green tone (matches Three.js fillLight3: 0x80ff40, intensity 0.4)
    if (!_fill_light_3) {
        _fill_light_3 = memnew(DirectionalLight3D);
        _fill_light_3->set_name("Nova64_FillLight3_Green");
        _fill_light_3->set_color(Color(0.50f, 1.0f, 0.25f)); // 0x80ff40
        _fill_light_3->set_param(Light3D::PARAM_ENERGY, 0.4f);
        _fill_light_3->set_shadow(false);

        _fill_light_3->set_position(Vector3(-3.0f, 6.0f, -2.0f));
        _fill_light_3->look_at(Vector3(0, 0, 0), Vector3(0, 1, 0));

        add_child(_fill_light_3);
    }

    // Point Light 1 - Warm tone (matches Three.js pointLight1: 0xffaa00, intensity 2, range 30)
    if (!_point_light_1) {
        _point_light_1 = memnew(OmniLight3D);
        _point_light_1->set_name("Nova64_PointLight1_Warm");
        _point_light_1->set_color(Color(1.0f, 0.67f, 0.0f)); // 0xffaa00
        _point_light_1->set_param(Light3D::PARAM_ENERGY, 2.0f);
        _point_light_1->set_param(Light3D::PARAM_RANGE, 30.0f);
        _point_light_1->set_param(Light3D::PARAM_ATTENUATION, 1.0f);

        // Shadows for point lights (Three.js uses 1024x1024)
        _point_light_1->set_shadow(true);
        _point_light_1->set_param(Light3D::PARAM_SHADOW_BIAS, 0.02f);

        _point_light_1->set_position(Vector3(10.0f, 15.0f, 10.0f));

        add_child(_point_light_1);
    }

    // Point Light 2 - Cool tone (matches Three.js pointLight2: 0x00aaff, intensity 1.5, range 25)
    if (!_point_light_2) {
        _point_light_2 = memnew(OmniLight3D);
        _point_light_2->set_name("Nova64_PointLight2_Cool");
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

// ---- Dynamic Lighting Animation (Phase 4: Visual Parity) ----------------

void Nova64Host::_update_dynamic_lighting(double p_delta) {
    // Accumulate time for smooth animation
    _accumulated_time += p_delta;
    float time = static_cast<float>(_accumulated_time);

    // Animate point light positions to match Three.js (gpu-threejs.js lines 697-705)
    // Subtle movement creates atmospheric depth without being distracting

    // Point Light 1: Gentle circular motion in XY plane
    // Three.js: point1.position.x = 10 + Math.sin(time * 0.5) * 3
    //           point1.position.y = 15 + Math.cos(time * 0.7) * 2
    if (_point_light_1) {
        Vector3 pos = _point_light_1->get_position();
        pos.x = 10.0f + Math::sin(time * 0.5f) * 3.0f;
        pos.y = 15.0f + Math::cos(time * 0.7f) * 2.0f;
        _point_light_1->set_position(pos);
    }

    // Point Light 2: Gentle movement in XZ plane
    // Three.js: point2.position.x = -10 + Math.cos(time * 0.6) * 4
    //           point2.position.z = -10 + Math.sin(time * 0.4) * 3
    if (_point_light_2) {
        Vector3 pos = _point_light_2->get_position();
        pos.x = -10.0f + Math::cos(time * 0.6f) * 4.0f;
        pos.z = -10.0f + Math::sin(time * 0.4f) * 3.0f;
        _point_light_2->set_position(pos);
    }
}

// Public wrapper for GDScript access
void Nova64Host::update_dynamic_lighting(double p_delta) {
    _update_dynamic_lighting(p_delta);
}

// Polls the keyboard / mouse / first gamepad and returns a rich snapshot
// the JS shim translates into the full Nova64 input surface
// (btn/btnp/key/keyp/isKeyDown/mouseX/mouseY/gamepadAxis/...).
//
// Output keys (all best-effort, missing fields default to falsy in the shim):
//   left/right/up/down/action/cancel  - legacy convenience booleans
//   axisX/axisY                       - keyboard or gamepad-left composite
//   keys: [code, ...]                 - currently held key codes,
//                                       web style ("KeyA", "ArrowLeft",
//                                       "Space", "Enter", "Escape", ...)
//   mouseX/mouseY/mouseDown           - mouse in 640x360 logical coords
//   gpConnected                       - first gamepad present
//   gpLeftX/gpLeftY/gpRightX/gpRightY - gamepad axes (deadzone applied)
//   gpButtons: [stdIdx, ...]          - held standard-mapped button indices
Dictionary Nova64Host::_cmd_input_poll(const Dictionary &) {
    Dictionary out;
    Input *in = Input::get_singleton();
    if (!in) return out;

    auto shape_axis = [](double v) -> double {
        const double deadzone = 0.18;
        const double full_scale = 0.92;
        const double exponent = 1.35;
        const double mag = Math::abs(v);
        if (mag <= deadzone) return 0.0;
        double norm = (mag - deadzone) / (full_scale - deadzone);
        if (norm < 0.0) norm = 0.0;
        if (norm > 1.0) norm = 1.0;
        const double curved = Math::pow(norm, exponent);
        return v < 0.0 ? -curved : curved;
    };

    auto kp = [&](Key k) -> bool { return in->is_key_pressed(k); };

    // ---- key snapshot --------------------------------------------------
    // Map every key Nova64 carts care about into a {code: held} bag.
    // The shim keys off web-style codes ("KeyA", "Space", ...).
    struct KeyMap { const char *code; Key k; };
    static const KeyMap KEYS[] = {
        // Letters
        {"KeyA", KEY_A}, {"KeyB", KEY_B}, {"KeyC", KEY_C}, {"KeyD", KEY_D},
        {"KeyE", KEY_E}, {"KeyF", KEY_F}, {"KeyG", KEY_G}, {"KeyH", KEY_H},
        {"KeyI", KEY_I}, {"KeyJ", KEY_J}, {"KeyK", KEY_K}, {"KeyL", KEY_L},
        {"KeyM", KEY_M}, {"KeyN", KEY_N}, {"KeyO", KEY_O}, {"KeyP", KEY_P},
        {"KeyQ", KEY_Q}, {"KeyR", KEY_R}, {"KeyS", KEY_S}, {"KeyT", KEY_T},
        {"KeyU", KEY_U}, {"KeyV", KEY_V}, {"KeyW", KEY_W}, {"KeyX", KEY_X},
        {"KeyY", KEY_Y}, {"KeyZ", KEY_Z},
        // Digits
        {"Digit0", KEY_0}, {"Digit1", KEY_1}, {"Digit2", KEY_2},
        {"Digit3", KEY_3}, {"Digit4", KEY_4}, {"Digit5", KEY_5},
        {"Digit6", KEY_6}, {"Digit7", KEY_7}, {"Digit8", KEY_8},
        {"Digit9", KEY_9},
        // Arrows
        {"ArrowLeft", KEY_LEFT}, {"ArrowRight", KEY_RIGHT},
        {"ArrowUp", KEY_UP}, {"ArrowDown", KEY_DOWN},
        // Whitespace / nav
        {"Space", KEY_SPACE}, {"Enter", KEY_ENTER}, {"Escape", KEY_ESCAPE},
        {"Tab", KEY_TAB}, {"Backspace", KEY_BACKSPACE},
        {"ShiftLeft", KEY_SHIFT}, {"ShiftRight", KEY_SHIFT},
        {"ControlLeft", KEY_CTRL}, {"ControlRight", KEY_CTRL},
        {"AltLeft", KEY_ALT}, {"AltRight", KEY_ALT},
    };
    Array held;
    for (const KeyMap &m : KEYS) {
        if (kp(m.k)) held.append(String(m.code));
    }
    out["keys"] = held;

    // ---- legacy convenience flags -------------------------------------
    bool left   = kp(KEY_LEFT)  || kp(KEY_A);
    bool right  = kp(KEY_RIGHT) || kp(KEY_D);
    bool up     = kp(KEY_UP)    || kp(KEY_W);
    bool down   = kp(KEY_DOWN)  || kp(KEY_S);
    bool action = kp(KEY_SPACE) || kp(KEY_ENTER) || kp(KEY_Z);
    bool cancel = kp(KEY_ESCAPE) || kp(KEY_X);

    double axis_x = (right ? 1.0 : 0.0) - (left ? 1.0 : 0.0);
    double axis_y = (down  ? 1.0 : 0.0) - (up   ? 1.0 : 0.0);

    // ---- gamepad snapshot ---------------------------------------------
    bool gp_connected = false;
    double gp_lx = 0, gp_ly = 0, gp_rx = 0, gp_ry = 0;
    Array gp_buttons;
    if (in->get_connected_joypads().size() > 0) {
        gp_connected = true;
        const int joy_id = static_cast<int>(in->get_connected_joypads()[0]);
        const double dir_threshold = 0.35;
        double lx = in->get_joy_axis(joy_id, JOY_AXIS_LEFT_X);
        double ly = in->get_joy_axis(joy_id, JOY_AXIS_LEFT_Y);
        double rx = in->get_joy_axis(joy_id, JOY_AXIS_RIGHT_X);
        double ry = in->get_joy_axis(joy_id, JOY_AXIS_RIGHT_Y);
        gp_lx = shape_axis(lx);
        gp_ly = shape_axis(ly);
        gp_rx = shape_axis(rx);
        gp_ry = shape_axis(ry);
        if (Math::abs(gp_lx) > Math::abs(axis_x)) axis_x = gp_lx;
        if (Math::abs(gp_ly) > Math::abs(axis_y)) axis_y = gp_ly;
        if (in->is_joy_button_pressed(joy_id, JOY_BUTTON_A)) action = true;
        if (in->is_joy_button_pressed(joy_id, JOY_BUTTON_B)) cancel = true;
        if (in->is_joy_button_pressed(joy_id, JOY_BUTTON_DPAD_LEFT) || gp_lx <= -dir_threshold) left = true;
        if (in->is_joy_button_pressed(joy_id, JOY_BUTTON_DPAD_RIGHT) || gp_lx >= dir_threshold) right = true;
        if (in->is_joy_button_pressed(joy_id, JOY_BUTTON_DPAD_UP) || gp_ly <= -dir_threshold) up = true;
        if (in->is_joy_button_pressed(joy_id, JOY_BUTTON_DPAD_DOWN) || gp_ly >= dir_threshold) down = true;

        // Map Godot joy buttons to the Nova64 web KEYMAP indices so
        // btn(i) lights up identically across the two backends.
        struct GpBtn { JoyButton g; int n; };
        static const GpBtn GP[] = {
            {JOY_BUTTON_DPAD_LEFT,   0},
            {JOY_BUTTON_DPAD_RIGHT,  1},
            {JOY_BUTTON_DPAD_UP,     2},
            {JOY_BUTTON_DPAD_DOWN,   3},
            {JOY_BUTTON_A,           4},  // Z
            {JOY_BUTTON_B,           5},  // X
            {JOY_BUTTON_X,           6},  // C
            {JOY_BUTTON_Y,           7},  // V
            {JOY_BUTTON_LEFT_SHOULDER,  10}, // Q
            {JOY_BUTTON_RIGHT_SHOULDER, 11}, // W
            {JOY_BUTTON_START,       12}, // Enter
            {JOY_BUTTON_BACK,        13}, // Space (Select)
        };
        for (const GpBtn &b : GP) {
            if (in->is_joy_button_pressed(joy_id, b.g)) gp_buttons.append(b.n);
        }
    }

    // ---- mouse position (logical 640x360) -----------------------------
    Vector2 mp(0, 0);
    double m_logx = 0, m_logy = 0;
    if (_overlay != nullptr) {
        mp = _overlay->get_local_mouse_position();
        Vector2 sz = _overlay->get_size();
        if (sz.x > 0) m_logx = (mp.x / sz.x) * 640.0;
        if (sz.y > 0) m_logy = (mp.y / sz.y) * 360.0;
    }

    out["left"]      = left;
    out["right"]     = right;
    out["up"]        = up;
    out["down"]      = down;
    out["action"]    = action;
    out["cancel"]    = cancel;
    out["axisX"]     = axis_x;
    out["axisY"]     = axis_y;
    out["mouseX"]    = m_logx;
    out["mouseY"]    = m_logy;
    out["mouseDown"] = in->is_mouse_button_pressed(MOUSE_BUTTON_LEFT);
    out["gpConnected"] = gp_connected;
    out["gpLeftX"]     = gp_lx;
    out["gpLeftY"]     = gp_ly;
    out["gpRightX"]    = gp_rx;
    out["gpRightY"]    = gp_ry;
    out["gpButtons"]   = gp_buttons;
    return out;
}

// ---- Texture upload ------------------------------------------------------

Dictionary Nova64Host::_cmd_texture_create_from_image(const Dictionary &p) {
    // Accepts either:
    //   { path: "res://path/to/image.png" }            (loaded via ResourceLoader)
    //   { width, height, pixels: [r,g,b,a, r,g,b,a, ...] }  (RGBA8 from JS)
    Ref<ImageTexture> tex;

    if (p.has("path")) {
        String path = p["path"];
        Ref<Resource> res = ResourceLoader::get_singleton()->load(path);
        Ref<Texture2D> existing = res;
        if (existing.is_valid()) {
            uint32_t id = _handles->put_resource(HandleKind::TEXTURE, existing);
            return make_handle_result(id);
        }
        Ref<Image> img = res;
        if (img.is_null()) {
            img = Image::load_from_file(path);
        }
        if (img.is_null() || img->is_empty()) {
            return make_error("texture_load_failed", path);
        }
        tex = ImageTexture::create_from_image(img);
    } else if (p.has("width") && p.has("height") && p.has("pixels")) {
        int w = static_cast<int>(static_cast<int64_t>(p["width"]));
        int h = static_cast<int>(static_cast<int64_t>(p["height"]));
        Array pixels = p["pixels"];
        const int expected = w * h * 4;
        if (w <= 0 || h <= 0 || pixels.size() < expected) {
            return make_error("texture_bad_payload", "pixels < w*h*4");
        }
        PackedByteArray bytes;
        bytes.resize(expected);
        for (int i = 0; i < expected; i++) {
            int v = static_cast<int>(static_cast<int64_t>(pixels[i]));
            if (v < 0) v = 0; else if (v > 255) v = 255;
            bytes[i] = static_cast<uint8_t>(v);
        }
        Ref<Image> img = Image::create_from_data(w, h, false, Image::FORMAT_RGBA8, bytes);
        if (img.is_null()) return make_error("texture_image_failed", "create_from_data");
        tex = ImageTexture::create_from_image(img);
    } else {
        return make_error("texture_bad_payload", "need path or {width,height,pixels}");
    }

    if (tex.is_null()) return make_error("texture_alloc_failed", "");
    uint32_t id = _handles->put_resource(HandleKind::TEXTURE, tex);
    return make_handle_result(id);
}

Dictionary Nova64Host::_cmd_texture_destroy(const Dictionary &p) {
    uint32_t id = handle_id_from_payload(p, "handle");
    bool ok = _handles->destroy(id, false);
    Dictionary out; out["ok"] = ok; return out;
}

// ---- Audio ---------------------------------------------------------------

Dictionary Nova64Host::_cmd_audio_load_stream(const Dictionary &p) {
    if (!p.has("path")) return make_error("audio_bad_payload", "path required");
    String path = p["path"];
    Ref<Resource> res = ResourceLoader::get_singleton()->load(path);
    Ref<AudioStream> stream = res;
    if (stream.is_null()) return make_error("audio_load_failed", path);
    uint32_t id = _handles->put_resource(HandleKind::AUDIO_STREAM, stream);
    return make_handle_result(id);
}

Dictionary Nova64Host::_cmd_audio_play(const Dictionary &p) {
    uint32_t stream_id = handle_id_from_payload(p, "stream");
    Ref<RefCounted> stream_res = _handles->get_resource(stream_id, HandleKind::AUDIO_STREAM);
    Ref<AudioStream> stream = stream_res;
    if (stream.is_null()) return make_error("audio_invalid_stream", "");

    AudioStreamPlayer *player = memnew(AudioStreamPlayer);
    add_child(player);
    player->set_stream(stream);
    if (p.has("volumeDb")) player->set_volume_db(static_cast<float>(static_cast<double>(p["volumeDb"])));
    if (p.has("pitch"))    player->set_pitch_scale(static_cast<float>(static_cast<double>(p["pitch"])));
    player->play();
    uint32_t id = _handles->put_node(HandleKind::AUDIO_PLAYER, player);
    return make_handle_result(id);
}

Dictionary Nova64Host::_cmd_audio_stop(const Dictionary &p) {
    uint32_t id = handle_id_from_payload(p, "handle");
    Object *obj = _handles->get_node(id, HandleKind::AUDIO_PLAYER);
    AudioStreamPlayer *player = Object::cast_to<AudioStreamPlayer>(obj);
    if (player) player->stop();
    bool ok = _handles->destroy(id, true);
    Dictionary out; out["ok"] = ok; return out;
}

// ---- Instancing ----------------------------------------------------------

Dictionary Nova64Host::_cmd_mesh_create_instanced(const Dictionary &p) {
    uint32_t geom_id = handle_id_from_payload(p, "geometry");
    Ref<RefCounted> geom_res = _handles->get_resource(geom_id, HandleKind::GEOMETRY);
    Ref<Mesh> mesh = geom_res;
    if (mesh.is_null()) return make_error("instanced_invalid_geometry", "");

    int count = p.has("count") ? static_cast<int>(static_cast<int64_t>(p["count"])) : 0;
    if (count <= 0) return make_error("instanced_bad_count", "");

    Ref<MultiMesh> mm; mm.instantiate();
    mm->set_transform_format(MultiMesh::TRANSFORM_3D);
    mm->set_use_colors(false);
    mm->set_use_custom_data(false);
    mm->set_mesh(mesh);
    mm->set_instance_count(count);

    MultiMeshInstance3D *node = memnew(MultiMeshInstance3D);
    node->set_multimesh(mm);
    add_child(node);

    if (p.has("material")) {
        uint32_t mat_id = handle_id_from_payload(p, "material");
        Ref<RefCounted> mat_res = _handles->get_resource(mat_id, HandleKind::MATERIAL);
        Ref<Material> mat = mat_res;
        if (mat.is_valid()) node->set_material_override(mat);
    }

    uint32_t id = _handles->put_node(HandleKind::MULTI_MESH, node);
    return make_handle_result(id);
}

Dictionary Nova64Host::_cmd_instance_set_transform(const Dictionary &p) {
    uint32_t id = handle_id_from_payload(p, "handle");
    Object *obj = _handles->get_node(id, HandleKind::MULTI_MESH);
    MultiMeshInstance3D *node = Object::cast_to<MultiMeshInstance3D>(obj);
    if (!node || node->get_multimesh().is_null()) {
        return make_error("instance_invalid_handle", "");
    }
    int index = p.has("index") ? static_cast<int>(static_cast<int64_t>(p["index"])) : -1;
    if (index < 0 || index >= node->get_multimesh()->get_instance_count()) {
        return make_error("instance_bad_index", "");
    }
    Vector3 pos   = vec3_from_payload(p, "position", Vector3(0, 0, 0));
    Vector3 rot   = vec3_from_payload(p, "rotation", Vector3(0, 0, 0));
    Vector3 scale = vec3_from_payload(p, "scale",    Vector3(1, 1, 1));

    Transform3D xf;
    xf.basis = Basis::from_euler(rot);
    xf.basis.scale(scale);
    xf.origin = pos;
    node->get_multimesh()->set_instance_transform(index, xf);
    Dictionary out; out["ok"] = true; return out;
}

// ---- Particles ----------------------------------------------------------

Dictionary Nova64Host::_cmd_particles_create(const Dictionary &p) {
    GPUParticles3D *node = memnew(GPUParticles3D);
    add_child(node);

    int amount = p.has("amount") ? static_cast<int>(static_cast<int64_t>(p["amount"])) : 64;
    if (amount < 1) amount = 1;
    node->set_amount(amount);

    if (p.has("lifetime")) node->set_lifetime(static_cast<double>(p["lifetime"]));
    if (p.has("oneShot"))  node->set_one_shot(static_cast<bool>(p["oneShot"]));
    if (p.has("preprocess")) node->set_pre_process_time(static_cast<double>(p["preprocess"]));

    // Geometry — required so the GPU has something to draw per particle.
    if (p.has("geometry")) {
        uint32_t geom_id = handle_id_from_payload(p, "geometry");
        Ref<RefCounted> geom_res = _handles->get_resource(geom_id, HandleKind::GEOMETRY);
        Ref<Mesh> mesh = geom_res;
        if (mesh.is_valid()) node->set_draw_pass_mesh(0, mesh);
    }

    // Optional material override on the draw pass.
    if (p.has("material")) {
        uint32_t mat_id = handle_id_from_payload(p, "material");
        Ref<RefCounted> mat_res = _handles->get_resource(mat_id, HandleKind::MATERIAL);
        Ref<Material> mat = mat_res;
        if (mat.is_valid()) node->set_material_override(mat);
    }

    // Process material — minimum to get something visible.
    Ref<ParticleProcessMaterial> proc; proc.instantiate();
    if (p.has("emissionBoxExtents")) {
        Vector3 ex = vec3_from_payload(p, "emissionBoxExtents", Vector3(1, 1, 1));
        proc->set_emission_shape(ParticleProcessMaterial::EMISSION_SHAPE_BOX);
        proc->set_emission_box_extents(ex);
    }
    Vector3 grav = vec3_from_payload(p, "gravity", Vector3(0, -9.8f, 0));
    proc->set_gravity(grav);
    if (p.has("initialVelocityMin"))
        proc->set_param_min(ParticleProcessMaterial::PARAM_INITIAL_LINEAR_VELOCITY,
                static_cast<double>(p["initialVelocityMin"]));
    if (p.has("initialVelocityMax"))
        proc->set_param_max(ParticleProcessMaterial::PARAM_INITIAL_LINEAR_VELOCITY,
                static_cast<double>(p["initialVelocityMax"]));
    if (p.has("scale")) {
        proc->set_param_min(ParticleProcessMaterial::PARAM_SCALE, static_cast<double>(p["scale"]));
        proc->set_param_max(ParticleProcessMaterial::PARAM_SCALE, static_cast<double>(p["scale"]));
    }
    node->set_process_material(proc);
    node->set_emitting(true);

    uint32_t id = _handles->put_node(HandleKind::PARTICLES, node);
    return make_handle_result(id);
}

Dictionary Nova64Host::_cmd_particles_destroy(const Dictionary &p) {
    uint32_t id = handle_id_from_payload(p, "handle");
    bool ok = _handles->destroy(id, true);
    Dictionary out; out["ok"] = ok; return out;
}

// ---- voxel.uploadChunk — face-culled chunk mesher ----------------------
// Takes a flat block-id array (sx*sy*sz, x-fastest), a palette mapping id
// strings to hex colours, and an origin. Builds an ArrayMesh with one quad
// per visible block face (neighbour inside chunk = air at chunk boundary).
// Returns a MESH_INSTANCE handle destroyable via mesh.destroy.
Dictionary Nova64Host::_cmd_voxel_upload_chunk(const Dictionary &p) {
    if (!p.has("origin") || !p.has("size") || !p.has("blocks") || !p.has("palette"))
        return make_error("missing_params", "voxel.uploadChunk");

    Array origin_a = p["origin"];
    Array size_a   = p["size"];
    Array blocks_a = p["blocks"];
    Dictionary pal_d = p["palette"];

    if (origin_a.size() < 3 || size_a.size() < 3)
        return make_error("bad_origin_or_size", "voxel.uploadChunk");

    const int ox = (int)(double)origin_a[0];
    const int oy = (int)(double)origin_a[1];
    const int oz = (int)(double)origin_a[2];
    const int sx = (int)(double)size_a[0];
    const int sy = (int)(double)size_a[1];
    const int sz = (int)(double)size_a[2];

    if (sx <= 0 || sy <= 0 || sz <= 0 || (sx * sy * sz) != blocks_a.size())
        return make_error("bad_blocks_size", "voxel.uploadChunk");

    // Pack block ids into a flat vector for fast lookup.
    std::vector<uint8_t> blk(sx * sy * sz);
    for (int i = 0; i < (int)blk.size(); ++i)
        blk[i] = (uint8_t)(int)(double)blocks_a[i];

    // Palette: string id -> Color
    std::unordered_map<int, Color> pal;
    {
        Array keys = pal_d.keys();
        for (int i = 0; i < keys.size(); ++i) {
            int id = String(keys[i]).to_int();
            int hex = (int)(double)pal_d[keys[i]];
            pal[id] = Color(
                ((hex >> 16) & 0xFF) / 255.0f,
                ((hex >>  8) & 0xFF) / 255.0f,
                ( hex        & 0xFF) / 255.0f,
                1.0f);
        }
    }

    // Block accessor — out-of-bounds = air (0).
    // Index layout: lx + sx*ly + sx*sy*lz  (x fastest, z slowest)
    auto blk_at = [&](int lx, int ly, int lz) -> int {
        if (lx < 0 || lx >= sx || ly < 0 || ly >= sy || lz < 0 || lz >= sz) return 0;
        return blk[lx + sx * ly + sx * sy * lz];
    };

    // Greedy meshing: for each face direction, sweep layer by layer building
    // a 2D visibility mask, then merge co-planar same-coloured visible faces
    // into the largest axis-aligned rectangles possible before emitting quads.
    // This reduces draw-call vertex counts by 5-10× vs the naive per-block path
    // while producing identical visual output.
    //
    // Per-face config table:
    //   n_axis/n_sign = chunk axis that is the face normal and its direction
    //   u_axis/v_axis = two tangent axes used for greedy sweeping
    //   plane_offset  = 0 or 1; face plane = layer + plane_offset
    //   cu[4]/cv[4]   = CCW corner offset flags (0 = start, 1 = start+size)
    //                   verified against the original per-block vertex table
    struct GFace {
        int   n_axis, n_sign, u_axis, v_axis;
        float nx, ny, nz;
        int   plane_offset;
        int   cu[4], cv[4];
    };
    static const GFace GFACES[6] = {
        // +X  (n=0,+1) u=Y v=Z   plane=layer+1
        {0,+1, 1,2,  +1,0,0,  1,  {0,1,1,0},{0,0,1,1}},
        // -X  (n=0,-1) u=Y v=Z   plane=layer
        {0,-1, 1,2,  -1,0,0,  0,  {0,1,1,0},{1,1,0,0}},
        // +Y  (n=1,+1) u=X v=Z   plane=layer+1
        {1,+1, 0,2,  0,+1,0,  1,  {0,1,1,0},{1,1,0,0}},
        // -Y  (n=1,-1) u=X v=Z   plane=layer
        {1,-1, 0,2,  0,-1,0,  0,  {0,1,1,0},{0,0,1,1}},
        // +Z  (n=2,+1) u=X v=Y   plane=layer+1
        {2,+1, 0,1,  0,0,+1,  1,  {0,1,1,0},{0,0,1,1}},
        // -Z  (n=2,-1) u=X v=Y   plane=layer
        {2,-1, 0,1,  0,0,-1,  0,  {1,0,0,1},{0,0,1,1}},
    };
    // Per-face AO darkening: top=1.0, sides=0.85, bottom=0.70.
    static const float FACE_AO[6] = { 0.85f, 0.85f, 1.0f, 0.70f, 0.85f, 0.85f };

    // Chunk dimension along each axis for slice sizing.
    const int DIM[3] = { sx, sy, sz };

    Ref<SurfaceTool> st;
    st.instantiate();
    st->begin(Mesh::PRIMITIVE_TRIANGLES);

    bool has_geom = false;

    for (int fi = 0; fi < 6; ++fi) {
        const GFace &gf   = GFACES[fi];
        const int    nd   = gf.n_axis;        // normal axis
        const int    ud   = gf.u_axis;        // first tangent axis
        const int    vd   = gf.v_axis;        // second tangent axis
        const int    nlyr = DIM[nd];          // number of layers to sweep
        const int    su   = DIM[ud];          // slice width
        const int    sv   = DIM[vd];          // slice height
        const float  ao   = FACE_AO[fi];
        const Vector3 normal(gf.nx, gf.ny, gf.nz);

        // Reused per-layer mask: entry = block id (>0) when face is visible, 0 otherwise.
        std::vector<int> mask(su * sv);

        for (int layer = 0; layer < nlyr; ++layer) {
            // ---- Build visibility mask ----
            for (int v = 0; v < sv; ++v) {
                for (int u = 0; u < su; ++u) {
                    int coords[3];
                    coords[nd] = layer;
                    coords[ud] = u;
                    coords[vd] = v;
                    int cur_id = blk_at(coords[0], coords[1], coords[2]);
                    if (cur_id == 0) { mask[u + su*v] = 0; continue; }
                    // Neighbour one step in the normal direction.
                    int nc[3] = { coords[0], coords[1], coords[2] };
                    nc[nd] += gf.n_sign;
                    mask[u + su*v] = (blk_at(nc[0], nc[1], nc[2]) == 0) ? cur_id : 0;
                }
            }

            // ---- Greedy merge ----
            const int plane = layer + gf.plane_offset;
            for (int v0 = 0; v0 < sv; ++v0) {
                for (int u0 = 0; u0 < su; ++u0) {
                    const int id = mask[u0 + su*v0];
                    if (id == 0) continue;

                    // Extend in u direction.
                    int w = 1;
                    while (u0+w < su && mask[u0+w + su*v0] == id) ++w;

                    // Extend in v direction (each new row must be all same id, full width w).
                    int h = 1;
                    while (v0+h < sv) {
                        bool ok = true;
                        for (int k = 0; k < w; ++k) {
                            if (mask[u0+k + su*(v0+h)] != id) { ok = false; break; }
                        }
                        if (!ok) break;
                        ++h;
                    }

                    // Emit quad.
                    auto it = pal.find(id);
                    Color base = (it != pal.end()) ? it->second : Color(0.5f, 0.5f, 0.5f, 1.0f);
                        // Keep AO as neutral grayscale so atlas texels drive hue.
                        Color col(ao, ao, ao, 1.0f);
                    // Two CCW triangles [0,1,2] and [0,2,3].
                    // Corner positions assembled via the per-face cu[]/cv[] offset flags.
                    const float pu[2] = { (float)u0, (float)(u0+w) };
                    const float pv[2] = { (float)v0, (float)(v0+h) };
                    const float uv_u[4] = { 0.0f, (float)w, (float)w, 0.0f };
                    const float uv_v[4] = { (float)h, (float)h, 0.0f, 0.0f };
                    const bool is_top = (fi == 2);
                    const bool is_bottom = (fi == 3);
                    const int tile_idx = voxel_tile_index_for_face(id, is_top, is_bottom);
                    const Vector2 tile_uv = voxel_tile_origin_uv(tile_idx);
                    float pos[4][3] = {};
                    for (int ci = 0; ci < 4; ++ci) {
                        pos[ci][nd] = (float)plane;
                        pos[ci][ud] = pu[gf.cu[ci]];
                        pos[ci][vd] = pv[gf.cv[ci]];
                    }
                    static const int TRI[6] = { 0,1,2, 0,2,3 };
                    for (int ti = 0; ti < 6; ++ti) {
                        const int ci = TRI[ti];
                        st->set_color(col);
                        st->set_normal(normal);
                        st->set_uv(Vector2(uv_u[ci], uv_v[ci]));
                        st->set_uv2(tile_uv);
                        st->add_vertex(Vector3(pos[ci][0], pos[ci][1], pos[ci][2]));
                    }
                    has_geom = true;

                    // Mark merged region as processed.
                    for (int dv = 0; dv < h; ++dv)
                        for (int du = 0; du < w; ++du)
                            mask[u0+du + su*(v0+dv)] = 0;
                }
            }
        }
    }

    if (!has_geom) {
        Dictionary out; out["handle"] = (int64_t)0; return out;
    }

    Ref<ArrayMesh> mesh = st->commit();

        // Atlas textured material: UV carries repeat coords, UV2 carries tile origin.
        Ref<ShaderMaterial> mat;
    mat.instantiate();
        mat->set_shader(get_voxel_chunk_shader());
        mat->set_shader_parameter("atlas_tex", get_voxel_atlas_texture());
        mat->set_shader_parameter("tile_size",
            Vector2(1.0f / (float)VOXEL_ATLAS_COLS, 1.0f / (float)VOXEL_ATLAS_ROWS));
    mesh->surface_set_material(0, mat);

    MeshInstance3D *mi = memnew(MeshInstance3D);
    mi->set_mesh(mesh);
    mi->set_position(Vector3((float)ox, (float)oy, (float)oz));
    add_child(mi);

    uint32_t handle = _handles->put_node(HandleKind::MESH_INSTANCE, mi);
    Dictionary out;
    out["handle"] = (int64_t)handle;
    return out;
}

// ---- Cart loading (module mode) -----------------------------------------

bool Nova64Host::load_cart(const String &p_res_path) {
    _ensure_runtime();

    // Accept three flavors:
    //   1. "res://carts/foo/"        — folder containing code.js + meta.json
    //   2. "res://carts/foo/meta.json" — meta sidecar; we open code.js next to it
    //   3. "res://carts/foo.js" or "res://carts/foo/code.js" — direct script
    String code_path = p_res_path;
    String meta_path;
    if (p_res_path.ends_with("/") || DirAccess::dir_exists_absolute(p_res_path)) {
        String base = p_res_path.ends_with("/") ? p_res_path : (p_res_path + String("/"));
        code_path = base + String("code.js");
        meta_path = base + String("meta.json");
    } else if (p_res_path.ends_with("meta.json")) {
        meta_path = p_res_path;
        code_path = p_res_path.get_base_dir() + String("/code.js");
    } else if (p_res_path.ends_with("code.js")) {
        code_path = p_res_path;
        meta_path = p_res_path.get_base_dir() + String("/meta.json");
    }

    // Expose the cart path on globalThis BEFORE loading the compat shim,
    // so the shim can use it for seed derivation.
    // The browser uses `?demo=cart-name` which becomes `hashStringToSeed('nova64-demo:cart-name')`.
    {
        String cart_folder_name;
        // Extract folder name: "res://carts/minecraft-demo/" -> "minecraft-demo"
        String base_dir = code_path.get_base_dir();
        if (base_dir.ends_with("/")) {
            base_dir = base_dir.substr(0, base_dir.length() - 1);
        }
        int last_slash = base_dir.rfind("/");
        if (last_slash >= 0) {
            cart_folder_name = base_dir.substr(last_slash + 1);
        } else {
            cart_folder_name = base_dir;
        }

        JSValue global = JS_GetGlobalObject(_context);
        CharString cart_name_utf8 = cart_folder_name.utf8();
        JSValue cart_name_val = JS_NewStringLen(_context, cart_name_utf8.get_data(), cart_name_utf8.length());
        JS_SetPropertyStr(_context, global, "__nova64_cart_name", cart_name_val);
        JS_FreeValue(_context, global);
    }

    // Now load the compat shim (which will use __nova64_cart_name for seed)
    _load_compat_shim();
    _release_cart_exports();
    _cart_loaded = false;

    Ref<FileAccess> f = FileAccess::open(code_path, FileAccess::READ);
    if (f.is_null()) {
        UtilityFunctions::printerr("[nova64] load_cart: cannot open ", code_path);
        return false;
    }
    String src = f->get_as_text();
    f->close();

    // Best-effort: load and expose meta.json on globalThis.cart_meta.
    if (!meta_path.is_empty() && FileAccess::file_exists(meta_path)) {
        Ref<FileAccess> mf = FileAccess::open(meta_path, FileAccess::READ);
        if (mf.is_valid()) {
            String meta_src = mf->get_as_text();
            mf->close();
            CharString meta_utf8 = meta_src.utf8();
            JSValue meta_v = JS_ParseJSON(_context, meta_utf8.get_data(),
                    meta_utf8.length(), "meta.json");
            if (!JS_IsException(meta_v)) {
                JSValue global = JS_GetGlobalObject(_context);
                JS_SetPropertyStr(_context, global, "cart_meta", meta_v);
                JS_FreeValue(_context, global);
            } else {
                JSValue exc = JS_GetException(_context);
                const char *msg = JS_ToCString(_context, exc);
                UtilityFunctions::printerr("[nova64] load_cart: meta.json parse error: ",
                        msg ? String::utf8(msg) : String("(unknown)"));
                if (msg) JS_FreeCString(_context, msg);
                JS_FreeValue(_context, exc);
                JS_FreeValue(_context, meta_v);
            }
        }
    } else {
        // Clear any meta from a previous cart so applyCartMeta() doesn't
        // re-apply stale environment defaults.
        JSValue global = JS_GetGlobalObject(_context);
        JS_SetPropertyStr(_context, global, "cart_meta", JS_NULL);
        JS_FreeValue(_context, global);
    }

    // Translate meta.json defaults (sky, fog, lighting, effects, camera, text)
    // into engine.call('env.set', ...) payloads via the shim, before the cart
    // module evaluates so init() sees the authored environment.
    {
        const char *src = "if (typeof globalThis.__nova64_applyCartMeta === 'function')"
                          " { try { globalThis.__nova64_applyCartMeta(); }"
                          " catch (e) { print('[nova64] applyCartMeta error: ' + e); } }";
        JSValue r = JS_Eval(_context, src, std::strlen(src),
                "<nova64-applyCartMeta>", JS_EVAL_TYPE_GLOBAL);
        if (JS_IsException(r)) {
            JSValue exc = JS_GetException(_context);
            const char *msg = JS_ToCString(_context, exc);
            UtilityFunctions::printerr("[nova64] load_cart: applyCartMeta failed: ",
                    msg ? String::utf8(msg) : String("(unknown)"));
            if (msg) JS_FreeCString(_context, msg);
            JS_FreeValue(_context, exc);
        }
        JS_FreeValue(_context, r);
    }

    CharString src_utf8 = src.utf8();
    CharString name_utf8 = code_path.utf8();

    // Compile as a module so `export function init/update/draw` declarations
    // land on the module namespace.
    JSValue mod = JS_Eval(_context, src_utf8.get_data(), src_utf8.length(),
            name_utf8.get_data(),
            JS_EVAL_TYPE_MODULE | JS_EVAL_FLAG_COMPILE_ONLY);
    if (JS_IsException(mod)) {
        JSValue exc = JS_GetException(_context);
        const char *msg = JS_ToCString(_context, exc);
        UtilityFunctions::printerr("[nova64] load_cart: compile error: ",
                msg ? String::utf8(msg) : String("(unknown)"));
        if (msg) JS_FreeCString(_context, msg);
        JS_FreeValue(_context, exc);
        JS_FreeValue(_context, mod);
        return false;
    }

    // Capture the module pointer before JS_EvalFunction consumes `mod`.
    JSModuleDef *m = static_cast<JSModuleDef *>(JS_VALUE_GET_PTR(mod));

    JSValue eval_result = JS_EvalFunction(_context, mod);
    if (JS_IsException(eval_result)) {
        JSValue exc = JS_GetException(_context);
        const char *msg = JS_ToCString(_context, exc);
        UtilityFunctions::printerr("[nova64] load_cart: runtime error: ",
                msg ? String::utf8(msg) : String("(unknown)"));
        if (msg) JS_FreeCString(_context, msg);
        JS_FreeValue(_context, exc);
        JS_FreeValue(_context, eval_result);
        return false;
    }
    JS_FreeValue(_context, eval_result);

    // Resolve init/update/draw from the module namespace.
    JSValue ns = JS_GetModuleNamespace(_context, m);
    if (JS_IsException(ns)) {
        JS_FreeValue(_context, ns);
        UtilityFunctions::printerr("[nova64] load_cart: cannot read module namespace");
        return false;
    }

    auto take_export = [&](const char *name) -> JSValue {
        JSValue fn = JS_GetPropertyStr(_context, ns, name);
        if (!JS_IsFunction(_context, fn)) {
            JS_FreeValue(_context, fn);
            return JS_UNDEFINED;
        }
        return fn;
    };

    _cart_init_fn   = take_export("init");
    _cart_update_fn = take_export("update");
    _cart_draw_fn   = take_export("draw");
    JS_FreeValue(_context, ns);

    _cart_loaded = true;
    UtilityFunctions::print("[nova64] cart loaded: ", p_res_path,
            " init=", JS_IsFunction(_context, _cart_init_fn),
            " update=", JS_IsFunction(_context, _cart_update_fn),
            " draw=", JS_IsFunction(_context, _cart_draw_fn));
    return true;
}

void Nova64Host::_call_cart_fn(JSValue p_fn, double p_arg, bool p_pass_arg, const char *p_name) {
    if (!_cart_loaded || !_context) return;
    if (!JS_IsFunction(_context, p_fn)) return;

    JSValue ret;
    if (p_pass_arg) {
        JSValue arg = JS_NewFloat64(_context, p_arg);
        ret = JS_Call(_context, p_fn, JS_UNDEFINED, 1, &arg);
        JS_FreeValue(_context, arg);
    } else {
        ret = JS_Call(_context, p_fn, JS_UNDEFINED, 0, nullptr);
    }
    if (JS_IsException(ret)) {
        JSValue exc = JS_GetException(_context);
        const char *msg = JS_ToCString(_context, exc);
        UtilityFunctions::printerr("[nova64] cart ", String::utf8(p_name),
                ": ", msg ? String::utf8(msg) : String("(unknown error)"));
        if (msg) JS_FreeCString(_context, msg);
        JS_FreeValue(_context, exc);
    }
    JS_FreeValue(_context, ret);

    // Execute pending promise jobs so async functions can complete.
    // This is essential for carts with `async init()` or `await` in their hooks.
    JSContext *ctx1 = nullptr;
    while (JS_ExecutePendingJob(_runtime, &ctx1) > 0) {
        // Keep pumping until no more jobs
    }
}

void Nova64Host::cart_init()                  { _call_cart_fn(_cart_init_fn,   0.0,     false, "init"); }
void Nova64Host::cart_update(double p_delta)  {
    // Advance the JS-side input "previous frame" window so btnp/keyp/
    // mousePressed give a clean single-frame edge that matches the
    // browser runtime/input.js step() semantics.
    if (_context && _cart_loaded) {
        JSValue global = JS_GetGlobalObject(_context);
        JSValue step = JS_GetPropertyStr(_context, global, "__nova64_inputStep");
        if (JS_IsFunction(_context, step)) {
            JSValue r = JS_Call(_context, step, JS_UNDEFINED, 0, nullptr);
            if (!JS_IsException(r)) JS_FreeValue(_context, r);
            else JS_FreeValue(_context, JS_GetException(_context));
        }
        JS_FreeValue(_context, step);
        // Tick the active-tween registry and novaStore time so carts that
        // use createTween / novaStore don't need to call updateTweens(dt) manually.
        JSValue preUpdate = JS_GetPropertyStr(_context, global, "__nova64_preUpdate");
        if (JS_IsFunction(_context, preUpdate)) {
            JSValue dtVal = JS_NewFloat64(_context, p_delta);
            JSValue r2 = JS_Call(_context, preUpdate, JS_UNDEFINED, 1, &dtVal);
            if (!JS_IsException(r2)) JS_FreeValue(_context, r2);
            else JS_FreeValue(_context, JS_GetException(_context));
            JS_FreeValue(_context, dtVal);
        }
        JS_FreeValue(_context, preUpdate);
        JS_FreeValue(_context, global);
    }
    auto t0 = std::chrono::high_resolution_clock::now();
    _call_cart_fn(_cart_update_fn, p_delta, true,  "update");
    auto t1 = std::chrono::high_resolution_clock::now();
    // Stash update sample; pair with the matching draw sample in cart_draw.
    _perf_update_us[_perf_index] =
        std::chrono::duration_cast<std::chrono::microseconds>(t1 - t0).count();
}
void Nova64Host::cart_draw()                  {
    _overlay_clear();
    auto t0 = std::chrono::high_resolution_clock::now();
    _call_cart_fn(_cart_draw_fn,   0.0,     false, "draw");
    // Drain the per-frame overlay queue. The shim publishes a global
    // __nova64_overlayFlush() that issues a single overlay.batch with
    // every queued op, so we amortize the JS↔C++ marshalling cost.
    if (_context && _cart_loaded) {
        JSValue global = JS_GetGlobalObject(_context);
        JSValue flush = JS_GetPropertyStr(_context, global, "__nova64_overlayFlush");
        if (JS_IsFunction(_context, flush)) {
            JSValue r = JS_Call(_context, flush, JS_UNDEFINED, 0, nullptr);
            if (JS_IsException(r)) {
                JSValue exc = JS_GetException(_context);
                const char *msg = JS_ToCString(_context, exc);
                UtilityFunctions::printerr("[nova64] overlay flush: ",
                        msg ? String::utf8(msg) : String("(unknown error)"));
                if (msg) JS_FreeCString(_context, msg);
                JS_FreeValue(_context, exc);
            }
            JS_FreeValue(_context, r);
        }
        JS_FreeValue(_context, flush);
        JS_FreeValue(_context, global);
    }
    auto t1 = std::chrono::high_resolution_clock::now();
    uint64_t us = std::chrono::duration_cast<std::chrono::microseconds>(t1 - t0).count();
    _record_perf_sample(_perf_update_us[_perf_index], us);
}

void Nova64Host::_record_perf_sample(uint64_t p_update_us, uint64_t p_draw_us) {
    _perf_update_us[_perf_index] = p_update_us;
    _perf_draw_us[_perf_index]   = p_draw_us;
    _perf_index = (_perf_index + 1) % PERF_WINDOW;
    _perf_frame_count++;

    // Emit one perf line every PERF_WINDOW frames so adb logcat / pnpm bench
    // can pick it up via grep without spamming the log.
    if (_perf_frame_count > 0 && (_perf_frame_count % PERF_WINDOW) == 0) {
        Dictionary s = get_perf_stats();
        UtilityFunctions::print("[nova64-perf] frame_us avg=",
            s["avg_frame_us"], " max=", s["max_frame_us"],
            " update_us avg=", s["avg_update_us"], " max=", s["max_update_us"],
            " draw_us avg=", s["avg_draw_us"], " max=", s["max_draw_us"],
            " frames=", static_cast<int64_t>(_perf_frame_count));
    }
}

Dictionary Nova64Host::get_perf_stats() const {
    Dictionary out;
    int n = static_cast<int>(_perf_frame_count < PERF_WINDOW ? _perf_frame_count : PERF_WINDOW);
    if (n == 0) {
        out["avg_update_us"] = 0; out["max_update_us"] = 0;
        out["avg_draw_us"]   = 0; out["max_draw_us"]   = 0;
        out["avg_frame_us"]  = 0; out["max_frame_us"]  = 0;
        out["frame_count"]   = 0;
        return out;
    }
    uint64_t sum_u = 0, max_u = 0, sum_d = 0, max_d = 0, sum_f = 0, max_f = 0;
    for (int i = 0; i < n; i++) {
        uint64_t u = _perf_update_us[i];
        uint64_t d = _perf_draw_us[i];
        uint64_t f = u + d;
        sum_u += u; if (u > max_u) max_u = u;
        sum_d += d; if (d > max_d) max_d = d;
        sum_f += f; if (f > max_f) max_f = f;
    }
    out["avg_update_us"] = static_cast<int64_t>(sum_u / n);
    out["max_update_us"] = static_cast<int64_t>(max_u);
    out["avg_draw_us"]   = static_cast<int64_t>(sum_d / n);
    out["max_draw_us"]   = static_cast<int64_t>(max_d);
    out["avg_frame_us"]  = static_cast<int64_t>(sum_f / n);
    out["max_frame_us"]  = static_cast<int64_t>(max_f);
    out["frame_count"]   = static_cast<int64_t>(_perf_frame_count);
    return out;
}

Variant Nova64Host::read_global(const String &p_name) {
    if (!_context) return Variant();
    CharString cs = p_name.utf8();
    JSValue global = JS_GetGlobalObject(_context);
    JSValue v = JS_GetPropertyStr(_context, global, cs.get_data());
    Variant out;
    if (!JS_IsUndefined(v) && !JS_IsNull(v)) {
        out = js_to_variant(_context, v);
    }
    JS_FreeValue(_context, v);
    JS_FreeValue(_context, global);
    return out;
}

// ===========================================================================
// 2D Overlay (cart-side draw API)
// ===========================================================================

void Nova64Host::_ensure_overlay() {
    if (_overlay != nullptr) return;
    _overlay_layer = memnew(CanvasLayer);
    _overlay_layer->set_layer(50);
    add_child(_overlay_layer);

    _overlay = memnew(Control);
    _overlay->set_anchors_and_offsets_preset(Control::PRESET_FULL_RECT);
    _overlay->set_mouse_filter(Control::MOUSE_FILTER_IGNORE);
    _overlay_layer->add_child(_overlay);
}

void Nova64Host::_overlay_clear() {
    if (_overlay == nullptr) return;
    RenderingServer::get_singleton()->canvas_item_clear(_overlay->get_canvas_item());
}

// Carts author against a 640x360 logical canvas. Scale to whatever the
// real Control rect is so it stays stable across window sizes.
static Vector2 overlay_scale(godot::Control *overlay) {
    if (overlay == nullptr) return Vector2(1, 1);
    Vector2 sz = overlay->get_size();
    float sx = sz.x > 0 ? sz.x / 640.0f : 1.0f;
    float sy = sz.y > 0 ? sz.y / 360.0f : 1.0f;
    return Vector2(sx, sy);
}

Dictionary Nova64Host::_cmd_overlay_cls(const Dictionary &p) {
    _ensure_overlay();
    Color c = color_from_payload(p, "color", Color(0, 0, 0, 1));
    RenderingServer *rs = RenderingServer::get_singleton();
    rs->canvas_item_clear(_overlay->get_canvas_item());
    Vector2 sz = _overlay->get_size();
    if (sz.x <= 0) sz = Vector2(640, 360);
    rs->canvas_item_add_rect(_overlay->get_canvas_item(),
            Rect2(Vector2(0, 0), sz), c);
    Dictionary out; out["ok"] = true; return out;
}

Dictionary Nova64Host::_cmd_overlay_pset(const Dictionary &p) {
    _ensure_overlay();
    Vector2 s = overlay_scale(_overlay);
    float x = static_cast<float>(p.get("x", 0.0));
    float y = static_cast<float>(p.get("y", 0.0));
    Color c = color_from_payload(p, "color", Color(1, 1, 1, 1));
    RenderingServer::get_singleton()->canvas_item_add_rect(
            _overlay->get_canvas_item(),
            Rect2(Vector2(x * s.x, y * s.y),
                  Vector2(Math::max(1.0f, s.x), Math::max(1.0f, s.y))),
            c);
    Dictionary out; out["ok"] = true; return out;
}

Dictionary Nova64Host::_cmd_overlay_rect(const Dictionary &p) {
    _ensure_overlay();
    Vector2 s = overlay_scale(_overlay);
    float x = static_cast<float>(p.get("x", 0.0));
    float y = static_cast<float>(p.get("y", 0.0));
    float w = static_cast<float>(p.get("w", 0.0));
    float h = static_cast<float>(p.get("h", 0.0));
    Color c = color_from_payload(p, "color", Color(1, 1, 1, 1));
    bool filled = static_cast<bool>(p.get("filled", true));
    RenderingServer *rs = RenderingServer::get_singleton();
    RID ci = _overlay->get_canvas_item();
    Rect2 r(Vector2(x * s.x, y * s.y), Vector2(w * s.x, h * s.y));
    if (filled) {
        rs->canvas_item_add_rect(ci, r, c);
    } else {
        // Four edge lines so outline rect renders consistently.
        Vector2 tl = r.position;
        Vector2 tr = tl + Vector2(r.size.x, 0);
        Vector2 bl = tl + Vector2(0, r.size.y);
        Vector2 br = tl + r.size;
        float w_px = Math::max(1.0f, s.x);
        rs->canvas_item_add_line(ci, tl, tr, c, w_px);
        rs->canvas_item_add_line(ci, tr, br, c, w_px);
        rs->canvas_item_add_line(ci, br, bl, c, w_px);
        rs->canvas_item_add_line(ci, bl, tl, c, w_px);
    }
    Dictionary out; out["ok"] = true; return out;
}

Dictionary Nova64Host::_cmd_overlay_line(const Dictionary &p) {
    _ensure_overlay();
    Vector2 s = overlay_scale(_overlay);
    float x0 = static_cast<float>(p.get("x0", 0.0));
    float y0 = static_cast<float>(p.get("y0", 0.0));
    float x1 = static_cast<float>(p.get("x1", 0.0));
    float y1 = static_cast<float>(p.get("y1", 0.0));
    Color c = color_from_payload(p, "color", Color(1, 1, 1, 1));
    float width = static_cast<float>(p.get("width", 1.0)) * Math::max(s.x, s.y);
    if (width < 1.0f) width = 1.0f;
    RenderingServer::get_singleton()->canvas_item_add_line(
            _overlay->get_canvas_item(),
            Vector2(x0 * s.x, y0 * s.y),
            Vector2(x1 * s.x, y1 * s.y),
            c, width);
    Dictionary out; out["ok"] = true; return out;
}

Dictionary Nova64Host::_cmd_overlay_circle(const Dictionary &p) {
    _ensure_overlay();
    Vector2 s = overlay_scale(_overlay);
    float x = static_cast<float>(p.get("x", 0.0));
    float y = static_cast<float>(p.get("y", 0.0));
    float r = static_cast<float>(p.get("r", 1.0));
    Color c = color_from_payload(p, "color", Color(1, 1, 1, 1));
    bool filled = static_cast<bool>(p.get("filled", true));
    RenderingServer *rs = RenderingServer::get_singleton();
    RID ci = _overlay->get_canvas_item();
    Vector2 center(x * s.x, y * s.y);
    float radius = r * Math::max(s.x, s.y);
    if (filled) {
        rs->canvas_item_add_circle(ci, center, radius, c);
    } else {
        // Approximate circle outline as polyline.
        constexpr int SEGMENTS = 32;
        PackedVector2Array pts;
        pts.resize(SEGMENTS + 1);
        for (int i = 0; i <= SEGMENTS; i++) {
            float a = (float)i / SEGMENTS * Math_TAU;
            pts[i] = center + Vector2(Math::cos(a), Math::sin(a)) * radius;
        }
        PackedColorArray cols;
        cols.push_back(c);
        rs->canvas_item_add_polyline(ci, pts, cols, Math::max(1.0f, s.x));
    }
    Dictionary out; out["ok"] = true; return out;
}

Dictionary Nova64Host::_cmd_overlay_text(const Dictionary &p) {
    _ensure_overlay();
    Vector2 s = overlay_scale(_overlay);
    float x = static_cast<float>(p.get("x", 0.0));
    float y = static_cast<float>(p.get("y", 0.0));
    String text = String(p.get("text", ""));
    Color c = color_from_payload(p, "color", Color(1, 1, 1, 1));
    float scale = static_cast<float>(p.get("scale", 1.0));
    Ref<Font> font = _overlay->get_theme_default_font();
    if (font.is_null()) {
        Dictionary out; out["ok"] = false; out["error"] = "no_font"; return out;
    }
    int base_size = 12;
    int font_size = static_cast<int>(Math::round(base_size * scale * Math::max(s.x, s.y)));
    if (font_size < 8) font_size = 8;
    // Cart text origin is top-left; Font::draw_string uses baseline. Add
    // ascent so y matches typical pico-style top-left text positioning.
    float ascent = font->get_ascent(font_size);
    Vector2 pos(x * s.x, y * s.y + ascent);
    font->draw_string(_overlay->get_canvas_item(), pos, text,
            HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, c);
    Dictionary out; out["ok"] = true; return out;
}

// ---- overlay batch dispatch ---------------------------------------------
// Op format (small Array; index 0 is the op tag string):
//   ['cls',   color]
//   ['pset',  x, y, color]
//   ['rect',  x, y, w, h, color, filled]
//   ['line',  x0, y0, x1, y1, color]
//   ['circle',x, y, r, color, filled]
//   ['text',  x, y, text, color, scale]
//
// `color` is a 4-element [r,g,b,a] float array (already normalized 0..1)
// because the shim's colorFromHex returns it that way.

static Color color_from_array(const Variant &v, const Color &fallback) {
    if (v.get_type() != Variant::ARRAY) return fallback;
    Array a = v;
    if (a.size() < 3) return fallback;
    float r = static_cast<float>(static_cast<double>(a[0]));
    float g = static_cast<float>(static_cast<double>(a[1]));
    float b = static_cast<float>(static_cast<double>(a[2]));
    float al = a.size() >= 4 ? static_cast<float>(static_cast<double>(a[3])) : 1.0f;
    return Color(r, g, b, al);
}

void Nova64Host::_overlay_op_cls(const Array &op) {
    if (op.size() < 2 || _overlay == nullptr) return;
    Color c = color_from_array(op[1], Color(0, 0, 0, 1));
    RenderingServer *rs = RenderingServer::get_singleton();
    rs->canvas_item_clear(_overlay->get_canvas_item());
    Vector2 sz = _overlay->get_size();
    if (sz.x <= 0) sz = Vector2(640, 360);
    rs->canvas_item_add_rect(_overlay->get_canvas_item(),
            Rect2(Vector2(0, 0), sz), c);
}

void Nova64Host::_overlay_op_pset(const Array &op) {
    if (op.size() < 4 || _overlay == nullptr) return;
    Vector2 s = overlay_scale(_overlay);
    float x = static_cast<float>(static_cast<double>(op[1]));
    float y = static_cast<float>(static_cast<double>(op[2]));
    Color c = color_from_array(op[3], Color(1, 1, 1, 1));
    RenderingServer::get_singleton()->canvas_item_add_rect(
            _overlay->get_canvas_item(),
            Rect2(Vector2(x * s.x, y * s.y),
                  Vector2(Math::max(1.0f, s.x), Math::max(1.0f, s.y))),
            c);
}

void Nova64Host::_overlay_op_rect(const Array &op) {
    if (op.size() < 7 || _overlay == nullptr) return;
    Vector2 s = overlay_scale(_overlay);
    float x = static_cast<float>(static_cast<double>(op[1]));
    float y = static_cast<float>(static_cast<double>(op[2]));
    float w = static_cast<float>(static_cast<double>(op[3]));
    float h = static_cast<float>(static_cast<double>(op[4]));
    Color c = color_from_array(op[5], Color(1, 1, 1, 1));
    bool filled = static_cast<bool>(op[6]);
    RenderingServer *rs = RenderingServer::get_singleton();
    RID ci = _overlay->get_canvas_item();
    Rect2 r(Vector2(x * s.x, y * s.y), Vector2(w * s.x, h * s.y));
    if (filled) {
        rs->canvas_item_add_rect(ci, r, c);
    } else {
        Vector2 tl = r.position;
        Vector2 tr = tl + Vector2(r.size.x, 0);
        Vector2 bl = tl + Vector2(0, r.size.y);
        Vector2 br = tl + r.size;
        float w_px = Math::max(1.0f, s.x);
        rs->canvas_item_add_line(ci, tl, tr, c, w_px);
        rs->canvas_item_add_line(ci, tr, br, c, w_px);
        rs->canvas_item_add_line(ci, br, bl, c, w_px);
        rs->canvas_item_add_line(ci, bl, tl, c, w_px);
    }
}

void Nova64Host::_overlay_op_line(const Array &op) {
    if (op.size() < 6 || _overlay == nullptr) return;
    Vector2 s = overlay_scale(_overlay);
    float x0 = static_cast<float>(static_cast<double>(op[1]));
    float y0 = static_cast<float>(static_cast<double>(op[2]));
    float x1 = static_cast<float>(static_cast<double>(op[3]));
    float y1 = static_cast<float>(static_cast<double>(op[4]));
    Color c = color_from_array(op[5], Color(1, 1, 1, 1));
    float width = Math::max(1.0f, Math::max(s.x, s.y));
    RenderingServer::get_singleton()->canvas_item_add_line(
            _overlay->get_canvas_item(),
            Vector2(x0 * s.x, y0 * s.y),
            Vector2(x1 * s.x, y1 * s.y),
            c, width);
}

void Nova64Host::_overlay_op_circle(const Array &op) {
    if (op.size() < 6 || _overlay == nullptr) return;
    Vector2 s = overlay_scale(_overlay);
    float x = static_cast<float>(static_cast<double>(op[1]));
    float y = static_cast<float>(static_cast<double>(op[2]));
    float r = static_cast<float>(static_cast<double>(op[3]));
    Color c = color_from_array(op[4], Color(1, 1, 1, 1));
    bool filled = static_cast<bool>(op[5]);
    RenderingServer *rs = RenderingServer::get_singleton();
    RID ci = _overlay->get_canvas_item();
    Vector2 center(x * s.x, y * s.y);
    float radius = r * Math::max(s.x, s.y);
    if (filled) {
        rs->canvas_item_add_circle(ci, center, radius, c);
    } else {
        constexpr int SEGMENTS = 32;
        PackedVector2Array pts;
        pts.resize(SEGMENTS + 1);
        for (int i = 0; i <= SEGMENTS; i++) {
            float a = (float)i / SEGMENTS * Math_TAU;
            pts[i] = center + Vector2(Math::cos(a), Math::sin(a)) * radius;
        }
        PackedColorArray cols;
        cols.push_back(c);
        rs->canvas_item_add_polyline(ci, pts, cols, Math::max(1.0f, s.x));
    }
}

void Nova64Host::_overlay_op_text(const Array &op) {
    if (op.size() < 6 || _overlay == nullptr) return;
    Vector2 s = overlay_scale(_overlay);
    float x = static_cast<float>(static_cast<double>(op[1]));
    float y = static_cast<float>(static_cast<double>(op[2]));
    String text = String(op[3]);
    Color c = color_from_array(op[4], Color(1, 1, 1, 1));
    float scale = static_cast<float>(static_cast<double>(op[5]));
    Ref<Font> font = _overlay->get_theme_default_font();
    if (font.is_null()) return;
    int base_size = 12;
    int font_size = static_cast<int>(Math::round(base_size * scale * Math::max(s.x, s.y)));
    if (font_size < 8) font_size = 8;
    float ascent = font->get_ascent(font_size);
    Vector2 pos(x * s.x, y * s.y + ascent);
    font->draw_string(_overlay->get_canvas_item(), pos, text,
            HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, c);
}

Dictionary Nova64Host::_cmd_overlay_batch(const Dictionary &p) {
    _ensure_overlay();
    Variant v = p.get("ops", Variant());
    if (v.get_type() != Variant::ARRAY) {
        Dictionary out; out["ok"] = false; out["error"] = "no_ops"; return out;
    }
    Array ops = v;
    int n = ops.size();
    for (int i = 0; i < n; i++) {
        if (ops[i].get_type() != Variant::ARRAY) continue;
        Array op = ops[i];
        if (op.size() < 1) continue;
        String tag = String(op[0]);
        if (tag == "rect")           _overlay_op_rect(op);
        else if (tag == "line")      _overlay_op_line(op);
        else if (tag == "circle")    _overlay_op_circle(op);
        else if (tag == "text")      _overlay_op_text(op);
        else if (tag == "pset")      _overlay_op_pset(op);
        else if (tag == "cls")       _overlay_op_cls(op);
        else if (tag == "gradient")  _overlay_op_gradient(op);
        else if (tag == "triangle")  _overlay_op_triangle(op);
        else if (tag == "polygon")   _overlay_op_polygon(op);
        else if (tag == "ellipse")   _overlay_op_ellipse(op);
    }
    Dictionary out; out["ok"] = true; out["count"] = n; return out;
}

// ---- gradient op: vertical gradient fill --------------------------------
// Op format: ['gradient', x, y, w, h, topColor, bottomColor]
void Nova64Host::_overlay_op_gradient(const Array &op) {
    if (op.size() < 7 || _overlay == nullptr) return;
    Vector2 s = overlay_scale(_overlay);
    float x = static_cast<float>(static_cast<double>(op[1])) * s.x;
    float y = static_cast<float>(static_cast<double>(op[2])) * s.y;
    float w = static_cast<float>(static_cast<double>(op[3])) * s.x;
    float h = static_cast<float>(static_cast<double>(op[4])) * s.y;
    Color top = color_from_array(op[5], Color(1, 1, 1, 1));
    Color bot = color_from_array(op[6], Color(0, 0, 0, 1));

    RenderingServer *rs = RenderingServer::get_singleton();
    RID ci = _overlay->get_canvas_item();

    // Use a quad with per-vertex colors for smooth gradient
    PackedVector2Array pts;
    pts.push_back(Vector2(x, y));         // top-left
    pts.push_back(Vector2(x + w, y));     // top-right
    pts.push_back(Vector2(x + w, y + h)); // bottom-right
    pts.push_back(Vector2(x, y + h));     // bottom-left

    PackedColorArray cols;
    cols.push_back(top);   // top-left
    cols.push_back(top);   // top-right
    cols.push_back(bot);   // bottom-right
    cols.push_back(bot);   // bottom-left

    rs->canvas_item_add_polygon(ci, pts, cols);
}

// ---- triangle op: filled triangle ---------------------------------------
// Op format: ['triangle', x0, y0, x1, y1, x2, y2, color, filled]
void Nova64Host::_overlay_op_triangle(const Array &op) {
    if (op.size() < 8 || _overlay == nullptr) return;
    Vector2 s = overlay_scale(_overlay);
    float x0 = static_cast<float>(static_cast<double>(op[1])) * s.x;
    float y0 = static_cast<float>(static_cast<double>(op[2])) * s.y;
    float x1 = static_cast<float>(static_cast<double>(op[3])) * s.x;
    float y1 = static_cast<float>(static_cast<double>(op[4])) * s.y;
    float x2 = static_cast<float>(static_cast<double>(op[5])) * s.x;
    float y2 = static_cast<float>(static_cast<double>(op[6])) * s.y;
    Color c = color_from_array(op[7], Color(1, 1, 1, 1));
    bool filled = op.size() > 8 ? static_cast<bool>(op[8]) : true;

    RenderingServer *rs = RenderingServer::get_singleton();
    RID ci = _overlay->get_canvas_item();

    if (filled) {
        PackedVector2Array pts;
        pts.push_back(Vector2(x0, y0));
        pts.push_back(Vector2(x1, y1));
        pts.push_back(Vector2(x2, y2));
        PackedColorArray cols;
        cols.push_back(c);
        cols.push_back(c);
        cols.push_back(c);
        rs->canvas_item_add_polygon(ci, pts, cols);
    } else {
        // Outline only
        PackedVector2Array pts;
        pts.push_back(Vector2(x0, y0));
        pts.push_back(Vector2(x1, y1));
        pts.push_back(Vector2(x2, y2));
        pts.push_back(Vector2(x0, y0)); // close the triangle
        PackedColorArray cols;
        cols.push_back(c);
        rs->canvas_item_add_polyline(ci, pts, cols, Math::max(1.0f, s.x));
    }
}

// ---- polygon op: filled polygon from point array -------------------------
// Op format: ['polygon', [x0,y0,x1,y1,...], color, filled]
void Nova64Host::_overlay_op_polygon(const Array &op) {
    if (op.size() < 3 || _overlay == nullptr) return;
    Vector2 s = overlay_scale(_overlay);
    Color c = color_from_array(op[2], Color(1, 1, 1, 1));
    bool filled = op.size() > 3 ? static_cast<bool>(op[3]) : true;

    Variant ptsVar = op[1];
    if (ptsVar.get_type() != Variant::ARRAY) return;
    Array ptsArr = ptsVar;
    int numCoords = ptsArr.size();
    if (numCoords < 6) return; // Need at least 3 points (6 coords)

    PackedVector2Array pts;
    for (int i = 0; i + 1 < numCoords; i += 2) {
        float px = static_cast<float>(static_cast<double>(ptsArr[i])) * s.x;
        float py = static_cast<float>(static_cast<double>(ptsArr[i + 1])) * s.y;
        pts.push_back(Vector2(px, py));
    }

    RenderingServer *rs = RenderingServer::get_singleton();
    RID ci = _overlay->get_canvas_item();

    if (filled) {
        PackedColorArray cols;
        for (int i = 0; i < pts.size(); i++) cols.push_back(c);
        rs->canvas_item_add_polygon(ci, pts, cols);
    } else {
        pts.push_back(pts[0]); // close polygon
        PackedColorArray cols;
        cols.push_back(c);
        rs->canvas_item_add_polyline(ci, pts, cols, Math::max(1.0f, s.x));
    }
}

// ---- ellipse op: filled/stroked ellipse ----------------------------------
// Op format: ['ellipse', cx, cy, rx, ry, color, filled]
void Nova64Host::_overlay_op_ellipse(const Array &op) {
    if (op.size() < 6 || _overlay == nullptr) return;
    Vector2 s = overlay_scale(_overlay);
    float cx = static_cast<float>(static_cast<double>(op[1])) * s.x;
    float cy = static_cast<float>(static_cast<double>(op[2])) * s.y;
    float rx = static_cast<float>(static_cast<double>(op[3])) * s.x;
    float ry = static_cast<float>(static_cast<double>(op[4])) * s.y;
    Color c = color_from_array(op[5], Color(1, 1, 1, 1));
    bool filled = op.size() > 6 ? static_cast<bool>(op[6]) : true;

    // Generate ellipse points
    const int segments = 32;
    PackedVector2Array pts;
    for (int i = 0; i < segments; i++) {
        float angle = static_cast<float>(i) / static_cast<float>(segments) * Math_TAU;
        pts.push_back(Vector2(cx + rx * cos(angle), cy + ry * sin(angle)));
    }

    RenderingServer *rs = RenderingServer::get_singleton();
    RID ci = _overlay->get_canvas_item();

    if (filled) {
        PackedColorArray cols;
        for (int i = 0; i < segments; i++) cols.push_back(c);
        rs->canvas_item_add_polygon(ci, pts, cols);
    } else {
        pts.push_back(pts[0]); // close ellipse
        PackedColorArray cols;
        cols.push_back(c);
        rs->canvas_item_add_polyline(ci, pts, cols, Math::max(1.0f, s.x));
    }
}
