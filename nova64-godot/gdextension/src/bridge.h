// bridge.h
// Nova64Host — Godot-facing class that owns the JS runtime and the bridge
// command buffer. Exposed to GDScript so test scenes can drive the host
// during the G0 spike.

#pragma once

#include <godot_cpp/classes/node.hpp>
#include <godot_cpp/variant/dictionary.hpp>
#include <godot_cpp/variant/string.hpp>

// QuickJS forward declarations — full header is included in bridge.cpp only.
struct JSRuntime;
struct JSContext;

namespace godot {

class Nova64Host : public Node {
    GDCLASS(Nova64Host, Node)

protected:
    static void _bind_methods();

public:
    Nova64Host();
    ~Nova64Host() override;

    // Returns the host capability descriptor in the same shape produced by
    // buildCapabilities() in runtime/engine-adapter.js.
    Dictionary get_capabilities() const;

    // Bridge entry point: JS-side commands enter here as `(method, payload)`
    // and receive a Dictionary in response. Whitelist-driven; unknown
    // methods return { error: "unsupported_method" }.
    Dictionary call_bridge(const String &p_method, const Dictionary &p_payload);

    // Loads a cart from a Godot resource path (e.g. "res://carts/00-boot.js"),
    // evaluates it as a module, and caches the init/update/draw exports.
    bool load_cart(const String &p_res_path);

    // Lifecycle hooks — call into the cart's exported init/update/draw if
    // load_cart succeeded; otherwise these are no-ops.
    void cart_init();
    void cart_update(double p_delta);
    void cart_draw();

private:
    JSRuntime *_runtime = nullptr;
    JSContext *_context = nullptr;
    bool _cart_loaded = false;

    void _ensure_runtime();
    void _shutdown_runtime();
    void _install_host_globals();
    void _call_export(const char *p_export_name, double p_arg, bool p_pass_arg);
};

} // namespace godot
