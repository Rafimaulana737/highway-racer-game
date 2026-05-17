class AudioManager {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this.sfxGain = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.musicOscillators = [];
    this.musicTimer = null;
    this.engineRunning = false;
    this.musicPlaying = false;
    this.musicPaused = false;
    this.unlocked = false;
    this.music = null;
    this.hasMusicFile = false;
    this.scene = null;
  }

  get musicVolume() {
    return this.game.registry.get('musicVolume') ?? 0.6;
  }

  get sfxVolume() {
    return this.game.registry.get('sfxVolume') ?? 0.8;
  }

  set musicVolume(v) {
    const vol = Phaser.Math.Clamp(v, 0, 1);
    this.game.registry.set('musicVolume', vol);
    try {
      if (this.music) this.music.setVolume(vol);
    } catch (err) {
      console.warn('[Audio] set music volume failed:', err);
    }
  }

  set sfxVolume(v) {
    const vol = Phaser.Math.Clamp(v, 0, 1);
    this.game.registry.set('sfxVolume', vol);
    if (this.sfxGain) this.sfxGain.gain.value = vol;
    if (this.engineGain) this.engineGain.gain.value = vol * 0.35;
  }

  init() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('[Audio] Web Audio API not available');
        return;
      }

      this.ctx = new AudioCtx();
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.ctx.destination);
      console.log('[Audio] Web Audio initialized');
    } catch (err) {
      console.error('[Audio] init failed:', err);
    }
  }

  register(scene) {
    this.scene = scene;
    this.hasMusicFile = false;

    try {
      const loadFailed = scene.registry.get('musicLoadFailed');
      const exists = scene.cache?.audio?.exists('music1');

      if (loadFailed || !exists) {
        console.log('[Audio] No music file — using fallback melody');
        return;
      }

      if (this.music) {
        try {
          this.music.destroy();
        } catch (_) { /* noop */ }
        this.music = null;
      }

      this.music = scene.sound.add('music1', {
        loop: true,
        volume: this.musicVolume,
      });
      this.hasMusicFile = true;
      console.log('[Audio] music1.mp3 registered');
    } catch (err) {
      console.warn('[Audio] register failed — fallback melody only:', err);
      this.hasMusicFile = false;
      this.music = null;
    }
  }

  unlock() {
    try {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.unlocked = true;
    } catch (err) {
      console.warn('[Audio] unlock failed:', err);
    }
  }

  stopProceduralMusic() {
    this.musicPlaying = false;
    for (const osc of this.musicOscillators) {
      try { osc.stop(); } catch (_) { /* noop */ }
    }
    this.musicOscillators = [];
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  startProceduralMusic() {
    if (!this.ctx || this.musicVolume <= 0) return;

    try {
      this.unlock();
      this.stopProceduralMusic();
      this.musicPlaying = true;

      const bassNotes = [55, 65.41, 73.42, 82.41];
      let step = 0;
      const musicGain = this.ctx.createGain();
      musicGain.gain.value = this.musicVolume;
      musicGain.connect(this.ctx.destination);

      const playNote = () => {
        if (!this.musicPlaying || !this.ctx || this.musicPaused) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = bassNotes[step % bassNotes.length];
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.05 * this.musicVolume, this.ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(musicGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
        this.musicOscillators.push(osc);
        step += 1;
      };

      playNote();
      this.musicTimer = setInterval(playNote, 500);
    } catch (err) {
      console.warn('[Audio] procedural music failed:', err);
    }
  }

  startMusic() {
    // Browsers block autoplay. Only call this after user gesture.
    this.musicPaused = false;

    try {
      if (this.music && this.hasMusicFile) {
        // Ensure WebAudio is unlocked.
        this.unlock();

        // Loop indefinitely + fixed volume 0.5 (per requirement).
        this.music.setVolume(0.5);
        this.music.setLoop(true);

        if (!this.music.isPlaying) {
          this.music.play();
        }
        this.musicPlaying = true;
        this.stopProceduralMusic();
        return;
      }
    } catch (err) {
      console.warn('[Audio] MP3 play failed, using fallback:', err);
      this.hasMusicFile = false;
    }

    // If the mp3 isn't available, do not auto-play procedural music.
    // Requirement focuses on music1.mp3; keep gameplay running silently.
  }

  pauseMusic() {
    this.musicPaused = true;

    try {
      if (this.music && this.music.isPlaying) {
        this.music.pause();
        return;
      }
    } catch (err) {
      console.warn('[Audio] pause music failed:', err);
    }

    this.stopProceduralMusic();
  }

  resumeMusic() {
    this.musicPaused = false;

    try {
      if (this.music && this.hasMusicFile) {
        if (this.music.isPaused) {
          this.music.resume();
        } else if (!this.music.isPlaying) {
          this.music.setVolume(this.musicVolume);
          this.music.play();
        }
        this.musicPlaying = true;
        return;
      }
    } catch (err) {
      console.warn('[Audio] resume music failed:', err);
    }

    if (!this.musicPlaying) {
      this.startProceduralMusic();
    }
  }

  stopMusic() {
    this.musicPaused = false;
    this.musicPlaying = false;

    try {
      if (this.music) {
        this.music.stop();
      }
    } catch (err) {
      console.warn('[Audio] stop music failed:', err);
    }

    this.stopProceduralMusic();
  }

  startEngine() {
    if (!this.ctx || this.engineRunning) return;

    try {
      this.unlock();
      this.engineRunning = true;

      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 72;
      this.engineGain.gain.value = this.sfxVolume * 0.35;
      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.sfxGain);
      this.engineOsc.start();
    } catch (err) {
      console.warn('[Audio] engine start failed:', err);
      this.engineRunning = false;
    }
  }

  stopEngine() {
    this.engineRunning = false;
    if (this.engineOsc) {
      try { this.engineOsc.stop(); } catch (_) { /* noop */ }
      this.engineOsc = null;
    }
  }

  setEnginePitch(speedRatio) {
    if (this.engineOsc) {
      this.engineOsc.frequency.value = 60 + speedRatio * 50;
    }
  }

  playWhoosh() {
    if (!this.ctx || this.sfxVolume <= 0) return;

    try {
      this.unlock();

      const duration = 0.2;
      const sampleRate = this.ctx.sampleRate;
      const length = Math.floor(sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < length; i++) {
        const t = i / length;
        data[i] = (Math.random() * 2 - 1) * (1 - t) * (1 - t);
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + duration);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4 * this.sfxVolume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      source.start();
      source.stop(this.ctx.currentTime + duration);
    } catch (err) {
      console.warn('[Audio] whoosh failed:', err);
    }
  }
}
