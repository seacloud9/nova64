// NovaTalk – Recursive Descent Parser
// Parses token stream into an AST

import type { Token } from './types';
import type {
  ASTNode, Expression, Script, HandlerDef, FunctionDef,
  PropertyAccess, ObjectRef,
} from './types';
import { tokenize } from './tokenizer';

// ---------------------------------------------------------------------------
// Parser class
// ---------------------------------------------------------------------------

export class ParseError extends Error {
  constructor(message: string, public line: number, public col: number) {
    super(`Line ${line}: ${message}`);
    this.name = 'ParseError';
  }
}

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    // Filter out comments
    this.tokens = tokens.filter((t) => t.type !== 'comment');
  }

  // ---- Token helpers -------------------------------------------------------

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: 'eof', value: '', line: 0, col: 0 };
  }

  private advance(): Token {
    const tok = this.tokens[this.pos];
    this.pos++;
    return tok;
  }

  private expect(type: string, value?: string): Token {
    const tok = this.peek();
    if (tok.type !== type || (value !== undefined && tok.value !== value)) {
      throw new ParseError(
        `Expected ${value ? `'${value}'` : type}, got '${tok.value}'`,
        tok.line, tok.col
      );
    }
    return this.advance();
  }

  private match(type: string, value?: string): boolean {
    const tok = this.peek();
    if (tok.type === type && (value === undefined || tok.value === value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private check(type: string, value?: string): boolean {
    const tok = this.peek();
    return tok.type === type && (value === undefined || tok.value === value);
  }

  private skipNewlines(): void {
    while (this.peek().type === 'newline') this.advance();
  }

  private expectNewlineOrEof(): void {
    const tok = this.peek();
    if (tok.type !== 'newline' && tok.type !== 'eof') {
      throw new ParseError(`Expected end of line, got '${tok.value}'`, tok.line, tok.col);
    }
    if (tok.type === 'newline') this.advance();
  }

  // ---- Top-level parsing ---------------------------------------------------

  parse(): Script {
    const handlers: HandlerDef[] = [];
    const functions: FunctionDef[] = [];

    this.skipNewlines();
    while (!this.check('eof')) {
      if (this.check('keyword', 'on')) {
        handlers.push(this.parseHandler());
      } else if (this.check('keyword', 'function')) {
        functions.push(this.parseFunction());
      } else {
        // Skip stray newlines or throw
        if (this.check('newline')) {
          this.advance();
        } else {
          const tok = this.peek();
          throw new ParseError(
            `Unexpected token '${tok.value}' at top level (expected 'on' or 'function')`,
            tok.line, tok.col
          );
        }
      }
    }
    return { handlers, functions };
  }

  // ---- Handler / Function --------------------------------------------------

  private parseHandler(): HandlerDef {
    const line = this.peek().line;
    this.expect('keyword', 'on');
    const nameTok = this.advance(); // handler name is an identifier or keyword used as name
    const name = nameTok.value;
    const params = this.parseParamList();
    this.expectNewlineOrEof();

    const body = this.parseBody(`end ${name}`);

    this.expect('keyword', 'end');
    // The name after "end" — accept it
    if (this.peek().type === 'identifier' || this.peek().type === 'keyword') {
      this.advance();
    }
    this.skipNewlines();

    return { kind: 'handler', name, params, body, line };
  }

  private parseFunction(): FunctionDef {
    const line = this.peek().line;
    this.expect('keyword', 'function');
    const nameTok = this.advance();
    const name = nameTok.value;
    const params = this.parseParamList();
    this.expectNewlineOrEof();

    const body = this.parseBody(`end ${name}`);

    this.expect('keyword', 'end');
    if (this.peek().type === 'identifier' || this.peek().type === 'keyword') {
      this.advance();
    }
    this.skipNewlines();

    return { kind: 'function', name, params, body, line };
  }

  private parseParamList(): string[] {
    const params: string[] = [];
    // Optional parameters on the same line before newline
    while (!this.check('newline') && !this.check('eof')) {
      if (this.check('operator', ',')) { this.advance(); continue; }
      const tok = this.advance();
      params.push(tok.value);
    }
    return params;
  }

  // ---- Body (statement list until 'end <name>', 'else', 'end if', 'end repeat') --

  private parseBody(terminator: string): ASTNode[] {
    const body: ASTNode[] = [];
    this.skipNewlines();

    while (!this.check('eof')) {
      // Check for terminator
      if (this.isTerminator(terminator)) break;
      // Also check for 'else' as it terminates 'then' body
      if (terminator.startsWith('end if') && this.check('keyword', 'else')) break;

      const stmt = this.parseStatement();
      if (stmt) body.push(stmt);
      this.skipNewlines();
    }
    return body;
  }

  private isTerminator(terminator: string): boolean {
    const parts = terminator.split(' ');
    if (parts[0] === 'end') {
      if (!this.check('keyword', 'end')) return false;
      // Peek ahead to see if next token matches
      if (parts.length > 1) {
        const next = this.tokens[this.pos + 1];
        return next && (next.value === parts[1] || next.type === 'newline' || next.type === 'eof');
      }
      return true;
    }
    return false;
  }

  // ---- Statements ----------------------------------------------------------

  private parseStatement(): ASTNode | null {
    const tok = this.peek();

    if (tok.type === 'newline') { this.advance(); return null; }

    switch (tok.type === 'keyword' ? tok.value : '') {
      case 'put': return this.parsePut();
      case 'set': return this.parseSet();
      case 'get': return this.parseGet();
      case 'if': return this.parseIf();
      case 'repeat': return this.parseRepeat();
      case 'send': return this.parseSend();
      case 'pass': return this.parsePass();
      case 'return': return this.parseReturn();
      case 'exit': return this.parseExit();
      case 'next': return this.parseNext();
      case 'show': return this.parseShow();
      case 'hide': return this.parseHide();
      case 'do': return this.parseDo();
      case 'global': return this.parseGlobal();
      default: return this.parseExpressionStatement();
    }
  }

  // put <expr> into/before/after <container>
  private parsePut(): ASTNode {
    const line = this.peek().line;
    this.expect('keyword', 'put');
    const value = this.parseExpression();
    let preposition: 'into' | 'before' | 'after' = 'into';
    if (this.check('keyword', 'into')) { this.advance(); preposition = 'into'; }
    else if (this.check('keyword', 'before')) { this.advance(); preposition = 'before'; }
    else if (this.check('keyword', 'after')) { this.advance(); preposition = 'after'; }
    const target = this.parseExpression();
    this.expectNewlineOrEof();
    return { kind: 'put', value, preposition, target, line };
  }

  // set the <property> of <object> to <expr>
  private parseSet(): ASTNode {
    const line = this.peek().line;
    this.expect('keyword', 'set');
    this.match('keyword', 'the'); // optional "the"
    const property = this.parsePropertyAccess();
    this.expect('keyword', 'to');
    const value = this.parseExpression();
    this.expectNewlineOrEof();
    return { kind: 'set', property, value, line };
  }

  // get <expr>
  private parseGet(): ASTNode {
    const line = this.peek().line;
    this.expect('keyword', 'get');
    const property = this.parseExpression();
    this.expectNewlineOrEof();
    return { kind: 'get', property, line };
  }

  // if <expr> then ... [else ...] end if
  private parseIf(): ASTNode {
    const line = this.peek().line;
    this.expect('keyword', 'if');
    const condition = this.parseExpression();
    this.expect('keyword', 'then');

    // Check for single-line if: if condition then statement
    if (!this.check('newline') && !this.check('eof')) {
      const stmt = this.parseStatement();
      const thenBody = stmt ? [stmt] : [];
      // Check for single-line else
      let elseBody: ASTNode[] = [];
      if (this.check('keyword', 'else')) {
        this.advance();
        const elseStmt = this.parseStatement();
        elseBody = elseStmt ? [elseStmt] : [];
      }
      return { kind: 'if', condition, thenBody, elseBody, line };
    }

    this.skipNewlines();
    const thenBody = this.parseBody('end if');

    let elseBody: ASTNode[] = [];
    if (this.check('keyword', 'else')) {
      this.advance();
      this.skipNewlines();
      elseBody = this.parseBody('end if');
    }

    this.expect('keyword', 'end');
    this.expect('keyword', 'if');
    this.skipNewlines();
    return { kind: 'if', condition, thenBody, elseBody, line };
  }

  // repeat with i = start to end ... end repeat
  // repeat while/until <expr> ... end repeat
  // repeat forever ... end repeat
  // repeat ... end repeat
  private parseRepeat(): ASTNode {
    const line = this.peek().line;
    this.expect('keyword', 'repeat');

    if (this.check('keyword', 'with')) {
      this.advance();
      const varTok = this.advance();
      const variable = varTok.value;
      this.expect('operator', '=');
      const start = this.parseExpression();
      this.expect('keyword', 'to');
      const end = this.parseExpression();
      this.expectNewlineOrEof();
      this.skipNewlines();
      const body = this.parseBody('end repeat');
      this.expect('keyword', 'end');
      this.expect('keyword', 'repeat');
      this.skipNewlines();
      return { kind: 'repeatWith', variable, start, end, step: null, body, line };
    }

    if (this.check('keyword', 'while')) {
      this.advance();
      const condition = this.parseExpression();
      this.expectNewlineOrEof();
      this.skipNewlines();
      const body = this.parseBody('end repeat');
      this.expect('keyword', 'end');
      this.expect('keyword', 'repeat');
      this.skipNewlines();
      return { kind: 'repeatWhile', condition, isUntil: false, body, line };
    }

    if (this.check('keyword', 'until')) {
      this.advance();
      const condition = this.parseExpression();
      this.expectNewlineOrEof();
      this.skipNewlines();
      const body = this.parseBody('end repeat');
      this.expect('keyword', 'end');
      this.expect('keyword', 'repeat');
      this.skipNewlines();
      return { kind: 'repeatWhile', condition, isUntil: true, body, line };
    }

    if (this.check('keyword', 'forever')) {
      this.advance();
      this.expectNewlineOrEof();
      this.skipNewlines();
      const body = this.parseBody('end repeat');
      this.expect('keyword', 'end');
      this.expect('keyword', 'repeat');
      this.skipNewlines();
      return { kind: 'repeatForever', body, line };
    }

    // Bare "repeat" = repeat forever
    this.expectNewlineOrEof();
    this.skipNewlines();
    const body = this.parseBody('end repeat');
    this.expect('keyword', 'end');
    this.expect('keyword', 'repeat');
    this.skipNewlines();
    return { kind: 'repeatForever', body, line };
  }

  // send "message" to <objectRef>
  private parseSend(): ASTNode {
    const line = this.peek().line;
    this.expect('keyword', 'send');
    const message = this.parseExpression();
    this.expect('keyword', 'to');
    const target = this.parseExpression();
    this.expectNewlineOrEof();
    return { kind: 'send', message, target, line };
  }

  // pass <messageName>
  private parsePass(): ASTNode {
    const line = this.peek().line;
    this.expect('keyword', 'pass');
    const tok = this.advance();
    this.expectNewlineOrEof();
    return { kind: 'pass', message: tok.value, line };
  }

  // return [expr]
  private parseReturn(): ASTNode {
    const line = this.peek().line;
    this.expect('keyword', 'return');
    let value: Expression | null = null;
    if (!this.check('newline') && !this.check('eof')) {
      value = this.parseExpression();
    }
    this.expectNewlineOrEof();
    return { kind: 'return', value, line };
  }

  // exit <handler|repeat>
  private parseExit(): ASTNode {
    const line = this.peek().line;
    this.expect('keyword', 'exit');
    const tok = this.advance();
    this.expectNewlineOrEof();
    return { kind: 'exit', target: tok.value, line };
  }

  // next repeat
  private parseNext(): ASTNode {
    const line = this.peek().line;
    this.expect('keyword', 'next');
    const tok = this.advance();
    this.expectNewlineOrEof();
    return { kind: 'next', target: tok.value, line };
  }

  // show <objectRef>
  private parseShow(): ASTNode {
    const line = this.peek().line;
    this.expect('keyword', 'show');
    const target = this.parseExpression();
    this.expectNewlineOrEof();
    return { kind: 'show', target, line };
  }

  // hide <objectRef>
  private parseHide(): ASTNode {
    const line = this.peek().line;
    this.expect('keyword', 'hide');
    const target = this.parseExpression();
    this.expectNewlineOrEof();
    return { kind: 'hide', target, line };
  }

  // do <string-expr>
  private parseDo(): ASTNode {
    const line = this.peek().line;
    this.expect('keyword', 'do');
    const expression = this.parseExpression();
    this.expectNewlineOrEof();
    return { kind: 'do', expression, line };
  }

  // global var1, var2, ...
  private parseGlobal(): ASTNode {
    const line = this.peek().line;
    this.expect('keyword', 'global');
    const names: string[] = [];
    names.push(this.advance().value);
    while (this.match('operator', ',')) {
      names.push(this.advance().value);
    }
    this.expectNewlineOrEof();
    return { kind: 'global', names, line };
  }

  // Expression as statement (function calls like goNext(), alert("hi"))
  private parseExpressionStatement(): ASTNode {
    const line = this.peek().line;
    const expr = this.parseExpression();
    this.expectNewlineOrEof();
    return { kind: 'expression', expression: expr, line };
  }

  // ---- Property access: <property> of <object> ----------------------------

  private parsePropertyAccess(): PropertyAccess {
    const propTok = this.advance();
    const property = propTok.value;
    this.expect('keyword', 'of');
    const object = this.parseExpression();
    return { kind: 'property', property, object };
  }

  // ---- Expression parsing (precedence climbing) ----------------------------

  private parseExpression(): Expression {
    return this.parseOr();
  }

  private parseOr(): Expression {
    let left = this.parseAnd();
    while (this.check('keyword', 'or')) {
      const op = this.advance().value;
      const right = this.parseAnd();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseAnd(): Expression {
    let left = this.parseNot();
    while (this.check('keyword', 'and')) {
      const op = this.advance().value;
      const right = this.parseNot();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseNot(): Expression {
    if (this.check('keyword', 'not')) {
      this.advance();
      const operand = this.parseNot();
      return { kind: 'unary', op: 'not', operand };
    }
    return this.parseComparison();
  }

  private parseComparison(): Expression {
    let left = this.parseContains();

    const compOps = ['=', '<', '>', '<=', '>=', '<>', '!='];
    while (true) {
      // "is not" and "is"
      if (this.check('keyword', 'is')) {
        this.advance();
        if (this.check('keyword', 'not')) {
          this.advance();
          const right = this.parseContains();
          left = { kind: 'binary', op: 'is not', left, right };
        } else {
          const right = this.parseContains();
          left = { kind: 'binary', op: 'is', left, right };
        }
        continue;
      }
      if (this.check('operator') && compOps.includes(this.peek().value)) {
        const op = this.advance().value;
        const right = this.parseContains();
        left = { kind: 'binary', op, left, right };
        continue;
      }
      break;
    }
    return left;
  }

  private parseContains(): Expression {
    let left = this.parseConcat();
    if (this.check('keyword', 'contains')) {
      const op = this.advance().value;
      const right = this.parseConcat();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  // String concatenation: & and &&
  private parseConcat(): Expression {
    let left = this.parseAddSub();
    while (this.check('operator', '&') || this.check('operator', '&&')) {
      const op = this.advance().value;
      const right = this.parseAddSub();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseAddSub(): Expression {
    let left = this.parseMulDiv();
    while (
      (this.check('operator', '+') || this.check('operator', '-'))
    ) {
      const op = this.advance().value;
      const right = this.parseMulDiv();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseMulDiv(): Expression {
    let left = this.parseUnary();
    while (
      this.check('operator', '*') || this.check('operator', '/') || this.check('keyword', 'mod')
    ) {
      const op = this.advance().value;
      const right = this.parseUnary();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseUnary(): Expression {
    if (this.check('operator', '-')) {
      this.advance();
      const operand = this.parseUnary();
      return { kind: 'unary', op: '-', operand };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Expression {
    const tok = this.peek();

    // Number literal
    if (tok.type === 'number') {
      this.advance();
      return { kind: 'number', value: parseFloat(tok.value) };
    }

    // String literal
    if (tok.type === 'string') {
      this.advance();
      return { kind: 'string', value: tok.value };
    }

    // Boolean literals
    if (tok.type === 'keyword' && tok.value === 'true') {
      this.advance();
      return { kind: 'bool', value: true };
    }
    if (tok.type === 'keyword' && tok.value === 'false') {
      this.advance();
      return { kind: 'bool', value: false };
    }

    // Parenthesized expression
    if (tok.type === 'operator' && tok.value === '(') {
      this.advance();
      const expr = this.parseExpression();
      this.expect('operator', ')');
      return { kind: 'paren', expression: expr };
    }

    // "the" — property access: "the visible of btn 1" or special: "the target"
    if (tok.type === 'keyword' && tok.value === 'the') {
      this.advance();
      // "the target"
      if (this.check('identifier', 'target') || this.check('keyword', 'target')) {
        this.advance();
        return { kind: 'theTarget' };
      }
      // "the <property> of <expr>"
      const propTok = this.advance();
      const property = propTok.value;
      if (this.check('keyword', 'of')) {
        this.advance();
        const object = this.parseExpression();
        return { kind: 'property', property, object };
      }
      // Standalone "the <property>" — treat as identifier
      return { kind: 'identifier', name: property };
    }

    // "me"
    if (tok.type === 'keyword' && tok.value === 'me') {
      this.advance();
      return { kind: 'me' };
    }

    // "it"
    if (tok.type === 'keyword' && tok.value === 'it') {
      this.advance();
      return { kind: 'it' };
    }

    // Object references: button/btn/field/fld "name" or 1
    if (tok.type === 'keyword' && isObjectType(tok.value)) {
      return this.parseObjectRef();
    }

    // Identifier (variable or function call)
    if (tok.type === 'identifier') {
      this.advance();
      const name = tok.value;
      // Check for function call: name(args)
      if (this.check('operator', '(')) {
        this.advance();
        const args: Expression[] = [];
        if (!this.check('operator', ')')) {
          args.push(this.parseExpression());
          while (this.match('operator', ',')) {
            args.push(this.parseExpression());
          }
        }
        this.expect('operator', ')');
        return { kind: 'call', name, args };
      }
      return { kind: 'identifier', name };
    }

    // If we got a keyword that's not handled above, treat it as an identifier
    if (tok.type === 'keyword') {
      this.advance();
      const name = tok.value;
      if (this.check('operator', '(')) {
        this.advance();
        const args: Expression[] = [];
        if (!this.check('operator', ')')) {
          args.push(this.parseExpression());
          while (this.match('operator', ',')) {
            args.push(this.parseExpression());
          }
        }
        this.expect('operator', ')');
        return { kind: 'call', name, args };
      }
      return { kind: 'identifier', name };
    }

    throw new ParseError(`Unexpected token '${tok.value}'`, tok.line, tok.col);
  }

  // button "name" | btn 1 | field "x" | card field "y"
  private parseObjectRef(): Expression {
    const tok = this.advance();
    const objectType = tok.value as ObjectRef['objectType'];
    const identifier = this.parsePrimary();
    return { kind: 'objectRef', objectType, identifier };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isObjectType(value: string): boolean {
  return ['button', 'btn', 'field', 'fld', 'card', 'bg', 'background'].includes(value);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseScript(source: string): Script {
  const tokens = tokenize(source);
  const parser = new Parser(tokens);
  return parser.parse();
}
