// ─── Tactical Synthesized Sound Engine (Web Audio API) ───────────────────
// Zero external audio files required. Uses native Web Audio API oscillators,
// noise buffers, filters, and envelope shaping.
// Features separate ambient background music synthesis & tactical SFX.

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.musicEnabled = true;
    this.musicGain = null;
    this.musicNodes = [];
    this.musicTimer = null;
    this.isMusicPlaying = false;
    this.hasUserInteracted = false;

    // Auto-start music on first user gesture
    if (typeof window !== 'undefined') {
      const startOnGesture = () => {
        this.hasUserInteracted = true;
        this.init();
        if (this.musicEnabled && !this.isMusicPlaying) {
          this.startMusic();
        }
        window.removeEventListener('click', startOnGesture);
        window.removeEventListener('keydown', startOnGesture);
        window.removeEventListener('touchstart', startOnGesture);
      };
      window.addEventListener('click', startOnGesture, { once: true });
      window.addEventListener('keydown', startOnGesture, { once: true });
      window.addEventListener('touchstart', startOnGesture, { once: true });
    }
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // ── Music & SFX Controls ────────────────────────────────────────────────

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (enabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
    return this.musicEnabled;
  }

  toggleMusic() {
    return this.setMusicEnabled(!this.musicEnabled);
  }

  isMusicEnabled() {
    return this.musicEnabled;
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = enabled;
    return this.sfxEnabled;
  }

  toggleSfx() {
    this.sfxEnabled = !this.sfxEnabled;
    if (this.sfxEnabled) {
      this.playClick();
    }
    return this.sfxEnabled;
  }

  isSfxEnabled() {
    return this.sfxEnabled;
  }

  // Backward-compatible alias
  isMuted() {
    return !this.sfxEnabled && !this.musicEnabled;
  }

  toggleMute() {
    const next = !this.sfxEnabled;
    this.setSfxEnabled(next);
    this.setMusicEnabled(next);
    return !next;
  }

  // ── Ambient Background Music Synthesis ──────────────────────────────────
  // Gentle, atmospheric, post-apocalyptic ambient synth pad with a slow-breathing
  // low-pass filter and a hypnotic soft lo-fi sub pulse.
  startMusic() {
    if (!this.musicEnabled || this.isMusicPlaying) return;
    this.init();
    if (!this.ctx) return;

    try {
      this.stopMusic(); // Clean up previous if any

      const now = this.ctx.currentTime;
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.001, now);
      // Gentle fade-in over 3 seconds to a soft ambient volume (0.07)
      this.musicGain.gain.exponentialRampToValueAtTime(0.07, now + 3);
      this.musicGain.connect(this.ctx.destination);

      // Warm low-pass filter for the pad
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(340, now);
      filter.Q.setValueAtTime(2.2, now);
      filter.connect(this.musicGain);

      // Filter breathing LFO
      const filterLfo = this.ctx.createOscillator();
      const filterLfoGain = this.ctx.createGain();
      filterLfo.frequency.setValueAtTime(0.08, now); // ~12 second cycle
      filterLfoGain.gain.setValueAtTime(120, now);
      filterLfo.connect(filterLfoGain);
      filterLfoGain.connect(filter.frequency);
      filterLfo.start(now);

      // Post-apocalyptic minor chord drone (A1, E2, A2, C3)
      // 55Hz (A1), 82.4Hz (E2), 110Hz (A2), 130.8Hz (C3)
      const freqs = [55, 82.41, 110.0, 130.81];
      const padOscs = [];

      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const detune = (idx % 2 === 0 ? 1 : -1) * (4 + idx * 2);
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime(detune, now);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.35, now);
        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start(now);
        padOscs.push(osc);
      });

      this.musicNodes = [this.musicGain, filter, filterLfo, filterLfoGain, ...padOscs];
      this.isMusicPlaying = true;

      // Soft lo-fi ambient pulse (heartbeat of survival) every 2.8 seconds
      const schedulePulse = () => {
        if (!this.isMusicPlaying || !this.ctx || !this.musicEnabled) return;
        const pulseNow = this.ctx.currentTime;
        const pulseOsc = this.ctx.createOscillator();
        const pulseGain = this.ctx.createGain();

        pulseOsc.type = 'sine';
        pulseOsc.frequency.setValueAtTime(58, pulseNow);
        pulseOsc.frequency.exponentialRampToValueAtTime(32, pulseNow + 0.35);

        pulseGain.gain.setValueAtTime(0.045, pulseNow);
        pulseGain.gain.exponentialRampToValueAtTime(0.0001, pulseNow + 0.4);

        pulseOsc.connect(pulseGain);
        pulseGain.connect(this.musicGain);

        pulseOsc.start(pulseNow);
        pulseOsc.stop(pulseNow + 0.42);
      };

      this.musicTimer = setInterval(schedulePulse, 2800);
      schedulePulse();
    } catch (e) {
      console.warn('Music synth initialization deferred:', e);
    }
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.musicGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.musicGain.gain.cancelScheduledValues(now);
        this.musicGain.gain.linearRampToValueAtTime(0.001, now + 0.5);
        setTimeout(() => {
          this.musicNodes.forEach(node => {
            try {
              if (node.stop) node.stop();
              if (node.disconnect) node.disconnect();
            } catch (_) {}
          });
          this.musicNodes = [];
          this.musicGain = null;
          this.isMusicPlaying = false;
        }, 550);
      } catch {
        this.isMusicPlaying = false;
      }
    } else {
      this.isMusicPlaying = false;
    }
  }

  // ── Sound Effects (SFX) ────────────────────────────────────────────────

  // 1. Tactical UI Click
  playClick() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Radar scan ping for grid sectors
  playRadarPing() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.12);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // 2. Radio Transmission Beep (Walkie-talkie chirp)
  playRadioChirp() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Dual-tone chirp
    [880, 1320].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.035);

      gain.gain.setValueAtTime(0.1, now + idx * 0.035);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.045);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.035);
      osc.stop(now + idx * 0.035 + 0.045);
    });

    // Subtle burst of filtered noise (radio squelch)
    try {
      const bufferSize = this.ctx.sampleRate * 0.06;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2200;
      filter.Q.value = 3.0;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.04, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      whiteNoise.start(now);
    } catch {}
  }

  // 3. Slider Tick / Data Step
  playTick() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, now);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.02);
  }

  // 4. Damage / Alarm Siren (Low warning buzz)
  playAlarm() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Two rapid warning pulses
    [0, 0.16].forEach((offset) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now + offset);
      osc.frequency.linearRampToValueAtTime(140, now + offset + 0.12);

      gain.gain.setValueAtTime(0.18, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.14);
    });
  }

  // Zombie groan on penalties or breaches
  playZombieGroan() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.6);

    // Raspy throat vibrato LFO
    lfo.frequency.setValueAtTime(16, now);
    lfoGain.gain.setValueAtTime(25, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, now);
    filter.Q.setValueAtTime(3.5, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 0.65);
    osc.stop(now + 0.65);
  }

  // 5. Mission Clear / Evacuation Fanfare (Ascending chord)
  playFanfare() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);

      gain.gain.setValueAtTime(0.14, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.55);
    });
  }

  // Positive chime for good choices / reward
  playSuccessChime() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.1, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.3);
    });
  }
}

export const soundEngine = new SoundEngine();
