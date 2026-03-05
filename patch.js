const fs = require('fs');
let code = fs.readFileSync('runtime/api-voxel.js', 'utf8');

// Prettier ultimate 64 block colors
code = code.replace(/const BLOCK_COLORS = \{[\s\S]*?\};/, `const BLOCK_COLORS = {
    [BLOCK_TYPES.GRASS]: 0x44aa22, // Richer grass
    [BLOCK_TYPES.DIRT]: 0x885533,
    [BLOCK_TYPES.STONE]: 0xaaaaaa, // Lighter stone
    [BLOCK_TYPES.SAND]: 0xffdd88,
    [BLOCK_TYPES.WATER]: 0x33aaff,
    [BLOCK_TYPES.WOOD]: 0x774422,
    [BLOCK_TYPES.LEAVES]: 0x228822, // Darker rich leaves
    [BLOCK_TYPES.COBBLESTONE]: 0x888888,
    [BLOCK_TYPES.PLANKS]: 0xddaa55,
    [BLOCK_TYPES.GLASS]: 0xccffff, 
    [BLOCK_TYPES.BRICK]: 0xcc4433,
    [BLOCK_TYPES.SNOW]: 0xffffff,
    [BLOCK_TYPES.ICE]: 0xbbffff,
    [BLOCK_TYPES.BEDROCK]: 0x333333
  };`);

// UVs
code = code.replace('const colors = [];', 'const colors = [];\n    const uvs = [];');

code = code.replace('colors.push(color.r, color.g, color.b);\n      }', 'colors.push(color.r, color.g, color.b);\n      }\n      // Add standard UV mapping\n      uvs.push(0, 1, 1, 1, 1, 0, 0, 0);');

code = code.replace("geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));", "geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));\n      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));");

fs.writeFileSync('runtime/api-voxel.js', code);
console.log('patched');