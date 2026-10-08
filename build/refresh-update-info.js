// หลังเซ็น installer แล้ว ไฟล์เปลี่ยน จึงต้องคำนวณ sha512/size ใน latest.yml และไฟล์ .blockmap ใหม่
// ไม่งั้นตัวอัปเดตอัตโนมัติ (electron-updater) จะตรวจ hash ไม่ผ่าน
//   node build/refresh-update-info.js dist
const fs = require('node:fs');
const path = require('node:path');
const { buildBlockMap } = require('app-builder-lib/out/targets/blockmap/blockmap');

async function main(dir) {
  const setup = path.join(dir, 'FramePort-Setup.exe');
  const latest = path.join(dir, 'latest.yml');
  const { sha512, size } = await buildBlockMap(setup, 'gzip', `${setup}.blockmap`);
  const yml = fs.readFileSync(latest, 'utf8')
    .replace(/^(\s*sha512: ).*$/gm, `$1${sha512}`)
    .replace(/^(\s*size: ).*$/gm, `$1${size}`);
  fs.writeFileSync(latest, yml);
  console.log(`latest.yml: size ${size}, sha512 ${sha512}`);
}

main(process.argv[2] || 'dist').catch((error) => {
  console.error(error);
  process.exit(1);
});
