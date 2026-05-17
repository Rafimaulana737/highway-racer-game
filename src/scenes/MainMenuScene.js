class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    console.log('[MainMenu] create()');

    this.audio = this.registry.get('audio');
    if (this.audio) {
      try {
        this.audio.stopEngine();
        this.audio.stopMusic();
      } catch (err) {
        console.warn('[MainMenu] audio stop failed:', err);
      }
    }

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111827);

    this.add.text(GAME_WIDTH / 2, 160, 'HIGHWAY RACER', uiStyle({
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#fde047',
    })).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 210, 'Survive the highway', uiStyle({
      fontSize: '14px',
      color: '#9ca3af',
    })).setOrigin(0.5);

    createButton(this, GAME_WIDTH / 2, 340, 'START GAME', () => {
      // Autoplay fix: start music only after explicit user gesture.
      this.audio?.startMusic();
      this.startGame();
    });


    createButton(this, GAME_WIDTH / 2, 410, 'SETTINGS', () => {
      this.scene.start('SettingsScene');
    });

    console.log('[MainMenu] Ready — click START GAME');
  }

  startGame() {
    console.log('[MainMenu] START GAME clicked');

    try {
      this.scene.start('GameScene');
      console.log('[MainMenu] GameScene started');
    } catch (err) {
      console.error('[MainMenu] Could not start GameScene:', err);
    }
  }
}
