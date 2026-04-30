// bridge.cpp
// Nova64Host — QuickJS-backed host bridge for the Nova64 Godot adapter.
//
// Responsibilities at this milestone (G0 → G1 transition):
//   1. Own a JSRuntime / JSContext for the lifetime of the node.
//   2. Install host globals: `print`, `engine` (with `getCapabilities` and
//      `call(method, payload)`).
//   3. Load a cart file from a Godot resource path, evaluate it, and cache
//      its init/update/draw exports.
//   4. Provide GDScript-callable lifecycle methods.
//
// Higher-level adapter namespaces (material, geometry, mesh, transform,
// camera, etc.) are not yet implemented — call_bridge() returns
// { error: "unsupported_method" } for anything outside the boot whitelist.

#include "bridge.h"

#include <godot_cpp/classes/file_access.hpp>
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/variant/array.hpp>
#include <godot_cpp/variant/utility_functions.hpp>
#include <godot_cpp/variant/variant.hpp>

#include "quickjs.h"

#include <cstring>
#include <string>

using namespace godot;

namespace {

// Adapter contract version. MUST match ADAPTER_CONTRACT_VERSION in
// runtime/engine-adapter.js. Bump together when the contract changes.
constexpr const char *ADAPTER_CONTRACT_VERSION = "1.0.0";

// Adapter version for this Godot host. Increments independently of the
// contract version.
constexpr const char *GODOT_ADAPTER_VERSION = "0.1.0";

// Property key used to stash the owning Nova64Host pointer on the JS engine
// global so C callbacks can recover it from a JSContext.
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
// Minimal converters covering the shapes the boot whitelist needs:
// null/bool/number/string and flat Dictionary/Array. Deep typed-array and
// Vector2/3 support land at G1 alongside the geometry/transform commands.

JSValue variant_to_js(JSContext *ctx, const Variant &v);

JSValue dictionary_to_js(JSContext *ctx, const Dictionary &dict) {
    JSValue obj = JS_NewObject(ctx);
    Array keys = dict.keys();
    for (int i = 0; i < keys.size(); ++i) {
        Variant k = keys[i];
        String key_s = k.operator String();
        CharString key_utf8 = key_s.utf8();
        JSValue jv = variant_to_js(ctx, dict[k]);
        JS_SetPropertyStr(ctx, obj, key_utf8.get_data(), jv);
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
            // Fall back to string representation for anything we don't
            // explicitly handle. G1 will extend this to typed packed arrays.
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
        if (!s) {
            return Variant(String());
        }
        String out = String::utf8(s);
        JS_FreeCString(ctx, s);
        return out;
    }
    if (JS_IsArray(ctx, v)) {
        return js_to_array(ctx, v);
    }
    if (JS_IsObject(v)) {
        return js_to_dictionary(ctx, v);
    }
    return Variant();
}

// ---- Host-installed JS callbacks ----------------------------------------

JSValue js_print(JSContext *ctx, JSValueConst /*this_val*/, int argc, JSValueConst *argv) {
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

JSValue js_engine_call(JSContext *ctx, JSValueConst /*this_val*/, int argc, JSValueConst *argv) {
    if (argc < 1 || !JS_IsString(argv[0])) {
        return JS_ThrowTypeError(ctx, "engine.call: method must be a string");
    }
    const char *method_c = JS_ToCString(ctx, argv[0]);
    if (!method_c) {
        return JS_EXCEPTION;
    }
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

Dictionary make_unsupported(const String &p_method) {
    Dictionary out;
    out["error"] = "unsupported_method";
    out["method"] = p_method;
    return out;
}

} // namespace

// ---------------------------------------------------------------------------
// Nova64Host
// ---------------------------------------------------------------------------

Nova64Host::Nova64Host() {
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
    if (_runtime) {
        return;
    }
    _runtime = JS_NewRuntime();
    _context = JS_NewContext(_runtime);
    _install_host_globals();
}

void Nova64Host::_shutdown_runtime() {
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

    // Stash a host pointer the JS callbacks can recover.
    JS_SetPropertyStr(ctx, global, HOST_OPAQUE_KEY,
            JS_NewInt64(ctx, static_cast<int64_t>(reinterpret_cast<intptr_t>(this))));

    // print()
    JS_SetPropertyStr(ctx, global, "print",
            JS_NewCFunction(ctx, js_print, "print", 1));

    // engine.{ call, getCapabilities }
    JSValue engine_obj = JS_NewObject(ctx);
    JS_SetPropertyStr(ctx, engine_obj, "call",
            JS_NewCFunction(ctx, js_engine_call, "call", 2));
    // engine.getCapabilities is a thin shim implemented in JS for ergonomics.
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
    caps["features"] = features;

    return caps;
}

Dictionary Nova64Host::call_bridge(const String &p_method, const Dictionary &p_payload) {
    (void)p_payload; // Boot whitelist ignores payload; G1 commands consume it.

    if (p_method == "host.getCapabilities") {
        Dictionary out;
        out["capabilities"] = get_capabilities();
        return out;
    }
    if (p_method == "engine.init") {
        Dictionary out;
        out["capabilities"] = get_capabilities();
        return out;
    }
    return make_unsupported(p_method);
}

bool Nova64Host::load_cart(const String &p_res_path) {
    _ensure_runtime();

    Ref<FileAccess> f = FileAccess::open(p_res_path, FileAccess::READ);
    if (f.is_null()) {
        UtilityFunctions::printerr("[nova64] load_cart: cannot open ", p_res_path);
        return false;
    }
    String src = f->get_as_text();
    f->close();

    CharString src_utf8 = src.utf8();
    CharString name_utf8 = p_res_path.utf8();

    // Evaluate as a global script for the spike. ES module support is added
    // at G1 alongside cart export resolution via module namespace objects.
    // Carts can still attach init/update/draw by assigning to globalThis.
    JSValue eval_result = JS_Eval(_context, src_utf8.get_data(), src_utf8.length(),
            name_utf8.get_data(), JS_EVAL_TYPE_GLOBAL);
    if (JS_IsException(eval_result)) {
        JSValue exc = JS_GetException(_context);
        const char *msg = JS_ToCString(_context, exc);
        UtilityFunctions::printerr("[nova64] load_cart: error: ",
                msg ? String::utf8(msg) : String("(unknown)"));
        if (msg) JS_FreeCString(_context, msg);
        JS_FreeValue(_context, exc);
        JS_FreeValue(_context, eval_result);
        return false;
    }
    JS_FreeValue(_context, eval_result);

    _cart_loaded = true;
    UtilityFunctions::print("[nova64] cart loaded: ", p_res_path);
    return true;
}

void Nova64Host::_call_export(const char *p_export_name, double p_arg, bool p_pass_arg) {
    if (!_cart_loaded || !_context) {
        return;
    }
    // Resolve the export from the global namespace. ES module top-level
    // bindings are not globals; reaching them properly requires the module
    // namespace object. For the spike we accept globals (cart can assign
    // `globalThis.init = function(){...}` directly). G1 switches to module
    // namespace introspection.
    JSValue global = JS_GetGlobalObject(_context);
    JSValue fn = JS_GetPropertyStr(_context, global, p_export_name);
    JS_FreeValue(_context, global);

    if (!JS_IsFunction(_context, fn)) {
        JS_FreeValue(_context, fn);
        return;
    }

    JSValue ret;
    if (p_pass_arg) {
        JSValue arg = JS_NewFloat64(_context, p_arg);
        ret = JS_Call(_context, fn, JS_UNDEFINED, 1, &arg);
        JS_FreeValue(_context, arg);
    } else {
        ret = JS_Call(_context, fn, JS_UNDEFINED, 0, nullptr);
    }
    if (JS_IsException(ret)) {
        JSValue exc = JS_GetException(_context);
        const char *msg = JS_ToCString(_context, exc);
        UtilityFunctions::printerr("[nova64] cart ", String::utf8(p_export_name),
                ": ", msg ? String::utf8(msg) : String("(unknown error)"));
        if (msg) JS_FreeCString(_context, msg);
        JS_FreeValue(_context, exc);
    }
    JS_FreeValue(_context, ret);
    JS_FreeValue(_context, fn);
}

void Nova64Host::cart_init() {
    _call_export("init", 0.0, false);
}

void Nova64Host::cart_update(double p_delta) {
    _call_export("update", p_delta, true);
}

void Nova64Host::cart_draw() {
    _call_export("draw", 0.0, false);
}
