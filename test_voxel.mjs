import { voxelApi } from './runtime/api-voxel.js';

let THREE = {
  BufferGeometry: class { setAttribute(){} setIndex(){} computeBoundingSphere(){} },
  Float32BufferAttribute: class {},
  MeshStandardMaterial: class {},
  Mesh: class {}
};
global.window = {};

const gpu = {
  scene: {
    add: () => {},
    remove: () => {}
  }
};

const api = voxelApi({scene: gpu.scene, THREE});
const g = {};
api.exposeTo(g);

g.updateVoxelWorld(0, 0);

console.log("Block at 0, 31, 0:", g.getVoxelBlock(0, 31, 0));
console.log("Block at 0, 32, 0:", g.getVoxelBlock(0, 32, 0));
console.log("Block at 0, 50, 0:", g.getVoxelBlock(0, 50, 0));

function getHighestBlockAlt(hx, hz) {
    for(let i = 60; i > 0; i--) {
        if(g.getVoxelBlock(hx, i, hz) !== 0) return i;
    }
    return 30;
}

console.log("Highest alt at 0,0:", getHighestBlockAlt(0, 0));
console.log("Highest alt at 1,1:", getHighestBlockAlt(1, 1));
