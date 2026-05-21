"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, RotateCcw, X, ShieldAlert, Award, 
  Coins, Zap, Compass, Anchor, Disc, Volume2, VolumeX 
} from 'lucide-react';
import confetti from 'canvas-confetti';

// --- MATHS & TERRAIN ---
const getTerrainHeight = (x) => {
  if (x < 0) return 0;
  
  // Scale difficulty factor based on distance (maxes out at 3000m)
  const distanceScale = Math.min(1.0, x / 3000);
  
  // Base wavelength & amplitudes
  const baseAmp = 70 + distanceScale * 130;
  const baseFreq = 0.003;
  
  // Octave 1: Main rolling hills
  let h = Math.sin(x * baseFreq) * baseAmp;
  
  // Octave 2: Mid-sized steep slopes
  h += Math.sin(x * baseFreq * 2.3 + 1.5) * (baseAmp * 0.45);
  
  // Octave 3: Small bumpy sections (adds texture)
  h += Math.sin(x * baseFreq * 6.5) * (12 + distanceScale * 20);
  
  // Valley Gaps and large drops at further distances
  if (x > 400) {
    const valleyScale = Math.min(1.0, (x - 400) / 2000);
    const valleyWave = Math.sin(x * 0.0009);
    if (valleyWave < -0.3) {
      h += valleyWave * (120 * valleyScale);
    }
  }
  
  return h - 50; // shift down slightly
};

const getTerrainSlope = (x) => {
  const dx = 1.0;
  const h1 = getTerrainHeight(x - dx);
  const h2 = getTerrainHeight(x + dx);
  return Math.atan2(h2 - h1, 2 * dx);
};

// --- AUDIO SYNTHESIZER ---
class VehicleAudioSynth {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.lowFuelOsc = null;
    this.lowFuelGain = null;
    this.isMuted = false;
    this.lastLowFuelBeep = 0;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.setupEngine();
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  setupEngine() {
    if (!this.ctx) return;
    
    // Engine sound utilizes a triangle wave + lowpass filter for deep revs
    this.engineOsc = this.ctx.createOscillator();
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineGain = this.ctx.createGain();

    this.engineOsc.type = 'triangle';
    this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime); // Base idle freq

    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(250, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(4, this.ctx.currentTime);

    this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.07, this.ctx.currentTime);

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc.start();
  }

  setEnginePitch(throttle, speedRatio) {
    if (!this.ctx || this.isMuted || !this.engineOsc) return;
    
    // Calculate RPM ratio
    const rpm = 45 + throttle * 120 + speedRatio * 90;
    const filterFreq = 200 + throttle * 350 + speedRatio * 200;
    const volume = 0.06 + throttle * 0.05 + speedRatio * 0.03;
    
    const now = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(rpm, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);
    this.engineGain.gain.setTargetAtTime(volume, now, 0.15);
  }

  playCoinSound(coinType) {
    if (!this.ctx || this.isMuted) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    
    // Different coins have different pitch heights
    let baseFreq = 880; // Bronze
    if (coinType === 'silver') baseFreq = 1100;
    if (coinType === 'gold') baseFreq = 1320;
    
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playFuelSound() {
    if (!this.ctx || this.isMuted) return;
    
    const now = this.ctx.currentTime;
    
    // Double sweet chimes
    const notes = [659.25, 987.77]; // E5, B5
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      
      gain.gain.setValueAtTime(0.06, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.3);
    });
  }

  triggerLowFuelBeep() {
    if (!this.ctx || this.isMuted) return;
    const now = Date.now();
    if (now - this.lastLowFuelBeep < 1500) return; // limit frequency of fuel alarm
    
    this.lastLowFuelBeep = now;
    
    const audioNow = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, audioNow);
    
    // High Q filter for retro synth buzz
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, audioNow);
    
    gain.gain.setValueAtTime(0.05, audioNow);
    gain.gain.setValueAtTime(0.05, audioNow + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, audioNow + 0.3);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(audioNow);
    osc.stop(audioNow + 0.35);
  }

  playCrashSound() {
    if (!this.ctx || this.isMuted) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(30, now + 0.5);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + 0.5);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.6);
  }

  setMute(muted) {
    this.isMuted = muted;
    if (this.engineGain) {
      this.engineGain.gain.setValueAtTime(muted ? 0 : 0.07, this.ctx?.currentTime || 0);
    }
  }

  stop() {
    if (this.engineOsc) {
      try { this.engineOsc.stop(); } catch (e) {}
      this.engineOsc = null;
    }
    this.ctx = null;
  }
}

