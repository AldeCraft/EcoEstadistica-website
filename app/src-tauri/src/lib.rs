//! EcoEstadística (Tauri 2): abre el sitio en línea y, si no hay conexión, una copia local incluida en la app.
//! Funciona en Windows, Linux, macOS y Android.
//!
//! - Escritorio: la ventana tiene dos webviews (barra de título propia en Windows + contenido).
//! - Android: un solo webview; las descargas, la impresión y los márgenes del sistema se resuelven en `MainActivity.kt`.

use std::{
    net::{TcpStream, ToSocketAddrs},
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    time::Duration,
};

use tauri::{AppHandle, Manager, Url, Webview, WebviewUrl};
use tauri_plugin_opener::OpenerExt;

/// Sitio en línea (cuentas, comentarios y base de datos viven en el Worker de Cloudflare).
const SITE_URL: &str = "https://ecoestadistica.alderojasturrent.workers.dev/";
const SITE_HOST: &str = "ecoestadistica.alderojasturrent.workers.dev";
#[cfg(desktop)]
const REPO_URL: &str = "https://github.com/AldeCraft/EcoEstadistica-website";
const TITLE: &str = "EcoEstadística";
/// Escala inicial en Android (1.0 = tamaño normal). Más bajo = la página se ve más pequeña.
/// Con dos dedos se puede acercar o alejar a partir de este valor.
const ANDROID_INITIAL_SCALE: &str = "0.8";

#[cfg(desktop)]
const TITLEBAR_H: f64 = 40.0;

/// Barra de título propia: solo en Windows (ahí Tauri posiciona varios webviews en la misma ventana).
/// Linux y macOS usan el marco nativo. Si la barra propia diera problemas en Windows,
/// se puede volver al marco nativo ejecutando la app con la variable de entorno ECO_MARCO_NATIVO=1.
#[cfg(desktop)]
fn custom_frame() -> bool {
    cfg!(windows) && std::env::var_os("ECO_MARCO_NATIVO").is_none()
}

/// Etiqueta del webview que muestra el sitio (con barra propia es "content"; si no, el webview de la ventana "main").
fn content_label() -> &'static str {
    #[cfg(desktop)]
    if custom_frame() {
        return "content";
    }
    "main"
}

/// Se inyecta en todas las páginas del contenido.
/// - En la copia local, `/api/*` responde "offline" (igual que hacía la versión de Electron).
/// - Los enlaces `target=_blank` y `window.open` navegan en la misma ventana para que Rust decida
///   si se abren en el visor de PDF, en la app o en el navegador del sistema.
/// - Las descargas (`<a download>` con blob:) se guardan con el cuadro "Guardar como" (escritorio)
///   o en la carpeta Descargas (Android); `window.print()` usa la impresión nativa en Android.
const SHIM: &str = r#"
(function () {
  var local = location.protocol === 'tauri:' || location.hostname === 'tauri.localhost';
  if (local && window.fetch) {
    var realFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      var u = typeof input === 'string' ? input : (input && input.url) || '';
      var path = u.indexOf('/') === 0 ? u : (u.indexOf(location.origin + '/') === 0 ? u.slice(location.origin.length) : '');
      if (path.indexOf('/api/') === 0) {
        return Promise.resolve(new Response(JSON.stringify({ error: 'offline' }), {
          status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }));
      }
      return realFetch(input, init);
    };
  }
  if (/Android/i.test(navigator.userAgent)) {
    var applyViewport = function () {
      var m = document.querySelector('meta[name="viewport"]');
      if (!m) { m = document.createElement('meta'); m.name = 'viewport'; (document.head || document.documentElement).appendChild(m); }
      m.setAttribute('content', 'width=device-width, initial-scale=__SCALE__, minimum-scale=0.5, maximum-scale=5, user-scalable=yes');
    };
    if (document.head) { applyViewport(); }
    document.addEventListener('DOMContentLoaded', applyViewport);
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[target="_blank"]') : null;
    if (a && a.href) { e.preventDefault(); location.href = a.href; }
  }, true);
  window.open = function (u) { if (u) { location.href = String(u); } return null; };

  function mimeOf(n) {
    var x = String(n).split('.').pop().toLowerCase();
    return { csv: 'text/csv', json: 'application/json', txt: 'text/plain', pdf: 'application/pdf', html: 'text/html' }[x] || 'application/octet-stream';
  }
  function toBase64(buf) {
    var b = new Uint8Array(buf), s = '', i, c = 0x8000;
    for (i = 0; i < b.length; i += c) { s += String.fromCharCode.apply(null, b.subarray(i, i + c)); }
    return btoa(s);
  }
  function saveBlob(name, url) {
    return fetch(url).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
      var data = toBase64(buf);
      if (window.EcoNative && window.EcoNative.saveFile) { window.EcoNative.saveFile(name, mimeOf(name), data); return; }
      if (window.__TAURI_INTERNALS__) { return window.__TAURI_INTERNALS__.invoke('save_file', { name: name, dataBase64: data }); }
    });
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[download]') : null;
    if (!a) { return; }
    var href = a.href || '';
    if (href.indexOf('blob:') !== 0 && href.indexOf('data:') !== 0) { return; }
    e.preventDefault();
    saveBlob(a.getAttribute('download') || 'archivo', href).catch(function (err) { console.error(err); });
  }, true);
  var realPrint = window.print ? window.print.bind(window) : function () {};
  window.print = function () {
    if (window.EcoNative && window.EcoNative.print) { window.EcoNative.print(); } else { realPrint(); }
  };
})();
"#;

