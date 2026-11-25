package com.juegos.tv

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Al abrir la app busca una versión nueva en GitHub. Si hay una, la DESCARGA SOLA (con barra de avance)
 * y cuando termina pregunta si instalarla. Android no deja instalar sin que la persona toque "Instalar".
 */
object Updater {
    private const val REPO = "rubensanduende1992-hash/juegos-tv"
    private const val APK_URL = "https://github.com/$REPO/releases/latest/download/uno.apk"
    private val busy = AtomicBoolean(false)

    fun check(a: Activity) {
        Thread {
            try {
                val c = URL("https://api.github.com/repos/$REPO/releases/latest").openConnection() as HttpURLConnection
                c.setRequestProperty("User-Agent", "uno-tv")
                c.connectTimeout = 8000; c.readTimeout = 8000
                val j = JSONObject(c.inputStream.bufferedReader().readText())
                val remote = j.getString("tag_name").trim().removePrefix("v").toIntOrNull() ?: return@Thread
                @Suppress("DEPRECATION")
                val local = a.packageManager.getPackageInfo(a.packageName, 0).versionCode
                if (remote <= local) return@Thread
                var size = 0L
                val assets = j.optJSONArray("assets")
                if (assets != null) for (i in 0 until assets.length()) {
                    val x = assets.getJSONObject(i)
                    if (x.optString("name") == "uno.apk") size = x.optLong("size")
                }
                val sz = size
                a.runOnUiThread { if (!a.isFinishing) start(a, remote, sz) }
            } catch (e: Exception) { }
        }.start()
    }

    private fun start(a: Activity, v: Int, size: Long) {
        if (!busy.compareAndSet(false, true)) return
        val f = File(a.cacheDir, "uno-v$v.apk")
        a.cacheDir.listFiles()?.filter { (it.name.endsWith(".apk") || it.name.endsWith(".part")) && it != f }?.forEach { it.delete() }
        if (f.exists() && size > 0 && f.length() == size) { busy.set(false); ready(a, v, f); return }
        download(a, v, f)
    }

    private fun download(a: Activity, v: Int, f: File) {
        val cancel = AtomicBoolean(false)
        val txt = TextView(a).apply { text = "Conectando…"; textSize = 16f; setPadding(0, 0, 0, 24) }
        val bar = ProgressBar(a, null, android.R.attr.progressBarStyleHorizontal).apply { max = 100; isIndeterminate = true }
        val box = LinearLayout(a).apply { orientation = LinearLayout.VERTICAL; setPadding(56, 36, 56, 16); addView(txt); addView(bar) }
        val dlg = AlertDialog.Builder(a).setTitle("Descargando la versión nueva (v$v)").setView(box).setCancelable(false)
            .setPositiveButton("Seguir usando la app", null)
            .setNegativeButton("Cancelar") { _, _ -> cancel.set(true) }.create()
        dlg.show()
        Thread {
            val part = File(a.cacheDir, f.name + ".part")
            try {
                // GitHub redirige a otro servidor: seguimos las redirecciones a mano
                var url = APK_URL
                var c: HttpURLConnection
                var hops = 0
                while (true) {
                    c = URL(url).openConnection() as HttpURLConnection
                    c.instanceFollowRedirects = false
                    c.connectTimeout = 15000; c.readTimeout = 20000
                    c.setRequestProperty("User-Agent", "uno-tv")
                    val code = c.responseCode
                    if (code in 300..399 && hops < 6) {
                        url = URL(URL(url), c.getHeaderField("Location")).toString()
                        c.disconnect(); hops++; continue
                    }
                    if (code != 200) throw java.io.IOException("El servidor respondió $code")
                    break
                }
                val total = c.contentLengthLong
                part.delete()
                c.inputStream.use { i ->
                    part.outputStream().use { o ->
                        val buf = ByteArray(64 * 1024)
                        var done = 0L
                        var last = 0L
                        while (true) {
                            if (cancel.get()) throw java.io.IOException("Cancelado")
                            val n = i.read(buf)
                            if (n < 0) break
                            o.write(buf, 0, n); done += n
                            val now = System.currentTimeMillis()
                            if (now - last > 250) {
                                last = now
                                val d = done
                                a.runOnUiThread {
                                    if (dlg.isShowing) {
                                        if (total > 0) {
                                            bar.isIndeterminate = false
                                            bar.progress = (d * 100 / total).toInt()
                                            txt.text = "${d / 1048576} de ${total / 1048576} MB  (${d * 100 / total}%)"
                                        } else txt.text = "${d / 1048576} MB"
                                    }
                                }
                            }
                        }
                    }
                }
                if (total > 0 && part.length() != total) throw java.io.IOException("La descarga quedó incompleta")
                if (!part.renameTo(f)) throw java.io.IOException("No se pudo guardar el archivo")
                busy.set(false)
                a.runOnUiThread {
                    if (dlg.isShowing) dlg.dismiss()
                    if (!a.isFinishing) ready(a, v, f)
                }
            } catch (e: Exception) {
                part.delete()
                busy.set(false)
                a.runOnUiThread {
                    if (dlg.isShowing) dlg.dismiss()
                    if (!cancel.get() && !a.isFinishing) fail(a, e.message ?: e.javaClass.simpleName)
                }
            }
        }.start()
    }

    private fun ready(a: Activity, v: Int, f: File) {
        AlertDialog.Builder(a)
            .setTitle("Actualización lista")
            .setMessage("La versión v$v ya se descargó. ¿Instalarla ahora?")
            .setPositiveButton("Instalar") { _, _ -> install(a, f) }
            .setNegativeButton("Más tarde", null)
            .show()
    }

    private fun install(a: Activity, f: File) {
        if (Build.VERSION.SDK_INT >= 26 && !a.packageManager.canRequestPackageInstalls()) {
            Toast.makeText(a, "Permití instalar desde esta app, volvé y abrí la app de nuevo para instalar", Toast.LENGTH_LONG).show()
            a.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + a.packageName)))
            return
        }
        try {
            val u = FileProvider.getUriForFile(a, a.packageName + ".fp", f)
            a.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(u, "application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
        } catch (e: Exception) { fail(a, "No se pudo abrir el instalador: " + (e.message ?: "")) }
    }

    private fun fail(a: Activity, why: String) {
        AlertDialog.Builder(a)
            .setTitle("No se pudo actualizar")
            .setMessage("$why\n\nPodés descargar la versión nueva con el navegador.")
            .setPositiveButton("Descargar con el navegador") { _, _ ->
                try { a.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(APK_URL))) } catch (e: Exception) { }
            }
            .setNegativeButton("Cerrar", null)
            .show()
    }
}
