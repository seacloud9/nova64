'use strict';

const { TITLEBAR_HEIGHT } = require('./constants');

/**
 * Lays out the frameless window: the chrome view (custom titlebar + top menu
 * bar) fills the whole window as the background frame; the content surfaces are
 * inset below the titlebar (full width). All content views share the same bounds
 * and are always laid out — only visibility changes on switch, so nothing reloads.
 */
function layout({ win, chrome, contentViews }) {
  const apply = () => {
    const [width, height] = win.getContentSize();
    chrome.setBounds({ x: 0, y: 0, width, height });
    const contentBounds = {
      x: 0,
      y: TITLEBAR_HEIGHT,
      width,
      height: Math.max(0, height - TITLEBAR_HEIGHT),
    };
    for (const view of contentViews) view.setBounds(contentBounds);
  };

  apply();
  win.on('resize', apply);
  return apply;
}

module.exports = { layout };
