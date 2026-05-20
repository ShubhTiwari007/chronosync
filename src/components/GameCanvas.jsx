// src/components/GameCanvas.jsx
import React, { useRef, useEffect, useState } from 'react';
import { playMove, playSwitch, playReset, playLevelUp, playExplosion } from '../utils/audio';

function GameCanvas({ level, onLevelClear, onGameOver, onQuit }) {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  // Power indicator bar hooks
  const [powerWidth, setPowerWidth] = useState('0%');
  const [powerVisible, setPowerVisible] = useState(false);

  // Keep all state in a ref to avoid React state lag during requestAnimationFrame ticks
  const stateRef = useRef({
    // Core game parameters
    player: { x: 0.15, y: 0.5, vx: 0, vy: 0, radius: 12, active: false },
    echoes: [], // Array of objects: { history: [{x, y, active}], index: 0, x: 0.15, y: 0.5, active: false }
    currentHistory: [], // Log of current player path: [{x, y, active}]
    
    // Level items (will be populated based on level)
    switches: [],   // { x, y, radius, pressed: false }
    gates: [],      // { x, y, w, h, switchIndex, open: false }
    lasers: [],     // { x1, y1, x2, y2, active: true }
    destination: { x: 0.85, y: 0.5, radius: 20 },
    
    // Loop control
    loopTime: 0,
    maxLoopFrames: 900, // 15 seconds at 60 FPS
    activeEchoCount: 0,
    
    // Physics / Interaction states
    dragStart: null,
    dragCurrent: null,
    isDragging: false,
    particles: [], // Neon particle explosions
    shake: 0,
    clearPending: false
  });

  const generateLevel = (lvl) => {
    const state = stateRef.current;
    state.player = { x: 0.15, y: 0.5, vx: 0, vy: 0, radius: 12, active: false };
    state.echoes = [];
    state.currentHistory = [];
    state.loopTime = 0;
    state.particles = [];
    state.shake = 0;
    state.clearPending = false;

    // Default portal destination
    state.destination = { x: 0.85, y: 0.5, radius: 22 };

    // Reset switches & gates
    state.switches = [];
    state.gates = [];
    state.lasers = [];

    // Define level properties (represented as relative coordinates 0.0 to 1.0)
    switch(lvl) {
      case 1:
        // Tutorial: Simple switch and gate
        state.switches.push({ x: 0.45, y: 0.8, radius: 18, pressed: false });
        state.gates.push({ x: 0.5, y: 0.2, w: 0.04, h: 0.4, switchIndex: 0, open: false });
        break;

      case 2:
        // Double Sync: Two switches controlling one gate
        state.switches.push({ x: 0.35, y: 0.25, radius: 18, pressed: false });
        state.switches.push({ x: 0.55, y: 0.75, radius: 18, pressed: false });
        // Gate requires BOTH switches (handled in updates)
        state.gates.push({ x: 0.65, y: 0.3, w: 0.04, h: 0.4, switchIndex: -1, open: false }); // -1 for custom logic
        break;

      case 3:
        // Laser Maze: Obstacle lasers that block direct paths
        state.switches.push({ x: 0.5, y: 0.18, radius: 18, pressed: false });
        state.gates.push({ x: 0.75, y: 0.4, w: 0.04, h: 0.35, switchIndex: 0, open: false });
        // Decorative / obstacle lasers
        state.lasers.push({ x1: 0.3, y1: 0.0, x2: 0.3, y2: 0.65 });
        state.lasers.push({ x1: 0.6, y1: 0.35, x2: 0.6, y2: 1.0 });
        break;

      case 4:
        // Chrono Speedrun: Fast switch timing
        state.switches.push({ x: 0.4, y: 0.8, radius: 18, pressed: false });
        state.switches.push({ x: 0.7, y: 0.2, radius: 18, pressed: false });
        state.gates.push({ x: 0.5, y: 0.0, w: 0.04, h: 0.55, switchIndex: 0, open: false });
        state.gates.push({ x: 0.8, y: 0.4, w: 0.04, h: 0.6, switchIndex: 1, open: false });
        state.lasers.push({ x1: 0.3, y1: 0.3, x2: 0.7, y2: 0.3 });
        break;

      case 5:
        // The Triple Gate: 3 Echoes coordination
        state.switches.push({ x: 0.3, y: 0.8, radius: 18, pressed: false });
        state.switches.push({ x: 0.5, y: 0.2, radius: 18, pressed: false });
        state.switches.push({ x: 0.7, y: 0.8, radius: 18, pressed: false });
        state.gates.push({ x: 0.4, y: 0.0, w: 0.04, h: 0.45, switchIndex: 0, open: false });
        state.gates.push({ x: 0.6, y: 0.55, w: 0.04, h: 0.45, switchIndex: 1, open: false });
        state.gates.push({ x: 0.8, y: 0.25, w: 0.04, h: 0.5, switchIndex: 2, open: false });
        break;

      case 6:
        // Cross Laser Grid
        state.switches.push({ x: 0.5, y: 0.5, radius: 18, pressed: false });
        state.gates.push({ x: 0.75, y: 0.1, w: 0.04, h: 0.8, switchIndex: 0, open: false });
        state.lasers.push({ x1: 0.2, y1: 0.2, x2: 0.8, y2: 0.2 });
        state.lasers.push({ x1: 0.2, y1: 0.8, x2: 0.8, y2: 0.8 });
        break;

      case 7:
        // Pressure Timing: Gate closes fast when off switch
        state.switches.push({ x: 0.35, y: 0.8, radius: 18, pressed: false });
        state.switches.push({ x: 0.6, y: 0.2, radius: 18, pressed: false });
        state.gates.push({ x: 0.45, y: 0.2, w: 0.04, h: 0.5, switchIndex: 0, open: false });
        state.gates.push({ x: 0.7, y: 0.3, w: 0.04, h: 0.5, switchIndex: 1, open: false });
        break;

      case 8:
        // Laser Hallways
        state.switches.push({ x: 0.45, y: 0.15, radius: 18, pressed: false });
        state.switches.push({ x: 0.65, y: 0.85, radius: 18, pressed: false });
        state.gates.push({ x: 0.55, y: 0.25, w: 0.04, h: 0.5, switchIndex: 0, open: false });
        state.gates.push({ x: 0.78, y: 0.25, w: 0.04, h: 0.5, switchIndex: 1, open: false });
        state.lasers.push({ x1: 0.25, y1: 0.0, x2: 0.25, y2: 0.75 });
        state.lasers.push({ x1: 0.85, y1: 0.25, x2: 0.85, y2: 1.0 });
        break;

      case 9:
        // Complex coordination
        state.switches.push({ x: 0.3, y: 0.2, radius: 18, pressed: false });
        state.switches.push({ x: 0.4, y: 0.8, radius: 18, pressed: false });
        state.switches.push({ x: 0.7, y: 0.5, radius: 18, pressed: false });
        state.gates.push({ x: 0.5, y: 0.3, w: 0.04, h: 0.4, switchIndex: 0, open: false });
        state.gates.push({ x: 0.6, y: 0.0, w: 0.04, h: 0.4, switchIndex: 1, open: false });
        state.gates.push({ x: 0.8, y: 0.6, w: 0.04, h: 0.4, switchIndex: 2, open: false });
        break;

      case 10:
        // The Final Sync: 4 simultaneous switches required
        state.switches.push({ x: 0.3, y: 0.2, radius: 18, pressed: false });
        state.switches.push({ x: 0.3, y: 0.8, radius: 18, pressed: false });
        state.switches.push({ x: 0.6, y: 0.2, radius: 18, pressed: false });
        state.switches.push({ x: 0.6, y: 0.8, radius: 18, pressed: false });
        state.gates.push({ x: 0.75, y: 0.2, w: 0.05, h: 0.6, switchIndex: -2, open: false }); // -2 custom (all 4 switches)
        break;

      default:
        state.switches.push({ x: 0.5, y: 0.5, radius: 18, pressed: false });
        state.gates.push({ x: 0.7, y: 0.3, w: 0.04, h: 0.4, switchIndex: 0, open: false });
        break;
    }
  };

  const burstParticles = (x, y, color, count) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      stateRef.current.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 1.0,
        decay: Math.random() * 0.03 + 0.015
      });
    }
  };

  // Perform time sync loop reset
  const handleSyncReset = (forceExplode = false) => {
    const state = stateRef.current;
    if (state.clearPending) return;

    playReset();
    state.shake = 12;

    // Convert current run history to a new Echo loop if we launched
    if (state.currentHistory.length > 10 && state.echoes.length < 3) {
      state.echoes.push({
        history: [...state.currentHistory],
        index: 0,
        x: 0.15,
        y: 0.5,
        active: false
      });
    }

    // Reset player position and state
    state.player = { x: 0.15, y: 0.5, vx: 0, vy: 0, radius: 12, active: false };
    state.currentHistory = [];
    state.loopTime = 0;
    
    // Reset Echo playback heads
    state.echoes.forEach(echo => {
      echo.index = 0;
      echo.active = false;
      echo.x = 0.15;
      echo.y = 0.5;
    });

    if (forceExplode) {
      playExplosion();
    }
  };

  const lineIntersectsCircle = (p1, p2, circle, r) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return false;

    // Projection of circle center onto segment
    const u = ((circle.x - p1.x) * dx + (circle.y - p1.y) * dy) / (len * len);
    const clampU = Math.max(0, Math.min(1, u));
    
    const projX = p1.x + clampU * dx;
    const projY = p1.y + clampU * dy;

    const d = Math.hypot(circle.x - projX, circle.y - projY);
    return d <= r;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = Math.max(500, window.innerHeight - 80); // leave room for dashboard UI
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    generateLevel(level);

    const runFrame = () => {
      const state = stateRef.current;
      const W = canvas.width;
      const H = canvas.height;

      // 1. Particle math & logic updates
      // Increment loops
      state.loopTime++;
      if (state.loopTime >= state.maxLoopFrames) {
        handleSyncReset();
      }

      // Check switches
      state.switches.forEach((sw, idx) => {
        let isPressed = false;
        
        // Is player pressing it?
        const dPlayer = Math.hypot(state.player.x * W - sw.x * W, state.player.y * H - sw.y * H);
        if (dPlayer <= (state.player.radius + sw.radius)) {
          isPressed = true;
        }

        // Are any Echoes pressing it?
        state.echoes.forEach(echo => {
          if (echo.active) {
            const dEcho = Math.hypot(echo.x * W - sw.x * W, echo.y * H - sw.y * H);
            if (dEcho <= (state.player.radius + sw.radius)) {
              isPressed = true;
            }
          }
        });

        if (isPressed && !sw.pressed) {
          playSwitch();
          burstParticles(sw.x * W, sw.y * H, '#00ff87', 8);
        }
        sw.pressed = isPressed;
      });

      // Update security gates
      state.gates.forEach(gate => {
        if (gate.switchIndex >= 0) {
          // Normal gate opens if switch is pressed
          gate.open = state.switches[gate.switchIndex]?.pressed || false;
        } else if (gate.switchIndex === -1) {
          // Level 2 special: BOTH switches required
          gate.open = state.switches[0]?.pressed && state.switches[1]?.pressed;
        } else if (gate.switchIndex === -2) {
          // Level 10 special: ALL 4 switches required
          gate.open = state.switches.every(sw => sw.pressed);
        }
      });

      // Update Player physics
      if (state.player.active && !state.clearPending) {
        // Apply friction
        state.player.vx *= 0.992;
        state.player.vy *= 0.992;

        state.player.x += state.player.vx / W;
        state.player.y += state.player.vy / H;

        // Log history frame
        state.currentHistory.push({
          x: state.player.x,
          y: state.player.y,
          active: true
        });

        // Boundary walls collision
        const pR = state.player.radius;
        if (state.player.x * W < pR) { state.player.x = pR / W; state.player.vx *= -0.7; state.shake = 4; }
        if (state.player.x * W > W - pR) { state.player.x = (W - pR) / W; state.player.vx *= -0.7; state.shake = 4; }
        if (state.player.y * H < pR) { state.player.y = pR / H; state.player.vy *= -0.7; state.shake = 4; }
        if (state.player.y * H > H - pR) { state.player.y = (H - pR) / H; state.player.vy *= -0.7; state.shake = 4; }

        // Laser collisions (Check player)
        state.lasers.forEach(laser => {
          const l1 = { x: laser.x1 * W, y: laser.y1 * H };
          const l2 = { x: laser.x2 * W, y: laser.y2 * H };
          const pl = { x: state.player.x * W, y: state.player.y * H };
          if (lineIntersectsCircle(l1, l2, pl, state.player.radius)) {
            burstParticles(pl.x, pl.y, '#ff0055', 25);
            handleSyncReset(true);
          }
        });

        // Closed gates collision (Check player)
        state.gates.forEach(gate => {
          if (!gate.open) {
            const gX = gate.x * W;
            const gY = gate.y * H;
            const gW = gate.w * W;
            const gH = gate.h * H;
            const pX = state.player.x * W;
            const pY = state.player.y * H;
            const r = state.player.radius;

            // Simple box circle overlap
            const closestX = Math.max(gX, Math.min(pX, gX + gW));
            const closestY = Math.max(gY, Math.min(pY, gY + gH));
            const d = Math.hypot(pX - closestX, pY - closestY);

            if (d < r) {
              // Rebound physics
              const midX = gX + gW / 2;
              const midY = gY + gH / 2;
              if (Math.abs(pX - midX) > Math.abs(pY - midY)) {
                state.player.vx *= -0.7;
                state.player.x = pX > midX ? (gX + gW + r + 2) / W : (gX - r - 2) / W;
              } else {
                state.player.vy *= -0.7;
                state.player.y = pY > midY ? (gY + gH + r + 2) / H : (gY - r - 2) / H;
              }
              state.shake = 5;
              playMove();
            }
          }
        });

        // Portal check
        const dDest = Math.hypot(state.player.x * W - state.destination.x * W, state.player.y * H - state.destination.y * H);
        if (dDest < (state.player.radius + state.destination.radius)) {
          // LEVEL COMPLETE!
          state.clearPending = true;
          playLevelUp();
          burstParticles(state.destination.x * W, state.destination.y * H, '#00ff87', 40);
          setTimeout(() => {
            onLevelClear();
          }, 1200);
        }
      } else if (!state.player.active) {
        // Log stationary position
        state.currentHistory.push({
          x: state.player.x,
          y: state.player.y,
          active: false
        });
      }

      // Playback Echoes
      state.echoes.forEach(echo => {
        if (echo.index < echo.history.length) {
          const frame = echo.history[echo.index];
          echo.x = frame.x;
          echo.y = frame.y;
          echo.active = frame.active;
          echo.index++;
        } else {
          echo.active = false;
        }
      });

      // 2. Rendering operations
      ctx.save();
      // Screen shake transform
      if (state.shake > 0.1) {
        const sx = (Math.random() - 0.5) * state.shake;
        const sy = (Math.random() - 0.5) * state.shake;
        ctx.translate(sx, sy);
        state.shake *= 0.88;
      }

      // Draw cyber space background
      ctx.fillStyle = '#020108';
      ctx.fillRect(0, 0, W, H);

      // Parallax warp background lines
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.02)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const grid = 60;
      const driftX = (Date.now() * 0.015) % grid;
      const driftY = (Date.now() * 0.01) % grid;
      for (let x = driftX; x < W; x += grid) {
        ctx.moveTo(x, 0); ctx.lineTo(x, H);
      }
      for (let y = driftY; y < H; y += grid) {
        ctx.moveTo(0, y); ctx.lineTo(W, y);
      }
      ctx.stroke();

      // Scanline overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.008)';
      for (let y = 0; y < H; y += 4) {
        ctx.fillRect(0, y, W, 1);
      }

      // Draw Switches (3D Holographic Pads)
      state.switches.forEach(sw => {
        const x = sw.x * W;
        const y = sw.y * H;
        
        // Outer tech ring
        ctx.strokeStyle = sw.pressed ? '#00ff87' : 'rgba(0, 242, 254, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, sw.radius + 5, 0, Math.PI * 2);
        ctx.stroke();

        // 3D Pad casing
        ctx.fillStyle = '#111024';
        ctx.strokeStyle = sw.pressed ? '#00ff87' : '#00f2fe';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, y, sw.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Glowing center core indicator
        if (sw.pressed) {
          ctx.shadowColor = '#00ff87';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#00ff87';
        } else {
          ctx.fillStyle = 'rgba(0, 242, 254, 0.3)';
        }
        ctx.beginPath();
        ctx.arc(x, y, sw.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Security Gates (Glowing Holographic Forcefields)
      state.gates.forEach(gate => {
        const x = gate.x * W;
        const y = gate.y * H;
        const w = gate.w * W;
        const h = gate.h * H;

        ctx.save();
        if (gate.open) {
          ctx.strokeStyle = 'rgba(0, 255, 135, 0.15)';
          ctx.fillStyle = 'rgba(0, 255, 135, 0.02)';
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.rect(x, y, w, h);
          ctx.fill();
          ctx.stroke();
        } else {
          // Pulse intensity
          const pulse = 0.5 + 0.3 * Math.sin(Date.now() * 0.015);
          ctx.fillStyle = `rgba(255, 0, 127, ${0.08 + pulse * 0.06})`;
          ctx.fillRect(x, y, w, h);

          // Diagonal warning stripes inside
          ctx.strokeStyle = `rgba(255, 0, 127, ${0.1 + pulse * 0.15})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const stripeW = 8;
          for (let sx = x - h; sx < x + w; sx += stripeW) {
            ctx.moveTo(Math.max(x, sx), y);
            ctx.lineTo(Math.min(x + w, sx + h), y + h);
          }
          ctx.stroke();

          // Neon glowing border
          ctx.shadowColor = '#ff007f';
          ctx.shadowBlur = 10;
          ctx.strokeStyle = '#ff007f';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(x, y, w, h);
        }
        ctx.restore();
      });

      // Draw Lasers (obstructions - glowing double-layered lightning laser lines!)
      state.lasers.forEach(laser => {
        ctx.save();
        const lx1 = laser.x1 * W;
        const ly1 = laser.y1 * H;
        const lx2 = laser.x2 * W;
        const ly2 = laser.y2 * H;

        // Outer neon aura glow
        ctx.strokeStyle = 'rgba(255, 0, 85, 0.2)';
        ctx.lineWidth = 7.0;
        ctx.beginPath();
        ctx.moveTo(lx1, ly1); ctx.lineTo(lx2, ly2);
        ctx.stroke();

        // Laser core beam
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 3.0;
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(lx1, ly1); ctx.lineTo(lx2, ly2);
        ctx.stroke();

        // Specular highlight white center core line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.0;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(lx1, ly1); ctx.lineTo(lx2, ly2);
        ctx.stroke();

        // End emitter terminals
        ctx.fillStyle = '#1c1926';
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 1.5;
        const terminals = [[lx1, ly1], [lx2, ly2]];
        terminals.forEach(([tx, ty]) => {
          ctx.beginPath();
          ctx.arc(tx, ty, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });

        ctx.restore();
      });

      // Draw Destination Portal (Cyber event horizon gravity well)
      const destX = state.destination.x * W;
      const destY = state.destination.y * H;
      const destR = state.destination.radius;
      const pulseRadius = destR + Math.sin(state.loopTime * 0.08) * 3;

      ctx.save();
      ctx.shadowColor = '#00ff87';
      ctx.shadowBlur = 16;

      // Outer swirling aura
      ctx.fillStyle = 'rgba(0, 255, 135, 0.08)';
      ctx.beginPath();
      ctx.arc(destX, destY, pulseRadius + 6, 0, Math.PI * 2);
      ctx.fill();

      // Outer segmented rotating tech ring
      ctx.strokeStyle = '#00ff87';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(destX, destY, destR + 4, Date.now() * 0.003, Date.now() * 0.003 + Math.PI * 1.2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(destX, destY, destR + 4, Date.now() * -0.002 + Math.PI, Date.now() * -0.002 + Math.PI * 2.2);
      ctx.stroke();

      // Inner singularity
      ctx.fillStyle = '#00ff8 green';
      ctx.fillStyle = '#00ff87';
      ctx.beginPath();
      ctx.arc(destX, destY, destR * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Label inside singularity
      ctx.fillStyle = '#020108';
      ctx.font = 'bold 8px Orbitron';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("SYNC", destX, destY);
      ctx.restore();

      // Slingshot Aim Line
      if (state.isDragging && state.dragStart && state.dragCurrent) {
        const dx = state.dragStart.x - state.dragCurrent.x;
        const dy = state.dragStart.y - state.dragCurrent.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 10) {
          const power = Math.min(dist / 10, 15);
          const launchVx = (dx / dist) * power * 1.5;
          const launchVy = (dy / dist) * power * 1.5;

          // Draw predicted path using glowing dots
          ctx.save();
          let tempX = state.player.x * W;
          let tempY = state.player.y * H;
          let tempVx = launchVx;
          let tempVy = launchVy;

          for (let i = 0; i < 40; i++) {
            tempVx *= 0.992;
            tempVy *= 0.992;
            tempX += tempVx;
            tempY += tempVy;
            if (i % 2 === 0) {
              ctx.fillStyle = `rgba(0, 242, 254, ${1 - i / 40})`;
              ctx.beginPath();
              ctx.arc(tempX, tempY, 2.0, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.restore();

          // Vector indicator arrow
          ctx.save();
          ctx.shadowColor = '#00f2fe';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(state.player.x * W, state.player.y * H);
          ctx.lineTo(state.player.x * W + launchVx * 4, state.player.y * H + launchVy * 4);
          ctx.strokeStyle = '#00f2fe';
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.restore();
        }
      }

      // Draw Echo paths and core spheres (Holographic loops)
      state.echoes.forEach((echo, idx) => {
        if (echo.active) {
          const eX = echo.x * W;
          const eY = echo.y * H;

          ctx.save();
          // Echo pulse glow ring
          ctx.shadowColor = '#00ff87';
          ctx.shadowBlur = 12;
          ctx.fillStyle = 'rgba(0, 255, 135, 0.08)';
          ctx.beginPath();
          ctx.arc(eX, eY, state.player.radius + 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Holographic target brackets rotating
          ctx.strokeStyle = '#00ff87';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(eX, eY, state.player.radius + 6, Date.now() * 0.015, Date.now() * 0.015 + Math.PI * 0.5);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(eX, eY, state.player.radius + 6, Date.now() * 0.015 + Math.PI, Date.now() * 0.015 + Math.PI * 1.5);
          ctx.stroke();

          // Semi-transparent Echo core
          ctx.fillStyle = 'rgba(0, 255, 135, 0.45)';
          ctx.strokeStyle = '#00ff87';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(eX, eY, state.player.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Draw 'E' inside core
          ctx.fillStyle = '#03030a';
          ctx.font = 'bold 9px Orbitron';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`E${idx+1}`, eX, eY);
          ctx.restore();
        }
      });

      // Draw Current Player Core (Interactive glowing plasma ball)
      if (!state.clearPending) {
        const pX = state.player.x * W;
        const pY = state.player.y * H;

        ctx.save();
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 15;
        
        ctx.fillStyle = 'rgba(0, 242, 254, 0.15)';
        ctx.beginPath();
        ctx.arc(pX, pY, state.player.radius + 4, 0, Math.PI * 2);
        ctx.fill();

        // Concentric outer ring
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(pX, pY, state.player.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Bright white center core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pX, pY, state.player.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      }

      // Draw explosion particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        
        if (p.life <= 0) {
          state.particles.splice(i, 1);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      }

      // Loop progress time meter inside canvas
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(0, H - 4, W, 4);
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(0, H - 4, W * (state.loopTime / state.maxLoopFrames), 4);

      ctx.restore();
      requestRef.current = requestAnimationFrame(runFrame);
    };

    requestRef.current = requestAnimationFrame(runFrame);

    return () => {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [level]);

  // Touch Gesture Handlers
  const handleDown = (cx, cy) => {
    const state = stateRef.current;
    if (state.player.active || state.clearPending) return;

    const canvas = canvasRef.current;
    const clickPos = { x: cx, y: cy - canvas.getBoundingClientRect().top };

    const pX = state.player.x * canvas.width;
    const pY = state.player.y * canvas.height;
    
    if (Math.hypot(clickPos.x - pX, clickPos.y - pY) < 65) {
      state.isDragging = true;
      state.dragStart = clickPos;
      state.dragCurrent = clickPos;
      setPowerVisible(true);
    }
  };

  const handleMove = (cx, cy) => {
    const state = stateRef.current;
    if (!state.isDragging) return;

    const canvas = canvasRef.current;
    const movePos = { x: cx, y: cy - canvas.getBoundingClientRect().top };
    state.dragCurrent = movePos;

    const dx = state.dragStart.x - state.dragCurrent.x;
    const dy = state.dragStart.y - state.dragCurrent.y;
    const dist = Math.hypot(dx, dy);
    
    const power = Math.min(dist / 10, 15);
    setPowerWidth(`${(power / 15) * 100}%`);
  };

  const handleUp = () => {
    const state = stateRef.current;
    if (!state.isDragging) return;
    state.isDragging = false;
    setPowerVisible(false);

    const canvas = canvasRef.current;
    const dx = state.dragStart.x - state.dragCurrent.x;
    const dy = state.dragStart.y - state.dragCurrent.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 10) {
      const power = Math.min(dist / 10, 15);
      state.player.vx = (dx / dist) * power * 1.5;
      state.player.vy = (dy / dist) * power * 1.5;
      state.player.active = true;
      
      playMove();
      burstParticles(state.player.x * canvas.width, state.player.y * canvas.height, '#00f2fe', 8);
    }
  };

  // Setup Keyboard hooks for SPACE reset
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleSyncReset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* 1. Header indicators */}
      <div style={{ height: '50px', background: 'rgba(5, 5, 15, 0.9)', borderBottom: '1px solid rgba(0,242,254,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', fontFamily: 'Orbitron' }}>
        <div style={{ display: 'flex', gap: '15px', fontSize: '12px' }}>
          <div>SECTOR: <span style={{ color: '#00f2fe' }}>{level}</span></div>
          <div>ECHOES: <span style={{ color: '#00ff87' }}>{stateRef.current.echoes.length}/3</span></div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-cyber secondary" style={{ padding: '4px 12px', fontSize: '10px' }} onClick={() => handleSyncReset()}>SYNC LOOP</button>
          <button className="btn-cyber secondary" style={{ padding: '4px 12px', fontSize: '10px', borderColor: '#ff0055', color: '#ff0055' }} onClick={onQuit}>ABORT</button>
        </div>
      </div>

      {/* 2. Primary Canvas viewport */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={e => handleDown(e.clientX, e.clientY)}
          onMouseMove={e => handleMove(e.clientX, e.clientY)}
          onMouseUp={handleUp}
          onTouchStart={e => { const t = e.touches[0]; handleDown(t.clientX, t.clientY); }}
          onTouchMove={e => { const t = e.touches[0]; handleMove(t.clientX, t.clientY); }}
          onTouchEnd={handleUp}
          style={{ cursor: 'crosshair', display: 'block', width: '100%', height: '100%' }}
        />

        {/* Real-time power slingshot UI HUD */}
        <div 
          className={powerVisible ? 'visible' : ''}
          style={{
            position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
            pointerEvents: 'none', opacity: powerVisible ? 1 : 0, transition: 'opacity 0.2s', zIndex: 10
          }}
        >
          <div style={{ fontSize: '9px', letterSpacing: '2px', color: '#445577', textAlign: 'center', fontFamily: 'Orbitron' }}>LAUNCH METRIC</div>
          <div style={{ width: '150px', height: '4px', background: 'rgba(5,5,15,0.8)', border: '1px solid rgba(0,242,254,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: powerWidth, background: 'linear-gradient(90deg, #00f2fe, #00ff87)', borderRadius: '2px' }} />
          </div>
        </div>
      </div>

    </div>
  );
}

export default GameCanvas;
