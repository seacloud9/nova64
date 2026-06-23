# nova_text.gd — NovaText
#
# Native on-screen text input for carts on Godot, where there is no DOM. Owns a
# LineEdit docked full-width to the bottom of the screen (mirrors the web chat
# bar), and the C++ host forwards every `text.*` bridge method here. The cart
# (e.g. the metaverse chat plugin) mounts it once and polls each frame for
# submitted lines + focus state — focus is surfaced so the cart can suppress
# movement while the player is typing.

extends Node
class_name NovaText

var _layer: CanvasLayer = null
var _edit: LineEdit = null
var _lines: Array = []      # submitted lines, drained by text.poll
var _focused: bool = false

func call_text(method: String, payload: Dictionary) -> Dictionary:
	match method:
		"text.mount":
			return _mount(payload)
		"text.poll":
			return _poll()
		"text.focus":
			if _edit != null:
				_edit.grab_focus()
			return {"ok": true}
		"text.status":
			return {"focused": _focused, "mounted": _edit != null}
	return {"error": "unsupported_text_method", "method": method}

func _mount(payload: Dictionary) -> Dictionary:
	if _edit != null:
		if payload.has("placeholder"):
			_edit.placeholder_text = String(payload["placeholder"])
		return {"ok": true}

	_layer = CanvasLayer.new()
	_layer.layer = 128 # above the cart's 2D overlay
	add_child(_layer)

	_edit = LineEdit.new()
	_edit.placeholder_text = String(payload.get("placeholder", "Press Enter to chat…"))
	_edit.max_length = int(payload.get("maxLen", 160))
	_edit.context_menu_enabled = false
	# Dock full-width to the bottom edge.
	_edit.anchor_left = 0.0
	_edit.anchor_right = 1.0
	_edit.anchor_top = 1.0
	_edit.anchor_bottom = 1.0
	_edit.offset_left = 0
	_edit.offset_right = 0
	_edit.offset_top = -34
	_edit.offset_bottom = 0
	# Readable dark bar.
	_edit.add_theme_color_override("font_color", Color(0.87, 0.89, 1.0))
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0.043, 0.063, 0.125, 0.82)
	bg.border_color = Color(0.16, 0.21, 0.31)
	bg.border_width_top = 1
	bg.content_margin_left = 10
	bg.content_margin_top = 6
	bg.content_margin_bottom = 6
	_edit.add_theme_stylebox_override("normal", bg)
	_edit.add_theme_stylebox_override("focus", bg)

	_edit.text_submitted.connect(_on_submitted)
	_edit.focus_entered.connect(func(): _focused = true)
	_edit.focus_exited.connect(func(): _focused = false)
	_layer.add_child(_edit)
	return {"ok": true}

func _on_submitted(t: String) -> void:
	var s := t.strip_edges()
	if s != "":
		_lines.append(s)
	if _edit != null:
		_edit.text = ""
		# Release focus so the player returns to movement. Unlike a web page, a
		# click on the 3D view does NOT blur a Godot LineEdit, so without this the
		# input keeps focus and movement stays suppressed (looks like it hangs).
		_edit.release_focus()

# Escape also returns focus to the game.
func _input(event: InputEvent) -> void:
	if _edit != null and _edit.has_focus() and event is InputEventKey:
		var k := event as InputEventKey
		if k.pressed and k.keycode == KEY_ESCAPE:
			_edit.release_focus()
			get_viewport().set_input_as_handled()

func _poll() -> Dictionary:
	if _lines.is_empty():
		return {"lines": [], "focused": _focused}
	var out := _lines
	_lines = []
	return {"lines": out, "focused": _focused}
