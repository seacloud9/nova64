// Conformance cart 761: Batch 60 showcase — AI steering visual demo.
// seekVec3, fleeVec3, arriveVec3, faceToward3D, orbitPoint3D,
// moveToward3D, formationPos3D, springFollow3D, wanderAngle3D

let errors = [];
let t = 0;
const AGENT_COUNT = 6;
let agents = [];
let agentPos = [];
let agentVel = [];
let leader, leaderPos = [0,0,-3];
let springVel = [0,0,0];
let camPos = [0,5,12];

export function init() {
   const needed = ['seekVec3','fleeVec3','arriveVec3','faceToward3D',
                   'orbitPoint3D','moveToward3D','formationPos3D',
                   'springFollow3D','wanderAngle3D','separateFromMeshes'];
   for (const f of needed)
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   if (errors.length) return;

   setCamera([0,5,12],[0,0,-3]);
   setLightDirection(1,2,0.5);

   // Leader (seek toward mouse-like orbit point)
   leader = createCone(0.4, 0.9, rgba8(255,200,40,255));
   setPosition(leader, 0,0,-3);

   // Agents that seek toward leader
   for (let i = 0; i < AGENT_COUNT; i++) {
      const fp = formationPos3D(0,0,-3, i, AGENT_COUNT, 3.5, 0);
      const m = createSphere(0.35, hslColor(i*60, 0.7, 0.6, 255));
      setPosition(m, fp[0], fp[1], fp[2]);
      agents.push(m);
      agentPos.push([fp[0], fp[1], fp[2]]);
      agentVel.push([0,0,0]);
   }
}

export function update(dt) {
   t += dt;
   if (errors.length) return;

   // Leader orbits a point
   const op = orbitPoint3D(0,0,-3, t*0.7, 2.5, Math.sin(t*0.4)*0.5);
   leaderPos = op;
   setPosition(leader, op[0], op[1], op[2]);
   faceToward3D(leader, op[0]+Math.sin(t*0.7), op[1], op[2]+Math.cos(t*0.7), dt, 4.0);

   // Agents seek/arrive toward leader
   for (let i = 0; i < AGENT_COUNT; i++) {
      const p = agentPos[i], v = agentVel[i];
      const sv = arriveVec3(p[0],p[1],p[2], leaderPos[0],leaderPos[1],leaderPos[2], 3.0, 2.0);
      v[0] = sv[0]; v[1] = sv[1]; v[2] = sv[2];
      const sep = separateFromMeshes(agents[i], 1.0);
      p[0] += (v[0]+sep[0])*dt; p[1] += (v[1]+sep[1])*dt; p[2] += (v[2]+sep[2])*dt;
      setPosition(agents[i], p[0], p[1], p[2]);
      faceToward3D(agents[i], leaderPos[0], leaderPos[1], leaderPos[2], dt, 5.0);
   }

   // Spring-follow camera
   const sf = springFollow3D(camPos[0],camPos[1],camPos[2], op[0],op[1]+5,op[2]+10,
                              springVel[0],springVel[1],springVel[2], 4,3,dt);
   if (sf.length>=6) {
      camPos = [sf[0],sf[1],sf[2]];
      springVel = [sf[3],sf[4],sf[5]];
   }
   setCamera(camPos, [op[0],op[1],op[2]]);
}

export function draw() {
   cls(rgba8(4,5,14,255));
   printBold('761 BATCH 60', 4, 4, rgba8(200,220,255,255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255,60,60,255));
      print(errors[0], 4, 24, rgba8(255,120,120,255));
      return;
   }
   print('ok', 4, 14, rgba8(80,255,120,255));
   print('AI steering', 4, 24, rgba8(200,200,255,200));
   print('agents: ' + AGENT_COUNT, 4, 34, rgba8(160,200,255,180));
}
