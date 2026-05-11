#!/usr/bin/env node
// Migrates all cart code.js files from bare global API calls to nova64.X() namespace calls.
// Run once, then delete.

const fs = require('fs');
const path = require('path');

const API_NAMES = [
  // draw
  'cls','pset','line','rect','rectfill','drawRect','circle','print','packRGBA64','rgba8','setCamera',
  'screenWidth','screenHeight','colorLerp','colorMix','hexColor','hslColor','n64Palette',
  'drawGradient','drawRadialGradient','drawSkyGradient','drawFlash','drawRoundedRect','poly',
  'drawTriangle','drawDiamond','drawStarburst','drawWave','drawSpiral','drawCheckerboard',
  'measureText','printCentered','printRight','drawGlowText','drawGlowTextCentered','drawPulsingText',
  'drawScanlines','drawNoise','drawProgressBar','drawHealthBar','drawPixelBorder','drawPanel',
  'drawCrosshair','createMinimap','drawMinimap','drawFloatingTexts','drawFloatingTexts3D',
  'scrollingText','BM','setBlendMode','resetBlendMode','withBlend','withAlpha',
  // sprite
  'spr','sprRect','mapDraw','loadSprites','loadMap','loadAtlas','sprByName','getAtlasFrame',
  'getSpriteSheetImage','applySpriteSheetDataURL',
  // scene
  'getBackendCapabilities','createCube','createSphere','createCylinder','createPlane',
  'createAdvancedCube','createAdvancedSphere','createTorus','createCone','createCapsule',
  'destroyMesh','removeMesh','loadModel','loadVoxModel','playAnimation','updateAnimations',
  'loadTexture','setPosition','setRotation','setScale','getPosition','getRotation','rotateMesh',
  'moveMesh','setFlatShading','setMeshVisible','setMeshOpacity','setCastShadow','setReceiveShadow',
  'clearScene','createInstancedMesh','setInstanceTransform','setInstanceColor','finalizeInstances',
  'removeInstancedMesh','createLODMesh','setLODPosition','removeLODMesh','updateLODs',
  'loadNormalMap','setNormalMap','setPBRMaps','setPBRProperties','raycastFromCamera','get3DStats',
  'setupScene','getScene','getRenderer','getMesh',
  // camera
  'setCameraPosition','setCameraTarget','setCameraLookAt','setCameraFOV','getCamera',
  'createCamera2D','beginCamera2D','endCamera2D','cam2DApply','cam2DReset','cam2DFollow',
  'cam2DShake','updateCamera2D','cam2DWorldToScreen','cam2DScreenToWorld','cam2DGetBounds',
  // light / fog / skybox
  'setLightDirection','setLightColor','setAmbientLight','setDirectionalLight','createPointLight',
  'setPointLightPosition','setPointLightColor','removeLight','setFog','clearFog',
  'createSpaceSkybox','createGradientSkybox','createSolidSkybox','createImageSkybox',
  'animateSkybox','setSkyboxSpeed','enableSkyboxAutoAnimate','disableSkyboxAutoAnimate','clearSkybox',
  // fx / post-processing / particles
  'enableBloom','disableBloom','setBloomStrength','setBloomRadius','setBloomThreshold',
  'enableFXAA','disableFXAA','enableChromaticAberration','disableChromaticAberration',
  'enableVignette','disableVignette','enableGlitch','disableGlitch','setGlitchIntensity',
  'enableRetroEffects','disableRetroEffects','isEffectsEnabled','renderEffects',
  'enablePixelation','enableDithering','enableN64Mode','enablePSXMode','enableLowPolyMode',
  'disablePresetMode','withFilter','withColorMatrix','applyColorMatrix',
  'createEmitter2D','burstEmitter2D','setEmitter2DActive','updateEmitter2D','drawEmitter2D',
  'getParticleCount','clearEmitter2D','createParticleSystem','setParticleEmitter','emitParticle',
  'burstParticles','updateParticles','removeParticleSystem','getParticleStats',
  // input
  'btn','btnp','key','keyp','isKeyDown','isKeyPressed','mouseX','mouseY','mouseDown','mousePressed',
  'gamepadAxis','gamepadConnected','leftStickX','leftStickY','rightStickX','rightStickY',
  'initHandTracking','getHandLandmarks','getHandGesture','initFaceTracking','getFaceLandmarks',
  'getFaceBlendShapes','initPoseTracking','getPoseLandmarks','startCamera','stopCamera',
  'getCameraTexture','showCameraBackground','hideCameraBackground','stopTracking',
  // audio
  'sfx','setVolume',
  // physics / collision
  'createBody','destroyBody','stepPhysics','setGravity','setTileSize','setTileSolidFn',
  'setCollisionMap','aabb','circleCollision','raycastTilemap',
  // ui / screens / stage
  'setFont','getFont','setTextAlign','setTextBaseline','drawText','drawTextShadow','drawTextOutline',
  'createPanel','drawAllPanels','removePanel','clearPanels','createButton','updateButton',
  'drawButton','updateAllButtons','drawAllButtons','removeButton','clearButtons','uiProgressBar',
  'drawGradientRect','centerX','centerY','grid','setMousePosition','setMouseButton',
  'getMousePosition','isMouseDown','isMousePressed','addScreen','switchToScreen','switchScreen',
  'transitionTo','onTransitionEnd','isTransitioning','getCurrentScreen','startScreens',
  'parseCanvasUI','updateCanvasUI','renderCanvasUI','destroyCanvasUI',
  'createContainer','createSpriteNode','createGraphicsNode','createTextNode','addChild',
  'removeChild','removeAllChildren','setChildIndex','drawStage','hitTest',
  'createMovieClip','playClip','pauseClip','stopClip','gotoAndPlay','gotoAndStop',
  'updateClips','drawClip','openSpriteEditor','closeSpriteEditor',
  'startTextInput','stopTextInput','getTextInput',
  // tween / hype
  'Ease','createTween','killTween','killTweensOf','killAllTweens','updateTweens','getTweenCount',
  'hypeRegister','hypeUnregister','hypeUpdate','hypeReset','createOscillator','createTimeTrigger',
  'createRandomTrigger','createProximityTrigger','createHSwarm','createColorPool','createHPool',
  'createGridLayout','createCircleLayout','createSphereLayout','createPathLayout',
  // data / storage / manifest
  'saveData','loadData','deleteData','saveJSON','loadJSON','createGameStore','novaStore',
  'getMeta','loadEnv','setLevel','getEnv','getLevel','getLevels','getCheats','setCheat',
  't','setLocale','getLocale','getAvailableLocales','addStrings',
  // math / generative / util
  'lerp','clamp','randRange','randInt','dist','dist3d','remap','pulse','deg2rad','rad2deg',
  'noise','noiseSeed','noiseDetail','noiseMap','ellipse','arc','bezier','quadCurve',
  'pushMatrix','popMatrix','translate','rotate','scale2d','resetMatrix',
  'colorMode','color','hsb','lerpColor','ease','smoothstep','flowField','frameCount',
  // gameutils
  'createShake','triggerShake','updateShake','getShakeOffset','createCooldown','useCooldown',
  'cooldownReady','cooldownProgress','updateCooldown','createCooldownSet','updateCooldowns',
  'createHitState','triggerHit','isInvulnerable','isFlashing','updateHitState',
  'createSpawner','updateSpawner','triggerWave','getSpawnerWave','createPool',
  'createFloatingTextSystem','createStateMachine','createTimer',
  // xr
  'enableVR','enableAR','enableCardboardVR','disableXR','isXRActive','isXRSupported',
  'getXRSession','getXRMode','getXRControllers','getXRHands','setXRReferenceSpace','setCameraRigPosition',
  // voxel
  'updateVoxelWorld','forceLoadVoxelChunks','getVoxelBlock','setVoxelBlock','raycastVoxelBlock',
  'checkVoxelCollision','checkVoxelFluid','moveVoxelEntity','placeVoxelTree','resetVoxelWorld',
  'configureVoxelWorld','getVoxelConfig','getVoxelHighestBlock','getVoxelBiome','getVoxelLightLevel',
  'setVoxelDayTime','saveVoxelWorld','loadVoxelWorld','listVoxelWorlds','deleteVoxelWorld',
  'registerVoxelBlock','enableVoxelTextures','loadVoxelTextureAtlas','spawnVoxelEntity',
  'removeVoxelEntity','getVoxelEntity','damageVoxelEntity','healVoxelEntity','updateVoxelEntities',
  'getVoxelEntitiesInRadius','getVoxelEntitiesByType','getVoxelEntityCount','cleanupVoxelEntities',
  'setVoxelEntityComponent','getVoxelEntityComponent','hasVoxelEntityComponent',
  'removeVoxelEntityComponent','queryVoxelEntities','createVoxelEntityArchetype',
  'spawnVoxelEntityFromArchetype','findVoxelPath','exportVoxelRegion','importVoxelRegion',
  'exportVoxelWorldJSON','importVoxelWorldJSON','simplexNoise2D','simplexNoise3D',
  'setVoxelFluidSource','removeVoxelFluidSource','getVoxelFluidLevel','importVoxModel',
  // shader
  'createShaderMaterial','updateShaderUniform',
  // misc
  'getDeltaTime','getFPS','WADLoader','WADTextureManager','convertWADMap','setWallUVs',
  'createSeedFromHash','createSeedRNG','seedToTraits','exportSeedMetadata','setSeed','getSeed','getSeedRNG',
];

