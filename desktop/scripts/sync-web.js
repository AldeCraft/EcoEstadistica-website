// Copia el sitio (carpeta padre) a desktop/web para la versión SIN CONEXIÓN de la app.
// Chart.js y Leaflet se empaquetan desde npm y se reescriben las rutas del CDN en la copia.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const out = path.join(__dirname, '..', 'web');
const nm = path.join(__dirname, '..', 'node_modules');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'vendor'), { recursive: true });

for (const f of ['index.html', 'aviso-de-privacidad.html', 'style.css', 'extras.css', 'script.js', 'extras.js', 'favicon.png']) {
  fs.copyFileSync(path.join(root, f), path.join(out, f));
}
fs.cpSync(path.join(root, 'data'), path.join(out, 'data'), { recursive: true });

fs.copyFileSync(path.join(nm, 'chart.js', 'dist', 'chart.umd.js'), path.join(out, 'vendor', 'chart.umd.js'));
fs.copyFileSync(path.join(nm, 'leaflet', 'dist', 'leaflet.js'), path.join(out, 'vendor', 'leaflet.js'));
fs.copyFileSync(path.join(nm, 'leaflet', 'dist', 'leaflet.css'), path.join(out, 'vendor', 'leaflet.css'));
fs.cpSync(path.join(nm, 'leaflet', 'dist', 'images'), path.join(out, 'vendor', 'images'), { recursive: true });

const idx = path.join(out, 'index.html');
let html = fs.readFileSync(idx, 'utf8');
const before = html;
html = html
  .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js@[\d.]+\/dist\/chart\.umd\.js/, 'vendor/chart.umd.js')
  .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/leaflet@[\d.]+\/dist\/leaflet\.css/, 'vendor/leaflet.css')
  .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/leaflet@[\d.]+\/dist\/leaflet\.js/, 'vendor/leaflet.js');
if ((html.match(/cdn\.jsdelivr\.net/g) || []).length) {
  console.warn('Aviso: quedan referencias al CDN en index.html; revisa las rutas de Chart.js/Leaflet.');
}
if (html === before) console.warn('Aviso: no se reescribió ninguna ruta del CDN.');
fs.writeFileSync(idx, html);
console.log('Versión sin conexión lista en', out);