struct AppState {
    /// `true` cuando se muestra la copia local.
    offline: AtomicBool,
    /// Zoom actual de la ventana (solo escritorio).
    zoom: Mutex<f64>,
}

/// ¿Se puede llegar al servidor? (DNS + conexión TCP al puerto 443, con tiempo límite).
fn site_reachable() -> bool {
    (SITE_HOST, 443)
        .to_socket_addrs()
        .map(|mut addrs| addrs.any(|a| TcpStream::connect_timeout(&a, Duration::from_secs(4)).is_ok()))
        .unwrap_or(false)
}

/// Origen de la copia local según la plataforma (Windows y Android usan http://tauri.localhost).
fn local_base() -> &'static str {
    if cfg!(any(windows, target_os = "android")) {
        "http://tauri.localhost/"
    } else {
        "tauri://localhost/"
    }
}

fn content(app: &AppHandle) -> Option<Webview> {
    app.get_webview(content_label())
}

fn open_external(app: &AppHandle, url: &str) {
    let _ = app.opener().open_url(url, None::<&str>);
}

/// Dirección del visor de PDF integrado para un archivo de `docs/` (ruta ya codificada, p. ej. `/docs/a%20b.pdf`).
fn viewer_url(file_path: &str) -> Option<Url> {
    let mut u = Url::parse(local_base()).ok()?.join("viewer.html").ok()?;
    u.query_pairs_mut().append_pair("file", file_path);
    Some(u)
}

/// Navega el contenido a `url` desde otro hilo (no se debe navegar dentro del propio manejador de navegación).
fn navigate_later(app: &AppHandle, url: Url) {
    let app = app.clone();
    std::thread::spawn(move || {
        if let Some(w) = content(&app) {
            let _ = w.navigate(url);
        }
    });
}

/// Abre un PDF de `docs/` en el visor integrado.
#[cfg(desktop)]
fn open_pdf(app: &AppHandle, file: &str) {
    if let Ok(u) = Url::parse(local_base()).and_then(|b| b.join(&format!("docs/{file}"))) {
        if let Some(v) = viewer_url(u.path()) {
            app.state::<AppState>().offline.store(true, Ordering::SeqCst);
            navigate_later(app, v);
        }
    }
}

/// Decide si el contenido puede navegar a `url`.
/// Los PDF de `docs/` se abren en el visor integrado; lo externo se abre en el navegador del sistema.
fn allow_navigation(app: &AppHandle, url: &Url) -> bool {
    let local = matches!(url.scheme(), "tauri" | "about" | "blob" | "data") || url.host_str() == Some("tauri.localhost");
    let site = url.host_str() == Some(SITE_HOST);
    if (local || site) && url.path().to_ascii_lowercase().ends_with(".pdf") {
        if let Some(v) = viewer_url(url.path()) {
            navigate_later(app, v);
        }
        return false;
    }
    if local || site {
        return true;
    }
    if matches!(url.scheme(), "http" | "https" | "mailto" | "tel") {
        open_external(app, url.as_str());
    }
    false
}

fn shim() -> String {
    SHIM.replace("__SCALE__", ANDROID_INITIAL_SCALE)
}

