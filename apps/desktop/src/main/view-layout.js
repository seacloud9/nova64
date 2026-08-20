'use strict';

const { RAIL_WIDTH } = require('./constants');

/**
 * Computes and applies bounds for the navigation rail and the content views.
 * The rail is a fixed-width column on the left; OS and Dev share the remaining
 * content area. Both content views are always laid out (so neither reloads on
 * switch) — visibility is what changes, handled by the window controller.
 */
function layout({ win, rail, contentViews }) {
  const apply = () => {
    const [width, height] = win.getContentSize();
    rail.setBounds({ x: 0, y: 0, width: RAIL_WIDTH, height });
    const contentBounds = {
      x: RAIL_WIDTH,
      y: 0,
      width: Math.max(0, width - RAIL_WIDTH),
      height,
    };
    for (const view of contentViews) view.setBounds(contentBounds);
  };

  apply();
  win.on('resize', apply);
  return apply;
}

module.exports = { layout };
