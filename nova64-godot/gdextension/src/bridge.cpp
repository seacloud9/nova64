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
#include <godot_cpp/classes/cylinder_mesh.hpp>
#include <godot_cpp/classes/directional_light3d.hpp>
#include <godot_cpp/classes/environment.hpp>
#include <godot_cpp/classes/file_access.hpp>
#include <godot_cpp/classes/dir_access.hpp>
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
#include <godot_cpp/classes/resource_loader.hpp>
#include <godot_cpp/classes/mesh_instance3d.hpp>
#include <godot_cpp/classes/plane_mesh.hpp>
#include <godot_cpp/classes/sky.hpp>
#include <godot_cpp/classes/sphere_mesh.hpp>
#include <godot_cpp/classes/spot_light3d.hpp>
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
    if (_handles) _handles->clear(true);
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

    return make_error("unsupported_method", p_method);
}

// ---- Command handlers ----------------------------------------------------

Dictionary Nova64Host::_cmd_material_create(const Dictionary &p) {
    Ref<StandardMaterial3D> mat;
    mat.instantiate();
    mat->set_albedo(color_from_payload(p, "albedo", Color(1.0f, 1.0f, 1.0f, 1.0f)));
    if (p.has("metallic")) mat->set_metallic(static_cast<float>(static_cast<double>(p["metallic"])));
    if (p.has("roughness")) mat->set_roughness(static_cast<float>(static_cast<double>(p["roughness"])));
    if (p.has("unshaded") && static_cast<bool>(p["unshaded"])) {
        mat->set_shading_mode(BaseMaterial3D::SHADING_MODE_UNSHADED);
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
    if (p.has("blend")) {
        String b = p["blend"];
        if (b == "add") {
            mat->set_transparency(BaseMaterial3D::TRANSPARENCY_ALPHA);
            mat->set_blend_mode(BaseMaterial3D::BLEND_MODE_ADD);
            mat->set_depth_draw_mode(BaseMaterial3D::DEPTH_DRAW_DISABLED);
        } else if (b == "alpha") {
            mat->set_transparency(BaseMaterial3D::TRANSPARENCY_ALPHA);
        }
    }
    if (p.has("albedoTexture")) {
        uint32_t tex_id = handle_id_from_payload(p, "albedoTexture");
        Ref<RefCounted> tex_res = _handles->get_resource(tex_id, HandleKind::TEXTURE);
        Ref<Texture2D> tex = tex_res;
        if (tex.is_valid()) {
            mat->set_texture(BaseMaterial3D::TEXTURE_ALBEDO, tex);
        }
    }
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
    sky_mat->set_sky_top_color(Color(0.18f, 0.32f, 0.55f, 1.0f));
    sky_mat->set_sky_horizon_color(Color(0.55f, 0.62f, 0.72f, 1.0f));
    sky_mat->set_ground_horizon_color(Color(0.42f, 0.40f, 0.38f, 1.0f));
    sky_mat->set_ground_bottom_color(Color(0.10f, 0.10f, 0.12f, 1.0f));
    sky_mat->set_sun_angle_max(30.0f);
    sky->set_material(sky_mat);
    env->set_sky(sky);
    env->set_background(Environment::BG_SKY);
    env->set_ambient_source(Environment::AMBIENT_SOURCE_SKY);
    env->set_reflection_source(Environment::REFLECTION_SOURCE_SKY);
    env->set_ambient_light_energy(1.0f);

    // Tonemap — filmic by default, modest exposure so emissive materials
    // bloom without blowing out.
    env->set_tonemapper(Environment::TONE_MAPPER_FILMIC);
    env->set_tonemap_exposure(1.0f);
    env->set_tonemap_white(6.0f);

    // Glow / bloom — on by default. Mid intensity.
    env->set_glow_enabled(true);
    env->set_glow_intensity(0.8f);
    env->set_glow_strength(1.0f);
    env->set_glow_bloom(0.1f);
    env->set_glow_hdr_bleed_threshold(1.0f);

    // SSAO — subtle, off by default (can be expensive on mobile). Carts
    // enable explicitly via env.set.
    env->set_ssao_enabled(false);
    env->set_ssao_radius(1.0f);
    env->set_ssao_intensity(1.0f);

    // Subtle adjustments for that warm retro feel.
    env->set_adjustment_enabled(true);
    env->set_adjustment_brightness(1.0f);
    env->set_adjustment_contrast(1.05f);
    env->set_adjustment_saturation(1.05f);

    _world_env->set_environment(env);
    return env.ptr();
}

Dictionary Nova64Host::_cmd_env_set(const Dictionary &p) {
    Environment *env = _ensure_environment();
    if (!env) return make_error("env_unavailable", "env.set");

    if (p.has("ambient")) {
        env->set_ambient_source(Environment::AMBIENT_SOURCE_COLOR);
        env->set_ambient_light_color(color_from_payload(p, "ambient", Color(0.2f, 0.2f, 0.2f, 1.0f)));
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
    if (p.has("fogColor")) env->set_fog_light_color(
            color_from_payload(p, "fogColor", Color(0.5f, 0.6f, 0.7f, 1.0f)));
    if (p.has("fogDensity")) env->set_fog_density(
            static_cast<float>(static_cast<double>(p["fogDensity"])));

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

    Dictionary out; out["ok"] = true; return out;
}

// Polls the keyboard / mouse / first gamepad and returns a snapshot in
// the Nova64 input shape: { left, right, up, down, action, cancel,
//   axisX, axisY, mouseX, mouseY, mouseDown }.
Dictionary Nova64Host::_cmd_input_poll(const Dictionary &) {
    Dictionary out;
    Input *in = Input::get_singleton();
    if (!in) return out;

    auto key = [&](Key k) -> bool { return in->is_key_pressed(k); };

    bool left   = key(KEY_LEFT)  || key(KEY_A);
    bool right  = key(KEY_RIGHT) || key(KEY_D);
    bool up     = key(KEY_UP)    || key(KEY_W);
    bool down   = key(KEY_DOWN)  || key(KEY_S);
    bool action = key(KEY_SPACE) || key(KEY_ENTER) || key(KEY_Z);
    bool cancel = key(KEY_ESCAPE) || key(KEY_X);

    double axis_x = (right ? 1.0 : 0.0) - (left ? 1.0 : 0.0);
    double axis_y = (down  ? 1.0 : 0.0) - (up   ? 1.0 : 0.0);

    // Gamepad 0 left stick overrides keyboard if active.
    if (in->get_connected_joypads().size() > 0) {
        double gx = in->get_joy_axis(0, JOY_AXIS_LEFT_X);
        double gy = in->get_joy_axis(0, JOY_AXIS_LEFT_Y);
        if (Math::abs(gx) > 0.15) axis_x = gx;
        if (Math::abs(gy) > 0.15) axis_y = gy;
        if (in->is_joy_button_pressed(0, JOY_BUTTON_A)) action = true;
        if (in->is_joy_button_pressed(0, JOY_BUTTON_B)) cancel = true;
    }

    Vector2 mp = in->get_last_mouse_velocity(); // cheap, no viewport dep
    (void)mp;

    out["left"]      = left;
    out["right"]     = right;
    out["up"]        = up;
    out["down"]      = down;
    out["action"]    = action;
    out["cancel"]    = cancel;
    out["axisX"]     = axis_x;
    out["axisY"]     = axis_y;
    out["mouseDown"] = in->is_mouse_button_pressed(MOUSE_BUTTON_LEFT);
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

// ---- Cart loading (module mode) -----------------------------------------

bool Nova64Host::load_cart(const String &p_res_path) {
    _ensure_runtime();
    _load_compat_shim();
    _release_cart_exports();
    _cart_loaded = false;

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
}

void Nova64Host::cart_init()                  { _call_cart_fn(_cart_init_fn,   0.0,     false, "init"); }
void Nova64Host::cart_update(double p_delta)  {
    auto t0 = std::chrono::high_resolution_clock::now();
    _call_cart_fn(_cart_update_fn, p_delta, true,  "update");
    auto t1 = std::chrono::high_resolution_clock::now();
    // Stash update sample; pair with the matching draw sample in cart_draw.
    _perf_update_us[_perf_index] =
        std::chrono::duration_cast<std::chrono::microseconds>(t1 - t0).count();
}
void Nova64Host::cart_draw()                  {
    auto t0 = std::chrono::high_resolution_clock::now();
    _call_cart_fn(_cart_draw_fn,   0.0,     false, "draw");
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
