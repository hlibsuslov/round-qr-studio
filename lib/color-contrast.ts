export const MIN_CONTRAST = 4.5;

function luminance(hex: string) {
  const rgb = hex
    .replace('#', '')
    .match(/.{2}/g)
    ?.map((value) => parseInt(value, 16) / 255) ?? [0, 0, 0];
  const linear = rgb.map((value) =>
    value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function contrastRatio(first: string, second: string) {
  const high = Math.max(luminance(first), luminance(second));
  const low = Math.min(luminance(first), luminance(second));
  return (high + 0.05) / (low + 0.05);
}

export function ensureContrast(current: string, against: string) {
  if (contrastRatio(current, against) >= MIN_CONTRAST) return current;

  const dark = '#11130f';
  const white = '#ffffff';
  const darkContrast = contrastRatio(dark, against);
  const whiteContrast = contrastRatio(white, against);
  if (darkContrast >= MIN_CONTRAST && darkContrast >= whiteContrast)
    return dark;
  // Near middle gray, pure black can pass when the softer dark preset cannot.
  return contrastRatio('#000000', against) > whiteContrast ? '#000000' : white;
}
