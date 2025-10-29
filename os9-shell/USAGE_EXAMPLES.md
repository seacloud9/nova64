# nova64 OS 9 Shell - Usage Examples

## 🚀 Getting Started

### 1. Installation & Running

```bash
cd os9-shell
pnpm install
pnpm dev
```

Visit http://localhost:3000 (or the port shown in terminal)

### 2. Basic Interaction

Open browser console and interact with the OS:

```javascript
// Access the global context
const ctx = window.novaContext;

// Launch applications
await ctx.launchApp('com.nova64.notes');
await ctx.launchApp('com.nova64.paint');
await ctx.launchApp('com.nova64.profiler');

// All three apps should now appear as windows
```

## 📁 Filesystem Examples

### Writing and Reading Files

```javascript
// Write a text file
await ctx.write('/Users/Player/Documents/hello.txt', 'Hello, nova64!');

// Read it back
const content = await ctx.read('/Users/Player/Documents/hello.txt');
console.log(content); // "Hello, nova64!"

// Append to file
await ctx.write('/Users/Player/Documents/log.txt', 'Line 1\n');
await ctx.write('/Users/Player/Documents/log.txt', 'Line 2\n', { append: true });

// Read binary data (ArrayBuffer)
const imageData = new Uint8Array([/* image bytes */]);
await ctx.write('/Users/Player/Pictures/photo.png', imageData.buffer);
```

### Directory Operations

```javascript
// Create nested directories
await ctx.mkdir('/Users/Player/Projects/MyApp');

// List directory contents
const files = await ctx.readdir('/Users/Player/Documents');
console.log(files); // ['hello.txt', 'log.txt', 'Notes.txt']

// Check if path exists
const exists = await ctx.exists('/Users/Player/Documents/hello.txt');
console.log(exists); // true

// Get file stats
const stat = await ctx.stat('/Users/Player/Documents/hello.txt');
console.log(stat);
// {
//   path: '/Users/Player/Documents/hello.txt',
//   type: 'file',
//   size: 14,
//   created: 1234567890,
//   modified: 1234567890
// }

// Delete file
await ctx.rm('/Users/Player/Documents/hello.txt');

// Delete directory recursively
await ctx.rm('/Users/Player/Projects', { recursive: true });
```

### Aliases (Symbolic Links)

```javascript
// Create an alias
await ctx.createAlias('/Applications', '/Users/Player/Desktop/MyApps');

// Resolve alias to target
const target = await ctx.resolveAlias('/Users/Player/Desktop/MyApps');
console.log(target); // '/Applications'

// Reading through an alias
const content = await ctx.read('/Users/Player/Desktop/MyApps/README.txt');
// Automatically resolves and reads from /Applications/README.txt
```

## 🪟 Window Management

```javascript
// Create a custom window
const windowId = ctx.createWindow({
  title: 'My Window',
  x: 200,
  y: 100,
  width: 500,
  height: 400,
  content: '<h1>Hello from custom window!</h1>'
});

// Focus a window
ctx.focusWindow(windowId);

// Close a window
ctx.closeWindow(windowId);
```

## 🎨 UI Interactions

### Alerts

```javascript
// Simple alert
const result = await ctx.alert({
  title: 'Save Changes',
  message: 'Do you want to save your changes?',
  buttons: ['Don't Save', 'Cancel', 'Save']
});

console.log(result); // 'Save', 'Cancel', or "Don't Save"

// Alert with icon
await ctx.alert({
  title: 'Error',
  message: 'An error occurred while saving the file.',
  buttons: ['OK'],
  icon: 'error'
});

// Confirm dialog
const confirmed = await ctx.alert({
  title: 'Delete File',
  message: 'Are you sure you want to delete this file? This cannot be undone.',
  buttons: ['Cancel', 'Delete'],
  icon: 'warning'
});

if (confirmed === 'Delete') {
  // Proceed with deletion
}
```

### Toast Notifications

