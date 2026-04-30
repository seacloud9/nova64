@tool
extends EditorPlugin

const CART_IMPORTER := preload("res://addons/nova64_carts/cart_importer.gd")

var _importer: EditorImportPlugin

func _enter_tree() -> void:
	_importer = CART_IMPORTER.new()
	add_import_plugin(_importer)
	var fs := EditorInterface.get_resource_filesystem()
	if fs:
		fs.scan()

func _exit_tree() -> void:
	if _importer:
		remove_import_plugin(_importer)
		_importer = null
