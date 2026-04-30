@tool
extends EditorSyntaxHighlighter

# Lightweight JavaScript syntax highlighter for the Godot script editor.
# Registered via the nova64_carts addon so files ending in `.js` get readable
# colours without needing a full LSP-grade parser.

const KEYWORD_COLOR := Color(1.0, 0.44, 0.52)
const CONTROL_COLOR := Color(1.0, 0.71, 0.36)
const TYPE_COLOR    := Color(0.51, 0.85, 1.0)
const LITERAL_COLOR := Color(0.78, 0.55, 1.0)
const STRING_COLOR  := Color(1.0, 0.93, 0.55)
const COMMENT_COLOR := Color(0.5, 0.55, 0.6)
const NUMBER_COLOR  := Color(0.66, 0.92, 0.66)
const SYMBOL_COLOR  := Color(0.8, 0.85, 0.95)
const FUNCTION_COLOR := Color(0.55, 0.78, 1.0)
const MEMBER_COLOR  := Color(0.85, 0.85, 1.0)

const KEYWORDS := [
	"class", "const", "debugger", "delete", "export", "extends", "function",
	"import", "in", "instanceof", "let", "new", "of", "super", "this",
	"typeof", "var", "void", "with", "yield", "async", "await", "from",
	"as", "static", "get", "set",
]
const CONTROL_KEYWORDS := [
	"break", "case", "catch", "continue", "default", "do", "else",
	"finally", "for", "if", "return", "switch", "throw", "try", "while",
]
const LITERALS := ["true", "false", "null", "undefined", "NaN", "Infinity"]
const TYPES := [
	"Array", "Object", "String", "Number", "Boolean", "Math", "JSON",
	"Promise", "Map", "Set", "Symbol", "Error", "Date", "RegExp",
	"Float32Array", "Uint8Array", "Int32Array", "console",
]

var _ch: CodeHighlighter = CodeHighlighter.new()

func _init() -> void:
	_ch.number_color = NUMBER_COLOR
	_ch.symbol_color = SYMBOL_COLOR
	_ch.function_color = FUNCTION_COLOR
	_ch.member_variable_color = MEMBER_COLOR
	for k in KEYWORDS:
		_ch.add_keyword_color(k, KEYWORD_COLOR)
	for k in CONTROL_KEYWORDS:
		_ch.add_keyword_color(k, CONTROL_COLOR)
	for k in LITERALS:
		_ch.add_keyword_color(k, LITERAL_COLOR)
	for k in TYPES:
		_ch.add_keyword_color(k, TYPE_COLOR)
	_ch.add_color_region("//", "", COMMENT_COLOR, true)
	_ch.add_color_region("/*", "*/", COMMENT_COLOR, false)
	_ch.add_color_region("\"", "\"", STRING_COLOR, false)
	_ch.add_color_region("'", "'", STRING_COLOR, false)
	_ch.add_color_region("`", "`", STRING_COLOR, false)

func _get_name() -> String:
	return "JavaScript"

func _get_supported_languages() -> PackedStringArray:
	return PackedStringArray(["js"])

# The textfile script editor matches highlighters by file extension via
# _get_supported_extensions(); _get_supported_languages() alone is only used
# for true Script-derived languages, so plain .js text files won't pick it
# up unless this method is implemented too.
func _get_supported_extensions() -> PackedStringArray:
	return PackedStringArray(["js"])

func _get_line_syntax_highlighting(p_line: int) -> Dictionary:
	var te := get_text_edit()
	if te != null and _ch.get_text_edit() != te:
		_ch.set_text_edit(te)
	return _ch._get_line_syntax_highlighting(p_line)
