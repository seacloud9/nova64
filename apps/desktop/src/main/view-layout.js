'use strict';

const { TITLEBAR_HEIGHT, RAIL_WIDTH } = require('./constants');

/**
 * Lays out the frameless window: the chrome view (titlebar menu + left icon
 * rail) fills the whole window as the background frame; the content surfaces are
 * inset below the titlebar and right of the rail. When the rail is hidden the
 * content expands left to cover it. All content views share the same bounds and
 * are always laid out — only visibility changes on switch, so nothing reloads.
 */
function layout({ win, chrome, contentViews, isRailVisible }) {
  const apply = () => {
    const [width, height] = win.getContentSize();
    chrome.setBounds({ x: 0, y: 0, width, height });
    const railW = isRailVisible() ? RAIL_WIDTH : 0;
    const contentBounds = {
      x: railW,
      y: TITLEBAR_HEIGHT,
      width: Math.max(0, width - railW),
      height: Math.max(0, height - TITLEBAR_HEIGHT),
    };
    for (const view of contentViews) view.setBounds(contentBounds);
  };

  apply();
  win.on('resize', apply);
  return apply;
}

module.exports = { layout };
