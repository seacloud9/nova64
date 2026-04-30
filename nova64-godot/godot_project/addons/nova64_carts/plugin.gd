@tool
extends EditorPlugin

const CART_IMPORTER := preload("res://addons/nova64_carts/cart_importer.gd")
const JS_HIGHLIGHTER := preload("res://addons/nova64_carts/js_syntax_highlighter.gd")

var _importer: EditorImportPlugin
# JS_HIGHLIGHTER extends CodeHighlighter (a SyntaxHighlighter), not
# EditorSyntaxHighlighter, because Godot's plain TextEditor (used for .js
# textfiles) ignores plugin-registered editor highlighters and we cannot
# call the internal SyntaxHighlighter::set_text_edit() from GDScript.
var _highlighter: CodeHighlighter

func _enter_tree() -> void:
	_importer = CART_IMPORTER.new()
	add_import_plugin(_importer)
	_highlighter = JS_HIGHLIGHTER.new()
	_ensure_js_textfile_extension()
	set_process(true)
	# NOTE: Do NOT call EditorInterface.get_resource_filesystem().scan() here.
	# The editor performs `first_scan_filesystem` on its own during startup;
	# starting another scan in `_enter_tree` produces:
	#   ERROR: Task 'first_scan_filesystem' already exists.
	# Newly registered import plugins are still picked up by that initial scan.

# Godot 4.4's TextEditor (the editor used for plain .js / .json textfiles)
# hardcodes only the built-in plain + standard highlighters in its constructor
# and ignores ScriptEditor::register_syntax_highlighter(). To get JS colouring
# we poll once per frame and assign our highlighter directly to the active
# editor's CodeEdit when the open file ends in `.js`.
func _process(_delta: float) -> void:
	var se := EditorInterface.get_script_editor()
	if se == null:
		return
	var open := se.get_open_script_editors() if se.has_method("get_open_script_editors") else []
	for base in open:
		_apply_to_editor(base)

func _apply_to_editor(base) -> void:
	if base == null:
		return
	if not base.has_method("get_edited_resource") or not base.has_method("get_base_editor"):
		return
	var res = base.get_edited_resource()
	if res == null:
		return
	var path := String(res.resource_path)
	if not path.to_lower().ends_with(".js"):
		return
	var ctrl = base.get_base_editor()
	if ctrl == null or not (ctrl is CodeEdit):
		return
	var ce: CodeEdit = ctrl
	if ce.syntax_highlighter == _highlighter:
		return
	ce.syntax_highlighter = _highlighter

# `docks/filesystem/textfile_extensions` is an *editor* setting (per user),
# so it cannot be set from project.godot. We add `js` here on plugin load
# so cart code.js files appear in the FileSystem dock and open in the
# script editor as plain text. The setting is read by the FileSystem dock
# when it (re)scans, so we trigger a deferred rescan after the editor's own
# first_scan_filesystem has had a chance to run.
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
	# Persist so the change survives the editor session.
	if es.has_method("save"):
		es.call("save")
	# Ask the FileSystem dock to re-scan once the editor's own initial scan
	# is finished, so .js files become visible without a restart.
	call_deferred("_deferred_filesystem_rescan")

func _deferred_filesystem_rescan() -> void:
	var fs := EditorInterface.get_resource_filesystem()
	if fs and not fs.is_scanning():
		fs.scan()

func _exit_tree() -> void:
	set_process(false)
	if _importer:
		remove_import_plugin(_importer)
		_importer = null
	_highlighter = null
