import assert from 'node:assert/strict';
import test from 'node:test';
import qrcode from 'qrcode-generator';
import { composeQrSvg, QUIET_MODULES, SHAPE_LAYOUTS } from '../lib/qr-shape.ts';

test('boundary joins replace only dark edge cells, away from finder separators', () => {
  for (const payload of [
    'Join me',
    'https://example.com/a/longer/path?test=joins',
  ]) {
    const matrix = qrcode(0, 'H');
    matrix.addData(payload, 'Byte');
    matrix.make();
    const count = matrix.getModuleCount();
    for (const shape of ['circle', 'hexagon', 'triangle']) {
      for (const style of [
        'square',
        'dots',
        'rounded',
        'classy',
        'classy-rounded',
        'extra-rounded',
      ]) {
        const svg = composeQrSvg(
          shape,
          '#ffffff',
          '#11130f',
          style,
          count,
          '<svg/>',
          matrix,
        );
        const cuts = svg.match(/<g fill="black">(.*?)<\/g>/)?.[1];
        assert.ok(cuts, `${shape}/${style} must join across the boundary`);
        const layout = SHAPE_LAYOUTS[shape];
        const step = layout.size / (count + 2 * QUIET_MODULES);
        const cells = [
          ...cuts.matchAll(
            /<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"\/>/g,
          ),
        ];
        assert.ok(cells.length > 0);
        for (const [, x, y, width, height] of cells) {
          const column =
            Math.round((Number(x) - layout.x) / step) - QUIET_MODULES;
          const row = Math.round((Number(y) - layout.y) / step) - QUIET_MODULES;
          assert.equal(Number(width), step);
          assert.equal(Number(height), step);
          assert.ok(column >= 0 && column < count && row >= 0 && row < count);
          assert.ok(
            column === 0 ||
              row === 0 ||
              column === count - 1 ||
              row === count - 1,
          );
          assert.equal(
            matrix.isDark(row, column),
            true,
            'white data cells cannot be repainted',
          );
          assert.ok(
            !(column <= 7 && row <= 7),
            'top-left finder remains untouched',
          );
          assert.ok(
            !(column >= count - 8 && row <= 7),
            'top-right finder remains untouched',
          );
          assert.ok(
            !(column <= 7 && row >= count - 8),
            'bottom-left finder remains untouched',
          );
        }
        assert.ok(svg.includes(`data-boundary-joins="${cells.length}"`));
      }
    }
  }
});

test('plain square and empty previews do not receive boundary masks', () => {
  const square = composeQrSvg(
    'square',
    '#ffffff',
    '#11130f',
    'rounded',
    21,
    '<svg/>',
  );
  const empty = composeQrSvg('triangle', '#ffffff', '#11130f', 'rounded', 21);
  for (const svg of [square, empty]) {
    assert.ok(!svg.includes('<mask'));
    assert.ok(!svg.includes('data-boundary-joins'));
  }
});
