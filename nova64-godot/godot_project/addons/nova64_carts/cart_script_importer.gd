@tool
extends EditorImportPlugin

# Imports each cart's `code.js` as a Nova64Cart resource so the script file
# is visible in the FileSystem dock and pickable as a resource. Without this
# Godot treats `.js` as an unknown text file and hides it from many views.

const Nova64Cart := preload("res://addons/nova64_carts/nova64_cart.gd")

func _get_importer_name() -> String: return "nova64.cart_script"
func _get_visible_name() -> String: return "Nova64 Cart Script"
func _get_recognized_extensions() -> PackedStringArray: return PackedStringArray(["js"])
func _get_save_extension() -> String: return "res"
func _get_resource_type() -> String: return "Resource"
func _get_priority() -> float: return 1.0
func _get_import_order() -> int: return 0
func _get_preset_count() -> int: return 1
func _get_preset_name(_idx: int) -> String: return "Default"
func _get_import_options(_path: String, _preset: int) -> Array: return []
func _get_option_visibility(_path: String, _option: StringName, _options: Dictionary) -> bool: return true
func _can_import_threaded() -> bool: return false

func _import(source_file: String, save_path: String, _options: Dictionary,
		_platform_variants: Array, _gen_files: Array) -> int:
	var folder := source_file.get_base_dir()

	# Try to merge in sibling meta.json so the resource displays the same
	# friendly name as the meta-imported counterpart.
	var name := folder.get_file()
	var description := ""
	var author := ""
	var version := ""
	var category := ""
	var meta_path := folder + "/meta.json"
	if FileAccess.file_exists(meta_path):
		var f := FileAccess.open(meta_path, FileAccess.READ)
		if f != null:
			var raw := f.get_as_text()
			f.close()
			var parsed = JSON.parse_string(raw)
			if typeof(parsed) == TYPE_DICTIONARY:
				var meta := parsed as Dictionary
				name        = String(meta.get("name", name))
				description = String(meta.get("description", ""))
				author      = String(meta.get("author", ""))
				version     = String(meta.get("version", ""))
				category    = String(meta.get("category", ""))

	var cart := Nova64Cart.new()
	cart.cart_name   = name
	cart.description = description
	cart.author      = author
	cart.version     = version
	cart.category    = category
	cart.folder_path = folder
	cart.resource_name = name

	var out_path := save_path + "." + _get_save_extension()
	return ResourceSaver.save(cart, out_path)
