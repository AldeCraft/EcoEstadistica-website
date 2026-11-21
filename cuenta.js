// Área privada "Mi cuenta": registros del usuario, filtros, gráfica y descargas. Independiente de script.js.
(() => {
  const $ = (s) => document.querySelector(s);
  const el = (tag, text = '', cls = '') => { const n = document.createElement(tag); n.textContent = text; if (cls) n.className = cls; return n; };
  const MATS = ['organic', 'pet', 'glass', 'paper', 'plastic'];
  const PAGE = 20;
  const COLORS = { organic: '#6b8e23', pet: '#2e9d67', glass: '#3b82c4', paper: '#d9a441', plastic: '#d9534f' };

  const TR = {
    es: {
      brand: 'EcoEstadística', 'nav.home': 'Inicio', 'nav.env': 'Gestión ambiental', logout: 'Salir', login: 'Iniciar sesión',
      'gate.title': 'Área exclusiva para usuarios registrados', 'gate.text': 'Inicia sesión para ver, filtrar y descargar los registros guardados en tu cuenta.',
      'gate.signup': '¿No tienes cuenta? Créala desde la página principal.', email: 'Correo', password: 'Contraseña',
      title: 'Mi cuenta', 'ind.title': 'Mis indicadores ambientales', 'trend.title': 'Evolución mensual (kg)',
      'rec.title': 'Mis registros', from: 'Desde', to: 'Hasta', clear: 'Quitar filtros', prev: '← Anterior', next: 'Siguiente →',
      'dl.title': 'Descargar', 'dl.hint': 'Se descargan los registros que coinciden con el filtro actual.', 'dl.txt': 'Informe (TXT)', 'dl.print': 'Imprimir / PDF',
      'prof.title': 'Perfil y privacidad', name: 'Nombre público', save: 'Guardar', priv: 'Aviso de privacidad',
      'del.title': 'Eliminar mi cuenta', 'del.text': 'Se borrarán de forma permanente tu cuenta, tus registros de residuos y tus comentarios. Descarga tus datos antes si los necesitas. Esta acción no se puede deshacer.',
      'del.pass': 'Escribe tu contraseña para confirmar', 'del.btn': 'Eliminar definitivamente',
      footer: 'Separar residuos es el primer paso. Medirlos nos ayuda a mejorar.',
      dark: 'Modo oscuro', light: 'Modo claro',
      date: 'Fecha', total: 'Total', earn: 'Venta PET', del: 'Eliminar', organic: 'Orgánica', pet: 'PET', glass: 'Vidrio', paper: 'Papel', plastic: 'Plástico',
      'k.total': 'Total registrado', 'k.recy': 'Reciclable', 'k.recyPct': 'Tasa de reciclaje', 'k.compost': 'Composta disponible', 'k.earn': 'Venta de PET estimada', 'k.records': 'Registros',
      'k.recyDesc': 'PET + vidrio + papel + plástico', 'k.recyPctDesc': 'reciclable ÷ total', 'k.compostDesc': 'materia orgánica', 'k.recordsDesc': 'en el periodo filtrado',
      'k.vs': 'vs. mes anterior', 'k.vsNone': 'sin mes anterior para comparar',
      since: 'Cuenta creada el', count: 'registros', of: 'de', page: 'Página',
      empty: 'No hay registros en este periodo. Guárdalos desde la calculadora de la página principal.',
      noTrend: 'Aún no hay datos para graficar.', confirmDel: '¿Eliminar este registro?', nameSaved: 'Nombre actualizado.', delDone: 'Cuenta eliminada.',
      'e.offline': 'No se pudo conectar con el servidor. Esta área solo funciona en el sitio publicado.',
      'e.bad_credentials': 'Correo o contraseña incorrectos.', 'e.too_many': 'Demasiados intentos. Espera unos minutos.',
      'e.auth_required': 'Tu sesión expiró. Inicia sesión de nuevo.', 'e.invalid_input': 'Revisa los datos ingresados.', 'e.server': 'Error del servidor. Intenta de nuevo.',
      'e.truncated': 'Se muestran solo los 2000 registros más antiguos.',
      rep: 'EcoEstadística — Informe de registros', gen: 'Generado', period: 'Periodo', all: 'todos',
    },
    en: {
      brand: 'EcoStatistics', 'nav.home': 'Home', 'nav.env': 'Environmental management', logout: 'Log out', login: 'Log in',
      'gate.title': 'Area for registered users only', 'gate.text': 'Log in to view, filter and download the records saved in your account.',
      'gate.signup': "Don't have an account? Create one from the home page.", email: 'Email', password: 'Password',
      title: 'My account', 'ind.title': 'My environmental indicators', 'trend.title': 'Monthly trend (kg)',
      'rec.title': 'My records', from: 'From', to: 'To', clear: 'Clear filters', prev: '← Previous', next: 'Next →',
      'dl.title': 'Download', 'dl.hint': 'Downloads the records matching the current filter.', 'dl.txt': 'Report (TXT)', 'dl.print': 'Print / PDF',
      'prof.title': 'Profile and privacy', name: 'Public name', save: 'Save', priv: 'Privacy notice',
      'del.title': 'Delete my account', 'del.text': 'Your account, waste records and comments will be permanently deleted. Download your data first if you need it. This cannot be undone.',
      'del.pass': 'Enter your password to confirm', 'del.btn': 'Delete permanently',
      footer: 'Separating waste is the first step. Measuring it helps us improve.',
      dark: 'Dark mode', light: 'Light mode',
      date: 'Date', total: 'Total', earn: 'PET sales', del: 'Delete', organic: 'Organic', pet: 'PET', glass: 'Glass', paper: 'Paper', plastic: 'Plastic',
      'k.total': 'Total recorded', 'k.recy': 'Recyclable', 'k.recyPct': 'Recycling rate', 'k.compost': 'Compost available', 'k.earn': 'Estimated PET sales', 'k.records': 'Records',
      'k.recyDesc': 'PET + glass + paper + plastic', 'k.recyPctDesc': 'recyclable ÷ total', 'k.compostDesc': 'organic matter', 'k.recordsDesc': 'in the filtered period',
      'k.vs': 'vs. previous month', 'k.vsNone': 'no previous month to compare',
      since: 'Account created on', count: 'records', of: 'of', page: 'Page',
      empty: 'No records in this period. Save them from the calculator on the home page.',
      noTrend: 'No data to chart yet.', confirmDel: 'Delete this record?', nameSaved: 'Name updated.', delDone: 'Account deleted.',
      'e.offline': 'Could not reach the server. This area only works on the published site.',
      'e.bad_credentials': 'Wrong email or password.', 'e.too_many': 'Too many attempts. Wait a few minutes.',
      'e.auth_required': 'Your session expired. Please log in again.', 'e.invalid_input': 'Check the data entered.', 'e.server': 'Server error. Try again.',
      'e.truncated': 'Only the oldest 2000 records are shown.',
      rep: 'EcoStatistics — Records report', gen: 'Generated', period: 'Period', all: 'all',
    },
  };

  let lang = 'es';
  try { const s = localStorage.getItem('ecoestadistica-lang'); if (s === 'en' || s === 'es') lang = s; } catch (_) {}
  const t = (k) => TR[lang][k] ?? TR.es[k] ?? k;
  const locale = () => (lang === 'es' ? 'es-MX' : 'en-US');
  const kg = (n) => Number(n).toLocaleString(locale(), { maximumFractionDigits: 2 }) + ' kg';
  const money = (n, c) => Number(n).toLocaleString(locale(), { style: 'currency', currency: c });
  const fdate = (ms, o = { dateStyle: 'medium', timeStyle: 'short' }) => new Date(ms).toLocaleString(locale(), o);
  const errMsg = (c) => t('e.' + c) !== 'e.' + c ? t('e.' + c) : t('e.server');
  const tot = (r) => MATS.reduce((a, m) => a + r[m], 0);

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

  let user = null, account = null, all = [], view = [], page = 0, chart = null;

  /* ---------- Idioma y tema ---------- */
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n); });
    document.querySelectorAll('.lang-btn').forEach((b) => b.classList.toggle('active', b.dataset.lang === lang));
    const dark = document.body.classList.contains('dark-mode');
    $('#themeLabel').textContent = dark ? t('light') : t('dark');
    $('#themeToggle').setAttribute('aria-pressed', String(dark));
    $('#trendChart').setAttribute('aria-label', t('trend.title'));
    if (user) { renderHead(); render(); renderProfile(); }
  }
  document.querySelectorAll('.lang-btn').forEach((b) => b.addEventListener('click', () => {
    lang = b.dataset.lang; try { localStorage.setItem('ecoestadistica-lang', lang); } catch (_) {} applyLang();
  }));
  try { if (localStorage.getItem('ecoestadistica-theme') === 'dark') document.body.classList.add('dark-mode'); } catch (_) {}
  $('#themeToggle').addEventListener('click', () => {
    const dark = document.body.classList.toggle('dark-mode');
    try { localStorage.setItem('ecoestadistica-theme', dark ? 'dark' : 'light'); } catch (_) {}
    applyLang();
  });

  /* ---------- Acceso ---------- */
  function showGate(msg = '') {
    user = null; $('#gate').hidden = false; $('#panel').hidden = true;
    $('#logoutBtn').hidden = true; $('#userName').textContent = ''; $('#lgMsg').textContent = msg;
  }
  async function enter() {
    const [me, acc, ex] = await Promise.all([api('/me'), api('/account'), api('/waste/export')]);
    if (me.error === 'offline') return showGate(t('e.offline'));
    if (!me.user) return showGate();
    user = me.user; account = acc.account || null; all = ex.items || [];
    $('#gate').hidden = true; $('#panel').hidden = false; $('#logoutBtn').hidden = false; $('#userName').textContent = user.name;
    $('#mainMsg').textContent = ex.error ? errMsg(ex.error) : (all.length >= 2000 ? t('e.truncated') : '');
    renderHead(); renderProfile(); refilter();
  }
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = await api('/login', { method: 'POST', body: { email: $('#lgEmail').value, password: $('#lgPass').value } });
    if (d.error) return showGate(errMsg(d.error));
    $('#loginForm').reset(); enter();
  });
  $('#logoutBtn').addEventListener('click', async () => { await api('/logout', { method: 'POST', body: {} }); all = []; showGate(); });

  /* ---------- Filtros ---------- */
  const dayStart = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
  function refilter() {
    const f = $('#fFrom').value, to = $('#fTo').value;
    const a = f ? dayStart(f) : -Infinity, b = to ? dayStart(to) + 86400000 : Infinity;
    view = all.filter((r) => r.created_at >= a && r.created_at < b).slice().reverse(); // más recientes primero
    page = 0; render();
  }
  $('#fFrom').addEventListener('change', refilter);
  $('#fTo').addEventListener('change', refilter);
  $('#fClear').addEventListener('click', () => { $('#fFrom').value = ''; $('#fTo').value = ''; refilter(); });

  /* ---------- Render ---------- */
  function renderHead() {
    const tr = el('tr');
    for (const h of [t('date'), ...MATS.map(t), t('total'), t('earn'), '']) tr.append(el('th', h));
    $('#recHead').replaceChildren(tr);
  }
  function renderProfile() {
    if (!account) return;
    $('#profEmail').textContent = account.email;
    if (document.activeElement !== $('#profName')) $('#profName').value = account.name;
    $('#memberSince').textContent = `${t('since')} ${fdate(account.created_at, { dateStyle: 'long' })}`;
  }
  const monthKey = (ms) => { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };

  function renderKpis() {
    const sums = Object.fromEntries(MATS.map((m) => [m, view.reduce((a, r) => a + r[m], 0)]));
    const total = MATS.reduce((a, m) => a + sums[m], 0), recy = total - sums.organic;
    const earn = {};
    for (const r of view) earn[r.currency] = (earn[r.currency] || 0) + r.pet * r.price;
    const earnTxt = Object.keys(earn).length ? Object.entries(earn).map(([c, v]) => money(v, c)).join(' + ') : money(0, 'MXN');
    // Comparación del último mes con registros contra el anterior (sobre todos los registros, no solo el filtro).
    const byM = {}; for (const r of all) byM[monthKey(r.created_at)] = (byM[monthKey(r.created_at)] || 0) + tot(r);
    const keys = Object.keys(byM).sort(); let vs = t('k.vsNone');
    if (keys.length >= 2) {
      const cur = byM[keys.at(-1)], prev = byM[keys.at(-2)];
      if (prev > 0) { const p = ((cur - prev) / prev) * 100; vs = `${p > 0 ? '+' : ''}${p.toFixed(1)}% ${t('k.vs')}`; }
    }
    const cards = [
      [t('k.total'), kg(total), vs], [t('k.recy'), kg(recy), t('k.recyDesc')],
      [t('k.recyPct'), total ? (recy / total * 100).toFixed(1) + '%' : '0%', t('k.recyPctDesc')],
      [t('k.compost'), kg(sums.organic), t('k.compostDesc')], [t('k.earn'), earnTxt, t('pet')], [t('k.records'), String(view.length), t('k.recordsDesc')],
    ];
    $('#kpis').replaceChildren(...cards.map(([a, b, c]) => { const d = el('div', '', 'kpi'); d.append(el('span', a), el('strong', b), el('small', c)); return d; }));
  }

  function renderChart() {
    const byM = {};
    for (const r of view) { const k = monthKey(r.created_at); byM[k] ??= Object.fromEntries(MATS.map((m) => [m, 0])); for (const m of MATS) byM[k][m] += r[m]; }
    const keys = Object.keys(byM).sort();
    $('#trendNote').textContent = keys.length ? '' : t('noTrend');
    if (chart) { chart.destroy(); chart = null; }
    if (!keys.length || !window.Chart) return;
    const dark = document.body.classList.contains('dark-mode'), txt = dark ? '#f0f3f1' : '#25372f', grid = dark ? '#292e2a' : '#dfe8e2';
    chart = new Chart($('#trendChart'), {
      type: 'bar',
      data: {
        labels: keys.map((k) => { const [y, m] = k.split('-'); return new Date(y, m - 1, 1).toLocaleDateString(locale(), { month: 'short', year: 'numeric' }); }),
        datasets: MATS.map((m) => ({ label: t(m), data: keys.map((k) => Math.round(byM[k][m] * 100) / 100), backgroundColor: COLORS[m] })),
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { x: { stacked: true, ticks: { color: txt }, grid: { color: grid } }, y: { stacked: true, beginAtZero: true, ticks: { color: txt }, grid: { color: grid } } },
        plugins: { legend: { labels: { color: txt } } },
      },
    });
  }

  function render() {
    if (!user) return;
    renderKpis(); renderChart();
    const pages = Math.max(1, Math.ceil(view.length / PAGE)); page = Math.min(page, pages - 1);
    const body = $('#recBody'); body.replaceChildren();
    $('#recCount').textContent = view.length ? `${view.length} ${t('count')} ${t('of')} ${all.length}` : t('empty');
    for (const r of view.slice(page * PAGE, page * PAGE + PAGE)) {
      const row = el('tr');
      row.append(el('td', fdate(r.created_at)));
      for (const m of MATS) row.append(el('td', kg(r[m])));
      row.append(el('td', kg(tot(r))), el('td', money(r.pet * r.price, r.currency)));
      const cell = el('td'), b = el('button', t('del'), 'link-btn'); b.type = 'button';
      b.addEventListener('click', async () => {
        if (!confirm(t('confirmDel'))) return;
        const d = await api('/waste/' + r.id, { method: 'DELETE' });
        if (d.error) { $('#mainMsg').textContent = errMsg(d.error); return; }
        all = all.filter((x) => x.id !== r.id); refilter();
      });
      cell.append(b); row.append(cell); body.append(row);
    }
    $('#pInfo').textContent = `${t('page')} ${page + 1} / ${pages}`;
    $('#pPrev').disabled = page === 0; $('#pNext').disabled = page >= pages - 1;
  }
  $('#pPrev').addEventListener('click', () => { page--; render(); });
  $('#pNext').addEventListener('click', () => { page++; render(); });

  /* ---------- Descargas ---------- */
  function save(name, mime, text) {
    const blob = new Blob([text], { type: mime + ';charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const stamp = () => new Date().toISOString().slice(0, 10);
  const iso = (ms) => new Date(ms).toISOString();
  const chrono = () => view.slice().reverse();

  $('#dlCsv').addEventListener('click', () => {
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const head = ['id', 'fecha_iso', ...MATS.map((m) => m + '_kg'), 'total_kg', 'moneda', 'precio_pet_por_kg', 'venta_pet'];
    const rows = chrono().map((r) => [r.id, iso(r.created_at), ...MATS.map((m) => r[m]), tot(r).toFixed(2), r.currency, r.price, (r.pet * r.price).toFixed(2)]);
    save(`EcoEstadistica_registros_${stamp()}.csv`, 'text/csv', '\ufeff' + [head, ...rows].map((r) => r.map(q).join(',')).join('\r\n'));
  });
  $('#dlJson').addEventListener('click', () => {
    const data = { exportado: new Date().toISOString(), cuenta: account && { nombre: account.name, correo: account.email }, registros: chrono().map((r) => ({ ...r, fecha_iso: iso(r.created_at), total_kg: Math.round(tot(r) * 100) / 100 })) };
    save(`EcoEstadistica_registros_${stamp()}.json`, 'application/json', JSON.stringify(data, null, 2));
  });
  $('#dlTxt').addEventListener('click', () => {
    const f = $('#fFrom').value, to = $('#fTo').value;
    const L = [t('rep'), '='.repeat(40), `${t('gen')}: ${fdate(Date.now())}`, `${t('period')}: ${f || t('all')} → ${to || t('all')}`, `${view.length} ${t('count')}`, ''];
    for (const r of chrono()) {
      L.push(fdate(r.created_at), '  ' + MATS.map((m) => `${t(m)}: ${kg(r[m])}`).join(' | '), `  ${t('total')}: ${kg(tot(r))} | ${t('earn')}: ${money(r.pet * r.price, r.currency)}`, '');
    }
    save(`EcoEstadistica_informe_${stamp()}.txt`, 'text/plain', L.join('\n'));
  });
  $('#dlPrint').addEventListener('click', () => window.print());

  /* ---------- Perfil ---------- */
  $('#nameForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = await api('/account/name', { method: 'POST', body: { name: $('#profName').value } });
    $('#nameMsg').className = 'msg' + (d.error ? ' err' : '');
    $('#nameMsg').textContent = d.error ? errMsg(d.error) : t('nameSaved');
    if (!d.error) { user = d.user; account.name = d.user.name; $('#userName').textContent = d.user.name; }
  });
  $('#delForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = await api('/account/delete', { method: 'POST', body: { password: $('#delPass').value } });
    if (d.error) { $('#delMsg').textContent = errMsg(d.error); return; }
    $('#delForm').reset(); $('#delMsg').textContent = ''; all = []; showGate(t('delDone'));
  });

  applyLang();
  enter();
})();
