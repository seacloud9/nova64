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

    // Conformance harness hook: read a JS global by name and convert it to a
    // Godot Variant. Returns null Variant if the global is undefined.
    Variant read_global(const String &p_name);

    // Returns rolling perf stats for the last N frames (default 60).
    // Keys: avg_update_us, max_update_us, avg_draw_us, max_draw_us,
    //       avg_frame_us, max_frame_us, frame_count.
    // Used by `bench:godot`, `pnpm test:godot:*`, and the on-device
    // `scripts/measure-android.sh` capture (which greps logcat for the
    // [nova64-perf] line emitted every 60 frames).
    Dictionary get_perf_stats() const;

private:
    JSRuntime *_runtime = nullptr;
    JSContext *_context = nullptr;
    bool _cart_loaded = false;

    // Rolling perf telemetry. Microseconds. Updated every cart_update +
    // cart_draw pair. Emitted to logs every 60 frames.
    static constexpr int PERF_WINDOW = 60;
    uint64_t _perf_update_us[PERF_WINDOW] = {};
    uint64_t _perf_draw_us[PERF_WINDOW] = {};
    int _perf_index = 0;
    uint64_t _perf_frame_count = 0;

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
    void _load_compat_shim();
    bool _shim_loaded = false;
    void _release_cart_exports();
    void _call_cart_fn(JSValue p_fn, double p_arg, bool p_pass_arg, const char *p_name);
    void _record_perf_sample(uint64_t p_update_us, uint64_t p_draw_us);

    // Lazily creates a WorldEnvironment under this node with a tasteful
    // default Environment (sky, glow, ambient, tonemap, mild SSAO). Carts
    // tune this via `env.set`. Returns the Environment for direct mutation.
    class Environment *_ensure_environment();
    class WorldEnvironment *_world_env = nullptr;

    // Lazily creates a CanvasLayer + Control above the 3D scene that the
    // cart's 2D draw API (print, rect, line, circle, pset, text)
    // rasterises into via RenderingServer canvas_item commands. The Control
    // is sized to the design resolution (640x360 logical units, scaled to
    // viewport). Cleared at the top of each cart_draw() so the cart always
    // sees a blank overlay.
    void _ensure_overlay();
    void _overlay_clear();
    class CanvasLayer *_overlay_layer = nullptr;
    class Control *_overlay = nullptr;

    // ---- Command handlers (one per adapter namespace) -------------------
    Dictionary _cmd_material_create(const Dictionary &p_payload);
    Dictionary _cmd_material_destroy(const Dictionary &p_payload);
    Dictionary _cmd_geometry_create_box(const Dictionary &p_payload);
    Dictionary _cmd_geometry_create_sphere(const Dictionary &p_payload);
    Dictionary _cmd_geometry_create_plane(const Dictionary &p_payload);
    Dictionary _cmd_geometry_create_cylinder(const Dictionary &p_payload);
    Dictionary _cmd_geometry_create_cone(const Dictionary &p_payload);
    Dictionary _cmd_geometry_create_torus(const Dictionary &p_payload);
    Dictionary _cmd_mesh_create(const Dictionary &p_payload);
    Dictionary _cmd_mesh_set_material(const Dictionary &p_payload);
    Dictionary _cmd_mesh_destroy(const Dictionary &p_payload);
    Dictionary _cmd_transform_set(const Dictionary &p_payload);
    Dictionary _cmd_camera_create(const Dictionary &p_payload);
    Dictionary _cmd_camera_set_active(const Dictionary &p_payload);
    Dictionary _cmd_camera_set_params(const Dictionary &p_payload);
    Dictionary _cmd_light_create_directional(const Dictionary &p_payload);
    Dictionary _cmd_light_create_point(const Dictionary &p_payload);
    Dictionary _cmd_light_create_spot(const Dictionary &p_payload);
    Dictionary _cmd_light_set_color(const Dictionary &p_payload);
    Dictionary _cmd_light_set_energy(const Dictionary &p_payload);
    Dictionary _cmd_env_set(const Dictionary &p_payload);
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
    Dictionary _cmd_voxel_upload_chunk(const Dictionary &p_payload);

    // 2D overlay (cart-side draw API: print/rect/line/circle/pset/text).
    Dictionary _cmd_overlay_cls(const Dictionary &p_payload);
    Dictionary _cmd_overlay_pset(const Dictionary &p_payload);
    Dictionary _cmd_overlay_rect(const Dictionary &p_payload);
    Dictionary _cmd_overlay_line(const Dictionary &p_payload);
    Dictionary _cmd_overlay_circle(const Dictionary &p_payload);
    Dictionary _cmd_overlay_text(const Dictionary &p_payload);
    Dictionary _cmd_overlay_batch(const Dictionary &p_payload);
    // Inline op handlers used by the batch dispatcher; each takes a small
    // Array (op tag at index 0) instead of a Dictionary so the shim can
    // queue ops with minimal allocator pressure per primitive.
    void _overlay_op_cls(const Array &op);
    void _overlay_op_pset(const Array &op);
    void _overlay_op_rect(const Array &op);
    void _overlay_op_line(const Array &op);
    void _overlay_op_circle(const Array &op);
    void _overlay_op_text(const Array &op);
    void _overlay_op_gradient(const Array &op);
    void _overlay_op_triangle(const Array &op);

    // Helpers
    Node3D *_resolve_node3d(uint32_t p_handle_id) const;
};

} // namespace godot
