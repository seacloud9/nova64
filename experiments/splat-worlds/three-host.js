import * as T from 'three';
import { SplatMesh, SparkRenderer, dyno } from '@sparkjsdev/spark';
import { clipProjection, exitPlane, portalTransform } from './portal-math.js';
import { effectGLSL } from './effects.js';

export async function createThreeHost(scene, renderer, camera, specs) {
  const time = dyno.dynoFloat(0),
    mode = dyno.dynoFloat(0);
  const modifier = dyno.dynoBlock(
    { gsplat: dyno.Gsplat },
    { gsplat: dyno.Gsplat },
    ({ gsplat }) => {
      return new dyno.Dyno({
        inTypes: { gsplat: dyno.Gsplat, time: 'float', mode: 'float' },
        outTypes: { gsplat: dyno.Gsplat },
        inputs: { gsplat, time, mode },
        globals: () => [effectGLSL],
        statements: ({ inputs: i, outputs: o }) => [
          `${o.gsplat} = ${i.gsplat};`,
          `${o.gsplat}.rgba = worldEffect(${i.gsplat}.center, ${i.gsplat}.rgba, ${i.time}, ${i.mode});`,
        ],
      }).outputs;
    }
  );
  const worlds = [];
  const target = new T.WebGLRenderTarget(640, 360, { type: T.HalfFloatType });
  const portalCamera = camera.clone();
  const material = new T.ShaderMaterial({
    uniforms: {
      portalMap: { value: target.texture },
      resolution: { value: new T.Vector2(640, 360) },
    },
    vertexShader: 'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform sampler2D portalMap; uniform vec2 resolution;
      void main(){gl_FragColor=texture2D(portalMap,gl_FragCoord.xy/resolution);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  let active = 0;
  let disposed = false;
  try {
    for (const spec of specs) {
      const world = new T.Scene();
      world.background = new T.Color(spec.background);
      const spark = new SparkRenderer({ renderer, sortRadial: false, enableLod: false });
      world.add(spark);
      const splat = new SplatMesh({ url: spec.url, worldModifier: modifier, enableLod: false });
      world.add(splat);
      const record = { scene: world, spark, splat, spec };
      worlds.push(record);
      await splat.initialized;
      splat.rotation.x = Math.PI;
      splat.scale.setScalar(spec.scale);
      splat.position.fromArray(spec.offset);
      const doorway = new T.Group();
      doorway.applyMatrix4(spec.door);
      world.add(doorway);
      const portal = new T.Mesh(new T.PlaneGeometry(2.2, 3.2), material);
      doorway.add(portal);
      record.portal = portal;
      for (const [x, y, w, h] of [
        [-1.17, 0, 0.14, 3.48],
        [1.17, 0, 0.14, 3.48],
        [0, 1.67, 2.48, 0.14],
        [0, -1.67, 2.48, 0.14],
      ]) {
        const frame = new T.Mesh(
          new T.BoxGeometry(w, h, 0.18),
          new T.MeshBasicMaterial({ color: spec.accent })
        );
        frame.position.set(x, y, 0.03);
        doorway.add(frame);
      }
      const marker = new T.Mesh(
        new T.TorusKnotGeometry(0.32, 0.1, 72, 12),
        new T.MeshNormalMaterial()
      );
      marker.position.fromArray(spec.marker);
      world.add(marker);
      record.marker = marker;
      // Deliberately simple authored floor proxy, independent of baked scan geometry.
      const floor = new T.Mesh(
        new T.PlaneGeometry(24, 24),
        new T.MeshBasicMaterial({ color: spec.floor })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.04;
      world.add(floor);
    }
    scene.add(worlds[0].scene);
    scene.background = worlds[0].scene.background;
  } catch (error) {
    dispose();
    throw error;
  }
  function setWorld(index) {
    scene.remove(worlds[active].scene);
    active = index;
    scene.add(worlds[active].scene);
    scene.background = worlds[active].scene.background;
  }
  function render(t, effect) {
    time.value = t;
    mode.value = effect;
    const size = renderer.getDrawingBufferSize(new T.Vector2());
    if (target.width !== size.x || target.height !== size.y) target.setSize(size.x, size.y);
    material.uniforms.resolution.value.copy(size);
    for (const w of worlds) w.marker.rotation.y = t * 0.5;
    const source = worlds[active],
      destination = worlds[1 - active];
    camera.updateMatrixWorld();
    const transform = portalTransform(source.spec.door, destination.spec.door);
    portalCamera.matrixWorld.copy(transform).multiply(camera.matrixWorld);
    portalCamera.matrixWorld.decompose(
      portalCamera.position,
      portalCamera.quaternion,
      portalCamera.scale
    );
    portalCamera.updateMatrixWorld();
    portalCamera.projectionMatrix.copy(
      clipProjection(
        camera.projectionMatrix,
        portalCamera.matrixWorld,
        exitPlane(destination.spec.door)
      )
    );
    portalCamera.projectionMatrixInverse.copy(portalCamera.projectionMatrix).invert();
    const previous = renderer.getRenderTarget();
    const xr = renderer.xr.enabled;
    destination.portal.visible = false;
    try {
      renderer.xr.enabled = false;
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(destination.scene, portalCamera);
    } finally {
      renderer.setRenderTarget(previous);
      renderer.xr.enabled = xr;
      destination.portal.visible = true;
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const w of worlds) {
      w.scene.removeFromParent();
      w.splat.dispose();
      w.spark.dispose();
      w.scene.traverse(o => {
        if (o === w.spark || o === w.splat) return;
        o.geometry?.dispose();
        if (o.material && o.material !== material) o.material.dispose();
      });
    }
    target.dispose();
    material.dispose();
  }
  return {
    render,
    setWorld,
    dispose,
    worlds,
    portalCamera,
    target,
    counts: worlds.map(w => w.splat.numSplats),
  };
}
