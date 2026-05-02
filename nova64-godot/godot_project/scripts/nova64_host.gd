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
var _overlay_picker: OptionButton
var _overlay_visible: bool = true
# Suppress reload when we set the OptionButton index programmatically.
var _suppress_picker_signal: bool = false

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
	print("[nova64] cart picker ready (", _cart_list.size(), " carts) — use the dropdown to switch, F2 reload, F3 toggle overlay")

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
	# Cart cycling via arrow keys / [ ] / PageUp/Down was removed so cart
	# code can use those keys for gameplay (F-Zero steering, Space Harrier
	# strafing, etc). Cart switching is exclusively the OptionButton's
	# job now. F2 reloads, F3 toggles the overlay — chosen because no
	# Nova64 cart binds them.
	match k.keycode:
		KEY_F2:
			_reload_scene()
		KEY_F3:
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

# Modeled after console.html's `<select id="cart">` dropdown — gives a one-click
# cart picker that doesn't collide with cart input. The OptionButton only
# captures keyboard focus while its popup is open; once a cart is chosen we
# release focus so WASD / arrow keys go back to the cart.
func _build_overlay() -> void:
	_overlay = CanvasLayer.new()
	_overlay.layer = 100
	add_child(_overlay)

	var panel := PanelContainer.new()
	panel.position = Vector2(12, 12)
	panel.modulate = Color(1, 1, 1, 0.95)
	# Don't let UI steal mouse from a fullscreen cart unless the user actually
	# clicks the dropdown / its popup.
	panel.mouse_filter = Control.MOUSE_FILTER_PASS
	_overlay.add_child(panel)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 6)
	vbox.mouse_filter = Control.MOUSE_FILTER_PASS
	panel.add_child(vbox)

	# Header line — title + index/count + key hints.
	_overlay_label = Label.new()
	_overlay_label.add_theme_color_override("font_color", Color(1, 1, 1))
	_overlay_label.add_theme_color_override("font_outline_color", Color(0, 0, 0))
	_overlay_label.add_theme_constant_override("outline_size", 4)
	_overlay_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vbox.add_child(_overlay_label)

	# The cart picker dropdown — the actual <select> equivalent.
	_overlay_picker = OptionButton.new()
	_overlay_picker.custom_minimum_size = Vector2(280, 0)
	_overlay_picker.fit_to_longest_item = false
	_overlay_picker.tooltip_text = "Cartridge — pick to load (F2 reloads, F3 hides this overlay)"
	for cart_name in _cart_list:
		_overlay_picker.add_item(cart_name)
	if _cart_list.size() > 0:
		_overlay_picker.select(_cart_index)
	_overlay_picker.item_selected.connect(_on_picker_selected)
	vbox.add_child(_overlay_picker)

func _on_picker_selected(idx: int) -> void:
	if _suppress_picker_signal:
		return
	if idx < 0 or idx >= _cart_list.size() or idx == _cart_index:
		# Release focus so WASD goes back to the cart.
		if _overlay_picker != null:
			_overlay_picker.release_focus()
		return
	_cart_index = idx
	_selected_cart_path = "res://carts/" + _cart_list[_cart_index]
	if _overlay_picker != null:
		_overlay_picker.release_focus()
	_reload_scene()

func _refresh_overlay() -> void:
	if _overlay_label == null:
		return
	var current := "(none)"
	if _cart_list.size() > 0:
		current = _cart_list[_cart_index]
	_overlay_label.text = "NOVA64  —  cart %d / %d:  %s\nDropdown: switch    F2: reload    F3: hide overlay" % [
		_cart_index + 1, _cart_list.size(), current
	]
	if _overlay_picker != null and _cart_list.size() > 0:
		_suppress_picker_signal = true
		_overlay_picker.select(_cart_index)
		_suppress_picker_signal = false
