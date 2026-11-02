export type ShapeType = 'circle' | 'square' | 'hexagon' | 'triangle';
export type DotStyle =
  | 'square'
  | 'dots'
  | 'rounded'
  | 'classy'
  | 'classy-rounded'
  | 'extra-rounded';

export const SHAPE_SIZE = 760;
export const QUIET_MODULES = 4;
// Keep the QR size fixed while bringing the decorative silhouette closer.
// This is a compact artistic border; the encoded matrix is never covered.
export const DECORATION_GAP_MODULES = 0;

type QrMatrix = { isDark: (row: number, column: number) => boolean };

function besideFinder(column: number, row: number, count: number) {
  const start = QUIET_MODULES;
  const end = start + count - 7;
  return [
    [start, start],
    [end, start],
    [start, end],
  ].some(
    ([x, y]) =>
      column >= x - 1 && column < x + 8 && row >= y - 1 && row < y + 8,
  );
}

// The complete QR (including its quiet zone) fits inside each silhouette.
export const SHAPE_LAYOUTS = {
  circle: { x: 132, y: 132, size: 496 },
  square: { x: 36, y: 36, size: 688 },
  hexagon: { x: 148, y: 148, size: 464 },
  triangle: { x: 220, y: 365, size: 320 },
} satisfies Record<ShapeType, { x: number; y: number; size: number }>;

export function shapeBackground(shape: ShapeType, color: string) {
  const geometry = {
    circle: '<circle cx="380" cy="380" r="360"',
    square: '<rect x="20" y="20" width="720" height="720" rx="58"',
    hexagon: '<polygon points="200,20 560,20 740,380 560,740 200,740 20,380"',
    triangle: '<polygon points="380,20 740,740 20,740"',
  };
  return `${geometry[shape]} fill="${color}"/>`;
}

function insideShape(shape: ShapeType, x: number, y: number) {
  const inset = 12;
  if (shape === 'circle') return Math.hypot(x - 380, y - 380) <= 360 - inset;
  if (shape === 'hexagon')
    return (
      y >= 20 + inset &&
      y <= 740 - inset &&
      Math.abs(x - 380) + Math.abs(y - 380) / 2 <= 360 - inset
    );
  if (shape === 'triangle')
    return y <= 740 - inset && Math.abs(x - 380) * 2 <= y - 20 - inset * 2;
  return false;
}

// Coordinate hashing avoids the repeating stripes produced by modular sums.
function occupied(column: number, row: number) {
  let value = Math.imul(column, 374761393) ^ Math.imul(row, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296 < 0.52;
}

function moduleSvg(
  x: number,
  y: number,
  size: number,
  style: DotStyle,
  neighbor: (dx: number, dy: number) => boolean,
) {
  if (style === 'dots')
    return `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}"/>`;
  if (style === 'square')
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}"/>`;

  const left = neighbor(-1, 0);
  const right = neighbor(1, 0);
  const top = neighbor(0, -1);
  const bottom = neighbor(0, 1);
  const count = Number(left) + Number(right) + Number(top) + Number(bottom);
  const classy = style === 'classy' || style === 'classy-rounded';
  if (!classy && count === 0)
    return `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}"/>`;

  const radius =
    style === 'extra-rounded' || style === 'classy-rounded' ? size : size / 2;
  const tl = !left && !top ? radius : 0;
  const tr = !classy && !right && !top ? radius : 0;
  const br = !right && !bottom ? radius : 0;
  const bl = !classy && !left && !bottom ? radius : 0;
  // Adjacent rounded corners share an edge; keep their combined radii within it.
  const scale = Math.min(
    1,
    size / Math.max(tl + tr, tr + br, br + bl, bl + tl, size),
  );
  const [a, b, c, d] = [tl, tr, br, bl].map((r) => r * scale);
  return `<path transform="translate(${x} ${y})" d="M${a} 0H${size - b}Q${size} 0 ${size} ${b}V${size - c}Q${size} ${size} ${size - c} ${size}H${d}Q0 ${size} 0 ${size - d}V${a}Q0 0 ${a} 0Z"/>`;
}

