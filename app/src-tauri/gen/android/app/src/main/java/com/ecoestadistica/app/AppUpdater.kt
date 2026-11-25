package com.ecoestadistica.app

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.widget.Toast
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Busca versiones nuevas en los releases de GitHub al abrir la app y ofrece descargar e instalar
 * el APK que corresponde a la arquitectura del teléfono (EcoEstadistica_<tag>_android_<arquitectura>.apk).
 *
 * Para que Android acepte la actualización, el APK nuevo debe estar firmado con la misma clave que el instalado.
 * Por eso el CI firma con un keystore fijo (ver app/README.md).
 */
class AppUpdater(private val activity: Activity) {
  private class Release(val version: String, val apkUrl: String, val apkName: String)

  @Volatile private var started = false
  private var pending: Release? = null

  /** Revisa en segundo plano (una vez por apertura). Si no hay conexión o falla algo, no hace nada. */
  fun checkOnLaunch() {
    if (started) return
    started = true
    Thread {
      try {
        val release = fetchLatest() ?: return@Thread
        if (isNewer(release.version, installedVersion())) {
          activity.runOnUiThread { askToUpdate(release) }
        }
      } catch (_: Exception) {
        // Sin conexión, límite de la API de GitHub, etc.: se ignora.
      }
    }.start()
  }

  /** Si la persona acaba de conceder el permiso de instalar apps, continúa con la descarga. */
  fun resumePending() {
    val release = pending ?: return
    if (canInstall()) {
      pending = null
      download(release)
    }
  }

  private fun installedVersion(): String =
    activity.packageManager.getPackageInfo(activity.packageName, 0).versionName ?: "0"

  private fun abiSuffixes(): List<String> = Build.SUPPORTED_ABIS.mapNotNull {
    when (it) {
      "arm64-v8a" -> "arm64"
      "armeabi-v7a" -> "arm"
      "x86_64" -> "x86_64"
      "x86" -> "x86"
      else -> null
    }
  }

  private fun fetchLatest(): Release? {
    val conn = URL(API_LATEST).openConnection() as HttpURLConnection
    try {
      conn.connectTimeout = 8000
      conn.readTimeout = 8000
      conn.setRequestProperty("Accept", "application/vnd.github+json")
      conn.setRequestProperty("User-Agent", "EcoEstadistica-Android")
      if (conn.responseCode != 200) return null
      val json = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
      val tag = json.optString("tag_name")
      val assets = json.optJSONArray("assets") ?: return null
      for (suffix in abiSuffixes()) {
        for (i in 0 until assets.length()) {
          val asset = assets.getJSONObject(i)
          val name = asset.optString("name")
          if (name.endsWith("_android_$suffix.apk")) {
            return Release(tag, asset.optString("browser_download_url"), name)
          }
        }
      }
      return null
    } finally {
      conn.disconnect()
    }
  }

  private fun parts(v: String): List<Int> =
    v.trim().trimStart('v', 'V').split('.', '-').mapNotNull { it.toIntOrNull() }

  private fun isNewer(remote: String, local: String): Boolean {
    val a = parts(remote)
    val b = parts(local)
    for (i in 0 until maxOf(a.size, b.size)) {
      val x = a.getOrElse(i) { 0 }
      val y = b.getOrElse(i) { 0 }
      if (x != y) return x > y
    }
    return false
  }

  private fun askToUpdate(release: Release) {
    if (activity.isFinishing) return
    AlertDialog.Builder(activity)
      .setTitle("Actualización disponible")
      .setMessage("Hay una nueva versión (${release.version}). Tu versión es la ${installedVersion()}.\n\n¿Quieres descargarla e instalarla ahora?")
      .setPositiveButton("Actualizar") { _, _ -> startUpdate(release) }
      .setNegativeButton("Más tarde", null)
      .show()
  }

  private fun canInstall(): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.O || activity.packageManager.canRequestPackageInstalls()

  private fun startUpdate(release: Release) {
    if (!canInstall()) {
      // Android exige un permiso por app para instalar APK. Se abre la pantalla de ajustes y, al volver, se continúa.
      pending = release
      Toast.makeText(activity, "Activa \"Permitir desde esta fuente\" para EcoEstadística y vuelve a la app", Toast.LENGTH_LONG).show()
      activity.startActivity(
        Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${activity.packageName}"))
      )
      return
    }
    download(release)
  }

  private fun download(release: Release) {
    val progress = AlertDialog.Builder(activity)
      .setTitle("Descargando actualización")
      .setMessage("0 %")
      .setCancelable(false)
      .show()
    Thread {
      try {
        val dir = File(activity.cacheDir, "updates")
        dir.mkdirs()
        dir.listFiles()?.forEach { it.delete() }
        val file = File(dir, release.apkName)
        val conn = URL(release.apkUrl).openConnection() as HttpURLConnection
        conn.connectTimeout = 15000
        conn.readTimeout = 30000
        conn.setRequestProperty("User-Agent", "EcoEstadistica-Android")
        val total = conn.contentLengthLong
        var done = 0L
        var lastPct = -1
        conn.inputStream.use { input ->
          file.outputStream().use { out ->
            val buf = ByteArray(64 * 1024)
            while (true) {
              val n = input.read(buf)
              if (n < 0) break
              out.write(buf, 0, n)
              done += n
              if (total > 0) {
                val pct = (done * 100 / total).toInt()
                if (pct != lastPct) {
                  lastPct = pct
                  activity.runOnUiThread { progress.setMessage("$pct %") }
                }
              }
            }
          }
        }
        conn.disconnect()
        activity.runOnUiThread {
          progress.dismiss()
          install(file)
        }
      } catch (e: Exception) {
        activity.runOnUiThread {
          progress.dismiss()
          Toast.makeText(activity, "No se pudo descargar la actualización", Toast.LENGTH_LONG).show()
        }
      }
    }.start()
  }

  private fun install(file: File) {
    val uri = FileProvider.getUriForFile(activity, "${activity.packageName}.fileprovider", file)
    val intent = Intent(Intent.ACTION_VIEW)
      .setDataAndType(uri, "application/vnd.android.package-archive")
      .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
    activity.startActivity(intent)
  }

  companion object {
    private const val API_LATEST = "https://api.github.com/repos/AldeCraft/EcoEstadistica-website/releases/latest"
  }
}
