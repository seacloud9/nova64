// Guided views of the existing licensed scans; no extra assets to download.
export const showcases = {
  apartment: {
    title: 'AFTERIMAGE / THE ROOM REMEMBERS',
    caption: 'A captured room assembles from light, then returns to its original colors.',
    duration: 24,
  },
  relic: {
    title: 'RELIC / MATTER INTO SIGNAL',
    caption: 'Orbit a scanned artifact as its surface dissolves and reforms.',
    duration: 28,
  },
  portal: {
    title: 'THRESHOLD / TWO PLACES, ONE DOOR',
    caption: 'Travel from a captured apartment into the relic gallery.',
    duration: 24,
  },
};

function lookAt(position, target) {
  return Math.atan2(position[0] - target[0], position[2] - target[2]);
}

export function showcaseFrame(name, elapsed) {
  const t = elapsed % showcases[name].duration;
  if (name === 'apartment') {
    const position = [0.28 * Math.sin(t * 0.22), 1.6, 2 - 0.35 * Math.sin(t * 0.15)];
    return {
      world: 0,
      position,
      yaw: lookAt(position, [-0.5, 1.6, -3]),
      effect: t < 11 ? 1 : t < 18 ? 0 : 3,
      time: t,
    };
  }
  if (name === 'relic') {
    const angle = (t * Math.PI * 2) / 28;
    const position = [3.4 * Math.sin(angle), 1.6, 5 - 3.4 * Math.cos(angle)];
    return {
      world: 1,
      position,
      yaw: lookAt(position, [0, 1.6, 5]),
      effect: t < 8 ? 0 : t < 19 ? 2 : 3,
      time: t,
    };
  }
  // The camera pose is continuous across the linked door transform at t=10.
  return t < 10
    ? { world: 0, position: [0, 1.6, 2 - t * 0.4], yaw: 0, effect: 0, time: t }
    : {
        world: 1,
        position: [0, 1.6, (t - 10) * 0.18],
        yaw: Math.PI,
        effect: t < 19 ? 0 : 3,
        time: t,
      };
}
