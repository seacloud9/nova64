// register_types.h
// GDExtension entry point declarations for the Nova64 host bridge.

#pragma once

#include <godot_cpp/godot.hpp>

void initialize_nova64_module(godot::ModuleInitializationLevel p_level);
void uninitialize_nova64_module(godot::ModuleInitializationLevel p_level);
