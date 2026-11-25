// Pone la versión del tag (por ejemplo v3.1.2) en tauri.conf.json, package.json y Cargo.toml.
// Así la versión de la app siempre coincide con el release y el aviso de actualización no se repite.
// Uso: node scripts/set-version.js v3.1.2
const fs = require('fs');
const path = require('path');

const tag = process.argv[2] || '';
const m = /^v?(\d+\.\d+\.\d+)$/.exec(tag);
if (!m) {
  console.log(`El tag "${tag}" no tiene el formato vX.Y.Z; se conserva la versión de los archivos.`);
  process.exit(0);
}
const version = m[1];
const root = path.join(__dirname, '..');

function setJson(file) {
  const p = path.join(root, file);
  const text = fs.readFileSync(p, 'utf8');
  const out = text.replace(/("version"\s*:\s*")[^"]+(")/, `$1${version}$2`);
  fs.writeFileSync(p, out);
}
setJson('package.json');
setJson('src-tauri/tauri.conf.json');

const cargo = path.join(root, 'src-tauri', 'Cargo.toml');
fs.writeFileSync(cargo, fs.readFileSync(cargo, 'utf8').replace(/^version = "[^"]+"/m, `version = "${version}"`));
console.log(`Versión de la app: ${version}`);
