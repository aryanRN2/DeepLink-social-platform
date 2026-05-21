"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, Award, Volume2, VolumeX, X, Play, 
  RotateCcw, Compass, Crosshair, Users, Activity, Swords 
} from 'lucide-react';

// --- MATHS & PERSPECTIVE ENGINE ---
// Coordinates: X = left/right, Y = vertical (floor is 0), Z = depth
const FOV_ANGLE = Math.PI / 3; // 60 degrees Field of View
const MAP_CELL_SIZE = 40;

const MAP_GRID = [
  [1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,0,1,1,0,1],
  [1,0,1,0,0,0,0,0,0,1,0,1],
  [1,0,0,0,0,1,1,0,0,0,0,1],
  [1,0,1,1,0,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,0,1,1,0,1],
  [1,0,1,0,0,0,0,0,0,1,0,1],
  [1,0,1,1,0,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1]
];

const MAP_ROWS = MAP_GRID.length;
const MAP_COLS = MAP_GRID[0].length;

// Check collision against walls (radius based)
const checkWallCollision = (x, z, radius = 4) => {
  const minX = Math.floor((x - radius) / MAP_CELL_SIZE);
  const maxX = Math.floor((x + radius) / MAP_CELL_SIZE);
  const minZ = Math.floor((z - radius) / MAP_CELL_SIZE);
  const maxZ = Math.floor((z + radius) / MAP_CELL_SIZE);

  if (minX < 0 || maxX >= MAP_COLS || minZ < 0 || maxZ >= MAP_ROWS) return true;

  for (let r = minZ; r <= maxZ; r++) {
    for (let c = minX; c <= maxX; c++) {
      if (MAP_GRID[r][c] === 1) return true;
    }
  }
  return false;
};

// Raycast line of sight check between two coordinates (returns true if clear)
const checkLineOfSight = (x1, z1, x2, z2) => {
  const dist = Math.hypot(x2 - x1, z2 - z1);
  const steps = Math.ceil(dist / 6); // step every 6px along segment
  for (let i = 0; i <= steps; i++) {
    const t = steps > 0 ? i / steps : 0;
    const px = x1 + (x2 - x1) * t;
    const pz = z1 + (z2 - z1) * t;
    if (checkWallCollision(px, pz, 1.8)) {
      return false; // ray intersects solid wall
    }
  }
  return true;
};

// --- AUDIO SYNTHESIZER ---
class FPSAudioSynth {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.ambientOsc = null;
    this.ambientGain = null;
    this.ambientTimer = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.startAmbientLoop();
    } catch (e) {
      console.warn("Web Audio API not supported in FPS room", e);
    }
  }

  startAmbientLoop() {
    if (!this.ctx || this.isMuted) return;
    
    // Pulse ambient cyberpunk bass notes
    const notes = [65.41, 73.42, 82.41, 55.00]; // C2, D2, E2, A1
    let noteIndex = 0;
    
    this.ambientTimer = setInterval(() => {
      if (this.isMuted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(notes[noteIndex], now);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(140, now);
        
        gain.gain.setValueAtTime(0.0, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 1.3);
        
        noteIndex = (noteIndex + 1) % notes.length;
      } catch (e) {}
    }, 1500);
  }

  playLaser() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1000, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {}
  }

  playImpact() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.setValueAtTime(40, now + 0.05);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  playJump() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(550, now + 0.25);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }

  playExplode() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(10, now + 0.6);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(30, now + 0.6);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.7);
    } catch (e) {}
  }

  playMedkit() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        
        gain.gain.setValueAtTime(0.05, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.22);
      });
    } catch (e) {}
  }

  setMute(muted) {
    this.isMuted = muted;
    if (muted && this.ambientTimer) {
      clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    } else if (!muted && !this.ambientTimer) {
      this.startAmbientLoop();
    }
  }

  stop() {
    if (this.ambientTimer) {
      clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
    this.ctx = null;
  }
}

