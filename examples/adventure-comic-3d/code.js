// THE VERDICT: A 3D Comic Adventure
// Demonstrates mixing 3D scenes with 2D comic panels and dialogue

let state = 'title'; // title, intro, room, inspect, dialogue
let sceneTime = 0;
let textScroll = 0;

let currentText = "";
let speaker = "";
let dialogStage = 0;

// 3D Objects
let character1 = null;
let character2 = null;
let desk = null;
let evidence = null;
let lights = [];

// Screen coordinates for 2D comic panels
const WIDTH = 320;
const HEIGHT = 240;

const DIALOG_SCRIPT_SUSPECT = [
  { s: "Detective", t: "Where were you on the night of the 14th?" },
  { s: "Suspect", t: "I told you, I was at the movies." },
  { s: "Detective", t: "Alone?" },
  { s: "Suspect", t: "Yeah. Why would I lie about that?" },
  { s: "Detective", t: "We'll see..." }
];

const DIALOG_SCRIPT_EVIDENCE = [
  { s: "Detective", t: "The safe was forced open..." },
  { s: "Detective", t: "But the lock mechanism isn't broken." },
  { s: "Detective", t: "There's a strange glowing cube inside." },
  { s: "Detective", t: "I should ask the suspect about this." }
];

const DIALOG_SCRIPT_CONFRONT = [
  { s: "Detective", t: "I found this glowing cube in the safe." },
  { s: "Suspect", t: "I've never seen that before in my life!" },
  { s: "Detective", t: "Then how did your fingerprints get on it?" },
  { s: "Narrator", t: "... THE END ..." }
];

let currentScript = [];
let hasEvidence = false;
let gameFinished = false;

let playerPos = { x: 0, z: 6 };


export function init() {
  setFog(0x111111, 2, 20);
  
  // Create a stylized noir room
  let floor = createPlane(20, 20, 0x442222, [0, 0, 0]);
  setRotation(floor, -Math.PI / 2, 0, 0);

  // The desk
  desk = createCube(2, 0x332211, [0, 0.5, 0], { roughness: 0.5 });
  setScale(desk, 3, 1, 1.5);
  
  // The evidence (glowing cube)
  evidence = createCube(0.5, 0x00ff00, [0, 1.2, 0], { material: 'emissive', intensity: 2 });
  
  // Character 1 (Detective)
  character1 = createCube(1.5, 0x222222, [playerPos.x, 1.5, playerPos.z], { material: 'standard' });
  setScale(character1, 1, 3, 1);
  
  // Character 2 (Suspect)
  character2 = createCube(1.5, 0x881111, [3, 1.5, -2], { material: 'standard' });
  setScale(character2, 1, 3, 1);
  
  // Setup dramatic lighting
  // Camera start position
  setCameraPosition(0, 3, 8);
  setCameraTarget(0, 1, 0);
  setCameraFOV(60);
}

function processDialog() {
  if (dialogStage >= currentScript.length) {
    if (gameFinished) {
        state = 'title';
        sceneTime = 0;
        return;
    }
    state = 'explore';
    setCameraPosition(0, 8, 10);
    setCameraTarget(0, 0, 0);
    sceneTime = 0;
    return;
  }
  
  speaker = currentScript[dialogStage].s;
  currentText = currentScript[dialogStage].t;
  textScroll = 0;
  
  // Dramatically change camera angles
  if (speaker === 'Detective') {
    setCameraPosition(playerPos.x - 2, 3, playerPos.z + 2);
    setCameraTarget(playerPos.x, 2, playerPos.z);
  } else if (speaker === 'Suspect') {
    setCameraPosition(5, 2, -1);
    setCameraTarget(3, 2, -2);
    // Animate suspect
    setRotation(character2, 0, sceneTime * 0.1, 0);
  } else if (speaker === 'Narrator') {
    setCameraPosition(0, 8, 0.1);
    setCameraTarget(0, 0, 0);
  }
}

