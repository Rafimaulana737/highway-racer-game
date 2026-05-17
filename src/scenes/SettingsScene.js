class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SettingsScene' });
  }

  create() {
    this.audio = this.registry.get('audio');

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111827);

    this.add.text(GAME_WIDTH / 2, 100, 'SETTINGS', uiStyle({
      fontSize: '32px',
      fontStyle: 'bold',
    })).setOrigin(0.5);

    this.musicSlider = createVolumeSlider(
      this,
      GAME_WIDTH / 2,
      260,
      'Global Music',
      () => this.registry.get('musicVolume'),
      (v) => {
        this.audio.musicVolume = v;
        this.saveSettings();
        if (this.audio.music) this.audio.music.setVolume(v);
        if (v <= 0) this.audio.stopMusic();
        this.musicSlider.updateVisual();
      },
    );

    this.sfxSlider = createVolumeSlider(
      this,
      GAME_WIDTH / 2,
      380,
      'Engine / SFX',
      () => this.registry.get('sfxVolume'),
      (v) => {
        this.audio.sfxVolume = v;
        this.saveSettings();
        this.sfxSlider.updateVisual();
      },
    );

    createButton(this, GAME_WIDTH / 2, 540, 'BACK', () => {
      this.scene.start('MainMenuScene');
    });

    this.musicSlider.updateVisual();
    this.sfxSlider.updateVisual();
  }

  saveSettings() {
    localStorage.setItem('highwayRacerSettings', JSON.stringify({
      musicVolume: this.registry.get('musicVolume'),
      sfxVolume: this.registry.get('sfxVolume'),
    }));
  }
}
