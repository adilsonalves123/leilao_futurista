/* Limpa caches que travam o Metro no Windows */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dirs = [
  path.join(root, '.expo'),
  path.join(root, 'node_modules', '.cache'),
  path.join(root, '.expo-test-bundle'),
  path.join(root, '.expo-tmp-export'),
];

for (const dir of dirs) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('removed:', path.relative(root, dir));
  } catch (e) {
    console.warn('skip:', dir, e.message);
  }
}

console.log('Cache limpo. Rode: npm run start:clean');
