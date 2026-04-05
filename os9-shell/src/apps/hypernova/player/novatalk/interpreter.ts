// NovaTalk – Tree-walking Interpreter
// Executes NovaTalk AST nodes with HyperCard-like semantics

import type {
  ASTNode, Expression, Script, NovaTalkValue,
  PropertyAccess, ObjectRef,
} from './types';
import { parseScript } from './parser';

// ---------------------------------------------------------------------------
// Signals for control flow
// ---------------------------------------------------------------------------

class ReturnSignal {
  constructor(public value: NovaTalkValue) {}
}
class ExitRepeatSignal {}
class NextRepeatSignal {}
class PassSignal {
  constructor(public message: string) {}
}

// ---------------------------------------------------------------------------
// Environment (variable scope)
// ---------------------------------------------------------------------------

class Environment {
  private locals = new Map<string, NovaTalkValue>();
  private globalNames = new Set<string>();

  constructor(private globals: Map<string, NovaTalkValue>) {}

  declareGlobal(name: string): void {
    this.globalNames.add(name);
  }

  get(name: string): NovaTalkValue {
    if (this.globalNames.has(name)) {
      return this.globals.get(name) ?? null;
    }
    if (this.locals.has(name)) {
      return this.locals.get(name)!;
    }
    // Fall through to globals
    if (this.globals.has(name)) {
      return this.globals.get(name)!;
    }
    return null; // undefined variables are empty/null
  }

  set(name: string, value: NovaTalkValue): void {
    if (this.globalNames.has(name)) {
      this.globals.set(name, value);
    } else {
      this.locals.set(name, value);
    }
  }
}

// ---------------------------------------------------------------------------
// Host API — bridge between NovaTalk and HyperNova
// ---------------------------------------------------------------------------

export interface NovaTalkHostAPI {
  // Navigation
  goToCard: (id: string) => void;
  goNext: () => void;
  goPrev: () => void;
  goFirst: () => void;
  goLast: () => void;

  // Fields
  setField: (id: string, value: string) => void;
  getField: (id: string) => string;

  // Objects — find by type + name/id/number
  findObject: (type: string, identifier: NovaTalkValue) => CardObjectInfo | null;
  setObjectProperty: (objId: string, property: string, value: NovaTalkValue) => void;
  getObjectProperty: (objId: string, property: string) => NovaTalkValue;

  // Dialogs
  alert: (msg: string) => void;
  log: (...args: unknown[]) => void;

  // Context
  currentCardId: string;
  /** The object that received the current message */
  targetObjectId: string | null;
  /** The object whose script is currently running */
  meObjectId: string | null;

  // Message passing
  sendMessage?: (message: string, targetObjId: string) => void;
}

export interface CardObjectInfo {
  id: string;
  type: string;
}

// ---------------------------------------------------------------------------
// Interpreter
// ---------------------------------------------------------------------------

export class Interpreter {
  private globals = new Map<string, NovaTalkValue>();
  private script: Script | null = null;
  private api: NovaTalkHostAPI;
  private it: NovaTalkValue = null;
  private maxIterations = 100000; // safety limit

  constructor(api: NovaTalkHostAPI) {
    this.api = api;
  }

  /** Parse and cache a script. Returns parse errors if any. */
  loadScript(source: string): string | null {
    try {
      this.script = parseScript(source);
      return null;
    } catch (err) {
      return (err as Error).message;
    }
  }

  /** Execute a named handler with optional arguments. Returns true if handled. */
  executeHandler(name: string, args: NovaTalkValue[] = []): boolean {
    if (!this.script) return false;
    const handler = this.script.handlers.find((h) => h.name === name);
    if (!handler) return false;

    const env = new Environment(this.globals);
    // Bind parameters
    for (let i = 0; i < handler.params.length; i++) {
      env.set(handler.params[i], args[i] ?? null);
    }

    try {
      this.execBlock(handler.body, env);
    } catch (e) {
      if (e instanceof PassSignal) {
        return false; // not handled — pass to next in chain
      }
      if (e instanceof ReturnSignal) {
        return true;
      }
      throw e;
    }
    return true;
  }

