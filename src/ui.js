function uiStyle(overrides = {}) {
  return {
    fontFamily: 'system-ui, sans-serif',
    color: '#ffffff',
    ...overrides,
  };
}

function createPauseButton(scene, x, y, onClick) {
  const container = scene.add.container(x, y);
  const width = 52;
  const height = 40;

  const bg = scene.add.rectangle(0, 0, width, height, 0x1f2937, 0.92)
    .setStrokeStyle(2, 0xe5e7eb);
  const label = scene.add.text(0, 0, '||', uiStyle({
    fontSize: '22px',
    fontStyle: 'bold',
    color: '#ffffff',
  })).setOrigin(0.5);

  container.add([bg, label]);
  bg.setInteractive({ useHandCursor: true });

  bg.on('pointerover', () => bg.setFillStyle(0x374151, 0.95));
  bg.on('pointerout', () => bg.setFillStyle(0x1f2937, 0.92));
  bg.on('pointerup', () => {
    try {
      scene.audio?.unlock();
      onClick();
    } catch (err) {
      console.error('[UI] pause button error:', err);
    }
  });

  return container;
}

function createButton(scene, x, y, label, onClick, width = 260, height = 48) {
  const container = scene.add.container(x, y);

  const bg = scene.add.rectangle(0, 0, width, height, 0x1f2937, 1)
    .setStrokeStyle(2, 0x38bdf8);
  const text = scene.add.text(0, 0, label, uiStyle({
    fontSize: '18px',
    fontStyle: 'bold',
  })).setOrigin(0.5);

  container.add([bg, text]);
  bg.setInteractive({ useHandCursor: true });

  bg.on('pointerover', () => bg.setFillStyle(0x374151));
  bg.on('pointerout', () => bg.setFillStyle(0x1f2937));
  bg.on('pointerup', (pointer) => {
    if (!pointer.wasTouch || pointer.upTime - pointer.downTime < 500) {
      try {
        scene.audio?.unlock();
      } catch (err) {
        console.warn('[UI] audio unlock on click failed:', err);
      }
      try {
        onClick();
      } catch (err) {
        console.error('[UI] button callback error:', err);
      }
    }
  });

  return container;
}

function createVolumeSlider(scene, x, y, label, getValue, setValue) {
  const container = scene.add.container(x, y).setDepth(10);
  const barWidth = 220;

  const title = scene.add.text(0, -28, label, uiStyle({ fontSize: '16px' })).setOrigin(0.5);
  const track = scene.add.rectangle(0, 0, barWidth, 8, 0x374151);
  const fill = scene.add.rectangle(-barWidth / 2, 0, 0, 8, 0x38bdf8).setOrigin(0, 0.5);
  const knob = scene.add.circle(0, 0, 12, 0x67e8f9).setStrokeStyle(2, 0xffffff);
  const valueText = scene.add.text(barWidth / 2 + 36, 0, '', uiStyle({
    fontFamily: 'monospace',
    fontSize: '14px',
  })).setOrigin(0.5);

  const updateVisual = (value) => {
    const v = Phaser.Math.Clamp(value, 0, 1);
    fill.width = barWidth * v;
    knob.x = -barWidth / 2 + barWidth * v;
    valueText.setText(`${Math.round(v * 100)}%`);
  };

  updateVisual(getValue());

  track.setInteractive({ useHandCursor: true });
  knob.setInteractive({ useHandCursor: true });

  const applyValue = (value) => {
    setValue(value);
    updateVisual(getValue());
  };

  track.on('pointerdown', (pointer) => {
    scene.audio?.unlock();
    const localX = Phaser.Math.Clamp(pointer.x - (x - barWidth / 2), 0, barWidth);
    applyValue(localX / barWidth);
  });

  scene.input.on('pointermove', (pointer) => {
    if (knob.getData('dragging')) {
      const localX = Phaser.Math.Clamp(pointer.x - (x - barWidth / 2), 0, barWidth);
      applyValue(localX / barWidth);
    }
  });

  scene.input.on('pointerup', () => knob.setData('dragging', false));

  knob.on('pointerdown', (pointer) => {
    scene.audio?.unlock();
    knob.setData('dragging', true);
    const localX = Phaser.Math.Clamp(pointer.x - (x - barWidth / 2), 0, barWidth);
    applyValue(localX / barWidth);
  });

  container.add([title, track, fill, knob, valueText]);
  container.updateVisual = () => updateVisual(getValue());

  return container;
}
