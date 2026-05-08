## JavaScript / QuickJS syntax highlighter for Nova64 cart code.js files.
##
## Extends CodeHighlighter (a SyntaxHighlighter) with colours and region rules
## for JavaScript keywords, literals, strings, template literals, and comments.
## The plugin attaches an instance of this to every TextEditor CodeEdit that
## opens a .js textfile in the Godot editor.
##
## Colour palette is loosely based on VS Code's default Dark+ theme so the
## transition from VS Code to the Godot editor feels consistent.
@tool
extends CodeHighlighter

# ---------------------------------------------------------------------------
# Constants — palette (Dark+ inspired)
# ---------------------------------------------------------------------------
const _C_KEYWORD   := Color(0.36, 0.53, 0.87)  # blue  — control / reserved
const _C_LITERAL   := Color(0.79, 0.56, 0.79)  # purple — true/false/null
const _C_NUMBER    := Color(0.79, 0.56, 0.79)  # purple — numeric literals
const _C_STRING    := Color(0.60, 0.83, 0.48)  # green  — string content
const _C_COMMENT   := Color(0.40, 0.58, 0.40)  # dark green — comments
const _C_FUNCTION  := Color(0.86, 0.82, 0.47)  # yellow — function calls
const _C_SYMBOL    := Color(0.82, 0.82, 0.82)  # light grey — operators
const _C_MEMBER    := Color(0.56, 0.83, 0.83)  # cyan — member variables
const _C_API       := Color(0.56, 0.83, 0.83)  # cyan — Nova64 API globals

# ---------------------------------------------------------------------------

func _init() -> void:
	_configure()

func _configure() -> void:
	number_color          = _C_NUMBER
	symbol_color          = _C_SYMBOL
	function_color        = _C_FUNCTION
	member_variable_color = _C_MEMBER
	string_color          = _C_STRING

	# ----- string delimiters -----------------------------------------------
	# Double-quoted, single-quoted, and template literal strings.
	add_string_delimiter('"', '"', false)
	add_string_delimiter("'", "'", false)
	add_string_delimiter("`", "`", false)

	# ----- comment regions -------------------------------------------------
	add_color_region("//", "", _C_COMMENT, true)    # line comment
	add_color_region("/*", "*/", _C_COMMENT, false)  # block comment

	# ----- control flow / declaration keywords (blue) ----------------------
	var kw_blue: PackedStringArray = [
		"break", "case", "catch", "class", "const", "continue",
		"debugger", "default", "delete", "do", "else", "export",
		"extends", "finally", "for", "function", "if", "import",
		"in", "instanceof", "let", "new", "of", "return", "static",
		"super", "switch", "this", "throw", "try", "typeof",
		"var", "void", "while", "with", "yield", "async", "await",
		"from",
	]
	for kw in kw_blue:
		add_keyword_color(kw, _C_KEYWORD)

	# ----- literal / value keywords (purple) --------------------------------
	for kw in ["true", "false", "null", "undefined", "NaN", "Infinity"]:
		add_keyword_color(kw, _C_LITERAL)

	# ----- Nova64 API globals (cyan) ----------------------------------------
	# These identifiers are injected by the shim.  Highlighting them the same
	# colour as member variables makes cart code easier to scan at a glance.
	var api: PackedStringArray = [
		# namespaces
		"nova64", "engine",
		# draw
		"print", "cls", "rgba8", "rect", "line", "circle",
		"drawText", "drawTextShadow", "drawTextOutline",
		"drawGradientRect", "drawProgressBar",
		# input
		"btn", "btnp", "key", "keyp",
		"isKeyDown", "isKeyPressed",
		"isMouseDown", "getMousePosition",
		# 3-D scene
		"createCube", "createSphere", "createPlane",
		"createCylinder", "createTorus", "createCone", "createCapsule",
		"destroyMesh", "removeMesh",
		"setPosition", "getPosition",
		"setRotation", "setScale",
		"rotateMesh", "moveMesh",
		"setMeshVisible", "setMeshOpacity",
		"setCastShadow", "setReceiveShadow",
		"setFlatShading",
		# camera
		"setCameraPosition", "setCameraTarget",
		"setCameraFOV", "setCameraLookAt",
		# lighting
		"setLightDirection", "setLightColor",
		"setAmbientLight", "setDirectionalLight",
		"createPointLight", "setPointLightPosition",
		"setPointLightColor", "removeLight",
		# scene
		"setFog", "clearFog", "clearScene",
		"createSpaceSkybox", "animateSkybox", "clearSkybox",
		# instancing
		"createInstancedMesh", "setInstanceTransform",
		"setInstanceColor", "finalizeInstances", "removeInstancedMesh",
		# particles
		"createParticleSystem", "setParticleEmitter", "emitParticle",
		# UI
		"createButton", "createPanel",
		"updateAllButtons", "drawAllButtons", "clearButtons",
		"drawAllPanels", "drawPanel",
		"centerX", "centerY", "uiColors",
		# screens
		"initScreens", "addScreen", "switchToScreen", "switchScreen",
		# storage
		"saveJSON", "loadJSON",
		# effects
		"enablePixelation", "enableDithering", "get3DStats",
	]
	for kw in api:
		add_member_keyword_color(kw, _C_API)
