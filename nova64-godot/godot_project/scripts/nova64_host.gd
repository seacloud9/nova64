# nova64_host.gd
# GDScript glue for the Nova64 host bridge.
#
# Loads a cart at _ready() and ticks it from _process(). The cart path is
# exported so the editor (or another scene) can swap carts without touching
# this script.

extends Node3D

@export_dir var cart_path: String = "res://carts/05-particles"
# Optional: pick a meta.json (imported as Nova64Cart) instead of typing a path.
@export var cart_resource: Resource

@onready var host: Nova64Host = $Nova64Host

func _resolve_cart_path() -> String:
	if cart_resource != null and cart_resource.has_method("get") and cart_resource.get("folder_path") != null:
		var p := String(cart_resource.get("folder_path"))
		if p != "":
			return p
	return cart_path

func _ready() -> void:
	if host == null:
		push_error("Nova64Host node not found under $Nova64Host. Check Main.tscn wiring.")
		return

	var caps: Dictionary = host.get_capabilities()
	print("[nova64] booted host: ", caps)

	var path := _resolve_cart_path()
	if not host.load_cart(path):
		push_error("[nova64] failed to load cart " + path)
		return

	host.cart_init()

func _process(delta: float) -> void:
	if host == null:
		return
	host.cart_update(delta)
	host.cart_draw()
