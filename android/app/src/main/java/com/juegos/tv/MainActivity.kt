package com.juegos.tv

import android.annotation.SuppressLint
import android.app.Activity
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
    }

    private fun menu() {
        val l = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(60, 60, 60, 60); gravity = Gravity.CENTER }
        val t = TextView(this).apply { text = "UNO TV"; textSize = 32f; gravity = Gravity.CENTER }
        val bt = Button(this).apply { text = "Modo TV (mesa)"; setOnClickListener { startTv() } }
        val ip = EditText(this).apply { hint = "Dirección de la TV, ej: 192.168.1.20"; setSingleLine() }
        val bp = Button(this).apply { text = "Modo celular (control)"; setOnClickListener { startPhone(ip.text.toString().trim()) } }
        l.addView(t); l.addView(bt); l.addView(ip); l.addView(bp)
        setContentView(l)
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