function shapePattern(
  shape: ShapeType,
  count: number,
  style: DotStyle,
  color: string,
  matrix?: QrMatrix,
) {
  const empty = { decoration: '', mask: '', joins: '' };
  if (shape === 'square') return empty;
  const layout = SHAPE_LAYOUTS[shape];
  const step = layout.size / (count + QUIET_MODULES * 2);
  const cells = new Set<string>();
  const minColumn = Math.floor(-layout.x / step);
  const minRow = Math.floor(-layout.y / step);
  const maxColumn = Math.ceil((SHAPE_SIZE - layout.x) / step);
  const maxRow = Math.ceil((SHAPE_SIZE - layout.y) / step);
  const total = count + QUIET_MODULES * 2;
  const inset = QUIET_MODULES - DECORATION_GAP_MODULES;
  for (let row = minRow; row < maxRow; row++) {
    for (let column = minColumn; column < maxColumn; column++) {
      if (
        row >= inset &&
        row < total - inset &&
        column >= inset &&
        column < total - inset
      )
        continue;
      // Preserve the finders' outer separators without a frame around the data.
      if (besideFinder(column, row, count)) continue;
      const x = layout.x + column * step;
      const y = layout.y + row * step;
      if (
        occupied(column, row) &&
        [
          [x, y],
          [x + step, y],
          [x, y + step],
          [x + step, y + step],
        ].every(([px, py]) => insideShape(shape, px, py))
      )
        cells.add(`${column},${row}`);
    }
  }
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  const isCore = (column: number, row: number) =>
    column >= QUIET_MODULES &&
    row >= QUIET_MODULES &&
    column < total - QUIET_MODULES &&
    row < total - QUIET_MODULES;
  const dark = (column: number, row: number) =>
    isCore(column, row)
      ? !!matrix?.isDark(row - QUIET_MODULES, column - QUIET_MODULES)
      : cells.has(`${column},${row}`);
  const boundary = new Set<string>();
  const modules = [...cells].map((key) => {
    const [column, row] = key.split(',').map(Number);
    const coreNeighbors = directions.filter(
      ([dx, dy]) =>
        isCore(column + dx, row + dy) &&
        dark(column + dx, row + dy) &&
        !besideFinder(column + dx, row + dy, count),
    );
    for (const [dx, dy] of coreNeighbors)
      boundary.add(`${column + dx},${row + dy}`);
    return moduleSvg(
      layout.x + column * step,
      layout.y + row * step,
      step,
      // A pair of boundary dots becomes a capsule; interior dots stay circular.
      style === 'dots' && coreNeighbors.length ? 'rounded' : style,
      (dx, dy) => {
        if (style === 'dots')
          return coreNeighbors.some(([nx, ny]) => nx === dx && ny === dy);
        return dark(column + dx, row + dy);
      },
    );
  });
  const cutouts: string[] = [];
  const joins: string[] = [];
  for (const key of boundary) {
    const [column, row] = key.split(',').map(Number);
    const x = layout.x + column * step;
    const y = layout.y + row * step;
    // Replace only an already-dark edge cell. White cells, finders and their
    // separators are never painted over; the encoded matrix stays unchanged.
    cutouts.push(`<rect x="${x}" y="${y}" width="${step}" height="${step}"/>`);
    joins.push(
      moduleSvg(x, y, step, style === 'dots' ? 'rounded' : style, (dx, dy) =>
        style === 'dots'
          ? cells.has(`${column + dx},${row + dy}`)
          : dark(column + dx, row + dy),
      ),
    );
  }
  return {
    decoration: `<g fill="${color}" data-decoration="${style}">${modules.join('')}</g>`,
    mask: boundary.size
      ? `<defs><mask id="qr-edge-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="760" height="760"><rect width="760" height="760" fill="white"/><g fill="black">${cutouts.join('')}</g></mask></defs>`
      : '',
    joins: boundary.size
      ? `<g fill="${color}" data-boundary-joins="${boundary.size}">${joins.join('')}</g>`
      : '',
  };
}

export function composeQrSvg(
  shape: ShapeType,
  background: string | null,
  color: string,
  style: DotStyle,
  count: number,
  core = '',
  matrix?: QrMatrix,
) {
  const { x, y, size } = SHAPE_LAYOUTS[shape];
  const pattern = core
    ? shapePattern(shape, count, style, color, matrix)
    : null;
  const qr = core
    ? `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 640 640">${core}</svg>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="760" viewBox="0 0 760 760">${background === null ? '' : shapeBackground(shape, background)}${pattern?.decoration ?? ''}${pattern?.mask ?? ''}${pattern?.mask ? `<g mask="url(#qr-edge-mask)">${qr}</g>` : qr}${pattern?.joins ?? ''}</svg>`;
}
