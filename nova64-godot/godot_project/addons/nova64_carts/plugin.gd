@tool
extends EditorPlugin

## Nova64 carts editor plugin.
##
## - Registers the cart importer.
## - Adds `js` to the editor's textfile_extensions so cart code.js files
##   appear in the FileSystem dock and open in the script editor as text.
##
## TODO(syntax highlighting): A previous version of this plugin attempted to
## attach a CodeHighlighter to every TextEditor tab via internal editor APIs
## (walking get_open_script_editors(), get_base_editor(), and assigning
## syntax_highlighter directly). That path is unstable across Godot versions
## and crashed the editor. The standard EditorPlugin.add_syntax_highlighter
## API only attaches to script editors, not plain-text editors, so it does
## nothing for .js files.
##
## Until Godot exposes a stable hook for plain-text-tab highlighting (or we
## build a custom dock for cart editing), edit cart code.js files in VS Code
## — JS highlighting works out of the box, ESLint is configured in
## package.json, and the project has a "Nova64 Dev Server" task.

const CART_IMPORTER := preload("res://addons/nova64_carts/cart_importer.gd")

var _importer: EditorImportPlugin

func _enter_tree() -> void:
	_importer = CART_IMPORTER.new()
	add_import_plugin(_importer)
	_ensure_js_textfile_extension()

func _exit_tree() -> void:
	if _importer:
		remove_import_plugin(_importer)
		_importer = null

# `docks/filesystem/textfile_extensions` is a per-user editor setting, so it
# cannot live in project.godot. Add `js` so cart code.js files show in the
# FileSystem dock and open in the script editor.
func _ensure_js_textfile_extension() -> void:
	var es := EditorInterface.get_editor_settings()
	if es == null:
		return
	var key := "docks/filesystem/textfile_extensions"
	var current_v: Variant = es.get_setting(key) if es.has_setting(key) else ""
	var current := String(current_v)
	var parts := PackedStringArray()
	for p in current.split(",", false):
		var s := String(p).strip_edges()
		if s != "":
			parts.append(s)
	if parts.has("js"):
		return
	parts.append("js")
	es.set_setting(key, ",".join(parts))
	if es.has_method("save"):
		es.call("save")