```javascript
// Simple toast (auto-disappears after 3 seconds)
ctx.toast('File saved successfully!');
ctx.toast('Network connection restored');
ctx.toast('3 new messages');
```

### Control Strip

```javascript
// Add a custom control strip item
ctx.registerControlStrip({
  id: 'com.example.mywidget',
  icon: '🎮',
  label: 'Game',
  onClick: () => {
    console.log('Game widget clicked!');
  }
});

// Add a widget with custom rendering
ctx.registerControlStrip({
  id: 'com.example.timer',
  icon: '⏱️',
  label: 'Timer',
  render: (container) => {
    const display = document.createElement('span');
    display.textContent = '00:00';
    container.appendChild(display);
    
    let seconds = 0;
    setInterval(() => {
      seconds++;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      display.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
  }
});
```

## 🎯 Event Handling

### Listen to System Events

```javascript
// Listen for app launches
ctx.on('app:launched', (evt) => {
  console.log('App launched:', evt.payload.appId);
  ctx.toast(`${evt.payload.appId} started`);
});

// Listen for filesystem changes
ctx.on('fs:changed', (evt) => {
  console.log('File changed:', evt.payload.path);
});

// Listen for window events
ctx.on('window:created', (evt) => {
  console.log('New window:', evt.payload);
});

ctx.on('window:focused', (evt) => {
  console.log('Window focused:', evt.payload.windowId);
});

// Listen to all events (wildcard)
ctx.on('*', (evt) => {
  console.log('Event:', evt.type, evt.payload);
});
```

### Emit Custom Events

```javascript
// Emit custom event
ctx.emit({
  type: 'game:score',
  payload: { score: 1000, level: 5 },
  timestamp: Date.now()
});

// Another component listens
ctx.on('game:score', (evt) => {
  console.log(`Score: ${evt.payload.score}, Level: ${evt.payload.level}`);
});
```

## 🔧 Creating a Complete Application

Here's a full example of a todo list app:

```javascript
// src/apps/todo.ts
import type { Nova64App, NovaContext } from '../types';
import { novaContext } from '../os/context';

const todoApp: Nova64App = {
  id: 'com.example.todo',
  name: 'Todo List',
  icon: '✅',

  menus: [
    {
      label: 'File',
      submenu: [
        { id: 'save', label: 'Save', accelerator: '⌘S' },
        { id: 'clear-all', label: 'Clear All' },
      ],
    },
  ],

  async mount(el: HTMLElement, ctx: NovaContext) {
    // Load saved todos
    let todos: string[] = [];
    try {
      const data = await ctx.read('/Users/Player/Documents/todos.json');
      todos = JSON.parse(data as string);
    } catch {
      todos = [];
    }

    // Render UI
    el.innerHTML = `
      <div style="height: 100%; display: flex; flex-direction: column; padding: 16px;">
        <h2 style="margin-bottom: 12px;">My Todos</h2>
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <input 
            id="todo-input" 
            type="text" 
            placeholder="Add a new todo..."
            style="flex: 1; padding: 4px 8px; font-size: 13px;"
          />
          <button id="add-btn" class="button">Add</button>
        </div>
        <div id="todo-list" style="flex: 1; overflow-y: auto;"></div>
        <div style="margin-top: 12px; text-align: right;">
          <button id="save-btn" class="button default">Save</button>
        </div>
      </div>
    `;

    const input = el.querySelector('#todo-input') as HTMLInputElement;
    const addBtn = el.querySelector('#add-btn') as HTMLButtonElement;
    const saveBtn = el.querySelector('#save-btn') as HTMLButtonElement;
    const listEl = el.querySelector('#todo-list') as HTMLDivElement;

    const renderTodos = () => {
      listEl.innerHTML = todos
        .map(
          (todo, idx) => `
          <div style="padding: 8px; border-bottom: 1px solid #DDD; display: flex; justify-content: space-between; align-items: center;">
            <span>${todo}</span>
            <button class="button" data-idx="${idx}">Delete</button>
          </div>
        `
        )
        .join('');

      // Add delete handlers
      listEl.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-idx')!);
          todos.splice(idx, 1);
          renderTodos();
        });
      });
    };

    const addTodo = () => {
      const text = input.value.trim();
      if (text) {
        todos.push(text);
        input.value = '';
        renderTodos();
      }
    };

    const saveTodos = async () => {
      await ctx.write('/Users/Player/Documents/todos.json', JSON.stringify(todos, null, 2));
      ctx.toast('Todos saved!');
    };

    addBtn.addEventListener('click', addTodo);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addTodo();
    });
    saveBtn.addEventListener('click', saveTodos);

    renderTodos();
  },

  unmount() {
    // Cleanup if needed
  },

  onEvent(evt) {
    if (evt.type === 'menu:command') {
      if (evt.payload.commandId === 'save') {
        // Handle save
      } else if (evt.payload.commandId === 'clear-all') {
        // Handle clear all
      }
    }
  },

  getInfo() {
    return {
      name: 'Todo List',
      version: '1.0.0',
      description: 'Simple todo list manager',
      author: 'Example Corp',
      icon: '✅',
    };
  },
};

// Register
novaContext.registerApp(todoApp);
export default todoApp;
```

