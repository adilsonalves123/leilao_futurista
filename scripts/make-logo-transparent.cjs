const path = require('path');
const sharp = require('sharp');

const input = path.join(__dirname, '../assets/images/levou/logo-levou.png');
const temp = path.join(__dirname, '../assets/images/levou/logo-levou.tmp.png');
const output = path.join(__dirname, '../assets/images/levou/logo-levou.png');

const BLACK_THRESHOLD = 35;

(async () => {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD) {
      data[i + 3] = 0;
    }
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 1 })
    .png()
    .toFile(temp);

  const fs = require('fs');
  fs.renameSync(temp, output);

  console.log('Logo com fundo transparente salva em:', output);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
