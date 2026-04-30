// bridge.h
// Nova64Host — QuickJS-backed host bridge for the Nova64 Godot adapter.
//
// At G1 the host:
//   - Loads carts as ES modules and resolves init/update/draw via the
//     module namespace object (no globalThis pollution required).
//   - Owns a handle table for materials, geometries, mesh instances,
//     cameras, and lights.
//   - Implements the first batch of adapter commands: material/geometry/
//     mesh/transform/camera namespaces.
//   - Drives the cart's update/draw lifecycle from Godot's _process.

#pragma once

#include <godot_cpp/classes/node.hpp>
#include <godot_cpp/classes/node3d.hpp>
#include <godot_cpp/variant/dictionary.hpp>
#include <godot_cpp/variant/string.hpp>

#include <memory>

// quickjs.h defines JSValue as either a struct, a uint64_t, or a pointer
// depending on build flags, so a clean forward declaration isn't portable.
// Include it directly here; it's a self-contained C header.
#include "quickjs.h"

namespace nova64 {
class HandleTable;
}

namespace godot {

class Nova64Host : public Node3D {
    GDCLASS(Nova64Host, Node3D)

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

    // Loads a cart as an ES module from a Godot resource path
    // (e.g. "res://carts/01-cube.js"), evaluates it, and caches the
    // init/update/draw exports from the module namespace object.
    bool load_cart(const String &p_res_path);

    // Lifecycle hooks — call into the cart's exported init/update/draw if
    // load_cart succeeded.
    void cart_init();
    void cart_update(double p_delta);
    void cart_draw();

private:
    JSRuntime *_runtime = nullptr;
    JSContext *_context = nullptr;
    bool _cart_loaded = false;

    // Cached cart export functions. Initialized to JS_UNDEFINED in the
    // constructor; populated by load_cart() and released in
    // _release_cart_exports().
    JSValue _cart_init_fn;
    JSValue _cart_update_fn;
    JSValue _cart_draw_fn;

    std::unique_ptr<nova64::HandleTable> _handles;

    void _ensure_runtime();
    void _shutdown_runtime();
    void _install_host_globals();
    void _release_cart_exports();
    void _call_cart_fn(JSValue p_fn, double p_arg, bool p_pass_arg, const char *p_name);

    // ---- Command handlers (one per adapter namespace) -------------------
    Dictionary _cmd_material_create(const Dictionary &p_payload);
    Dictionary _cmd_material_destroy(const Dictionary &p_payload);
    Dictionary _cmd_geometry_create_box(const Dictionary &p_payload);
    Dictionary _cmd_geometry_create_sphere(const Dictionary &p_payload);
    Dictionary _cmd_geometry_create_plane(const Dictionary &p_payload);
    Dictionary _cmd_mesh_create(const Dictionary &p_payload);
    Dictionary _cmd_mesh_set_material(const Dictionary &p_payload);
    Dictionary _cmd_mesh_destroy(const Dictionary &p_payload);
    Dictionary _cmd_transform_set(const Dictionary &p_payload);
    Dictionary _cmd_camera_create(const Dictionary &p_payload);
    Dictionary _cmd_camera_set_active(const Dictionary &p_payload);
    Dictionary _cmd_light_create_directional(const Dictionary &p_payload);
    Dictionary _cmd_input_poll(const Dictionary &p_payload);
    Dictionary _cmd_texture_create_from_image(const Dictionary &p_payload);
    Dictionary _cmd_texture_destroy(const Dictionary &p_payload);
    Dictionary _cmd_audio_load_stream(const Dictionary &p_payload);
    Dictionary _cmd_audio_play(const Dictionary &p_payload);
    Dictionary _cmd_audio_stop(const Dictionary &p_payload);
    Dictionary _cmd_mesh_create_instanced(const Dictionary &p_payload);
    Dictionary _cmd_instance_set_transform(const Dictionary &p_payload);
    Dictionary _cmd_particles_create(const Dictionary &p_payload);
    Dictionary _cmd_particles_destroy(const Dictionary &p_payload);

    // Helpers
    Node3D *_resolve_node3d(uint32_t p_handle_id) const;
};

} // namespace godot
