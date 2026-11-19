// Mapa de reciclaje + cuenta + comentarios. Se carga DESPUÉS de script.js.
(() => {
  const $ = (s) => document.querySelector(s);
  const el = (tag, text = '', cls = '') => { const n = document.createElement(tag); n.textContent = text; if (cls) n.className = cls; return n; };

  // Centro inicial del mapa (editable)
  const DEFAULT = { lat: 19.17, lng: -96.13, zoom: 8 };

  const T = {
    es: {
      'nav.map': 'Mapa', 'nav.comments': 'Comentarios', 'auth.login': 'Iniciar sesión', 'auth.logout': 'Salir',
      'auth.register': 'Crear cuenta', 'auth.name': 'Nombre público', 'auth.email': 'Correo', 'auth.password': 'Contraseña (mínimo 8)',
      'auth.submit': 'Continuar', 'auth.cancel': 'Cerrar',
      'map.eyebrow': 'MAPA', 'map.title': 'Dónde vender tu reciclaje',
      'map.subtitle': 'Busca centros de acopio y chatarreras cercanos (datos de OpenStreetMap). Confirma precios y horarios por teléfono antes de ir.',
      'map.locate': '📍 Usar mi ubicación', 'map.search': '🔎 Buscar en esta zona', 'map.gmaps': 'Buscar también en Google Maps',
      'com.eyebrow': 'COMUNIDAD', 'com.title': 'Comentarios', 'com.subtitle': 'Comparte tips, dudas o lugares que conozcas.',
      'com.send': 'Publicar', 'com.more': 'Cargar más', 'com.login': 'Inicia sesión para comentar.',
      'ph.body': 'Escribe tu comentario (máx. 500 caracteres)',
      'm.offline': 'No se pudo conectar con el servidor. Cuenta y comentarios solo funcionan en el sitio publicado.',
      'm.empty': 'Aún no hay comentarios. ¡Escribe el primero!', 'm.del': 'Eliminar',
      'e.invalid_input': 'Revisa los datos: nombre de 2 a 30 caracteres, correo válido y contraseña de 8 o más.',
      'e.email_taken': 'Ese correo ya está registrado.', 'e.bad_credentials': 'Correo o contraseña incorrectos.',
      'e.too_many': 'Demasiados intentos. Espera unos minutos.', 'e.auth_required': 'Inicia sesión primero.', 'e.server': 'Error del servidor. Intenta de nuevo.',
      'map.zoom': 'Acércate más (zoom 10 o más) y vuelve a buscar.', 'map.none': 'Sin resultados en esta zona. Prueba en Google Maps o amplía la búsqueda.',
      'map.err': 'No se pudo cargar el mapa.', 'map.found': 'lugares encontrados', 'map.fail': 'No se pudo consultar OpenStreetMap. Intenta de nuevo.',
      'map.mat': 'Materiales', 'map.hours': 'Horario',
      'log.eyebrow': 'MI CUENTA', 'log.title': 'Mi registro de residuos', 'log.subtitle': 'Guarda tus mediciones desde la calculadora y consúltalas cuando quieras.',
      'log.save': '💾 Guardar en mi registro', 'log.saved': 'Guardado en tu registro.', 'log.login': 'Inicia sesión para ver tu registro.',
      'log.empty': 'Aún no tienes registros. Usa la calculadora y pulsa “Guardar en mi registro”.', 'log.more': 'Cargar más',
      'log.date': 'Fecha', 'log.total': 'Total', 'log.earn': 'Venta PET', 'log.records': 'registros', 'log.sumTotal': 'Total acumulado',
      'log.sumRecy': 'Reciclable', 'log.sumOrg': 'Orgánica',
      'e.limit_reached': 'Llegaste al límite de registros guardados. Elimina algunos para continuar.',
    },
    en: {
      'nav.map': 'Map', 'nav.comments': 'Comments', 'auth.login': 'Log in', 'auth.logout': 'Log out',
      'auth.register': 'Sign up', 'auth.name': 'Public name', 'auth.email': 'Email', 'auth.password': 'Password (min. 8)',
      'auth.submit': 'Continue', 'auth.cancel': 'Close',
      'map.eyebrow': 'MAP', 'map.title': 'Where to sell your recyclables',
      'map.subtitle': 'Find nearby collection centers and scrap yards (OpenStreetMap data). Confirm prices and hours by phone before going.',
      'map.locate': '📍 Use my location', 'map.search': '🔎 Search this area', 'map.gmaps': 'Also search on Google Maps',
      'com.eyebrow': 'COMMUNITY', 'com.title': 'Comments', 'com.subtitle': 'Share tips, questions or places you know.',
      'com.send': 'Post', 'com.more': 'Load more', 'com.login': 'Log in to comment.',
      'ph.body': 'Write your comment (max. 500 characters)',
      'm.offline': 'Could not reach the server. Accounts and comments only work on the published site.',
      'm.empty': 'No comments yet. Be the first!', 'm.del': 'Delete',
      'e.invalid_input': 'Check your data: name 2–30 characters, valid email and a password of 8+ characters.',
      'e.email_taken': 'That email is already registered.', 'e.bad_credentials': 'Wrong email or password.',
      'e.too_many': 'Too many attempts. Wait a few minutes.', 'e.auth_required': 'Please log in first.', 'e.server': 'Server error. Try again.',
      'map.zoom': 'Zoom in (level 10 or more) and search again.', 'map.none': 'No results here. Try Google Maps or widen the search.',
      'map.err': 'The map could not be loaded.', 'map.found': 'places found', 'map.fail': 'Could not query OpenStreetMap. Try again.',
      'map.mat': 'Materials', 'map.hours': 'Hours',
      'log.eyebrow': 'MY ACCOUNT', 'log.title': 'My waste log', 'log.subtitle': 'Save your measurements from the calculator and review them any time.',
      'log.save': '💾 Save to my log', 'log.saved': 'Saved to your log.', 'log.login': 'Log in to see your log.',
      'log.empty': 'No records yet. Use the calculator and press “Save to my log”.', 'log.more': 'Load more',
      'log.date': 'Date', 'log.total': 'Total', 'log.earn': 'PET sales', 'log.records': 'records', 'log.sumTotal': 'Total so far',
      'log.sumRecy': 'Recyclable', 'log.sumOrg': 'Organic',
      'e.limit_reached': 'You reached the saved-records limit. Delete some to continue.',
    },
  };
  for (const l of ['es', 'en']) Object.assign(translations[l], T[l]);
  const t = (k) => (translations[currentLang] && translations[currentLang][k]) || translations.es[k] || k;
  const errMsg = (c) => t(c === 'offline' ? 'm.offline' : 'e.' + c in translations.es ? 'e.' + c : 'e.server');

  async function api(path, opt = {}) {
    try {
      const r = await fetch('/api' + path, {
        credentials: 'same-origin', method: opt.method || 'GET',
        headers: opt.body ? { 'Content-Type': 'application/json' } : {},
        body: opt.body ? JSON.stringify(opt.body) : undefined,
      });
      const d = await r.json().catch(() => ({}));
      return r.ok ? d : { error: d.error || 'server' };
    } catch { return { error: 'offline' }; }
  }

  /* ---------- Cuenta ---------- */
  let user = null, mode = 'login';
  const dlg = $('#authDialog');
  function renderAuth() {
    $('#authBtn').textContent = user ? t('auth.logout') : t('auth.login');
    $('#userName').textContent = user ? user.name : '';
    $('#commentForm').hidden = !user;
    $('#commentLogin').hidden = !!user;
    $('#authNameField').hidden = mode !== 'register';
    $('#authName').required = mode === 'register';
    $('#authTabLogin').classList.toggle('active', mode === 'login');
    $('#authTabReg').classList.toggle('active', mode === 'register');
    $('#authPass').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    $('#commentBody').placeholder = t('ph.body');
    renderLog();
  }
  async function authToggle() {
    if (user) { await api('/logout', { method: 'POST', body: {} }); user = null; renderAuth(); loadComments(); loadLog(); }
    else { $('#authMsg').textContent = ''; dlg.showModal(); }
  }
  $('#authBtn').addEventListener('click', authToggle);
  $('#commentLoginBtn').addEventListener('click', authToggle);
  $('#authClose').addEventListener('click', () => dlg.close());
  $('#authTabLogin').addEventListener('click', () => { mode = 'login'; renderAuth(); });
  $('#authTabReg').addEventListener('click', () => { mode = 'register'; renderAuth(); });
  $('#authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = { email: $('#authEmail').value, password: $('#authPass').value };
    if (mode === 'register') body.name = $('#authName').value;
    const d = await api(mode === 'login' ? '/login' : '/register', { method: 'POST', body });
    if (d.error) { $('#authMsg').textContent = errMsg(d.error); return; }
    user = d.user; $('#authForm').reset(); dlg.close(); renderAuth(); loadComments(); loadLog();
  });

  /* ---------- Comentarios ---------- */
  let oldest = null;
  async function loadComments(more = false) {
    const list = $('#commentList');
    const d = await api('/comments' + (more && oldest ? '?before=' + oldest : ''));
    if (!more) list.replaceChildren();
    $('#commentMore').hidden = true;
    if (d.error) { if (!more) list.append(el('p', errMsg(d.error), 'muted-msg')); return; }
    if (!more && !d.items.length) list.append(el('p', t('m.empty'), 'muted-msg'));
    for (const c of d.items) {
      const card = el('article', '', 'comment');
      const head = el('div', '', 'comment-head');
      head.append(el('strong', c.author), el('time', new Date(c.created_at).toLocaleString(currentLang === 'es' ? 'es-MX' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })));
      card.append(head, el('p', c.body));
      if (c.canDelete) {
        const b = el('button', t('m.del'), 'link-btn'); b.type = 'button';
        b.addEventListener('click', async () => { await api('/comments/' + c.id, { method: 'DELETE' }); loadComments(); });
        card.append(b);
      }
      list.append(card);
      oldest = c.id;
    }
    $('#commentMore').hidden = !d.more;
  }
  $('#commentMore').addEventListener('click', () => loadComments(true));
  $('#commentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = await api('/comments', { method: 'POST', body: { body: $('#commentBody').value } });
    $('#commentMsg').textContent = d.error ? errMsg(d.error) : '';
    if (!d.error) { $('#commentBody').value = ''; loadComments(); }
  });

  /* ---------- Registro de residuos (por usuario) ---------- */
  let logOldest = null;
  const MATS = ['organic', 'pet', 'glass', 'paper', 'plastic'];
  const locale = () => (currentLang === 'es' ? 'es-MX' : 'en-US');
  const kg = (n) => Number(n).toLocaleString(locale(), { maximumFractionDigits: 2 }) + ' kg';
  function renderLog() {
    $('#logLogin').hidden = !!user;
    $('#logPanel').hidden = !user;
    const head = $('#logHead');
    head.replaceChildren();
    const tr = el('tr');
    for (const h of [t('log.date'), ...MATS.map((m) => t('chart.' + m)), t('log.total'), t('log.earn'), '']) tr.append(el('th', h));
    head.append(tr);
  }
  async function loadLog(more = false) {
    renderLog();
    if (!user) return;
    const body = $('#logBody');
    const d = await api('/waste' + (more && logOldest ? '?before=' + logOldest : ''));
    if (!more) body.replaceChildren();
    $('#logMore').hidden = true;
    if (d.error) { $('#logMsg').textContent = errMsg(d.error); return; }
    $('#logMsg').textContent = !more && !d.items.length ? t('log.empty') : '';
    if (!more) {
      const tt = d.totals, total = MATS.reduce((a, m) => a + tt[m], 0);
      const sum = $('#logSummary'); sum.replaceChildren();
      if (tt.n) sum.append(el('span', `${tt.n} ${t('log.records')}`), el('span', `${t('log.sumTotal')}: ${kg(total)}`),
        el('span', `${t('log.sumRecy')}: ${kg(total - tt.organic)}`), el('span', `${t('log.sumOrg')}: ${kg(tt.organic)}`));
    }
    for (const r of d.items) {
      const row = el('tr');
      row.append(el('td', new Date(r.created_at).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' })));
      for (const m of MATS) row.append(el('td', kg(r[m])));
      row.append(el('td', kg(MATS.reduce((a, m) => a + r[m], 0))));
      row.append(el('td', (r.pet * r.price).toLocaleString(locale(), { style: 'currency', currency: r.currency })));
      const cell = el('td'), b = el('button', t('m.del'), 'link-btn'); b.type = 'button';
      b.addEventListener('click', async () => { await api('/waste/' + r.id, { method: 'DELETE' }); loadLog(); });
      cell.append(b); row.append(cell);
      body.append(row);
      logOldest = r.id;
    }
    $('#logMore').hidden = !d.more;
  }
  $('#logMore').addEventListener('click', () => loadLog(true));
  $('#logLoginBtn').addEventListener('click', authToggle);
  $('#saveLogBtn').addEventListener('click', async () => {
    if (!user) { $('#authMsg').textContent = ''; dlg.showModal(); return; }
    const num = (id) => { const n = parseFloat($('#' + id).value); return Number.isFinite(n) && n >= 0 ? n : 0; };
    const body = { price: num('price'), currency: $('#currency').value === 'USD' ? 'USD' : 'MXN' };
    for (const m of MATS) body[m] = num(m);
    const d = await api('/waste', { method: 'POST', body });
    $('#logSaveMsg').textContent = d.error ? errMsg(d.error) : t('log.saved');
    if (!d.error) loadLog();
  });

  /* ---------- Mapa ---------- */
  let map, layer, curated = [];
  const popup = (p) => {
    const d = el('div');
    d.append(el('b', p.nombre || '—'));
    for (const [label, v] of [['', p.direccion], [t('map.mat'), p.materiales], [t('map.hours'), p.horario], ['☎', p.telefono]]) {
      if (v) d.append(el('div', (label ? label + ': ' : '') + v));
    }
    if (/^https?:\/\//.test(p.web || '')) { const a = el('a', p.web); a.href = p.web; a.target = '_blank'; a.rel = 'noopener noreferrer'; d.append(a); }
    return d;
  };
  const dot = (lat, lng, color, p) => L.circleMarker([lat, lng], { radius: 9, color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.95 }).bindPopup(popup(p)).addTo(layer);
  const setMsg = (s) => { const m = $('#mapMsg'); if (m) m.textContent = s; };

  function drawCurated() {
    for (const c of curated) {
      if (typeof c.lat === 'number' && typeof c.lng === 'number')
        dot(c.lat, c.lng, '#d97706', { ...c, materiales: (c.materiales || []).join(', ') });
    }
  }
  async function search() {
    if (map.getZoom() < 10) return setMsg(t('map.zoom'));
    const b = map.getBounds(), bb = [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()].join(',');
    const q = `[out:json][timeout:20];(nwr["amenity"="recycling"]["recycling_type"="centre"](${bb});nwr["shop"="scrap_yard"](${bb});nwr["industrial"="scrap_yard"](${bb}););out center tags 100;`;
    const c = map.getCenter();
    $('#mapGoogle').href = `https://www.google.com/maps/search/centro+de+acopio+reciclaje/@${c.lat},${c.lng},13z`;
    setMsg('…');
    try {
      const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      if (!r.ok) throw new Error(r.status);
      const { elements } = await r.json();
      layer.clearLayers(); drawCurated();
      for (const n of elements) {
        const lat = n.lat ?? n.center?.lat, lng = n.lon ?? n.center?.lon, tg = n.tags || {};
        if (lat == null) continue;
        const mats = Object.keys(tg).filter((k) => k.startsWith('recycling:') && tg[k] === 'yes').map((k) => k.slice(10).replace(/_/g, ' ')).join(', ');
        dot(lat, lng, '#16734b', { nombre: tg.name || tg.operator || 'Centro de reciclaje', direccion: [tg['addr:street'], tg['addr:housenumber']].filter(Boolean).join(' '), materiales: mats, horario: tg.opening_hours, telefono: tg.phone || tg['contact:phone'], web: tg.website || tg['contact:website'] });
      }
      setMsg(elements.length || curated.length ? `${elements.length + curated.length} ${t('map.found')}` : t('map.none'));
    } catch { setMsg(t('map.fail')); }
  }
  function initMap() {
    // El mapa puede estar oculto/comentado en index.html: sin #map no hay nada que iniciar.
    if (!$('#map')) return;
    if (!window.L) return setMsg(t('map.err'));
    map = L.map('map').setView([DEFAULT.lat, DEFAULT.lng], DEFAULT.zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    layer = L.layerGroup().addTo(map);
    fetch('data/centros.json').then((r) => r.json()).then((a) => { curated = Array.isArray(a) ? a : []; drawCurated(); }).catch(() => {});
    $('#mapSearch').addEventListener('click', search);
    $('#mapLocate').addEventListener('click', () => navigator.geolocation?.getCurrentPosition((p) => { map.setView([p.coords.latitude, p.coords.longitude], 13); search(); }, () => {}));
  }

  document.querySelectorAll('.lang-btn').forEach((b) => b.addEventListener('click', () => setTimeout(() => { renderAuth(); loadComments(); loadLog(); }, 0)));
  renderAuth();
  api('/me').then((d) => { user = d.user || null; renderAuth(); loadLog(); });
  loadComments();
  try { initMap(); } catch (e) { console.error('Mapa:', e); }
})();
