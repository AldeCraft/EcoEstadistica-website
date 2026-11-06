# EcoEstadística — App de escritorio (Electron)

Windows y Linux. La app abre el sitio en línea (así funcionan cuentas, comentarios y base de datos del Worker)
y, si no hay Internet, abre una copia local (calculadora, gráfica, formulas y mapa con tus lugares propios).

## Requisitos
Node.js 20 o superior.

## Uso
```
cd desktop
npm install
npm start            # ejecuta la app (copia antes el sitio a desktop/web)
npm run dist:win     # instalador .exe (NSIS) + portable  -> desktop/dist
npm run dist:linux   # AppImage + tar.gz                  -> desktop/dist
```
Compila para Windows desde Windows y para Linux desde Linux (compilar .exe desde Linux requiere Wine).

## Notas
- Si cambias la URL del sitio, edita `SITE_URL` en `main.js`.
- Cada vez que cambies el sitio, `npm start` / `npm run dist:*` vuelven a sincronizar la copia sin conexión.
- Sin conexión no hay cuentas ni comentarios; el mapa necesita Internet para los mosaicos y OpenStreetMap.
- "Usar mi ubicación" puede no funcionar en Electron (Windows/Linux no traen proveedor de geolocalización sin clave de Google); el mapa se puede mover a mano.
- Agrega `desktop` a `.assetsignore` en la raíz para que Wrangler no suba esta carpeta como parte del sitio.
