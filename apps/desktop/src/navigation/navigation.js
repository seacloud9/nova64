'use strict';

// Chrome frame logic: surface switching + frameless window controls. Talks to
// the main process only through the narrow `novaShell` bridge.
(() => {
  const shell = window.novaShell;
  if (!shell) return;

  // ── window switching (top menu bar + left icon rail) ──
  const buttons = Array.from(document.querySelectorAll('.menu-item, .rail-btn'));
  function reflect(activeView) {
    for (const btn of buttons) {
      const isActive = btn.dataset.view === activeView;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    }
  }
  for (const btn of buttons) {
    btn.addEventListener('click', async () => {
      const active = await shell.switchView(btn.dataset.view);
      if (active) reflect(active);
    });
  }
  shell.onActiveViewChanged(reflect);
  shell.getActiveView().then(v => v && reflect(v));

  // ── rail visibility (Alt+B) ──
  const rail = document.getElementById('rail');
  if (shell.onRailVisibleChanged) {
    shell.onRailVisibleChanged(visible => {
      if (rail) rail.classList.toggle('is-hidden', !visible);
    });
  }

  // ── frameless window controls ──
  const wire = (id, action) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => shell.windowAction(action));
  };
  wire('win-min', 'minimize');
  wire('win-max', 'toggle-maximize');
  wire('win-close', 'close');

  // double-click the drag area toggles maximize (standard behaviour)
  const drag = document.querySelector('.title-drag');
  if (drag) drag.addEventListener('dblclick', () => shell.windowAction('toggle-maximize'));
})();
