'use strict';

// Navigation rail logic. Talks to the main process only through the narrow
// `novaDesktop` bridge exposed by the sandboxed preload.
(() => {
  const buttons = Array.from(document.querySelectorAll('.rail-btn'));

  function reflect(activeView) {
    for (const btn of buttons) {
      const isActive = btn.dataset.view === activeView;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    }
  }

  for (const btn of buttons) {
    btn.addEventListener('click', async () => {
      const active = await window.novaDesktop.switchView(btn.dataset.view);
      if (active) reflect(active);
    });
  }

  // Keep the rail in sync if the active surface changes elsewhere.
  window.novaDesktop.onActiveViewChanged(reflect);
  window.novaDesktop.getActiveView().then(v => {
    if (v) reflect(v);
  });
})();
