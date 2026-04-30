# nova64_host.gd
# GDScript glue for the Nova64 host bridge.
#
# Loads a cart at _ready() and ticks it from _process(). The cart path is
# exported so the editor (or another scene) can swap carts without touching
# this script.

extends Node3D

@export_file("*.js") var cart_path: String = "res://carts/04-instances.js"

@onready var host: Nova64Host = $Nova64Host

func _ready() -> void:
	if host == null:
		push_error("Nova64Host node not found under $Nova64Host. Check Main.tscn wiring.")
		return

	var caps: Dictionary = host.get_capabilities()
	print("[nova64] booted host: ", caps)

	if not host.load_cart(cart_path):
		push_error("[nova64] failed to load cart " + cart_path)
		return

	host.cart_init()

func _process(delta: float) -> void:
	if host == null:
		return
	host.cart_update(delta)
	host.cart_draw()
