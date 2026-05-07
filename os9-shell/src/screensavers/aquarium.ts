import * as THREE from 'three';
import type { ScreensaverHack } from './types';

class Aquarium3D implements ScreensaverHack {
  id = 'aquarium';
  name = 'Aquarium 3D';
  category = 'gl' as const;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;

  private w = 0;
  private h = 0;
  private time = 0;

  // 3D Objects
  private fishGroup!: THREE.Group;
  private bubbleInstancedMesh!: THREE.InstancedMesh;
  private kelpInstancedMesh!: THREE.InstancedMesh;
  
  private directionalLight!: THREE.DirectionalLight;
  private causticLight!: THREE.SpotLight;

  private fishData: { 
    mesh: THREE.Group, 
    speed: number, 
    yPhase: number, 
    yFreq: number, 
    targetY: number, 
    tail: THREE.Mesh 
  }[] = [];

  private numBubbles = 100;
  private bubbleData: { y: number, speed: number, phase: number, x: number, z: number }[] = [];

  private numKelp = 300;
  private kelpData: { x: number, z: number, height: number, phase: number }[] = [];

  init(canvas: HTMLCanvasElement, width: number, height: number) {
    this.w = width;
    this.h = height;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(this.w, this.h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    
    // Deep underwater fog
    const fogColor = new THREE.Color(0x041836);
    this.scene.fog = new THREE.FogExp2(fogColor, 0.015);
    this.renderer.setClearColor(fogColor);

    this.camera = new THREE.PerspectiveCamera(60, this.w / this.h, 1, 1000);
    this.camera.position.set(0, 10, 40);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x0a2a4a, 1.5);
    this.scene.add(ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0x60c0ff, 1.0);
    this.directionalLight.position.set(0, 50, 0);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.camera.top = 50;
    this.directionalLight.shadow.camera.bottom = -50;
    this.directionalLight.shadow.camera.left = -50;
    this.directionalLight.shadow.camera.right = 50;
    this.directionalLight.shadow.mapSize.width = 1024;
    this.directionalLight.shadow.mapSize.height = 1024;
    this.scene.add(this.directionalLight);

    this.causticLight = new THREE.SpotLight(0x80d0ff, 2.0, 100, Math.PI / 4, 0.5, 1);
    this.causticLight.position.set(0, 40, 0);
    this.causticLight.target.position.set(0, 0, 0);
    this.scene.add(this.causticLight);
    this.scene.add(this.causticLight.target);

    this.buildEnvironment();
    this.buildFish();
    this.buildBubbles();
    this.buildKelp();
  }

