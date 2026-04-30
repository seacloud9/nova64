// handles.h
// Resource handle table for the Nova64 Godot host bridge.
//
// Carts never see raw Godot pointers. They receive opaque integer handles
// that the host resolves to typed Godot objects. Each handle carries a
// `kind` tag so the bridge can validate that a cart isn't, for example,
// passing a material handle where a mesh is expected.
//
// Handle ids are monotonic 32-bit integers starting at 1. Id 0 is reserved
// for "invalid handle". Recycling ids is intentionally avoided so a stale
// reference in cart code surfaces as an error instead of silently aliasing
// onto a reused slot.

#pragma once

#include <godot_cpp/classes/object.hpp>
#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/variant/dictionary.hpp>

#include <cstdint>
#include <unordered_map>

namespace nova64 {

enum class HandleKind : uint8_t {
    INVALID = 0,
    MATERIAL = 1,   // godot::StandardMaterial3D (Ref-counted Resource)
    GEOMETRY = 2,   // godot::Mesh subclass (Ref-counted Resource)
    MESH_INSTANCE = 3, // godot::MeshInstance3D (Node3D in scene tree)
    CAMERA = 4,     // godot::Camera3D (Node3D in scene tree)
    LIGHT = 5,      // godot::Light3D subclass (Node3D in scene tree)
};

struct HandleEntry {
    HandleKind kind = HandleKind::INVALID;

    // Exactly one of these is populated per kind:
    //   - resource: for MATERIAL and GEOMETRY (Ref-counted resources).
    //   - node:     for MESH_INSTANCE, CAMERA, LIGHT (scene-tree nodes).
    godot::Ref<godot::RefCounted> resource;
    godot::Object *node = nullptr;
};

class HandleTable {
public:
    HandleTable() = default;

    // Register a Ref-counted resource. Returns the new handle id.
    uint32_t put_resource(HandleKind kind, const godot::Ref<godot::RefCounted> &p_res);

    // Register a scene-tree node. Returns the new handle id. The node's
    // lifetime is owned by its parent in the Godot scene tree; the table
    // only holds a non-owning pointer.
    uint32_t put_node(HandleKind kind, godot::Object *p_node);

    // Look up a handle, validating its kind. Returns nullptr/empty Ref on
    // mismatch.
    godot::Object *get_node(uint32_t p_id, HandleKind p_expected) const;
    godot::Ref<godot::RefCounted> get_resource(uint32_t p_id, HandleKind p_expected) const;

    // Drop a handle. Resources are released; nodes are queue_free'd if the
    // caller passes p_free_node = true.
    bool destroy(uint32_t p_id, bool p_free_node);

    // Clear everything (used on cart reset / runtime shutdown).
    void clear(bool p_free_nodes);

    size_t size() const { return _entries.size(); }

private:
    uint32_t _next_id = 1;
    std::unordered_map<uint32_t, HandleEntry> _entries;
};

} // namespace nova64
