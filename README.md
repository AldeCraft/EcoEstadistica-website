<div align="center">
  <img src="app/src-tauri/gen/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png" width="100">
</div>



<br>

# EcoEstadística | Gestión de Residuos
Descripción meta de la web
> registra, analiza y aprovecha tus residuos con estadísticas claras de reciclaje y composta.

Descripción dentro de la web
> Registra la cantidad de basura que produces, descubre qué porcentaje puede reciclarse o venderse y calcula cuánto material orgánico puede aprovecharse para hacer composta.

# DESCARGAR APLICACIÓN CLIENTE

[![Windows](https://img.shields.io/badge/Windows_x64(nsis)-0078D6?logo=windows&logoColor=white&style=for-the-badge)](https://github.com/AldeCraft/EcoEstadistica-website/releases/download/v3.0.0/EcoEstadistica_3.0.0_x64-setup.exe)
[![Windows](https://img.shields.io/badge/Windows_x64(msi)-0078D6?logo=windows&logoColor=white&style=for-the-badge)](https://github.com/AldeCraft/EcoEstadistica-website/releases/download/v3.0.0/EcoEstadistica_3.0.0_x64_en-US.msi)

[![Mac](https://img.shields.io/badge/Mac_AARCH64(DMG)-000000?logo=apple&logoColor=white&style=for-the-badge)](https://github.com/AldeCraft/EcoEstadistica-website/releases/download/v3.0.0/EcoEstadistica_3.0.0_aarch64.dmg)

[![Linux](https://img.shields.io/badge/Linux_amd64(AppImage)-FCC624?logo=linux&logoColor=black&style=for-the-badge)](https://github.com/AldeCraft/EcoEstadistica-website/releases/download/v3.0.0/EcoEstadistica_3.0.0_amd64.AppImage)
[![Linux](https://img.shields.io/badge/Linux_amd64(DEB)-FCC624?logo=linux&logoColor=black&style=for-the-badge)](https://github.com/AldeCraft/EcoEstadistica-website/releases/download/v3.0.0/EcoEstadistica_3.0.0_amd64.deb)
[![Linux](https://img.shields.io/badge/Linux_RED_HAT_x86_64(RPM)-FCC624?logo=RedHat&logoColor=black&style=for-the-badge)](https://github.com/AldeCraft/EcoEstadistica-website/releases/download/v3.0.0/EcoEstadistica-3.0.0-1.x86_64.rpm)

[![Android](https://img.shields.io/badge/Android_ARM64-3DDC84?logo=android&logoColor=black&style=for-the-badge)](https://github.com/AldeCraft/EcoEstadistica-website/releases/download/v3.0.0/EcoEstadistica_v3.0.0_android_arm64.apk)
[![Android](https://img.shields.io/badge/Android_ARM-3DDC84?logo=android&logoColor=black&style=for-the-badge)](https://github.com/AldeCraft/EcoEstadistica-website/releases/download/v3.0.0/EcoEstadistica_v3.0.0_android_arm.apk)
[![Android](https://img.shields.io/badge/Android_X86-3DDC84?logo=android&logoColor=black&style=for-the-badge)](https://github.com/AldeCraft/EcoEstadistica-website/releases/download/v3.0.0/EcoEstadistica_v3.0.0_android_x86.apk)
[![Android](https://img.shields.io/badge/Android_X86_64-3DDC84?logo=android&logoColor=black&style=for-the-badge)](https://github.com/AldeCraft/EcoEstadistica-website/releases/download/v3.0.0/EcoEstadistica_v3.0.0_android_x86_64.apk)
[![Android](https://img.shields.io/badge/Android_UNIVERSAL-3DDC84?logo=android&logoColor=black&style=for-the-badge)](https://github.com/AldeCraft/EcoEstadistica-website/releases/download/v3.0.0/EcoEstadistica_v3.0.0_app-universal-debug.apk)


# DOCUMENTACIÓN
> Elaborado como parte de un proyecto académico de Ingeniería en Sistemas Computacionales del Instituto Tecnológico Superior de San Andrés Tuxtla.

📄 [Consultar documentación (PDF)](docs/EcoEstadística_documento.pdf)

📺 [Consultar Presentación (PDF)](docs/EcoEstadística_presentación.pdf)

# ¿Qué hace?
Es una Página web educativa para registrar y analizar:
- Basura orgánica
- PET
- Vidrio
- Papel
- Plástico

> Otorga la Posibilidad de Visualizar donde vender tu reciclaje.

## Fórmulas
```
Total = suma de todos los residuos.

Porcentaje = (cantidad del material / total) × 100.

Ganancia estimada = kg de PET × precio por kg.
```

La cantidad de orgánica registrada se muestra como material disponible para el proceso de composta; la cantidad final de composta obtenida depende del proceso y no es necesariamente igual al peso inicial.

# Carácteristicas + Cambiós
> \<2.0.0
- Diseño dinámico (PC, Mobiles)
- Tema Claro/Oscuro
- Lenguaje ES/EN
- Posibilidad de descargar Registro
- Moneda MXN/USD

> 2.0.0
- Api wrangler
- Cuenta + Comentarios

> 2.5.0
- Aplicación Cliente (**Windows**, **Linux**) usando Electron
- Se agregó **"Avisos de Privacidad"**
- Se agregó un apartado para ver los archivos (**"Documentación"**, **"Presentación"**)

> 2.5.1
- se agregó el logo y ubicación de **Tebaev Calería**
- Correciónes menores
- Integración de guardado de registros por usuario
- La página ya está indexada en **Google** y **Bing**.

> 2.6.0
- Área privada **"Mi cuenta"** (`cuenta.html`): indicadores, gráfica mensual, filtros por fecha y descarga de registros (CSV, JSON, TXT, PDF por impresión)
- Perfil: cambiar nombre público y eliminar la cuenta con todos sus datos
- Página de **Gestión ambiental** alineada a ISO 14001 (`gestion-ambiental.html`). *No es una certificación.*

> 3.0.0
- Se refactorizó la aplicación de **Windows** y **Linux** (Con Rust + Tauri 2.0)
- Se creó la aplicación para **Android** (Gracias a la refactorización)
- Se creó la aplicación para **MacOS** (Gracias a la refactorización)

# Notas
- La gráfica utiliza Chart.js desde CDN, por lo que necesita conexión a Internet para cargar la librería. El resto de la página funciona como archivos HTML/CSS/JS normales.
- La Base de datos no se puede usar de manera local sin antes configurar.

<!--

> La página está en proceso para una aplicación cliente para **Android**

-->

# Cómo abrirla y ejecutarla (.zip)
1. Descomprime el proyecto.
2. Abre `index.html` con Chrome, Edge, Firefox u otro navegador.
3. Introduce los kilogramos recolectados.
4. Modifica el precio del PET si quieres estimar una venta diferente.

<!-- > La base de datos (El Mapa, Cuenta y comentarios) no se pueden usar en local de manera convencional. -->
<!-- > La base de datos (Cuenta y comentarios) no se pueden usar en local de manera convencional. -->

# Creditos
- **Aldebarán de Jesús Rojas Turrent.**
- **Dylan Hernández Noguerola.**
- **Saúl Adrían Toto Santos.**


