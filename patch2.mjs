import fs from 'fs';
let code = fs.readFileSync('runtime/api-voxel.js', 'utf8');

// Instead of creating new material every chunk, let's export a shared one.
// But first just add a global to the module or keep it simple.

let replacement = `      const material = window.VOXEL_MATERIAL || new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.8,
        metalness: 0.1
      });`;

code = code.replace(/const material = new THREE\.MeshStandardMaterial\(\{\s*vertexColors: true,\s*flatShading: true\s*\}\);/, replacement);

fs.writeFileSync('runtime/api-voxel.js', code);
console.log('patched shared material');