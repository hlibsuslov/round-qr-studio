const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const sharp = require('sharp');
const {
  QRCodeStyling,
} = require('qr-code-styling/lib/qr-code-styling.common.js');

const outputDir = path.resolve(__dirname, '../../../outputs');
const svgPath = path.join(outputDir, 'mypenger-onboarding-round-qr.svg');
const pngPath = path.join(outputDir, 'mypenger-onboarding-round-qr.png');

const qrCode = new QRCodeStyling({
  jsdom: JSDOM,
  type: 'svg',
  shape: 'circle',
  width: 1600,
  height: 1600,
  margin: 110,
  data: 'https://mypenger.com/onboarding',
  qrOptions: { errorCorrectionLevel: 'H' },
  dotsOptions: { color: '#11130f', type: 'dots' },
  cornersSquareOptions: { color: '#11130f', type: 'extra-rounded' },
  cornersDotOptions: { color: '#11130f', type: 'dot' },
  backgroundOptions: { color: '#ffffff' },
});

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const svg = await qrCode.getRawData('svg');
  const buffer = Buffer.isBuffer(svg)
    ? svg
    : Buffer.from(await svg.arrayBuffer());
  fs.writeFileSync(svgPath, buffer);
  await sharp(buffer)
    .resize(800, 800)
    .png({ compressionLevel: 9 })
    .toFile(pngPath);
  console.log(svgPath);
  console.log(pngPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