Then import in `src/main.tsx`:

```typescript
import './apps/todo';
```

## 💾 Preferences

```javascript
// Save user preferences
await ctx.setPref('theme', 'dark');
await ctx.setPref('fontSize', 14);
await ctx.setPref('notifications', true);

// Read preferences
const theme = await ctx.getPref('theme');
const fontSize = await ctx.getPref('fontSize');
const notifications = await ctx.getPref('notifications');

console.log(theme); // 'dark'
console.log(fontSize); // 14
console.log(notifications); // true

// Preferences are stored in /Users/Player/Library/Preferences/com.nova64.shell.json
```

## 🎮 Running the Examples

Open browser console at http://localhost:3000 and paste these examples to see them in action!

```javascript
// Full demo script
(async () => {
  const ctx = window.novaContext;
  
  // 1. Create some files
  await ctx.write('/Users/Player/Documents/welcome.txt', 'Welcome to nova64!');
  await ctx.mkdir('/Users/Player/Projects');
  await ctx.write('/Users/Player/Projects/README.md', '# My Project\n\nThis is amazing!');
  
  // 2. Launch apps
  ctx.toast('Launching applications...');
  await ctx.launchApp('com.nova64.notes');
  await ctx.launchApp('com.nova64.paint');
  
  // 3. Show alert
  setTimeout(async () => {
    const result = await ctx.alert({
      title: 'Welcome!',
      message: 'Welcome to nova64 OS. Explore the filesystem and applications!',
      buttons: ['Got it!'],
      icon: 'info'
    });
  }, 2000);
  
  // 4. List files
  const files = await ctx.readdir('/Users/Player/Documents');
  console.log('Documents:', files);
})();
```

## 🌟 Tips & Tricks

1. **Drag windows** by their title bar
2. **Double-click title bar** to windowshade (roll up)
3. **Click zoom box** (right button in title) to maximize
4. **Toggle scanlines** from control strip for retro CRT effect
5. **Enable FPS counter** to see performance
6. **Adjust brightness** to change overall screen brightness
7. **Check System Profiler** to see your hardware info

## 🐛 Debugging

```javascript
// Enable verbose logging
ctx.on('*', (evt) => console.log(evt));

// Check running apps
console.log(ctx.getRunningApps());

// Inspect filesystem
const allFiles = await ctx.readdir('/');
console.log('Root:', allFiles);

// Check preferences
const prefs = await ctx.read('/Users/Player/Library/Preferences/com.nova64.shell.json');
console.log('Preferences:', JSON.parse(prefs));
```

---

**Have fun building with nova64 OS!** 🌟
