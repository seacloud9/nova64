import fs from 'fs';

const code = `// Minecraft Demo - Ultimate Edition
// Featuring procedural textures, smooth shadows, Day/Night cycle, and loading UI

let player = {
    x: 0, y: 30, z: 0,
    vx: 0, vy: 0, vz: 0,
    speed: 0.15,
    jump: 0.35,
    size: 0.6,
    onGround: false,
    yaw: 0, pitch: 0
};

let selectedBlock = 1; // 1 = Grass
let time = 0;
let isLoaded = false;
let loadProgress = 0;
let initialChunks = 9;

// Generate a procedural retro 16x16 noise texture atlas
function createVoxelTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; 
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    for(let y = 0; y < 64; y++) {
        for(let x = 0; x < 64; x++) {
            let noise = Math.random() * 60 - 30; // Contrast
            let isBorder = (x % 16 === 0 || y % 16 === 0) ? -20 : 0;
            let val = 180 + noise + isBorder;
            ctx.fillStyle = \\\`rgb(\\\${val}, \\\${val}, \\\${val})\\\`;
            ctx.fillRect(x, y, 1, 1);
        }
    }
    
    // In browser context we can access THREE via globalThis.THREE or directly because engine loads it
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    
    // Create global voxel material for the engine
    globalThis.window.VOXEL_MATERIAL = new THREE.MeshStandardMaterial({
        vertexColors: true,
        map: tex,
        flatShading: true,
        roughness: 0.9,
        metalness: 0.0
    });
}

export function init() {
    createVoxelTexture();
    
    setCameraPosition(0, 30, 0);
    setFog(0x87CEEB, 10, 60);
    
    // Async chunk loading simulation to not block main thread completely and show UI
    setTimeout(generateWorld, 100);
}

function generateWorld() {
    // Generate 3x3 initial chunks
    let chunksGenerated = 0;
    
    for (let cx = -1; cx <= 1; cx++) {
        for (let cz = -1; cz <= 1; cz++) {
            setTimeout(() => {
                generateChunk(cx, cz);
                chunksGenerated++;
                loadProgress = (chunksGenerated / initialChunks) * 100;
                
                if (chunksGenerated === initialChunks) {
                    isLoaded = true;
                    // Position player on highest block
                    player.y = getHighestBlock(0, 0) + 2;
                }
            }, chunksGenerated * 150);
        }
    }
}

export function update() {
    if (!isLoaded) return;
    
    time += 0.005;
    
    // Day/Night sky cycle
    let skyR = Math.sin(time) > 0 ? 135 : 10;
    let skyG = Math.sin(time) > 0 ? 206 : 10;
    let skyB = Math.sin(time) > 0 ? 235 : 20;
    setFog((skyR<<16) | (skyG<<8) | skyB, 20, 80);
    
    handleInput();
    updatePhysics();
    updateCamera();
    handleBlockInteraction();
}

function handleInput() {
    // Look
    if (key('ArrowLeft')) player.yaw -= 0.05;
    if (key('ArrowRight')) player.yaw += 0.05;
    if (key('ArrowUp') && player.pitch < Math.PI/2) player.pitch += 0.05;
    if (key('ArrowDown') && player.pitch > -Math.PI/2) player.pitch -= 0.05;
    
    let dx = 0, dz = 0;
    const cosY = Math.cos(player.yaw);
    const sinY = Math.sin(player.yaw);
    
    if (key('KeyW')) { dx -= sinY; dz -= cosY; }
    if (key('KeyS')) { dx += sinY; dz += cosY; }
    if (key('KeyA')) { dx -= cosY; dz += sinY; }
    if (key('KeyD')) { dx += cosY; dz -= sinY; }
    
    if (dx !== 0 || dz !== 0) {
        const len = Math.sqrt(dx*dx + dz*dz);
        player.vx = (dx/len) * player.speed;
        player.vz = (dz/len) * player.speed;
    } else {
        player.vx = 0; player.vz = 0;
    }
    
    if (key('Space') && player.onGround) {
        player.vy = player.jump;
        player.onGround = false;
    }
    
    if (btnp(0)) selectedBlock = 1; // Grass
    if (btnp(1)) selectedBlock = 2; // Dirt
    if (btnp(2)) selectedBlock = 3; // Stone
    if (btnp(3)) selectedBlock = 8; // Planks
}

function updatePhysics() {
    player.vy -= 0.02;
    
    let nx = player.x + player.vx;
    let ny = player.y + player.vy;
    let nz = player.z + player.vz;
    
    player.onGround = false;
    
    if (checkCollision(player.x, ny - player.size, player.z) || checkCollision(player.x, ny + 0.2, player.z)) {
        if (player.vy < 0) player.onGround = true;
        player.vy = 0;
        ny = player.y;
    }
    if (checkCollision(nx + (player.vx>0?player.size:-player.size), player.y - player.size + 0.1, player.z)) {
        player.vx = 0; nx = player.x;
    }
    if (checkCollision(player.x, player.y - player.size + 0.1, nz + (player.vz>0?player.size:-player.size))) {
        player.vz = 0; nz = player.z;
    }
    
    player.x = nx; player.y = ny; player.z = nz;
}

function checkCollision(x, y, z) {
    const block = getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    return block !== 0 && block !== undefined;
}

function updateCamera() {
    setCameraPosition(player.x, player.y + 0.8, player.z);
    const targetX = player.x - Math.sin(player.yaw) * Math.cos(player.pitch);
    const targetY = (player.y + 0.8) + Math.sin(player.pitch);
    const targetZ = player.z - Math.cos(player.yaw) * Math.cos(player.pitch);
    setCameraTarget(targetX, targetY, targetZ);
}

function handleBlockInteraction() {
    let dist = 0;
    let rx = player.x, ry = player.y + 0.8, rz = player.z;
    const dx = -Math.sin(player.yaw) * Math.cos(player.pitch);
    const dy = Math.sin(player.pitch);
    const dz = -Math.cos(player.yaw) * Math.cos(player.pitch);
    
    let lastEmpty = null;
    let hitBlock = null;
    
    while(dist < 5) {
        rx += dx * 0.1; ry += dy * 0.1; rz += dz * 0.1;
        let bx = Math.floor(rx), by = Math.floor(ry), bz = Math.floor(rz);
        
        if (getBlock(bx, by, bz)) {
            hitBlock = {x: bx, y: by, z: bz}; break;
        }
        lastEmpty = {x: bx, y: by, z: bz};
        dist += 0.1;
    }
    
    if (hitBlock && btnp(4)) setBlock(hitBlock.x, hitBlock.y, hitBlock.z, 0);
    if (lastEmpty && hitBlock && btnp(5)) setBlock(lastEmpty.x, lastEmpty.y, lastEmpty.z, selectedBlock);
}

export function draw() {
    draw3d(() => {});
    
    if (!isLoaded) {
        print('NOVA64 MINECRAFT EDITION', 20, 40, 0x55cc33);
        print('GENERATING WORLD...', 20, 60, 0xffffff);
        print(\`[\${'='.repeat(Math.floor(loadProgress/10))}\${' '.repeat(10-Math.floor(loadProgress/10))}] \${Math.floor(loadProgress)}%\`, 20, 75, 0xffaa00);
        return;
    }
    
    print('MINECRAFT ULTIMATE 64', 5, 5, 0xffdd88);
    print(\`Block: \${selectedBlock}\`, 5, 20, 0xffffff);
    print('L-Click: Break | R-Click: Place', 5, 35, 0xaaaaaa);
    
    print('+', 156, 116, 0xffffff);
}
`;

fs.writeFileSync('examples/minecraft-demo/code.js', code);
console.log('wrote minecraft');
