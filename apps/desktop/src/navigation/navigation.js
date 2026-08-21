'use strict';

// Chrome frame logic: surface switching + frameless window controls. Talks to
// the main process only through the narrow `novaShell` bridge.
(() => {
  const shell = window.novaShell;
  if (!shell) return;

  // ── active-view reflection (rail buttons + Window-menu radios) ──
  const railButtons = Array.from(document.querySelectorAll('.rail-btn'));
  const viewRows = Array.from(document.querySelectorAll('.menu-row[data-view]'));
  function reflect(activeView) {
    for (const btn of railButtons) {
      const isActive = btn.dataset.view === activeView;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    }
    for (const row of viewRows) {
      row.setAttribute('aria-checked', String(row.dataset.view === activeView));
    }
  }
  shell.onActiveViewChanged(reflect);
  shell.getActiveView().then(v => v && reflect(v));

  // Rail buttons switch views directly.
  for (const btn of railButtons) {
    btn.addEventListener('click', async () => {
      const active = await shell.switchView(btn.dataset.view);
      if (active) reflect(active);
    });
  }

  // ── dropdown menu bar (File / Window) ──
  const menus = Array.from(document.querySelectorAll('.menu'));

  const scrim = document.getElementById('menu-scrim');
  let overlayOn = false;
  function setOverlay(on) {
    if (on === overlayOn) return;
    overlayOn = on;
    if (scrim) scrim.hidden = !on;
    // Ask the host to raise/lower the chrome frame so the dropdown isn't hidden
    // behind the content surfaces.
    if (shell.setOverlay) shell.setOverlay(on);
  }

  function closeMenus() {
    for (const m of menus) {
      m.classList.remove('is-open');
      m.querySelector('.menu-top').setAttribute('aria-expanded', 'false');
      m.querySelector('.menu-dropdown').hidden = true;
      for (const r of m.querySelectorAll('.menu-row')) r.classList.remove('is-focused');
    }
    setOverlay(false);
  }

  function openMenu(menu) {
    for (const m of menus) {
      const isTarget = m === menu;
      m.classList.toggle('is-open', isTarget);
      m.querySelector('.menu-top').setAttribute('aria-expanded', String(isTarget));
      m.querySelector('.menu-dropdown').hidden = !isTarget;
    }
    setOverlay(true);
  }

  // Dispatch a menu command to the host and close the menu.
  async function runCommand(cmd) {
    closeMenus();
    if (!cmd) return;
    if (cmd.startsWith('view:')) {
      const active = await shell.switchView(cmd.slice(5));
      if (active) reflect(active);
    } else if (cmd === 'window:close') {
      shell.windowAction('close');
    } else if (shell.menuCommand) {
      shell.menuCommand(cmd); // toggle-rail, dev:open, dev:run, dev:save
    }
  }

  for (const menu of menus) {
    const top = menu.querySelector('.menu-top');
    top.addEventListener('click', e => {
      e.stopPropagation();
      if (menu.classList.contains('is-open')) closeMenus();
      else openMenu(menu);
    });
    // When any menu is open, hovering a sibling top switches to it (native feel).
    top.addEventListener('mouseenter', () => {
      if (menus.some(m => m.classList.contains('is-open'))) openMenu(menu);
    });
    for (const row of menu.querySelectorAll('.menu-row')) {
      row.addEventListener('click', e => {
        e.stopPropagation();
        runCommand(row.dataset.cmd);
      });
    }
  }

  // Dismiss on outside click or Escape.
  document.addEventListener('click', closeMenus);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenus();
  });

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
