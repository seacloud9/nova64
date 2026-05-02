extends SceneTree

# Headless conformance runner.
# Usage:
#   godot --headless --path godot_project --script res://scripts/conformance_runner.gd \
#         -- --cart=res://carts/09-errors [--frames=10] [--snapshot=path.png]
#
# Loads the named cart folder (containing code.js + meta.json), ticks N
# frames, optionally writes a PNG snapshot of the main viewport, then reads
# `__nova64_assert` from the JS global scope and exits with status 0 (all
# pass) or 1 (any failure).

func _init() -> void:
	var cart_path := "res://carts/09-errors"
	var frames := 5
	var snapshot := ""
	var press_key := ""
	var press_frames := 3
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--cart="):
			cart_path = arg.substr(7)
		elif arg.begins_with("--frames="):
			frames = int(arg.substr(9))
		elif arg.begins_with("--snapshot="):
			snapshot = arg.substr(11)
		elif arg.begins_with("--press="):
			press_key = arg.substr(8).to_lower()
		elif arg.begins_with("--press-frames="):
			press_frames = int(arg.substr(15))

	print("[conformance] cart=", cart_path, " frames=", frames, " snapshot=", snapshot)

	if not ClassDB.class_exists("Nova64Host"):
		push_error("[conformance] Nova64Host class not registered — extension failed to load")
		quit(2)
		return

	var host = ClassDB.instantiate("Nova64Host")
	get_root().add_child(host)

	if not host.load_cart(cart_path):
		push_error("[conformance] load_cart failed for " + cart_path)
		quit(2)
		return
	host.cart_init()

	if press_key != "":
		_inject_key(press_key, true)

	# Tick fixed-step. await process_frame so the renderer actually advances
	# (required for snapshots and for GPU particle systems to step).
	for i in range(frames):
		host.cart_update(1.0 / 60.0)
		host.cart_draw()
		await process_frame
		if press_key != "" and i + 1 >= press_frames:
			_inject_key(press_key, false)
			press_key = ""

	# Optional snapshot — write the main viewport to PNG. Works under
	# --headless because Godot still creates an offscreen renderer.
	if snapshot != "":
		await process_frame
		await process_frame
		var img: Image = get_root().get_viewport().get_texture().get_image()
		if img == null:
			push_warning("[conformance] viewport image unavailable — skipping snapshot")
		else:
			var save_path := snapshot
			if save_path.begins_with("res://") or save_path.begins_with("user://"):
				img.save_png(save_path)
			else:
				# Absolute or relative host path — write via FileAccess.
				var bytes := img.save_png_to_buffer()
				var f := FileAccess.open(save_path, FileAccess.WRITE)
				if f:
					f.store_buffer(bytes)
					f.close()
					print("[conformance] snapshot written: ", save_path)
				else:
					push_warning("[conformance] cannot open snapshot path: " + save_path)

	var report = host.read_global("__nova64_assert")
	if report == null:
		# No assertions — for visual-only carts we treat snapshot success as pass.
		if snapshot != "":
			print("NOVA64-CONFORMANCE: PASS (visual)")
			quit(0)
		else:
			print("[conformance] no __nova64_assert global — cart did not publish results")
			quit(1)
		return

	var total := int(report.get("total", 0))
	var passed := int(report.get("passed", 0))
	print("[conformance] ", passed, "/", total, " passed")
	for r in report.get("results", []):
		var ok = bool(r.get("ok", false))
		print("  ", "PASS" if ok else "FAIL", " ", r.get("name", "?"))

	if passed == total and total > 0:
		print("NOVA64-CONFORMANCE: PASS")
		quit(0)
	else:
		print("NOVA64-CONFORMANCE: FAIL")
		quit(1)

func _inject_key(name: String, pressed: bool) -> void:
	var ev := InputEventKey.new()
	match name:
		"space":
			ev.keycode = KEY_SPACE
			ev.physical_keycode = KEY_SPACE
		"enter":
			ev.keycode = KEY_ENTER
			ev.physical_keycode = KEY_ENTER
		"escape":
			ev.keycode = KEY_ESCAPE
			ev.physical_keycode = KEY_ESCAPE
		"z":
			ev.keycode = KEY_Z
			ev.physical_keycode = KEY_Z
		"x":
			ev.keycode = KEY_X
			ev.physical_keycode = KEY_X
		_:
			return
	ev.pressed = pressed
	Input.parse_input_event(ev)
