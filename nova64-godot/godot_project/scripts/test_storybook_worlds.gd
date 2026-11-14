extends SceneTree

# Actual host input/lifecycle check. Draw only at checkpoints to keep this
# movement test independent of the CPU reference renderer's frame rate.
func key(code: int, pressed: bool) -> void:
	var event := InputEventKey.new()
	event.keycode = code
	event.physical_keycode = code
	event.pressed = pressed
	Input.parse_input_event(event)
	Input.flush_buffered_events()

func _init() -> void:
	var cart := "res://carts/storybook-worlds"
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--cart="):
			cart = arg.substr(7)
	await process_frame
	var host = ClassDB.instantiate("Nova64Host")
	get_root().add_child(host)
	if not host.load_cart(cart):
		quit(1)
		return
	host.cart_init()
	key(KEY_W, true)
	for i in range(200):
		host.cart_update(1.0 / 60.0)
	key(KEY_W, false)
	var arrived: Dictionary = host.read_global("__storybookSnapshot")
	if arrived.get("world", -1) != 1:
		push_error("Failed to walk through the portal: " + str(arrived))
		quit(1)
		return
	host.cart_draw()
	key(KEY_S, true)
	for i in range(200):
		host.cart_update(1.0 / 60.0)
	key(KEY_S, false)
	var returned: Dictionary = host.read_global("__storybookSnapshot")
	if returned.get("world", -1) != 0:
		push_error("Failed to return through the portal: " + str(returned))
		quit(1)
		return
	key(KEY_2, true)
	host.cart_update(1.0 / 60.0)
	key(KEY_2, false)
	var garden: Dictionary = host.read_global("__storybookSnapshot")
	if garden.get("world", -1) != 1:
		push_error("Garden selection failed")
		quit(1)
		return
	host.call_bridge("splatWorlds.destroy", {})
	host.cart_init()
	host.cart_update(1.0 / 60.0)
	var reset: Dictionary = host.read_global("__storybookSnapshot")
	if reset.get("world", -1) != 0:
		push_error("Reset did not return to grove")
		quit(1)
		return
	host.cart_draw()
	await process_frame
	print("STORYBOOK_HOST: PASS ", JSON.stringify({"arrival": arrived, "returned": returned, "reset": reset}))
	host.free()
	await process_frame
	quit(0)
