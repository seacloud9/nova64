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
#include <godot_cpp/classes/directional_light3d.hpp>
#include <godot_cpp/classes/file_access.hpp>
#include <godot_cpp/classes/image.hpp>
#include <godot_cpp/classes/image_texture.hpp>
#include <godot_cpp/classes/input.hpp>
#include <godot_cpp/classes/audio_stream.hpp>
#include <godot_cpp/classes/audio_stream_player.hpp>
#include <godot_cpp/classes/gpu_particles3d.hpp>
#include <godot_cpp/classes/particle_process_material.hpp>
#include <godot_cpp/classes/multi_mesh.hpp>
#include <godot_cpp/classes/multi_mesh_instance3d.hpp>
#include <godot_cpp/classes/resource_loader.hpp>
#include <godot_cpp/classes/mesh_instance3d.hpp>
#include <godot_cpp/classes/plane_mesh.hpp>
#include <godot_cpp/classes/sphere_mesh.hpp>
#include <godot_cpp/classes/standard_material3d.hpp>
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/variant/array.hpp>
#include <godot_cpp/variant/color.hpp>
#include <godot_cpp/variant/transform3d.hpp>
#include <godot_cpp/variant/utility_functions.hpp>
#include <godot_cpp/variant/variant.hpp>
#include <godot_cpp/variant/vector2.hpp>
#include <godot_cpp/variant/vector3.hpp>

#include "quickjs.h"

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
    caps["features"] = features;

    return caps;
}

Dictionary Nova64Host::call_bridge(const String &p_method, const Dictionary &p_payload) {
    if (p_method == "host.getCapabilities") {
        Dictionary out; out["capabilities"] = get_capabilities(); return out;
    }
    if (p_method == "engine.init") {
        Dictionary out; out["capabilities"] = get_capabilities(); return out;
    }
    if (p_method == "material.create")          return _cmd_material_create(p_payload);
    if (p_method == "material.destroy")         return _cmd_material_destroy(p_payload);
    if (p_method == "geometry.createBox")       return _cmd_geometry_create_box(p_payload);
    if (p_method == "geometry.createSphere")    return _cmd_geometry_create_sphere(p_payload);
    if (p_method == "geometry.createPlane")     return _cmd_geometry_create_plane(p_payload);
    if (p_method == "mesh.create")              return _cmd_mesh_create(p_payload);
    if (p_method == "mesh.setMaterial")         return _cmd_mesh_set_material(p_payload);
    if (p_method == "mesh.destroy")             return _cmd_mesh_destroy(p_payload);
    if (p_method == "transform.set")            return _cmd_transform_set(p_payload);
    if (p_method == "camera.create")            return _cmd_camera_create(p_payload);
    if (p_method == "camera.setActive")         return _cmd_camera_set_active(p_payload);
    if (p_method == "light.createDirectional")  return _cmd_light_create_directional(p_payload);
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

Dictionary Nova64Host::_cmd_camera_create(const Dictionary &) {
    Camera3D *cam = memnew(Camera3D);
    add_child(cam);
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

Dictionary Nova64Host::_cmd_light_create_directional(const Dictionary &p) {
    DirectionalLight3D *light = memnew(DirectionalLight3D);
    add_child(light);
    if (p.has("color")) light->set_color(color_from_payload(p, "color", Color(1, 1, 1, 1)));
    if (p.has("energy")) light->set_param(Light3D::PARAM_ENERGY,
            static_cast<float>(static_cast<double>(p["energy"])));
    uint32_t id = _handles->put_node(HandleKind::LIGHT, light);
    return make_handle_result(id);
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
    _release_cart_exports();
    _cart_loaded = false;

    Ref<FileAccess> f = FileAccess::open(p_res_path, FileAccess::READ);
    if (f.is_null()) {
        UtilityFunctions::printerr("[nova64] load_cart: cannot open ", p_res_path);
        return false;
    }
    String src = f->get_as_text();
    f->close();

    CharString src_utf8 = src.utf8();
    CharString name_utf8 = p_res_path.utf8();

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
void Nova64Host::cart_update(double p_delta)  { _call_cart_fn(_cart_update_fn, p_delta, true,  "update"); }
void Nova64Host::cart_draw()                  { _call_cart_fn(_cart_draw_fn,   0.0,     false, "draw"); }
