/**
 * NativeWind/react-native-css-interop pode instalar um binário lightningcss
 * quebrado em node_modules aninhados no Windows. Copiamos o binário funcional da raiz.
 */
const fs = require('fs');
const path = require('path');

if (process.platform !== 'win32') {
  process.exit(0);
}

const root = process.cwd();
const source = path.join(root, 'node_modules', 'lightningcss-win32-x64-msvc', 'lightningcss.win32-x64-msvc.node');
const targetDir = path.join(
  root,
  'node_modules',
  'react-native-css-interop',
  'node_modules',
  'lightningcss-win32-x64-msvc',
);
const target = path.join(targetDir, 'lightningcss.win32-x64-msvc.node');

if (!fs.existsSync(source) || !fs.existsSync(targetDir)) {
  process.exit(0);
}

try {
  fs.copyFileSync(source, target);
  console.log('[postinstall] lightningcss win32-x64-msvc sincronizado para NativeWind.');
} catch {
  /* ignore — ambiente sem nested lightningcss */
}
