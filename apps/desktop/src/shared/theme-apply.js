// Shared theme applier — every surface loads this. Reads the current theme from
// the main process via the `novaTheme` bridge, applies it to <html>, and keeps
// it in sync when Settings changes it. Safe no-op if the bridge is absent.
(() => {
  const root = document.documentElement;
  const apply = settings => {
    if (settings && settings.theme) root.setAttribute('data-theme', settings.theme);
  };
  const bridge = window.novaTheme;
  if (!bridge) return;
  bridge.get().then(apply).catch(() => {});
  bridge.onChanged(apply);
})();
