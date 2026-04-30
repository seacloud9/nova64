@tool
extends EditorPlugin

const CART_IMPORTER := preload("res://addons/nova64_carts/cart_importer.gd")
const JS_HIGHLIGHTER := preload("res://addons/nova64_carts/js_syntax_highlighter.gd")

var _importer: EditorImportPlugin
var _highlighter: EditorSyntaxHighlighter

func _enter_tree() -> void:
	_importer = CART_IMPORTER.new()
	add_import_plugin(_importer)
	_highlighter = JS_HIGHLIGHTER.new()
	add_syntax_highlighter(_highlighter)
	var fs := EditorInterface.get_resource_filesystem()
	if fs:
		fs.scan()

func _exit_tree() -> void:
	if _importer:
		remove_import_plugin(_importer)
		_importer = null
	if _highlighter:
		remove_syntax_highlighter(_highlighter)
		_highlighter = null