  /** Call a user-defined function. Returns null if not found. */
  callFunction(name: string, args: NovaTalkValue[]): NovaTalkValue {
    if (!this.script) return null;
    const func = this.script.functions.find((f) => f.name === name);
    if (!func) return null;

    const env = new Environment(this.globals);
    for (let i = 0; i < func.params.length; i++) {
      env.set(func.params[i], args[i] ?? null);
    }

    try {
      this.execBlock(func.body, env);
    } catch (e) {
      if (e instanceof ReturnSignal) return e.value;
      throw e;
    }
    return null;
  }

  // ---- Statement execution -------------------------------------------------

  private execBlock(nodes: ASTNode[], env: Environment): void {
    for (const node of nodes) {
      this.execNode(node, env);
    }
  }

  private execNode(node: ASTNode, env: Environment): void {
    switch (node.kind) {
      case 'put': return this.execPut(node, env);
      case 'set': return this.execSet(node, env);
      case 'get': return this.execGet(node, env);
      case 'if': return this.execIf(node, env);
      case 'repeatWith': return this.execRepeatWith(node, env);
      case 'repeatWhile': return this.execRepeatWhile(node, env);
      case 'repeatForever': return this.execRepeatForever(node, env);
      case 'send': return this.execSend(node, env);
      case 'pass': throw new PassSignal(node.message);
      case 'return': throw new ReturnSignal(node.value ? this.evalExpr(node.value, env) : null);
      case 'exit':
        if (node.target === 'repeat') throw new ExitRepeatSignal();
        throw new ReturnSignal(null); // exit handler
      case 'next':
        if (node.target === 'repeat') throw new NextRepeatSignal();
        break;
      case 'show': return this.execShow(node, env);
      case 'hide': return this.execHide(node, env);
      case 'do': return this.execDo(node, env);
      case 'global':
        for (const name of node.names) env.declareGlobal(name);
        break;
      case 'expression': {
        const expr = node.expression;
        // Function calls as statements
        if (expr.kind === 'call') {
          this.evalCall(expr.name, expr.args.map((a) => this.evalExpr(a, env)));
        } else {
          this.evalExpr(expr, env);
        }
        break;
      }
      case 'handler':
      case 'function':
        break; // definitions are handled at load time
    }
  }

  // put <value> into <target>
  private execPut(node: ASTNode & { kind: 'put' }, env: Environment): void {
    const value = this.evalExpr(node.value, env);
    const target = node.target;

    // put into a variable
    if (target.kind === 'identifier') {
      const strVal = this.toString(value);
      if (node.preposition === 'into') {
        env.set(target.name, strVal);
      } else if (node.preposition === 'before') {
        const prev = this.toString(env.get(target.name));
        env.set(target.name, strVal + prev);
      } else {
        const prev = this.toString(env.get(target.name));
        env.set(target.name, prev + strVal);
      }
      return;
    }

    // put into "it"
    if (target.kind === 'it') {
      this.it = value;
      return;
    }

    // put into field/button property
    if (target.kind === 'objectRef' || target.kind === 'property') {
      this.putIntoObject(target, value, node.preposition, env);
      return;
    }

    // Default: treat as variable name
    env.set(this.toString(this.evalExpr(target, env)), value);
  }

  private putIntoObject(
    target: Expression,
    value: NovaTalkValue,
    preposition: 'into' | 'before' | 'after',
    env: Environment,
  ): void {
    if (target.kind === 'objectRef') {
      const obj = this.resolveObjectRef(target, env);
      if (obj) {
        const current = this.api.getObjectProperty(obj.id, 'text');
        const strVal = this.toString(value);
        const currentStr = this.toString(current);
        if (preposition === 'into') {
          this.api.setObjectProperty(obj.id, 'text', strVal);
        } else if (preposition === 'before') {
          this.api.setObjectProperty(obj.id, 'text', strVal + currentStr);
        } else {
          this.api.setObjectProperty(obj.id, 'text', currentStr + strVal);
        }
      }
    } else if (target.kind === 'property') {
      const obj = this.resolvePropertyObject(target, env);
      if (obj) {
        this.api.setObjectProperty(obj.id, target.property, this.toString(value));
      }
    }
  }

