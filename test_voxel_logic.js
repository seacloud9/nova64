const fs = require('fs');
// Let's create a stub for gpu and three
const gpu = { scene: { add: () => {}, remove: () => {} } };
global.THREE = {
  BufferGeometry: class {
    setAttribute() {}
    setIndex() {}
    computeBoundingSphere() {}
  },
  Float32BufferAttribute: class {},
  MeshStandardMaterial: class {},
  Mesh: class {},
};
const { voxelApi } = require('./test_api_voxel.js'); // need to bundle
