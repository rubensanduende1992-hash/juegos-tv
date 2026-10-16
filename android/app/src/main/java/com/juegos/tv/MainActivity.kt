package com.juegos.tv

import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.BitmapFactory
import android.graphics.Color
import android.widget.FrameLayout
import android.widget.ImageView
import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import java.net.NetworkInterface

class MainActivity : Activity() {
    private var relay: Relay? = null

    inner class Bridge {
        @JavascriptInterface fun ip(): String = localIp()
        @JavascriptInterface fun changed() { relay?.changed() }
    }

    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        menu()
        Updater.check(this)
    }

    @Suppress("DEPRECATION")
    private fun version(): Int = try { packageManager.getPackageInfo(packageName, 0).versionCode } catch (e: Exception) { 0 }

    private fun menu() {
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
        l.addView(t); l.addView(bt); l.addView(ip); l.addView(bp)
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
        w.webViewClient = WebViewClient()
        setContentView(w)
        return w
    }

    private fun startTv() {
        val w = web()
        w.addJavascriptInterface(Bridge(), "Android")
        relay = Relay(this, w).also { it.start() }
        w.loadUrl("http://127.0.0.1:3000/")
    }

    private fun startPhone(ip: String) {
        if (ip.isEmpty()) return
        web().loadUrl("http://$ip:3000/play.html")
    }

    private fun localIp(): String =
        NetworkInterface.getNetworkInterfaces().toList()
            .flatMap { it.inetAddresses.toList() }
            .firstOrNull { !it.isLoopbackAddress && it.hostAddress?.contains(':') == false }
            ?.hostAddress ?: "127.0.0.1"

    override fun onDestroy() { relay?.stop(); super.onDestroy() }
}
