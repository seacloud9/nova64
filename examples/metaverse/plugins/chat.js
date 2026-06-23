// chat.js — chat as a plugin, over a swappable transport provider.
//
// Default provider = the colyseus `event` relay (room.send('chat',…) → server
// broadcasts to everyone else → onNetMessage). Swap it by passing
// chatPlugin({ provider }) with { send(text, ctx), receive(evt) -> {from,text} }
// (relay-style) or a provider that calls a deliver() callback from its own
// socket. Commands register via ctx.registerCommand.
//
// Input uses nova64.startTextInput (DOM input = native mobile keyboard) with
// onSubmit/onCancel, so typing works on phones. A Chat button opens it on touch.

import { Panel, List, Button, Text } from '../core/ui.js';

const MAX_LOG = 6;

// Built-in transport: the colyseus relay already wired into nova64.net.
function colyseusProvider() {
  return {
    id: 'colyseus',
    send(text, ctx) {
      ctx.sendRelay('chat', { text });
    },
    receive(evt) {
      if (evt && evt.type === 'chat' && evt.msg && typeof evt.msg.text === 'string') {
        return { from: evt.from, text: evt.msg.text };
      }
      return null;
    },
  };
}

export function chatPlugin(opts = {}) {
  const provider = opts.provider || colyseusProvider();
  const log = [];
  let inputOpen = false;

  function push(name, text) {
    log.push({ name, text });
    while (log.length > MAX_LOG) log.shift();
  }
  function nameFor(id, ctx) {
    if (ctx.room() && id === ctx.room().sessionId) {
      const me = ctx.me();
      return (me && me.displayName) || 'me';
    }
    const o = ctx.others.get(id);
    return (o && o.name) || (id || '').slice(0, 4);
  }
  function myName(ctx) {
    const me = ctx.me();
    return (me && me.displayName) || 'me';
  }

  function open(ctx) {
    if (inputOpen || typeof nova64.startTextInput !== 'function') return;
    if (
      typeof document !== 'undefined' &&
      document.exitPointerLock &&
      document.pointerLockElement
    ) {
      document.exitPointerLock();
    }
    inputOpen = true;
    nova64.startTextInput({
      placeholder: 'say something… (Enter to send, Esc to cancel)',
      maxLen: 120,
      onSubmit: text => {
        inputOpen = false;
        submit(ctx, text);
      },
      onCancel: () => {
        inputOpen = false;
      },
    });
  }

  function submit(ctx, raw) {
    const text = (raw || '').trim();
    if (!text) return;
    if (text[0] === '/') {
      const sp = text.indexOf(' ');
      const name = (sp < 0 ? text.slice(1) : text.slice(1, sp)).toLowerCase();
      const args = sp < 0 ? '' : text.slice(sp + 1);
      if (ctx.runCommand(name, args)) return;
      push('*', 'unknown command: /' + name);
      return;
    }
    provider.send(text, ctx);
    push(myName(ctx), text); // local echo (relay excludes the sender)
  }

  return {
    id: 'chat',

    init(ctx) {
      ctx.registerCommand('help', () => push('*', 'commands: /me <action>, /help'));
      ctx.registerCommand('me', (args, c) => {
        const action = (args || '').trim();
        if (!action) return;
        const line = myName(c) + ' ' + action;
        c.sendRelay('chat', { text: line, emote: true });
        push('*', line);
      });
    },

    update(_dt, ctx) {
      // Open on Enter / T when not already typing (desktop). Mobile uses the button.
      if (!inputOpen && (ctx.input.key('Enter') || ctx.input.key('KeyT'))) open(ctx);
    },

    onNetMessage(evt, ctx) {
      const m = provider.receive(evt);
      if (m) push(nameFor(m.from, ctx), m.text);
    },

    renderUI(ctx) {
      const lines = log.map(e => e.name + ': ' + e.text);
      if (inputOpen) lines.push('typing…');
      const nodes = [
        Panel({ x: 8, y: 44, anchor: 'bl', bg: 0xaa0b1020 }, [
          Text({ value: 'CHAT', color: ctx.theme.accent }),
          List({ items: lines.length ? lines : ['(no messages yet)'], color: ctx.theme.dim }),
        ]),
        // Chat button (bottom-right) — primary entry on touch.
        Panel({ x: 8, y: 8, anchor: 'br', bg: 0x00000000 }, [
          Button({ id: 'chat', label: 'CHAT', active: inputOpen, onTap: () => open(ctx) }),
        ]),
      ];
      return nodes;
    },
  };
}
