import assert from 'node:assert/strict';
import test from 'node:test';
import {
  contrastRatio,
  ensureContrast,
  MIN_CONTRAST,
} from '../lib/color-contrast.ts';

test('Auto contrast preserves a safe palette, including medium gray backgrounds', () => {
  for (const [foreground, background] of [
    ['#11130f', '#aaaaaa'],
    ['#5b21b6', '#ffffff'],
    ['#ffffff', '#11130f'],
  ]) {
    assert.equal(ensureContrast(foreground, background), foreground);
  }
});

test('repairs the gray-background regression and remains stable on repeated clicks', () => {
  const result = ensureContrast('#ffffff', '#aaaaaa');
  assert.ok(contrastRatio(result, '#aaaaaa') >= MIN_CONTRAST);
  assert.equal(ensureContrast(result, '#aaaaaa'), result);
});

test('uses pure black when both preset extremes fall below the minimum', () => {
  const gray = '#777777';
  assert.ok(contrastRatio('#11130f', gray) < MIN_CONTRAST);
  assert.ok(contrastRatio('#ffffff', gray) < MIN_CONTRAST);
  assert.equal(ensureContrast('#ffffff', gray), '#000000');
});

test('foreground and background correction meet the minimum across the RGB range', () => {
  for (let red = 0; red <= 255; red += 17) {
    for (let green = 0; green <= 255; green += 17) {
      for (let blue = 0; blue <= 255; blue += 17) {
        const color =
          '#' +
          [red, green, blue]
            .map((v) => v.toString(16).padStart(2, '0'))
            .join('');
        for (const current of ['#11130f', '#ffffff', color]) {
          const corrected = ensureContrast(current, color);
          assert.ok(
            contrastRatio(corrected, color) >= MIN_CONTRAST,
            `${current} against ${color}`,
          );
          assert.equal(ensureContrast(corrected, color), corrected);
        }
      }
    }
  }
});
