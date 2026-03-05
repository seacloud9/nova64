const fs = require('fs');
let code = fs.readFileSync('examples/minecraft-demo/code.js', 'utf8');
console.log(code.substring(0, 100));
