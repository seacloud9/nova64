@tool
extends EditorPlugin

const CART_IMPORTER := preload("res://addons/nova64_carts/cart_importer.gd")
const CART_SCRIPT_IMPORTER := preload("res://addons/nova64_carts/cart_script_importer.gd")

var _importer: EditorImportPlugin
var _script_importer: EditorImportPlugin

func _enter_tree() -> void:
	_importer = CART_IMPORTER.new()
	add_import_plugin(_importer)
	_script_importer = CART_SCRIPT_IMPORTER.new()
	add_import_plugin(_script_importer)
	var fs := EditorInterface.get_resource_filesystem()
	if fs:
		fs.scan()

func _exit_tree() -> void:
	if _importer:
		remove_import_plugin(_importer)
		_importer = null
	if _script_importer:
		remove_import_plugin(_script_importer)
		_script_importer = null
