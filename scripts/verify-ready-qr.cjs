const path = require('node:path');
const jsQR = require('jsqr');
const sharp = require('sharp');

const pngPath = path.resolve(
  __dirname,
  '../../../outputs/mypenger-onboarding-round-qr.png',
);
const expected = 'https://mypenger.com/onboarding';

async function decode(size, angle) {
  const { data, info } = await sharp(pngPath)
    .resize(size, size)
    .rotate(angle, { background: '#ffffff' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const result = jsQR(new Uint8ClampedArray(data), info.width, info.height, {
    inversionAttempts: 'dontInvert',
  });
  const value = result?.data ?? 'NOT_DECODED';
  console.log(`${size}px @ ${angle}deg: ${value}`);
  if (value !== expected) process.exitCode = 1;
}

async function main() {
  for (const size of [800, 500, 320, 220]) await decode(size, 0);
  for (const angle of [-8, 8]) await decode(500, angle);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