export default function VehicleGame({ onClose }) {
  // Game states
  const [isPlaying, setIsPlaying] = useState(false);
  const [inGarage, setInGarage] = useState(true);
  const [coins, setCoins] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  // Game scores in active run
  const [distance, setDistance] = useState(0);
  const [runCoins, setRunCoins] = useState(0);
  const [gameOverReason, setGameOverReason] = useState(null); // 'fuel' or 'crash'

  // Upgrades
  const [upgrades, setUpgrades] = useState({
    engine: 1,
    suspension: 1,
    tires: 1,
    stability: 1
  });

  // Live refs so the RAF loop always reads fresh values (avoids stale closures)
  const coinsRef = useRef(0);
  const highScoreRef = useRef(0);
  const upgradesRef = useRef({ engine: 1, suspension: 1, tires: 1, stability: 1 });
  const fuelBarRef = useRef(null); // DOM ref for live fuel bar width

  // UI upgrade stats display descriptions
  const UPGRADE_METRICS = {
    engine: { name: 'Engine Torque', icon: <Zap className="w-4 h-4 text-amber-500" />, desc: 'Climb hills with maximum torque and acceleration power.' },
    suspension: { name: 'Spring Dampers', icon: <Anchor className="w-4 h-4 text-blue-500" />, desc: 'Lowers chassis center of gravity and dampens bounce impact.' },
    tires: { name: 'High-Grip Tires', icon: <Disc className="w-4 h-4 text-emerald-500" />, desc: 'Increases friction/traction to prevent sliding on steep mud.' },
    stability: { name: 'Mid-Air Stability', icon: <Compass className="w-4 h-4 text-purple-500" />, desc: 'Boosts rotational torque responsiveness when airborne.' }
  };

  const getUpgradeCost = (level) => {
    if (level >= 10) return Infinity;
    return Math.floor(1000 * Math.pow(1.5, level - 1));
  };

  // Canvas and loop refs
  const canvasRef = useRef(null);
  const audioSynthRef = useRef(null);
  const loopRef = useRef(null);
  
  // Physics states (stored in refs for real-time calculation inside requestAnimationFrame)
  const keysRef = useRef({ ArrowLeft: false, ArrowRight: false, a: false, d: false });
  const touchPedalsRef = useRef({ gas: false, brake: false });

  // Load persistence details
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedCoins = localStorage.getItem('deeplink_climber_coins');
        const savedBest = localStorage.getItem('deeplink_climber_best');
        const savedUpgrades = localStorage.getItem('deeplink_climber_upgrades');
        
        if (savedCoins) {
          // Cap at 999,999 to recover from any previous accumulation bugs
          const v = Math.min(999999, Math.max(0, parseInt(savedCoins, 10) || 0));
          setCoins(v);
          coinsRef.current = v;
          // Persist the capped value immediately
          localStorage.setItem('deeplink_climber_coins', v.toString());
        }
        if (savedBest) {
          const v = parseFloat(savedBest);
          setHighScore(v);
          highScoreRef.current = v;
        }
        if (savedUpgrades) {
          const v = JSON.parse(savedUpgrades);
          setUpgrades(v);
          upgradesRef.current = v;
        }
      } catch (e) {
        console.error("Error reading from localstorage:", e);
      }
    }
    
    // Initialize audio synth
    audioSynthRef.current = new VehicleAudioSynth();
    return () => {
      if (audioSynthRef.current) {
        audioSynthRef.current.stop();
      }
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, []);

  const saveStats = (newCoins, newBest, newUpgrades) => {
    try {
      localStorage.setItem('deeplink_climber_coins', newCoins.toString());
      localStorage.setItem('deeplink_climber_best', newBest.toFixed(1));
      localStorage.setItem('deeplink_climber_upgrades', JSON.stringify(newUpgrades));
    } catch (e) {
      console.error("Error writing to localstorage:", e);
    }
  };

  const buyUpgrade = (stat) => {
    const currentLvl = upgrades[stat];
    if (currentLvl >= 10) return;
    
    const cost = getUpgradeCost(currentLvl);
    if (coins >= cost) {
      const updatedUpgrades = { ...upgrades, [stat]: currentLvl + 1 };
      const remainingCoins = coins - cost;
      
      setCoins(remainingCoins);
      coinsRef.current = remainingCoins;
      setUpgrades(updatedUpgrades);
      upgradesRef.current = updatedUpgrades;
      saveStats(remainingCoins, highScoreRef.current, updatedUpgrades);
      
      // Play brief synthesizer sound for purchase confirmation
      if (audioSynthRef.current) {
        audioSynthRef.current.playCoinSound('gold');
      }
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (audioSynthRef.current) {
      audioSynthRef.current.setMute(nextMute);
    }
  };

  // Launch run
  const startRun = () => {
    // Cancel any existing animation loop before starting fresh
    if (loopRef.current) {
      cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
    }

    setIsPlaying(true);
    setInGarage(false);
    setGameOverReason(null);
    setRunCoins(0);
    setDistance(0);
    
    // Start Audio Context
    if (audioSynthRef.current) {
      audioSynthRef.current.init();
      audioSynthRef.current.setMute(isMuted);
    }
    
    // Initialize game loop physics
    setTimeout(() => {
      setupPhysicsAndStartLoop();
    }, 100);
  };

  // Setup loop
  const setupPhysicsAndStartLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Read upgrades from ref so we always get the latest values (avoids stale closure)
    const upgrade_engine = upgradesRef.current.engine;
    const upgrade_suspension = upgradesRef.current.suspension;
    const upgrade_tires = upgradesRef.current.tires;
    const upgrade_stability = upgradesRef.current.stability;

    // Local mutable run-coin counter (avoids batched React state lag in the loop)
    let localRunCoins = 0;

    // Rigid-body vehicle configuration
    const initX = 150; // start a bit further right for flatter terrain
    const initAngle = 0.0; // start perfectly upright
    const initCos = 1.0;
    const initSin = 0.0;

    // Scan terrain at wheel positions so wheels spawn just above ground (no free-fall)
    const springRestLengthInit = 48 - (upgrade_suspension * 1.5);
    const wheelRadius = 20;
    const terrainAtBack  = getTerrainHeight(initX - 40);
    const terrainAtFront = getTerrainHeight(initX + 40);
    const terrainAtCenter = getTerrainHeight(initX);
    // chassisY must place wheel bottoms just 2px above highest nearby terrain
    // wheel bottom = chassisY - 14 (attach offset) - springRestLength - wheelRadius
    const highestTerrain = Math.max(terrainAtBack, terrainAtFront, terrainAtCenter);
    const initY = highestTerrain + 14 + springRestLengthInit + wheelRadius + 2;

    const backRestX  = initX - 38;
    const backRestY  = initY - 10;
    const frontRestX = initX + 36;
    const frontRestY = initY - 10;

    const vehicle = {
      // Chassis parameters
      x: initX,
      y: initY,
      vx: 60,  // small initial push so the car immediately moves right
      vy: 0,
      angle: initAngle,
      angularVelocity: 0,
      mass: 8.0,
      inertia: 7500.0,
      width: 100,
      height: 35,
      fuel: 100.0,
      // Driver bobble-head coordinates
      headX: initX - 12,
      headY: initY + 26,
      headVelX: 60,
      headVelY: 0,

      // Spring suspension wheels — spawn wheels directly below attachment points
      backWheel: {
        x: backRestX,
        y: backRestY - springRestLengthInit,
        vx: 60,
        vy: 0,
        radius: wheelRadius,
        angle: 0,
        angularVelocity: 3.0, // pre-spin matches initial vx so no slip shock
        onGround: false,
        mass: 1.5
      },
      frontWheel: {
        x: frontRestX,
        y: frontRestY - springRestLengthInit,
        vx: 60,
        vy: 0,
        radius: wheelRadius,
        angle: 0,
        angularVelocity: 3.0,
        onGround: false,
        mass: 1.5
      }
    };

    // Grace-period timer: ignore crashes for the first 2 seconds while physics settle
    let raceStartTimestamp = -1;

    // Camera tracker
    let camera = {
      x: 100,
      y: 0,
      scale: 1.0
    };

    // Airtime tracker
    let airTimeCount = 0;
    let airTimeMessage = "";
    let airTimeMessageTimer = 0;
    let totalFlipsCount = 0;
    let startAirAngle = 0;

    // Collectibles & Hazards cache (keeps track of spawned elements inside camera viewport)
    let coinsList = [];
    let fuelsList = [];
    let particlesList = [];

    // Local function to spawn coins/fuels along hills
    const populateTerrainAhead = (startX, endX) => {
      // Deterministic layout based on terrain points
      const step = 65;
      for (let tx = Math.floor(startX / step) * step; tx < endX; tx += step) {
        if (tx < 150) continue; // no early spawns
        
        // Spawn coin cluster periodically on ridges
        const coinPattern = Math.sin(tx * 0.03);
        const spawnCoin = coinPattern > 0.65;
        const spawnFuel = Math.sin(tx * 0.007) > 0.94; // canister every few hundred meters
        
        // Prevent double spawn on same coordinate
        const hasCoin = coinsList.some(c => Math.abs(c.x - tx) < 30);
        const hasFuel = fuelsList.some(f => Math.abs(f.x - tx) < 30);
        
        if (spawnFuel && !hasFuel && !hasCoin) {
          fuelsList.push({
            x: tx,
            y: getTerrainHeight(tx) + 25,
            collected: false
          });
        } else if (spawnCoin && !hasCoin && !hasFuel) {
          // bronze, silver, gold depends on distance
          let type = 'bronze';
          let value = 100;
          if (tx > 800) { type = 'silver'; value = 500; }
          if (tx > 2000) { type = 'gold'; value = 1000; }

          coinsList.push({
            x: tx,
            y: getTerrainHeight(tx) + 30 + Math.sin(tx * 0.15) * 12,
            type,
            value,
            collected: false
          });
        }
      }
      
      // Clean up far off screen items to prevent memory inflation
      coinsList = coinsList.filter(c => c.x > camera.x - 600);
      fuelsList = fuelsList.filter(f => f.x > camera.x - 600);
    };

    let lastTime = performance.now();

    // Inner game loop execution
    const update = (timestamp) => {
      let dt = (timestamp - lastTime) / 1000;
      if (dt > 0.1) dt = 0.1; // cap timestep to avoid explosion
      lastTime = timestamp;

      // Handle Canvas size
      const width = canvas.width = canvas.clientWidth;
      const height = canvas.height = canvas.clientHeight;
      const ctx = canvas.getContext('2d');

      // Populate items ahead
      populateTerrainAhead(camera.x + 400, camera.x + 1000);

      // --- USER CONTROLS ---
      const gasActive = keysRef.current.ArrowRight || keysRef.current.d || touchPedalsRef.current.gas;
      const brakeActive = keysRef.current.ArrowLeft || keysRef.current.a || touchPedalsRef.current.brake;

      // ═══════════════════════════════════════════════════════════════════
      // HILL CLIMB RACING PHYSICS ENGINE
      // ═══════════════════════════════════════════════════════════════════
      // Architecture:
      //  • Independent spring-damper suspension for each wheel
      //  • Rear-wheel drive: engine torque → wheel spin → traction → chassis
      //  • Speed-dependent torque curve (power drops off at high speed)
      //  • Impulse-based friction with μ·N normal-force model
      //  • Chassis hull collision (5 sample points) prevents body sinking
      //  • 8 substeps for rock-solid numerical stability
      // ═══════════════════════════════════════════════════════════════════

      // Tunable constants (upgrade levels scale performance)
      const GRAV         = -240;                              // px/s²
      const SPRING_REST  = 42 - upgrade_suspension * 1.2;    // px
      const SPRING_K     = 480 + upgrade_suspension * 50;    // stiffness
      const SPRING_C     = 48  + upgrade_suspension * 9;     // damping
      const WHEEL_MASS   = vehicle.backWheel.mass;            // kg equiv.
      const CHASSIS_MASS = vehicle.mass;
      const INERTIA      = vehicle.inertia;
      const ENGINE_PEAK  = 1600 + upgrade_engine * 320;      // peak torque
      const MAX_SPD      = 480 + upgrade_engine * 20;        // top speed px/s
      const TRACTION_MU  = 0.82 + upgrade_tires * 0.04;      // traction coefficient

      const subSteps = 8;
      const sdt = dt / subSteps;

      for (let step = 0; step < subSteps; step++) {

        // ── Chassis rotation matrix ────────────────────────────────────
        const cA = Math.cos(vehicle.angle);
        const sA = Math.sin(vehicle.angle);

        // ── Suspension attachment points (world space) ─────────────────
        // Local offsets: back=(-38,+10) front=(+36,+10) — +10 means 10 px
        // above chassis centre in local Y (which is downward in screen-up coords)
        // World position: P_world = chassis_pos + R * P_local
        const bAX = vehicle.x + (-38) * cA - (10) * sA;
        const bAY = vehicle.y + (-38) * sA + (10) * cA;
        const fAX = vehicle.x + ( 36) * cA - (10) * sA;
        const fAY = vehicle.y + ( 36) * sA + (10) * cA;

        // Attachment-point velocities from rigid-body kinematics:
        //   v_attach = v_chassis + ω × r   (2-D: ω × r = (-ω·ry, ω·rx))
        const bAVx = vehicle.vx - vehicle.angularVelocity * (bAY - vehicle.y);
        const bAVy = vehicle.vy + vehicle.angularVelocity * (bAX - vehicle.x);
        const fAVx = vehicle.vx - vehicle.angularVelocity * (fAY - vehicle.y);
        const fAVy = vehicle.vy + vehicle.angularVelocity * (fAX - vehicle.x);

        // ── Spring-damper force ────────────────────────────────────────
        // F = −K·(|spring| − rest) − C·(ṙ·r̂)   along the spring axis.
        // Returned force acts ON the wheel (away from attachment point).
        const springForce = (wx, wy, wvx, wvy, ax, ay, avx, avy) => {
          const dx  = wx - ax;
          const dy  = wy - ay;
          const len = Math.hypot(dx, dy) || 0.001;
          const ux  = dx / len;  const uy = dy / len;
          const relV = (wvx - avx) * ux + (wvy - avy) * uy;
          const raw  = -SPRING_K * (len - SPRING_REST) - SPRING_C * relV;
          const mag  = Math.max(-4000, Math.min(4000, raw));
          return { fx: mag * ux, fy: mag * uy, mag };
        };

        const bS = springForce(
          vehicle.backWheel.x,  vehicle.backWheel.y,
          vehicle.backWheel.vx, vehicle.backWheel.vy,
          bAX, bAY, bAVx, bAVy
        );
        const fS = springForce(
          vehicle.frontWheel.x,  vehicle.frontWheel.y,
          vehicle.frontWheel.vx, vehicle.frontWheel.vy,
          fAX, fAY, fAVx, fAVy
        );

        // ── Wheel integration ──────────────────────────────────────────
        [vehicle.backWheel, vehicle.frontWheel].forEach((w, idx) => {
          const sf = (idx === 0) ? bS : fS;

          // Gravity + spring on wheel
          w.vx += (sf.fx / WHEEL_MASS) * sdt;
          w.vy += (GRAV + sf.fy / WHEEL_MASS) * sdt;

          // Clamp wheel velocity (prevents tunnelling on big hits)
          w.vx = Math.max(-700, Math.min(700, w.vx));
          w.vy = Math.max(-700, Math.min(700, w.vy));

          w.x += w.vx * sdt;
          w.y += w.vy * sdt;

          // ── Terrain collision ──────────────────────────────────────
          w.onGround = false;
          const th    = getTerrainHeight(w.x);
          const pen   = th + w.radius - w.y;   // positive = penetrating

          if (pen > 0) {
            w.onGround = true;
            w.y = th + w.radius;               // positional correction

            const slope = getTerrainSlope(w.x);
            const Nx = -Math.sin(slope);        // terrain normal
            const Ny =  Math.cos(slope);
            const Tx =  Math.cos(slope);        // terrain tangent (forward)
            const Ty =  Math.sin(slope);

            // Normal impulse: remove velocity into terrain (inelastic, e=0.18)
            const vn = w.vx * Nx + w.vy * Ny;
            if (vn < 0) {
              w.vx -= vn * Nx * 1.18;
              w.vy -= vn * Ny * 1.18;
            }

            // ── Traction friction ──────────────────────────────────
            // Coulomb model: friction ≤ μ · N
            // Normal force N ≈ spring compression force (keeps contact)
            const N       = Math.max(0, pen * SPRING_K);     // approx normal force
            const maxFr   = TRACTION_MU * N;                 // μ·N limit

            const vt      = w.vx * Tx + w.vy * Ty;          // tangential wheel velocity
            const surfSpd = w.angularVelocity * w.radius;    // wheel surface speed
            const slip    = vt - surfSpd;

            // Impulse to cancel slip, clamped by Coulomb limit
            const frImpulse = Math.max(
              -maxFr * sdt,
              Math.min( maxFr * sdt, -slip * WHEEL_MASS * 0.5)
            );

            w.vx += (frImpulse / WHEEL_MASS) * Tx;
            w.vy += (frImpulse / WHEEL_MASS) * Ty;
            w.angularVelocity -= frImpulse / (WHEEL_MASS * w.radius * 0.5);

            // ── Engine (rear-wheel drive) ──────────────────────────
            if (gasActive && vehicle.fuel > 0 && idx === 0) {
              const spd         = Math.abs(vehicle.vx);
              // Torque tapers with speed (realistic power curve)
              const curveFactor = Math.max(0.12, 1.0 - spd / MAX_SPD);
              const engForce    = ENGINE_PEAK * curveFactor * sdt;

              // Torque spins the wheel
              w.angularVelocity += engForce / (w.radius * WHEEL_MASS);

              // Traction reaction drives chassis directly (axle force)
              vehicle.vx += engForce * curveFactor * Tx / CHASSIS_MASS;
              vehicle.vy += engForce * curveFactor * Ty / CHASSIS_MASS;
            }

            // Light front-wheel drag assist (4WD feel at low speeds)
            if (gasActive && vehicle.fuel > 0 && idx === 1) {
              const spd   = Math.abs(vehicle.vx);
              const blend = Math.max(0, 0.18 - spd / MAX_SPD * 0.1);
              vehicle.vx += ENGINE_PEAK * blend * sdt * Tx / CHASSIS_MASS;
              w.angularVelocity += ENGINE_PEAK * blend * 0.3 * sdt / (w.radius * WHEEL_MASS);
            }

            // ── Brake ─────────────────────────────────────────────
            if (brakeActive) {
              w.angularVelocity *= Math.max(0, 1 - 24 * sdt);
              const bFr = Math.min(Math.abs(vt) * 12 * sdt, Math.abs(vt));
              w.vx -= Math.sign(vt) * bFr * Tx;
              w.vy -= Math.sign(vt) * bFr * Ty;
            }

            // Rolling friction (small constant drag)
            w.angularVelocity *= Math.max(0, 1 - 0.32 * sdt);
            w.angle += w.angularVelocity * sdt;

          } else {
            // Airborne: very light spin-down
            w.angularVelocity *= Math.max(0, 1 - 0.15 * sdt);
            w.angle += w.angularVelocity * sdt;
          }
        });

        // ── Chassis rigid-body dynamics ────────────────────────────────
        // Newton's 3rd: chassis receives equal-and-opposite spring forces
        const chassisFx = -(bS.fx + fS.fx);
        const chassisFy = -(bS.fy + fS.fy);

        vehicle.vx += (chassisFx / CHASSIS_MASS) * sdt;
        vehicle.vy += (GRAV + chassisFy / CHASSIS_MASS) * sdt;

        // Torque from suspension arms: τ = r × F  (2D: rx·Fy − ry·Fx)
        const bTq = (bAX - vehicle.x) * (-bS.fy) - (bAY - vehicle.y) * (-bS.fx);
        const fTq = (fAX - vehicle.x) * (-fS.fy) - (fAY - vehicle.y) * (-fS.fx);
        vehicle.angularVelocity += (bTq + fTq) * sdt / INERTIA;

        // ── Mid-air rotation control ───────────────────────────────────
        const inAir = !vehicle.backWheel.onGround && !vehicle.frontWheel.onGround;
        if (inAir) {
          const ctrl = 8.0 + upgrade_stability * 2.0;
          if (gasActive)   vehicle.angularVelocity -= ctrl * sdt;  // nose down (→ land flat)
          if (brakeActive) vehicle.angularVelocity += ctrl * sdt;  // nose up  (→ back-flip)
        }

        // Angular drag: lighter in air for flip feel, stronger on ground to stay level
        vehicle.angularVelocity *= Math.max(0, 1 - (inAir ? 0.28 : 0.55) * sdt);
        vehicle.angularVelocity  = Math.max(-14, Math.min(14, vehicle.angularVelocity));

        // Chassis velocity & position integration
        vehicle.vx = Math.max(-(MAX_SPD + 150), Math.min(MAX_SPD + 150, vehicle.vx));
        vehicle.vy = Math.max(-650, Math.min(500, vehicle.vy));
        vehicle.x += vehicle.vx * sdt;
        vehicle.y += vehicle.vy * sdt;
        vehicle.angle += vehicle.angularVelocity * sdt;

        // ── Chassis hull terrain collision ─────────────────────────────
        // 5 sample points along chassis bottom (local y = −12)
        // Prevents car body from ever going underground
        {
          const hCos = Math.cos(vehicle.angle);
          const hSin = Math.sin(vehicle.angle);
          [-44, -22, 0, 22, 42].forEach(lx => {
            const wx = vehicle.x + lx * hCos - (-12) * hSin;
            const wy = vehicle.y + lx * hSin + (-12) * hCos;
            const th = getTerrainHeight(wx);
            if (wy < th) {
              const p = th - wy;
              vehicle.y  += p * 0.8;
              if (vehicle.vy < 0) vehicle.vy *= -0.12;        // near-inelastic bounce
              // Corrective torque: the side that hit gets pushed up
              const rx = wx - vehicle.x;
              vehicle.angularVelocity -= rx * p * 0.055 * sdt; // gentle level-out torque
            }
          });
        }

        // Fuel consumption
        if (vehicle.fuel > 0) {
          vehicle.fuel = Math.max(0, vehicle.fuel - (2.1 + (gasActive ? 2.3 : 0)) * sdt);
        }

        // Angle wrap-around (keep in [-4π, +4π] range)
        if (vehicle.angle >  Math.PI * 4) { vehicle.angle -= Math.PI * 2; startAirAngle -= Math.PI * 2; }
        if (vehicle.angle < -Math.PI * 4) { vehicle.angle += Math.PI * 2; startAirAngle += Math.PI * 2; }
      }

      // --- CRASH / GAME OVER CHECKS ---
      // Driver's head position (spring mounted top)
      const headRestX = vehicle.x - 12 * Math.cos(vehicle.angle) + 26 * Math.sin(vehicle.angle);
      const headRestY = vehicle.y - 12 * Math.sin(vehicle.angle) + 26 * Math.cos(vehicle.angle);
      
      // Bobble head spring integration
      const hdx = headRestX - vehicle.headX;
      const hdy = headRestY - vehicle.headY;
      vehicle.headVelX += (hdx * 12.0 - vehicle.headVelX * 1.5) * dt;
      vehicle.headVelY += (hdy * 12.0 - vehicle.headVelY * 1.5) * dt;
      vehicle.headX += vehicle.headVelX * dt;
      vehicle.headY += vehicle.headVelY * dt;

      // Crash trigger: Driver down (head touches green grass boundary)
      const headTerrainH = getTerrainHeight(vehicle.headX);
      const chassisTerrainH = getTerrainHeight(vehicle.x);
      
      // Normalise angle to [0, 2π) to reliably detect upside-down orientation
      const normAngle = ((vehicle.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const isCarUpsideDown = normAngle > 1.6 && normAngle < 4.7; // ~92° – ~270°

      // Set grace period start on first frame
      if (raceStartTimestamp < 0) raceStartTimestamp = timestamp;
      const graceActive = (timestamp - raceStartTimestamp) < 2200; // 2.2s grace

      if (!graceActive) {
        if (vehicle.headY <= headTerrainH + 2 || (isCarUpsideDown && vehicle.y < chassisTerrainH + 16)) {
          handleGameOver('crash');
          return;
        }
      }

      if (vehicle.fuel <= 0) {
        handleGameOver('fuel');
        return;
      }

      // --- AIRTIME BONUS DETECTOR ---
      const currentlyInAir = !vehicle.backWheel.onGround && !vehicle.frontWheel.onGround;
      if (currentlyInAir) {
        if (airTimeCount === 0) {
          startAirAngle = vehicle.angle;
        }
        airTimeCount += dt;
      } else {
        if (airTimeCount > 0.9) {
          // Calculate amount of full flips performed
          const angleDiff = Math.abs(vehicle.angle - startAirAngle);
          const fullFlips = Math.floor(angleDiff / (Math.PI * 1.8)); // 360 degrees flip allowance
          
          let bonus = Math.floor(airTimeCount * 150);
          let label = `Air Time Bonus! +${bonus}`;
          
          if (fullFlips > 0) {
            totalFlipsCount += fullFlips;
            const flipBonus = fullFlips * 1000;
            bonus += flipBonus;
            label = `${fullFlips}x Backflip Combo! +${bonus}`;
            
            // confetti burst for backflips!
            confetti({
              particleCount: 40,
              spread: 60,
              origin: { x: 0.5, y: 0.4 }
            });
          }

          localRunCoins += bonus;
          coinsRef.current += bonus;
          setRunCoins(localRunCoins);
          setCoins(coinsRef.current);
          
          airTimeMessage = label;
          airTimeMessageTimer = 2.0; // show message for 2 seconds
          
          if (audioSynthRef.current) {
            audioSynthRef.current.playCoinSound('gold');
          }
        }
        airTimeCount = 0;
      }

      // Decrement notifications timers
      if (airTimeMessageTimer > 0) {
        airTimeMessageTimer -= dt;
        if (airTimeMessageTimer <= 0) airTimeMessage = "";
      }

      // Pitch Engine sound
      if (audioSynthRef.current) {
        const driveInput = gasActive ? 1.0 : (brakeActive ? 0.35 : 0.0);
        // speed scaling mapping
        const currentSpeed = Math.abs(vehicle.vx) / 300;
        audioSynthRef.current.setEnginePitch(driveInput, currentSpeed);

        // Play warning alarm on extremely low fuel
        if (vehicle.fuel < 20.0) {
          audioSynthRef.current.triggerLowFuelBeep();
        }
      }

      // --- LIVE FUEL BAR UPDATE (direct DOM mutation for zero-lag rendering) ---
      if (fuelBarRef.current) {
        fuelBarRef.current.style.width = `${vehicle.fuel}%`;
      }
      const fuelPctEl = document.getElementById('gameplay-fuel-pct');
      if (fuelPctEl) {
        fuelPctEl.textContent = `${Math.ceil(vehicle.fuel)}%`;
      }

      // --- ITEM COLLISION CHECKS ---
      coinsList.forEach(c => {
        if (!c.collected && Math.hypot(vehicle.x - c.x, vehicle.y - c.y) < 55) {
          c.collected = true;
          localRunCoins += c.value;
          coinsRef.current += c.value;
          setRunCoins(localRunCoins);
          setCoins(coinsRef.current);
          
          // Spawn sparkle particles
          for (let i = 0; i < 6; i++) {
            particlesList.push({
              x: c.x,
              y: c.y,
              vx: (Math.random() - 0.5) * 120,
              vy: (Math.random() - 0.5) * 120 + 40,
              life: 0.4,
              color: c.type === 'gold' ? '#eab308' : (c.type === 'silver' ? '#cbd5e1' : '#b45309')
            });
          }

          if (audioSynthRef.current) {
            audioSynthRef.current.playCoinSound(c.type);
          }
        }
      });

      fuelsList.forEach(f => {
        if (!f.collected && Math.hypot(vehicle.x - f.x, vehicle.y - f.y) < 55) {
          f.collected = true;
          vehicle.fuel = 100.0;
          
          // green fuel splash particles
          for (let i = 0; i < 10; i++) {
            particlesList.push({
              x: f.x,
              y: f.y,
              vx: (Math.random() - 0.5) * 140,
              vy: (Math.random() - 0.5) * 140 + 50,
              life: 0.5,
              color: '#22c55e'
            });
          }

          if (audioSynthRef.current) {
            audioSynthRef.current.playFuelSound();
          }
        }
      });

      // Update distance score (divided by 12 for friendly meters display)
      // Use a local variable — React state 'distance' is stale inside the closure
      const currentDist = Math.max(0, (vehicle.x - initX) / 10); // meters from start
      setDistance(currentDist);

      // --- SPAWN MOTOR EXHAUST PARTICLES ---
      if (Math.random() < 0.35) {
        const cos = Math.cos(vehicle.angle);
        const sin = Math.sin(vehicle.angle);
        // exhaust pipe rest coords relative to chassis
        const exX = vehicle.x - 52 * cos - 2 * sin;
        const exY = vehicle.y - 52 * sin + 2 * cos;
        particlesList.push({
          x: exX,
          y: exY,
          vx: -vehicle.vx * 0.4 - cos * 60 + (Math.random() - 0.5) * 20,
          vy: -vehicle.vy * 0.4 - sin * 60 + (Math.random() - 0.5) * 20,
          life: 0.6,
          size: 4 + Math.random() * 4,
          color: gasActive ? 'rgba(156,163,175,0.7)' : 'rgba(209,213,219,0.4)'
        });
      }

      // Spawn tyre dirt particles on contact
      [vehicle.backWheel, vehicle.frontWheel].forEach(w => {
        if (w.onGround && Math.abs(w.angularVelocity) > 2) {
          if (Math.random() < 0.25) {
            particlesList.push({
              x: w.x,
              y: w.y - w.radius,
              vx: -vehicle.vx * 0.3 + (Math.random() - 0.7) * 90,
              vy: Math.random() * 80 + 20,
              life: 0.4,
              color: '#15803d' // grass clippings
            });
          }
        }
      });

      // Update generic particles list
      particlesList.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      });
      particlesList = particlesList.filter(p => p.life > 0);

      // --- CAMERA TRACKING ---
      // camera smoothly follows vehicle with offset
      camera.x += (vehicle.x - camera.x - 140) * 0.15;
      camera.y += (vehicle.y - camera.y - 60) * 0.08;
      // boundary limit
      camera.x = Math.max(100, camera.x);

      // --- RENDERING ROUTINES ---
      ctx.clearRect(0, 0, width, height);

      // 1. SKY GRADIENT (Background)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#e0f2fe'); // Light sky blue
      skyGrad.addColorStop(1, '#f1f5f9'); // Slate light tint
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. PARALLAX DRIFTING MOUNTAINS (Layer 1 - Distant)
      ctx.save();
      ctx.fillStyle = 'rgba(203, 213, 225, 0.45)'; // Soft blue grey
      ctx.beginPath();
      for (let sx = 0; sx < width; sx += 40) {
        const globalX = camera.x * 0.05 + sx;
        const my = height - 120 + Math.sin(globalX * 0.001) * 70 + Math.cos(globalX * 0.003) * 30;
        if (sx === 0) ctx.moveTo(sx, my);
        else ctx.lineTo(sx, my);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.fill();
      ctx.restore();

      // 3. PARALLAX HILLS (Layer 2 - Closer)
      ctx.save();
      ctx.fillStyle = 'rgba(187, 247, 208, 0.35)'; // Soft sage green
      ctx.beginPath();
      for (let sx = 0; sx < width; sx += 30) {
        const globalX = camera.x * 0.2 + sx;
        const my = height - 80 + Math.sin(globalX * 0.0025) * 45 + Math.cos(globalX * 0.006) * 15;
        if (sx === 0) ctx.moveTo(sx, my);
        else ctx.lineTo(sx, my);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.fill();
      ctx.restore();

      // --- INVERT CANVAS COORDINATES FOR STANDARD CARTESIAN PHYSICS (+y is UP) ---
      ctx.save();
      // Translate to screen horizontal middle, but slightly off-center to give view ahead
      ctx.translate(width / 2.8, height / 1.7);
      ctx.scale(1, -1); // Invert y-axis
      
      // Center camera
      ctx.translate(-camera.x, -camera.y);

      // 4. DRAW Procedural Solid Terrain
      ctx.fillStyle = '#b45309'; // Brown mud fill
      ctx.beginPath();
      
      const startDrawX = camera.x - 300;
      const endDrawX = camera.x + 800;
      
      ctx.moveTo(startDrawX, getTerrainHeight(startDrawX) - 100);
      for (let tx = startDrawX; tx < endDrawX; tx += 12) {
        ctx.lineTo(tx, getTerrainHeight(tx));
      }
      ctx.lineTo(endDrawX, getTerrainHeight(endDrawX) - 100);
      ctx.fill();

      // Draw Grass boundary top
      ctx.strokeStyle = '#22c55e'; // Grass green border
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let tx = startDrawX; tx < endDrawX; tx += 12) {
        if (tx === startDrawX) ctx.moveTo(tx, getTerrainHeight(tx));
        else ctx.lineTo(tx, getTerrainHeight(tx));
      }
      ctx.stroke();

      // 5. DRAW COINS & FUEL HAZARDS
      coinsList.forEach(c => {
        if (!c.collected && c.x > camera.x - 200 && c.x < camera.x + 600) {
          ctx.save();
          ctx.translate(c.x, c.y);
          
          // spinning micro rotation animation
          const spin = (Date.now() * 0.007) % (Math.PI * 2);
          ctx.rotate(spin);
          
          // different styling for coin types
          let color = '#fbbf24'; // gold
          let stroke = '#d97706';
          let rad = 10;
          if (c.type === 'silver') { color = '#cbd5e1'; stroke = '#64748b'; rad = 9; }
          if (c.type === 'bronze') { color = '#ca8a04'; stroke = '#78350f'; rad = 8; }

          ctx.fillStyle = color;
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 2;
          
          ctx.beginPath();
          ctx.arc(0, 0, rad, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // draw inner letter
          ctx.scale(1, -1);
          ctx.fillStyle = stroke;
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('$', 0, 0.5);
          
          ctx.restore();
        }
      });

      fuelsList.forEach(f => {
        if (!f.collected && f.x > camera.x - 200 && f.x < camera.x + 600) {
          ctx.save();
          ctx.translate(f.x, f.y);
          
          // fuel canister styling
          ctx.fillStyle = '#ef4444'; // Red canister body
          ctx.fillRect(-11, -14, 22, 28);
          ctx.fillStyle = '#ffffff'; // white cap
          ctx.fillRect(-6, 14, 12, 4);

          // handle
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 14, 8, Math.PI, 0);
          ctx.stroke();

          // draw label 'FUEL'
          ctx.scale(1, -1);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('GAS', 0, 3);
          
          ctx.restore();
        }
      });

      // 6. DRAW GENERAL PARTICLES
      particlesList.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const size = p.size || 5;
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 7. DRAW ACTUAL WHEELS (Front & Back)
      [vehicle.backWheel, vehicle.frontWheel].forEach((w) => {
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(w.angle);

        // draw tire rim outer boundary
        ctx.fillStyle = '#1e293b'; // dark rubber
        ctx.beginPath();
        ctx.arc(0, 0, w.radius, 0, Math.PI * 2);
        ctx.fill();

        // draw spokes (alloy wheel)
        ctx.strokeStyle = '#94a3b8'; // silver spokes
        ctx.lineWidth = 3.5;
        for (let i = 0; i < 5; i++) {
          ctx.rotate((Math.PI * 2) / 5);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, w.radius - 3);
          ctx.stroke();
        }

        // draw center metal cap
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });

      // 8. DRAW CAR CHASSIS AND SUSPENSION SYSTEMS
      // Draw actual spring lines
      ctx.strokeStyle = '#475569'; // steel color
      ctx.lineWidth = 3.5;
      
      const vCos = Math.cos(vehicle.angle);
      const vSin = Math.sin(vehicle.angle);
      const backRestX = vehicle.x - 38 * vCos + 10 * vSin;
      const backRestY = vehicle.y - 38 * vSin - 10 * vCos;
      const frontRestX = vehicle.x + 38 * vCos + 10 * vSin;
      const frontRestY = vehicle.y + 38 * vSin - 10 * vCos;

      const attPoints = [
        { wx: vehicle.backWheel.x, wy: vehicle.backWheel.y, rx: backRestX, ry: backRestY },
        { wx: vehicle.frontWheel.x, wy: vehicle.frontWheel.y, rx: frontRestX, ry: frontRestY }
      ];
      
      attPoints.forEach(p => {
        ctx.beginPath();
        ctx.moveTo(p.wx, p.wy);
        
        // draw zig-zag coil lines
        const segments = 5;
        for (let i = 1; i <= segments; i++) {
          const ratio = i / segments;
          const sx = p.wx + (p.rx - p.wx) * ratio + (i % 2 === 0 ? 5 : -5) * Math.sin(vehicle.angle + Math.PI/2);
          const sy = p.wy + (p.ry - p.wy) * ratio;
          ctx.lineTo(sx, sy);
        }
        ctx.lineTo(p.rx, p.ry);
        ctx.stroke();
      });

      // Draw Chassis body Buggy frame
      ctx.save();
      ctx.translate(vehicle.x, vehicle.y);
      ctx.rotate(vehicle.angle);

      // Buggy vector chassis drawing
      ctx.fillStyle = '#4f46e5'; // Main Indigo buggy body color
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 3.5;

      ctx.beginPath();
      // Hood
      ctx.moveTo(52, -6);
      ctx.lineTo(38, 12);
      // Windshield
      ctx.lineTo(6, 26);
      // Roof cabin
      ctx.lineTo(-24, 26);
      // Back panel
      ctx.lineTo(-44, 4);
      // Underbelly floor
      ctx.lineTo(-48, -12);
      ctx.lineTo(46, -12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glass cockpit windshield
      ctx.fillStyle = 'rgba(6, 182, 212, 0.45)'; // cyan glass
      ctx.beginPath();
      ctx.moveTo(33, 11);
      ctx.lineTo(6, 24);
      ctx.lineTo(-20, 24);
      ctx.lineTo(-12, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Exhaust pipe detail
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-52, 1, 10, 5);

      // Decal stripe detail
      ctx.fillStyle = '#06b6d4'; // cyan stripe
      ctx.beginPath();
      ctx.moveTo(-35, -5);
      ctx.lineTo(25, -5);
      ctx.lineTo(15, 2);
      ctx.lineTo(-30, 2);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // 9. DRAW THE DRIVER WITH DYNAMIC BOBBLE HEAD
      ctx.save();
      // Position is coupled to vehicle bobble head coordinates
      ctx.translate(vehicle.headX, vehicle.headY);
      ctx.rotate(vehicle.angle * 0.95);

      // Draw pilot body neck
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(0, -16);
      ctx.stroke();

      // Draw retro driver helmet!
      ctx.fillStyle = '#ef4444'; // Red vibrant helmet
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Visor
      ctx.fillStyle = '#0f172a'; // black visor
      ctx.beginPath();
      ctx.arc(3.5, 1, 8.5, -Math.PI / 4, Math.PI / 4);
      ctx.lineTo(3.5, 1);
      ctx.fill();

      // Helmet detail stripe
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 11, Math.PI * 0.6, Math.PI * 0.95);
      ctx.lineTo(0, 0);
      ctx.fill();

      ctx.restore();

      ctx.restore(); // Exit standard Cartesian coords

      // --- IN-GAME TEXT HUD SYSTEM ---
      // Draw top air time bonus messages
      if (airTimeMessage) {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(width / 2 - 140, 75, 280, 42);
        
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.strokeRect(width / 2 - 140, 75, 280, 42);

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(airTimeMessage, width / 2, 96);
        ctx.restore();
      }

      // Check distance highscore persistence update (use refs for fresh values)
      const distPercent = currentDist;
      if (distPercent > highScoreRef.current) {
        highScoreRef.current = distPercent;
        setHighScore(distPercent);
        saveStats(coinsRef.current, distPercent, upgradesRef.current);
      }

      // Repeat frame
      loopRef.current = requestAnimationFrame(update);
    };

    const handleGameOver = (reason) => {
      cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
      setIsPlaying(false);
      setGameOverReason(reason);
      
      if (audioSynthRef.current) {
        audioSynthRef.current.playCrashSound();
      }
      
      // Save stats using refs so we always get the latest earned coins
      saveStats(coinsRef.current, highScoreRef.current, upgradesRef.current);
    };

    // Begin looping
    loopRef.current = requestAnimationFrame(update);
  };

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key in keysRef.current) {
        keysRef.current[e.key] = true;
      }
      // support wasd
      if (e.key === 'a' || e.key === 'A') keysRef.current.ArrowLeft = true;
      if (e.key === 'd' || e.key === 'D') keysRef.current.ArrowRight = true;
    };
    
    const handleKeyUp = (e) => {
      if (e.key in keysRef.current) {
        keysRef.current[e.key] = false;
      }
      if (e.key === 'a' || e.key === 'A') keysRef.current.ArrowLeft = false;
      if (e.key === 'd' || e.key === 'D') keysRef.current.ArrowRight = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 font-sans select-none animate-fade-in text-slate-800">
      <div className="w-full max-w-5xl h-[88vh] bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200/50 flex flex-col relative">
        
        {/* Header toolbar */}
        <div className="bg-slate-50 border-b border-slate-150 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🚗</span>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">Hill Climber Off-Road</h2>
              <p className="text-3xs text-slate-400 font-semibold uppercase tracking-wider">Physics 2D Buggy Racing</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Coins count HUD */}
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100/60 px-3 py-1.5 rounded-xl">
              <Coins className="w-4 h-4 text-amber-500 animate-pulse" />
              <span className="font-extrabold text-xs text-amber-700">{coins}</span>
            </div>

            {/* Muted toggle */}
            <button 
              onClick={toggleMute}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 active:scale-95 transition-all cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Exit Close button */}
            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-500 active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic content center panel */}
        <div className="flex-1 relative bg-slate-950 flex flex-col overflow-hidden">
          
          {/* 1. PLAYING IN-GAME ACTIVE VIEW */}
          {isPlaying && (
            <div className="w-full h-full relative flex flex-col">
              {/* Gameplay UI Stats Overlay */}
              <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
                
                {/* Distance and coins tracking in active run */}
                <div className="flex flex-col gap-1 bg-slate-900/80 p-3 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <div className="text-3xs uppercase tracking-wider text-slate-400 font-extrabold">Active Distance</div>
                  <div className="text-lg font-black text-white">{distance.toFixed(1)} <span className="text-xs text-cyan-400 font-bold">meters</span></div>
                  
                  {/* Current run coins */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-extrabold text-xs text-amber-300">+{runCoins}</span>
                  </div>
                </div>

                {/* Fuel meter gauge */}
                <div className="flex flex-col items-end gap-1.5 bg-slate-900/80 p-3 rounded-2xl border border-white/10 backdrop-blur-sm w-44">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-3xs uppercase tracking-wider text-slate-400 font-extrabold">Gasoline Tank</span>
                    <span className="text-3xs font-extrabold text-white" id="gameplay-fuel-pct">100%</span>
                  </div>
                  {/* Progress fill bar — updated every frame via DOM ref for zero-lag rendering */}
                  <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden border border-white/5 p-0.5">
                    <div 
                      ref={fuelBarRef}
                      className="h-full rounded-full"
                      style={{
                        width: '100%',
                        backgroundImage: 'linear-gradient(to right, #22c55e, #f59e0b, #ef4444)',
                        transition: 'width 0.15s linear'
                      }}
                      id="gameplay-fuel-fill"
                    />
                  </div>
                </div>
              </div>

              {/* The Game Canvas renderer */}
              <canvas ref={canvasRef} className="w-full h-full" />

              {/* Mobile Pedals Overlay Controls */}
              <div className="absolute bottom-6 left-6 right-6 z-20 flex justify-between pointer-events-none md:hidden">
                {/* Brake pedal (Left) */}
                <button
                  onMouseDown={() => touchPedalsRef.current.brake = true}
                  onMouseUp={() => touchPedalsRef.current.brake = false}
                  onTouchStart={(e) => { e.preventDefault(); touchPedalsRef.current.brake = true; }}
                  onTouchEnd={(e) => { e.preventDefault(); touchPedalsRef.current.brake = false; }}
                  className="w-24 h-24 rounded-2xl bg-slate-900/75 border border-white/10 active:bg-slate-800/90 hover:scale-95 transition-all text-white font-extrabold flex flex-col items-center justify-center gap-1 shadow-2xl backdrop-blur-sm pointer-events-auto cursor-pointer"
                >
                  <span className="text-2xs uppercase tracking-wider">Brake</span>
                  <span className="text-xs">⬅️ (Air Up)</span>
                </button>

                {/* Gas pedal (Right) */}
                <button
                  onMouseDown={() => touchPedalsRef.current.gas = true}
                  onMouseUp={() => touchPedalsRef.current.gas = false}
                  onTouchStart={(e) => { e.preventDefault(); touchPedalsRef.current.gas = true; }}
                  onTouchEnd={(e) => { e.preventDefault(); touchPedalsRef.current.gas = false; }}
                  className="w-28 h-28 rounded-3xl bg-indigo-650/80 border border-indigo-400/20 active:bg-indigo-700/90 hover:scale-95 transition-all text-white font-extrabold flex flex-col items-center justify-center gap-1 shadow-2xl backdrop-blur-sm pointer-events-auto cursor-pointer"
                >
                  <span className="text-xs uppercase tracking-wider text-indigo-300">Throttle</span>
                  <span className="text-sm">➡️ (Air Dn)</span>
                </button>
              </div>

              {/* Desktop control helpers label overlay */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 hidden md:block text-slate-400 bg-slate-900/60 py-1.5 px-4 rounded-xl border border-white/5 text-3xs font-semibold uppercase tracking-wider">
                ⌨️ Desktop Controls: Press <span className="text-white font-extrabold font-mono">D / Right arrow</span> for Gas, <span className="text-white font-extrabold font-mono">A / Left arrow</span> for Brake
              </div>
            </div>
          )}

          {/* 2. GARAGE MENU UPGRADE SHOP */}
          {inGarage && (
            <div className="w-full h-full flex flex-col bg-slate-50 overflow-y-auto p-6 sm:p-8 space-y-6 scrollbar-hidden select-none">
              {/* Garage Header Title banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white border border-slate-100 p-6 rounded-3xl shadow-sm gap-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    🔧 DeepLink Garage Garage Upgrades
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
                    Earn coins by driving far, catching high jumps, and doing flips. Spend your earnings below to tune the buggy motor, suspension, and tires.
                  </p>
                </div>
                {/* Score best record stat */}
                <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 p-4 rounded-2xl shadow-inner text-right">
                  <Award className="w-8 h-8 text-indigo-600 shrink-0" />
                  <div>
                    <div className="text-4xs uppercase tracking-wider text-slate-400 font-extrabold">All-Time High Score</div>
                    <div className="text-lg font-black text-indigo-950">{highScore.toFixed(1)} <span className="text-2xs font-bold text-slate-500">meters</span></div>
                  </div>
                </div>
              </div>

              {/* Upgrades grid panel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.keys(upgrades).map((stat) => {
                  const level = upgrades[stat];
                  const cost = getUpgradeCost(level);
                  const meta = UPGRADE_METRICS[stat];
                  
                  return (
                    <div 
                      key={stat} 
                      className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-200 transition-all gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="p-2 rounded-xl bg-slate-50 border border-slate-100">{meta.icon}</span>
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">{meta.name}</h4>
                            <p className="text-3xs text-indigo-600 font-bold uppercase">Upgrade level {level}/10</p>
                          </div>
                        </div>
                        <p className="text-2xs text-slate-500 leading-relaxed font-medium">
                          {meta.desc}
                        </p>
                      </div>

                      {/* Progression Pill list */}
                      <div className="space-y-3.5">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((stepNum) => (
                            <div 
                              key={stepNum} 
                              className={`h-2 flex-1 rounded-full border transition-all ${
                                stepNum <= level 
                                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 border-transparent' 
                                  : 'bg-slate-100 border-slate-200'
                              }`}
                            />
                          ))}
                        </div>

                        {/* Cost Buy Trigger button */}
                        {level >= 10 ? (
                          <button 
                            disabled 
                            className="w-full py-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 font-extrabold text-xs text-center cursor-not-allowed"
                          >
                            ⭐ Maximum Stat Unlocked
                          </button>
                        ) : (
                          <button
                            onClick={() => buyUpgrade(stat)}
                            disabled={coins < cost}
                            className={`w-full py-3 rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              coins >= cost 
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md active:scale-98 shadow-indigo-600/10' 
                                : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <Coins className="w-4 h-4" /> 
                            <span>Upgrade for {cost} coins</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Start game drive button */}
              <div className="pt-2 text-center">
                <button
                  onClick={startRun}
                  className="relative group overflow-hidden py-4 px-10 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-indigo-600/15 hover:shadow-indigo-600/30 hover:scale-[1.02] active:scale-98 transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-white" /> Start Racing Adventure! &rarr;
                </button>
              </div>
            </div>
          )}

          {/* 3. GAME OVER OVERLAY DETAIL */}
          {gameOverReason && (
            <div className="absolute inset-0 z-35 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-fade-in text-white text-center select-none">
              <div className="bg-slate-900 border border-white/10 p-6 sm:p-8 max-w-md w-full rounded-3xl shadow-2xl space-y-6">
                
                {/* Comic header icon based on crash or fuel */}
                <div className="relative inline-flex items-center justify-center h-20 w-20 rounded-full bg-slate-800 border border-white/10 shadow-inner">
                  {gameOverReason === 'crash' ? (
                    <span className="text-4xl animate-bounce">💥</span>
                  ) : (
                    <span className="text-4xl animate-bounce">⛽</span>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black tracking-tight text-white uppercase">
                    {gameOverReason === 'crash' ? "Fatal Crash Landing!" : "Out of gasoline!"}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    {gameOverReason === 'crash' 
                      ? "The vehicle flipped upside down, resulting in a comical collision with the ground! Protect the driver's helmet next time." 
                      : "The tank went completely dry! Pick up scattered gasoline canisters to keep climbing endlessly."}
                  </p>
                </div>

                {/* Score panel breakdown */}
                <div className="bg-slate-950 border border-white/5 p-5 rounded-2xl flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2.5">
                    <span className="text-slate-500 font-extrabold uppercase text-3xs">Distance Traveled</span>
                    <span className="font-black text-slate-200">{distance.toFixed(1)} meters</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-extrabold uppercase text-3xs">Coins Collected</span>
                    <span className="font-black text-amber-400 flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5" /> +{runCoins}
                    </span>
                  </div>
                </div>

                {/* Actions button box */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={startRun}
                    className="py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" /> Retry Run
                  </button>
                  <button
                    onClick={() => {
                      setInGarage(true);
                      setGameOverReason(null);
                    }}
                    className="py-3.5 rounded-2xl bg-slate-800 border border-white/10 hover:bg-slate-700 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    ⚙️ Tune Garage
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
