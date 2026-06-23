extends Node
# Standalone test of the official Colyseus Godot SDK against our StateRoom.
# Run this scene (F6) with the server up (cd server && pnpm start) and the
# "Colyseus SDK" plugin enabled (Project Settings > Plugins). Paste the
# [colyseus-test] Output lines back — they confirm the SDK works AND show how
# the decoded state looks, which I need to wire nova64.net to it.

var client
var room

func _ready() -> void:
	print("[colyseus-test] starting…")
	# Auto-quit after a few seconds so headless/CLI runs exit on their own:
	#   Godot_console.exe --headless --path <project> res://scenes/test_colyseus_net.tscn
	get_tree().create_timer(12.0).timeout.connect(func():
		print("[colyseus-test] done (auto-quit)")
		get_tree().quit())
	# Periodic status so we can see whether the connection ever completes.
	var t := Timer.new()
	t.wait_time = 1.5
	t.autostart = true
	add_child(t)
	t.timeout.connect(func():
		var sid := ""
		if room != null and is_instance_valid(room):
			sid = room.get_session_id()
		print("[colyseus-test] tick connected=", (room.connected if room != null else "?"), " sessionId='", sid, "'"))
	if not ClassDB.class_exists("_ColyseusClient"):
		push_error("[colyseus-test] _ColyseusClient class missing — enable the Colyseus SDK plugin (Project Settings > Plugins) and restart the editor.")
		return

	# URL from: `-- <url>` cmdline arg, else NOVA64_NET_URL env, else localhost.
	var url := "ws://localhost:2567"
	var args := OS.get_cmdline_user_args()
	if args.size() > 0 and String(args[0]).begins_with("ws"):
		url = String(args[0])
	elif OS.get_environment("NOVA64_NET_URL") != "":
		url = OS.get_environment("NOVA64_NET_URL")
	print("[colyseus-test] connecting to ", url)
	client = Colyseus.Client.new(url)
	print("[colyseus-test] client created; joining room 'state'…")
	room = client.join_or_create("state", { "name": "godot-test" })
	if room == null:
		push_error("[colyseus-test] join_or_create returned null (server not reachable on ws://localhost:2567?)")
		return

	room.joined.connect(_on_joined)
	room.state_changed.connect(_on_state_changed)
	room.message_received.connect(_on_message)
	room.error.connect(func(code, msg): push_error("[colyseus-test] ERROR %d: %s" % [code, msg]))
	room.left.connect(func(code, reason): print("[colyseus-test] left: %d %s" % [code, reason]))

	# Try the Callbacks API too (this is what we'll use for player add/change/remove).
	var cb = Colyseus.Callbacks.of(room)
	if cb:
		cb.on_add("players", func(player, key):
			print("[colyseus-test] CB on_add players[", key, "] = ", _describe(player)))
		cb.on_remove("players", func(player, key):
			print("[colyseus-test] CB on_remove players[", key, "]"))
		print("[colyseus-test] Callbacks.of(room) OK — registered players on_add/on_remove")
	else:
		print("[colyseus-test] Callbacks.of(room) returned null")

func _on_joined() -> void:
	print("[colyseus-test] JOINED ✅ sessionId=", room.get_session_id(), " connected=", room.connected)

func _on_state_changed() -> void:
	var st = room.get_state()
	print("[colyseus-test] state_changed; state typeof=", typeof(st), " repr=", str(st).substr(0, 400))
	var players = null
	if st != null:
		if typeof(st) == TYPE_DICTIONARY:
			players = st.get("players")
		elif st is Object:
			players = st.get("players")
	print("[colyseus-test]   players typeof=", typeof(players), " value=", str(players).substr(0, 400))

func _on_message(type, data) -> void:
	print("[colyseus-test] message type=", type, " data=", data)

func _describe(v) -> String:
	if v == null:
		return "null"
	if typeof(v) == TYPE_DICTIONARY:
		return str(v)
	if v is Object:
		var parts := []
		for prop in ["id", "name", "x", "y", "data"]:
			parts.append("%s=%s" % [prop, str(v.get(prop))])
		return "{" + ", ".join(parts) + "}"
	return str(v)
