// =================================================================
// NEON HILL CLIMBER 2D - CORE PHYSICS & LOGIC (MATTER.JS EDITION)
// =================================================================

// Module Aliases
const {
  Engine,
  Render,
  Runner,
  Bodies,
  Body,
  Composite,
  Constraint,
  Events,
  Vector,
  Query
} = Matter;

// =================================================================
// WEB AUDIO SYNTHESIZER (Premium zero-asset SFX)
// =================================================================
class WebAudioSynth {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.lowFuelBeepTime = 0;
    this.muted = false;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.setupEngineSound();
    } catch (e) {
      console.warn("Audio Context not supported in this browser.", e);
    }
  }

  setupEngineSound() {
    if (!this.ctx) return;
    
    // Create oscillator & gain nodes for hum
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55; // Low hum

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0; // Start quiet

    // Low-pass filter to make it sound like a rumbling engine
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 160;

    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc.start(0);
  }

  setEnginePitch(throttle, speedRatio) {
    if (!this.ctx || this.muted) return;
    this.init();
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const targetPitch = 45 + throttle * 28 + speedRatio * 90;
    const targetVolume = 0.05 + throttle * 0.08 + speedRatio * 0.04;

    this.engineOsc.frequency.setTargetAtTime(targetPitch, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(targetVolume, this.ctx.currentTime, 0.1);
  }

  stopEngine() {
    if (this.engineGain) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    }
  }

  playCoinSound() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.36);
  }

  playFuelSound() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(329.63, now); // E4
    osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.4); // A5
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.45);
  }

  triggerLowFuelBeep() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    if (now - this.lowFuelBeepTime < 1.2) return;
    this.lowFuelBeepTime = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, now); // E5
    
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }
}

const audio = new WebAudioSynth();

// =================================================================
// PERSISTENT UPGRADES & LOCAL STORAGE
// =================================================================
const DEFAULT_UPGRADES = {
  engine: 1,
  suspension: 1,
  tires: 1,
  stability: 1
};

let upgrades = { ...DEFAULT_UPGRADES };
let coins = 0;

function loadGameData() {
  try {
    const savedUpgrades = localStorage.getItem("deeplink_climber_upgrades");
    if (savedUpgrades) upgrades = JSON.parse(savedUpgrades);
    
    const savedCoins = localStorage.getItem("deeplink_climber_coins");
    if (savedCoins) coins = parseInt(savedCoins) || 0;
  } catch (e) {
    console.error("Failed to load local storage data.", e);
  }
}

function saveGameData() {
  try {
    localStorage.setItem("deeplink_climber_upgrades", JSON.stringify(upgrades));
    localStorage.setItem("deeplink_climber_coins", coins.toString());
  } catch (e) {
    console.error("Failed to save local storage data.", e);
  }
}

function getUpgradeCost(type, lvl) {
  if (lvl >= 10) return 0;
  return 250 + (lvl - 1) * 180;
}

function updateShopUI() {
  const types = ["engine", "suspension", "tires", "stability"];
  
  // Update menu balance
  document.getElementById("menu-coin-balance").textContent = `🪙 ${coins}`;
  document.getElementById("stat-balance").textContent = `🪙 ${coins}`;
  
  types.forEach(type => {
    const lvl = upgrades[type];
    const cost = getUpgradeCost(type, lvl);
    
    // Level Labels
    const label = lvl >= 10 ? "MAXED" : `Lvl ${lvl}/10`;
    document.getElementById(`level-${type}`).textContent = label;
    
    // Buy buttons
    const btnMenu = document.getElementById(`btn-upgrade-${type}`);
    const btnQuick = document.getElementById(`quick-upgrade-${type}`);
    const costText = lvl >= 10 ? "MAX" : `🪙 ${cost}`;

    if (btnMenu) {
      btnMenu.textContent = costText;
      if (lvl >= 10) btnMenu.classList.add("maxed");
      else btnMenu.classList.remove("maxed");
    }
    
    if (btnQuick) {
      const qCostText = document.getElementById(`quick-cost-${type}`);
      if (qCostText) qCostText.textContent = costText;
      if (lvl >= 10) btnQuick.classList.add("maxed");
      else btnQuick.classList.remove("maxed");
    }
  });
}

function buyUpgrade(type) {
  audio.init();
  const lvl = upgrades[type];
  if (lvl >= 10) return;
  
  const cost = getUpgradeCost(type, lvl);
  if (coins >= cost) {
    coins -= cost;
    upgrades[type]++;
    saveGameData();
    updateShopUI();
    audio.playCoinSound();
  } else {
    // Visual shake or red alert on balance
    const balEl = document.getElementById("menu-coin-balance");
    balEl.style.color = "#f87171";
    setTimeout(() => balEl.style.color = "#fbbf24", 400);
  }
}

