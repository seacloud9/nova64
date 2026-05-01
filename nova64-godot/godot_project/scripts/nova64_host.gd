# nova64_host.gd
# GDScript glue for the Nova64 host bridge.
#
# Loads a cart at _ready() and ticks it from _process(). The cart path is
# exported so the editor (or another scene) can swap carts without touching
# this script.
#
# Runtime cart picker:
#   Left / Right       cycle through every cart under res://carts/
#   PageUp / PageDown  same
#   [   ]              same
#   R                  reload current cart (fresh JS runtime)
#   H                  toggle the on-screen overlay
#
# Switching reloads the whole scene so each cart starts from a clean state.
# The selected cart is held in a static var so it survives the reload.

extends Node3D

@export_dir var cart_path: String = "res://carts/demoscene"
# Optional: pick a meta.json (imported as Nova64Cart) instead of typing a path.
@export var cart_resource: Resource

# Persists across scene reloads so the cart picker survives a reload.
static var _selected_cart_path: String = ""

@onready var host: Nova64Host = $Nova64Host

var _cart_list: PackedStringArray = PackedStringArray()
var _cart_index: int = 0
var _overlay: CanvasLayer
var _overlay_label: Label
var _overlay_visible: bool = true

func _resolve_cart_path() -> String:
	if _selected_cart_path != "":
		return _selected_cart_path
	if cart_resource != null and cart_resource.has_method("get") and cart_resource.get("folder_path") != null:
		var p := String(cart_resource.get("folder_path"))
		if p != "":
			return p
	return cart_path

func _scan_carts() -> void:
	_cart_list = PackedStringArray()
	var dir := DirAccess.open("res://carts")
	if dir == null:
		return
	dir.list_dir_begin()
	var name := dir.get_next()
	while name != "":
		if dir.current_is_dir() and not name.begins_with("."):
			if FileAccess.file_exists("res://carts/" + name + "/code.js"):
				_cart_list.append(name)
		name = dir.get_next()
	dir.list_dir_end()
	_cart_list.sort()

func _ready() -> void:
	if host == null:
		push_error("Nova64Host node not found under $Nova64Host. Check Main.tscn wiring.")
		return

	_scan_carts()

	var path := _resolve_cart_path()
	# Snap to a real cart if the persisted choice no longer exists on disk.
	var cart_name := path.trim_suffix("/").get_file()
	var found_idx := _cart_list.find(cart_name)
	_cart_index = max(found_idx, 0)
	if _cart_list.size() > 0:
		path = "res://carts/" + _cart_list[_cart_index]
	_selected_cart_path = path

	_build_overlay()
	_refresh_overlay()

	var caps: Dictionary = host.get_capabilities()
	print("[nova64] booted host: ", caps)
	print("[nova64] cart picker ready (", _cart_list.size(), " carts) — Left/Right switch, R reload, H toggle overlay")

	if not host.load_cart(path):
		push_error("[nova64] failed to load cart " + path)
		return

	host.cart_init()

func _process(delta: float) -> void:
	if host == null:
		return
	host.cart_update(delta)
	host.cart_draw()

func _unhandled_input(event: InputEvent) -> void:
	if not (event is InputEventKey) or not event.pressed or event.echo:
		return
	var k := event as InputEventKey
	match k.keycode:
		KEY_RIGHT, KEY_PAGEDOWN, KEY_BRACKETRIGHT:
			_switch_cart(1)
		KEY_LEFT, KEY_PAGEUP, KEY_BRACKETLEFT:
			_switch_cart(-1)
		KEY_R:
			_reload_scene()
		KEY_H:
			_overlay_visible = not _overlay_visible
			if _overlay != null:
				_overlay.visible = _overlay_visible

func _switch_cart(delta_idx: int) -> void:
	if _cart_list.is_empty():
		return
	_cart_index = (_cart_index + delta_idx + _cart_list.size()) % _cart_list.size()
	_selected_cart_path = "res://carts/" + _cart_list[_cart_index]
	_reload_scene()

func _reload_scene() -> void:
	get_tree().reload_current_scene()

# ------------------------------------------------------------------ overlay --

func _build_overlay() -> void:
	_overlay = CanvasLayer.new()
	_overlay.layer = 100
	add_child(_overlay)

	var panel := PanelContainer.new()
	panel.position = Vector2(12, 12)
	panel.modulate = Color(1, 1, 1, 0.92)
	_overlay.add_child(panel)

	_overlay_label = Label.new()
	_overlay_label.add_theme_color_override("font_color", Color(1, 1, 1))
	_overlay_label.add_theme_color_override("font_outline_color", Color(0, 0, 0))
	_overlay_label.add_theme_constant_override("outline_size", 4)
	panel.add_child(_overlay_label)

func _refresh_overlay() -> void:
	if _overlay_label == null:
		return
	var current := "(none)"
	if _cart_list.size() > 0:
		current = _cart_list[_cart_index]
	var lines: Array[String] = []
	lines.append("Nova64 — cart %d / %d:  %s" % [_cart_index + 1, _cart_list.size(), current])
	lines.append("< > switch   R reload   H hide overlay")
	if _cart_list.size() > 1:
		lines.append("")
		var span := 3
		for i in range(-span, span + 1):
			var idx := (_cart_index + i + _cart_list.size()) % _cart_list.size()
			var marker := "> " if i == 0 else "  "
			lines.append("%s%s" % [marker, _cart_list[idx]])
	_overlay_label.text = "\n".join(lines)
