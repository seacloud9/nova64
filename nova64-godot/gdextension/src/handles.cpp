// handles.cpp
// Implementation of the Nova64 Godot host handle table.

#include "handles.h"

#include <godot_cpp/classes/node.hpp>
#include <godot_cpp/variant/utility_functions.hpp>

using namespace godot;

namespace nova64 {

uint32_t HandleTable::put_resource(HandleKind kind, const Ref<RefCounted> &p_res) {
    uint32_t id = _next_id++;
    HandleEntry e;
    e.kind = kind;
    e.resource = p_res;
    _entries.emplace(id, e);
    return id;
}

uint32_t HandleTable::put_node(HandleKind kind, Object *p_node) {
    uint32_t id = _next_id++;
    HandleEntry e;
    e.kind = kind;
    e.node = p_node;
    _entries.emplace(id, e);
    return id;
}

Object *HandleTable::get_node(uint32_t p_id, HandleKind p_expected) const {
    auto it = _entries.find(p_id);
    if (it == _entries.end() || it->second.kind != p_expected) {
        return nullptr;
    }
    return it->second.node;
}

Ref<RefCounted> HandleTable::get_resource(uint32_t p_id, HandleKind p_expected) const {
    auto it = _entries.find(p_id);
    if (it == _entries.end() || it->second.kind != p_expected) {
        return Ref<RefCounted>();
    }
    return it->second.resource;
}

bool HandleTable::destroy(uint32_t p_id, bool p_free_node) {
    auto it = _entries.find(p_id);
    if (it == _entries.end()) {
        return false;
    }
    if (p_free_node && it->second.node) {
        // queue_free is the safe option for nodes already in the scene tree.
        Node *as_node = Object::cast_to<Node>(it->second.node);
        if (as_node) {
            as_node->queue_free();
        }
    }
    _entries.erase(it);
    return true;
}

void HandleTable::clear(bool p_free_nodes) {
    if (p_free_nodes) {
        for (auto &kv : _entries) {
            if (kv.second.node) {
                Node *as_node = Object::cast_to<Node>(kv.second.node);
                if (as_node) {
                    as_node->queue_free();
                }
            }
        }
    }
    _entries.clear();
    _next_id = 1;
}

} // namespace nova64
