// src/utils/audio.js
// Procedural Sound Generator using Web Audio API for ChronoSync.

let audioCtx = null;
let isMuted = false;
let bgMusicInterval = null;
let bgMusicStep = 0;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // Start background music loop when context is created
    setTimeout(() => {
      startBackgroundMusic();
    }, 100);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => {
      startBackgroundMusic();
    });
  }
  return audioCtx;
}

export function setMute(muteState) {
  isMuted = muteState;
  if (audioCtx && isMuted) {
    audioCtx.suspend();
    stopBackgroundMusic();
  } else if (audioCtx && !isMuted) {
    audioCtx.resume().then(() => {
      startBackgroundMusic();
    });
  }
}

// 1. Time-Drone Ambient Music Synthesizer
export function startBackgroundMusic() {
  if (isMuted) return;
  if (bgMusicInterval) return; // Already running

  try {
    const ctx = getAudioContext();
    // D Minor Pentatonic Scale
    const notes = [146.83, 164.81, 196.00, 220.00, 293.66]; // D3, E3, G3, A3, D4

    const playStep = () => {
      if (isMuted || ctx.state === 'suspended') return;
      const now = ctx.currentTime;

      // 1. Sub-Bass Time Hum (plays every 8 steps)
      if (bgMusicStep % 8 === 0) {
        const oscBass = ctx.createOscillator();
        const gainBass = ctx.createGain();
        const lpFilter = ctx.createBiquadFilter();

        oscBass.type = 'sawtooth';
        oscBass.frequency.setValueAtTime(73.42, now); // D2 bass note

        lpFilter.type = 'lowpass';
        lpFilter.frequency.setValueAtTime(120, now); // Warm low pass hum

        gainBass.gain.setValueAtTime(0, now);
        gainBass.gain.linearRampToValueAtTime(0.04, now + 0.6); // Slow fade-in
        gainBass.gain.exponentialRampToValueAtTime(0.001, now + 3.4); // Fade-out

        oscBass.connect(lpFilter);
        lpFilter.connect(gainBass);
        gainBass.connect(ctx.destination);

        oscBass.start(now);
        oscBass.stop(now + 3.5);
      }

      // 2. Cosmic Pulsing Arpeggiator (plays on even steps)
      if (bgMusicStep % 2 === 0) {
        const oscArp = ctx.createOscillator();
        const gainArp = ctx.createGain();
        const delay = ctx.createDelay();
        const delayGain = ctx.createGain();

        oscArp.type = 'sine';
        // Pick a semi-random note in pentatonic scale
        const noteIndex = (bgMusicStep * 2) % notes.length;
        const multiplier = bgMusicStep % 4 === 0 ? 1 : 2; // Octave alternation
        oscArp.frequency.setValueAtTime(notes[noteIndex] * multiplier, now);

        gainArp.gain.setValueAtTime(0.02, now);
        gainArp.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        // Add soft echo/delay effect
        delay.delayTime.value = 0.2;
        delayGain.gain.value = 0.3; // Echo feedback

        oscArp.connect(gainArp);
        gainArp.connect(ctx.destination);

        // Feedback loop for delay echo
        gainArp.connect(delay);
        delay.connect(delayGain);
        delayGain.connect(ctx.destination);

        oscArp.start(now);
        oscArp.stop(now + 0.45);
      }

      bgMusicStep++;
    };

    bgMusicInterval = setInterval(playStep, 380); // Speed of loop
  } catch (e) {
    console.warn("Background music start failed:", e);
  }
}

export function stopBackgroundMusic() {
  if (bgMusicInterval) {
    clearInterval(bgMusicInterval);
    bgMusicInterval = null;
  }
}

// 2. Particle Move / Thrust Sound
export function playMove() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    console.warn("Audio play failed:", e);
  }
}

// 3. Switch Activated / Electronic Click
export function playSwitch() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.setValueAtTime(400, ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.warn("Audio play failed:", e);
  }
}

// 4. Time-Loop Reset / Reverse Sweep
export function playReset() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.35);
    
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.warn("Audio play failed:", e);
  }
}

// 5. Level Completed / Sci-Fi Chord
export function playLevelUp() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.1, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.4);
    });
  } catch (e) {
    console.warn("Audio play failed:", e);
  }
}

// 6. Laser Hit / Explode Sound
export function playExplosion() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    
    const bufferSize = ctx.sampleRate * 0.25; // 0.25s
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.25);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    
    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noiseNode.start();
    noiseNode.stop(ctx.currentTime + 0.25);
  } catch (e) {
    console.warn("Audio play failed:", e);
  }
}
