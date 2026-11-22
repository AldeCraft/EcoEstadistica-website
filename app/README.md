# EcoEstadística — App (Tauri 2 + Rust)

Windows, Linux y Android desde un solo proyecto. Reemplaza a la app de Electron.

La app abre el sitio en línea (así funcionan cuentas, comentarios, registros y la base de datos del Worker)
y, si no hay Internet al abrirla, muestra una copia local incluida en la app (calculadora, gráfica y fórmulas).

## Requisitos
- Node.js 20 o superior
- Rust estable (https://rustup.rs) — mínimo 1.85
- **Linux**: `libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev libxdo-dev libssl-dev patchelf build-essential`
- **Windows**: Microsoft C++ Build Tools y WebView2 (ya viene en Windows 10/11)
- **Android**: JDK 17, Android SDK + NDK, variables `ANDROID_HOME` y `NDK_HOME`, y los targets de Rust:
  `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`

## Uso (escritorio)
```
cd app
npm install
npm run dev          # ejecuta la app (antes copia el sitio a app/web)
npm run build        # instaladores en app/src-tauri/target/release/bundle
```
Windows genera `.msi`/`.exe`, Linux genera `.deb`, `.rpm` y `.AppImage`. Se compila para cada sistema desde ese mismo sistema.

## Uso (Android)
```
cd app
npm install
npm run android:init     # solo la primera vez: crea src-tauri/gen/android (súbelo al repositorio)
npm run android:dev      # en un emulador o teléfono conectado
npm run android:build -- --apk       # APK de release (sin firmar)
```
Un APK de release **debe firmarse** para instalarse: crea un keystore, configura `src-tauri/gen/android/keystore.properties`
y el bloque `signingConfigs` en `app/build.gradle.kts` (guía: https://v2.tauri.app/distribute/sign/android/).
Para pruebas usa `npx tauri android build --apk --debug`, que ya sale firmado con la clave de debug.

## Android: proyecto, ícono y comportamiento
- `src-tauri/gen/android` **está en el repositorio** a propósito: contiene el ícono, el fondo del ícono y `MainActivity.kt` personalizados.
  El CI solo ejecuta `tauri android init` si esa carpeta no existe.
- Ícono: es el de la página (`favicon.png`) sobre un fondo con degradado `135deg, #020302 → #0c1c12`.
  El fondo está en `res/drawable/ic_launcher_background.xml` y el primer plano en `res/mipmap-*/ic_launcher_foreground.png`.
  **No ejecutes `npx tauri icon`** sin revisar después estos archivos: con `gen/android` presente, ese comando sobrescribe los íconos de Android.
- `MainActivity.kt` oculta la barra de botones del sistema (reaparece al deslizar desde abajo) y activa el zoom con dos dedos.
- La escala inicial de la página en Android es `ANDROID_INITIAL_SCALE` en `src-tauri/src/lib.rs` (`"0.8"`; sube el valor para ver todo más grande).

## Cómo funciona
- `src-tauri/src/lib.rs`: al arrancar comprueba (en otro hilo) si el servidor responde; si sí abre el sitio en línea y si no, la copia local.
  Menú de escritorio (Archivo, Ver, Ayuda), una sola instancia, zoom y pantalla completa.
- Los enlaces externos y los PDF se abren en el navegador del sistema; la ventana solo navega al sitio y a la copia local.
- La ventana **no tiene permisos de IPC** (`capabilities/default.json` vacío): el sitio remoto no puede llamar a funciones nativas.
- `scripts/sync-web.js` copia el sitio a `app/web` y empaqueta Chart.js y Leaflet desde npm para la copia sin conexión.
  Se ejecuta solo antes de `dev` y `build` (`beforeDevCommand`/`beforeBuildCommand`).

## Diferencias respecto a Electron
- Si el sitio deja de responder **después** de abrir la app, no cambia solo a la copia local; usa Archivo → Abrir versión sin conexión.
- El título de la ventana es fijo ("EcoEstadística").
- Los PDF del menú Ayuda se abren desde el sitio en línea (no hay copia local abrible).
- En Android no hay menú; se usa la interfaz del sitio.
- Si cambias la URL del sitio, edita `SITE_URL` y `SITE_HOST` en `lib.rs`.
- Agrega `app` a `.assetsignore` en la raíz (ya está) para que Wrangler no suba esta carpeta como parte del sitio.
