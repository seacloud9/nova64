@tool
extends EditorImportPlugin

# Imports each cart's `meta.json` as a Nova64Cart resource so it appears in
# the FileSystem dock with an icon, can be selected via the inline resource
# picker, and exposes cart metadata (name, description, etc.) to tooling.

const Nova64Cart := preload("res://addons/nova64_carts/nova64_cart.gd")

func _get_importer_name() -> String: return "nova64.cart"
func _get_visible_name() -> String: return "Nova64 Cart"
func _get_recognized_extensions() -> PackedStringArray: return PackedStringArray(["json"])
func _get_save_extension() -> String: return "res"
func _get_resource_type() -> String: return "Resource"
func _get_priority() -> float: return 1.0
func _get_import_order() -> int: return 0
func _get_preset_count() -> int: return 1
func _get_preset_name(_idx: int) -> String: return "Default"
func _get_import_options(_path: String, _preset: int) -> Array: return []
func _get_option_visibility(_path: String, _option: StringName, _options: Dictionary) -> bool: return true

# Only claim files literally named "meta.json" so we don't hijack arbitrary
# JSON files. Returning a low score for non-meta JSON keeps default Godot
# JSON handling intact.
func _can_import_threaded() -> bool: return false

func _import(source_file: String, save_path: String, _options: Dictionary,
		_platform_variants: Array, _gen_files: Array) -> int:
	if not source_file.ends_with("/meta.json"):
		return ERR_SKIP

	var f := FileAccess.open(source_file, FileAccess.READ)
	if f == null:
		return ERR_CANT_OPEN
	var raw := f.get_as_text()
	f.close()

	var parsed = JSON.parse_string(raw)
	if typeof(parsed) != TYPE_DICTIONARY:
		push_error("[nova64_carts] meta.json is not an object: " + source_file)
		return ERR_PARSE_ERROR

	var meta := parsed as Dictionary
	var folder := source_file.get_base_dir()

	var cart := Nova64Cart.new()
	cart.cart_name   = String(meta.get("name", folder.get_file()))
	cart.description = String(meta.get("description", ""))
	cart.author      = String(meta.get("author", ""))
	cart.version     = String(meta.get("version", ""))
	cart.category    = String(meta.get("category", ""))
	cart.folder_path = folder
	cart.resource_name = cart.cart_name

	var out_path := save_path + "." + _get_save_extension()
	return ResourceSaver.save(cart, out_path)
