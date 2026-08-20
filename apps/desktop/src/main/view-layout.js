'use strict';

const { RAIL_WIDTH, TITLEBAR_HEIGHT } = require('./constants');

/**
 * Lays out the frameless window: the chrome view (custom titlebar + activity
 * rail) fills the whole window as the background frame; the content surfaces are
 * inset below the titlebar and right of the rail. All content views share the
 * same bounds and are always laid out — only visibility changes on switch, so
 * nothing reloads.
 */
function layout({ win, chrome, contentViews }) {
  const apply = () => {
    const [width, height] = win.getContentSize();
    chrome.setBounds({ x: 0, y: 0, width, height });
    const contentBounds = {
      x: RAIL_WIDTH,
      y: TITLEBAR_HEIGHT,
      width: Math.max(0, width - RAIL_WIDTH),
      height: Math.max(0, height - TITLEBAR_HEIGHT),
    };
    for (const view of contentViews) view.setBounds(contentBounds);
  };

  apply();
  win.on('resize', apply);
  return apply;
}

module.exports = { layout };