fn start_url(online: bool) -> WebviewUrl {
    if online {
        WebviewUrl::External(Url::parse(SITE_URL).expect("URL del sitio válida"))
    } else {
        WebviewUrl::App("index.html".into())
    }
}

#[cfg(mobile)]
fn create_window(app: &AppHandle, online: bool) -> tauri::Result<()> {
    app.state::<AppState>().offline.store(!online, Ordering::SeqCst);
    let nav = app.clone();
    tauri::webview::WebviewWindowBuilder::new(app, content_label(), start_url(online))
        .title(TITLE)
        .initialization_script(shim())
        .on_navigation(move |u| allow_navigation(&nav, u))
        .build()?;
    Ok(())
}

/// Ventana de escritorio. En Windows: contenido + barra de título propia como webviews hermanos.
/// En Linux y macOS: una ventana normal con marco nativo.
#[cfg(desktop)]
fn create_window(app: &AppHandle, online: bool) -> tauri::Result<()> {
    use tauri::{webview::WebviewBuilder, window::WindowBuilder, LogicalPosition, LogicalSize, Theme, WindowEvent};

    app.state::<AppState>().offline.store(!online, Ordering::SeqCst);

    if !custom_frame() {
        let nav = app.clone();
        tauri::webview::WebviewWindowBuilder::new(app, "main", start_url(online))
            .title(TITLE)
            .theme(Some(Theme::Dark))
            .inner_size(1280.0, 820.0)
            .min_inner_size(380.0, 600.0)
            .initialization_script(shim())
            .on_navigation(move |u| allow_navigation(&nav, u))
            .build()?;
        return Ok(());
    }

    let window = WindowBuilder::new(app, "main")
        .title(TITLE)
        .inner_size(1280.0, 820.0)
        .min_inner_size(380.0, 600.0)
        .decorations(false)
        .build()?;

    let scale = window.scale_factor()?;
    let size: LogicalSize<f64> = window.inner_size()?.to_logical(scale);
    let nav = app.clone();
    window.add_child(
        WebviewBuilder::new("content", start_url(online))
            .initialization_script(shim())
            .on_navigation(move |u| allow_navigation(&nav, u)),
        LogicalPosition::new(0.0, TITLEBAR_H),
        LogicalSize::new(size.width, (size.height - TITLEBAR_H).max(1.0)),
    )?;
    window.add_child(
        WebviewBuilder::new("titlebar", WebviewUrl::App("titlebar.html".into())),
        LogicalPosition::new(0.0, 0.0),
        LogicalSize::new(size.width, TITLEBAR_H),
    )?;

    let w = window.clone();
    window.on_window_event(move |e| {
        if matches!(e, WindowEvent::Resized(_) | WindowEvent::ScaleFactorChanged { .. }) {
            layout(&w);
        }
    });
    Ok(())
}

/// Reparte el espacio de la ventana entre la barra de título y el contenido.
#[cfg(desktop)]
fn layout(window: &tauri::Window) {
    use tauri::{LogicalPosition, LogicalSize};
    if !custom_frame() {
        return;
    }
    let (Ok(scale), Ok(phys)) = (window.scale_factor(), window.inner_size()) else { return };
    let size: LogicalSize<f64> = phys.to_logical(scale);
    let tb = if !window.is_fullscreen().unwrap_or(false) { TITLEBAR_H } else { 0.0 };
    let app = window.app_handle();
    if let Some(c) = content(app) {
        let _ = c.set_position(LogicalPosition::new(0.0, tb));
        let _ = c.set_size(LogicalSize::new(size.width, (size.height - tb).max(1.0)));
    }
    if let Some(t) = app.get_webview("titlebar") {
        let _ = t.set_size(LogicalSize::new(size.width, tb.max(1.0)));
    }
}

/// Navega el contenido a `rel` dentro del sitio en línea o de la copia local.
#[cfg(desktop)]
fn go(app: &AppHandle, offline: Option<bool>, rel: &str) {
    let state = app.state::<AppState>();
    if let Some(o) = offline {
        state.offline.store(o, Ordering::SeqCst);
    }
    let base = if state.offline.load(Ordering::SeqCst) { local_base() } else { SITE_URL };
    if let Ok(u) = Url::parse(base).and_then(|b| b.join(rel)) {
        navigate_later(app, u);
    }
}

