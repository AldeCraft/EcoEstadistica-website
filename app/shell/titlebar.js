// Barra de título propia (Windows). Habla con Rust solo mediante los comandos permitidos en capabilities/titlebar.json.
(() => {
  const inv = (cmd, args) => window.__TAURI_INTERNALS__.invoke(cmd, Object.assign({ label: 'main' }, args || {}));
  const $ = (id) => document.getElementById(id);

  const MAX = '<rect x=".5" y=".5" width="9" height="9"/>';
  const RESTORE = '<rect x=".5" y="2.5" width="7" height="7"/><path d="M2.5 2.5v-2h7v7h-2"/>';
  async function refresh() {
    try {
      const m = await inv('plugin:window|is_maximized');
      $('maxIcon').innerHTML = m ? RESTORE : MAX;
      $('max').setAttribute('aria-label', m ? 'Restaurar' : 'Maximizar');
      $('max').title = m ? 'Restaurar' : 'Maximizar';
    } catch (_) {}
  }
  $('min').addEventListener('click', () => inv('plugin:window|minimize'));
  $('max').addEventListener('click', async () => { await inv('plugin:window|toggle_maximize'); refresh(); });
  $('close').addEventListener('click', () => inv('plugin:window|close'));
  $('menu').addEventListener('click', () => {
    const r = $('menu').getBoundingClientRect();
    inv('show_menu', { x: r.left, y: r.bottom }).catch(console.error);
  });
  // Arrastrar la ventana desde la zona vacía de la barra; doble clic = maximizar/restaurar.
  $('drag').addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.detail === 2) { inv('plugin:window|toggle_maximize').then(refresh); return; }
    inv('plugin:window|start_dragging').catch(() => {});
  });
  window.addEventListener('resize', refresh);
  refresh();
})();