// Sort longest-first so e.g. `createAdvancedCube` is replaced before `createCube`
API_NAMES.sort((a, b) => b.length - a.length);

const examplesDir = path.join(__dirname, '..', 'examples');
const dirs = fs.readdirSync(examplesDir);
let totalFiles = 0;
let totalReplacements = 0;

for (const dir of dirs) {
  const cartFile = path.join(examplesDir, dir, 'code.js');
  if (!fs.existsSync(cartFile)) continue;

  let src = fs.readFileSync(cartFile, 'utf8');
  let replacements = 0;

  for (const name of API_NAMES) {
    // Match bare call: not preceded by `.` or word char, word boundary before name
    // This avoids: .createCube(  nova64.createCube(  obj.foo(
    // But catches:  createCube(  =createCube(  (createCube(
    const re = new RegExp('(?<![.\\w])\\b' + name + '\\(', 'g');
    const before = src;
    src = src.replace(re, 'nova64.' + name + '(');
    if (src !== before) {
      const count = (src.match(new RegExp('nova64\\.' + name + '\\(', 'g')) || []).length;
      replacements += count;
    }
  }

  if (replacements > 0) {
    fs.writeFileSync(cartFile, src);
    console.log(`  ${dir}: ${replacements} replacements`);
    totalFiles++;
    totalReplacements += replacements;
  }
}

console.log(`\nDone: ${totalFiles} files updated, ${totalReplacements} total replacements`);
