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
  const [showDeathMeme, setShowDeathMeme] = useState(false); // plays meme before game over

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
  const iframeRef = useRef(null); // Ref to Cyber-Bike Matter.js iframe
  
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
    
    // Keep outer header coin balance in sync with Matter.js iframe state in real-time
    const coinsInterval = setInterval(() => {
      if (typeof window !== 'undefined') {
        const savedCoins = localStorage.getItem('deeplink_climber_coins');
        if (savedCoins) {
          const v = Math.min(999999, Math.max(0, parseInt(savedCoins, 10) || 0));
          setCoins(v);
        }
      }
    }, 1000);

    // Initialize audio synth
    audioSynthRef.current = new VehicleAudioSynth();
    return () => {
      clearInterval(coinsInterval);
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

    const upgrade_engine     = upgradesRef.current.engine;
    const upgrade_suspension = upgradesRef.current.suspension;
    const upgrade_tires      = upgradesRef.current.tires;
    const upgrade_stability  = upgradesRef.current.stability;

    let localRunCoins = 0;

    // =================================================================
    // COORDINATE SYSTEM: Y-UP (standard Cartesian / physics convention)
    //   getTerrainHeight(x) returns a Y value in this system.
    //   Higher Y = higher on screen (sky direction).
    //   Gravity acts in -Y direction (GRAV is negative).
    //   Canvas rendering applies ctx.scale(1,-1) to flip to screen coords.
    // =================================================================

    const WHEEL_RADIUS   = 20;
    const SPRING_REST    = 48 - upgrade_suspension * 1.0;  // Raised rest length for premium ground clearance
    const SPRING_K       = 460 + upgrade_suspension * 40;  // Stiffer spring constants to prevent chassis sag
    const SPRING_C       = 70  + upgrade_suspension * 10;  // Highly dampened suspension for stable riding
    const WHEEL_MASS     = 2.0;                             // Balanced wheel mass
    const CHASSIS_MASS   = 12.0;                            // Moderate chassis mass prevents bottoming out
    const INERTIA        = 12000;                           // Perfect inertia balance for anti-flip and mid-air control
    const GRAV           = -280;
    const ENGINE_PEAK    = 820 + upgrade_engine * 160;      // Perfectly calibrated acceleration
    const MAX_SPD        = 420  + upgrade_engine * 22;
    const TRACTION_MU    = 0.75 + upgrade_tires  * 0.045;
    const STABILITY_CTRL = 8.5  + upgrade_stability * 2.0;  // Crisp in-air stabilization response

    // Perfectly symmetric axles with anchors at the bottom of the chassis polygon to maximize ground clearance
    const ATTACH_BACK_X  = -39;                             // Symmetric rear axle
    const ATTACH_FRONT_X =  39;                             // Symmetric front axle
    const ATTACH_Y_LOCAL = -12;                             // Anchored at the chassis bottom for ultimate ground clearance

    // Original spawn formula
    const initX    = 150;
    const groundY  = getTerrainHeight(initX);
    const initY    = groundY + WHEEL_RADIUS + SPRING_REST - ATTACH_Y_LOCAL + 4;

    const vehicle = {
      x: initX, y: initY,
      vx: 30,   vy: 0,
      angle: 0.0,
      angularVelocity: 0,
      mass: CHASSIS_MASS,
      inertia: INERTIA,
      fuel: 100.0,

      headX: initX - 10,
      headY: initY + 24,
      headVelX: 30, headVelY: 0,

      backWheel: {
        x: initX + ATTACH_BACK_X,
        y: groundY + WHEEL_RADIUS,
        vx: 30, vy: 0,
        radius: WHEEL_RADIUS,
        angle: 0, angularVelocity: 1.5,
        onGround: true, mass: WHEEL_MASS
      },
      frontWheel: {
        x: initX + ATTACH_FRONT_X,
        y: groundY + WHEEL_RADIUS,
        vx: 30, vy: 0,
        radius: WHEEL_RADIUS,
        angle: 0, angularVelocity: 1.5,
        onGround: true, mass: WHEEL_MASS
      }
    };

    let raceStartTimestamp  = -1;
    let camera              = { x: 100, y: 0 };
    let airTimeCount        = 0;
    let airTimeMessage      = '';
    let airTimeMessageTimer = 0;
    let totalFlipsCount     = 0;
    let startAirAngle       = 0;
    let coinsList           = [];
    let fuelsList           = [];
    let particlesList       = [];

    const populateTerrainAhead = (startX, endX) => {
      const step = 65;
      for (let tx = Math.floor(startX / step) * step; tx < endX; tx += step) {
        if (tx < 200) continue;
        const coinPattern = Math.sin(tx * 0.03);
        const spawnCoin   = coinPattern > 0.65;
        const spawnFuel   = Math.sin(tx * 0.007) > 0.94;
        const hasCoin = coinsList.some(c => Math.abs(c.x - tx) < 30);
        const hasFuel = fuelsList.some(f => Math.abs(f.x - tx) < 30);
        if (spawnFuel && !hasFuel && !hasCoin) {
          fuelsList.push({ x: tx, y: getTerrainHeight(tx) + 28, collected: false });
        } else if (spawnCoin && !hasCoin && !hasFuel) {
          let type = 'bronze'; let value = 100;
          if (tx > 800)  { type = 'silver'; value = 500;  }
          if (tx > 2000) { type = 'gold';   value = 1000; }
          coinsList.push({ x: tx, y: getTerrainHeight(tx) + 32 + Math.sin(tx * 0.15) * 12, type, value, collected: false });
        }
      }
      coinsList = coinsList.filter(c => c.x > camera.x - 600);
      fuelsList = fuelsList.filter(f => f.x > camera.x - 600);
    };

    let lastTime = performance.now();

    const update = (timestamp) => {
      let dt = (timestamp - lastTime) / 1000;
      if (dt > 0.05) dt = 0.05;
      lastTime = timestamp;

      const width  = canvas.width  = canvas.clientWidth;
      const height = canvas.height = canvas.clientHeight;
      const ctx    = canvas.getContext('2d');

      populateTerrainAhead(camera.x + 400, camera.x + 1100);

      const gasActive   = keysRef.current.ArrowRight || keysRef.current.d || touchPedalsRef.current.gas;
      const brakeActive = keysRef.current.ArrowLeft  || keysRef.current.a || touchPedalsRef.current.brake;

      // =========================================================
      // PHYSICS  --  6 sub-steps per frame
      // =========================================================
      const SUB = 6;
      const sdt = dt / SUB;

      for (let step = 0; step < SUB; step++) {
        const cA = Math.cos(vehicle.angle);
        const sA = Math.sin(vehicle.angle);

        // Suspension attachment points in world space
        const bAX = vehicle.x + ATTACH_BACK_X  * cA - ATTACH_Y_LOCAL * sA;
        const bAY = vehicle.y + ATTACH_BACK_X  * sA + ATTACH_Y_LOCAL * cA;
        const fAX = vehicle.x + ATTACH_FRONT_X * cA - ATTACH_Y_LOCAL * sA;
        const fAY = vehicle.y + ATTACH_FRONT_X * sA + ATTACH_Y_LOCAL * cA;

        // Attachment velocities (v_chassis + omega x r)
        const bAVx = vehicle.vx - vehicle.angularVelocity * (bAY - vehicle.y);
        const bAVy = vehicle.vy + vehicle.angularVelocity * (bAX - vehicle.x);
        const fAVx = vehicle.vx - vehicle.angularVelocity * (fAY - vehicle.y);
        const fAVy = vehicle.vy + vehicle.angularVelocity * (fAX - vehicle.x);

        // Spring-damper force connecting wheel to chassis attachment point
        const springForce = (wx, wy, wvx, wvy, ax, ay, avx, avy) => {
          const dx = wx - ax; const dy = wy - ay;
          const len = Math.hypot(dx, dy) || 0.001;
          const ux = dx / len; const uy = dy / len;
          const relV = (wvx - avx) * ux + (wvy - avy) * uy;
          const raw  = -SPRING_K * (len - SPRING_REST) - SPRING_C * relV;
          const mag  = Math.max(-4000, Math.min(4000, raw));
          return { fx: mag * ux, fy: mag * uy };
        };

        const bS = springForce(vehicle.backWheel.x,  vehicle.backWheel.y,  vehicle.backWheel.vx,  vehicle.backWheel.vy,  bAX, bAY, bAVx, bAVy);
        const fS = springForce(vehicle.frontWheel.x, vehicle.frontWheel.y, vehicle.frontWheel.vx, vehicle.frontWheel.vy, fAX, fAY, fAVx, fAVy);

        // Wheel integration
        [vehicle.backWheel, vehicle.frontWheel].forEach((w, idx) => {
          const sf = idx === 0 ? bS : fS;
          w.vx += (sf.fx / WHEEL_MASS) * sdt;
          w.vy += (GRAV + sf.fy / WHEEL_MASS) * sdt;
          w.vx = Math.max(-620, Math.min(620, w.vx));
          w.vy = Math.max(-620, Math.min(620, w.vy));
          w.x += w.vx * sdt;
          w.y += w.vy * sdt;

          // Terrain collision (Y-up: wheel surface at y - radius, must stay above terrain)
          w.onGround = false;
          const th  = getTerrainHeight(w.x);
          const pen = (th + w.radius) - w.y;  // positive when wheel is inside ground

          if (pen > 0) {
            w.onGround = true;
            w.y = th + w.radius;

            const slope = getTerrainSlope(w.x);
            const Nx =  -Math.sin(slope);
            const Ny =   Math.cos(slope);
            const Tx =   Math.cos(slope);
            const Ty =   Math.sin(slope);

            // Remove velocity into terrain (inelastic, e=0.08)
            const vn = w.vx * Nx + w.vy * Ny;
            if (vn < 0) {
              w.vx -= vn * Nx * 1.08;
              w.vy -= vn * Ny * 1.08;
            }

            // Coulomb traction friction
            const N        = Math.max(0, pen * SPRING_K);
            const maxFr    = TRACTION_MU * N;
            const vt       = w.vx * Tx + w.vy * Ty;
            const surfSpd  = w.angularVelocity * w.radius;
            const slip     = vt - surfSpd;
            const frImp    = Math.max(-maxFr * sdt, Math.min(maxFr * sdt, -slip * WHEEL_MASS * 0.55));
            w.vx += (frImp / WHEEL_MASS) * Tx;
            w.vy += (frImp / WHEEL_MASS) * Ty;
            w.angularVelocity += -frImp / (WHEEL_MASS * w.radius);

            // Engine: rear-wheel drive
            if (gasActive && vehicle.fuel > 0 && idx === 0) {
              const spd    = Math.abs(vehicle.vx);
              const curve  = Math.max(0.08, 1.0 - spd / MAX_SPD);
              const torque = ENGINE_PEAK * curve;
              w.angularVelocity += (torque / (WHEEL_MASS * w.radius)) * sdt;
            }

            // Light front-wheel assist at low speed
            if (gasActive && vehicle.fuel > 0 && idx === 1) {
              const spd = Math.abs(vehicle.vx);
              if (spd < MAX_SPD * 0.3) {
                const blendT = ENGINE_PEAK * 0.12 * (1 - spd / (MAX_SPD * 0.3));
                w.angularVelocity += (blendT / (WHEEL_MASS * w.radius)) * sdt;
              }
            }

            // Brake
            if (brakeActive) {
              w.angularVelocity *= Math.max(0, 1 - 20 * sdt);
            }

            w.angularVelocity *= Math.max(0, 1 - 0.28 * sdt);
            w.angle += w.angularVelocity * sdt;
          } else {
            w.angularVelocity *= Math.max(0, 1 - 0.12 * sdt);
            w.angle += w.angularVelocity * sdt;
          }
        });

        // Chassis receives Newton's 3rd reaction from springs
        vehicle.vx += (-(bS.fx + fS.fx) / CHASSIS_MASS) * sdt;
        vehicle.vy += (GRAV + (-(bS.fy + fS.fy) / CHASSIS_MASS)) * sdt;

        // Torque: tau = r x F  (2D: rx*Fy - ry*Fx)
        const bTq = (bAX - vehicle.x) * (-bS.fy) - (bAY - vehicle.y) * (-bS.fx);
        const fTq = (fAX - vehicle.x) * (-fS.fy) - (fAY - vehicle.y) * (-fS.fx);
        vehicle.angularVelocity += (bTq + fTq) * sdt / INERTIA;

        // Air rotation control
        const inAir = !vehicle.backWheel.onGround && !vehicle.frontWheel.onGround;
        if (inAir) {
          if (gasActive)   vehicle.angularVelocity -= STABILITY_CTRL * sdt;
          if (brakeActive) vehicle.angularVelocity += STABILITY_CTRL * sdt;
        }

        // Stronger angular drag on ground vs air to resist violent tipping
        vehicle.angularVelocity *= Math.max(0, 1 - (inAir ? 0.20 : 0.76) * sdt);
        vehicle.angularVelocity  = Math.max(-5.0, Math.min(5.0, vehicle.angularVelocity));

        vehicle.vx = Math.max(-(MAX_SPD + 120), Math.min(MAX_SPD + 120, vehicle.vx));
        vehicle.vy = Math.max(-580, Math.min(440, vehicle.vy));
        vehicle.x += vehicle.vx * sdt;
        vehicle.y += vehicle.vy * sdt;
        vehicle.angle += vehicle.angularVelocity * sdt;

        // Chassis hull collision — gentle vertical push only, minimal angular kick
        {
          const hCos = Math.cos(vehicle.angle);
          const hSin = Math.sin(vehicle.angle);
          [-42, -21, 0, 21, 40].forEach(lx => {
            const localBottomY = -13;
            const wx = vehicle.x + lx * hCos - localBottomY * hSin;
            const wy = vehicle.y + lx * hSin + localBottomY * hCos;
            const th = getTerrainHeight(wx);
            if (wy < th) {
              const pen2 = th - wy;
              vehicle.y += pen2 * 0.75;
              vehicle.vy = Math.max(0, vehicle.vy * -0.06);
              const rx = wx - vehicle.x;
              // Very small angular kick — 10x less than original to prevent chain flips
              vehicle.angularVelocity += rx * pen2 * 0.00015;
            }
          });
        }

        // Fuel consumption
        if (vehicle.fuel > 0) {
          vehicle.fuel = Math.max(0, vehicle.fuel - (1.8 + (gasActive ? 2.0 : 0)) * sdt);
        }

        if (vehicle.angle >  Math.PI * 4) { vehicle.angle -= Math.PI * 2; startAirAngle -= Math.PI * 2; }
        if (vehicle.angle < -Math.PI * 4) { vehicle.angle += Math.PI * 2; startAirAngle += Math.PI * 2; }
      }

      // Bobble-head driver
      const headRestX = vehicle.x + (-10) * Math.cos(vehicle.angle) - (24) * Math.sin(vehicle.angle);
      const headRestY = vehicle.y + (-10) * Math.sin(vehicle.angle) + (24) * Math.cos(vehicle.angle);
      vehicle.headVelX += ((headRestX - vehicle.headX) * 14.0 - vehicle.headVelX * 1.8) * dt;
      vehicle.headVelY += ((headRestY - vehicle.headY) * 14.0 - vehicle.headVelY * 1.8) * dt;
      vehicle.headX += vehicle.headVelX * dt;
      vehicle.headY += vehicle.headVelY * dt;

      // =================================================================
      // CRASH DETECTION
      // =================================================================
      if (raceStartTimestamp < 0) raceStartTimestamp = timestamp;
      const graceActive = (timestamp - raceStartTimestamp) < 2500;

      if (!graceActive) {
        const normAngle    = ((vehicle.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const isUpsideDown = normAngle > 1.75 && normAngle < 4.53;
        const headTerrainY = getTerrainHeight(vehicle.headX);
        // Head hits ground when headY is at or below terrain surface
        const headHitGround = vehicle.headY <= headTerrainY + 4;
        if (headHitGround || isUpsideDown) {
          handleGameOver('crash');
          return;
        }
      }

      if (vehicle.fuel <= 0) {
        handleGameOver('fuel');
        return;
      }

      // Airtime bonus detector
      const currentlyInAir = !vehicle.backWheel.onGround && !vehicle.frontWheel.onGround;
      if (currentlyInAir) {
        if (airTimeCount === 0) startAirAngle = vehicle.angle;
        airTimeCount += dt;
      } else {
        if (airTimeCount > 0.8) {
          const angleDiff = Math.abs(vehicle.angle - startAirAngle);
          const fullFlips = Math.floor(angleDiff / (Math.PI * 1.85));
          let bonus = Math.floor(airTimeCount * 150);
          let label = 'Air Time! +' + bonus;
          if (fullFlips > 0) {
            totalFlipsCount += fullFlips;
            bonus += fullFlips * 1000;
            label = fullFlips + 'x Backflip! +' + bonus;
            confetti({ particleCount: 40, spread: 60, origin: { x: 0.5, y: 0.4 } });
          }
          localRunCoins    += bonus;
          coinsRef.current += bonus;
          setRunCoins(localRunCoins);
          setCoins(coinsRef.current);
          airTimeMessage      = label;
          airTimeMessageTimer = 2.0;
          if (audioSynthRef.current) audioSynthRef.current.playCoinSound('gold');
        }
        airTimeCount = 0;
      }

      if (airTimeMessageTimer > 0) {
        airTimeMessageTimer -= dt;
        if (airTimeMessageTimer <= 0) airTimeMessage = '';
      }

      // Audio
      if (audioSynthRef.current) {
        const driveInput = gasActive ? 1.0 : (brakeActive ? 0.35 : 0.0);
        audioSynthRef.current.setEnginePitch(driveInput, Math.abs(vehicle.vx) / 300);
        if (vehicle.fuel < 20.0) audioSynthRef.current.triggerLowFuelBeep();
      }

      // Live fuel bar (direct DOM)
      if (fuelBarRef.current) fuelBarRef.current.style.width = vehicle.fuel + '%';
      const fuelPctEl = document.getElementById('gameplay-fuel-pct');
      if (fuelPctEl) fuelPctEl.textContent = Math.ceil(vehicle.fuel) + '%';

      // Item collection
      coinsList.forEach(c => {
        if (!c.collected && Math.hypot(vehicle.x - c.x, vehicle.y - c.y) < 52) {
          c.collected = true;
          localRunCoins    += c.value;
          coinsRef.current += c.value;
          setRunCoins(localRunCoins);
          setCoins(coinsRef.current);
          for (let i = 0; i < 6; i++) {
            particlesList.push({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 120, vy: Math.random() * 80 + 20, life: 0.4, color: c.type === 'gold' ? '#eab308' : c.type === 'silver' ? '#cbd5e1' : '#b45309' });
          }
          if (audioSynthRef.current) audioSynthRef.current.playCoinSound(c.type);
        }
      });

      fuelsList.forEach(f => {
        if (!f.collected && Math.hypot(vehicle.x - f.x, vehicle.y - f.y) < 52) {
          f.collected = true;
          vehicle.fuel = 100.0;
          for (let i = 0; i < 10; i++) {
            particlesList.push({ x: f.x, y: f.y, vx: (Math.random() - 0.5) * 140, vy: Math.random() * 80 + 20, life: 0.5, color: '#22c55e' });
          }
          if (audioSynthRef.current) audioSynthRef.current.playFuelSound();
        }
      });

      const currentDist = Math.max(0, (vehicle.x - initX) / 10);
      setDistance(currentDist);

      // Exhaust particles
      if (Math.random() < 0.32) {
        const cos = Math.cos(vehicle.angle); const sin = Math.sin(vehicle.angle);
        const exX = vehicle.x - 52 * cos - 2 * sin;
        const exY = vehicle.y - 52 * sin + 2 * cos;
        particlesList.push({ x: exX, y: exY, vx: -vehicle.vx * 0.4 - cos * 55 + (Math.random() - 0.5) * 20, vy: -vehicle.vy * 0.4 - sin * 55 + (Math.random() - 0.5) * 20, life: 0.55, size: 4 + Math.random() * 4, color: gasActive ? 'rgba(156,163,175,0.7)' : 'rgba(209,213,219,0.4)' });
      }

      [vehicle.backWheel, vehicle.frontWheel].forEach(w => {
        if (w.onGround && Math.abs(w.angularVelocity) > 2 && Math.random() < 0.22) {
          particlesList.push({ x: w.x, y: w.y - w.radius, vx: -vehicle.vx * 0.3 + (Math.random() - 0.7) * 85, vy: Math.random() * 70 + 20, life: 0.35, color: '#15803d' });
        }
      });

      particlesList.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
      particlesList = particlesList.filter(p => p.life > 0);

      // Camera (Cartesian space: vehicle ahead and slightly above screen centre)
      camera.x += (vehicle.x - camera.x - 150) * 0.14;
      camera.y += (vehicle.y - camera.y - 20)  * 0.10;
      camera.x  = Math.max(100, camera.x);

      // =================================================================
      // RENDERING
      // =================================================================
      ctx.clearRect(0, 0, width, height);

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#bfdbfe');
      skyGrad.addColorStop(1, '#f0fdf4');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Parallax mountains
      ctx.save();
      ctx.fillStyle = 'rgba(203,213,225,0.45)';
      ctx.beginPath();
      for (let sx = 0; sx < width; sx += 40) {
        const gx = camera.x * 0.05 + sx;
        const my = height - 100 + Math.sin(gx * 0.001) * 65 + Math.cos(gx * 0.003) * 28;
        sx === 0 ? ctx.moveTo(sx, my) : ctx.lineTo(sx, my);
      }
      ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.fill();
      ctx.restore();

      // Parallax hills
      ctx.save();
      ctx.fillStyle = 'rgba(187,247,208,0.38)';
      ctx.beginPath();
      for (let sx = 0; sx < width; sx += 30) {
        const gx = camera.x * 0.22 + sx;
        const my = height - 65 + Math.sin(gx * 0.0025) * 42 + Math.cos(gx * 0.006) * 14;
        sx === 0 ? ctx.moveTo(sx, my) : ctx.lineTo(sx, my);
      }
      ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.fill();
      ctx.restore();

      // --- World rendering in Y-up Cartesian space ---
      // Anchor: vehicle shows at (width/2.8, height/1.7) on screen
      ctx.save();
      ctx.translate(width / 2.8, height / 1.7);
      ctx.scale(1, -1);
      ctx.translate(-camera.x, -camera.y);

      // Terrain fill
      const startDrawX = camera.x - 350;
      const endDrawX   = camera.x + 900;
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.moveTo(startDrawX, getTerrainHeight(startDrawX) - 200);
      for (let tx = startDrawX; tx <= endDrawX; tx += 10) {
        ctx.lineTo(tx, getTerrainHeight(tx));
      }
      ctx.lineTo(endDrawX, getTerrainHeight(endDrawX) - 200);
      ctx.closePath();
      ctx.fill();

      // Grass top line
      ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 8;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let tx = startDrawX; tx <= endDrawX; tx += 10) {
        tx === startDrawX ? ctx.moveTo(tx, getTerrainHeight(tx)) : ctx.lineTo(tx, getTerrainHeight(tx));
      }
      ctx.stroke();

      // Coins
      coinsList.forEach(c => {
        if (c.collected || c.x < camera.x - 200 || c.x > camera.x + 650) return;
        ctx.save();
        ctx.translate(c.x, c.y);
        const spin = (Date.now() * 0.007) % (Math.PI * 2);
        ctx.rotate(spin);
        let color = '#fbbf24'; let stroke = '#d97706'; let rad = 10;
        if (c.type === 'silver') { color = '#cbd5e1'; stroke = '#64748b'; rad = 9; }
        if (c.type === 'bronze') { color = '#ca8a04'; stroke = '#78350f'; rad = 8; }
        ctx.fillStyle = color; ctx.strokeStyle = stroke; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.scale(1, -1);
        ctx.fillStyle = stroke; ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0.5);
        ctx.restore();
      });

      // Fuel canisters
      fuelsList.forEach(f => {
        if (f.collected || f.x < camera.x - 200 || f.x > camera.x + 650) return;
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(-11, -14, 22, 28);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(-6, 14, 12, 4);
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 14, 8, Math.PI, 0); ctx.stroke();
        ctx.scale(1, -1);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center'; ctx.fillText('GAS', 0, 3);
        ctx.restore();
      });

      // Particles
      particlesList.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size || 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Wheels
      [vehicle.backWheel, vehicle.frontWheel].forEach(w => {
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(w.angle);
        ctx.fillStyle = '#1e293b';
        ctx.beginPath(); ctx.arc(0, 0, w.radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3.5;
        for (let i = 0; i < 5; i++) {
          ctx.rotate((Math.PI * 2) / 5);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, w.radius - 3); ctx.stroke();
        }
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });

      // Suspension springs
      {
        const vCos = Math.cos(vehicle.angle);
        const vSin = Math.sin(vehicle.angle);
        const bRX  = vehicle.x + ATTACH_BACK_X  * vCos - ATTACH_Y_LOCAL * vSin;
        const bRY  = vehicle.y + ATTACH_BACK_X  * vSin + ATTACH_Y_LOCAL * vCos;
        const fRX  = vehicle.x + ATTACH_FRONT_X * vCos - ATTACH_Y_LOCAL * vSin;
        const fRY  = vehicle.y + ATTACH_FRONT_X * vSin + ATTACH_Y_LOCAL * vCos;
        ctx.strokeStyle = '#475569'; ctx.lineWidth = 3;
        [
          { wx: vehicle.backWheel.x,  wy: vehicle.backWheel.y,  rx: bRX, ry: bRY },
          { wx: vehicle.frontWheel.x, wy: vehicle.frontWheel.y, rx: fRX, ry: fRY }
        ].forEach(p => {
          ctx.beginPath(); ctx.moveTo(p.wx, p.wy);
          for (let i = 1; i <= 5; i++) {
            const r = i / 5;
            ctx.lineTo(p.wx + (p.rx - p.wx) * r + (i % 2 === 0 ? 4 : -4) * Math.sin(vehicle.angle + Math.PI / 2), p.wy + (p.ry - p.wy) * r);
          }
          ctx.lineTo(p.rx, p.ry); ctx.stroke();
        });
      }

      // Chassis body
      ctx.save();
      ctx.translate(vehicle.x, vehicle.y);
      ctx.rotate(vehicle.angle);
      ctx.fillStyle = '#4f46e5'; ctx.strokeStyle = '#1e1b4b'; ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(52, -6); ctx.lineTo(38, 12); ctx.lineTo(6, 26);
      ctx.lineTo(-24, 26); ctx.lineTo(-44, 4); ctx.lineTo(-48, -12);
      ctx.lineTo(46, -12); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(6,182,212,0.45)';
      ctx.beginPath();
      ctx.moveTo(33, 11); ctx.lineTo(6, 24); ctx.lineTo(-20, 24); ctx.lineTo(-12, 11);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(-52, 1, 10, 5);
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(-35, -5); ctx.lineTo(25, -5); ctx.lineTo(15, 2); ctx.lineTo(-30, 2);
      ctx.closePath(); ctx.fill();
      ctx.restore();

      // Driver bobble head
      ctx.save();
      ctx.translate(vehicle.headX, vehicle.headY);
      ctx.rotate(vehicle.angle * 0.95);
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 5.5;
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, -16); ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.arc(3.5, 1, 8.5, -Math.PI / 4, Math.PI / 4); ctx.lineTo(3.5, 1); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(0, 0, 11, Math.PI * 0.6, Math.PI * 0.95); ctx.lineTo(0, 0); ctx.fill();
      ctx.restore();

      ctx.restore(); // exit Y-up world

      // Air-time HUD
      if (airTimeMessage) {
        ctx.save();
        ctx.fillStyle = 'rgba(15,23,42,0.85)';
        ctx.fillRect(width / 2 - 140, 75, 280, 42);
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
        ctx.strokeRect(width / 2 - 140, 75, 280, 42);
        ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(airTimeMessage, width / 2, 96);
        ctx.restore();
      }

      // High score
      if (currentDist > highScoreRef.current) {
        highScoreRef.current = currentDist;
        setHighScore(currentDist);
        saveStats(coinsRef.current, currentDist, upgradesRef.current);
      }

      loopRef.current = requestAnimationFrame(update);
    };

    const handleGameOver = (reason) => {
      cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
      setIsPlaying(false);
      if (audioSynthRef.current) audioSynthRef.current.playCrashSound();
      saveStats(coinsRef.current, highScoreRef.current, upgradesRef.current);
      // Show death meme first, then reveal game over screen when video ends
      setShowDeathMeme(true);
      setGameOverReason(reason);
    };

    loopRef.current = requestAnimationFrame(update);
  };


  // Keyboard event forwarding to Matter.js iframe for 100% reliable focus-free controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'keydown', key: e.key, code: e.code }, '*');
      }
    };
    
    const handleKeyUp = (e) => {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'keyup', key: e.key, code: e.code }, '*');
      }
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
          <iframe 
            ref={iframeRef}
            src="/hill-climber/index.html" 
            className="w-full h-full border-none" 
            title="Cyber-Bike Hill Climber"
          />
        </div>
      </div>
    </div>
  );
}
