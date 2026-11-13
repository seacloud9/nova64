import {
  Color3,
  Color4,
  FreeCamera,
  MeshBuilder,
  Plane,
  Quaternion,
  RenderTargetTexture,
  ShaderMaterial,
  StandardMaterial,
  Vector3,
  MaterialPluginBase,
} from '@babylonjs/core';
import { SPLATFileLoader } from '@babylonjs/loaders/SPLAT/splatFileLoader.js';
import * as fflate from 'fflate';
import * as T from 'three';
import { portalTransform, exitPlane } from './portal-math.js';
import { effectGLSL } from './effects.js';

class WorldEffects extends MaterialPluginBase {
  constructor(material, state) {
    super(material, 'NovaWorldEffects', 200);
    this.state = state;
    this._enable(true);
  }
  getUniforms() {
    return { externalUniforms: ['worldTime', 'worldEffectMode'] };
  }
  bindForSubMesh(_buffer, _scene, _engine, subMesh) {
    subMesh.effect?.setFloat('worldTime', this.state.time);
    subMesh.effect?.setFloat('worldEffectMode', this.state.mode);
  }
  getCustomCode(type) {
    if (type === 'vertex')
      return {
        CUSTOM_VERTEX_DEFINITIONS:
          'uniform float worldTime; uniform float worldEffectMode;' + effectGLSL,
        CUSTOM_VERTEX_UPDATE: 'vColor=worldEffect(worldPos.xyz,vColor,worldTime,worldEffectMode);',
      };
    return null;
  }
}
export async function createBabylonHost(scene, engine, camera, specs) {
  const state = { time: 0, mode: 0 },
    worlds = [];
  let active = 0;
  let disposed = false;
  const originalMask = camera.layerMask,
    originalClear = scene.clearColor.clone();
  const portalCamera = new FreeCamera('splat-portal-camera', Vector3.Zero(), scene);
  portalCamera.minZ = 0.02;
  portalCamera.maxZ = 500;
  const target = new RenderTargetTexture(
    'live-splat-portal',
    { width: 640, height: 360 },
    scene,
    false,
    true
  );
  target.activeCamera = portalCamera;
  target.ignoreCameraViewport = true;
  target.renderParticles = false;
  const portalMaterial = new ShaderMaterial(
    'portal-aperture',
    scene,
    {
      vertexSource:
        'precision highp float; attribute vec3 position; uniform mat4 worldViewProjection; void main(){gl_Position=worldViewProjection*vec4(position,1.0);}',
      fragmentSource:
        'precision highp float; uniform sampler2D portalMap; uniform vec2 resolution; void main(){gl_FragColor=texture2D(portalMap,gl_FragCoord.xy/resolution);}',
    },
    {
      attributes: ['position'],
      uniforms: ['worldViewProjection', 'resolution'],
      samplers: ['portalMap'],
    }
  );
  portalMaterial.setTexture('portalMap', target);
  portalMaterial.backFaceCulling = true;
  const originalActiveCamera = scene.activeCamera;
  try {
    for (let index = 0; index < specs.length; index++) {
      const spec = specs[index],
        mask = 1 << (index + 8),
        meshes = [];
      const record = { spec, mask, meshes };
      worlds.push(record);
      const response = await fetch(spec.url);
      if (!response.ok) throw new Error(`Splat download failed (${response.status}): ${spec.url}`);
      const loader = new SPLATFileLoader({ flipY: false, fflate, disableAutoCameraLimits: true });
      const result = await loader.importMeshAsync(null, scene, await response.arrayBuffer(), '');
      const splat = result.meshes.find(m => m.getClassName() === 'GaussianSplattingMesh');
      if (!splat) throw new Error('Expected a Gaussian asset');
      meshes.push(...result.meshes);
      record.splat = splat;
      splat.rotation.x = Math.PI;
      splat.scaling.setAll(spec.scale);
      splat.position.fromArray(spec.offset);
      new WorldEffects(splat.material, state);
      const doorPosition = new T.Vector3(),
        doorRotation = new T.Quaternion(),
        doorScale = new T.Vector3();
      spec.door.decompose(doorPosition, doorRotation, doorScale);
      const portal = MeshBuilder.CreatePlane('portal', { width: 2.2, height: 3.2 }, scene);
      portal.position.copyFromFloats(...doorPosition.toArray());
      // Babylon's plane front faces local -Z; turn it to match the +Z entry side.
      portal.rotationQuaternion = new Quaternion(...doorRotation.toArray()).multiply(
        Quaternion.RotationAxis(Vector3.Up(), Math.PI)
      );
      portal.material = portalMaterial;
      meshes.push(portal);
      record.portal = portal;
      const frameMaterial = new StandardMaterial('portal-frame', scene);
      frameMaterial.disableLighting = true;
      frameMaterial.emissiveColor = Color3.FromHexString(
        '#' + spec.accent.toString(16).padStart(6, '0')
      );
      for (const [x, y, w, h] of [
        [-1.17, 0, 0.14, 3.48],
        [1.17, 0, 0.14, 3.48],
        [0, 1.67, 2.48, 0.14],
        [0, -1.67, 2.48, 0.14],
      ]) {
        const frame = MeshBuilder.CreateBox('frame', { width: w, height: h, depth: 0.18 }, scene);
        const p = new T.Vector3(x, y, 0.03).applyMatrix4(spec.door);
        frame.position.copyFromFloats(...p.toArray());
        frame.rotationQuaternion = new Quaternion(...doorRotation.toArray());
        frame.material = frameMaterial;
        meshes.push(frame);
      }
      const marker = MeshBuilder.CreateTorusKnot(
        'destination-marker',
        { radius: 0.32, tube: 0.1, radialSegments: 72, tubularSegments: 12 },
        scene
      );
      marker.position.copyFromFloats(...spec.marker);
      const markerMaterial = new StandardMaterial('marker', scene);
      markerMaterial.disableLighting = true;
      markerMaterial.emissiveColor = new Color3(0.3, 0.7, 0.95);
      marker.material = markerMaterial;
      meshes.push(marker);
      record.marker = marker;
      const floor = MeshBuilder.CreateGround('proxy-floor', { width: 24, height: 24 }, scene);
      floor.position.y = -0.04;
      const floorMaterial = new StandardMaterial('proxy-floor', scene);
      floorMaterial.disableLighting = true;
      floorMaterial.emissiveColor = Color3.FromHexString(
        '#' + spec.floor.toString(16).padStart(6, '0')
      );
      floor.material = floorMaterial;
      meshes.push(floor);
      for (const mesh of meshes) mesh.layerMask = mask;
    }
    setWorld(0);
  } catch (error) {
    dispose();
    throw error;
  } finally {
    scene.activeCamera = originalActiveCamera;
  }
  function setWorld(index) {
    active = index;
    camera.layerMask = worlds[active].mask;
    const c = Color3.FromHexString('#' + specs[index].background.toString(16).padStart(6, '0'));
    scene.clearColor = new Color4(c.r, c.g, c.b, 1);
  }
  function render(time, mode) {
    state.time = time;
    state.mode = mode;
    const width = engine.getRenderWidth(),
      height = engine.getRenderHeight();
    if (target.getSize().width !== width || target.getSize().height !== height)
      target.resize({ width, height });
    portalMaterial.setVector2('resolution', { x: width, y: height });
    const source = worlds[active],
      destination = worlds[1 - active];
    const matrix = new T.Matrix4().fromArray(camera.getWorldMatrix().asArray());
    const view = portalTransform(source.spec.door, destination.spec.door).multiply(matrix);
    const p = new T.Vector3(),
      q = new T.Quaternion(),
      s = new T.Vector3();
    view.decompose(p, q, s);
    portalCamera.position.copyFromFloats(...p.toArray());
    portalCamera.rotationQuaternion = new Quaternion(...q.toArray());
    portalCamera.fov = camera.fov;
    portalCamera.layerMask = destination.mask;
    target.renderList = destination.meshes.filter(m => m !== destination.portal);
    const clipping = exitPlane(destination.spec.door);
    const oldPlane = scene.clipPlane,
      oldCamera = scene.activeCamera,
      oldClear = scene.clearColor;
    try {
      scene.clipPlane = new Plane(
        -clipping.normal.x,
        -clipping.normal.y,
        -clipping.normal.z,
        -clipping.constant
      );
      const c = Color3.FromHexString(
        '#' + destination.spec.background.toString(16).padStart(6, '0')
      );
      scene.clearColor = new Color4(c.r, c.g, c.b, 1);
      target.render();
    } finally {
      scene.clipPlane = oldPlane;
      scene.activeCamera = oldCamera;
      scene.clearColor = oldClear;
    }
    for (const world of worlds) world.marker.rotation.y = time * 0.5;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    camera.layerMask = originalMask;
    scene.clearColor = originalClear;
    const materials = new Set();
    for (const world of worlds)
      for (const mesh of world.meshes) {
        if (mesh.material && mesh.material !== portalMaterial) materials.add(mesh.material);
        mesh.dispose();
      }
    for (const material of materials) material.dispose();
    portalMaterial.dispose();
    target.dispose();
    portalCamera.dispose();
  }
  return {
    render,
    setWorld,
    dispose,
    worlds,
    portalCamera,
    target,
    counts: worlds.map(w => w.splat.splatCount),
  };
}

// Re-export fixture constructors from the same bundled Babylon instance.
export { MeshBuilder, StandardMaterial, Color3 };
