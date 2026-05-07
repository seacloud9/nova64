import * as THREE from 'three';
import type { ScreensaverHack } from './types';

const MAP_SIZE = 16;
const TILE_WALL = 1;
const TILE_EMPTY = 0;
const TILE_SIZE = 4;
const WALL_HEIGHT = 4;

class Maze3D implements ScreensaverHack {
  id = 'maze-3d';
  name = '3D Maze';
  category = 'gl' as const;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  
  private w = 0;
  private h = 0;
  
  private map: number[][] = [];
  
  // Camera animation
  private px = 1.5 * TILE_SIZE;
  private pz = 1.5 * TILE_SIZE;
  private pa = 0; // angle
  private turnTarget = 0;
  private turning = false;
  private time = 0;

  private pointLight!: THREE.PointLight;
  private mazeGroup!: THREE.Group;

  init(canvas: HTMLCanvasElement, width: number, height: number) {
    this.w = width;
    this.h = height;
    
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false }); // False for more retro feel
    this.renderer.setSize(this.w, this.h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.05);
    this.renderer.setClearColor(0x000000);

    this.camera = new THREE.PerspectiveCamera(70, this.w / this.h, 0.1, 100);
    this.camera.position.set(this.px, WALL_HEIGHT / 2, this.pz);

    // Lights - Brighter as requested
    const ambientLight = new THREE.AmbientLight(0x666666);
    this.scene.add(ambientLight);

    this.pointLight = new THREE.PointLight(0xffcc88, 3.0, TILE_SIZE * 6);
    this.pointLight.castShadow = true;
    this.scene.add(this.pointLight);

    this.generateMaze();
    this.build3DMaze();

    // Find an empty starting cell
    for (let y = 1; y < MAP_SIZE - 1; y++) {
      for (let x = 1; x < MAP_SIZE - 1; x++) {
        if (this.map[y][x] === TILE_EMPTY) { 
            this.px = (x + 0.5) * TILE_SIZE; 
            this.pz = (y + 0.5) * TILE_SIZE; 
            this.camera.position.set(this.px, WALL_HEIGHT / 2, this.pz);
            return; 
        }
      }
    }
  }

  private generateMaze() {
    this.map = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(TILE_WALL));
    const visited = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(false));
    const stack: [number, number][] = [];
    const start: [number, number] = [1, 1];
    
    this.map[1][1] = TILE_EMPTY;
    visited[1][1] = true;
    stack.push(start);

    const dirs: [number, number][] = [[0, -2], [0, 2], [-2, 0], [2, 0]];
    while (stack.length > 0) {
      const [cx, cy] = stack[stack.length - 1];
      const neighbors: [number, number, number, number][] = [];
      for (const [dx, dy] of dirs) {
        const nx = cx + dx, ny = cy + dy;
        if (nx > 0 && nx < MAP_SIZE - 1 && ny > 0 && ny < MAP_SIZE - 1 && !visited[ny][nx]) {
          neighbors.push([nx, ny, cx + dx / 2, cy + dy / 2]);
        }
      }
      if (neighbors.length > 0) {
        const [nx, ny, wx, wy] = neighbors[Math.floor(Math.random() * neighbors.length)];
        this.map[ny][nx] = TILE_EMPTY;
        this.map[wy][wx] = TILE_EMPTY;
        visited[ny][nx] = true;
        stack.push([nx, ny]);
      } else {
        stack.pop();
      }
    }
  }

  private build3DMaze() {
    this.mazeGroup = new THREE.Group();
    this.scene.add(this.mazeGroup);

    // Floor and Ceiling
    const planeGeo = new THREE.PlaneGeometry(MAP_SIZE * TILE_SIZE, MAP_SIZE * TILE_SIZE);
    
    // Floor
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9, metalness: 0 });
    const floor = new THREE.Mesh(planeGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((MAP_SIZE * TILE_SIZE) / 2, 0, (MAP_SIZE * TILE_SIZE) / 2);
    floor.receiveShadow = true;
    this.mazeGroup.add(floor);

    // Ceiling
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1, metalness: 0 });
    const ceiling = new THREE.Mesh(planeGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set((MAP_SIZE * TILE_SIZE) / 2, WALL_HEIGHT, (MAP_SIZE * TILE_SIZE) / 2);
    ceiling.receiveShadow = true;
    this.mazeGroup.add(ceiling);

    // Walls
    // Create an instanced mesh for performance
    let wallCount = 0;
    for (let y = 0; y < MAP_SIZE; y++) {
        for (let x = 0; x < MAP_SIZE; x++) {
            if (this.map[y][x] === TILE_WALL) wallCount++;
        }
    }

    // Procedural brick texture
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#6e3020';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#441d13';
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
        const y = i * 32;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke();
        const offset = (i % 2) * 32;
        ctx.beginPath(); ctx.moveTo(offset, y); ctx.lineTo(offset, y + 32); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(offset + 64, y); ctx.lineTo(offset + 64, y + 32); ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);

    const wallGeo = new THREE.BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE);
    const wallMat = new THREE.MeshStandardMaterial({ 
        map: texture,
        roughness: 0.9,
        metalness: 0.1 
    });
    
    const wallInstanced = new THREE.InstancedMesh(wallGeo, wallMat, wallCount);
    wallInstanced.castShadow = true;
    wallInstanced.receiveShadow = true;
    this.mazeGroup.add(wallInstanced);

    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        if (this.map[y][x] === TILE_WALL) {
            dummy.position.set((x + 0.5) * TILE_SIZE, WALL_HEIGHT / 2, (y + 0.5) * TILE_SIZE);
            dummy.updateMatrix();
            wallInstanced.setMatrixAt(idx++, dummy.matrix);
        }
      }
    }
    wallInstanced.instanceMatrix.needsUpdate = true;
  }

  private canMove(angle: number, dist: number): boolean {
    const nx = this.px + Math.sin(angle) * dist; // THREE.js Z is forward, so sin/cos might be swapped depending on orientation
    const nz = this.pz + Math.cos(angle) * dist; 
    
    const mx = Math.floor(nx / TILE_SIZE);
    const my = Math.floor(nz / TILE_SIZE);
    
    if (mx < 0 || mx >= MAP_SIZE || my < 0 || my >= MAP_SIZE) return false;
    return this.map[my][mx] === TILE_EMPTY;
  }

  draw(_time: number, dt: number) {
    if (!this.renderer) return;
    this.time += dt;

    const moveSpeed = TILE_SIZE * 0.8 * dt;
    const turnSpeed = 2.0 * dt;

    if (this.turning) {
      const diff = this.turnTarget - this.pa;
      const wrapped = ((diff + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      if (Math.abs(wrapped) < turnSpeed) {
        this.pa = this.turnTarget;
        this.turning = false;
      } else {
        this.pa += Math.sign(wrapped) * turnSpeed;
      }
    } else if (this.canMove(this.pa, TILE_SIZE * 0.6)) {
      this.px += Math.sin(this.pa) * moveSpeed;
      this.pz += Math.cos(this.pa) * moveSpeed;
    } else {
      // Pick a turn direction
      const leftOk = this.canMove(this.pa - Math.PI / 2, TILE_SIZE * 0.6);
      const rightOk = this.canMove(this.pa + Math.PI / 2, TILE_SIZE * 0.6);
      if (leftOk && rightOk) {
        this.turnTarget = this.pa + (Math.random() > 0.5 ? 1 : -1) * Math.PI / 2;
      } else if (leftOk) {
        this.turnTarget = this.pa - Math.PI / 2;
      } else if (rightOk) {
        this.turnTarget = this.pa + Math.PI / 2;
      } else {
        this.turnTarget = this.pa + Math.PI;
      }
      this.turning = true;
    }

    // Add head bobbing
    const bobbing = this.turning ? 0 : Math.sin(this.time * 8) * 0.2;
    
    this.camera.position.set(this.px, WALL_HEIGHT / 2 + bobbing, this.pz);
    
    // Look direction
    const targetX = this.px + Math.sin(this.pa);
    const targetZ = this.pz + Math.cos(this.pa);
    this.camera.lookAt(targetX, WALL_HEIGHT / 2 + bobbing, targetZ);

    // Light follows player
    this.pointLight.position.copy(this.camera.position);

    this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number) {
    this.w = width;
    this.h = height;
    if (this.camera) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }
    if (this.renderer) {
        this.renderer.setSize(width, height);
    }
  }

  destroy() {
    if (this.renderer) this.renderer.dispose();
    this.scene?.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
                object.material.forEach((m: THREE.Material) => m.dispose());
            } else {
                object.material.dispose();
            }
        }
    });
  }
}

export const maze3d = new Maze3D();
