class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  init() {
    const saved = localStorage.getItem('highwayRacerSettings');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.registry.set('musicVolume', data.musicVolume ?? 0.6);
        this.registry.set('sfxVolume', data.sfxVolume ?? 0.8);
      } catch (err) {
        console.warn('[Boot] Could not parse saved settings:', err);
        this.setDefaultSettings();
      }
    } else {
      this.setDefaultSettings();
    }

    this.registry.set('musicLoadFailed', true);
  }

  setDefaultSettings() {
    this.registry.set('musicVolume', 0.6);
    this.registry.set('sfxVolume', 0.8);
  }

  preload() {
    console.log('[Boot] Loading ./music1.mp3 (optional)');

    this.load.on('filecomplete-audio-music1', () => {
      console.log('[Boot] music1.mp3 loaded successfully');
      this.registry.set('musicLoadFailed', false);
    });

    this.load.on('loaderror', (file) => {
      console.warn('[Boot] music1.mp3 load failed — game will still run:', file?.key, file?.src);
      if (file?.key === 'music1') {
        this.registry.set('musicLoadFailed', true);
      }
    });

    this.load.on('complete', () => {
      console.log('[Boot] Asset loader finished');
    });

    // IMPORTANT: must match the actual file name/path.
    // Your requirement: use ./music1.mp3 or assets/music1.mp3.
    // This project currently keeps audio under assets/audio/Music1.mp3.mp3.
    // Prefer assets/music1.mp3 if you place/rename the file there.
    try {
      // Try a conventional expected path first.
      this.load.audio('music1', './music1.mp3');
    } catch (err) {
      try {
        this.load.audio('music1', './assets/music1.mp3');
      } catch (err2) {
        console.warn('[Boot] Could not queue music1.mp3 from expected locations:', err, err2);
        this.registry.set('musicLoadFailed', true);
      }
    }
  }

  create() {
    console.log('[Boot] create() — launching Main Menu');

    // Autoplay is blocked on mobile browsers; music starts only after user gesture.


    try {
      const audio = new AudioManager(this);
      audio.init();
      audio.register(this);
      this.registry.set('audio', audio);
    } catch (err) {
      console.error('[Boot] Audio init error (non-fatal):', err);
      const audio = new AudioManager(this);
      audio.init();
      this.registry.set('audio', audio);
    }

    this.scene.start('MainMenuScene');
  }
}