#[cfg(desktop)]
fn change_zoom(app: &AppHandle, delta: Option<f64>) {
    let Some(w) = content(app) else { return };
    let state = app.state::<AppState>();
    let mut z = state.zoom.lock().unwrap();
    *z = match delta {
        Some(d) => (*z + d).clamp(0.5, 3.0),
        None => 1.0,
    };
    let _ = w.set_zoom(*z);
}

#[cfg(desktop)]
fn toggle_fullscreen(app: &AppHandle) {
    if let Some(win) = app.get_window("main") {
        let _ = win.set_fullscreen(!win.is_fullscreen().unwrap_or(false));
        layout(&win);
    }
}

#[cfg(desktop)]
fn build_menu(app: &AppHandle) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    use tauri::menu::{MenuBuilder, MenuItem, PredefinedMenuItem, SubmenuBuilder};
    let item = |id: &str, label: &str, accel: Option<&str>| MenuItem::with_id(app, id, label, true, accel);

    let archivo = SubmenuBuilder::new(app, "Archivo")
        .item(&item("online", "Abrir versión en línea", Some("CmdOrCtrl+Shift+O"))?)
        .item(&item("offline", "Abrir versión sin conexión", None)?)
        .separator()
        .item(&PredefinedMenuItem::quit(app, Some("Salir"))?)
        .build()?;
    let ver = SubmenuBuilder::new(app, "Ver")
        .item(&item("reload", "Recargar", Some("CmdOrCtrl+R"))?)
        .item(&item("fullscreen", "Pantalla completa", Some("F11"))?)
        .separator()
        .item(&item("zoom_reset", "Zoom normal", Some("CmdOrCtrl+0"))?)
        .item(&item("zoom_in", "Acercar", Some("CmdOrCtrl+="))?)
        .item(&item("zoom_out", "Alejar", Some("CmdOrCtrl+-"))?)
        .build()?;
    let ayuda = SubmenuBuilder::new(app, "Ayuda")
        .item(&item("repo", "Repositorio en GitHub", None)?)
        .item(&item("privacy", "Aviso de Privacidad", None)?)
        .item(&item("env", "Gestión ambiental", None)?)
        .item(&item("doc", "Documentación", None)?)
        .item(&item("slides", "Presentación", None)?)
        .build()?;
    MenuBuilder::new(app).item(&archivo).item(&ver).item(&ayuda).build()
}

/// Muestra el menú de la aplicación bajo el botón ☰ de la barra de título propia.
#[cfg(desktop)]
#[tauri::command]
fn show_menu(app: AppHandle, x: f64, y: f64) -> Result<(), String> {
    let handle = app.clone();
    app.run_on_main_thread(move || {
        if let (Some(win), Ok(menu)) = (handle.get_window("main"), build_menu(&handle)) {
            let _ = win.popup_menu_at(&menu, tauri::LogicalPosition::new(x, y));
        }
    })
    .map_err(|e| e.to_string())
}

/// Guarda un archivo generado por la página (CSV, JSON, TXT, PDF…) con el cuadro "Guardar como" del sistema.
/// Devuelve `false` si la persona cancela.
#[cfg(desktop)]
#[tauri::command]
async fn save_file(app: AppHandle, name: String, data_base64: String) -> Result<bool, String> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    use tauri_plugin_dialog::DialogExt;

    let bytes = STANDARD.decode(data_base64.as_bytes()).map_err(|e| e.to_string())?;
    // Solo el nombre del archivo, sin rutas ni caracteres no válidos.
    let safe: String = name
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or("archivo")
        .chars()
        .map(|c| if "<>:\"|?*".contains(c) || c.is_control() { '_' } else { c })
        .collect();
    let safe = if safe.trim().is_empty() { "archivo".to_string() } else { safe };

    let mut dialog = app.dialog().file().set_title("Guardar archivo").set_file_name(&safe);
    if let Some(ext) = std::path::Path::new(&safe).extension().and_then(|e| e.to_str()) {
        dialog = dialog.add_filter(ext.to_uppercase(), &[ext]);
    }
    let Some(path) = dialog.blocking_save_file() else { return Ok(false) };
    let path = path.into_path().map_err(|e| e.to_string())?;
    std::fs::write(path, bytes).map_err(|e| e.to_string())?;
    Ok(true)
}

