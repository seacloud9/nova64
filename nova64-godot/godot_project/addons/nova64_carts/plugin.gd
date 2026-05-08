@tool
extends EditorPlugin

const CART_IMPORTER    := preload("res://addons/nova64_carts/cart_importer.gd")
const JS_HIGHLIGHTER   := preload("res://addons/nova64_carts/js_syntax_highlighter.gd")

var _importer: EditorImportPlugin
var _hl_timer: Timer
# Tracks instance IDs of CodeEdit widgets that already have our highlighter so
# we don't re-allocate on every poll tick.
var _hl_seen: Dictionary  # { int(instance_id) -> true }

func _enter_tree() -> void:
	_importer = CART_IMPORTER.new()
	add_import_plugin(_importer)
	_ensure_js_textfile_extension()

	# --- JS syntax highlighting -------------------------------------------
	# Godot's TextEditor (used for .js textfiles) ignores the global
	# register_syntax_highlighter list — that API only feeds ScriptTextEditor.
	# The reliable path is to walk the ScriptEditor node tree, find every
	# TextEditor (get_class() == "TextEditor"), obtain its CodeEdit via
	# get_base_editor(), and assign a CodeHighlighter instance directly to the
	# syntax_highlighter property via Node.set() to bypass GDScript's static
	# type system.  We run this on a 0.5 s timer so newly opened tabs are
	# caught without per-frame overhead.
	# NOTE: Do NOT call EditorInterface.get_resource_filesystem().scan() here.
	# The editor performs `first_scan_filesystem` on its own during startup;
	# starting another scan in `_enter_tree` produces:
	#   ERROR: Task 'first_scan_filesystem' already exists.
	_hl_seen = {}
	_hl_timer = Timer.new()
	_hl_timer.wait_time = 0.5
	_hl_timer.autostart = true
	add_child(_hl_timer)
	_hl_timer.timeout.connect(_poll_js_highlighter)

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
	if _hl_timer:
		_hl_timer.queue_free()
		_hl_timer = null
	_hl_seen = {}
	if _importer:
		remove_import_plugin(_importer)
		_importer = null

# ---------------------------------------------------------------------------
# JS syntax highlighting — timer-driven walker
# ---------------------------------------------------------------------------

func _poll_js_highlighter() -> void:
	var se := EditorInterface.get_script_editor()
	if se == null:
		return
	_walk_highlight(se)

func _walk_highlight(node: Node) -> void:
	# When we find a TextEditor stop recursing into its own internals.
	if node.get_class() == "TextEditor":
		_apply_js_highlight(node)
		return
	for child in node.get_children():
		_walk_highlight(child)

func _apply_js_highlight(te: Node) -> void:
	# get_base_editor() is bound on ScriptEditorBase (both TextEditor and
	# ScriptTextEditor inherit it) and returns the inner CodeEdit Control.
	var base: Control = te.get_base_editor()
	if base == null:
		return

	var id := base.get_instance_id()

	# Check if this CodeEdit already carries our script as its highlighter.
	var cur = base.get("syntax_highlighter")
	if cur != null and cur.get_script() == JS_HIGHLIGHTER:
		_hl_seen[id] = true  # keep id tracked even if we got here via cleanup
		return

	# Skip if we recently set it and the instance is still alive.
	if _hl_seen.has(id) and is_instance_valid(base):
		return

	# Assign a fresh instance.  Each CodeEdit needs its own SyntaxHighlighter
	# because the highlighter caches per-line state internally.
	base.set("syntax_highlighter", JS_HIGHLIGHTER.new())
	_hl_seen[id] = true
