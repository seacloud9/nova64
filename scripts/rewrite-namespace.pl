#!/usr/bin/env perl
# One-shot rewriter: nova64.METHOD -> nova64.GROUP.METHOD across cart code.js files.
# Mapping mirrors runtime/namespace.js NAMESPACE_MAP. If both bare nova64.METHOD
# and nova64.GROUP.METHOD appear, only the bare form is rewritten.

use strict;
use warnings;

my %map = (
  # draw
  cls=>'draw', pset=>'draw', line=>'draw', rect=>'draw', rectfill=>'draw',
  drawRect=>'draw', circle=>'draw', print=>'draw', packRGBA64=>'draw', rgba8=>'draw',
  setCamera=>'draw', screenWidth=>'draw', screenHeight=>'draw',
  colorLerp=>'draw', colorMix=>'draw', hexColor=>'draw', hslColor=>'draw', n64Palette=>'draw',
  drawGradient=>'draw', drawRadialGradient=>'draw', drawSkyGradient=>'draw', drawFlash=>'draw',
  drawRoundedRect=>'draw', poly=>'draw', drawTriangle=>'draw', drawDiamond=>'draw',
  drawStarburst=>'draw', drawWave=>'draw', drawSpiral=>'draw', drawCheckerboard=>'draw',
  measureText=>'draw', printCentered=>'draw', printRight=>'draw',
  drawGlowText=>'draw', drawGlowTextCentered=>'draw', drawPulsingText=>'draw',
  drawScanlines=>'draw', drawNoise=>'draw', drawProgressBar=>'draw', drawHealthBar=>'draw',
  drawPixelBorder=>'draw', drawPanel=>'draw', drawCrosshair=>'draw',
  createMinimap=>'draw', drawMinimap=>'draw',
  drawFloatingTexts=>'draw', drawFloatingTexts3D=>'draw', scrollingText=>'draw',
  BM=>'draw', setBlendMode=>'draw', resetBlendMode=>'draw', withBlend=>'draw', withAlpha=>'draw',

  # sprite
  spr=>'sprite', sprRect=>'sprite', mapDraw=>'sprite', loadSprites=>'sprite',
  loadMap=>'sprite', loadAtlas=>'sprite', sprByName=>'sprite', getAtlasFrame=>'sprite',
  getSpriteSheetImage=>'sprite', applySpriteSheetDataURL=>'sprite',

  # scene
  engine=>'scene', getBackendCapabilities=>'scene',
  createCube=>'scene', createSphere=>'scene', createCylinder=>'scene', createPlane=>'scene',
  createAdvancedCube=>'scene', createAdvancedSphere=>'scene', createTorus=>'scene',
  createCone=>'scene', createCapsule=>'scene', destroyMesh=>'scene', removeMesh=>'scene',
  loadModel=>'scene', loadVoxModel=>'scene', playAnimation=>'scene', updateAnimations=>'scene',
  loadTexture=>'scene', setPosition=>'scene', setRotation=>'scene', setScale=>'scene',
  getPosition=>'scene', getRotation=>'scene', rotateMesh=>'scene', moveMesh=>'scene',
  setFlatShading=>'scene', setMeshVisible=>'scene', setMeshOpacity=>'scene',
  setCastShadow=>'scene', setReceiveShadow=>'scene', clearScene=>'scene',
  createInstancedMesh=>'scene', setInstanceTransform=>'scene', setInstanceColor=>'scene',
  finalizeInstances=>'scene', removeInstancedMesh=>'scene',
  createLODMesh=>'scene', setLODPosition=>'scene', removeLODMesh=>'scene', updateLODs=>'scene',
  loadNormalMap=>'scene', setNormalMap=>'scene', setPBRMaps=>'scene', setPBRProperties=>'scene',
  raycastFromCamera=>'scene', get3DStats=>'scene', setupScene=>'scene',
  getScene=>'scene', getRenderer=>'scene', getMesh=>'scene',

  # camera
  setCameraPosition=>'camera', setCameraTarget=>'camera', setCameraLookAt=>'camera',
  setCameraFOV=>'camera', getCamera=>'camera',
  createCamera2D=>'camera', beginCamera2D=>'camera', endCamera2D=>'camera',
  cam2DApply=>'camera', cam2DReset=>'camera', cam2DFollow=>'camera', cam2DShake=>'camera',
  updateCamera2D=>'camera', cam2DWorldToScreen=>'camera', cam2DScreenToWorld=>'camera',
  cam2DGetBounds=>'camera',

  # light
  setLightDirection=>'light', setLightColor=>'light', setAmbientLight=>'light',
  setDirectionalLight=>'light', createPointLight=>'light', setPointLightPosition=>'light',
  setPointLightColor=>'light', removeLight=>'light',
  setFog=>'light', clearFog=>'light',
  createSpaceSkybox=>'light', createGradientSkybox=>'light', createSolidSkybox=>'light',
  createImageSkybox=>'light', animateSkybox=>'light', setSkyboxSpeed=>'light',
  enableSkyboxAutoAnimate=>'light', disableSkyboxAutoAnimate=>'light', clearSkybox=>'light',

  # fx
  enableBloom=>'fx', disableBloom=>'fx', setBloomStrength=>'fx', setBloomRadius=>'fx',
  setBloomThreshold=>'fx', enableFXAA=>'fx', disableFXAA=>'fx',
  enableChromaticAberration=>'fx', disableChromaticAberration=>'fx',
  enableVignette=>'fx', disableVignette=>'fx',
  enableGlitch=>'fx', disableGlitch=>'fx', setGlitchIntensity=>'fx',
  enableRetroEffects=>'fx', disableRetroEffects=>'fx',
  isEffectsEnabled=>'fx', renderEffects=>'fx',
  enablePixelation=>'fx', enableDithering=>'fx',
  enableN64Mode=>'fx', enablePSXMode=>'fx', enableLowPolyMode=>'fx', disablePresetMode=>'fx',
  F=>'fx', CM=>'fx', withFilter=>'fx', withColorMatrix=>'fx', applyColorMatrix=>'fx',
  createEmitter2D=>'fx', burstEmitter2D=>'fx', setEmitter2DActive=>'fx',
  updateEmitter2D=>'fx', drawEmitter2D=>'fx', getParticleCount=>'fx', clearEmitter2D=>'fx',
  createParticleSystem=>'fx', setParticleEmitter=>'fx', emitParticle=>'fx',
  burstParticles=>'fx', updateParticles=>'fx', removeParticleSystem=>'fx',
  getParticleStats=>'fx',

  # shader
  createShaderMaterial=>'shader', updateShaderUniform=>'shader',
  createTSLMaterial=>'shader', createTSLShaderMaterial=>'shader', _updateTSLMaterials=>'shader',
  createLavaMaterial=>'shader', createVortexMaterial=>'shader', createPlasmaMaterial=>'shader',
  createWaterMaterial=>'shader', createHologramMaterial=>'shader', createShockwaveMaterial=>'shader',
  tslFn=>'shader', tslUniform=>'shader', tslFloat=>'shader', tslInt=>'shader',
  tslVec2=>'shader', tslVec3=>'shader', tslVec4=>'shader', tslColor=>'shader',
  tslSin=>'shader', tslCos=>'shader', tslMix=>'shader', tslStep=>'shader',
  tslSmoothstep=>'shader', tslClamp=>'shader', tslFract=>'shader', tslFloor=>'shader',
  tslAbs=>'shader', tslPow=>'shader', tslHash=>'shader', tslUv=>'shader', tslTime=>'shader',
  tslPositionLocal=>'shader', tslPositionWorld=>'shader',
  tslNormalLocal=>'shader', tslNormalWorld=>'shader', tslLoop=>'shader',

  # input
  btn=>'input', btnp=>'input', key=>'input', keyp=>'input',
  isKeyDown=>'input', isKeyPressed=>'input',
  mouseX=>'input', mouseY=>'input', mouseDown=>'input', mousePressed=>'input',
  gamepadAxis=>'input', gamepadConnected=>'input',
  leftStickX=>'input', leftStickY=>'input', rightStickX=>'input', rightStickY=>'input',
  initHandTracking=>'input', getHandLandmarks=>'input', getHandGesture=>'input',
  initFaceTracking=>'input', getFaceLandmarks=>'input', getFaceBlendShapes=>'input',
  initPoseTracking=>'input', getPoseLandmarks=>'input',
  startCamera=>'input', stopCamera=>'input', getCameraTexture=>'input',
  showCameraBackground=>'input', hideCameraBackground=>'input', stopTracking=>'input',

  # audio
  sfx=>'audio', setVolume=>'audio',

  # physics
  createBody=>'physics', destroyBody=>'physics', stepPhysics=>'physics', setGravity=>'physics',
  setTileSize=>'physics', setTileSolidFn=>'physics', setCollisionMap=>'physics',
  aabb=>'physics', circleCollision=>'physics', raycastTilemap=>'physics',

  # voxel
  BLOCK_TYPES=>'voxel', updateVoxelWorld=>'voxel', forceLoadVoxelChunks=>'voxel',
  getVoxelBlock=>'voxel', setVoxelBlock=>'voxel', raycastVoxelBlock=>'voxel',
  checkVoxelCollision=>'voxel', checkVoxelFluid=>'voxel', moveVoxelEntity=>'voxel',
  placeVoxelTree=>'voxel', resetVoxelWorld=>'voxel', configureVoxelWorld=>'voxel',
  getVoxelConfig=>'voxel', getVoxelHighestBlock=>'voxel', getVoxelBiome=>'voxel',
  getVoxelLightLevel=>'voxel', setVoxelDayTime=>'voxel',
  getVoxelNoaPrototypeStatus=>'voxel', probeVoxelNoaPrototype=>'voxel',
  saveVoxelWorld=>'voxel', loadVoxelWorld=>'voxel', listVoxelWorlds=>'voxel',
  deleteVoxelWorld=>'voxel', registerVoxelBlock=>'voxel',
  getVoxelBlockShape=>'voxel', getVoxelBlockBoundingBox=>'voxel', isVoxelBlockFullCube=>'voxel',
  VOXEL_SHAPE_BBOXES=>'voxel', enableVoxelTextures=>'voxel', loadVoxelTextureAtlas=>'voxel',
  spawnVoxelEntity=>'voxel', removeVoxelEntity=>'voxel', getVoxelEntity=>'voxel',
  damageVoxelEntity=>'voxel', healVoxelEntity=>'voxel', updateVoxelEntities=>'voxel',
  getVoxelEntitiesInRadius=>'voxel', getVoxelEntitiesByType=>'voxel',
  getVoxelEntityCount=>'voxel', cleanupVoxelEntities=>'voxel',
  setVoxelEntityComponent=>'voxel', getVoxelEntityComponent=>'voxel',
  hasVoxelEntityComponent=>'voxel', removeVoxelEntityComponent=>'voxel',
  queryVoxelEntities=>'voxel', createVoxelEntityArchetype=>'voxel',
  spawnVoxelEntityFromArchetype=>'voxel', findVoxelPath=>'voxel',
  exportVoxelRegion=>'voxel', importVoxelRegion=>'voxel',
  exportVoxelWorldJSON=>'voxel', importVoxelWorldJSON=>'voxel',
  simplexNoise2D=>'voxel', simplexNoise3D=>'voxel',
  setVoxelFluidSource=>'voxel', removeVoxelFluidSource=>'voxel', getVoxelFluidLevel=>'voxel',
  importVoxModel=>'voxel',

  # ui
  setFont=>'ui', getFont=>'ui', setTextAlign=>'ui', setTextBaseline=>'ui',
  drawText=>'ui', drawTextShadow=>'ui', drawTextOutline=>'ui',
  createPanel=>'ui', drawAllPanels=>'ui', removePanel=>'ui', clearPanels=>'ui',
  createButton=>'ui', updateButton=>'ui', drawButton=>'ui',
  updateAllButtons=>'ui', drawAllButtons=>'ui', removeButton=>'ui', clearButtons=>'ui',
  uiProgressBar=>'ui', drawGradientRect=>'ui', centerX=>'ui', centerY=>'ui', grid=>'ui',
  setMousePosition=>'ui', setMouseButton=>'ui', getMousePosition=>'ui',
  isMouseDown=>'ui', isMousePressed=>'ui', uiColors=>'ui', uiFonts=>'ui',
  ScreenManager=>'ui', Screen=>'ui', screens=>'ui',
  addScreen=>'ui', switchToScreen=>'ui', switchScreen=>'ui',
  transitionTo=>'ui', onTransitionEnd=>'ui', isTransitioning=>'ui',
  getCurrentScreen=>'ui', startScreens=>'ui',
  parseCanvasUI=>'ui', updateCanvasUI=>'ui', renderCanvasUI=>'ui', destroyCanvasUI=>'ui',
  createContainer=>'ui', createSpriteNode=>'ui', createGraphicsNode=>'ui', createTextNode=>'ui',
  addChild=>'ui', removeChild=>'ui', removeAllChildren=>'ui', setChildIndex=>'ui',
  drawStage=>'ui', hitTest=>'ui',
  createMovieClip=>'ui', playClip=>'ui', pauseClip=>'ui', stopClip=>'ui',
  gotoAndPlay=>'ui', gotoAndStop=>'ui', updateClips=>'ui', drawClip=>'ui',
  openSpriteEditor=>'ui', closeSpriteEditor=>'ui',
  startTextInput=>'ui', stopTextInput=>'ui', getTextInput=>'ui',

  # tween
  Ease=>'tween', createTween=>'tween', killTween=>'tween', killTweensOf=>'tween',
  killAllTweens=>'tween', updateTweens=>'tween', getTweenCount=>'tween',
  hypeRegister=>'tween', hypeUnregister=>'tween', hypeUpdate=>'tween', hypeReset=>'tween',
  createOscillator=>'tween', createTimeTrigger=>'tween', createRandomTrigger=>'tween',
  createProximityTrigger=>'tween', createHSwarm=>'tween', createColorPool=>'tween',
  createHPool=>'tween', createGridLayout=>'tween', createCircleLayout=>'tween',
  createSphereLayout=>'tween', createPathLayout=>'tween',

  # data
  saveData=>'data', loadData=>'data', deleteData=>'data', saveJSON=>'data', loadJSON=>'data',
  remove=>'data', createGameStore=>'data', novaStore=>'data',
  getMeta=>'data', loadEnv=>'data', setLevel=>'data', getEnv=>'data',
  getLevel=>'data', getLevels=>'data', getCheats=>'data', setCheat=>'data',
  t=>'data', setLocale=>'data', getLocale=>'data', getAvailableLocales=>'data', addStrings=>'data',
  getEnemy=>'data', getNPC=>'data', getBoss=>'data', getEnemies=>'data',
  getEnemiesByTier=>'data', getNPCs=>'data', getBosses=>'data',
  getItem=>'data', getItems=>'data', getItemsByType=>'data', getItemsByRarity=>'data',
  getUIConfig=>'data', getGameplay=>'data', preloadAssets=>'data',
  getAsset=>'data', getAssetStatus=>'data',
  createSeedFromHash=>'data', createSeedRNG=>'data', seedToTraits=>'data',
  exportSeedMetadata=>'data', setSeed=>'data', getSeed=>'data', getSeedRNG=>'data',
  WADLoader=>'data', WADTextureManager=>'data', convertWADMap=>'data', setWallUVs=>'data',
  THING_MONSTERS=>'data', THING_ITEMS=>'data', THING_SPRITE_PREFIX=>'data',

  # util
  lerp=>'util', clamp=>'util', randRange=>'util', randInt=>'util',
  dist=>'util', dist3d=>'util', remap=>'util', pulse=>'util',
  deg2rad=>'util', rad2deg=>'util',
  TWO_PI=>'util', HALF_PI=>'util', QUARTER_PI=>'util',
  noise=>'util', noiseSeed=>'util', noiseDetail=>'util', noiseMap=>'util',
  ellipse=>'util', arc=>'util', bezier=>'util', quadCurve=>'util',
  pushMatrix=>'util', popMatrix=>'util', translate=>'util', rotate=>'util',
  scale2d=>'util', resetMatrix=>'util',
  colorMode=>'util', color=>'util', hsb=>'util', lerpColor=>'util',
  ease=>'util', smoothstep=>'util', flowField=>'util', frameCount=>'util',
  createShake=>'util', triggerShake=>'util', updateShake=>'util', getShakeOffset=>'util',
  createCooldown=>'util', useCooldown=>'util', cooldownReady=>'util',
  cooldownProgress=>'util', updateCooldown=>'util',
  createCooldownSet=>'util', updateCooldowns=>'util',
  createHitState=>'util', triggerHit=>'util', isInvulnerable=>'util',
  isVisible=>'util', isFlashing=>'util', updateHitState=>'util',
  createSpawner=>'util', updateSpawner=>'util', triggerWave=>'util', getSpawnerWave=>'util',
  createPool=>'util', createFloatingTextSystem=>'util', createStateMachine=>'util', createTimer=>'util',

  # xr
  enableVR=>'xr', enableAR=>'xr', enableCardboardVR=>'xr', disableXR=>'xr',
  isXRActive=>'xr', isXRSupported=>'xr', getXRSession=>'xr', getXRMode=>'xr',
  getXRControllers=>'xr', getXRHands=>'xr',
  setXRReferenceSpace=>'xr', setCameraRigPosition=>'xr',
);

# Reserved group keys — never rewrite these even if listed above (none should be).
my %groups = map { $_ => 1 } qw(
  draw sprite scene camera light fx shader input audio physics voxel ui tween data util xr
);

my @files = @ARGV;
die "usage: rewrite-namespace.pl <files>\n" unless @files;

for my $file (@files) {
  open my $fh, '<', $file or do { warn "skip $file: $!\n"; next };
  local $/;
  my $src = <$fh>;
  close $fh;

  my $orig = $src;
  for my $name (sort keys %map) {
    next if $groups{$name};
    my $group = $map{$name};
    # Replace `nova64.NAME` only when not already preceded by a sub-namespace.
    # Pattern requires `nova64.` and disallows the previous char being part of
    # a longer identifier (e.g. `nova64.scene.createCube` should not match the
    # NAME=createCube case because the regex anchors on `nova64.NAME` directly).
    $src =~ s/\bnova64\.\Q$name\E\b(?!\s*=\s*nova64\b)/nova64.$group.$name/g;
  }

  if ($src ne $orig) {
    open my $out, '>', $file or die "write $file: $!\n";
    print $out $src;
    close $out;
    print "rewrote $file\n";
  }
}
