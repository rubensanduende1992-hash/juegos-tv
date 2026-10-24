package com.juegos.tv

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.BitmapFactory
import com.google.zxing.integration.android.IntentIntegrator
import android.graphics.Color
import android.widget.FrameLayout
import android.widget.ImageView
import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import java.net.NetworkInterface

class MainActivity : Activity() {
    private var relay: Relay? = null
    private var inWeb = false

    inner class Bridge {
        @JavascriptInterface fun ip(): String = localIp()
        @JavascriptInterface fun changed() { relay?.changed() }
    }

    inner class PhoneBridge {
        @Suppress("DEPRECATION")
        @JavascriptInterface fun landscape(on: Boolean) {
            runOnUiThread {
                if (on) requestedOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
            }
        }
    }

    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        menu()
        intent?.data?.let { handleLink(it.toString()) }
        Updater.check(this)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        intent?.data?.let { handleLink(it.toString()) }
    }

    /** Abre la sala de una TV a partir de un enlace: unotv://IP:3000/sala?c=ABCD o http://IP:3000/play.html?c=ABCD */
    private fun handleLink(text: String?): Boolean {
        val u = try { android.net.Uri.parse(text ?: return false) } catch (e: Exception) { return false }
        val host = u.host ?: return false
        val ok = u.scheme == "unotv" || (u.scheme == "http" && (u.path ?: "").startsWith("/play"))
        if (!ok) return false
        val port = if (u.port > 0) u.port else 3000
        val code = u.getQueryParameter("c") ?: ""
        openPhone("http://$host:$port/play.html" + if (code.isNotEmpty()) "?c=$code" else "")
        return true
    }

    @Suppress("DEPRECATION")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        val r = IntentIntegrator.parseActivityResult(requestCode, resultCode, data)
        if (r != null && r.contents != null) {
            if (!handleLink(r.contents)) android.widget.Toast.makeText(this, "Ese QR no es de una sala de UNO TV", android.widget.Toast.LENGTH_LONG).show()
        } else super.onActivityResult(requestCode, resultCode, data)
    }

    @Suppress("DEPRECATION")
    private fun version(): Int = try { packageManager.getPackageInfo(packageName, 0).versionCode } catch (e: Exception) { 0 }

    private fun menu() {
        inWeb = false
        val root = FrameLayout(this)
        root.addView(ImageView(this).apply {
            scaleType = ImageView.ScaleType.CENTER_CROP
            try { setImageBitmap(BitmapFactory.decodeStream(assets.open("www/bg-tv.jpg"))) } catch (e: Exception) { }
        }, FrameLayout.LayoutParams(-1, -1))
        val l = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(60, 40, 60, 40); gravity = Gravity.CENTER; setBackgroundColor(0xB0000000.toInt()) }
        val t = TextView(this).apply { text = "UNO TV  v" + version(); textSize = 32f; gravity = Gravity.CENTER; setTextColor(Color.WHITE) }
        val bt = Button(this).apply { text = "Modo TV (mesa)"; setOnClickListener { startTv() } }
        val ip = EditText(this).apply { hint = "Dirección de la TV, ej: 192.168.1.20"; setSingleLine(); setTextColor(Color.WHITE); setHintTextColor(Color.LTGRAY) }
        val bp = Button(this).apply { text = "Modo celular (control)"; setOnClickListener { startPhone(ip.text.toString().trim()) } }
        val bs = Button(this).apply {
            text = "Escanear QR de la TV"
            setOnClickListener {
                IntentIntegrator(this@MainActivity).setDesiredBarcodeFormats(IntentIntegrator.QR_CODE)
                    .setPrompt("Apuntá al QR de la TV").setBeepEnabled(false).setOrientationLocked(false).initiateScan()
            }
        }
        l.orientation = LinearLayout.HORIZONTAL
        val left = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER }
        val right = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER }
        left.addView(t); left.addView(bt)
        right.addView(bs); right.addView(ip); right.addView(bp)
        l.addView(left, LinearLayout.LayoutParams(0, -2, 1f).apply { setMargins(20, 0, 20, 0) })
        l.addView(right, LinearLayout.LayoutParams(0, -2, 1f).apply { setMargins(20, 0, 20, 0) })
        val lp = FrameLayout.LayoutParams(-1, -2, Gravity.CENTER).apply { setMargins(120, 0, 120, 0) }
        root.addView(l, lp)
        setContentView(root)
        bt.requestFocus()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun web(): WebView {
        val w = WebView(this)
        w.settings.javaScriptEnabled = true
        w.settings.domStorageEnabled = true
        w.setBackgroundColor(0xFF0E1117.toInt())
        w.webViewClient = object : WebViewClient() {
            override fun onReceivedError(v: WebView, req: WebResourceRequest, err: WebResourceError) {
                if (req.isForMainFrame) v.loadDataWithBaseURL(null,
                    "<body style='background:#0e1117;color:#fff;font:20px sans-serif;padding:24px'><h2>No se pudo abrir la sala</h2><p>${err.description}</p><p>Revisá que la TV tenga la app abierta en Modo TV y que estén en la misma Wi-Fi. Apretá Atrás para volver al menú.</p><p><a style='color:#6ec1ff' href='${req.url}'>Reintentar</a></p></body>",
                    "text/html", "utf-8", null)
            }
        }
        inWeb = true
        setContentView(w)
        return w
    }

    private fun startTv() {
        val w = web()
        w.addJavascriptInterface(Bridge(), "Android")
        relay = Relay(this, w)
        try { relay?.start() } catch (e: Exception) {
            android.widget.Toast.makeText(this, "No se pudo iniciar la sala: " + e.message, android.widget.Toast.LENGTH_LONG).show()
        }
        w.loadUrl("http://127.0.0.1:3000/")
    }

    private fun startPhone(ip: String) {
        if (ip.isEmpty()) return
        openPhone("http://$ip:3000/play.html")
    }

    private fun openPhone(url: String) {
        val w = web()
        w.addJavascriptInterface(PhoneBridge(), "AndroidPhone")
        w.loadUrl(url)
    }

    private fun localIp(): String =
        NetworkInterface.getNetworkInterfaces().toList()
            .flatMap { it.inetAddresses.toList() }
            .firstOrNull { !it.isLoopbackAddress && it.hostAddress?.contains(':') == false }
            ?.hostAddress ?: "127.0.0.1"

    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        if (inWeb) {
            try { relay?.stop() } catch (e: Exception) { }
            relay = null
            menu()
        } else super.onBackPressed()
    }

    override fun onDestroy() { relay?.stop(); super.onDestroy() }
}