// Load upgrades and shop items on script start
loadGameData();

// =================================================================
// GAME CORE CONTROLLER
// =================================================================
let engine, world, render, runner;
let buggy = null;
let terrainBodies = [];
let collectibles = [];
let particles = [];
let keys = {};
let isGameRunning = false;
let distanceTraveled = 0;
let fuel = 100.0;
let coinsCollected = 0;
let airtimeCount = 0;
let isMemePlaying = false;

// Terrain settings
const TERRAIN_SEGMENT_WIDTH = 40;
let lastTerrainX = 0;
let generatedTerrainPoints = [];

// =================================================================
// PROCEDURAL TERRAIN GENERATION (Endless Scrolling Waves)
// =================================================================
function getTerrainHeight(x) {
  const baseHeight = 480;
  if (x < 300) return baseHeight; // Perfectly flat horizontal starting runway
  
  // Multiple Octaves of Sine Waves for natural hill landscape
  const baseH = Math.sin(x * 0.0012) * 140; // Broad rolling mountains
  const midH  = Math.sin(x * 0.0035) * 60;  // Medium sized hills
  const bumpH = Math.cos(x * 0.012) * 14;   // Small ripples
  
  // Smoothly blend hills in from x = 300 to x = 600 to prevent sharp cliffs or drop-offs at spawn
  const blend = Math.max(0, Math.min(1.0, (x - 300) / 300));
  
  // Slope incline scaling further down the road
  const difficultyScale = Math.min(2.5, 1.0 + x / 3000);
  
  return baseHeight - (baseH + midH + bumpH) * difficultyScale * blend;
}

function generateTerrainAhead(targetX) {
  const chunkLength = 600;
  
  while (lastTerrainX < targetX + chunkLength) {
    const nextX = lastTerrainX + TERRAIN_SEGMENT_WIDTH;
    const y1 = getTerrainHeight(lastTerrainX);
    const y2 = getTerrainHeight(nextX);
    
    // Create solid rectangle segment
    const midX = (lastTerrainX + nextX) / 2;
    const midY = (y1 + y2) / 2;
    const length = Math.hypot(nextX - lastTerrainX, y2 - y1) + 2;
    const angle = Math.atan2(y2 - y1, nextX - lastTerrainX);
    
    const segment = Bodies.rectangle(midX, midY + 400, length, 800, {
      isStatic: true,
      friction: 0.95, // High grip tires
      render: {
        fillStyle: 'rgba(0,0,0,0)', // Invisible Matter render; drawn manually
        strokeStyle: 'rgba(0,0,0,0)'
      }
    });
    
    segment.label = "terrain";
    Composite.add(world, segment);
    terrainBodies.push(segment);
    
    // Save terrain points for manual canvas outline drawing
    generatedTerrainPoints.push({ x: lastTerrainX, y: y1 });
    
    // Spawn collectibles periodically
    spawnItemsOnSegment(lastTerrainX, y1);
    
    lastTerrainX = nextX;
  }
  
  // Clean up far behind bodies to save memory
  if (buggy) {
    const cleanBoundary = buggy.chassis.position.x - 1200;
    
    terrainBodies = terrainBodies.filter(body => {
      if (body.position.x < cleanBoundary) {
        Composite.remove(world, body);
        return false;
      }
      return true;
    });
    
    generatedTerrainPoints = generatedTerrainPoints.filter(p => p.x >= cleanBoundary - 200);
    
    collectibles = collectibles.filter(item => {
      if (item.body.position.x < cleanBoundary) {
        Composite.remove(world, item.body);
        return false;
      }
      return true;
    });
  }
}

// Spawn Coins and Gas Cans
function spawnItemsOnSegment(x, y) {
  if (x < 450) return; // Warm-up zone
  
  const stepIndex = Math.round(x / TERRAIN_SEGMENT_WIDTH);
  
  // Every 8th segment try spawning a Gas Can
  if (stepIndex % 28 === 0 && Math.random() > 0.3) {
    createCollectible(x, y - 35, 'fuel');
  } 
  // Spawn a row of coins along hill ridges
  else if (stepIndex % 9 === 0 && Math.random() > 0.4) {
    createCollectible(x, y - 30, 'coin');
  }
}

function createCollectible(x, y, type) {
  const size = type === 'coin' ? 12 : 18;
  const itemBody = Bodies.circle(x, y, size, {
    isSensor: true, // Non-physical sensor so buggy passes through it
    isStatic: true,
    render: {
      visible: false // Drawn manually in canvas overlays
    }
  });
  
  itemBody.label = type;
  Composite.add(world, itemBody);
  collectibles.push({ body: itemBody, type, collected: false });
}

