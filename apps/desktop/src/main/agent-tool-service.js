'use strict';

const { ipcMain } = require('electron');

/**
 * Host-side agent tool execution (Phase 5). Backs @nova64/agent-core's ToolRunner
 * with the opened workspace: read/list/search run freely; write requires approval
 * (enforced by agent-core's per-mode gating + approval policy). Only the trusted
 * Dev webContents may drive it. The renderer runs the agent loop and calls this
 * once per tool call — re-calling with `approved: true` after an approval card.
 */
class AgentToolService {
  /** @param {{ workspace: any, isTrustedSender?: (wc:any)=>boolean }} deps */
  constructor({ workspace, isTrustedSender } = {}) {
    this.workspace = workspace;
    this.isTrusted = isTrustedSender || (() => true);
    this.agent = null;
    this.ready = this.#init();
  }

  async #init() {
    this.agent = await import('@nova64/agent-core');
  }

  /** The tool host — method names match the agent-core tool specs' `handler`. */
  #host() {
    const ws = this.workspace;
    return {
      async readFile(args) {
        const content = await ws.readFile(String(args.path || ''));
        // Cap what we feed back into the model's context.
        return { path: args.path, content: content.slice(0, 60000) };
      },
      async listDir(args) {
        return { path: args.path || '', entries: await ws.listChildren(String(args.path || '')) };
      },
      async searchText(args) {
        return ws.searchText(String(args.query || ''), { max: 100 });
      },
      async writeFile(args) {
        await ws.writeFile(String(args.path || ''), String(args.content ?? ''));
        return { path: args.path, written: true };
      },
      async createDir(args) {
        await ws.mkdir(String(args.path || ''));
        return { path: args.path, created: true };
      },
      async movePath(args) {
        await ws.move(String(args.from || ''), String(args.to || ''));
        return { from: args.from, to: args.to, moved: true };
      },
      async deletePath(args) {
        await ws.remove(String(args.path || ''));
        return { path: args.path, deleted: true };
      },
    };
  }

  registerIpc() {
    const guard = event => {
      if (!this.isTrusted(event.sender)) throw new Error('untrusted sender');
    };
    ipcMain.removeHandler('agent:run-tool');
    ipcMain.handle('agent:run-tool', async (event, req) => {
      guard(event);
      await this.ready;
      if (!this.workspace || !this.workspace.root) {
        return { status: 'error', tool: req && req.tool, error: 'no workspace open' };
      }
      const { ToolRunner } = this.agent;
      const runner = new ToolRunner({ host: this.#host(), mode: (req && req.mode) || 'agent' });
      return runner.run(String(req && req.tool), (req && req.args) || {}, {
        approved: Boolean(req && req.approved),
      });
    });
  }

  dispose() {
    ipcMain.removeHandler('agent:run-tool');
  }
}

module.exports = { AgentToolService };
