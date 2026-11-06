const { app, BrowserWindow, Menu, shell, protocol, session } = require('electron');
const fs = require('fs/promises');
const path = require('path');

// Sitio en línea (cuentas, comentarios y base de datos viven en el Worker de Cloudflare).
const SITE_URL = 'https://eco-estadistica.alderojasturrent.workers.dev/';
const SITE_ORIGIN = new URL(SITE_URL).origin;
// Copia local (calculadora, gráfica y mapa sin cuentas) para cuando no hay Internet.
const OFFLINE_URL = 'app://local/index.html';
const WEB_DIR = path.join(__dirname, 'web');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
};

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

let win = null;
let offline = false;

function registerOfflineProtocol() {
  protocol.handle('app', async (request) => {
    const { pathname } = new URL(request.url);
    // Sin servidor local: la API responde "offline" y el sitio ya sabe mostrarlo.
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'offline' }), {
        status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    const file = path.normalize(path.join(WEB_DIR, rel));
    if (!file.startsWith(WEB_DIR + path.sep)) return new Response('Prohibido', { status: 403 });
    try {
      const data = await fs.readFile(file);
      return new Response(data, { headers: { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' } });
    } catch {
      return new Response('No encontrado', { status: 404 });
    }
  });
}

function goOnline() { offline = false; win.loadURL(SITE_URL); }
function goOffline() { offline = true; win.loadURL(OFFLINE_URL); }

function buildMenu() {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        { label: 'Abrir versión en línea', accelerator: 'CmdOrCtrl+Shift+O', click: goOnline },
        { label: 'Abrir versión sin conexión', click: goOffline },
        { type: 'separator' },
        { role: 'quit', label: 'Salir' },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom normal' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
      ],
    },
    {
      label: 'Ayuda',
      submenu: [
        { label: 'Repositorio en GitHub', click: () => shell.openExternal('https://github.com/AldeCraft/EcoEstadistica-website') },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 380, minHeight: 600,
    title: 'EcoEstadística', backgroundColor: '#123b2a',
    icon: path.join(__dirname, 'web', 'favicon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  // Enlaces externos y ventanas nuevas: al navegador del sistema.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    const u = new URL(url);
    if (u.origin === SITE_ORIGIN || u.protocol === 'app:') return;
    event.preventDefault();
    if (/^https?:/i.test(url)) shell.openExternal(url);
  });

  // Si el sitio en línea no carga (sin Internet, DNS, etc.), abre la copia local.
  win.webContents.on('did-fail-load', (_e, code, _desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3 /* cancelada */ || offline) return;
    if (url.startsWith(SITE_ORIGIN)) goOffline();
  });
  win.webContents.on('page-title-updated', (e, title) => {
    e.preventDefault();
    win.setTitle(offline ? `${title} — sin conexión` : title);
  });

  goOnline();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    registerOfflineProtocol();
    // La app no necesita permisos especiales (cámara, notificaciones, etc.).
    session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
    buildMenu();
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