// =================================================================
// VEHICLE ASSEMBLY FACTORY (Matter.js Suspended Buggy)
// =================================================================
function createBuggy(x, y) {
  // Pull upgrade modifiers
  const engineMod     = upgrades.engine;
  const suspensionMod = upgrades.suspension;
  const tiresMod      = upgrades.tires;
  
  // Stunt Bike Parameters
  const chassisW = 64;
  const chassisH = 20;
  
  // Chassis/Frame body
  const chassis = Bodies.rectangle(x, y, chassisW, chassisH, {
    density: 0.0022, 
    frictionAir: 0.08, // Snap-reactive angular damping for motorcycle stunts
    label: "chassis",
    render: { visible: false }
  });
  
  // Low Center of Mass (CoM) relative to frame
  Body.setCentre(chassis, Vector.create(0, 3.5), true);
  
  // Calibrated Motorcycle Mass & Snappy Inertia
  Body.setMass(chassis, 10.0);
  Body.setInertia(chassis, 7500);
  
  // Invisible Driver "Head" Sensor (for neck flip fail check)
  const headSensor = Bodies.circle(x - 4, y - 24, 11, {
    isSensor: true,
    density: 0.0001,
    label: "head",
    render: { visible: false }
  });

  // Weld head sensor directly to seat level
  const headWeld = Constraint.create({
    bodyA: chassis,
    bodyB: headSensor,
    pointA: Vector.create(-4, -24),
    pointB: Vector.create(0, 0),
    stiffness: 1.0,
    render: { visible: false }
  });
  
  // Bike Wheels (wheelbase of 64 units)
  const wheelRad = 20;
  const wheelOptions = {
    friction: 0.82 + tiresMod * 0.022, // Grippy bike tires
    density: 0.0016,
    label: "wheel",
    render: { visible: false }
  };
  
  const backWheel = Bodies.circle(x - 32, y + 16, wheelRad, wheelOptions);
  const frontWheel = Bodies.circle(x + 32, y + 16, wheelRad, wheelOptions);
  
  // Perfectly rigid attachments instead of soft suspension springs
  const backSpring = Constraint.create({
    bodyA: chassis,
    bodyB: backWheel,
    pointA: Vector.create(-32, 16), // Rear swingarm pivot anchor
    pointB: Vector.create(0, 0),
    stiffness: 1.0,                 // Completely rigid connection
    length: 0,
    render: { visible: false }
  });
  
  const frontSpring = Constraint.create({
    bodyA: chassis,
    bodyB: frontWheel,
    pointA: Vector.create(32, 16),  // Front forks pivot anchor
    pointB: Vector.create(0, 0),
    stiffness: 1.0,                 // Completely rigid connection
    length: 0,
    render: { visible: false }
  });
  
  Composite.add(world, [chassis, headSensor, headWeld, backWheel, frontWheel, backSpring, frontSpring]);
  
  return {
    chassis,
    headSensor,
    backWheel,
    frontWheel,
    backSpring,
    frontSpring
  };
}

// Check if a wheel body is currently in contact with the ground
function isWheelGrounded(wheel) {
  const collisions = Query.collides(wheel, terrainBodies);
  return collisions.length > 0;
}

// =================================================================
// GAME STATE LOOPS & LIFE CYCLES
// =================================================================
function startGame() {
  audio.init();
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("hud-dashboard").classList.remove("hidden");
  
  resetScene();
  isGameRunning = true;
  window.focus(); // Grab keyboard focus instantly
  requestAnimationFrame(updateGameLoop);
}

function resetScene() {
  // Clear World
  if (engine) {
    Engine.clear(engine);
    Render.stop(render);
    Runner.stop(runner);
  }
  
  // Setup Matter Engine
  engine = Engine.create({
    gravity: { x: 0, y: 1.15 } // Crisp physics gravity
  });
  world = engine.world;
  
  // HTML Canvas
  const canvas = document.getElementById("game-canvas");
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  // Initialize Custom Renderer linked to Matter Render
  render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
      width: width,
      height: height,
      wireframes: false,
      background: '#0d111d',
      showDebug: false
    }
  });
  
  Render.run(render);
  
  runner = Runner.create();
  Runner.run(runner, engine);
  
  // Resets
  lastTerrainX = 0;
  generatedTerrainPoints = [];
  terrainBodies = [];
  collectibles = [];
  particles = [];
  distanceTraveled = 0;
  fuel = 100.0;
  coinsCollected = 0;
  airtimeCount = 0;
  
  // Build Initial Flat Ground
  generateTerrainAhead(1200);
  
  // Assemble Buggy
  buggy = createBuggy(150, 280);
  
  // Collision Listeners (Collectibles & Neck Flip checks)
  Events.on(engine, 'collisionStart', handleCollisions);
  
  // Hook controls into Matter.js beforeUpdate so torque and forces are applied consistently right before physics steps
  Events.on(engine, 'beforeUpdate', () => {
    if (isGameRunning) {
      handleControls(16.66);
    }
  });
  
  // Attach Canvas Custom Render HUD & Particles Overlays
  Events.on(render, 'afterRender', drawCustomOverlays);
}

