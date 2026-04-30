@tool
class_name Nova64Cart
extends Resource

# Lightweight resource that anchors a Nova64 cart folder in Godot's
# resource graph. Imported from the cart's `meta.json` sidecar by
# `nova64_carts/cart_importer.gd`.

@export var cart_name: String = ""
@export var description: String = ""
@export var author: String = ""
@export var version: String = ""
@export var category: String = ""

# Absolute res:// path of the cart folder, e.g. "res://carts/05-particles".
@export var folder_path: String = ""
