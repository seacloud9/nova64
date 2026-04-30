# nova64_host.gd
# GDScript glue for the Nova64 host bridge.
# Wires the engine-side Nova64Host node into Godot's _process / _ready
# lifecycle so cart code (loaded via QuickJS) runs in lockstep with the
# renderer.

extends Node

const BOOT_CART := "res://carts/00-boot.js"

@onready var host: Nova64Host = $Nova64Host

func _ready() -> void:
	if host == null:
		push_error("Nova64Host node not found under $Nova64Host. Check Main.tscn wiring.")
		return

	var caps: Dictionary = host.get_capabilities()
	print("[nova64] booted host: ", caps)

	# Sanity check — confirm the bridge round-trips through call_bridge().
	var probe: Dictionary = host.call_bridge("host.getCapabilities", {})
	print("[nova64] call_bridge probe: ", probe)

	if not host.load_cart(BOOT_CART):
		push_error("[nova64] failed to load boot cart " + BOOT_CART)
		return

	host.cart_init()

func _process(delta: float) -> void:
	if host == null:
		return
	host.cart_update(delta)
	host.cart_draw()
