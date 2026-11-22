package com.ecoestadistica.app

import android.os.Bundle
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    hideSystemButtons()
  }

  // Cada vez que la app recupera el foco (por ejemplo al volver de otra app) se vuelven a ocultar.
  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) hideSystemButtons()
  }

  // Oculta la barra de botones del sistema (atrás, inicio, recientes).
  // Deslizando desde el borde inferior aparece unos segundos y se vuelve a ocultar sola.
  // Para ocultar también la barra de estado (hora, batería) usa Type.systemBars() en lugar de navigationBars().
  private fun hideSystemButtons() {
    val controller = WindowCompat.getInsetsController(window, window.decorView)
    controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    controller.hide(WindowInsetsCompat.Type.navigationBars())
  }

  // Permite acercar y alejar con dos dedos (sin los botones +/- en pantalla).
  override fun onWebViewCreate(webView: WebView) {
    webView.settings.apply {
      setSupportZoom(true)
      builtInZoomControls = true
      displayZoomControls = false
      useWideViewPort = true
    }
  }
}
