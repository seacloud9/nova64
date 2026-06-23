# nova_net.gd — NovaNet
#
# GDScript delegate that backs nova64.net on the Godot backend. The Colyseus
# client SDK is a GDScript addon (res://addons/colyseus), so all networking
# lives here; the C++ host (Nova64Host) forwards every `net.*` bridge method to
# call_net() and the QuickJS shim (nova64-compat.js) presents the same
# nova64.net facade the web backend exposes via runtime/api-net.js.
#
# The bridge is synchronous request/response, but Colyseus is async + signal
# driven. So call_net() returns immediately ({ok:true}) and connection/state
# events are QUEUED; the JS shim drains them every frame via `net.poll`, which
# resolves the cart's pending connect/join promises and fires its
# onPlayerAdd/Change/Remove + onMessage callbacks. This mirrors the proven
# state shape from scenes/test_colyseus_net.gd:
#   room.get_state().get("players") -> { sessionId: {id,name,x,y,data} }

extends Node
class_name NovaNet

var _client = null
var _room = null
var _callbacks = null
var _url: String = "ws://localhost:2567"
var _token: String = ""
var _connected: bool = false
var _joined: bool = false
var _session_id: String = ""
var _events: Array = []         # drained by net.poll
var _last_players: Dictionary = {}  # last players snapshot, for diffing

# Entry point invoked by Nova64Host::_forward_net for every "net.*" method.
func call_net(method: String, payload: Dictionary) -> Dictionary:
	match method:
		"net.isSupported":
			return {"supported": ClassDB.class_exists("_ColyseusClient")}
		"net.connect":
			return _do_connect(payload)
		"net.joinOrCreate":
			return _do_join(payload, true)
		"net.join":
			return _do_join(payload, false)
		"net.send":
			return _do_send(payload)
		"net.leave":
			return _do_leave()
		"net.poll":
			return _do_poll()
		"net.status":
			return {"connected": _connected, "joined": _joined, "sessionId": _session_id}
	return {"error": "unsupported_net_method", "method": method}

func _do_connect(payload: Dictionary) -> Dictionary:
	if not ClassDB.class_exists("_ColyseusClient"):
		return {"error": "colyseus_plugin_missing"}
	if payload.has("url") and String(payload["url"]) != "":
		_url = String(payload["url"])
	# A deployment override wins over the cart's default URL. Native Godot
	# sockets can't use WSL's localhost forwarding, so headless/CLI runs inject
	# the real host here:  --  ws://<wsl-ip>:2567   (or NOVA64_NET_URL env).
	var override := _url_override()
	if override != "":
		_url = override
	_token = String(payload.get("token", ""))
	# The Colyseus client is just a matchmaking endpoint; the socket opens at
	# join. Create it now so join is cheap and connect can report readiness.
	_client = Colyseus.Client.new(_url)
	_connected = true
	_events.append({"t": "open", "url": _url})
	return {"ok": true, "url": _url}

func _do_join(payload: Dictionary, create: bool) -> Dictionary:
	if not ClassDB.class_exists("_ColyseusClient"):
		return {"error": "colyseus_plugin_missing"}
	if _client == null:
		_client = Colyseus.Client.new(_url)
	var room_name: String = String(payload.get("room", "state"))
	var options: Dictionary = {}
	if payload.has("options") and typeof(payload["options"]) == TYPE_DICTIONARY:
		options = (payload["options"] as Dictionary).duplicate()
	if _token != "":
		options["token"] = _token
	if create:
		_room = _client.join_or_create(room_name, options)
	else:
		_room = _client.join(room_name, options)
	if _room == null:
		_events.append({"t": "error", "code": 0, "message": "join_returned_null"})
		return {"error": "join_returned_null"}

	_room.joined.connect(_on_joined)
	_room.message_received.connect(_on_message)
	_room.error.connect(_on_error)
	_room.left.connect(_on_left)
	# Derive per-player add/change/remove by diffing the players map on every
	# state change — the same version-agnostic approach runtime/api-net.js uses
	# on the web. get_state().get("players").to_dictionary() yields a plain
	# { sessionId: {id,name,x,y,data} } we can diff and snapshot directly.
	_room.state_changed.connect(_on_state_changed)
	_last_players = {}
	return {"ok": true, "room": room_name}

func _do_send(payload: Dictionary) -> Dictionary:
	if _room == null:
		return {"error": "not_joined"}
	var msg_type = payload.get("type", "")
	var data = payload.get("data", {})
	_room.send_message(msg_type, data)
	return {"ok": true}

func _do_leave() -> Dictionary:
	if _room != null:
		_room.leave()
	_room = null
	_callbacks = null
	_joined = false
	_last_players = {}
	return {"ok": true}

# Returns and clears the queued events. The shim reads result.events.
func _do_poll() -> Dictionary:
	if _events.is_empty():
		return {"events": []}
	var out := _events
	_events = []
	return {"events": out}

# ---- Colyseus signal/callback handlers -> event queue --------------------

func _on_joined() -> void:
	_joined = true
	_connected = true
	_session_id = _room.get_session_id()
	print("[NovaNet] JOINED sessionId=", _session_id)
	_events.append({"t": "joined", "sessionId": _session_id})

func _on_message(type, data) -> void:
	_events.append({"t": "message", "type": type, "data": data})

func _on_error(code, message) -> void:
	push_error("[NovaNet] error %s: %s" % [str(code), str(message)])
	_events.append({"t": "error", "code": code, "message": str(message)})

func _on_left(code, reason) -> void:
	_joined = false
	_events.append({"t": "left", "code": code, "reason": str(reason)})

func _on_state_changed() -> void:
	var st = _room.get_state()
	if st == null:
		return
	var pmap = st.get("players")
	if pmap == null:
		return
	var cur: Dictionary = {}
	if typeof(pmap) == TYPE_DICTIONARY:
		cur = pmap
	elif pmap is Object and pmap.has_method("to_dictionary"):
		cur = pmap.to_dictionary()
	else:
		return
	# adds + changes
	for id in cur.keys():
		var pd: Dictionary = _player_dict(cur[id])
		if not _last_players.has(id):
			print("[NovaNet] player add ", str(id), " ", str(pd))
			_events.append({"t": "add", "id": str(id), "player": pd})
		elif _last_players[id] != cur[id]:
			_events.append({"t": "change", "id": str(id), "player": pd})
	# removes
	for id in _last_players.keys():
		if not cur.has(id):
			_events.append({"t": "remove", "id": str(id)})
	_last_players = cur.duplicate(true)

# Deployment URL override: `-- ws://host:2567` cmdline arg, else NOVA64_NET_URL.
func _url_override() -> String:
	var args := OS.get_cmdline_user_args()
	if args.size() > 0 and String(args[0]).begins_with("ws"):
		return String(args[0])
	var env := OS.get_environment("NOVA64_NET_URL")
	if env != "":
		return env
	return ""

# Snapshot a decoded Player schema object into a plain Dictionary the JS shim
# can hand to carts unchanged (matches the web player shape: {id,name,x,y,data}).
func _player_dict(p) -> Dictionary:
	if p == null:
		return {}
	var px = p.get("x")
	var py = p.get("y")
	# Build the clean web shape {id,name,x,y,data}; drop decoder internals
	# (e.g. __ref_id) that to_dictionary() includes so carts see identical data.
	return {
		"id": str(p.get("id")),
		"name": str(p.get("name")),
		"x": float(px) if px != null else 0.0,
		"y": float(py) if py != null else 0.0,
		"data": str(p.get("data")) if p.get("data") != null else "",
	}
