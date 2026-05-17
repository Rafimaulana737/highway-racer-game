class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    console.log('[GameScene] create() begin');

    try {
      this.initGameState();

      this.audio = this.registry.get('audio');
      if (this.audio) {
        try {
          this.audio.register(this);
          // Autoplay fix: do not start music here. We'll start on user gesture (Start Game button / pointerdown).
          this.audio.unlock();
          this.audio.startEngine();
        } catch (audioErr) {
          console.warn('[GameScene] Audio start failed (game continues):', audioErr);
        }
      } else {
        console.warn('[GameScene] No audio manager — continuing silently');
      }


      this.createRoad();
      this.createSceneryLayer();
      this.prefillScenery();
      this.createPlayer();
      this.createNitroParticles();
      this.createHud();
      this.createPauseUi();
      this.createGameOverUi();

      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys({
        A: Phaser.Input.Keyboard.KeyCodes.A,
        D: Phaser.Input.Keyboard.KeyCodes.D,
        SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      });

      this.input.keyboard.once('keydown', () => {
        this.audio?.unlock();
        this.audio?.startMusic();
      });
      this.input.once('pointerdown', () => {
        this.audio?.unlock();
        this.audio?.startMusic();
      });


      this.updateDifficulty();
      console.log('[GameScene] create() complete — game running');
    } catch (err) {
      console.error('[GameScene] create() FAILED — returning to menu:', err);
      this.scene.start('MainMenuScene');
    }
  }

  initGameState() {
    this.roadWidth = GAME_WIDTH - ROAD_MARGIN * 2;
    this.laneWidth = this.roadWidth / LANE_COUNT;
    this.roadLeft = ROAD_MARGIN;

    this.isGameOver = false;
    this.isPaused = false;
    this.score = 0;
    this.spawnTimer = 0;
    this.scenerySpawnTimer = 0;
    this.elapsedSeconds = 0;
    this.difficultyConfig = getDifficultyConfig(0);

    this.targetLane = 1;
    this.playerCarY = GAME_HEIGHT - 100;
    this.playerX = this.laneCenterX(this.targetLane);

    this.enemies = [];
    this.sceneryItems = [];

    console.log('[GameScene] State initialized — time 0:00, difficulty Easy');
  }

  laneCenterX(laneIndex) {
    return this.roadLeft + this.laneWidth * (laneIndex + 0.5);
  }

  updateDifficulty() {
    this.difficultyConfig = getDifficultyConfig(this.elapsedSeconds);
    this.difficultyText.setText(`Difficulty: ${this.difficultyConfig.label}`);
    this.timeText.setText(`Time: ${formatTime(this.elapsedSeconds)}`);
  }

  createRoad() {
    const bg = this.add.graphics().setDepth(0);
    bg.fillStyle(ROAD.grass, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const road = this.add.graphics().setDepth(1);
    road.fillStyle(ROAD.asphaltDark, 1);
    road.fillRect(this.roadLeft - 4, 0, this.roadWidth + 8, GAME_HEIGHT);
    road.fillStyle(ROAD.asphalt, 1);
    road.fillRect(this.roadLeft, 0, this.roadWidth, GAME_HEIGHT);
    road.lineStyle(4, ROAD.marking, 1);
    road.strokeRect(this.roadLeft + 2, 0, this.roadWidth - 4, GAME_HEIGHT);

    this.dashGroup = this.add.group();
    const dashesPerColumn = Math.ceil((GAME_HEIGHT + DASH_SEGMENT * 2) / DASH_SEGMENT);

    for (let lane = 1; lane < LANE_COUNT; lane++) {
      const x = this.roadLeft + this.laneWidth * lane;
      for (let i = 0; i < dashesPerColumn; i++) {
        const dash = this.add.rectangle(x, i * DASH_SEGMENT - DASH_SEGMENT, 4, DASH_LENGTH, ROAD.marking);
        dash.setDepth(2);
        this.dashGroup.add(dash);
      }
    }

    this.dashesPerColumn = dashesPerColumn;
    this.edgeLines = [];
    for (const side of [-1, 1]) {
      const x = this.roadLeft + (side === -1 ? 10 : this.roadWidth - 10);
      for (let i = 0; i < 10; i++) {
        const line = this.add.rectangle(x, i * 90 - 40, 3, 50, ROAD.marking, 0.35);
        line.setDepth(2);
        this.edgeLines.push(line);
      }
    }
  }

  createSceneryLayer() {
    this.sceneryContainer = this.add.container(0, 0).setDepth(2);
  }

  prefillScenery() {
    try {
      for (let i = 0; i < 10; i++) {
        const side = i % 2 === 0 ? 'left' : 'right';
        const x = this.randomSceneryX(side);
        const yMin = Math.min(-GAME_HEIGHT, 80);
        const yMax = Math.max(-GAME_HEIGHT, 80);
        const y = Phaser.Math.Between(yMin, yMax);
        const isTree = Phaser.Math.Between(0, 1) === 0;
        const piece = isTree ? this.createTree(x, y) : this.createHouse(x, y);
        this.sceneryContainer.add(piece);
        this.sceneryItems.push(piece);
      }
    } catch (err) {
      console.warn('[GameScene] prefillScenery failed (non-fatal):', err);
    }
  }

  randomSceneryX(side) {
    if (side === 'left') {
      const minX = 16;
      const maxX = Math.max(minX, this.roadLeft - 32);
      return Phaser.Math.Between(minX, maxX);
    }

    const minX = this.roadLeft + this.roadWidth + 32;
    const maxX = Math.max(minX, GAME_WIDTH - 16);
    return Phaser.Math.Between(minX, maxX);
  }

  createTree(x, y) {
    const tree = this.add.container(x, y);
    const trunk = this.add.rectangle(0, 14, 14, 32, 0x5c4033);
    const foliage = this.add.circle(0, -12, 24, 0x2d6a4f);
    const foliage2 = this.add.circle(-10, -4, 16, 0x40916c);
    const foliage3 = this.add.circle(10, -4, 16, 0x40916c);
    tree.add([trunk, foliage, foliage2, foliage3]);
    return tree;
  }

  createHouse(x, y) {
    const house = this.add.container(x, y);
    const wall = this.add.rectangle(0, 8, 56, 44, 0xd1d5db);
    const roof = this.add.rectangle(0, -22, 64, 18, 0x7f1d1d);
    const door = this.add.rectangle(0, 16, 14, 22, 0x4b5563);
    const windowL = this.add.rectangle(-16, 0, 12, 12, 0x93c5fd);
    const windowR = this.add.rectangle(16, 0, 12, 12, 0x93c5fd);
    const chimney = this.add.rectangle(18, -32, 10, 16, 0x6b7280);
    house.add([wall, roof, door, windowL, windowR, chimney]);
    return house;
  }

  spawnSceneryPiece() {
    try {
      const side = Phaser.Math.RND.pick(['left', 'right']);
      const x = this.randomSceneryX(side);
      const yMin = Math.min(-160, -60);
      const yMax = Math.max(-160, -60);
      const y = Phaser.Math.Between(yMin, yMax);
      const isTree = Phaser.Math.Between(0, 1) === 0;
      const piece = isTree ? this.createTree(x, y) : this.createHouse(x, y);
      this.sceneryContainer.add(piece);
      this.sceneryItems.push(piece);
    } catch (err) {
      console.warn('[GameScene] spawnSceneryPiece failed:', err);
    }
  }

  updateScenery(deltaY, dt) {
    this.scenerySpawnTimer += dt * 1000;
    if (this.scenerySpawnTimer >= SCENERY_SPAWN_INTERVAL) {
      this.scenerySpawnTimer = 0;
      this.spawnSceneryPiece();
    }

    for (let i = this.sceneryItems.length - 1; i >= 0; i--) {
      const item = this.sceneryItems[i];
      item.y += deltaY;
      if (item.y > GAME_HEIGHT + 120) {
        item.destroy();
        this.sceneryItems.splice(i, 1);
      }
    }
  }

  createWheel(x, y, isRear) {
    const wheel = this.add.container(x, y);
    const tire = this.add.rectangle(0, 0, 11, isRear ? 20 : 18, 0x141414);
    const rim = this.add.rectangle(0, 0, 7, isRear ? 12 : 10, 0x525252);
    wheel.add([tire, rim]);
    return wheel;
  }

  buildCarContainer(color, isPlayer) {
    const car = this.add.container(0, 0).setDepth(isPlayer ? 10 : 8);

    const shadow = this.add.ellipse(0, 20, 54, 18, 0x000000, 0.4);
    const body = this.add.rectangle(0, 0, CAR_WIDTH, CAR_HEIGHT, color);
    const roof = this.add.rectangle(0, -6, 36, 42, darkenColor(color, 35));
    const windshield = this.add.rectangle(0, -20, 30, 20, 0x6b8cae);

    const wheelFL = this.createWheel(-21, -24, false);
    const wheelFR = this.createWheel(21, -24, false);
    const wheelRL = this.createWheel(-21, 30, true);
    const wheelRR = this.createWheel(21, 30, true);

    const parts = [shadow, body, roof, windshield, wheelFL, wheelFR, wheelRL, wheelRR];

    if (isPlayer) {
      parts.push(
        this.add.rectangle(0, 14, CAR_WIDTH, 6, 0xfbbf24),
        this.add.circle(-15, -38, 5, 0xfff3b0),
        this.add.circle(15, -38, 5, 0xfff3b0),
        this.add.rectangle(-16, 36, 8, 4, 0xff3333),
        this.add.rectangle(16, 36, 8, 4, 0xff3333),
      );
    } else {
      parts.push(
        this.add.circle(-15, -38, 5, 0xfff3b0),
        this.add.circle(15, -38, 5, 0xfff3b0),
      );
    }

    car.add(parts);
    car.bodyShape = body;
    return car;
  }

  createPlayer() {
    this.player = this.buildCarContainer(PLAYER_COLOR, true);
    this.player.setPosition(this.playerX, this.playerCarY);
  }

  createNitroParticles() {
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(8, 8, 8);
    gfx.generateTexture('nitro_particle', 16, 16);
    gfx.destroy();

    this.nitroEmitter = this.add.particles(0, 0, 'nitro_particle', {
      speed: { min: 90, max: 240 },
      angle: { min: 78, max: 102 },
      scale: { start: 0.65, end: 0.05 },
      alpha: { start: 0.9, end: 0 },
      lifespan: { min: 180, max: 400 },
      frequency: 22,
      quantity: 2,
      tint: [0x9ca3af, 0xd1d5db, 0xf97316, 0xfbbf24],
      blendMode: 'NORMAL',
      emitting: false,
    });
    this.nitroEmitter.setDepth(9);
  }

  createHud() {
    this.timeText = this.add.text(16, 16, 'Time: 0:00', uiStyle({
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#374151',
    })).setDepth(20);

    this.difficultyText = this.add.text(16, 40, 'Difficulty: Easy', uiStyle({
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#4b5563',
    })).setDepth(20);

    this.scoreText = this.add.text(16, 64, 'Score: 0', uiStyle({
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#1f2937',
    })).setDepth(20);

    this.nitroText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 56, '', uiStyle({
      fontSize: '14px',
      color: '#2563eb',
      fontStyle: 'bold',
    })).setOrigin(0.5).setDepth(20);

    this.speedText = this.add.text(GAME_WIDTH - 16, GAME_HEIGHT - 16, '', uiStyle({
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#374151',
    })).setOrigin(1, 1).setDepth(20);

    this.pauseButton = createPauseButton(
      this,
      GAME_WIDTH - 36,
      28,
      () => this.togglePause(),
    ).setDepth(25);
  }

  createPauseUi() {
    this.pauseGroup = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(40).setVisible(false);

    const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55);
    const title = this.add.text(0, -40, 'PAUSED', uiStyle({
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#ffffff',
    })).setOrigin(0.5);

    this.pauseGroup.add([overlay, title]);

    this.resumeButton = createButton(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, 'RESUME', () => {
      this.togglePause();
    }, 220, 48).setVisible(false).setDepth(41);
  }

  togglePause() {
    if (this.isGameOver) return;

    this.isPaused = !this.isPaused;
    console.log('[GameScene] Paused:', this.isPaused);

    if (this.isPaused) {
      this.pauseGroup.setVisible(true);
      this.resumeButton.setVisible(true);
      this.audio?.pauseMusic();
      this.audio?.stopEngine();
    } else {
      this.pauseGroup.setVisible(false);
      this.resumeButton.setVisible(false);
      this.audio?.resumeMusic();
      this.audio?.startEngine();
    }
  }

  createGameOverUi() {
    this.gameOverGroup = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(30).setVisible(false);
    const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78);

    const title = this.add.text(0, -100, 'CRASH!', uiStyle({
      fontSize: '42px',
      color: '#ef4444',
      fontStyle: 'bold',
    })).setOrigin(0.5);

    this.finalScoreText = this.add.text(0, -40, '', uiStyle({
      fontFamily: 'monospace',
      fontSize: '20px',
    })).setOrigin(0.5);

    this.finalTimeText = this.add.text(0, 0, '', uiStyle({
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9ca3af',
    })).setOrigin(0.5);

    this.gameOverGroup.add([overlay, title, this.finalScoreText, this.finalTimeText]);

    this.retryButton = createButton(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 70, 'RETRY', () => {
      this.audio.stopEngine();
      this.scene.restart();
    }, 220, 44).setVisible(false).setDepth(31);

    this.menuButton = createButton(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 130, 'BACK TO MENU', () => {
      this.audio.stopEngine();
      this.audio.stopMusic();
      this.scene.start('MainMenuScene');
    }, 220, 44).setVisible(false).setDepth(31);
  }

  getOccupiedLanesInBand(centerY, bandHalf) {
    const lanes = new Set();
    for (const enemy of this.enemies) {
      if (Math.abs(enemy.y - centerY) <= bandHalf) lanes.add(enemy.lane);
    }
    return lanes;
  }

  canSpawnInLane(lane, spawnY) {
    const gap = this.difficultyConfig.minVerticalGap;
    for (const enemy of this.enemies) {
      if (enemy.lane === lane && Math.abs(enemy.y - spawnY) < gap) return false;
    }
    return true;
  }

  canSpawnNewWave() {
    if (this.enemies.length === 0) return true;
    return !this.enemies.some((enemy) => enemy.y < this.difficultyConfig.minWaveSpacing);
  }

  getValidSpawnLanes(spawnY) {
    const rowLanes = this.getOccupiedLanesInBand(spawnY, ROW_BAND_HALF);
    const maxPerRow = this.difficultyConfig.maxCarsPerRow;
    const valid = [];

    for (let lane = 0; lane < LANE_COUNT; lane++) {
      if (!this.canSpawnInLane(lane, spawnY)) continue;
      if (rowLanes.has(lane)) continue;
      if (rowLanes.size >= maxPerRow) continue;
      valid.push(lane);
    }

    return valid;
  }

  pickSpawnLane(spawnY) {
    const valid = this.getValidSpawnLanes(spawnY);
    if (valid.length === 0) return null;
    const rowLanes = this.getOccupiedLanesInBand(spawnY, ROW_BAND_HALF);
    const preferred = valid.filter(() => rowLanes.size < LANE_COUNT - 1);
    return Phaser.Utils.Array.GetRandom(preferred.length > 0 ? preferred : valid);
  }

  spawnEnemyAt(lane) {
    const color = Phaser.Utils.Array.GetRandom(ENEMY_COLORS);
    const enemy = this.buildCarContainer(color, false);
    enemy.setPosition(this.laneCenterX(lane), SPAWN_Y);
    enemy.lane = lane;
    enemy.nearMissAwarded = false;
    this.enemies.push(enemy);
  }

  spawnEnemySafe() {
    if (!this.canSpawnNewWave()) return;
    const lane = this.pickSpawnLane(SPAWN_Y);
    if (lane === null) return;
    this.spawnEnemyAt(lane);
  }

  carsOverlap(ax, ay, bx, by) {
    const hw = (CAR_WIDTH * HITBOX_SHRINK) / 2;
    const hh = (CAR_HEIGHT * HITBOX_SHRINK) / 2;
    return Math.abs(ax - bx) < hw * 2 && Math.abs(ay - by) < hh * 2;
  }

  isNearMiss(ax, ay, bx, by) {
    if (this.carsOverlap(ax, ay, bx, by)) return false;
    return Math.abs(ax - bx) <= NEAR_MISS_MAX_X && Math.abs(ay - by) <= NEAR_MISS_MAX_Y;
  }

  showNearMissText() {
    const x = this.playerX;
    const y = this.playerCarY - CAR_HEIGHT / 2 - 36;
    const floater = this.add.text(x, y, 'NEAR MISS!', uiStyle({
      fontSize: '28px',
      color: '#facc15',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    })).setOrigin(0.5).setDepth(25);

    this.tweens.add({
      targets: floater,
      y: y - 55,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => floater.destroy(),
    });
  }

  awardNearMiss(enemy) {
    enemy.nearMissAwarded = true;
    this.score += NEAR_MISS_BONUS;
    this.scoreText.setText(`Score: ${Math.floor(this.score)}`);
    this.showNearMissText();
    this.audio.playWhoosh();
  }

  checkNearMisses() {
    for (const enemy of this.enemies) {
      if (enemy.nearMissAwarded) continue;
      if (this.isNearMiss(this.playerX, this.playerCarY, enemy.x, enemy.y)) {
        this.awardNearMiss(enemy);
      }
    }
  }

  updateNitroVisuals(isNitro) {
    this.nitroText.setText(isNitro ? 'NITRO!' : '');
    this.player.setScale(isNitro ? 1.03 : 1);
    if (isNitro) {
      this.nitroEmitter.setPosition(this.playerX, this.playerCarY + CAR_HEIGHT / 2 + 6);
    }
    this.nitroEmitter.emitting = isNitro;
  }

  updateNitroCamera(isNitro) {
    if (isNitro) {
      this.cameras.main.setScroll(
        Phaser.Math.FloatBetween(-3, 3),
        Phaser.Math.FloatBetween(-3, 3),
      );
    } else {
      this.cameras.main.setScroll(0, 0);
    }
  }

  resetGameEffects() {
    this.cameras.main.setScroll(0, 0);
    if (this.nitroEmitter) this.nitroEmitter.emitting = false;
    this.audio.stopEngine();
  }

  checkCollisions() {
    for (const enemy of this.enemies) {
      if (this.carsOverlap(this.playerX, this.playerCarY, enemy.x, enemy.y)) {
        this.triggerGameOver();
        return;
      }
    }
  }

  triggerGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.isPaused = false;
    this.pauseGroup.setVisible(false);
    this.resumeButton.setVisible(false);
    this.resetGameEffects();
    this.audio.stopMusic();
    this.finalScoreText.setText(`Final Score: ${Math.floor(this.score)}`);
    this.finalTimeText.setText(`Time: ${formatTime(this.elapsedSeconds)} · ${this.difficultyConfig.label}`);
    this.gameOverGroup.setVisible(true);
    this.retryButton.setVisible(true);
    this.menuButton.setVisible(true);
    this.pauseButton.setVisible(false);
    this.player.setAngle(Phaser.Math.Between(-12, 12));
  }

  tryChangeLane(direction) {
    const next = this.targetLane + direction;
    if (next >= 0 && next < LANE_COUNT) this.targetLane = next;
  }

  scrollMarkings(deltaY) {
    const wrapY = GAME_HEIGHT + DASH_LENGTH;
    this.dashGroup.children.iterate((dash) => {
      if (!dash) return;
      dash.y += deltaY;
      if (dash.y > wrapY) dash.y -= this.dashesPerColumn * DASH_SEGMENT;
    });
    for (const line of this.edgeLines) {
      line.y += deltaY * 0.6;
      if (line.y > GAME_HEIGHT + 30) line.y -= 8 * 90;
    }
  }

  updateEnemies(dt) {
    const speed = this.difficultyConfig.enemySpeed;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.y += speed * dt;
      if (enemy.y > GAME_HEIGHT + CAR_HEIGHT) {
        enemy.destroy();
        this.enemies.splice(i, 1);
      }
    }
  }

  update(time, delta) {
    if (this.isGameOver || this.isPaused) return;

    const dt = delta / 1000;
    this.elapsedSeconds += dt;
    this.updateDifficulty();

    const isNitro = this.keys.SPACE.isDown;
    const scrollMultiplier = isNitro ? NITRO_MULTIPLIER : 1;
    const roadDeltaY = SCROLL_SPEED * scrollMultiplier * dt;

    this.updateNitroVisuals(isNitro);
    this.updateNitroCamera(isNitro);
    this.audio.setEnginePitch(scrollMultiplier);

    if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.keys.A)) {
      this.tryChangeLane(-1);
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.keys.D)) {
      this.tryChangeLane(1);
    }

    const targetX = this.laneCenterX(this.targetLane);
    const lerpFactor = 1 - Math.exp(-12 * dt);
    this.playerX = Phaser.Math.Linear(this.playerX, targetX, lerpFactor);
    this.player.setPosition(this.playerX, this.playerCarY);

    this.scrollMarkings(roadDeltaY);
    this.updateScenery(roadDeltaY, dt);
    this.updateEnemies(dt);

    this.score += dt * 10;
    this.scoreText.setText(`Score: ${Math.floor(this.score)}`);

    this.spawnTimer += delta;
    if (this.spawnTimer >= this.difficultyConfig.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnEnemySafe();
    }

    this.checkCollisions();
    if (!this.isGameOver) this.checkNearMisses();

    const displaySpeed = Math.round(SCROLL_SPEED * scrollMultiplier * 0.18);
    this.speedText.setText(`${displaySpeed} km/h`);
  }

  shutdown() {
    this.audio.stopEngine();
  }
}