export function update() {
  sceneTime++;
  
  // Animate the evidence spinning
  setRotation(evidence, 0, sceneTime * 0.05, sceneTime * 0.02);
  
  if (state === 'title') {
    setCameraPosition(Math.sin(sceneTime * 0.02) * 5, 4, 8);
    setCameraTarget(0, 1, 0);
    
    if (key('Space') || btn('A')) {
      state = 'explore';
      hasEvidence = false;
      gameFinished = false;
      playerPos = { x: 0, z: 6 };
      setCameraPosition(0, 8, 10);
      setCameraTarget(0, 0, 0);
      sceneTime = 0; // debounce
    }
  } else if (state === 'explore') {
    // Top-downish camera
    setCameraPosition(playerPos.x, 8, playerPos.z + 6);
    setCameraTarget(playerPos.x, 1, playerPos.z);
    
    let speed = 0.1;
    if (key('KeyW') || key('ArrowUp')) playerPos.z -= speed;
    if (key('KeyS') || key('ArrowDown')) playerPos.z += speed;
    if (key('KeyA') || key('ArrowLeft')) playerPos.x -= speed;
    if (key('KeyD') || key('ArrowRight')) playerPos.x += speed;
    
    setPosition(character1, playerPos.x, 1.5, playerPos.z);
    
    let distToDesk = Math.hypot(playerPos.x - 0, playerPos.z - 0);
    let distToSuspect = Math.hypot(playerPos.x - 3, playerPos.z - -2);
    
    if (sceneTime > 15 && (key('Space') || btn('A'))) {
      if (distToDesk < 2.5 && !hasEvidence) {
        state = 'dialogue';
        currentScript = DIALOG_SCRIPT_EVIDENCE;
        dialogStage = 0;
        hasEvidence = true;
        processDialog();
        sceneTime = 0;
      } else if (distToSuspect < 2.5) {
        state = 'dialogue';
        if (hasEvidence) {
            currentScript = DIALOG_SCRIPT_CONFRONT;
            gameFinished = true;
        } else {
            currentScript = DIALOG_SCRIPT_SUSPECT;
        }
        dialogStage = 0;
        processDialog();
        sceneTime = 0;
      }
    }
  } else if (state === 'dialogue') {
    textScroll += 0.5; // Typing speed
    
    if (sceneTime > 15 && (key('Space') || btn('A'))) {
      if (textScroll < currentText.length) {
        // Skip typing
        textScroll = currentText.length;
        sceneTime = 0; // debounce
      } else {
        // Next dialog
        dialogStage++;
        processDialog();
        sceneTime = 0; // debounce
      }
    }
  }
}

function drawComicPanel(x, y, w, h, thickness=2) {
  // Draw comic box background
  rectfill(x, y, w, h, 0x111111ee);
  
  // Draw border
  for(let i=0; i<thickness; i++) {
    rect(x+i, y+i, w-i*2, h-i*2, 0xffffff);
  }
}

export function draw() {
  // Post-process / 2D Overlay
  if (state === 'title') {
    // Title comic panel
    drawComicPanel(20, 20, 280, 80, 3);
    print("THE VERDICT", 100, 45, 0xffbb00);
    print("A 3D Noir Comic Adventure", 60, 65, 0xffffff);
    print("Press SPACE to begin investigation", 40, 200, 0x888888);
  } else if (state === 'explore') {
    let distToDesk = Math.hypot(playerPos.x - 0, playerPos.z - 0);
    let distToSuspect = Math.hypot(playerPos.x - 3, playerPos.z - -2);
    
    if (distToDesk < 2.5 && !hasEvidence) {
      drawComicPanel(100, 200, 120, 20, 1);
      print("[SPACE] Inspect Desk", 105, 205, 0xffffff);
    } else if (distToSuspect < 2.5) {
      drawComicPanel(100, 200, 130, 20, 1);
      print("[SPACE] Talk to Suspect", 105, 205, 0xffffff);
    }
    
    print("WASD to move", 5, 5, 0x888888);
  } else if (state === 'dialogue') {
    // Cinematic aspect ratio bars
    rectfill(0, 0, WIDTH, 30, 0x000000);
    rectfill(0, HEIGHT-70, WIDTH, 70, 0x000000);
    
    // Draw dialog panel text
    let displayStr = currentText.substring(0, Math.floor(textScroll));
    
    // Speaker box
    if (speaker === 'Detective') {
      rectfill(10, HEIGHT - 85, 80, 20, 0x4444ff);
      print(speaker.toUpperCase(), 15, HEIGHT - 80, 0xffffff);
    } else if (speaker === 'Suspect') {
      rectfill(WIDTH - 90, HEIGHT - 85, 80, 20, 0xff4444);
      print(speaker.toUpperCase(), WIDTH - 80, HEIGHT - 80, 0xffffff);
    } else {
      rectfill(10, HEIGHT - 85, 80, 20, 0x44ff44);
      print(speaker.toUpperCase(), 20, HEIGHT - 80, 0x000000);
    }

    // Text box
    print(displayStr, 20, HEIGHT - 50, 0xffffff);
    
    if (textScroll >= currentText.length) {
      // Blinking cursor
      if (Math.floor(sceneTime / 10) % 2 === 0) {
        print("▼", WIDTH - 20, HEIGHT - 20, 0xffffff);
      }
    }
  }
}