// =================================================================
// KEYBOARD CONTROLS & CONTROLLER COUPLING
// =================================================================
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  keys[e.code] = true;
  
  // Resume Audio context if browser paused it
  if (audio.ctx && audio.ctx.state === 'suspended') {
    audio.ctx.resume();
  }
});

window.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
  keys[e.code] = false;
});

// Receive keyboard event message forwards from parent React modal wrapper
window.addEventListener('message', e => {
  if (e.data && e.data.type === 'keydown' && typeof e.data.key === 'string') {
    keys[e.data.key.toLowerCase()] = true;
    keys[e.data.code || e.data.key] = true;
    if (audio.ctx && audio.ctx.state === 'suspended') {
      audio.ctx.resume();
    }
  }
  if (e.data && e.data.type === 'keyup' && typeof e.data.key === 'string') {
    keys[e.data.key.toLowerCase()] = false;
    keys[e.data.code || e.data.key] = false;
  }
});

// Update throttle logic, torque, and air rotations
function handleControls(dt) {
  if (!buggy || !isGameRunning) return;
  
  const engineLvl = upgrades.engine;
  const stabilityLvl = upgrades.stability;
  
  const gasActive = keys['d'] || keys['arrowright'];
  const brakeActive = keys['a'] || keys['arrowleft'];
  
  const bgGrounded = isWheelGrounded(buggy.backWheel);
  const fgGrounded = isWheelGrounded(buggy.frontWheel);
  const eitherGrounded = bgGrounded || fgGrounded;
  
  let throttle = 0;
  
  if (gasActive && fuel > 0) {
    throttle = 1.0;
    // Core drive: Apply torque to drive wheel
    const motorTorque = 0.045 + engineLvl * 0.007;
    buggy.backWheel.torque = motorTorque;
    
    // Directly spin up back wheel using smooth, physically accurate Matter.js scale speeds
    const maxAngularSpeed = 0.26 + engineLvl * 0.024; // Smooth scale matching radians per step
    const spinSpeed = 0.012 + engineLvl * 0.002;
    Body.setAngularVelocity(buggy.backWheel, Math.min(maxAngularSpeed, buggy.backWheel.angularVelocity + spinSpeed));
    
    // Light front-wheel drive assist (low speed)
    if (buggy.chassis.speed < 8.0) {
      buggy.frontWheel.torque = motorTorque * 0.25;
      Body.setAngularVelocity(buggy.frontWheel, Math.min(maxAngularSpeed, buggy.frontWheel.angularVelocity + spinSpeed * 0.4));
    }
  }
  
  if (brakeActive) {
    throttle = 0.1;
    // Active Braking: slow down wheels
    Body.setAngularVelocity(buggy.backWheel, buggy.backWheel.angularVelocity * 0.82);
    Body.setAngularVelocity(buggy.frontWheel, buggy.frontWheel.angularVelocity * 0.82);
  }
  
  // Fuel depletion
  if (isGameRunning) {
    const fuelConsumption = (0.045 + (gasActive ? 0.05 : 0)) * (dt / 16.66);
    fuel = Math.max(0, fuel - fuelConsumption);
    
    // Play sound on low fuel
    if (fuel < 20.0) {
      audio.triggerLowFuelBeep();
    }
    
    if (fuel <= 0) {
      triggerGameOver("OUT OF GAS", "Ran out of gasoline!");
    }
  }
  
  // Audio synthesizer link
  const speedRatio = Math.min(1.0, buggy.chassis.speed / 20.0);
  audio.setEnginePitch(throttle, speedRatio);
}

// =================================================================
// PROCEDURAL CAMERA DYNAMIC INTERPOLATION
// =================================================================
function updateCamera() {
  if (!buggy || !render) return;
  
  const chassisPos = buggy.chassis.position;
  
  // Calculate vertical landscape height ahead to look ahead on hills
  const lookAheadDistance = 220;
  const groundAhead = getTerrainHeight(chassisPos.x + lookAheadDistance);
  
  // Multi-axis smooth camera tracking box
  const targetCamX = chassisPos.x + 120;
  const targetCamY = (chassisPos.y * 0.65 + groundAhead * 0.35) - 30;
  
  const currentCam = render.bounds;
  const viewW = currentCam.max.x - currentCam.min.x;
  const viewH = currentCam.max.y - currentCam.min.y;
  
  // Linear Interpolation (lerp) for smooth camera panning
  const smoothX = render.bounds.min.x + (targetCamX - viewW / 2.8 - render.bounds.min.x) * 0.095;
  const smoothY = render.bounds.min.y + (targetCamY - viewH / 1.8 - render.bounds.min.y) * 0.065;
  
  Render.lookAt(render, {
    min: { x: smoothX, y: smoothY },
    max: { x: smoothX + viewW, y: smoothY + viewH }
  });
}

