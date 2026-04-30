extends SceneTree

# Headless conformance runner.
# Usage:
#   godot --headless --path godot_project --script res://scripts/conformance_runner.gd \
#         -- --cart=res://carts/09-errors.js [--frames=10]
#
# Loads the named cart, ticks N frames, then reads `__nova64_assert` from the
# JS global scope and exits with status 0 (all pass) or 1 (any failure).

func _init() -> void:
	var cart_path := "res://carts/09-errors.js"
	var frames := 5
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--cart="):
			cart_path = arg.substr(7)
		elif arg.begins_with("--frames="):
			frames = int(arg.substr(9))

	print("[conformance] cart=", cart_path, " frames=", frames)

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

	for i in range(frames):
		host.cart_update(1.0 / 60.0)
		host.cart_draw()

	var report = host.read_global("__nova64_assert")
	if report == null:
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
