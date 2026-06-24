extends SceneTree

# Headless test for the multi-touch bridge (set_touches → input.poll round-trip).
# Verifies the C++ pass-through that backs nova64.input.touches() on Godot.
# Usage:
#   godot --headless --path godot_project --script res://scripts/test_touch.gd

func _init() -> void:
	if not ClassDB.class_exists("Nova64Host"):
		push_error("[touch] Nova64Host not registered — extension failed to load")
		quit(2)
		return

	var host = ClassDB.instantiate("Nova64Host")
	get_root().add_child(host)

	# Empty by default.
	var r0: Dictionary = host.call_bridge("input.poll", {})
	_assert(r0.has("touches"), "input.poll exposes a touches field")
	_assert((r0["touches"] as Array).is_empty(), "touches starts empty")

	# Push a two-finger set (left joystick zone + right look zone).
	host.set_touches([
		{ "id": 0, "x": 100.0, "y": 280.0 },
		{ "id": 1, "x": 500.0, "y": 160.0 },
	])
	var r1: Dictionary = host.call_bridge("input.poll", {})
	var ts: Array = r1["touches"]
	_assert(ts.size() == 2, "two touches echoed")
	_assert(int(ts[0]["id"]) == 0 and float(ts[0]["x"]) == 100.0, "touch 0 id/x preserved")
	_assert(float(ts[1]["y"]) == 160.0, "touch 1 y preserved")
	_assert(float(ts[0]["x"]) < 320.0 and float(ts[1]["x"]) >= 320.0, "left/right zones partition")

	# Clearing removes them.
	host.set_touches([])
	var r2: Dictionary = host.call_bridge("input.poll", {})
	_assert((r2["touches"] as Array).is_empty(), "touches cleared")

	print("PASS touch: set_touches -> input.poll round-trip (id/x/y + zone partition)")
	quit(0)

func _assert(cond: bool, msg: String) -> void:
	if not cond:
		push_error("FAIL touch: " + msg)
		print("FAIL touch: ", msg)
		quit(1)
