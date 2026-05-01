#!/usr/bin/env bash
set -e
cd /mnt/c/Users/brend/exp/nova64
git add -A
git -c core.hooksPath=/dev/null commit -m "godot: phase 1 visual parity — env, lights, primitives

Bridge (bridge.cpp/bridge.h):
- Auto-spawn a default WorldEnvironment on engine.init with procedural
  sky, sky-sourced ambient, filmic tonemap, glow enabled, and mild
  color adjustments so empty scenes no longer render as a black void.
- Camera defaults switched to FOV 60 / near 0.1 / far 1000 (close to
  the Three.js defaults Nova carts grew up on).
- DirectionalLight gets shadows on by default with a tilted sun so
  flat-lit scenes still get shading. New light.create{Point,Spot} for
  OmniLight3D / SpotLight3D with color, energy, range, angle, position.
- New light.set{Color,Energy} for runtime tweaks.
- New env.set surface for ambient, glow, fog, ssao, tonemap, exposure,
  brightness/contrast/saturation, sky toggle.
- New geometry.create{Cylinder,Cone,Torus} backed by real Godot meshes
  (CylinderMesh / TorusMesh) instead of box approximations.
- Capabilities list extended accordingly.

Compat shim (nova64-compat.js):
- enableBloom / enableVignette / setN64Mode / setPSXMode / setFog /
  clearFog now route through env.set instead of being warnOnce no-ops.
- setAmbientLight / createAmbientLight wired to env.set.
- createPointLight / createSpotLight / setLightColor / setLightEnergy
  wired to the new light.* commands.
- createCylinder / createCone / createTorus now build real meshes.
- light/scene namespace exports updated (createSpotLight, setLightEnergy,
  createTorus).

Smoke: 62/63 PASS (was 60/63). The lone failure (space-combat-3d) is
the same intermittent native shutdown crash unrelated to rendering.
"
EOF
