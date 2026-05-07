@tool
extends EditorPlugin

const CART_IMPORTER := preload("res://addons/nova64_carts/cart_importer.gd")

var _importer: EditorImportPlugin

func _enter_tree() -> void:
	_importer = CART_IMPORTER.new()
	add_import_plugin(_importer)
	_ensure_js_textfile_extension()
	# TODO(nova64): Add proper JavaScript syntax highlighting for cart
	# `code.js` files in the Godot script editor. Attempts so far:
	#   1. EditorSyntaxHighlighter via ScriptEditor.register_syntax_highlighter
	#      -> only feeds ScriptTextEditor (GDScript/C#); the plain TextEditor
	#      used for textfiles ignores the registered list.
	#   2. CodeHighlighter assigned directly to base_editor.syntax_highlighter
	#      via per-frame poll -> Godot's textfile editor never exposed a
	#      CodeEdit that accepted set_syntax_highlighter from a GDScript
	#      @tool plugin in our walks.
	# For now `.js` files open as plain white text. Future approaches to try:
	#   - Native GDExtension EditorPlugin in C++ walking ScriptEditor children
	#     and reaching CodeTextEditor::get_text_editor() directly.
	#   - Subclass Godot's TextEditor via a custom create_editor hook.
	#   - File a Godot proposal to expose textfile highlighters to plugins.
	# NOTE: Do NOT call EditorInterface.get_resource_filesystem().scan() here.
	# The editor performs `first_scan_filesystem` on its own during startup;
	# starting another scan in `_enter_tree` produces:
	#   ERROR: Task 'first_scan_filesystem' already exists.

# `docks/filesystem/textfile_extensions` is an *editor* setting (per user),
# so it cannot be set from project.godot. We add `js` here on plugin load
# so cart code.js files appear in the FileSystem dock and open in the
# script editor as plain text.
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
	var joined := ",".join(parts)
	es.set_setting(key, joined)
	if es.has_method("save"):
		es.call("save")
	call_deferred("_deferred_filesystem_rescan")

func _deferred_filesystem_rescan() -> void:
	var fs := EditorInterface.get_resource_filesystem()
	if fs and not fs.is_scanning():
		fs.scan()

func _exit_tree() -> void:
	if _importer:
		remove_import_plugin(_importer)
		_importer = null