// =================================================================
// ITEM COLLISION DISPATCHER & DAMAGE SENSOR
// =================================================================
function handleCollisions(event) {
  const pairs = event.pairs;
  
  pairs.forEach(pair => {
    const { bodyA, bodyB } = pair;
    
    // Check if either is head sensor collides with terrain
    const isHead = bodyA.label === "head" || bodyB.label === "head";
    const isTerrain = bodyA.label === "terrain" || bodyB.label === "terrain";
    
    if (isHead && isTerrain) {
      triggerGameOver("DRIVER CRASHED", "Driver hit their neck!");
      return;
    }
    
    // Items collisions check
    const checkItem = (body, other) => {
      const isItem = body.label === 'coin' || body.label === 'fuel';
      const isBuggyPart = other.label === 'chassis' || other.label === 'wheel';
      
      if (isItem && isBuggyPart) {
        const item = collectibles.find(c => c.body === body);
        if (item && !item.collected) {
          item.collected = true;
          handleCollect(item);
        }
      }
    };
    
    checkItem(bodyA, bodyB);
    checkItem(bodyB, bodyA);
  });
}

function handleCollect(item) {
  // Add collection particles explosion
  const pPos = item.body.position;
  const color = item.type === 'coin' ? '#fbbf24' : '#22c55e';
  
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: pPos.x,
      y: pPos.y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.8) * 8,
      life: 1.0,
      size: 4 + Math.random() * 4,
      color
    });
  }
  
  // Remove collectible body from simulation
  Composite.remove(world, item.body);
  
  if (item.type === 'coin') {
    coinsCollected += 100;
    audio.playCoinSound();
  } else if (item.type === 'fuel') {
    fuel = Math.min(100.0, fuel + 35.0);
    audio.playFuelSound();
  }
}

// =================================================================
// LIVE CANVAS SCI-FI RENDERING & GLOW OVERLAYS
// =================================================================
function drawCustomOverlays() {
  const ctx = render.context;
  const cam = render.bounds;
  const scale = window.innerWidth / (cam.max.x - cam.min.x);
  
  ctx.save();
  // Translate manual graphics layer aligned with Matter Render camera scaling
  ctx.scale(scale, scale);
  ctx.translate(-cam.min.x, -cam.min.y);
  
  // Draw Background Parallax Scrolling mountains
  drawParallaxMountains(ctx, cam);
  
  // Draw Hills procedural solid shape
  drawProceduralHills(ctx);

  // Draw Glowing Coins and Gas canisters
  drawCollectibles(ctx);

  // Draw Exhaust Smoke and Sparks particles
  drawParticles(ctx);

  // Draw SCI-FI neon buggy skin
  if (buggy) {
    drawFuturisticBuggy(ctx);
  }
  
  ctx.restore();
}

function drawParallaxMountains(ctx, cam) {
  ctx.save();
  
  // Sky back gradient
  const skyGrad = ctx.createLinearGradient(cam.min.x, cam.min.y, cam.min.x, cam.max.y);
  skyGrad.addColorStop(0, '#0a0d1b');
  skyGrad.addColorStop(1, '#1b223c');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(cam.min.x, cam.min.y, cam.max.x - cam.min.x, cam.max.y - cam.min.y);
  
  // Far distant range
  ctx.fillStyle = 'rgba(29, 36, 68, 0.4)';
  ctx.beginPath();
  let first = true;
  for (let sx = cam.min.x; sx < cam.max.x + 100; sx += 80) {
    const px = sx * 0.08 + cam.min.x * 0.92;
    const py = cam.max.y - 140 + Math.sin(px * 0.0015) * 60 + Math.cos(px * 0.003) * 20;
    if (first) { ctx.moveTo(sx, py); first = false; }
    else ctx.lineTo(sx, py);
  }
  ctx.lineTo(cam.max.x + 100, cam.max.y + 100);
  ctx.lineTo(cam.min.x - 100, cam.max.y + 100);
  ctx.fill();

  // Medium hills range
  ctx.fillStyle = 'rgba(40, 48, 88, 0.52)';
  ctx.beginPath();
  first = true;
  for (let sx = cam.min.x; sx < cam.max.x + 100; sx += 60) {
    const px = sx * 0.22 + cam.min.x * 0.78;
    const py = cam.max.y - 100 + Math.sin(px * 0.003) * 40 + Math.cos(px * 0.007) * 12;
    if (first) { ctx.moveTo(sx, py); first = false; }
    else ctx.lineTo(sx, py);
  }
  ctx.lineTo(cam.max.x + 100, cam.max.y + 100);
  ctx.lineTo(cam.min.x - 100, cam.max.y + 100);
  ctx.fill();
  
  ctx.restore();
}

