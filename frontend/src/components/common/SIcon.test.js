import test from 'node:test';
import assert from 'node:assert/strict';
import { ICON_MAP, SIZE_MAP, STANDARD_COLORS } from './s-icon.constants.js';

test('SIcon mapping and size contracts', async (t) => {
  await t.test('STANDARD_COLORS includes expected design system semantic color tokens', () => {
    assert.deepStrictEqual(STANDARD_COLORS, [
      'primary', 'secondary', 'danger', 'warning', 'success', 'muted'
    ]);
  });

  await t.test('SIZE_MAP contains expected standard size tokens', () => {
    assert.strictEqual(SIZE_MAP.xs, 12);
    assert.strictEqual(SIZE_MAP.s, 14);
    assert.strictEqual(SIZE_MAP.m, 16);
    assert.strictEqual(SIZE_MAP.l, 20);
    assert.strictEqual(SIZE_MAP.xl, 24);
    assert.strictEqual(SIZE_MAP['2xl'], 32);
    assert.strictEqual(SIZE_MAP['3xl'], 48);
  });

  await t.test('ICON_MAP contains core essential action and navigation icon keys', () => {
    const requiredKeys = [
      'close', 'x', 'add', 'plus', 'add-user', 'user-plus',
      'edit', 'pencil', 'delete', 'trash', 'archive', 'restore',
      'refresh', 'back', 'arrow-left', 'arrow-right', 'save', 'send',
      'more', 'more-vertical', 'zoom-in', 'zoom-out', 'check',
      'play', 'pause', 'download', 'hint', 'trophy', 'help', 'copy',
      'eye', 'eye-off', 'paperclip', 'mic', 'mic-off', 'volume-2',
      'volume-x', 'menu', 'home', 'settings'
    ];

    for (const key of requiredKeys) {
      assert.ok(
        ICON_MAP[key],
        `Expected ICON_MAP to include entry for "${key}"`
      );
      assert.strictEqual(typeof ICON_MAP[key], 'object'); // Lucide forwardRef icon components
    }
  });
});
