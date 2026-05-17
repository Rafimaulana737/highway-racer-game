const GAME_WIDTH = 480;
const GAME_HEIGHT = 720;
const LANE_COUNT = 4;
const ROAD_MARGIN = 40;
const SCROLL_SPEED = 420;
const DASH_LENGTH = 36;
const DASH_GAP = 28;
const DASH_SEGMENT = DASH_LENGTH + DASH_GAP;
const CAR_WIDTH = 46;
const CAR_HEIGHT = 78;
const HITBOX_SHRINK = 0.82;
const NEAR_MISS_MAX_X = 88;
const NEAR_MISS_MAX_Y = 52;
const NEAR_MISS_BONUS = 500;
const NITRO_MULTIPLIER = 2;
const SPAWN_Y = -CAR_HEIGHT;
const ROW_BAND_HALF = CAR_HEIGHT * 0.55;

const ROAD = {
  grass: 0x1e4d2b,
  asphalt: 0x3d3d42,
  asphaltDark: 0x323236,
  marking: 0xf5f5f5,
};

const ENEMY_COLORS = [0x2563eb, 0x4b5563, 0xdc2626, 0xca8a04, 0x059669, 0x7c3aed];
const PLAYER_COLOR = 0xdc2626;
const SCENERY_SPAWN_INTERVAL = 1600;

const DIFFICULTY_PROFILES = {
  easy: {
    label: 'Easy',
    enemySpeed: 135,
    spawnInterval: 2600,
    minVerticalGap: CAR_HEIGHT * 3.2,
    minWaveSpacing: CAR_HEIGHT * 3,
    maxCarsPerRow: 2,
  },
  medium: {
    label: 'Medium',
    enemySpeed: 175,
    spawnInterval: 1750,
    minVerticalGap: CAR_HEIGHT * 2.8,
    minWaveSpacing: CAR_HEIGHT * 2.5,
    maxCarsPerRow: 3,
  },
  hard: {
    label: 'Hard',
    enemySpeed: 235,
    spawnInterval: 1050,
    minVerticalGap: CAR_HEIGHT * 2.2,
    minWaveSpacing: CAR_HEIGHT * 2,
    maxCarsPerRow: 3,
  },
};

function getDifficultyPhase(elapsedSeconds) {
  if (elapsedSeconds < 120) return 'easy';
  if (elapsedSeconds < 240) return 'medium';
  if (elapsedSeconds < 360) return 'hard';
  if (elapsedSeconds < 390) return 'recovery';

  const segment = Math.floor((elapsedSeconds - 390) / 30);
  return segment % 2 === 0 ? 'hard' : 'easy';
}

function getDifficultyConfig(elapsedSeconds) {
  const phase = getDifficultyPhase(elapsedSeconds);
  if (phase === 'recovery') return { ...DIFFICULTY_PROFILES.easy, label: 'Recovery' };
  return { ...DIFFICULTY_PROFILES[phase] };
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function darkenColor(hex, amount = 28) {
  const c = Phaser.Display.Color.IntegerToColor(hex);
  return Phaser.Display.Color.GetColor(
    Math.max(0, c.red - amount),
    Math.max(0, c.green - amount),
    Math.max(0, c.blue - amount),
  );
}