/// Busca una versión nueva en los releases de GitHub (archivo latest.json) y ofrece instalarla.
/// Solo funciona si la compilación incluye la configuración del actualizador (`tauri.updater.conf.json`);
/// si no la incluye, el plugin no se registra y la app arranca con normalidad.
#[cfg(desktop)]
async fn check_updates(app: AppHandle) {
    use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
    use tauri_plugin_updater::UpdaterExt;

    if let Err(e) = app.plugin(tauri_plugin_updater::Builder::new().build()) {
        eprintln!("Actualizaciones desactivadas: {e}");
        return;
    }
    let updater = match app.updater() {
        Ok(u) => u,
        Err(e) => {
            eprintln!("Actualizaciones desactivadas: {e}");
            return;
        }
    };
    let update = match updater.check().await {
        Ok(Some(u)) => u,
        Ok(None) => return,
        Err(e) => {
            eprintln!("No se pudo buscar actualizaciones: {e}");
            return;
        }
    };

    // En Linux solo el AppImage puede reemplazarse a sí mismo; con .deb/.rpm se abre la página de descargas.
    let can_self_update = !cfg!(target_os = "linux") || std::env::var_os("APPIMAGE").is_some();
    let ask = {
        let app = app.clone();
        let msg = format!(
            "Hay una nueva versión de EcoEstadística ({}). Tu versión es la {}.\n\n{}",
            update.version,
            update.current_version,
            if can_self_update { "¿Quieres descargarla e instalarla ahora?" } else { "¿Quieres abrir la página de descargas?" }
        );
        tauri::async_runtime::spawn_blocking(move || {
            app.dialog()
                .message(msg)
                .title("Actualización disponible")
                .kind(MessageDialogKind::Info)
                .buttons(MessageDialogButtons::OkCancelCustom("Actualizar".into(), "Más tarde".into()))
                .blocking_show()
        })
        .await
        .unwrap_or(false)
    };
    if !ask {
        return;
    }
    if !can_self_update {
        open_external(&app, &format!("{REPO_URL}/releases/latest"));
        return;
    }
    match update.download_and_install(|_, _| {}, || {}).await {
        Ok(()) => app.restart(),
        Err(e) => {
            let app2 = app.clone();
            let _ = tauri::async_runtime::spawn_blocking(move || {
                app2.dialog()
                    .message(format!("No se pudo instalar la actualización: {e}"))
                    .title("Actualización")
                    .kind(MessageDialogKind::Error)
                    .blocking_show();
            })
            .await;
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default().plugin(tauri_plugin_opener::init());

    // Una sola instancia en escritorio: al abrir otra, se enfoca la ventana existente.
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_window("main") {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .invoke_handler(tauri::generate_handler![save_file, show_menu])
        .on_menu_event(|app, event| match event.id().as_ref() {
            "online" => go(app, Some(false), ""),
            "offline" => go(app, Some(true), "index.html"),
            "reload" => {
                if let Some(w) = content(app) {
                    let _ = w.eval("location.reload()");
                }
            }
            "fullscreen" => toggle_fullscreen(app),
            "zoom_reset" => change_zoom(app, None),
            "zoom_in" => change_zoom(app, Some(0.1)),
            "zoom_out" => change_zoom(app, Some(-0.1)),
            "repo" => open_external(app, REPO_URL),
            "privacy" => go(app, None, "aviso-de-privacidad.html"),
            "env" => go(app, None, "gestion-ambiental.html"),
            "doc" => open_pdf(app, "EcoEstadística_documento.pdf"),
            "slides" => open_pdf(app, "EcoEstadística_presentación.pdf"),
            _ => {}
        });

    // Con marco nativo (Linux, macOS) el menú va en la barra de menús; con la barra propia (Windows) se abre con ☰.
    #[cfg(desktop)]
    let builder = if custom_frame() { builder } else { builder.menu(|app| build_menu(app)) };

    builder
        .manage(AppState { offline: AtomicBool::new(false), zoom: Mutex::new(1.0) })
        .setup(|app| {
            // La comprobación de red va en otro hilo para no bloquear el arranque (importante en Android).
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let online = site_reachable();
                if let Err(e) = create_window(&handle, online) {
                    eprintln!("No se pudo crear la ventana: {e}");
                    handle.exit(1);
                    return;
                }
                // Con conexión, busca una versión nueva cada vez que se abre la app (solo escritorio).
                #[cfg(desktop)]
                if online {
                    tauri::async_runtime::spawn(check_updates(handle.clone()));
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error al ejecutar la aplicación EcoEstadística");
}
