const fs = require('fs');
const file = 'examples/minecraft-demo/code.js';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(`    print('+', 156, 116, 0xffffff);`, `    print('+', 156, 116, 0xffffff);
    print(\`Y: \${player.y.toFixed(2)}\`, 5, 50, 0xffffff);
    const below = getVoxelBlock(Math.floor(player.x), Math.floor(player.y - player.size), Math.floor(player.z));
    print(\`Block Below: \${below}\`, 5, 65, 0xffffff);
`);

fs.writeFileSync(file, code);
