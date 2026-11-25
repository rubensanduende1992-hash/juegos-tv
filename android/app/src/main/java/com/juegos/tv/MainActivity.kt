package com.juegos.tv

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.BitmapFactory
import com.google.zxing.integration.android.IntentIntegrator
import android.graphics.Color
import android.widget.FrameLayout
import android.widget.ImageView
import android.os.Build
import android.os.Bundle
import android.util.TypedValue
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
    private var curWeb: WebView? = null

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
        val pth = u.path ?: ""
        val ok = u.scheme == "unotv" || (u.scheme == "http" && (pth.startsWith("/play") || pth.startsWith("/truco-play") || pth.startsWith("/domino-play") || pth.startsWith("/impostor-play") || pth.startsWith("/control")))
        if (!ok) return false
        val port = if (u.port > 0) u.port else 3000
        val code = u.getQueryParameter("c") ?: ""
        val g = u.getQueryParameter("g")
        val page = if (g == "impostor" || pth.startsWith("/impostor-play")) "impostor-play.html" else if (g == "domino" || pth.startsWith("/domino-play")) "domino-play.html" else if (g == "truco" || pth.startsWith("/truco-play")) "truco-play.html" else if (g == "home" || pth.startsWith("/control")) "control.html" else "play.html"
        openPhone("http://$host:$port/$page" + if (code.isNotEmpty()) "?c=$code" else "")
        return true
    }

    @Suppress("DEPRECATION")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        val r = IntentIntegrator.parseActivityResult(requestCode, resultCode, data)
        if (r != null && r.contents != null) {
            if (!handleLink(r.contents)) android.widget.Toast.makeText(this, "Ese QR no es de una sala de Juegos TV", android.widget.Toast.LENGTH_LONG).show()
        } else super.onActivityResult(requestCode, resultCode, data)
    }

    @Suppress("DEPRECATION")
    private fun version(): Int = try { packageManager.getPackageInfo(packageName, 0).versionCode } catch (e: Exception) { 0 }

    private fun menu() {
        inWeb = false
        val dm = resources.displayMetrics
        // Todo el menú se mide contra el tamaño real de la pantalla (1920 px de ancho = 1.0),
        // así se ve igual en cualquier TV box sin importar la densidad que informe.
        val wpx = maxOf(dm.widthPixels, dm.heightPixels)
        val hpx = minOf(dm.widthPixels, dm.heightPixels)
        val u = (minOf(wpx.toFloat(), hpx * 16f / 9f) / 1920f).coerceAtLeast(0.3f)
        fun px(v: Float) = (v * u).toInt()
        fun btn(b: Button) {
            b.setTextSize(TypedValue.COMPLEX_UNIT_PX, 34f * u)
            b.setPadding(px(40f), px(22f), px(40f), px(22f))
            b.isAllCaps = false
        }
        fun lpv() = LinearLayout.LayoutParams(-1, -2).apply { setMargins(0, px(14f), 0, px(14f)) }

        val root = FrameLayout(this)
        root.addView(ImageView(this).apply {
            scaleType = ImageView.ScaleType.CENTER_CROP
            try { setImageBitmap(BitmapFactory.decodeStream(assets.open("www/bg-tv.jpg"))) } catch (e: Exception) { }
        }, FrameLayout.LayoutParams(-1, -1))
        val l = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(px(60f), px(40f), px(60f), px(40f))
            gravity = Gravity.CENTER
            setBackgroundColor(0xB0000000.toInt())
        }
        val t = TextView(this).apply {
            text = "JUEGOS TV  v" + version()
            setTextSize(TypedValue.COMPLEX_UNIT_PX, 64f * u)
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
        }
        val bt = Button(this).apply { text = "Modo TV (mesa)"; btn(this); setOnClickListener { startTv() } }
        val ip = EditText(this).apply {
            hint = "Dirección de la TV, ej: 192.168.1.20"
            setSingleLine()
            setTextSize(TypedValue.COMPLEX_UNIT_PX, 30f * u)
            setTextColor(Color.WHITE)
            setHintTextColor(Color.LTGRAY)
        }
        val bp = Button(this).apply { text = "Modo celular (control)"; btn(this); setOnClickListener { startPhone(ip.text.toString().trim()) } }
        val bs = Button(this).apply {
            text = "Escanear QR de la TV"
            btn(this)
            setOnClickListener {
                IntentIntegrator(this@MainActivity).setDesiredBarcodeFormats(IntentIntegrator.QR_CODE)
                    .setPrompt("Apuntá al QR de la TV").setBeepEnabled(false).setOrientationLocked(false).initiateScan()
            }
        }
        val left = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER }
        val right = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER }
        left.addView(t, lpv()); left.addView(bt, lpv())
        right.addView(bs, lpv()); right.addView(ip, lpv()); right.addView(bp, lpv())
        l.addView(left, LinearLayout.LayoutParams(0, -2, 1f).apply { setMargins(px(20f), 0, px(20f), 0) })
        l.addView(right, LinearLayout.LayoutParams(0, -2, 1f).apply { setMargins(px(20f), 0, px(20f), 0) })
        root.addView(l, FrameLayout.LayoutParams(-1, -2, Gravity.CENTER).apply { setMargins(px(120f), 0, px(120f), 0) })

        setContentView(root)
        bt.requestFocus()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun web(): WebView {
        val w = WebView(this)
        w.settings.javaScriptEnabled = true
        w.settings.domStorageEnabled = true
        w.settings.mediaPlaybackRequiresUserGesture = false
        w.setBackgroundColor(0xFF0E1117.toInt())
        w.webViewClient = object : WebViewClient() {
            override fun onReceivedError(v: WebView, req: WebResourceRequest, err: WebResourceError) {
                if (req.isForMainFrame) v.loadDataWithBaseURL(null,
                    "<body style='background:#0e1117;color:#fff;font:20px sans-serif;padding:24px'><h2>No se pudo abrir la sala</h2><p>${err.description}</p><p>Revisá que la TV tenga la app abierta en Modo TV y que estén en la misma Wi-Fi. Apretá Atrás para volver al menú.</p><p><a style='color:#6ec1ff' href='${req.url}'>Reintentar</a></p></body>",
                    "text/html", "utf-8", null)
            }
        }
        inWeb = true
        curWeb = w
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
        openPhone("http://$ip:3000/control.html")
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
            val path = try { android.net.Uri.parse(curWeb?.url ?: "").path ?: "/" } catch (e: Exception) { "/" }
            if (relay != null && path != "/" && path != "") { curWeb?.loadUrl("http://127.0.0.1:3000/"); return }
            try { relay?.stop() } catch (e: Exception) { }
            relay = null
            menu()
        } else super.onBackPressed()
    }

    override fun onDestroy() { relay?.stop(); super.onDestroy() }
}