function drawProceduralHills(ctx) {
  if (generatedTerrainPoints.length < 2) return;
  
  ctx.save();
  
  // Hilly Ground solid outline
  ctx.beginPath();
  ctx.moveTo(generatedTerrainPoints[0].x, generatedTerrainPoints[0].y);
  for (let i = 1; i < generatedTerrainPoints.length; i++) {
    ctx.lineTo(generatedTerrainPoints[i].x, generatedTerrainPoints[i].y);
  }
  
  // Fill soil
  ctx.lineTo(generatedTerrainPoints[generatedTerrainPoints.length - 1].x, window.innerHeight * 5);
  ctx.lineTo(generatedTerrainPoints[0].x, window.innerHeight * 5);
  ctx.closePath();
  
  const terrainFill = ctx.createLinearGradient(0, 300, 0, 900);
  terrainFill.addColorStop(0, '#151d30');
  terrainFill.addColorStop(1, '#080c14');
  ctx.fillStyle = terrainFill;
  ctx.fill();
  
  // Draw Glowing green cybernetic grass line
  ctx.beginPath();
  ctx.moveTo(generatedTerrainPoints[0].x, generatedTerrainPoints[0].y);
  for (let i = 1; i < generatedTerrainPoints.length; i++) {
    ctx.lineTo(generatedTerrainPoints[i].x, generatedTerrainPoints[i].y);
  }
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#10b981';
  ctx.shadowBlur = 12;
  ctx.stroke();
  
  ctx.restore();
}

