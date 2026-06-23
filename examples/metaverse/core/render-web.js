// render-web.js — the reference RenderBackend (Three.js via nova64).
//
// Translates abstract world/avatar/camera + 2D UI intent into nova64.scene /
// nova64.camera / nova64.draw calls. A Godot or XR backend implements the same
// shape (see docs/METAVERSE.md) and registers under a different id; the app and
// plugins are unchanged.
//
// Colors from the UI layer are 0xAARRGGBB; we unpack to nova64.draw.rgba8.

function unpack(color) {
  const n = color >>> 0;
  if (n > 0xffffff) {
    return { a: (n >>> 24) & 0xff, r: (n >>> 16) & 0xff, g: (n >>> 8) & 0xff, b: n & 0xff };
  }
  return { r: (n >>> 16) & 0xff, g: (n >>> 8) & 0xff, b: n & 0xff, a: 255 };
}
function packDraw(color) {
  const c = unpack(color);
  return nova64.draw.rgba8 ? nova64.draw.rgba8(c.r, c.g, c.b, c.a) : (c.r << 16) | (c.g << 8) | c.b;
}
function hex(color) {
  const c = unpack(color);
  return (c.r << 16) | (c.g << 8) | c.b;
}

export function createWebBackend() {
  const avatars = new Map(); // id -> { body }
  return {
    id: 'web',

    init(world) {
      if (nova64.light.setAmbientLight) nova64.light.setAmbientLight(0x334455, 0.6);
      nova64.light.setDirectionalLight([-1, -2, -1], 0xfff0dd, 0.9);

      const floor = nova64.scene.createPlane(
        world.size || 80,
        world.size || 80,
        0x10141f,
        [0, 0, 0],
        {
          material: 'standard',
          color: 0x10141f,
          roughness: 1.0,
        }
      );
      nova64.scene.setRotation(floor, -Math.PI / 2, 0, 0);

      const ring = world.pillars == null ? 8 : world.pillars;
      const radius = world.ringRadius || 14;
      for (let i = 0; i < ring; i++) {
        const a = (i / ring) * Math.PI * 2;
        const pillar = nova64.scene.createCube(
          1.5,
          0x2a3550,
          [Math.cos(a) * radius, 2, Math.sin(a) * radius],
          {
            material: 'standard',
            color: 0x2a3550,
            roughness: 0.8,
          }
        );
        nova64.scene.setScale(pillar, 1, 3, 1);
      }
      const beacon = nova64.scene.createCube(1, 0xffcc44, [0, 0.5, 0], {
        material: 'emissive',
        color: 0xffcc44,
        intensity: 0.6,
      });
      nova64.scene.setScale(beacon, 0.4, 1, 0.4);
    },

    addAvatar(id, opts) {
      const c = hex(opts && opts.color != null ? opts.color : 0xff55aaff);
      const body = nova64.scene.createCube(1, c, [0, 0.9, 0], {
        material: 'standard',
        color: c,
        roughness: 0.7,
      });
      avatars.set(id, { body });
    },
    updateAvatar(id, pose) {
      const a = avatars.get(id);
      if (!a) return;
      nova64.scene.setPosition(a.body, pose.x, 0.9, pose.z);
      nova64.scene.setRotation(a.body, 0, pose.ry || 0, 0);
    },
    removeAvatar(id) {
      const a = avatars.get(id);
      if (a) {
        try {
          nova64.scene.destroyMesh(a.body);
        } catch (_) {
          /* ignore */
        }
      }
      avatars.delete(id);
    },

    setCamera(cam) {
      const eyeY = 1.6;
      const lookX = Math.sin(cam.yaw) * Math.cos(cam.pitch);
      const lookY = Math.sin(cam.pitch);
      const lookZ = Math.cos(cam.yaw) * Math.cos(cam.pitch);
      if (cam.mode === 'third') {
        const back = 6;
        nova64.camera.setCameraPosition(cam.x - lookX * back, eyeY + 2.5, cam.z - lookZ * back);
        nova64.camera.setCameraTarget(cam.x, eyeY, cam.z);
      } else {
        nova64.camera.setCameraPosition(cam.x, eyeY, cam.z);
        nova64.camera.setCameraTarget(cam.x + lookX, eyeY + lookY, cam.z + lookZ);
      }
    },

    // 2D UI ops (design space 640x360).
    drawRect(x, y, w, h, color) {
      nova64.draw.rectfill(x | 0, y | 0, w | 0, h | 0, packDraw(color));
    },
    drawText(text, x, y, color) {
      nova64.draw.print(text, x | 0, y | 0, packDraw(color));
    },
    drawCircle(x, y, r, color, filled) {
      if (nova64.draw.circle) nova64.draw.circle(x | 0, y | 0, r | 0, packDraw(color), !!filled);
      else
        nova64.draw.rectfill((x - r) | 0, (y - r) | 0, (r * 2) | 0, (r * 2) | 0, packDraw(color));
    },
    measureText(s) {
      return String(s).length * 6; // nova64 bitmap font ~6px advance
    },
    viewport() {
      return { w: 640, h: 360 };
    },
  };
}
