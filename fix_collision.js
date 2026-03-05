const fs = require('fs');
const file = 'examples/minecraft-demo/code.js';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/function checkCollision\(x, y, z\) \{\n\s*if \(typeof checkVoxelCollision === 'function'\) \{\n\s*return checkVoxelCollision\(x, y, z\);\n\s*\}/, `function checkCollision(x, y, z) {
    if (typeof checkVoxelCollision === 'function') {
        return checkVoxelCollision([x, y, z], player.size);
    }`);

fs.writeFileSync(file, code);
