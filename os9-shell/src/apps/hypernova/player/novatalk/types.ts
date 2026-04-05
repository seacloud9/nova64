// NovaTalk – AST node types and runtime value types
// A HyperTalk-inspired scripting language for HyperNova

// ---------------------------------------------------------------------------
// Token types
// ---------------------------------------------------------------------------

export type TokenType =
  | 'keyword'
  | 'identifier'
  | 'string'
  | 'number'
  | 'operator'
  | 'newline'
  | 'comment'
  | 'eof';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

// ---------------------------------------------------------------------------
// AST nodes
// ---------------------------------------------------------------------------

export type ASTNode =
  | HandlerDef
  | FunctionDef
  | PutStatement
  | SetStatement
  | GetStatement
  | IfStatement
  | RepeatWithStatement
  | RepeatWhileStatement
  | RepeatForeverStatement
  | SendStatement
  | PassStatement
  | ReturnStatement
  | ExitStatement
  | NextStatement
  | ShowStatement
  | HideStatement
  | DoStatement
  | GlobalDecl
  | ExpressionStatement;

export interface HandlerDef {
  kind: 'handler';
  name: string;
  params: string[];
  body: ASTNode[];
  line: number;
}

export interface FunctionDef {
  kind: 'function';
  name: string;
  params: string[];
  body: ASTNode[];
  line: number;
}

export interface PutStatement {
  kind: 'put';
  value: Expression;
  preposition: 'into' | 'before' | 'after';
  target: Expression;
  line: number;
}

export interface SetStatement {
  kind: 'set';
  property: PropertyAccess;
  value: Expression;
  line: number;
}

export interface GetStatement {
  kind: 'get';
  property: Expression;
  line: number;
}

export interface IfStatement {
  kind: 'if';
  condition: Expression;
  thenBody: ASTNode[];
  elseBody: ASTNode[];
  line: number;
}

export interface RepeatWithStatement {
  kind: 'repeatWith';
  variable: string;
  start: Expression;
  end: Expression;
  step: Expression | null;
  body: ASTNode[];
  line: number;
}

export interface RepeatWhileStatement {
  kind: 'repeatWhile';
  condition: Expression;
  isUntil: boolean; // true for "repeat until"
  body: ASTNode[];
  line: number;
}

export interface RepeatForeverStatement {
  kind: 'repeatForever';
  body: ASTNode[];
  line: number;
}

export interface SendStatement {
  kind: 'send';
  message: Expression;
  target: Expression;
  line: number;
}

export interface PassStatement {
  kind: 'pass';
  message: string;
  line: number;
}

export interface ReturnStatement {
  kind: 'return';
  value: Expression | null;
  line: number;
}

export interface ExitStatement {
  kind: 'exit';
  target: string; // handler name or "repeat"
  line: number;
}

export interface NextStatement {
  kind: 'next';
  target: string; // "repeat"
  line: number;
}

export interface ShowStatement {
  kind: 'show';
  target: Expression;
  line: number;
}

export interface HideStatement {
  kind: 'hide';
  target: Expression;
  line: number;
}

export interface DoStatement {
  kind: 'do';
  expression: Expression;
  line: number;
}

export interface GlobalDecl {
  kind: 'global';
  names: string[];
  line: number;
}

export interface ExpressionStatement {
  kind: 'expression';
  expression: Expression;
  line: number;
}

// ---------------------------------------------------------------------------
// Expressions
// ---------------------------------------------------------------------------

export type Expression =
  | BinaryExpr
  | UnaryExpr
  | NumberLiteral
  | StringLiteral
  | BoolLiteral
  | IdentifierExpr
  | FunctionCallExpr
  | PropertyAccess
  | ObjectRef
  | MeExpr
  | TheTargetExpr
  | ItExpr
  | ParenExpr;

export interface BinaryExpr {
  kind: 'binary';
  op: string; // +, -, *, /, mod, &, &&, =, <>, <, >, <=, >=, and, or, is, is not, contains
  left: Expression;
  right: Expression;
}

export interface UnaryExpr {
  kind: 'unary';
  op: string; // -, not
  operand: Expression;
}

export interface NumberLiteral {
  kind: 'number';
  value: number;
}

export interface StringLiteral {
  kind: 'string';
  value: string;
}

export interface BoolLiteral {
  kind: 'bool';
  value: boolean;
}

export interface IdentifierExpr {
  kind: 'identifier';
  name: string;
}

export interface FunctionCallExpr {
  kind: 'call';
  name: string;
  args: Expression[];
}

export interface PropertyAccess {
  kind: 'property';
  property: string; // e.g. "visible", "text", "name"
  object: Expression;
}

export interface ObjectRef {
  kind: 'objectRef';
  objectType: 'button' | 'btn' | 'field' | 'fld' | 'card' | 'bg' | 'background';
  identifier: Expression; // name (string) or number
}

export interface MeExpr {
  kind: 'me';
}

export interface TheTargetExpr {
  kind: 'theTarget';
}

export interface ItExpr {
  kind: 'it';
}

export interface ParenExpr {
  kind: 'paren';
  expression: Expression;
}

// ---------------------------------------------------------------------------
// Script (top level)
// ---------------------------------------------------------------------------

export interface Script {
  handlers: HandlerDef[];
  functions: FunctionDef[];
}

// ---------------------------------------------------------------------------
// Runtime values
// ---------------------------------------------------------------------------

export type NovaTalkValue = string | number | boolean | null;
