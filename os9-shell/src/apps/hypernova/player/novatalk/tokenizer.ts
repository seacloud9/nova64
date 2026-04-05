// NovaTalk – Tokenizer
// Converts NovaTalk source code into a stream of tokens

import type { Token, TokenType } from './types';

// ---------------------------------------------------------------------------
// Keywords
// ---------------------------------------------------------------------------

const KEYWORDS = new Set([
  'on', 'end', 'put', 'into', 'before', 'after',
  'get', 'set', 'the', 'of', 'to',
  'if', 'then', 'else',
  'repeat', 'with', 'while', 'until', 'forever',
  'function', 'return', 'exit', 'next', 'pass',
  'send', 'global',
  'true', 'false',
  'not', 'and', 'or',
  'is', 'contains',
  'show', 'hide',
  'do',
  'button', 'btn', 'field', 'fld',
  'card', 'bg', 'background',
  'me', 'it',
  'mod',
]);

// Operators (multi-char first for greedy matching)
const OPERATORS = [
  '<=', '>=', '<>', '!=', '&&',
  '=', '<', '>', '+', '-', '*', '/', '&',
  '(', ')', ',',
];

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  let col = 1;

  while (pos < source.length) {
    const ch = source[pos];

    // Skip spaces and tabs (not newlines)
    if (ch === ' ' || ch === '\t') {
      pos++;
      col++;
      continue;
    }

    // Carriage return (skip, newline follows)
    if (ch === '\r') {
      pos++;
      continue;
    }

    // Newlines
    if (ch === '\n') {
      tokens.push({ type: 'newline', value: '\n', line, col });
      pos++;
      line++;
      col = 1;
      continue;
    }

    // Line continuation (backslash at end of line)
    if (ch === '\\' && pos + 1 < source.length && source[pos + 1] === '\n') {
      pos += 2;
      line++;
      col = 1;
      continue;
    }

    // Comments: -- to end of line
    if (ch === '-' && pos + 1 < source.length && source[pos + 1] === '-') {
      const start = pos;
      const startCol = col;
      while (pos < source.length && source[pos] !== '\n') {
        pos++;
        col++;
      }
      tokens.push({ type: 'comment', value: source.slice(start, pos), line, col: startCol });
      continue;
    }

    // Strings: "..." or '...'
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const startCol = col;
      pos++;
      col++;
      let str = '';
      while (pos < source.length && source[pos] !== quote) {
        if (source[pos] === '\\' && pos + 1 < source.length) {
          const next = source[pos + 1];
          if (next === 'n') { str += '\n'; pos += 2; col += 2; }
          else if (next === 't') { str += '\t'; pos += 2; col += 2; }
          else if (next === '\\') { str += '\\'; pos += 2; col += 2; }
          else if (next === quote) { str += quote; pos += 2; col += 2; }
          else { str += source[pos]; pos++; col++; }
        } else {
          str += source[pos];
          pos++;
          col++;
        }
      }
      if (pos < source.length) { pos++; col++; } // skip closing quote
      tokens.push({ type: 'string', value: str, line, col: startCol });
      continue;
    }

    // Numbers
    if (isDigit(ch) || (ch === '.' && pos + 1 < source.length && isDigit(source[pos + 1]))) {
      const startCol = col;
      let num = '';
      while (pos < source.length && (isDigit(source[pos]) || source[pos] === '.')) {
        num += source[pos];
        pos++;
        col++;
      }
      tokens.push({ type: 'number', value: num, line, col: startCol });
      continue;
    }

    // Operators
    let matched = false;
    for (const op of OPERATORS) {
      if (source.startsWith(op, pos)) {
        tokens.push({ type: 'operator', value: op, line, col });
        pos += op.length;
        col += op.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Identifiers and keywords
    if (isIdentStart(ch)) {
      const startCol = col;
      let ident = '';
      while (pos < source.length && isIdentChar(source[pos])) {
        ident += source[pos];
        pos++;
        col++;
      }
      const lower = ident.toLowerCase();
      const type: TokenType = KEYWORDS.has(lower) ? 'keyword' : 'identifier';
      tokens.push({ type, value: lower === ident.toLowerCase() ? lower : ident, line, col: startCol });
      // Store the lowercase value for keywords for easier comparison
      if (type === 'keyword') {
        tokens[tokens.length - 1].value = lower;
      }
      continue;
    }

    // Unknown character – skip
    pos++;
    col++;
  }

  tokens.push({ type: 'eof', value: '', line, col });
  return tokens;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isIdentStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}

function isIdentChar(ch: string): boolean {
  return isIdentStart(ch) || isDigit(ch);
}
