// Three.js feasibility renderer. CPU synchronous sorting is deliberately bounded;
// this is not yet the production loader, worker sorter or four-host API.
import * as THREE from 'three';
import { MAX_SPLATS, validateSplats } from './data.js';

const vertexShader = `
attribute vec3 center;
attribute vec3 covA;
attribute vec3 covB;
attribute vec4 splatColor;
uniform vec2 viewport;
uniform float nearPlane;
varying vec2 gaussianPosition;
varying vec4 gaussianColor;
void main(){
  vec4 p=viewMatrix*vec4(center,1.0);
  gaussianColor=splatColor;
  gaussianPosition=position.xy*3.0;
  if(p.z>=-nearPlane){gl_Position=vec4(2.0,2.0,2.0,1.0);gaussianColor.a=0.0;return;}
  mat3 C=mat3(covA.x,covA.y,covA.z,covA.y,covB.x,covB.y,covA.z,covB.y,covB.z);
  mat3 V=mat3(viewMatrix);C=V*C*transpose(V);
  vec2 focal=0.5*viewport*vec2(projectionMatrix[0][0],projectionMatrix[1][1]);
  vec3 jx=vec3(focal.x/-p.z,0.0,focal.x*p.x/(p.z*p.z));
  vec3 jy=vec3(0.0,focal.y/-p.z,focal.y*p.y/(p.z*p.z));
  float xx=dot(jx,C*jx)+0.3,xy=dot(jx,C*jy),yy=dot(jy,C*jy)+0.3;
  float mid=0.5*(xx+yy),delta=sqrt(max(0.0,0.25*(xx-yy)*(xx-yy)+xy*xy));
  vec2 axis=abs(xy)>0.000001?normalize(vec2(xy,mid+delta-xx)):(xx>=yy?vec2(1.0,0.0):vec2(0.0,1.0));
  vec2 offset=axis*position.x*3.0*sqrt(max(mid+delta,0.000001))+vec2(-axis.y,axis.x)*position.y*3.0*sqrt(max(mid-delta,0.000001));
  vec4 clip=projectionMatrix*p;
  clip.xy+=offset*2.0/viewport*clip.w;
  gl_Position=clip;
}`;
const fragmentShader = `
out vec4 gaussianFragment;
#define gl_FragColor gaussianFragment
varying vec2 gaussianPosition;
varying vec4 gaussianColor;
void main(){
  float alpha=min(0.99,gaussianColor.a*exp(-0.5*dot(gaussianPosition,gaussianPosition)));
  if(alpha<1.0/255.0)discard;
  gl_FragColor=vec4(gaussianColor.rgb,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class GaussianPrototype {
  constructor(scene) {
    if (scene.children.some(child => child.userData.gaussianPrototype))
      throw new Error('Use one global Gaussian batch per scene');
    this.scene = scene;
    this.resources = [];
    this.nextId = 0;
    this.count = 0;
    this.disposed = false;
    this.stats = {
      visible: 0,
      prepareMs: 0,
      normalizedInputBytes: 0,
      attributeBytes: MAX_SPLATS * 13 * 4,
    };
    this.root = new THREE.Group();
    this.root.userData.gaussianPrototype = true;
    scene.add(this.root);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3)
    );
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.instanceCount = 0;
    this.buffer = new THREE.InstancedInterleavedBuffer(new Float32Array(MAX_SPLATS * 13), 13);
    this.buffer.setUsage(THREE.DynamicDrawUsage);
    for (const [name, size, offset] of [
      ['center', 3, 0],
      ['covA', 3, 3],
      ['covB', 3, 6],
      ['splatColor', 4, 9],
    ])
      geometry.setAttribute(name, new THREE.InterleavedBufferAttribute(this.buffer, size, offset));
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      glslVersion: THREE.GLSL3,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      uniforms: { viewport: { value: new THREE.Vector2() }, nearPlane: { value: 0.1 } },
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.name = 'Nova64 Gaussian feasibility batch';
    this.mesh.frustumCulled = false;
    this.root.add(this.mesh);
    this.previous = scene.onBeforeRender;
    this.before = (renderer, currentScene, camera, ...args) => {
      this.previous.call(scene, renderer, currentScene, camera, ...args);
      const viewport = renderer.getCurrentViewport(new THREE.Vector4());
      this.prepare(camera, viewport.z, viewport.w);
    };
    scene.onBeforeRender = this.before;
  }

  add(data) {
    if (this.disposed) throw new Error('Gaussian renderer disposed');
    const count = validateSplats(data);
    if (this.count + count > MAX_SPLATS) throw new RangeError('Scene Gaussian budget exceeded');
    const object = new THREE.Group();
    const resource = { object, rows: [] };
    const rotation = new THREE.Quaternion(),
      matrix = new THREE.Matrix4(),
      scale = new THREE.Vector3(),
      R = new THREE.Matrix3();
    for (let i = 0; i < count; i++) {
      rotation.fromArray(data.rotations, i * 4).normalize();
      scale.fromArray(data.scales, i * 3);
      matrix.compose(new THREE.Vector3(), rotation, scale);
      R.setFromMatrix4(matrix);
      const covariance = R.clone().multiply(R.clone().transpose());
      resource.rows.push({
        id: this.nextId++,
        local: new THREE.Vector3().fromArray(data.positions, i * 3),
        covariance,
        color: Array.from(data.colors.subarray(i * 4, i * 4 + 4)),
        center: new THREE.Vector3(),
        worldCov: new THREE.Matrix3(),
        depth: 0,
      });
    }
    this.resources.push(resource);
    this.root.add(object);
    this.count += count;
    this.stats.normalizedInputBytes += count * 14 * 4;
    return object;
  }

  prepare(camera, width, height) {
    if (this.disposed) return;
    if (!camera.isPerspectiveCamera) throw new Error('Prototype requires a perspective camera');
    const start = performance.now(),
      rows = [];
    const M = new THREE.Matrix3(),
      MT = new THREE.Matrix3();
    for (const resource of this.resources) {
      let visible = true;
      for (let parent = resource.object; parent; parent = parent.parent)
        if (!parent.visible) visible = false;
      if (!visible || !resource.object.parent) continue;
      M.setFromMatrix4(resource.object.matrixWorld);
      MT.copy(M).transpose();
      for (const row of resource.rows) {
        row.center.copy(row.local).applyMatrix4(resource.object.matrixWorld);
        const v = camera.matrixWorldInverse.elements,
          p = row.center;
        row.depth = -(v[2] * p.x + v[6] * p.y + v[10] * p.z + v[14]);
        if (row.depth <= camera.near || row.color[3] === 0) continue;
        row.worldCov.copy(M).multiply(row.covariance).multiply(MT);
        rows.push(row);
      }
    }
    rows.sort((a, b) => b.depth - a.depth || a.id - b.id);
    const a = this.buffer.array;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i],
        c = row.worldCov.elements,
        o = i * 13;
      a.set(
        [
          row.center.x,
          row.center.y,
          row.center.z,
          c[0],
          c[3],
          c[6],
          c[4],
          c[7],
          c[8],
          ...row.color,
        ],
        o
      );
    }
    this.buffer.needsUpdate = true;
    this.mesh.geometry.instanceCount = rows.length;
    this.material.uniforms.viewport.value.set(width, height);
    this.material.uniforms.nearPlane.value = camera.near;
    this.stats.visible = rows.length;
    this.stats.prepareMs = performance.now() - start;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.scene.onBeforeRender === this.before) this.scene.onBeforeRender = this.previous;
    for (const { object } of this.resources) object.removeFromParent();
    this.mesh.removeFromParent();
    this.root.removeFromParent();
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.resources.length = 0;
    this.count = 0;
    this.stats.visible = 0;
    this.stats.normalizedInputBytes = 0;
  }
}