  // set the <property> of <object> to <value>
  private execSet(node: ASTNode & { kind: 'set' }, env: Environment): void {
    const value = this.evalExpr(node.value, env);
    const prop = node.property;
    const obj = this.resolvePropertyObject(prop, env);
    if (obj) {
      this.api.setObjectProperty(obj.id, prop.property, value);
    }
  }

  // get <expression> → result goes into "it"
  private execGet(node: ASTNode & { kind: 'get' }, env: Environment): void {
    this.it = this.evalExpr(node.property, env);
  }

  // if/then/else
  private execIf(node: ASTNode & { kind: 'if' }, env: Environment): void {
    const cond = this.evalExpr(node.condition, env);
    if (this.toBool(cond)) {
      this.execBlock(node.thenBody, env);
    } else {
      this.execBlock(node.elseBody, env);
    }
  }

  // repeat with i = start to end
  private execRepeatWith(node: ASTNode & { kind: 'repeatWith' }, env: Environment): void {
    const start = this.toNumber(this.evalExpr(node.start, env));
    const end = this.toNumber(this.evalExpr(node.end, env));
    const step = node.step ? this.toNumber(this.evalExpr(node.step, env)) : (start <= end ? 1 : -1);
    let iterations = 0;

    for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
      if (++iterations > this.maxIterations) {
        throw new Error('NovaTalk: Maximum iteration limit reached');
      }
      env.set(node.variable, i);
      try {
        this.execBlock(node.body, env);
      } catch (e) {
        if (e instanceof ExitRepeatSignal) break;
        if (e instanceof NextRepeatSignal) continue;
        throw e;
      }
    }
  }

  // repeat while/until
  private execRepeatWhile(node: ASTNode & { kind: 'repeatWhile' }, env: Environment): void {
    let iterations = 0;
    while (true) {
      if (++iterations > this.maxIterations) {
        throw new Error('NovaTalk: Maximum iteration limit reached');
      }
      const cond = this.toBool(this.evalExpr(node.condition, env));
      // "while" continues when true; "until" continues when false
      if (node.isUntil ? cond : !cond) break;
      try {
        this.execBlock(node.body, env);
      } catch (e) {
        if (e instanceof ExitRepeatSignal) break;
        if (e instanceof NextRepeatSignal) continue;
        throw e;
      }
    }
  }

  // repeat forever
  private execRepeatForever(node: ASTNode & { kind: 'repeatForever' }, env: Environment): void {
    let iterations = 0;
    while (true) {
      if (++iterations > this.maxIterations) {
        throw new Error('NovaTalk: Maximum iteration limit reached');
      }
      try {
        this.execBlock(node.body, env);
      } catch (e) {
        if (e instanceof ExitRepeatSignal) break;
        if (e instanceof NextRepeatSignal) continue;
        throw e;
      }
    }
  }

  // send "message" to <target>
  private execSend(node: ASTNode & { kind: 'send' }, env: Environment): void {
    const message = this.toString(this.evalExpr(node.message, env));
    const target = node.target;
    if (target.kind === 'objectRef') {
      const obj = this.resolveObjectRef(target, env);
      if (obj && this.api.sendMessage) {
        this.api.sendMessage(message, obj.id);
      }
    }
  }

  // show <target>
  private execShow(node: ASTNode & { kind: 'show' }, env: Environment): void {
    const target = node.target;
    if (target.kind === 'objectRef') {
      const obj = this.resolveObjectRef(target, env);
      if (obj) this.api.setObjectProperty(obj.id, 'visible', true);
    }
  }

  // hide <target>
  private execHide(node: ASTNode & { kind: 'hide' }, env: Environment): void {
    const target = node.target;
    if (target.kind === 'objectRef') {
      const obj = this.resolveObjectRef(target, env);
      if (obj) this.api.setObjectProperty(obj.id, 'visible', false);
    }
  }

  // do <string> — dynamic evaluation
  private execDo(node: ASTNode & { kind: 'do' }, env: Environment): void {
    const code = this.toString(this.evalExpr(node.expression, env));
    // Parse and execute inline
    try {
      const script = parseScript(`on _do\n${code}\nend _do`);
      const handler = script.handlers[0];
      if (handler) {
        this.execBlock(handler.body, env);
      }
    } catch (e) {
      this.api.log('NovaTalk do error:', e);
    }
  }

  // ---- Expression evaluation -----------------------------------------------

  private evalExpr(expr: Expression, env: Environment): NovaTalkValue {
    switch (expr.kind) {
      case 'number': return expr.value;
      case 'string': return expr.value;
      case 'bool': return expr.value;
      case 'identifier': return env.get(expr.name);
      case 'it': return this.it;
      case 'me': return this.api.meObjectId;
      case 'theTarget': return this.api.targetObjectId;
      case 'paren': return this.evalExpr(expr.expression, env);

      case 'binary': return this.evalBinary(expr.op, expr.left, expr.right, env);
      case 'unary': return this.evalUnary(expr.op, expr.operand, env);

      case 'call': {
        const args = expr.args.map((a) => this.evalExpr(a, env));
        // Try user-defined function first
        const result = this.callFunction(expr.name, args);
        if (result !== null) return result;
        return this.evalCall(expr.name, args);
      }

      case 'property': {
        const obj = this.resolvePropertyObject(expr, env);
        if (obj) return this.api.getObjectProperty(obj.id, expr.property);
        return null;
      }

      case 'objectRef': {
        const obj = this.resolveObjectRef(expr, env);
        return obj ? obj.id : null;
      }

      default: return null;
    }
  }

  private evalBinary(op: string, leftExpr: Expression, rightExpr: Expression, env: Environment): NovaTalkValue {
    const left = this.evalExpr(leftExpr, env);
    const right = this.evalExpr(rightExpr, env);

    switch (op) {
      case '+': return this.toNumber(left) + this.toNumber(right);
      case '-': return this.toNumber(left) - this.toNumber(right);
      case '*': return this.toNumber(left) * this.toNumber(right);
      case '/': {
        const divisor = this.toNumber(right);
        if (divisor === 0) return 0;
        return this.toNumber(left) / divisor;
      }
      case 'mod': {
        const divisor = this.toNumber(right);
        if (divisor === 0) return 0;
        return this.toNumber(left) % divisor;
      }
      case '&': return this.toString(left) + this.toString(right);
      case '&&': return this.toString(left) + ' ' + this.toString(right);
      case '=': case 'is': return this.isEqual(left, right);
      case '<>': case '!=': case 'is not': return !this.isEqual(left, right);
      case '<': return this.toNumber(left) < this.toNumber(right);
      case '>': return this.toNumber(left) > this.toNumber(right);
      case '<=': return this.toNumber(left) <= this.toNumber(right);
      case '>=': return this.toNumber(left) >= this.toNumber(right);
      case 'and': return this.toBool(left) && this.toBool(right);
      case 'or': return this.toBool(left) || this.toBool(right);
      case 'contains': return this.toString(left).toLowerCase().includes(this.toString(right).toLowerCase());
      default: return null;
    }
  }

  private evalUnary(op: string, operand: Expression, env: Environment): NovaTalkValue {
    const val = this.evalExpr(operand, env);
    if (op === '-') return -this.toNumber(val);
    if (op === 'not') return !this.toBool(val);
    return null;
  }

  // ---- Built-in function calls ----------------------------------------------

  private evalCall(name: string, args: NovaTalkValue[]): NovaTalkValue {
    switch (name) {
      // Navigation
      case 'gotocard': this.api.goToCard(this.toString(args[0])); return null;
      case 'gonext': this.api.goNext(); return null;
      case 'goprev': this.api.goPrev(); return null;
      case 'gofirst': this.api.goFirst(); return null;
      case 'golast': this.api.goLast(); return null;

      // Fields
      case 'setfield': this.api.setField(this.toString(args[0]), this.toString(args[1])); return null;
      case 'getfield': return this.api.getField(this.toString(args[0]));

      // Dialogs
      case 'alert': this.api.alert(this.toString(args[0])); return null;
      case 'answer': this.api.alert(this.toString(args[0])); return null;
      case 'log': this.api.log(...args); return null;

      // Math
      case 'abs': return Math.abs(this.toNumber(args[0]));
      case 'round': return Math.round(this.toNumber(args[0]));
      case 'trunc': return Math.trunc(this.toNumber(args[0]));
      case 'random': return Math.floor(Math.random() * this.toNumber(args[0])) + 1;
      case 'min': return Math.min(...args.map((a) => this.toNumber(a)));
      case 'max': return Math.max(...args.map((a) => this.toNumber(a)));
      case 'sqrt': return Math.sqrt(this.toNumber(args[0]));

      // String
      case 'length': return this.toString(args[0]).length;
      case 'offset': {
        const pattern = this.toString(args[0]);
        const str = this.toString(args[1]);
        const idx = str.toLowerCase().indexOf(pattern.toLowerCase());
        return idx >= 0 ? idx + 1 : 0; // 1-based, 0 = not found
      }

      // Conversion
      case 'value': return this.toNumber(args[0]);

      default:
        this.api.log(`NovaTalk: Unknown function '${name}'`);
        return null;
    }
  }

  // ---- Object resolution (find objects by type + name/number) ---------------

  private resolveObjectRef(ref: ObjectRef, env: Environment): CardObjectInfo | null {
    const identifier = this.evalExpr(ref.identifier, env);
    return this.api.findObject(ref.objectType, identifier);
  }

  private resolvePropertyObject(prop: PropertyAccess, env: Environment): CardObjectInfo | null {
    const objExpr = prop.object;
    if (objExpr.kind === 'objectRef') {
      return this.resolveObjectRef(objExpr, env);
    }
    if (objExpr.kind === 'me') {
      if (this.api.meObjectId) {
        return { id: this.api.meObjectId, type: 'unknown' };
      }
    }
    // If it's an identifier, try to resolve as an object id
    if (objExpr.kind === 'identifier') {
      const val = env.get(objExpr.name);
      if (val && typeof val === 'string') {
        return { id: val, type: 'unknown' };
      }
    }
    return null;
  }

  // ---- Type coercion (HyperTalk-style weak typing) -------------------------

  private toString(val: NovaTalkValue): string {
    if (val === null) return '';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    return String(val);
  }

  private toNumber(val: NovaTalkValue): number {
    if (val === null) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'boolean') return val ? 1 : 0;
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }

  private toBool(val: NovaTalkValue): boolean {
    if (val === null) return false;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val !== 0;
    if (typeof val === 'string') {
      if (val.toLowerCase() === 'true') return true;
      if (val.toLowerCase() === 'false') return false;
      return val.length > 0;
    }
    return false;
  }

  private isEqual(a: NovaTalkValue, b: NovaTalkValue): boolean {
    // Try numeric comparison first
    const na = Number(a);
    const nb = Number(b);
    if (!isNaN(na) && !isNaN(nb) && a !== '' && b !== '') {
      return na === nb;
    }
    // String comparison (case-insensitive, like HyperTalk)
    return this.toString(a).toLowerCase() === this.toString(b).toLowerCase();
  }
}

// ---------------------------------------------------------------------------
// Convenience: parse + run a handler
// ---------------------------------------------------------------------------

export function createInterpreter(api: NovaTalkHostAPI): Interpreter {
  return new Interpreter(api);
}