function drawCollectibles(ctx) {
  ctx.save();
  
  collectibles.forEach(item => {
    if (item.collected) return;
    const pos = item.body.position;
    
    ctx.save();
    ctx.translate(pos.x, pos.y);
    
    // Small vertical floating bobble effect
    const floatOffset = Math.sin(Date.now() * 0.005 + pos.x) * 4;
    ctx.translate(0, floatOffset);
    
    if (item.type === 'coin') {
      // Spinning gold coin effect
      const spinW = Math.cos(Date.now() * 0.006 + pos.x);
      
      ctx.beginPath();
      ctx.ellipse(0, 0, 10 * Math.abs(spinW), 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 8;
      ctx.fill();
      
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (item.type === 'fuel') {
      // Fuel canister drawing
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.fillRect(-8, -10, 16, 20);
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4, 10, 8, 3);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAS', 0, 3);
    }
    
    ctx.restore();
  });
  
  ctx.restore();
}

function drawParticles(ctx) {
  ctx.save();
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFuturisticBuggy(ctx) {
  const chassis = buggy.chassis;
  const bWheel = buggy.backWheel;
  const fWheel = buggy.frontWheel;
  
  ctx.save();
  
  // 1. Draw Suspension swingarms & forks
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3.5;
  
  // Rear Swingarm (metallic gray swingarm connecting chassis center to rear wheel center)
  const chassisRearPivot = Vector.add(chassis.position, Vector.rotate(Vector.create(-12, 4), chassis.angle));
  ctx.beginPath();
  ctx.moveTo(chassisRearPivot.x, chassisRearPivot.y);
  ctx.lineTo(bWheel.position.x, bWheel.position.y);
  ctx.stroke();
  
  // Front Telescopic Fork (neon-blue glowing shock forks connecting front wheel center to handlebars)
  const forkHandlebarPoint = Vector.add(chassis.position, Vector.rotate(Vector.create(20, -18), chassis.angle));
  ctx.beginPath();
  ctx.moveTo(forkHandlebarPoint.x, forkHandlebarPoint.y);
  ctx.lineTo(fWheel.position.x, fWheel.position.y);
  ctx.strokeStyle = '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 6;
  ctx.stroke();
  ctx.shadowBlur = 0; // Reset glow effects
  
  // 2. Draw Wheel units
  [bWheel, fWheel].forEach(w => {
    ctx.save();
    ctx.translate(w.position.x, w.position.y);
    ctx.rotate(w.angle);
    
    // Outer tire
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Neon tire strip outline
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Cyber spokes (cool futuristic cross-spokes)
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 2.5;
    for (let s = 0; s < 3; s++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 16);
      ctx.stroke();
    }
    
    // Inner center hub
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  });
  
  // 3. Draw Cyber-Bike Chassis Frame
  ctx.save();
  ctx.translate(chassis.position.x, chassis.position.y);
  ctx.rotate(chassis.angle);
  
  // Glowing neon frame (sleek, high-sitting geometry)
  ctx.fillStyle = 'rgba(79, 70, 229, 0.95)';
  ctx.strokeStyle = '#a78bfa';
  ctx.lineWidth = 3.5;
  ctx.shadowColor = '#a78bfa';
  ctx.shadowBlur = 10;
  
  ctx.beginPath();
  ctx.moveTo(28, -12); // Front handlebar steering stem
  ctx.lineTo(16, 2);   // Main engine frame top
  ctx.lineTo(-4, 10);  // Low seat cowl base
  ctx.lineTo(-24, 10); // Rear tail support
  ctx.lineTo(-30, -2); // Rear license tail piece
  ctx.lineTo(-12, -2); // Seat frame height
  ctx.lineTo(12, -12); // Gas tank top
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Gas Tank visual highlights
  ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#06b6d4';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(12, -11);
  ctx.lineTo(2, -4);
  ctx.lineTo(-10, -4);
  ctx.lineTo(-6, -11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Glowing exhaust under seat
  ctx.fillStyle = '#ef4444';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 6;
  ctx.fillRect(-28, 0, 10, 4);
  
  // Handlebars steering grips
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 3;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(28, -12);
  ctx.lineTo(22, -18);
  ctx.lineTo(14, -18);
  ctx.stroke();
  
  ctx.restore();
  
  // 4. Draw Driver Bobble Head Rider
  ctx.save();
  // Bobbing helmet center relative to seat level
  const helmetRestX = chassis.position.x - 4 * Math.cos(chassis.angle) - (-18) * Math.sin(chassis.angle);
  const helmetRestY = chassis.position.y - 4 * Math.sin(chassis.angle) + (-18) * Math.cos(chassis.angle);
  
  ctx.translate(helmetRestX, helmetRestY);
  ctx.rotate(chassis.angle * 0.95);
  
  // Rider helmet neck joint
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(0, -6);
  ctx.stroke();
  
  // Helmet
  ctx.fillStyle = '#ef4444';
  ctx.strokeStyle = '#b91c1c';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(0, -8, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // Helmet visor shield
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(3.5, -8, 6.5, -Math.PI / 4, Math.PI / 4);
  ctx.lineTo(3.5, -8);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
  ctx.restore();
}

// =================================================================
// GAME STATE MANAGEMENT (Fail checks, loops, toasting)
// =================================================================
function updateGameLoop() {
  if (!isGameRunning) return;
  
  // Check boundary terrain creation ahead
  if (buggy) {
    const chassisX = buggy.chassis.position.x;
    generateTerrainAhead(chassisX);
    
    // Live distance meter update
    distanceTraveled = Math.max(0, (chassisX - 150) / 10.0);
    
    // Live dashboard HUD sync
    document.getElementById("hud-distance").innerHTML = `${distanceTraveled.toFixed(1)} <span class="hud-unit">meters</span>`;
    document.getElementById("hud-coins").textContent = `🪙 ${coinsCollected}`;
    
    const fuelBar = document.getElementById("hud-fuel-bar");
    const fuelText = document.getElementById("hud-fuel-text");
    
    fuelBar.style.width = `${fuel}%`;
    fuelText.textContent = `${Math.ceil(fuel)}%`;
    
    if (fuel < 20.0) {
      fuelBar.classList.add("warning");
    } else {
      fuelBar.classList.remove("warning");
    }
    
    // Check airborne tricks / airtime toasts
    const bgGrounded = isWheelGrounded(buggy.backWheel);
    const fgGrounded = isWheelGrounded(buggy.frontWheel);
    
    if (!bgGrounded && !fgGrounded) {
      airtimeCount += 16.66 / 1000;
    } else {
      if (airtimeCount > 0.8) {
        showAirtimeToast(airtimeCount);
      }
      airtimeCount = 0;
    }
    
    // Particle motion integration
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
    });
    
    particles = particles.filter(p => p.life > 0);
  }
  
  // Smoothly lerp Matter camera view bounds
  updateCamera();
  
  requestAnimationFrame(updateGameLoop);
}

function showAirtimeToast(sec) {
  const toast = document.getElementById("airtime-toast");
  const bonus = Math.floor(sec * 150);
  
  coinsCollected += bonus;
  
  toast.textContent = `Air Time! +🪙${bonus}`;
  toast.classList.add("active");
  
  setTimeout(() => {
    toast.classList.remove("active");
  }, 1800);
}

// Trigger Game Over Screen & execute fullscreen death meme video
function triggerGameOver(title, reason) {
  if (!isGameRunning) return;
  isGameRunning = false;
  
  audio.stopEngine();
  
  // Save persistent score coins progress
  coins += coinsCollected;
  saveGameData();
  updateShopUI();
  
  // Play Death meme video overlay
  playDeathMeme(title, reason);
}

function playDeathMeme(title, reason) {
  isMemePlaying = true;
  
  const overlay = document.getElementById("meme-overlay");
  const video = document.getElementById("meme-video");
  
  overlay.classList.remove("hidden");
  
  video.currentTime = 0;
  
  // Mute game engine, play video with explicit user action allowance
  video.play().then(() => {
    console.log("Playing death meme video");
  }).catch(e => {
    console.warn("Autoplay block. Revealing menu directly.", e);
    skipDeathMeme();
  });
  
  // Show menu when video finished running
  video.onEnded = function() {
    revealGameOverScreen(title, reason);
  };
  video.addEventListener('ended', () => {
    revealGameOverScreen(title, reason);
  });
  video.addEventListener('error', () => {
    revealGameOverScreen(title, reason);
  });
}

function skipDeathMeme() {
  if (!isMemePlaying) return;
  
  const video = document.getElementById("meme-video");
  video.pause();
  
  revealGameOverScreen("CRASHED!", "Game Over");
}

function revealGameOverScreen(title, reason) {
  isMemePlaying = false;
  
  document.getElementById("meme-overlay").classList.add("hidden");
  document.getElementById("gameover-screen").classList.remove("hidden");
  
  document.getElementById("gameover-title").textContent = title;
  document.getElementById("gameover-reason").textContent = reason;
  
  document.getElementById("stat-distance").textContent = `${distanceTraveled.toFixed(1)}m`;
  document.getElementById("stat-coins").textContent = `🪙 ${coinsCollected}`;
  document.getElementById("stat-balance").textContent = `🪙 ${coins}`;

  // Update persistent high score if current distance is higher
  try {
    const currentBest = parseFloat(localStorage.getItem("deeplink_climber_best")) || 0;
    if (distanceTraveled > currentBest) {
      localStorage.setItem("deeplink_climber_best", distanceTraveled.toFixed(1));
    }
  } catch (e) {
    console.error("Failed to save high score.", e);
  }
}

function restartGame() {
  document.getElementById("gameover-screen").classList.add("hidden");
  startGame();
}

function showMainMenu() {
  document.getElementById("gameover-screen").classList.add("hidden");
  document.getElementById("hud-dashboard").classList.add("hidden");
  document.getElementById("start-screen").classList.remove("hidden");
  updateShopUI();
}

// Initial Upgrades shop update on load
updateShopUI();

// Start engine loop hooks
requestAnimationFrame(updateGameLoop);

// =================================================================
// MOBILE VIRTUAL PEDALS EVENT BINDINGS
// =================================================================
function setupTouchControls() {
  const pedalBrake = document.getElementById("pedal-brake");
  const pedalGas = document.getElementById("pedal-gas");
  
  if (!pedalBrake || !pedalGas) return;
  
  // Prevent context menus on touch hold
  const preventDefault = (e) => {
    if (e.cancelable) e.preventDefault();
  };
  
  pedalBrake.addEventListener('contextmenu', preventDefault);
  pedalGas.addEventListener('contextmenu', preventDefault);
  
  // Brake Pedal Events
  const pressBrake = (e) => {
    if (e.cancelable) e.preventDefault();
    keys['a'] = true;
    pedalBrake.classList.add("active");
  };
  
  const releaseBrake = (e) => {
    if (e.cancelable) e.preventDefault();
    keys['a'] = false;
    pedalBrake.classList.remove("active");
  };
  
  pedalBrake.addEventListener('touchstart', pressBrake, { passive: false });
  pedalBrake.addEventListener('touchend', releaseBrake, { passive: false });
  pedalBrake.addEventListener('touchcancel', releaseBrake, { passive: false });
  pedalBrake.addEventListener('mousedown', pressBrake);
  pedalBrake.addEventListener('mouseup', releaseBrake);
  pedalBrake.addEventListener('mouseleave', releaseBrake);
  
  // Gas Pedal Events
  const pressGas = (e) => {
    if (e.cancelable) e.preventDefault();
    keys['d'] = true;
    pedalGas.classList.add("active");
  };
  
  const releaseGas = (e) => {
    if (e.cancelable) e.preventDefault();
    keys['d'] = false;
    pedalGas.classList.remove("active");
  };
  
  pedalGas.addEventListener('touchstart', pressGas, { passive: false });
  pedalGas.addEventListener('touchend', releaseGas, { passive: false });
  pedalGas.addEventListener('touchcancel', releaseGas, { passive: false });
  pedalGas.addEventListener('mousedown', pressGas);
  pedalGas.addEventListener('mouseup', releaseGas);
  pedalGas.addEventListener('mouseleave', releaseGas);
}

// Bind touch controls on DOM load
setupTouchControls();
