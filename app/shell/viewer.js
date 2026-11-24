// Visor de PDF integrado (pdf.js). Abre solo archivos de la carpeta docs/ incluida en la app.
import * as pdfjsLib from './vendor/pdfjs/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;

const $ = (id) => document.getElementById(id);
const en = /^en/i.test(navigator.language || '');
const T = en
  ? { back: ' Back', dl: ' Download', loading: 'Loading…', fail: 'Could not open the PDF.', pages: 'pages' }
  : { back: ' Volver', dl: ' Descargar', loading: 'Cargando…', fail: 'No se pudo abrir el PDF.', pages: 'páginas' };
$('tBack').textContent = T.back; $('tDl').textContent = T.dl; $('status').textContent = T.loading;

const file = new URLSearchParams(location.search).get('file') || '';
// Solo se permiten PDF dentro de /docs/ (evita abrir cualquier otra ruta).
if (!/^\/?docs\/[^/\\]+\.pdf$/i.test(file) || file.includes('..')) {
  $('status').textContent = T.fail;
  throw new Error('Ruta de PDF no permitida');
}
const url = new URL('/' + file.replace(/^\//, ''), location.origin).href;
let niceName = 'documento';
try { niceName = decodeURIComponent(file.split('/').pop()); } catch (_) { niceName = file.split('/').pop(); }
$('title').textContent = niceName.replace(/\.pdf$/i, '').replace(/_/g, ' ');
document.title = $('title').textContent + ' | EcoEstadística';

$('back').addEventListener('click', () => { if (history.length > 1) history.back(); else location.href = 'index.html'; });

let pdf = null, zoom = 1, pageObjs = [], observer = null;
const MIN_ZOOM = 0.5, MAX_ZOOM = 3;

function fitWidth() { return Math.min(Math.max(document.documentElement.clientWidth - 24, 200), 980); }

async function layout() {
  if (observer) observer.disconnect();
  const host = $('pages'); host.replaceChildren();
  $('zoomLabel').textContent = Math.round(zoom * 100) + '%';
  const cssW = fitWidth() * zoom;
  observer = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) renderPage(e.target);
  }, { rootMargin: '600px 0px' });
  for (const page of pageObjs) {
    const base = page.getViewport({ scale: 1 });
    const scale = cssW / base.width;
    const vp = page.getViewport({ scale });
    const box = document.createElement('div');
    box.className = 'page'; box.style.width = vp.width + 'px'; box.style.height = vp.height + 'px';
    box._page = page; box._vp = vp; box._done = false;
    host.append(box); observer.observe(box);
  }
}

async function renderPage(box) {
  if (box._done) return; box._done = true;
  const vp = box._vp;
  // Limita los píxeles del lienzo para no agotar la memoria en teléfonos.
  let dpr = window.devicePixelRatio || 1;
  while (vp.width * dpr * vp.height * dpr > 14e6 && dpr > 1) dpr -= 0.5;
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr);
  canvas.style.width = vp.width + 'px'; canvas.style.height = vp.height + 'px';
  const ctx = canvas.getContext('2d');
  box.append(canvas);
  try {
    await box._page.render({ canvas, canvasContext: ctx, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined }).promise;
  } catch (e) { console.error(e); }
}

function setZoom(z) {
  const nz = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100));
  if (nz === zoom) return; zoom = nz; layout();
}
$('zIn').addEventListener('click', () => setZoom(zoom + 0.25));
$('zOut').addEventListener('click', () => setZoom(zoom - 0.25));
let resizeTimer = 0;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 200); });

$('dl').addEventListener('click', async () => {
  try {
    const buf = await (await fetch(url)).arrayBuffer();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([buf], { type: 'application/pdf' }));
    a.download = niceName; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch (e) { console.error(e); }
});

try {
  pdf = await pdfjsLib.getDocument({
    url,
    standardFontDataUrl: new URL('vendor/pdfjs/standard_fonts/', location.href).href,
    wasmUrl: new URL('vendor/pdfjs/wasm/', location.href).href,
  }).promise;
  for (let i = 1; i <= pdf.numPages; i++) pageObjs.push(await pdf.getPage(i));
  $('status').textContent = `${pdf.numPages} ${T.pages}`;
  await layout();
} catch (e) {
  console.error(e);
  $('status').textContent = T.fail;
}
