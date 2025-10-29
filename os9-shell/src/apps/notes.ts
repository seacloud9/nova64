// Notes App - Simple text editor
import type { Nova64App, NovaContext } from '../types';
import { novaContext } from '../os/context';

const notesApp: Nova64App = {
  id: 'com.nova64.notes',
  name: 'Notes',
  icon: '📝',

  menus: [
    {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: '⌘N' },
        { label: 'Open...', accelerator: '⌘O' },
        { label: 'Save', accelerator: '⌘S' },
        { type: 'separator', label: '' },
        { label: 'Close', accelerator: '⌘W' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: '⌘Z' },
        { label: 'Redo', accelerator: '⌘⇧Z' },
        { type: 'separator', label: '' },
        { label: 'Cut', accelerator: '⌘X' },
        { label: 'Copy', accelerator: '⌘C' },
        { label: 'Paste', accelerator: '⌘V' },
      ],
    },
  ],

  mount(el: HTMLElement, ctx: NovaContext) {
    el.innerHTML = `
      <div style="height: 100%; display: flex; flex-direction: column; font-family: 'Courier New', monospace;">
        <textarea
          id="notes-textarea"
          style="
            flex: 1;
            border: none;
            padding: 12px;
            font-family: inherit;
            font-size: 13px;
            resize: none;
            outline: none;
          "
          placeholder="Start typing your notes..."
        ></textarea>
        <div style="
          padding: 4px 8px;
          background: #EEEEEE;
          border-top: 1px solid #999;
          font-size: 11px;
          display: flex;
          justify-content: space-between;
        ">
          <span id="notes-status">Ready</span>
          <span id="notes-chars">0 characters</span>
        </div>
      </div>
    `;

    const textarea = el.querySelector('#notes-textarea') as HTMLTextAreaElement;
    const status = el.querySelector('#notes-status') as HTMLSpanElement;
    const chars = el.querySelector('#notes-chars') as HTMLSpanElement;

    textarea.addEventListener('input', () => {
      chars.textContent = `${textarea.value.length} characters`;
      status.textContent = 'Modified';
    });

    // Load last saved note
    ctx.read('/Users/Player/Documents/Notes.txt')
      .then((content) => {
        textarea.value = content as string;
        chars.textContent = `${textarea.value.length} characters`;
      })
      .catch(() => {
        // File doesn't exist yet
      });
  },

  unmount() {
    // Cleanup if needed
  },

  getInfo() {
    return {
      name: 'Notes',
      version: '1.0',
      description: 'Simple text editor for quick notes',
      author: 'nova64 OS',
      icon: '📝',
    };
  },
};

// Register the app
novaContext.registerApp(notesApp);

export default notesApp;
