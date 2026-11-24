package com.ecoestadistica.app

import android.content.ContentValues
import android.content.Context
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.print.PrintManager
import android.provider.MediaStore
import android.util.Base64
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import java.io.File

class MainActivity : TauriActivity() {
  private var webViewRef: WebView? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    // Color que se ve detrás de las barras del sistema (el verde oscuro de la cabecera del sitio).
    window.decorView.setBackgroundColor(Color.parseColor("#0C1C12"))
    WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

    // Deja la app por debajo de la barra de estado y de la cámara (muesca) y por encima del teclado,
    // para que el contenido no choque con la hora, las notificaciones ni la cámara.
    val content = findViewById<View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(content) { v, insets ->
      val bars = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
      )
      val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
      v.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, ime.bottom))
      WindowInsetsCompat.CONSUMED
    }

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

  override fun onWebViewCreate(webView: WebView) {
    webViewRef = webView
    // Zoom con dos dedos (sin los botones +/- en pantalla).
    webView.settings.apply {
      setSupportZoom(true)
      builtInZoomControls = true
      displayZoomControls = false
      useWideViewPort = true
    }
    // Puente para descargas e impresión (la página lo usa como window.EcoNative).
    webView.addJavascriptInterface(NativeBridge(), "EcoNative")
  }

  /** Abre el cuadro de impresión de Android (permite "Guardar como PDF"). */
  private fun printPage() {
    val wv = webViewRef ?: return
    val manager = getSystemService(Context.PRINT_SERVICE) as PrintManager
    val job = "EcoEstadistica"
    manager.print(job, wv.createPrintDocumentAdapter(job), null)
  }

  /** Guarda bytes en la carpeta Descargas y devuelve un texto para avisar dónde quedaron. */
  private fun writeToDownloads(name: String, mime: String, bytes: ByteArray): String {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val values = ContentValues().apply {
        put(MediaStore.Downloads.DISPLAY_NAME, name)
        put(MediaStore.Downloads.MIME_TYPE, mime)
        put(MediaStore.Downloads.IS_PENDING, 1)
      }
      val resolver = contentResolver
      val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
        ?: throw IllegalStateException("No se pudo crear el archivo")
      val out = resolver.openOutputStream(uri) ?: throw IllegalStateException("No se pudo abrir el archivo")
      out.use { it.write(bytes) }
      values.clear()
      values.put(MediaStore.Downloads.IS_PENDING, 0)
      resolver.update(uri, values, null, null)
      return "Descargas"
    }
    // Android 7 a 9: carpeta de descargas de la propia app (no requiere permisos).
    val dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: filesDir
    dir.mkdirs()
    File(dir, name).writeBytes(bytes)
    return dir.absolutePath
  }

  private inner class NativeBridge {
    @JavascriptInterface
    fun saveFile(name: String, mime: String, base64: String): Boolean {
      return try {
        val bytes = Base64.decode(base64, Base64.DEFAULT)
        val safe = name.substringAfterLast('/').substringAfterLast('\\')
          .replace(Regex("[<>:\"|?*\\p{Cntrl}]"), "_")
          .ifBlank { "archivo" }
        val where = writeToDownloads(safe, mime, bytes)
        runOnUiThread {
          Toast.makeText(this@MainActivity, "Guardado en $where: $safe", Toast.LENGTH_LONG).show()
        }
        true
      } catch (e: Exception) {
        runOnUiThread {
          Toast.makeText(this@MainActivity, "No se pudo guardar el archivo", Toast.LENGTH_LONG).show()
        }
        false
      }
    }

    @JavascriptInterface
    fun print() {
      runOnUiThread { printPage() }
    }
  }
}
