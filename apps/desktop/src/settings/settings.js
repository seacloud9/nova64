'use strict';

// Settings control center: theme picker + about. Uses the novaSettings bridge.
(() => {
  const api = window.novaSettings;
  if (!api) return;

  // Representative preview swatches per theme (bg / panel / accent).
  const THEME_META = {
    dark: { label: 'Dark', swatch: ['#0f0f17', '#16161f', '#7c5cff'] },
    midnight: { label: 'Midnight', swatch: ['#05060d', '#0a0c16', '#4dd0ff'] },
    light: { label: 'Light', swatch: ['#f6f6fb', '#ffffff', '#6b46ff'] },
    'high-contrast': { label: 'High Contrast', swatch: ['#000000', '#0a0a0a', '#ffd400'] },
  };

  const grid = document.getElementById('theme-grid');
  const aboutEl = document.getElementById('about');
  let current = 'dark';

  function renderThemes(themes) {
    grid.textContent = '';
    for (const id of themes) {
      const meta = THEME_META[id] || { label: id, swatch: ['#222', '#333', '#7c5cff'] };
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `theme-card${id === current ? ' is-selected' : ''}`;
      card.dataset.theme = id;

      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      for (const color of meta.swatch) {
        const s = document.createElement('span');
        s.style.background = color;
        swatch.appendChild(s);
      }

      const name = document.createElement('div');
      name.className = 'theme-name';
      name.innerHTML = `${meta.label}${id === current ? ' <span class="check">✓</span>' : ''}`;

      card.append(swatch, name);
      card.addEventListener('click', async () => {
        current = await api.setTheme(id);
        renderThemes(themes); // reflect selection (theme-apply handles the visual switch)
      });
      grid.appendChild(card);
    }
  }

  function renderAbout(state) {
    const info = api.info || {};
    const rows = [
      ['Application', 'Nova64 Desktop'],
      ['Stage', 'Phases 1–2 preview'],
      ['Active theme', THEME_META[state.theme]?.label || state.theme],
      ['Platform', info.platform],
      ['Electron', info.electron],
      ['Chromium', info.chrome],
      ['Node', info.node],
    ];
    aboutEl.textContent = '';
    for (const [k, v] of rows) {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      aboutEl.append(dt, dd);
    }
  }

  api.get().then(state => {
    current = state.theme;
    renderThemes(state.themes || ['dark']);
    renderAbout(state);
  });

  // Keep the About "active theme" line in sync if changed elsewhere.
  if (window.novaTheme) {
    window.novaTheme.onChanged(state => {
      current = state.theme;
      renderAbout(state);
      const cards = document.querySelectorAll('.theme-card');
      cards.forEach(c => c.classList.toggle('is-selected', c.dataset.theme === current));
    });
  }
})();
