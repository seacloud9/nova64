import fs from 'fs';
let code = fs.readFileSync('examples/minecraft-demo/code.js', 'utf8');

// Replace state and init
code = code.replace(/let isLoaded = false;/g, 'let loadState = 0;\nlet isLoaded = false;');

code = code.replace(/export function init\(\) \{[\s\S]*?\}\n/, `export function init() {
    createVoxelTexture();
    setCameraPosition(0, 30, 0);
    setFog(0x87CEEB, 10, 60);
    
    // We don't block here, we let the update/draw loop handle state
}
`);

code = code.replace(/export function update\(\) \{[\s\S]*?time \+= 0\.005;/, `export function update() {
    if (loadState === 0) {
        loadState = 1;
        return;
    } else if (loadState === 1) {
        // Wait a few frames for the canvas to present the loading text
        loadState = 2;
        return;
    } else if (loadState === 2) {
        if(typeof updateVoxelWorld === 'function') {
           updateVoxelWorld(0, 0); // Gen initial chunks
        }
        player.y = getHighestBlockAlt(Math.floor(player.x), Math.floor(player.z)) + 2;
        if (player.y < 5) player.y = 40; // Fallback
        loadState = 3;
        isLoaded = true;
        return;
    }
    
    if (!isLoaded) return;
    
    time += 0.005;`);

code = code.replace(/player\.x = nx; player\.y = ny; player\.z = nz;/, `player.x = nx; player.y = ny; player.z = nz;
    
    // Antifall fallback
    if (player.y < -10) {
        player.y = 40;
        player.vy = 0;
    }`);

fs.writeFileSync('examples/minecraft-demo/code.js', code);
console.log("fixed!");