  private buildEnvironment() {
    // Sandy floor
    const floorGeo = new THREE.PlaneGeometry(200, 200, 64, 64);
    
    // Displace floor slightly to make it bumpy
    const posAttribute = floorGeo.attributes.position;
    for (let i = 0; i < posAttribute.count; i++) {
        const x = posAttribute.getX(i);
        const y = posAttribute.getY(i);
        posAttribute.setZ(i, Math.sin(x * 0.1) * Math.cos(y * 0.1) * 1.5);
    }
    floorGeo.computeVertexNormals();

    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x9c7a4a, 
        roughness: 0.9, 
        metalness: 0.1 
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -15;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  private buildFish() {
    this.fishGroup = new THREE.Group();
    this.scene.add(this.fishGroup);

    const fishColors = [0xff6b35, 0x4ecdc4, 0xffd93d, 0x6c5ce7, 0xfd79a8, 0x00b894];

    for (let i = 0; i < 15; i++) {
        const color = fishColors[Math.floor(Math.random() * fishColors.length)];
        const scale = 0.5 + Math.random() * 0.8;
        
        const fishWrapper = new THREE.Group();
        fishWrapper.position.set(
            (Math.random() - 0.5) * 80,
            -10 + Math.random() * 25,
            (Math.random() - 0.5) * 40
        );

        // Body (Cone)
        const bodyGeo = new THREE.ConeGeometry(1, 4, 8);
        bodyGeo.rotateX(Math.PI / 2);
        const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.1 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        fishWrapper.add(body);

        // Tail (Cone)
        const tailGeo = new THREE.ConeGeometry(0.8, 2, 4);
        tailGeo.rotateX(-Math.PI / 2);
        const tailMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3 });
        const tail = new THREE.Mesh(tailGeo, tailMat);
        tail.position.set(0, 0, -2.5);
        tail.castShadow = true;
        fishWrapper.add(tail);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.6, 0.3, 1);
        const pupilR = new THREE.Mesh(eyeGeo, pupilMat);
        pupilR.scale.setScalar(0.5);
        pupilR.position.set(0.7, 0.3, 1.1);
        
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.6, 0.3, 1);
        const pupilL = new THREE.Mesh(eyeGeo, pupilMat);
        pupilL.scale.setScalar(0.5);
        pupilL.position.set(-0.7, 0.3, 1.1);

        fishWrapper.add(eyeR, pupilR, eyeL, pupilL);

        fishWrapper.scale.setScalar(scale);

        // Direction: 1 (right) or -1 (left)
        const dir = Math.random() > 0.5 ? 1 : -1;
        if (dir === -1) fishWrapper.rotation.y = Math.PI;

        this.fishGroup.add(fishWrapper);

        this.fishData.push({
            mesh: fishWrapper,
            speed: (2 + Math.random() * 3) * dir,
            yPhase: Math.random() * Math.PI * 2,
            yFreq: 0.5 + Math.random() * 1.5,
            targetY: fishWrapper.position.y,
            tail: tail
        });
    }
  }

  private buildBubbles() {
    const bubbleGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const bubbleMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transmission: 0.9,
        opacity: 1,
        metalness: 0,
        roughness: 0,
        ior: 1.5,
        transparent: true,
    });

    this.bubbleInstancedMesh = new THREE.InstancedMesh(bubbleGeo, bubbleMat, this.numBubbles);
    this.scene.add(this.bubbleInstancedMesh);

    for (let i = 0; i < this.numBubbles; i++) {
        this.bubbleData.push({
            x: (Math.random() - 0.5) * 80,
            z: (Math.random() - 0.5) * 60,
            y: -20 + Math.random() * 40,
            speed: 1.5 + Math.random() * 2,
            phase: Math.random() * Math.PI * 2
        });
    }
  }

  private buildKelp() {
    const kelpGeo = new THREE.CylinderGeometry(0.2, 0.4, 1, 8, 10);
    // Move pivot to bottom
    kelpGeo.translate(0, 0.5, 0);

    const kelpMat = new THREE.MeshStandardMaterial({
        color: 0x1a6b3c,
        roughness: 0.8,
        metalness: 0.1
    });

    this.kelpInstancedMesh = new THREE.InstancedMesh(kelpGeo, kelpMat, this.numKelp);
    this.kelpInstancedMesh.castShadow = true;
    this.kelpInstancedMesh.receiveShadow = true;
    this.scene.add(this.kelpInstancedMesh);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.numKelp; i++) {
        const x = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 60;
        const height = 10 + Math.random() * 20;
        
        dummy.position.set(x, -15, z);
        dummy.scale.set(1, height, 1);
        dummy.updateMatrix();
        this.kelpInstancedMesh.setMatrixAt(i, dummy.matrix);

        this.kelpData.push({ x, z, height, phase: Math.random() * Math.PI * 2 });
    }
    this.kelpInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  draw(_time: number, dt: number) {
    if (!this.renderer) return;
    this.time += dt;

    // Caustics animation
    this.causticLight.position.x = Math.sin(this.time * 0.5) * 10;
    this.causticLight.position.z = Math.cos(this.time * 0.3) * 10;

    // Fish animation
    this.fishData.forEach(f => {
        f.mesh.position.x += f.speed * dt;
        f.mesh.position.y = f.targetY + Math.sin(this.time * f.yFreq + f.yPhase) * 2;
        
        // Tail wag
        f.tail.rotation.y = Math.sin(this.time * 3 + f.yPhase) * 0.3;

        // Wrap around
        if (f.speed > 0 && f.mesh.position.x > 50) f.mesh.position.x = -50;
        if (f.speed < 0 && f.mesh.position.x < -50) f.mesh.position.x = 50;
    });

    // Bubbles animation
    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.numBubbles; i++) {
        const b = this.bubbleData[i];
        b.y += b.speed * dt;
        const wobbleX = Math.sin(this.time * 1 + b.phase) * 1.0;
        
        if (b.y > 25) {
            b.y = -15;
            b.x = (Math.random() - 0.5) * 80;
        }

        dummy.position.set(b.x + wobbleX, b.y, b.z);
        
        // Scale pulse
        const scale = 1 + Math.sin(this.time * 5 + b.phase) * 0.1;
        dummy.scale.setScalar(scale);
        
        dummy.updateMatrix();
        this.bubbleInstancedMesh.setMatrixAt(i, dummy.matrix);
    }
    this.bubbleInstancedMesh.instanceMatrix.needsUpdate = true;

    // Kelp sway (using instanced mesh transform approximation - a real shader would be better but this is simpler)
    for (let i = 0; i < this.numKelp; i++) {
        const k = this.kelpData[i];
        const sway = Math.sin(this.time + k.phase) * 0.2;
        
        dummy.position.set(k.x, -15, k.z);
        // Approximation of bending by rotating from the bottom
        dummy.rotation.z = sway;
        dummy.rotation.x = Math.cos(this.time * 0.3 + k.phase) * 0.1;
        dummy.scale.set(1, k.height, 1);
        
        dummy.updateMatrix();
        this.kelpInstancedMesh.setMatrixAt(i, dummy.matrix);
    }
    this.kelpInstancedMesh.instanceMatrix.needsUpdate = true;

    // Slow camera drift
    this.camera.position.x = Math.sin(this.time * 0.05) * 5;
    this.camera.lookAt(0, 0, 0);

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

export const aquarium = new Aquarium3D();