export default function FightingRoom({ onClose, username }) {
  // Game state
  const [isPlaying, setIsPlaying] = useState(false);
  const [health, setHealth] = useState(100);
  const [ammo, setAmmo] = useState(30);
  const [kills, setKills] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [killFeed, setKillFeed] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [gyroActive, setGyroActive] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  const [showExitConfirm, setShowExitConfirmState] = useState(false);

  // References
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const showExitConfirmRef = useRef(false);
  const lastGyroRef = useRef(null);
  
  const setShowExitConfirm = (val) => {
    setShowExitConfirmState(val);
    showExitConfirmRef.current = val;
  };

  const audioSynthRef = useRef(FPSAudioSynth ? new FPSAudioSynth() : null);
  const loopRef = useRef(null);
  const supabaseRef = useRef(null);
  const channelRef = useRef(null);

  // Input states stored in refs for direct frame accessibility
  const keysRef = useRef({ w: false, a: false, s: false, d: false, Space: false });
  const mouseLookRef = useRef({ deltaX: 0, deltaY: 0 });
  const touchJoystickRef = useRef({ startX: 0, startY: 0, currentX: 0, currentY: 0, active: false });
  const touchLookRef = useRef({ lastX: 0, lastY: 0, active: false });

  // Player position & physics state in refs (60fps reactive loop)
  const playerRef = useRef({
    x: 30, // Start inside map boundaries
    y: 12, // Standing height
    z: 30,
    yaw: 0.8, // Radian angle horizontal
    pitch: 0, // Radian angle vertical
    velY: 0,
    onGround: true,
    score: 0,
    health: 100,
    lastFired: 0,
    recoil: 0,
    weaponSway: 0,
    screenFlash: { type: null, alpha: 0 }, // 'damage' (red), 'heal' (green)
    spawnProtectionUntil: 0
  });

  // Multiplayer online players list
  const multiplayerPlayersRef = useRef(new Map());
  const clientSessionIdRef = useRef(Math.random().toString(36).substring(2, 9));

  // Game Entities: Bots & Medkits
  const botsRef = useRef([
    { id: 'bot-omega', name: '🤖 Bot-Omega', x: 180, y: 0, z: 200, yaw: 0, health: 100, maxHp: 100, currentHp: 100, isAlive: true, deathProgress: 0, state: 'patrol', targetX: 180, targetZ: 200, lastFired: 0 },
    { id: 'bot-cyber', name: '🤖 Bot-Cyber', x: 220, y: 0, z: 80, yaw: 3.14, health: 100, maxHp: 100, currentHp: 100, isAlive: true, deathProgress: 0, state: 'patrol', targetX: 220, targetZ: 80, lastFired: 0 },
    { id: 'bot-neon', name: '🤖 Bot-Neon', x: 80, y: 0, z: 220, yaw: 1.5, health: 100, maxHp: 100, currentHp: 100, isAlive: true, deathProgress: 0, state: 'patrol', targetX: 80, targetZ: 220, lastFired: 0 }
  ]);

  const medkitsRef = useRef([
    { id: 'med-1', x: 140, y: 6, z: 140, active: true },
    { id: 'med-2', x: 300, y: 6, z: 100, active: true },
    { id: 'med-3', x: 80, y: 6, z: 80, active: true }
  ]);

  // Visual lasers & particles
  const tracersRef = useRef([]); // lasers: { from: {x,y,z}, to: {x,y,z}, color, maxAge, age }
  const particlesRef = useRef([]); // sparks: { x, y, z, vx, vy, vz, color, maxAge, age }

  // Detect mobile & orientation
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    // Import Supabase dynamically to ensure config check
    const initSupabase = async () => {
      const { supabase: s } = await import('../supabaseClient');
      supabaseRef.current = s;
    };
    initSupabase();

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
      if (audioSynthRef.current) audioSynthRef.current.stop();
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isPlaying || isDead || showExitConfirmRef.current) return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(k)) keysRef.current[k] = true;
      if (k === 'r') triggerManualReload();
      if (e.key === ' ' || e.code === 'Space') keysRef.current.Space = true;
      
      // Prevent browser default scrolling
      if (e.key === ' ' || e.code === 'Space') e.preventDefault();
    };

    const handleKeyUp = (e) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(k)) keysRef.current[k] = false;
      if (e.key === ' ' || e.code === 'Space') keysRef.current.Space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying, isDead, showExitConfirm]);

  const triggerManualReload = () => {
    if (!isPlaying || isDead || showExitConfirmRef.current || ammo === 30) return;
    if (audioSynthRef.current) audioSynthRef.current.playImpact();
    setAmmo(30);
    playerRef.current.lastFired = Date.now() + 400; // Reload penalty delay
  };

  const handleDeviceOrientation = (e) => {
    if (!playerRef.current || playerRef.current.health <= 0 || isDead || showExitConfirmRef.current) return;
    
    // e.alpha: [0, 360], e.beta: [-180, 180], e.gamma: [-90, 90]
    if (lastGyroRef.current) {
      let deltaAlpha = e.alpha - lastGyroRef.current.alpha;
      let deltaBeta = e.beta - lastGyroRef.current.beta;
      let deltaGamma = e.gamma - lastGyroRef.current.gamma;

      // Handle alpha wrapping [0, 360]
      if (deltaAlpha > 180) deltaAlpha -= 360;
      if (deltaAlpha < -180) deltaAlpha += 360;

      // Detect landscape orientation type for sign correction
      const isLandscapeLeft = window.orientation === -90 || (screen.orientation && screen.orientation.type === 'landscape-secondary');
      const orientationSign = isLandscapeLeft ? -1 : 1;

      // Gyro look sensitivity
      const sensitivity = 0.007;

      // In landscape, tilting device left/right rotates around beta. Up/down rotates around gamma.
      const dyaw = deltaBeta * sensitivity * orientationSign;
      const dpitch = -deltaGamma * sensitivity * orientationSign;

      playerRef.current.yaw += dyaw;
      playerRef.current.pitch = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, playerRef.current.pitch + dpitch));
    }

    lastGyroRef.current = { alpha: e.alpha, beta: e.beta, gamma: e.gamma };
  };

  const enableGyro = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permissionState = await DeviceOrientationEvent.requestPermission();
        if (permissionState === 'granted') {
          window.addEventListener('deviceorientation', handleDeviceOrientation);
          setGyroActive(true);
        }
      } catch (err) {
        console.warn("DeviceOrientation permission denied or failed:", err);
      }
    } else {
      window.addEventListener('deviceorientation', handleDeviceOrientation);
      setGyroActive(true);
    }
  };

  // Reset movement keys when paused
  useEffect(() => {
    if (showExitConfirm) {
      keysRef.current = { w: false, a: false, s: false, d: false, Space: false };
    }
  }, [showExitConfirm]);

  // Monitor pointer lock loss to trigger pause
  useEffect(() => {
    const handlePointerLockChange = () => {
      if (isPlaying && document.pointerLockElement !== canvasRef.current && !isDead && !showExitConfirmRef.current) {
        setShowExitConfirm(true);
      }
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mozpointerlockchange', handlePointerLockChange);
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mozpointerlockchange', handlePointerLockChange);
    };
  }, [isPlaying, isDead]);

  // Pointer lock for desktop mouse capturing
  const requestPointerLock = () => {
    if (showExitConfirmRef.current || isDead) return;
    const canvas = canvasRef.current;
    if (canvas && !isMobile) {
      canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
      canvas.requestPointerLock();
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (document.pointerLockElement === canvasRef.current && !showExitConfirmRef.current) {
        // Multiplier controls mouse speed sensitivity
        mouseLookRef.current.deltaX += e.movementX * 0.0028;
        mouseLookRef.current.deltaY += e.movementY * 0.0028;
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Spawn and Sync Medkits & Bots
  const resetSpawnState = (isInitial = false) => {
    // Find all walkable empty cells in the map
    const walkableCells = [];
    for (let r = 1; r < MAP_ROWS - 1; r++) {
      for (let c = 1; c < MAP_COLS - 1; c++) {
        if (MAP_GRID[r][c] === 0) {
          // Avoid spawning right on top of a bot if possible
          let nearBot = false;
          botsRef.current.forEach(bot => {
            const bx = bot.x / MAP_CELL_SIZE;
            const bz = bot.z / MAP_CELL_SIZE;
            if (Math.hypot(c - bx, r - bz) < 2) {
              nearBot = true;
            }
          });
          walkableCells.push({ r, c, nearBot });
        }
      }
    }

    // Filter out cells near bots if there are others available
    let choice = walkableCells.filter(cell => !cell.nearBot);
    if (choice.length === 0) choice = walkableCells;

    const spawnCell = choice.length > 0 ? choice[Math.floor(Math.random() * choice.length)] : { r: 1, c: 1 };
    
    playerRef.current.x = spawnCell.c * MAP_CELL_SIZE + MAP_CELL_SIZE / 2;
    playerRef.current.z = spawnCell.r * MAP_CELL_SIZE + MAP_CELL_SIZE / 2;
    playerRef.current.y = 12;
    playerRef.current.velY = 0;
    playerRef.current.yaw = 0.8;
    playerRef.current.pitch = 0;
    playerRef.current.health = 100;
    playerRef.current.spawnProtectionUntil = Date.now() + 3000; // 3 seconds of invulnerability

    setHealth(100);
    setAmmo(30);
    setIsDead(false);

    if (isInitial) {
      botsRef.current.forEach((bot, idx) => {
        bot.health = 100;
        // Spawn bots spread out across different map coordinates
        const spawnPoints = [
          { x: 220, z: 200 },
          { x: 380, z: 100 },
          { x: 80, z: 380 }
        ];
        const sp = spawnPoints[idx] || { x: 180, z: 180 };
        bot.x = sp.x;
        bot.z = sp.z;
        bot.state = 'patrol';
      });

      medkitsRef.current.forEach(med => {
        med.active = true;
      });
    } else {
      // Just reset dead bots so they respawn far away
      botsRef.current.forEach(bot => {
        if (bot.health <= 0) {
          bot.health = 100;
          bot.x = 40 + Math.random() * 320;
          bot.z = 40 + Math.random() * 200;
          bot.state = 'patrol';
        }
      });
    }
  };

  // Laser Weapon Firing Trigger
  const triggerWeaponFire = () => {
    if (!isPlaying || isDead || playerRef.current.lastFired + 160 > Date.now()) return;
    
    if (ammo <= 0) {
      // Out of ammo: trigger quick synth reload
      if (audioSynthRef.current) audioSynthRef.current.playImpact();
      setAmmo(30);
      playerRef.current.lastFired = Date.now() + 400; // reload penalty delay
      return;
    }

    setAmmo(prev => prev - 1);
    playerRef.current.lastFired = Date.now();
    playerRef.current.recoil = 8.0;

    if (audioSynthRef.current) audioSynthRef.current.playLaser();

    // Compute laser direction vector
    const p = playerRef.current;
    const dx = Math.cos(p.pitch) * Math.sin(p.yaw);
    const dy = Math.sin(p.pitch);
    const dz = Math.cos(p.pitch) * Math.cos(p.yaw);

    // Laser Raycast trajectory
    let rayLength = 320;
    let hitPoint = { x: p.x + dx * rayLength, y: p.y + dy * rayLength, z: p.z + dz * rayLength };
    let finalDistance = rayLength;
    let targetHit = null;

    // Check hit intersections in increments along ray path
    const checkStepSize = 2.0;
    for (let d = 0; d < rayLength; d += checkStepSize) {
      const rx = p.x + dx * d;
      const ry = p.y + dy * d;
      const rz = p.z + dz * d;

      // Wall collision cuts laser off
      if (checkWallCollision(rx, rz, 1.5) || ry < 0 || ry > 40) {
        hitPoint = { x: rx, y: ry, z: rz };
        finalDistance = d;
        break;
      }

      // Check hits on bots
      let botIntersected = false;
      botsRef.current.forEach(bot => {
        if (bot.health <= 0 || botIntersected) return;
        const dist = Math.hypot(rx - bot.x, rz - bot.z);
        // Refined exact cylindrical spatial boundaries (radius < 6.5, height < 19.5)
        if (dist < 6.5 && ry > 0 && ry < 19.5) {
          botIntersected = true;
          targetHit = { type: 'bot', id: bot.id, x: rx, y: ry, z: rz };
          hitPoint = { x: rx, y: ry, z: rz };
          finalDistance = d;
        }
      });
      if (botIntersected) break;

      // Check hits on other players (multiplayer clients)
      let playerIntersected = false;
      multiplayerPlayersRef.current.forEach((opp, oppUsername) => {
        if (playerIntersected) return;
        const dist = Math.hypot(rx - opp.x, rz - opp.z);
        // Refined exact cylindrical spatial boundaries (radius < 6.5, height < 19.5)
        if (dist < 6.5 && ry > 0 && ry < 19.5) {
          playerIntersected = true;
          targetHit = { type: 'opponent', username: oppUsername, x: rx, y: ry, z: rz };
          hitPoint = { x: rx, y: ry, z: rz };
          finalDistance = d;
        }
      });
      if (playerIntersected) break;
    }

    // Add laser visual tracer
    tracersRef.current.push({
      from: { x: p.x + dx * 6 - Math.sin(p.yaw + 1.5) * 2.5, y: p.y - 3.5, z: p.z + dz * 6 - Math.cos(p.yaw + 1.5) * 2.5 },
      to: hitPoint,
      color: '#a855f7', // violet neon tracer
      maxAge: 0.1,
      age: 0
    });

    // Hit impact sparks
    spawnSparks(hitPoint.x, hitPoint.y, hitPoint.z, '#c084fc');

    // Broadcast Laser fire to multiplayer
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'fps-shoot',
        payload: {
          username,
          origin: { x: p.x, y: p.y, z: p.z },
          hit: hitPoint
        }
      });
    }

    // Process hits
    if (targetHit) {
      if (audioSynthRef.current) audioSynthRef.current.playImpact();

      if (targetHit.type === 'bot') {
        const bot = botsRef.current.find(b => b.id === targetHit.id);
        if (bot) {
          bot.health -= 25;
          bot.currentHp = bot.health;
          spawnSparks(targetHit.x, targetHit.y, targetHit.z, '#ef4444', 12);
          
          if (bot.health <= 0) {
            bot.isAlive = false;
            bot.deathProgress = 0;
            if (audioSynthRef.current) audioSynthRef.current.playExplode();
            spawnSparks(bot.x, 8, bot.z, '#f59e0b', 30);
            
            p.score += 1;
            setKills(p.score);
            pushKillFeed("You", bot.name);
            
            // Respawn bot after short timer
            const bId = bot.id;
            setTimeout(() => {
              const resp = botsRef.current.find(b => b.id === bId);
              if (resp) {
                resp.health = 100;
                resp.currentHp = 100;
                resp.isAlive = true;
                resp.deathProgress = 0;
                resp.x = 50 + Math.random() * 250;
                resp.z = 50 + Math.random() * 200;
              }
            }, 6000);
          }
        }
      } else if (targetHit.type === 'opponent') {
        // Send a direct damage broadcast to target candidate
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'fps-hit',
            payload: {
              shooter: username,
              target: targetHit.username,
              damage: 25
            }
          });
        }
      }
    }
  };

  // Bullet collision visual effects helper
  const spawnSparks = (x, y, z, color, count = 8) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y, z,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.2) * 16 + 2,
        vz: (Math.random() - 0.5) * 16,
        color,
        maxAge: 0.3 + Math.random() * 0.2,
        age: 0
      });
    }
  };

  const pushKillFeed = (attacker, victim) => {
    const entry = {
      id: Math.random().toString(),
      attacker,
      victim,
      timestamp: Date.now()
    };
    setKillFeed(prev => [entry, ...prev].slice(0, 5));
  };

  // Launch Fighting Game
  const startGame = () => {
    setIsPlaying(true);
    setShowExitConfirm(false);
    resetSpawnState(true);

    if (audioSynthRef.current) {
      audioSynthRef.current.init();
      audioSynthRef.current.setMute(isMuted);
    }

    // Request Fullscreen on root document to occupy entire screen on mobile
    const reqFullscreen = () => {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(err => console.warn("Fullscreen request failed:", err));
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      }
    };
    reqFullscreen();

    // Force orientation lock to landscape if API is available
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(err => {
        console.warn("Screen orientation lock rejected/not supported:", err);
      });
    }

    // Activate gyroscope view tilt mapping (handles permission checks)
    enableGyro();

    // Request Pointer Lock after short delay to allow transition
    setTimeout(() => {
      requestPointerLock();
    }, 400);

    // Connect Supabase Broadcast Sync Channel
    if (supabaseRef.current) {
      const channel = supabaseRef.current.channel('room:fighting', {
        config: {
          broadcast: { self: false },
          presence: { key: username }
        }
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          // Remove players who left
          const currentOpps = new Set(Object.keys(state));
          multiplayerPlayersRef.current.forEach((_, name) => {
            if (!currentOpps.has(name)) {
              multiplayerPlayersRef.current.delete(name);
            }
          });
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log(`Candidate ${key} entered the cyber-arena!`);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log(`Candidate ${key} fled the arena!`);
          multiplayerPlayersRef.current.delete(key);
        })
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {}) // placeholder
        .on('broadcast', { event: 'fps-update' }, (payload) => {
          const p = payload.payload;
          if (p.username !== username) {
            multiplayerPlayersRef.current.set(p.username, {
              x: p.x,
              y: p.y,
              z: p.z,
              yaw: p.yaw,
              pitch: p.pitch,
              health: p.health,
              score: p.score,
              lastUpdate: Date.now()
            });
          }
        })
        .on('broadcast', { event: 'fps-shoot' }, (payload) => {
          const p = payload.payload;
          if (p.username !== username) {
            // Draw visual opponent tracer
            tracersRef.current.push({
              from: p.origin,
              to: p.hit,
              color: '#3b82f6', // blue opponent tracer
              maxAge: 0.1,
              age: 0
            });
            spawnSparks(p.hit.x, p.hit.y, p.hit.z, '#93c5fd');
          }
        })
        .on('broadcast', { event: 'fps-hit' }, (payload) => {
          const p = payload.payload;
          if (p.target === username) {
            // Trigger red screen flash & damage subtraction
            playerRef.current.health = Math.max(0, playerRef.current.health - p.damage);
            playerRef.current.screenFlash = { type: 'damage', alpha: 0.5 };
            setHealth(playerRef.current.health);
            if (audioSynthRef.current) audioSynthRef.current.playImpact();

            if (playerRef.current.health <= 0) {
              if (audioSynthRef.current) audioSynthRef.current.playExplode();
              setIsDead(true);
              pushKillFeed(p.shooter, "You");
              
              // Broadcast death
              if (channelRef.current) {
                channelRef.current.send({
                  type: 'broadcast',
                  event: 'fps-kill',
                  payload: { attacker: p.shooter, victim: username }
                });
              }
            }
          }
        })
        .on('broadcast', { event: 'fps-kill' }, (payload) => {
          const p = payload.payload;
          pushKillFeed(p.attacker, p.victim);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              username,
              joinedAt: new Date().toISOString(),
              sessionId: clientSessionIdRef.current
            });
          }
        });

      channelRef.current = channel;
    }

    setTimeout(() => {
      runFPSGameLoop();
    }, 100);
  };

  const handleRespawn = () => {
    resetSpawnState(false);
  };

  // Smart background autonomous AI Bot logic and medkit collision tracker
  const processServerAILoop = (dt) => {
    const p = playerRef.current;
    
    // Check medkit intersections
    medkitsRef.current.forEach(med => {
      if (!med.active) return;
      
      const dist = Math.hypot(p.x - med.x, p.z - med.z);
      if (dist < 8.0 && Math.abs(p.y - med.y) < 10) {
        med.active = false;
        p.health = Math.min(100, p.health + 50);
        p.screenFlash = { type: 'heal', alpha: 0.55 };
        setHealth(p.health);
        if (audioSynthRef.current) audioSynthRef.current.playMedkit();

        // Respawn medkit in 10s
        setTimeout(() => {
          med.active = true;
        }, 10000);
      }
    });

    // Check bot movement AI
    botsRef.current.forEach(bot => {
      if (bot.health <= 0) return;

      // Locate closest candidate
      let targetX = p.x;
      let targetZ = p.z;
      let targetDistance = Math.hypot(p.x - bot.x, p.z - bot.z);
      let closestIsMe = true;

      const isPlayerProtected = Date.now() < (p.spawnProtectionUntil || 0);

      // If local player is protected or dead, treat them as extremely far so bots ignore them
      if (isPlayerProtected || isDead) {
        targetDistance = Infinity;
      }

      multiplayerPlayersRef.current.forEach((opp, oppUsername) => {
        const isOppProtected = Date.now() < (opp.spawnProtectionUntil || 0);
        if (isOppProtected || opp.health <= 0) return;

        const d = Math.hypot(opp.x - bot.x, opp.z - bot.z);
        if (d < targetDistance) {
          targetDistance = d;
          targetX = opp.x;
          targetZ = opp.z;
          closestIsMe = false;
        }
      });

      // Chase AI: If any candidate gets within 160px and we have line of sight, alert and pursue
      const hasLOS = checkLineOfSight(bot.x, bot.z, targetX, targetZ);

      if (targetDistance < 160 && hasLOS) {
        bot.state = 'chase';
        bot.targetX = targetX;
        bot.targetZ = targetZ;

        // Angle face direction to target candidate
        bot.yaw = Math.atan2(targetX - bot.x, targetZ - bot.z);

        // Move towards target
        const moveSpeed = 20 * dt;
        const dx = Math.sin(bot.yaw) * moveSpeed;
        const dz = Math.cos(bot.yaw) * moveSpeed;
        
        const nextX = bot.x + dx;
        const nextZ = bot.z + dz;

        if (!checkWallCollision(nextX, nextZ, 4.5)) {
          bot.x = nextX;
          bot.z = nextZ;
        }

        // Fire laser beams at target with interval delay
        if (bot.lastFired + 1400 < Date.now()) {
          bot.lastFired = Date.now();
          
          // 30% miss chance for bots
          const isMiss = Math.random() < 0.3;
          let laserEndX = targetX;
          let laserEndZ = targetZ;
          
          if (isMiss) {
            // Deviation to miss the player
            const angleOffset = (Math.random() - 0.5) * 0.45;
            const shootYaw = bot.yaw + angleOffset;
            laserEndX = bot.x + Math.sin(shootYaw) * targetDistance;
            laserEndZ = bot.z + Math.cos(shootYaw) * targetDistance;
          }

          // Tracers
          tracersRef.current.push({
            from: { x: bot.x, y: 10, z: bot.z },
            to: { x: laserEndX, y: 8, z: laserEndZ },
            color: isMiss ? '#f87171' : '#ef4444', // Lighter red for missed shots
            maxAge: 0.1,
            age: 0
          });
          spawnSparks(laserEndX, 8, laserEndZ, isMiss ? '#fee2e2' : '#fca5a5');

          // Inflict damage if targeted candidate is local player and we did not miss
          if (closestIsMe && !isMiss) {
            p.health = Math.max(0, p.health - 12); // Slightly lower damage (from 15 to 12)
            p.screenFlash = { type: 'damage', alpha: 0.4 };
            setHealth(p.health);
            if (audioSynthRef.current) audioSynthRef.current.playImpact();

            if (p.health <= 0) {
              if (audioSynthRef.current) audioSynthRef.current.playExplode();
              setIsDead(true);
              pushKillFeed(bot.name, "You");

              if (channelRef.current) {
                channelRef.current.send({
                  type: 'broadcast',
                  event: 'fps-kill',
                  payload: { attacker: bot.name, victim: username }
                });
              }
            }
          }
        }
      } else {
        // Patrol AI: wander between random walkable nodes
        if (bot.state !== 'patrol' || Math.hypot(bot.x - bot.targetX, bot.z - bot.targetZ) < 10) {
          bot.state = 'patrol';
          
          const walkableCells = [];
          for (let r = 1; r < MAP_ROWS - 1; r++) {
            for (let c = 1; c < MAP_COLS - 1; c++) {
              if (MAP_GRID[r][c] === 0) {
                walkableCells.push({ r, c });
              }
            }
          }
          const targetCell = walkableCells[Math.floor(Math.random() * walkableCells.length)] || { r: 1, c: 1 };
          bot.targetX = targetCell.c * MAP_CELL_SIZE + MAP_CELL_SIZE / 2;
          bot.targetZ = targetCell.r * MAP_CELL_SIZE + MAP_CELL_SIZE / 2;
        }

        bot.yaw = Math.atan2(bot.targetX - bot.x, bot.targetZ - bot.z);
        const moveSpeed = 12 * dt;
        const dx = Math.sin(bot.yaw) * moveSpeed;
        const dz = Math.cos(bot.yaw) * moveSpeed;

        const nextX = bot.x + dx;
        const nextZ = bot.z + dz;

        if (!checkWallCollision(nextX, nextZ, 4.5)) {
          bot.x = nextX;
          bot.z = nextZ;
        }
      }
    });
  };

  // Core 3D perspective projection game loop
  const runFPSGameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let lastTime = performance.now();
    let netUpdateTimer = 0;

    const render = (timestamp) => {
      let dt = (timestamp - lastTime) / 1000;
      if (dt > 0.1) dt = 0.1;
      lastTime = timestamp;

      const width = canvas.width = canvas.clientWidth;
      const height = canvas.height = canvas.clientHeight;
      const ctx = canvas.getContext('2d');
      const centerX = width / 2;
      const centerY = height / 2;

      const p = playerRef.current;

      // 1. PROCESS ROTATION LOOK & WALKING CONTROLS
      if (!isDead && !showExitConfirmRef.current) {
        // Apply mouse movement looking angles
        p.yaw += mouseLookRef.current.deltaX;
        p.pitch = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, p.pitch - mouseLookRef.current.deltaY));
        
        // Reset deltas
        mouseLookRef.current.deltaX = 0;
        mouseLookRef.current.deltaY = 0;

        // Visual recoil easing
        p.recoil *= Math.max(0, 1 - 10 * dt);

        // Apply joystick navigation overlay
        let moveX = 0;
        let moveZ = 0;

        // Calculate camera-relative forward and right direction vectors
        const forwardX = -Math.sin(p.yaw);
        const forwardZ = Math.cos(p.yaw);
        const rightX = Math.cos(p.yaw);
        const rightZ = Math.sin(p.yaw);

        if (keysRef.current.w) { moveX += forwardX; moveZ += forwardZ; }
        if (keysRef.current.s) { moveX -= forwardX; moveZ -= forwardZ; }
        if (keysRef.current.d) { moveX += rightX; moveZ += rightZ; }
        if (keysRef.current.a) { moveX -= rightX; moveZ -= rightZ; }

        // Mobile touch joystick override calculations
        if (touchJoystickRef.current.active) {
          const tj = touchJoystickRef.current;
          const dx = tj.currentX - tj.startX;
          const dy = tj.currentY - tj.startY;
          const dist = Math.hypot(dx, dy) || 1;
          const maxD = 40;
          const power = Math.min(1.0, dist / maxD);
          
          const angle = Math.atan2(dx, -dy) - p.yaw;
          moveX = Math.sin(angle) * power;
          moveZ = Math.cos(angle) * power;
        }

        // Apply walking movement with sliding wall friction sliding check
        const runSpeed = 50 * dt;
        const targetSpeedX = moveX * runSpeed;
        const targetSpeedZ = moveZ * runSpeed;

        // Weapon swaying animations
        if (moveX !== 0 || moveZ !== 0) {
          p.weaponSway += dt * 10;
        } else {
          p.weaponSway *= Math.max(0, 1 - 8 * dt);
        }

        const nextX = p.x + targetSpeedX;
        const nextZ = p.z + targetSpeedZ;

        // Check horizontal & vertical collisions independently for smooth wall gliding
        if (!checkWallCollision(nextX, p.z, 5.0)) {
          p.x = nextX;
        }
        if (!checkWallCollision(p.x, nextZ, 5.0)) {
          p.z = nextZ;
        }

        // Jump Physics
        const jumpRequested = keysRef.current.Space;
        if (jumpRequested && p.onGround) {
          p.velY = 4.2; // vertical boost launch impulse
          p.onGround = false;
          if (audioSynthRef.current) audioSynthRef.current.playJump();
        }
      }

      // Gravity integration
      if (!p.onGround) {
        p.velY -= 12.0 * dt; // gravity deceleration
        p.y += p.velY * 30 * dt;

        if (p.y <= 12) {
          p.y = 12;
          p.velY = 0;
          p.onGround = true;
        }
      }

      // 2. PROCESS AI BOTS & MEDKITS
      processServerAILoop(dt);

      // 3. PERIODIC BROADCAST UPDATE TO MULTIPLAYER CHAMBER (50ms interval throttler)
      netUpdateTimer += dt;
      if (netUpdateTimer > 0.05 && channelRef.current) {
        netUpdateTimer = 0;
        channelRef.current.send({
          type: 'broadcast',
          event: 'fps-update',
          payload: {
            username,
            x: p.x,
            y: p.y,
            z: p.z,
            yaw: p.yaw,
            pitch: p.pitch,
            health: p.health,
            score: p.score
          }
        });
      }

      // 4. PREPARE 3DPERSPECTIVE TRANSFORMATION FUNCTIONS
      const fovScale = (width / 2) / Math.tan(FOV_ANGLE / 2);

      const project3DPoint = (wx, wy, wz) => {
        // Translate
        const dx = wx - p.x;
        const dy = wy - p.y;
        const dz = wz - p.z;

        // Rotation around Y (Yaw)
        const cosY = Math.cos(-p.yaw);
        const sinY = Math.sin(-p.yaw);
        const rx = dx * cosY - dz * sinY;
        const rz = dx * sinY + dz * cosY;

        // Rotation around X (Pitch)
        const cosP = Math.cos(-p.pitch);
        const sinP = Math.sin(-p.pitch);
        const ry2 = dy * cosP - rz * sinP;
        const rz2 = dy * sinP + rz * cosP;

        if (rz2 < 1.5) return null; // Behind near clipping plane

        return {
          sx: centerX + (rx * fovScale) / rz2,
          sy: centerY - (ry2 * fovScale) / rz2,
          sz: rz2
        };
      };

      // 5. DRAW BACKGROUND RETRO SPACE GRADIENT & STARS
      ctx.fillStyle = '#05020c';
      ctx.fillRect(0, 0, width, height);

      // Stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 40; i++) {
        const starX = (Math.sin(i * 123 + p.yaw * 1.5) * 0.5 + 0.5) * width;
        const starY = (Math.cos(i * 321 + p.pitch * 1.2) * 0.5 + 0.5) * centerY * 1.2;
        ctx.fillRect(starX, starY, 1.5, 1.5);
      }

      // 6. DRAW COLOURED GRID CYBER FLOOR
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.12)';
      ctx.lineWidth = 1.5;
      
      const gridCount = 20;
      for (let c = 0; c <= gridCount; c++) {
        const gridCoord = c * (MAP_CELL_SIZE * 1.2);
        
        // Horizontal grid lines
        const p1 = project3DPoint(0, 0, gridCoord);
        const p2 = project3DPoint(gridCount * MAP_CELL_SIZE, 0, gridCoord);
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.sx, p1.sy);
          ctx.lineTo(p2.sx, p2.sy);
          ctx.stroke();
        }

        // Vertical grid lines
        const p3 = project3DPoint(gridCoord, 0, 0);
        const p4 = project3DPoint(gridCoord, 0, gridCount * MAP_CELL_SIZE);
        if (p3 && p4) {
          ctx.beginPath();
          ctx.moveTo(p3.sx, p3.sy);
          ctx.lineTo(p4.sx, p4.sy);
          ctx.stroke();
        }
      }

      // 7. COLLECT 3D POLYGONS (WALLS, PLAYERS, BOTS, MEDKITS, PARTICLES) FOR DEPTH SORTING
      const drawables = [];

      // Wall faces collector
      const addBoxPolygons = (cx, cz, colorHex, outlineColor) => {
        const x = cx * MAP_CELL_SIZE;
        const z = cz * MAP_CELL_SIZE;
        const size = MAP_CELL_SIZE;
        const wHeight = 44;

        // Bounding Vertices
        const v = [
          { x, y: 0, z },                      // 0: bottom back left
          { x: x + size, y: 0, z },            // 1: bottom back right
          { x: x + size, y: 0, z: z + size },  // 2: bottom front right
          { x, y: 0, z: z + size },            // 3: bottom front left
          { x, y: wHeight, z },                // 4: top back left
          { x: x + size, y: wHeight, z },      // 5: top back right
          { x: x + size, y: wHeight, z: z + size },// 6: top front right
          { x, y: wHeight, z: z + size }       // 7: top front left
        ];

        const projectFace = (indices, faceNormal) => {
          const proj = indices.map(idx => {
            const worldPt = v[idx];
            return { raw: worldPt, screen: project3DPoint(worldPt.x, worldPt.y, worldPt.z) };
          });

          // Check if any vertices project successfully
          if (proj.some(pt => !pt.screen)) return;

          // Back-face Culling: cross product of projected 2D coordinates
          const screenPts = proj.map(p => p.screen);
          const cp = (screenPts[1].sx - screenPts[0].sx) * (screenPts[2].sy - screenPts[0].sy) - 
                     (screenPts[1].sy - screenPts[0].sy) * (screenPts[2].sx - screenPts[0].sx);

          if (cp < 0) return; // Culled out

          const avgZ = screenPts.reduce((acc, curr) => acc + curr.sz, 0) / screenPts.length;

          drawables.push({
            type: 'polygon',
            points: screenPts,
            color: colorHex,
            outline: outlineColor,
            zDepth: avgZ
          });
        };

        // Render only visible faces (adjacent empty cells) to minimize polygon overhead
        if (cx > 0 && MAP_GRID[cz][cx - 1] === 0) projectFace([3, 0, 4, 7], { x: -1, y: 0, z: 0 }); // West
        if (cx < MAP_COLS - 1 && MAP_GRID[cz][cx + 1] === 0) projectFace([1, 2, 6, 5], { x: 1, y: 0, z: 0 }); // East
        if (cz > 0 && MAP_GRID[cz - 1][cx] === 0) projectFace([0, 1, 5, 4], { x: 0, y: 0, z: -1 }); // North
        if (cz < MAP_ROWS - 1 && MAP_GRID[cz + 1][cx] === 0) projectFace([2, 3, 7, 6], { x: 0, y: 0, z: 1 }); // South
        projectFace([4, 5, 6, 7], { x: 0, y: 1, z: 0 }); // Top Roof Face
      };

      // Collect walls
      for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
          if (MAP_GRID[r][c] === 1) {
            // Cool cyber violet glowing theme
            addBoxPolygons(c, r, 'rgba(30, 16, 58, 0.7)', '#a855f7');
          }
        }
      }

      // Collect Medkits (spinning glowing crosses)
      medkitsRef.current.forEach(med => {
        if (!med.active) return;
        const screenPt = project3DPoint(med.x, med.y + Math.sin(timestamp * 0.003) * 1.5, med.z);
        if (screenPt) {
          drawables.push({
            type: 'medkit',
            pos: screenPt,
            zDepth: screenPt.sz
          });
        }
      });

      // Collect bots
      botsRef.current.forEach(bot => {
        // If dead and death animation completed, skip
        if (bot.health <= 0 && (bot.deathProgress === undefined || bot.deathProgress >= 1.0)) return;

        // Increment death progress if dead
        if (bot.health <= 0) {
          if (bot.deathProgress === undefined) bot.deathProgress = 0;
          bot.deathProgress += dt / 0.5; // 500ms total
          if (bot.deathProgress > 1.0) bot.deathProgress = 1.0;
          
          // Emit heavy spark explosion particles periodically during disintegration
          if (Math.random() < 0.35) {
            spawnSparks(bot.x, 8 + (Math.random() - 0.5) * 8, bot.z, '#fbbf24', 2);
          }
        }

        const screenPt = project3DPoint(bot.x, 7 + Math.sin(timestamp * 0.005) * 1.2, bot.z);
        if (screenPt) {
          drawables.push({
            type: 'bot',
            bot,
            pos: screenPt,
            zDepth: screenPt.sz
          });
        }
      });

      // Collect multiplayer opponents
      multiplayerPlayersRef.current.forEach((opp, oppUsername) => {
        // Drop outdated users (dead reckoning safety)
        if (opp.lastUpdate + 6000 < Date.now()) {
          multiplayerPlayersRef.current.delete(oppUsername);
          return;
        }

        const screenPt = project3DPoint(opp.x, 8, opp.z);
        if (screenPt) {
          drawables.push({
            type: 'opponent',
            username: oppUsername,
            health: opp.health,
            pos: screenPt,
            zDepth: screenPt.sz
          });
        }
      });

      // Collect visual particles (spark splats)
      particlesRef.current.forEach(part => {
        part.age += dt;
        if (part.age >= part.maxAge) return;

        // Apply physics
        part.vy -= 16.0 * dt;
        part.x += part.vx * dt;
        part.y += part.vy * dt;
        part.z += part.vz * dt;

        const screenPt = project3DPoint(part.x, part.y, part.z);
        if (screenPt) {
          drawables.push({
            type: 'particle',
            pos: screenPt,
            color: part.color,
            zDepth: screenPt.sz,
            alpha: 1.0 - (part.age / part.maxAge)
          });
        }
      });
      // Filter out dead particles
      particlesRef.current = particlesRef.current.filter(p => p.age < p.maxAge);

      // Collect laser tracers
      tracersRef.current.forEach(trac => {
        trac.age += dt;
        if (trac.age >= trac.maxAge) return;

        const p1 = project3DPoint(trac.from.x, trac.from.y, trac.from.z);
        const p2 = project3DPoint(trac.to.x, trac.to.y, trac.to.z);
        if (p1 && p2) {
          drawables.push({
            type: 'tracer',
            p1, p2,
            color: trac.color,
            zDepth: (p1.sz + p2.sz) / 2
          });
        }
      });
      tracersRef.current = tracersRef.current.filter(t => t.age < t.maxAge);

      // 8. RENDER DRAWABLES IN ASCENDING ORDER OF DEPTH (PAINTER'S ALGORITHM)
      drawables.sort((a, b) => b.zDepth - a.zDepth);

      drawables.forEach(item => {
        if (item.type === 'polygon') {
          ctx.fillStyle = item.color;
          ctx.strokeStyle = item.outline;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(item.points[0].sx, item.points[0].sy);
          for (let i = 1; i < item.points.length; i++) {
            ctx.lineTo(item.points[i].sx, item.points[i].sy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } 
        
        else if (item.type === 'medkit') {
          const sz = Math.max(6, 11200 / item.zDepth);
          
          // Draw spinning green glowing cross
          ctx.fillStyle = '#10b981';
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 2.0;

          // Cross Shape
          ctx.beginPath();
          ctx.fillRect(item.pos.sx - sz/3, item.pos.sy - sz, sz*0.66, sz*2);
          ctx.fillRect(item.pos.sx - sz, item.pos.sy - sz/3, sz*2, sz*0.66);
          
          // Neon outline circle ring
          ctx.beginPath();
          ctx.arc(item.pos.sx, item.pos.sy, sz * 1.2, 0, Math.PI * 2);
          ctx.stroke();
        } 
        
        else if (item.type === 'bot') {
          const sz = Math.max(8, 16000 / item.zDepth);
          const scale = item.bot.health <= 0 ? Math.max(0, 1.0 - (item.bot.deathProgress || 0)) : 1.0;
          const currentSz = sz * scale;

          // 1. Hover Engine Thruster (Magenta)
          ctx.fillStyle = 'rgba(236, 72, 153, 0.4)'; // magenta/pink fill
          ctx.strokeStyle = '#ec4899'; // magenta stroke
          ctx.lineWidth = 2.0 * scale;
          ctx.beginPath();
          ctx.moveTo(item.pos.sx - currentSz * 0.4, item.pos.sy + currentSz * 0.2);
          ctx.lineTo(item.pos.sx + currentSz * 0.4, item.pos.sy + currentSz * 0.2);
          ctx.lineTo(item.pos.sx, item.pos.sy + currentSz * 0.9);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Thruster fire glow
          ctx.fillStyle = '#f472b6';
          ctx.beginPath();
          ctx.arc(item.pos.sx, item.pos.sy + currentSz * 0.5, currentSz * 0.25 * (1.0 + Math.sin(timestamp * 0.05) * 0.2), 0, Math.PI * 2);
          ctx.fill();

          // 2. Chassis/Torso (Glowing Metallic Cylinder)
          ctx.fillStyle = 'rgba(30, 27, 75, 0.75)'; // Deep indigo/metallic
          ctx.strokeStyle = '#f59e0b'; // Glowing orange neon stroke
          ctx.lineWidth = 2.5 * scale;
          ctx.beginPath();
          ctx.roundRect(item.pos.sx - currentSz * 0.7, item.pos.sy - currentSz * 0.7, currentSz * 1.4, currentSz * 1.0, currentSz * 0.3);
          ctx.fill();
          ctx.stroke();

          // Inner cybernetic structural grid lines
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
          ctx.lineWidth = 1.0 * scale;
          ctx.beginPath();
          ctx.roundRect(item.pos.sx - currentSz * 0.55, item.pos.sy - currentSz * 0.55, currentSz * 1.1, currentSz * 0.7, currentSz * 0.2);
          ctx.stroke();

          // 3. Left and Right Weapon Arms (Glowing orange with yellow cannons)
          ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
          ctx.strokeStyle = '#fbbf24'; // yellow
          ctx.lineWidth = 2.0 * scale;

          // Left Arm
          ctx.beginPath();
          ctx.rect(item.pos.sx - currentSz * 1.2, item.pos.sy - currentSz * 0.4, currentSz * 0.5, currentSz * 0.3);
          ctx.fill();
          ctx.stroke();
          // Left Cannon barrel
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(item.pos.sx - currentSz * 1.4, item.pos.sy - currentSz * 0.35, currentSz * 0.3, currentSz * 0.15);

          // Right Arm
          ctx.beginPath();
          ctx.rect(item.pos.sx + currentSz * 0.7, item.pos.sy - currentSz * 0.4, currentSz * 0.5, currentSz * 0.3);
          ctx.fill();
          ctx.stroke();
          // Right Cannon barrel
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(item.pos.sx + currentSz * 1.1, item.pos.sy - currentSz * 0.35, currentSz * 0.3, currentSz * 0.15);

          // 4. Floating Vector Orb Head
          const headY = item.pos.sy - currentSz * 1.35;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.0 * scale;
          ctx.beginPath();
          ctx.arc(item.pos.sx, headY, currentSz * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Red horizontal cyclops visor eye scanning line
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
          ctx.lineWidth = 4.0 * scale;
          ctx.beginPath();
          ctx.moveTo(item.pos.sx - currentSz * 0.45, headY);
          ctx.lineTo(item.pos.sx + currentSz * 0.45, headY);
          ctx.stroke();

          // Glowing cyclops visor scan dot
          const scanOffset = Math.sin(timestamp * 0.01) * currentSz * 0.3;
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 6 * scale;
          ctx.beginPath();
          ctx.arc(item.pos.sx + scanOffset, headY, currentSz * 0.12, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0; // Reset shadow blur

          // 5. Billboard-Aligned Neon 3D Floating Health Bar
          const barWidth = currentSz * 3.2;
          const barHeight = 6 * scale;
          const barX = item.pos.sx - barWidth / 2;
          const barY = item.pos.sy - currentSz * 2.1;

          // Glowing violet frame outline & dark translucent backdrop
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.strokeStyle = '#a855f7'; // Violet neon outline
          ctx.lineWidth = 1.2 * scale;
          ctx.beginPath();
          ctx.roundRect(barX, barY, barWidth, barHeight, 2 * scale);
          ctx.fill();
          ctx.stroke();

          // Inner scaling HP meter (Pulsing Orange/Red gradient)
          const hpPercentage = Math.max(0, Math.min(1.0, item.bot.health / 100));
          const fillWidth = barWidth * hpPercentage;
          const hpGrad = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
          hpGrad.addColorStop(0, '#ef4444'); // Red
          hpGrad.addColorStop(1, '#f97316'); // Orange
          ctx.fillStyle = hpGrad;
          ctx.beginPath();
          ctx.roundRect(barX + 1, barY + 1, Math.max(0, fillWidth - 2), Math.max(0, barHeight - 2), 1 * scale);
          ctx.fill();

          // Render Label Text above health bar
          ctx.fillStyle = '#f59e0b';
          ctx.font = `bold ${Math.max(8, 11 * scale)}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(item.bot.name, item.pos.sx, barY - 6 * scale);
        } 
        
        else if (item.type === 'opponent') {
          const sz = Math.max(8, 16000 / item.zDepth);

          // 1. Hover Engine Thruster (Cyan)
          ctx.fillStyle = 'rgba(6, 182, 212, 0.4)'; // Cyan fill
          ctx.strokeStyle = '#06b6d4'; // Cyan stroke
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(item.pos.sx - sz * 0.4, item.pos.sy + sz * 0.2);
          ctx.lineTo(item.pos.sx + sz * 0.4, item.pos.sy + sz * 0.2);
          ctx.lineTo(item.pos.sx, item.pos.sy + sz * 0.9);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Thruster fire glow
          ctx.fillStyle = '#22d3ee';
          ctx.beginPath();
          ctx.arc(item.pos.sx, item.pos.sy + sz * 0.5, sz * 0.25 * (1.0 + Math.sin(timestamp * 0.05) * 0.2), 0, Math.PI * 2);
          ctx.fill();

          // 2. Chassis/Torso (Glowing Blue Metallic Cylinder)
          ctx.fillStyle = 'rgba(30, 58, 138, 0.75)'; // Deep blue
          ctx.strokeStyle = '#3b82f6'; // Glowing blue neon stroke
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(item.pos.sx - sz * 0.7, item.pos.sy - sz * 0.7, sz * 1.4, sz * 1.0, sz * 0.3);
          ctx.fill();
          ctx.stroke();

          // Inner structural grid lines
          ctx.strokeStyle = 'rgba(96, 165, 250, 0.45)';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.roundRect(item.pos.sx - sz * 0.55, item.pos.sy - sz * 0.55, sz * 1.1, sz * 0.7, sz * 0.2);
          ctx.stroke();

          // 3. Left and Right Weapon Arms (Glowing blue with light blue cannons)
          ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
          ctx.strokeStyle = '#60a5fa'; // Light blue
          ctx.lineWidth = 2.0;

          // Left Arm
          ctx.beginPath();
          ctx.rect(item.pos.sx - sz * 1.2, item.pos.sy - sz * 0.4, sz * 0.5, sz * 0.3);
          ctx.fill();
          ctx.stroke();
          // Left Cannon
          ctx.fillStyle = '#60a5fa';
          ctx.fillRect(item.pos.sx - sz * 1.4, item.pos.sy - sz * 0.35, sz * 0.3, sz * 0.15);

          // Right Arm
          ctx.beginPath();
          ctx.rect(item.pos.sx + sz * 0.7, item.pos.sy - sz * 0.4, sz * 0.5, sz * 0.3);
          ctx.fill();
          ctx.stroke();
          // Right Cannon
          ctx.fillStyle = '#60a5fa';
          ctx.fillRect(item.pos.sx + sz * 1.1, item.pos.sy - sz * 0.35, sz * 0.3, sz * 0.15);

          // 4. Head Sphere
          const headY = item.pos.sy - sz * 1.35;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(item.pos.sx, headY, sz * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Blue horizontal visor scanning line
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
          ctx.lineWidth = 4.0;
          ctx.beginPath();
          ctx.moveTo(item.pos.sx - sz * 0.45, headY);
          ctx.lineTo(item.pos.sx + sz * 0.45, headY);
          ctx.stroke();

          // Visor Eye
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(item.pos.sx, headY, sz * 0.15, 0, Math.PI * 2);
          ctx.fill();

          // 5. Billboard-Aligned Neon 3D Floating Health Bar
          const barWidth = sz * 3.2;
          const barHeight = 6;
          const barX = item.pos.sx - barWidth / 2;
          const barY = item.pos.sy - sz * 2.1;

          // Glowing violet frame outline & dark translucent backdrop
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.strokeStyle = '#a855f7'; // Violet neon outline
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.roundRect(barX, barY, barWidth, barHeight, 2);
          ctx.fill();
          ctx.stroke();

          // Inner scaling HP meter (Emerald Green)
          const hpPercentage = Math.max(0, Math.min(1.0, item.health / 100));
          const fillWidth = barWidth * hpPercentage;
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.roundRect(barX + 1, barY + 1, Math.max(0, fillWidth - 2), Math.max(0, barHeight - 2), 1);
          ctx.fill();

          // Floating Nameplate
          ctx.fillStyle = '#60a5fa';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`🎮 ${item.username}`, item.pos.sx, barY - 6);
        } 
        
        else if (item.type === 'particle') {
          const sz = Math.max(2, 2400 / item.zDepth);
          ctx.fillStyle = item.color;
          ctx.globalAlpha = item.alpha;
          ctx.beginPath();
          ctx.arc(item.pos.sx, item.pos.sy, sz, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
        } 
        
        else if (item.type === 'tracer') {
          ctx.strokeStyle = item.color;
          ctx.lineWidth = Math.max(1, 120 / item.zDepth);
          ctx.beginPath();
          ctx.moveTo(item.p1.sx, item.p1.sy);
          ctx.lineTo(item.p2.sx, item.p2.sy);
          ctx.stroke();
        }
      });

      // 9. DRAW FIRST-PERSON WEAPON GUN MODEL WITH RECOIL AND SWAY ANIMATIONS
      if (!isDead) {
        ctx.save();
        
        const swayX = Math.sin(p.weaponSway) * 12;
        const swayY = Math.abs(Math.cos(p.weaponSway)) * 6;
        const recoilKick = p.recoil * 3;

        // Gun Center coordinates
        const gunX = centerX + 180 + swayX - recoilKick;
        const gunY = height - 50 + swayY + recoilKick * 1.5;

        // Draw futuristic glowing neon blaster
        // Gun barrel
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.moveTo(gunX - 70, gunY - 20);
        ctx.lineTo(gunX - 180, gunY - 50);
        ctx.lineTo(gunX - 170, gunY - 75);
        ctx.lineTo(gunX - 50, gunY - 45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing core chamber
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.fillRect(gunX - 110, gunY - 48, 45, 14);
        ctx.strokeRect(gunX - 110, gunY - 48, 45, 14);

        // Muzzle lasers nozzle
        ctx.fillStyle = '#d8b4fe';
        ctx.beginPath();
        ctx.arc(gunX - 175, gunY - 62, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 10. RENDER SCREEN DAMAGE/HEAL HITS FLASH EFFECTS OVERLAYS
      if (p.screenFlash.alpha > 0) {
        ctx.save();
        ctx.globalAlpha = p.screenFlash.alpha;
        ctx.fillStyle = p.screenFlash.type === 'damage' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)';
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        // Ease out flash alpha
        p.screenFlash.alpha = Math.max(0, p.screenFlash.alpha - 2.8 * dt);
      }

      // 10.5 RENDER SPAWN PROTECTION SHIELD OVERLAY
      const isProtected = Date.now() < (p.spawnProtectionUntil || 0);
      if (isProtected) {
        const remainingShield = Math.max(0, (p.spawnProtectionUntil - Date.now()) / 1000);
        ctx.save();
        
        // Draw a pulsing cyan vignette/border glow
        const pulse = 0.15 + Math.sin(timestamp * 0.006) * 0.05;
        const grad = ctx.createRadialGradient(centerX, centerY, height * 0.4, centerX, centerY, width * 0.7);
        grad.addColorStop(0, 'rgba(6, 182, 212, 0)');
        grad.addColorStop(1, `rgba(6, 182, 212, ${pulse})`);
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        
        // Draw elegant glowing text "🛡️ SHIELD ACTIVE: X.Xs"
        ctx.fillStyle = '#06b6d4';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 8;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`🛡️ SHIELD ACTIVE: ${remainingShield.toFixed(1)}s`, centerX, centerY + 80);
        
        ctx.restore();
      }

      // Update shield active React state periodically
      if (Math.floor(timestamp) % 8 === 0) {
        setShieldActive(isProtected);
      }

      // 11. DYNAMIC HUD LEADERBOARD UPDATES
      const syncLeaderboard = [];
      syncLeaderboard.push({ name: `${username} (You)`, score: p.score, type: 'user' });
      botsRef.current.forEach(bot => {
        syncLeaderboard.push({ name: bot.name, score: 0, type: 'bot' }); // Bots score placeholder
      });
      multiplayerPlayersRef.current.forEach((opp, name) => {
        syncLeaderboard.push({ name, score: opp.score, type: 'opponent' });
      });
      // Sort
      syncLeaderboard.sort((a, b) => b.score - a.score);
      setLeaderboard(syncLeaderboard.slice(0, 5));

      // Request next frame
      loopRef.current = requestAnimationFrame(render);
    };

    loopRef.current = requestAnimationFrame(render);
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (audioSynthRef.current) {
      audioSynthRef.current.setMute(nextMute);
    }
  };

  const handleLeaveRoom = () => {
    window.removeEventListener('deviceorientation', handleDeviceOrientation);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.warn("Could not exit fullscreen:", err));
    }
    if (loopRef.current) cancelAnimationFrame(loopRef.current);
    if (audioSynthRef.current) audioSynthRef.current.stop();
    if (channelRef.current && supabaseRef.current) {
      supabaseRef.current.removeChannel(channelRef.current);
    }
    onClose();
  };

  // Touch handlers for mobile Joystick
  const handleTouchStart = (e) => {
    if (isDead) return;
    const touch = e.touches[0];
    // Left half of screen runs the movement joystick
    if (touch.clientX < window.innerWidth / 2) {
      touchJoystickRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        active: true
      };
    } else {
      // Right half operates looking view
      touchLookRef.current = {
        lastX: touch.clientX,
        lastY: touch.clientY,
        active: true
      };
    }
  };

  const handleTouchMove = (e) => {
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touchJoystickRef.current.active && touch.clientX < window.innerWidth / 2) {
        touchJoystickRef.current.currentX = touch.clientX;
        touchJoystickRef.current.currentY = touch.clientY;
      } else if (touchLookRef.current.active && touch.clientX >= window.innerWidth / 2) {
        const tl = touchLookRef.current;
        const dx = touch.clientX - tl.lastX;
        const dy = touch.clientY - tl.lastY;
        
        playerRef.current.yaw += dx * 0.0075;
        playerRef.current.pitch = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, playerRef.current.pitch - dy * 0.0075));

        tl.lastX = touch.clientX;
        tl.lastY = touch.clientY;
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) {
      touchJoystickRef.current.active = false;
      touchLookRef.current.active = false;
    } else {
      // If one touch left, determine which one died
      let hasLeftTouch = false;
      let hasRightTouch = false;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].clientX < window.innerWidth / 2) hasLeftTouch = true;
        else hasRightTouch = true;
      }
      if (!hasLeftTouch) touchJoystickRef.current.active = false;
      if (!hasRightTouch) touchLookRef.current.active = false;
    }
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-slate-100 font-sans select-none overflow-hidden animate-fade-in">
      {/* Portrait Mode Warning Overlay */}
      {isMobile && isPortrait && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl text-center p-6 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-6 animate-bounce">
            <Compass className="w-10 h-10 text-violet-400 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <h2 className="text-xl font-black text-white tracking-wider mb-2 uppercase">⚔️ ROTATE DEVICE ⚔️</h2>
          <p className="text-sm text-slate-300 max-w-xs leading-relaxed">
            Please rotate your device to <span className="text-violet-400 font-bold">Landscape mode</span> to enter the Cyber-Arena fighting grounds.
          </p>
          <div className="mt-8 flex items-center justify-center">
            {/* Rotating device visual */}
            <div className="w-10 h-16 border-2 border-slate-500 rounded-lg relative flex items-center justify-center" style={{ transform: 'rotate(0deg)', animation: 'rotateLandscape 2.5s ease-in-out infinite' }}>
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full absolute bottom-1" />
              <span className="text-[8px] text-slate-500 uppercase tracking-widest font-black rotate-90">GO!</span>
            </div>
          </div>
          <style jsx global>{`
            @keyframes rotateLandscape {
              0%, 10% { transform: rotate(0deg); }
              40%, 60% { transform: rotate(-90deg); }
              90%, 100% { transform: rotate(0deg); }
            }
          `}</style>
        </div>
      )}

      {!isPlaying ? (
        // Start/Lobby Screen
        <div className="max-w-md w-full mx-4 p-8 rounded-3xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center text-center animate-scale-up">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-lg shadow-violet-500/25 flex items-center justify-center mb-5 border border-white/10 shrink-0">
            <Swords className="h-8 w-8 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2 uppercase">Cyber-Arena Room</h2>
          <p className="text-xs text-slate-400 mb-6 max-w-xs leading-relaxed">
            Enter the 3D grid vector shooting grounds. Fight autonomous security bots, gather glowing nanomed kits, and battle your connected chat roommates in real-time!
          </p>

          <div className="w-full space-y-3 mb-8 text-left border-y border-slate-800/80 py-4.5">
            <div className="flex items-center gap-3.5">
              <Compass className="w-5 h-5 text-violet-400" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Controls Mode</h4>
                <p className="text-[10px] text-slate-400">Desktop: W/A/S/D + Mouse Drag + Space. Mobile: Touch Buttons + Joysticks.</p>
              </div>
            </div>
            <div className="flex items-center gap-3.5">
              <Users className="w-5 h-5 text-indigo-400" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Candidates Sync</h4>
                <p className="text-[10px] text-slate-400">Low-latency Supabase Broadcast syncs players, shoots, and health bars instantly.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 w-full">
            <button 
              onClick={handleLeaveRoom}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all cursor-pointer font-bold text-xs active:scale-97"
            >
              Cancel
            </button>
            <button 
              onClick={startGame}
              className="flex-2 py-3 px-5 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-500/10 hover:shadow-violet-500/25 active:scale-97 transition-all cursor-pointer font-extrabold text-xs flex items-center justify-center gap-1.5"
            >
              <Play className="w-4 h-4 fill-current" /> Join Arena
            </button>
          </div>
        </div>
      ) : (
        // Main FPS Arena HUD & Canvas Screen
        <div 
          className="relative w-full h-full"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Main 3D projection Canvas */}
          <canvas 
            ref={canvasRef}
            onClick={requestPointerLock}
            onMouseDown={(e) => {
              if (document.pointerLockElement === canvasRef.current && !showExitConfirmRef.current) {
                triggerWeaponFire();
              }
            }}
            className="w-full h-full block cursor-crosshair"
          />

          {/* Desktop pointer lock instructions overlay */}
          {!isMobile && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-950/70 border border-slate-800 px-4 py-2 rounded-2xl backdrop-blur-md pointer-events-none text-center">
              <p className="text-[10px] text-slate-400 leading-tight">Click screen to Lock Cursor & Look around | Press <span className="text-violet-400 font-bold uppercase">ESC</span> to release mouse</p>
            </div>
          )}

          {/* HUD Elements: Header (Health, Score, Controls) */}
          <div className="absolute inset-x-0 top-0 p-4 pointer-events-none flex items-start justify-between">
            {/* Top Left: Health & Ammo stats */}
            <div className="space-y-2.5">
              <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-2xl backdrop-blur-md flex items-center gap-3">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${shieldActive ? 'bg-cyan-500/10 border border-cyan-500/30 animate-pulse' : 'bg-rose-500/10 border border-rose-500/20'}`}>
                  {shieldActive ? (
                    <Compass className="w-5 h-5 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
                  ) : (
                    <Activity className="w-5 h-5 text-rose-500" />
                  )}
                </div>
                <div>
                  <p className="text-3xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                    {shieldActive ? <span className="text-cyan-400 font-bold">🛡️ SHIELD ACTIVE</span> : 'Candidate Core HP'}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-black transition-colors duration-300 ${shieldActive ? 'text-cyan-400' : 'text-white'}`}>{health}</span>
                    <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden shrink-0">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${shieldActive ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-rose-500'}`}
                        style={{ width: `${health}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-2xl backdrop-blur-md flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <Crosshair className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <p className="text-3xs uppercase tracking-wider text-slate-400 font-bold">Charge Core Ammo</p>
                  <p className="text-base font-black text-white leading-none">{ammo} <span className="text-3xs text-slate-400 font-normal">/ 30</span></p>
                </div>
              </div>
            </div>

            {/* Top Right: Leaderboard */}
            <div className="bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-2xl backdrop-blur-md min-w-[150px]">
              <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-1.5 mb-2 shrink-0">
                <Award className="w-4 h-4 text-violet-400" />
                <span className="text-2xs uppercase tracking-wider font-extrabold text-slate-300">Score Board</span>
              </div>
              <div className="space-y-1.5">
                {leaderboard.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-3xs font-medium">
                    <span className={`truncate max-w-[100px] ${item.type === 'user' ? 'text-violet-400 font-extrabold' : 'text-slate-300'}`}>{item.name}</span>
                    <span className="font-extrabold text-slate-400">{item.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Kill Feed overlay */}
          <div className="absolute right-4 top-36 p-2 pointer-events-none flex flex-col gap-1 text-right">
            {killFeed.map((feed) => (
              <div key={feed.id} className="text-3xs bg-slate-950/50 px-2.5 py-1 rounded-lg border border-slate-900 backdrop-blur-sm text-slate-400 inline-block max-w-full">
                <span className="text-red-400 font-bold">{feed.attacker}</span> zapped <span className="text-violet-400 font-bold">{feed.victim}</span>
              </div>
            ))}
          </div>

          {/* Center Crosshair */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative">
              {/* Dot */}
              <div className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
              {/* Reticles */}
              <div className="absolute -left-3.5 top-0.5 w-2 h-0.5 bg-violet-500/80" />
              <div className="absolute -right-3.5 top-0.5 w-2 h-0.5 bg-violet-500/80" />
              <div className="absolute left-0.5 -top-3.5 w-0.5 h-2 bg-violet-500/80" />
              <div className="absolute left-0.5 -bottom-3.5 w-0.5 h-2 bg-violet-500/80" />
            </div>
          </div>

          {/* HUD controls footer action overlay buttons */}
          <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between pointer-events-none">
            {/* Left Action: Mobile Joystick Zone */}
            <div className="pointer-events-auto">
              {isMobile && (
                <div 
                  className="w-28 h-28 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm flex items-center justify-center relative touch-none"
                  style={{ touchAction: 'none' }}
                >
                  {/* Joystick base stick */}
                  <div 
                    className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 border border-white/20 shadow-lg absolute transition-all duration-75"
                    style={{
                      transform: touchJoystickRef.current.active
                        ? `translate(${Math.max(-30, Math.min(30, touchJoystickRef.current.currentX - touchJoystickRef.current.startX))}px, ${Math.max(-30, Math.min(30, touchJoystickRef.current.currentY - touchJoystickRef.current.startY))}px)`
                        : 'translate(0, 0)'
                    }}
                  />
                  <span className="text-4xs text-slate-500 uppercase tracking-widest pointer-events-none font-bold absolute bottom-2">Move</span>
                </div>
              )}
            </div>

            {/* Middle Action: Desktop Instructions (Escape help) */}
            <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-2xl backdrop-blur-md flex items-center gap-4 pointer-events-auto shrink-0 shadow-lg">
              <button 
                onClick={toggleMute}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer transition-all active:scale-95 shadow-sm"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-violet-400" />}
              </button>
              <button 
                onClick={handleLeaveRoom}
                className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white cursor-pointer transition-all active:scale-95 flex items-center gap-1 text-2xs font-extrabold shadow-sm"
              >
                Leave Room <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right Action: Mobile Fire, Jump & Reload buttons */}
            <div className="pointer-events-auto flex items-center gap-4.5">
              {isMobile && (
                <>
                  {/* Reload Button - glowing orange capsule */}
                  <button 
                    onTouchStart={(e) => {
                      e.preventDefault();
                      triggerManualReload();
                    }}
                    className="px-5 py-3.5 rounded-full bg-amber-600/25 border border-amber-500/40 text-amber-300 flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.15)] active:scale-90 active:bg-amber-500/50 transition-all font-bold text-3xs uppercase tracking-widest cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reload
                  </button>

                  {/* Jump Button - cyan glowing ring */}
                  <button 
                    onTouchStart={(e) => {
                      e.preventDefault();
                      if (playerRef.current.onGround) {
                        playerRef.current.velY = 4.2;
                        playerRef.current.onGround = false;
                        if (audioSynthRef.current) audioSynthRef.current.playJump();
                      }
                    }}
                    className="w-14 h-14 rounded-full bg-cyan-600/20 border-2 border-cyan-400/55 text-cyan-200 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.25)] active:scale-90 active:bg-cyan-500/45 transition-all font-black text-3xs uppercase tracking-widest cursor-pointer"
                  >
                    Jump
                  </button>

                  {/* Fire Button - massive pulsing neon red circle */}
                  <button 
                    onTouchStart={(e) => {
                      e.preventDefault();
                      triggerWeaponFire();
                    }}
                    className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 border border-rose-455/40 text-white flex flex-col items-center justify-center shadow-[0_0_22px_rgba(244,63,94,0.45)] active:scale-90 active:from-rose-500 active:to-red-400 transition-all font-black text-xs uppercase tracking-widest animate-pulse cursor-pointer"
                    style={{ animationDuration: '2s' }}
                  >
                    Fire
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Pause/Exit confirmation overlay Screen */}
          {showExitConfirm && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center text-center animate-fade-in p-6 z-50">
              <div className="max-w-md w-full p-8 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl flex flex-col items-center justify-center animate-scale-up">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mb-4.5 animate-pulse">
                  <ShieldAlert className="w-7 h-7 text-amber-500 animate-pulse" />
                </div>
                <h3 className="text-xl font-extrabold tracking-tight text-white mb-1 uppercase">Arena Paused</h3>
                <p className="text-xs text-slate-400 mb-6 max-w-xs leading-relaxed">
                  Your simulation is paused. Would you like to resume fighting or exit the game back to the lobby?
                </p>
                <div className="flex items-center gap-3.5 w-full">
                  <button 
                    onClick={handleLeaveRoom}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all cursor-pointer font-bold text-xs active:scale-97"
                  >
                    Exit Game
                  </button>
                  <button 
                    onClick={() => {
                      setShowExitConfirm(false);
                      // Re-request pointer lock
                      setTimeout(() => {
                        requestPointerLock();
                      }, 150);
                    }}
                    className="flex-2 py-3 px-5 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-500/10 hover:shadow-violet-500/25 active:scale-97 transition-all cursor-pointer font-extrabold text-xs flex items-center justify-center gap-1.5"
                  >
                    Resume Game
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Death/Respawn overlay Screen */}
          {isDead && (
            <div className="absolute inset-0 bg-rose-950/75 backdrop-blur-md flex flex-col items-center justify-center text-center animate-fade-in p-6 z-40">
              <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center mb-4.5 animate-bounce">
                <ShieldAlert className="w-7 h-7 text-rose-500" />
              </div>
              <h3 className="text-xl font-extrabold tracking-tight text-white mb-1 uppercase">Candidate Eliminated!</h3>
              <p className="text-xs text-rose-300/80 mb-6 font-medium max-w-xs leading-relaxed">
                Core energy depleted. You have been zapped in the cyber-arena. Prepare to respawn back into the map!
              </p>
              <button 
                onClick={handleRespawn}
                className="py-3 px-6 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-xl shadow-rose-500/25 active:scale-95 transition-all cursor-pointer font-black text-xs uppercase tracking-widest flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" /> Re-spawn Core
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
