@tool
extends CodeHighlighter

# Lightweight JavaScript syntax highlighter for the Godot script editor.
# Assigned directly to a CodeEdit.syntax_highlighter by the nova64_carts
# addon when a `.js` file is open. We extend `CodeHighlighter` (not
# `EditorSyntaxHighlighter`) because Godot 4.4's plain TextEditor does not
# iterate `ScriptEditor.register_syntax_highlighter()` for textfiles, and
# `SyntaxHighlighter::set_text_edit` is not exposed to GDScript so we
# cannot wrap a CodeHighlighter from inside an EditorSyntaxHighlighter.

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

func _init() -> void:
	number_color = NUMBER_COLOR
	symbol_color = SYMBOL_COLOR
	function_color = FUNCTION_COLOR
	member_variable_color = MEMBER_COLOR
	for k in KEYWORDS:
		add_keyword_color(k, KEYWORD_COLOR)
	for k in CONTROL_KEYWORDS:
		add_keyword_color(k, CONTROL_COLOR)
	for k in LITERALS:
		add_keyword_color(k, LITERAL_COLOR)
	for k in TYPES:
		add_keyword_color(k, TYPE_COLOR)
	add_color_region("//", "", COMMENT_COLOR, true)
	add_color_region("/*", "*/", COMMENT_COLOR, false)
	add_color_region("\"", "\"", STRING_COLOR, false)
	add_color_region("'", "'", STRING_COLOR, false)
	add_color_region("`", "`", STRING_COLOR, false)
