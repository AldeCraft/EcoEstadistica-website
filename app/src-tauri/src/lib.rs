//! EcoEstadística (Tauri 2): abre el sitio en línea y, si no hay conexión, una copia local incluida en la app.
//! Funciona en Windows, Linux y Android. Se reemplaza la app anterior hecha con Electron.

use std::{
    net::{TcpStream, ToSocketAddrs},
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    time::Duration,
};

use tauri::{webview::WebviewWindowBuilder, AppHandle, Manager, Url, WebviewUrl};
use tauri_plugin_opener::OpenerExt;

/// Sitio en línea (cuentas, comentarios y base de datos viven en el Worker de Cloudflare).
const SITE_URL: &str = "https://ecoestadistica.alderojasturrent.workers.dev/";
const SITE_HOST: &str = "ecoestadistica.alderojasturrent.workers.dev";
#[cfg(desktop)]
const REPO_URL: &str = "https://github.com/AldeCraft/EcoEstadistica-website";
const TITLE: &str = "EcoEstadística";

/// Se inyecta en todas las páginas de la ventana.
/// - En la copia local, `/api/*` responde "offline" (igual que hacía la versión de Electron).
/// - Los enlaces `target=_blank` y `window.open` navegan en la misma ventana para que Rust decida
///   si se abren en el navegador del sistema (así el sitio remoto no necesita acceso a IPC).
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
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[target="_blank"]') : null;
    if (a && a.href) { e.preventDefault(); location.href = a.href; }
  }, true);
  window.open = function (u) { if (u) { location.href = String(u); } return null; };
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

fn open_external(app: &AppHandle, url: &str) {
    let _ = app.opener().open_url(url, None::<&str>);
}

/// Abre un PDF del sitio (siempre en línea, en el visor/navegador del sistema).
fn open_doc(app: &AppHandle, file: &str) {
    if let Ok(u) = Url::parse(SITE_URL).and_then(|b| b.join(&format!("docs/{file}"))) {
        open_external(app, u.as_str());
    }
}

/// Decide si la ventana puede navegar a `url`; lo externo se abre en el navegador del sistema.
fn allow_navigation(app: &AppHandle, url: &Url) -> bool {
    let local = matches!(url.scheme(), "tauri" | "about" | "blob" | "data") || url.host_str() == Some("tauri.localhost");
    let site = url.host_str() == Some(SITE_HOST);
    if (local || site) && url.path().to_ascii_lowercase().ends_with(".pdf") {
        // Los PDF de la copia local viven también en línea: se abren fuera de la ventana.
        if let Ok(online) = Url::parse(SITE_URL).and_then(|b| b.join(url.path().trim_start_matches('/'))) {
            open_external(app, online.as_str());
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

fn create_window(app: &AppHandle, online: bool) -> tauri::Result<()> {
    app.state::<AppState>().offline.store(!online, Ordering::SeqCst);
    let url = if online {
        WebviewUrl::External(Url::parse(SITE_URL).expect("URL del sitio válida"))
    } else {
        WebviewUrl::App("index.html".into())
    };
    let nav = app.clone();
    let builder = WebviewWindowBuilder::new(app, "main", url)
        .title(TITLE)
        .initialization_script(SHIM)
        .on_navigation(move |u| allow_navigation(&nav, u));
    #[cfg(desktop)]
    let builder = builder.inner_size(1280.0, 820.0).min_inner_size(380.0, 600.0);
    builder.build()?;
    Ok(())
}

/// Navega la ventana a `rel` dentro del sitio en línea o de la copia local.
#[cfg(desktop)]
fn go(app: &AppHandle, offline: Option<bool>, rel: &str) {
    let Some(win) = app.get_webview_window("main") else { return };
    let state = app.state::<AppState>();
    if let Some(o) = offline {
        state.offline.store(o, Ordering::SeqCst);
    }
    let base = if state.offline.load(Ordering::SeqCst) { local_base() } else { SITE_URL };
    if let Ok(u) = Url::parse(base).and_then(|b| b.join(rel)) {
        let _ = win.navigate(u);
    }
}

#[cfg(desktop)]
fn change_zoom(app: &AppHandle, delta: Option<f64>) {
    let Some(win) = app.get_webview_window("main") else { return };
    let state = app.state::<AppState>();
    let mut z = state.zoom.lock().unwrap();
    *z = match delta {
        Some(d) => (*z + d).clamp(0.5, 3.0),
        None => 1.0,
    };
    let _ = win.set_zoom(*z);
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default().plugin(tauri_plugin_opener::init());

    // Una sola instancia en escritorio: al abrir otra, se enfoca la ventana existente.
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .menu(|app| build_menu(app))
        .on_menu_event(|app, event| match event.id().as_ref() {
            "online" => go(app, Some(false), ""),
            "offline" => go(app, Some(true), "index.html"),
            "reload" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.eval("location.reload()");
                }
            }
            "fullscreen" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.set_fullscreen(!w.is_fullscreen().unwrap_or(false));
                }
            }
            "zoom_reset" => change_zoom(app, None),
            "zoom_in" => change_zoom(app, Some(0.1)),
            "zoom_out" => change_zoom(app, Some(-0.1)),
            "repo" => open_external(app, REPO_URL),
            "privacy" => go(app, None, "aviso-de-privacidad.html"),
            "env" => go(app, None, "gestion-ambiental.html"),
            "doc" => open_doc(app, "EcoEstadística_documento.pdf"),
            "slides" => open_doc(app, "EcoEstadística_presentación.pdf"),
            _ => {}
        });

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
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error al ejecutar la aplicación EcoEstadística");
}
