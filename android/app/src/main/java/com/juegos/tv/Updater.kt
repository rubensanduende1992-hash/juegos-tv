package com.juegos.tv

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

/** Busca una versión nueva en GitHub al abrir la app y ofrece instalarla. */
object Updater {
    private const val REPO = "rubensanduende1992-hash/juegos-tv"

    fun check(a: Activity) {
        Thread {
            try {
                val c = URL("https://api.github.com/repos/$REPO/releases/latest").openConnection() as HttpURLConnection
                c.setRequestProperty("User-Agent", "uno-tv")
                c.connectTimeout = 8000; c.readTimeout = 8000
                val tag = JSONObject(c.inputStream.bufferedReader().readText()).getString("tag_name")
                val remote = tag.trim().removePrefix("v").toIntOrNull() ?: return@Thread
                @Suppress("DEPRECATION")
                val local = a.packageManager.getPackageInfo(a.packageName, 0).versionCode
                if (remote > local) a.runOnUiThread { ask(a, remote) }
            } catch (e: Exception) { }
        }.start()
    }

    private fun ask(a: Activity, v: Int) {
        AlertDialog.Builder(a)
            .setTitle("Actualización disponible")
            .setMessage("Hay una versión nueva (v$v). ¿Actualizar ahora?")
            .setPositiveButton("Actualizar") { _, _ -> download(a) }
            .setNegativeButton("Ahora no", null)
            .show()
    }

    private fun download(a: Activity) {
        if (Build.VERSION.SDK_INT >= 26 && !a.packageManager.canRequestPackageInstalls()) {
            Toast.makeText(a, "Permití instalar desde esta app y volvé a tocar Actualizar", Toast.LENGTH_LONG).show()
            a.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + a.packageName)))
            return
        }
        Toast.makeText(a, "Descargando actualización…", Toast.LENGTH_LONG).show()
        Thread {
            try {
                val f = File(a.cacheDir, "uno.apk")
                val c = URL("https://github.com/$REPO/releases/latest/download/uno.apk").openConnection() as HttpURLConnection
                c.connectTimeout = 15000; c.readTimeout = 30000
                c.inputStream.use { i -> f.outputStream().use { o -> i.copyTo(o) } }
                val u = FileProvider.getUriForFile(a, a.packageName + ".fp", f)
                a.runOnUiThread {
                    a.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(u, "application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
                }
            } catch (e: Exception) {
                a.runOnUiThread { Toast.makeText(a, "No se pudo descargar la actualización", Toast.LENGTH_LONG).show() }
            }
        }.start()
    }
}
