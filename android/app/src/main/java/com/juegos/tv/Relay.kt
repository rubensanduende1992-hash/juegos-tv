package com.juegos.tv

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.webkit.WebView
import fi.iki.elonen.NanoHTTPD
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.io.PipedInputStream
import java.io.PipedOutputStream
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/** Relé: sirve las páginas y pasa las acciones de los celulares al juego (que corre en la página de la TV). */
class Relay(private val ctx: Context, private val host: WebView) : NanoHTTPD(3000) {
    class Client(val id: String, val out: PipedOutputStream)

    private val clients = CopyOnWriteArrayList<Client>()
    private val ui = Handler(Looper.getMainLooper())

    private fun js(code: String): String? {
        val latch = CountDownLatch(1)
        var res: String? = null
        ui.post { host.evaluateJavascript(code) { v -> res = v; latch.countDown() } }
        latch.await(3, TimeUnit.SECONDS)
        return res
    }

    private fun unq(v: String?): String? = try { JSONArray("[$v]").getString(0) } catch (e: Exception) { null }

    private fun push(c: Client) {
        val v = unq(js("hostView(${JSONObject.quote(c.id)})")) ?: return
        try { c.out.write("data: $v\n\n".toByteArray()); c.out.flush() } catch (e: IOException) { clients.remove(c) }
    }

    fun changed() { clients.forEach { push(it) } }

    override fun serve(s: IHTTPSession): Response {
        val p = s.uri
        if (p == "/events") {
            val id = s.parameters["id"]?.firstOrNull() ?: ""
            val inp = PipedInputStream(65536)
            val c = Client(id, PipedOutputStream(inp))
            clients.add(c)
            push(c)
            val r = newChunkedResponse(Response.Status.OK, "text/event-stream", inp)
            r.addHeader("Cache-Control", "no-cache")
            return r
        }
        if (p == "/act" && s.method == Method.POST) {
            val m = HashMap<String, String>()
            s.parseBody(m)
            val body = m["postData"] ?: "{}"
            val r = unq(js("hostAct(${JSONObject.quote(body)})")) ?: "{\"err\":\"Error\"}"
            return newFixedLengthResponse(Response.Status.OK, "application/json", r)
        }
        val f = if (p == "/") "tv-app.html" else p.trimStart('/')
        if (f == "play.html") {
            val h = ctx.assets.open("www/$f").bufferedReader().readText().replace("</head>", "<link rel=\"stylesheet\" href=\"/skin.css\"></head>")
            return newFixedLengthResponse(Response.Status.OK, "text/html; charset=utf-8", h)
        }
        val mime = when (f.substringAfterLast('.')) { "html" -> "text/html"; "js" -> "text/javascript"; "css" -> "text/css"; "webp" -> "image/webp"; else -> "application/octet-stream" }
        return try {
            newChunkedResponse(Response.Status.OK, "$mime; charset=utf-8", ctx.assets.open("www/$f"))
        } catch (e: Exception) {
            newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "404")
        }
    }
}
