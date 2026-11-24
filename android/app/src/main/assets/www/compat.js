/* compat.js - hace que las pantallas de la TV funcionen en WebView viejos (Chrome < 88).
   Traduce min()/max()/clamp(), inset, aspect-ratio y gap de flex a CSS que entiende Chrome 74.
   En navegadores modernos no hace nada. */
(function (root) {
  function splitTop(s) {
    var out = [], cur = '', d = 0, i, ch;
    for (i = 0; i < s.length; i++) {
      ch = s.charAt(i);
      if (ch === '(') d++; else if (ch === ')') d--;
      if (/\s/.test(ch) && d === 0) { if (cur) { out.push(cur); cur = ''; } } else cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  }
  function makeEval(W, H, vars) {
    return function (src) {
      var bad = false;
      src = src.replace(/var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)/g, function (m, n) {
        if (vars && vars[n] != null) return '(' + vars[n] + ')'; bad = true; return '0';
      });
      if (bad) return null;
      var s = src, i = 0;
      function ws() { while (i < s.length && /\s/.test(s.charAt(i))) i++; }
      function fail() { throw new Error('x'); }
      function factor() {
        ws();
        var c = s.charAt(i), m, r;
        if (c === '-') { i++; r = factor(); return { v: -r.v, l: r.l }; }
        if (c === '+') { i++; return factor(); }
        if (c === '(') { i++; r = sum(); ws(); if (s.charAt(i) !== ')') fail(); i++; return r; }
        m = /^([a-z-]+)\(/i.exec(s.slice(i));
        if (m) {
          var name = m[1].toLowerCase(); i += m[0].length;
          var args = [sum()];
          ws();
          while (s.charAt(i) === ',') { i++; args.push(sum()); ws(); }
          if (s.charAt(i) !== ')') fail(); i++;
          if (name === 'calc' && args.length === 1) return args[0];
          if ((name === 'min' || name === 'max') && args.length >= 1) {
            var v = args[0].v, k;
            for (k = 1; k < args.length; k++) v = name === 'min' ? Math.min(v, args[k].v) : Math.max(v, args[k].v);
            return { v: v, l: args[0].l };
          }
          if (name === 'clamp' && args.length === 3) return { v: Math.max(args[0].v, Math.min(args[1].v, args[2].v)), l: args[0].l };
          fail();
        }
        m = /^(\d*\.?\d+)(px|vw|vh|vmin|vmax|dvh|svh|lvh|rem|%|em)?/i.exec(s.slice(i));
        if (!m) fail();
        i += m[0].length;
        var n = parseFloat(m[1]), u = (m[2] || '').toLowerCase();
        if (u === '') return { v: n, l: false };
        if (u === 'px') return { v: n, l: true };
        if (u === 'vw') return { v: n * W / 100, l: true };
        if (u === 'vh' || u === 'dvh' || u === 'svh' || u === 'lvh') return { v: n * H / 100, l: true };
        if (u === 'vmin') return { v: n * Math.min(W, H) / 100, l: true };
        if (u === 'vmax') return { v: n * Math.max(W, H) / 100, l: true };
        if (u === 'rem') return { v: n * 16, l: true };
        fail();
      }
      function term() {
        var f = factor(), g;
        for (;;) {
          ws(); var c = s.charAt(i);
          if (c === '*') { i++; g = factor(); if (f.l && g.l) fail(); f = { v: f.v * g.v, l: f.l || g.l }; }
          else if (c === '/') { i++; g = factor(); if (g.l) fail(); f = { v: f.v / g.v, l: f.l }; }
          else return f;
        }
      }
      function sum() {
        var f = term(), g;
        for (;;) {
          ws(); var c = s.charAt(i);
          if (c === '+' || c === '-') { i++; g = term(); if (f.l !== g.l) fail(); f = { v: c === '+' ? f.v + g.v : f.v - g.v, l: f.l }; }
          else return f;
        }
      }
      try {
        var r = sum(); ws();
        if (i !== s.length || !r.l) return null;
        return (Math.round(r.v * 100) / 100) + 'px';
      } catch (e) { return null; }
    };
  }
  function resolveFns(css, ev) {
    var re = /(^|[^a-zA-Z0-9_-])(min|max|clamp)\(/g, out = '', last = 0, m, un = 0;
    while ((m = re.exec(css))) {
      var start = m.index + m[1].length, open = start + m[2].length, d = 0, j = open;
      for (; j < css.length; j++) {
        var c = css.charAt(j);
        if (c === '(') d++; else if (c === ')') { d--; if (d === 0) break; }
      }
      if (d !== 0) continue;
      var r = ev(css.slice(start, j + 1));
      if (r == null) { un++; continue; }
      out += css.slice(last, start) + r; last = j + 1; re.lastIndex = j + 1;
    }
    return { css: out + css.slice(last), un: un };
  }
  function compatCSS(css, W, H, info) {
    var r = resolveFns(css, makeEval(W, H, null)), un = r.un;
    css = r.css;
    var vars = {}, vm, vre = /(--[\w-]+)\s*:\s*([^;{}]+)/g;
    while ((vm = vre.exec(css))) {
      var val = vm[2].trim();
      if (vars[vm[1]] == null && /^-?\d*\.?\d+(px|vh|dvh|svh|lvh|vw|vmin|vmax)$/i.test(val)) vars[vm[1]] = val.replace(/(dvh|svh|lvh)$/i, 'vh');
    }
    if (un > 0) { r = resolveFns(css, makeEval(W, H, vars)); css = r.css; un = r.un; }
    // inset -> top/right/bottom/left
    css = css.replace(/([{;\s])inset\s*:\s*([^;}]+)/g, function (m, p, v) {
      var imp = /\s*!important\s*$/.test(v), I = imp ? ' !important' : '';
      v = v.replace(/\s*!important\s*$/, '');
      var a = splitTop(v.trim()), t = a[0], rr = a[1] || t, b = a[2] || t, l = a[3] || rr;
      return p + 'top:' + t + I + ';right:' + rr + I + ';bottom:' + b + I + ';left:' + l + I;
    });
    // aspect-ratio y gap de flex, regla por regla
    css = css.replace(/([^{}]+)\{([^{}]*)\}/g, function (m, sel, body) {
      var extra = '', am, wm, gm;
      am = /aspect-ratio\s*:\s*([\d.]+)\s*\/\s*([\d.]+)/.exec(body);
      wm = /(?:^|[;\s])width\s*:\s*([\d.]+)px/.exec(body);
      if (am && wm) body += ';height:' + (Math.round(parseFloat(wm[1]) * parseFloat(am[2]) / parseFloat(am[1]) * 100) / 100) + 'px';
      gm = /(?:^|[;\s])gap\s*:\s*([^;]+)/.exec(body);
      if (gm && /display\s*:\s*(inline-)?flex/.test(body)) {
        var g = splitTop(gm[1].replace(/\s*!important\s*$/, '').trim()), row = g[0], col = g[1] || g[0];
        var isCol = /flex-direction\s*:\s*column/.test(body) || /flex-flow\s*:[^;]*column/.test(body);
        var wrap = /flex-wrap\s*:\s*wrap/.test(body) || /flex-flow\s*:[^;]*wrap/.test(body);
        var sels = sel.split(','), k, a1 = [], a2 = [];
        for (k = 0; k < sels.length; k++) { var q = sels[k].trim(); if (q) { a1.push(q + '>*+*'); a2.push(q + '>*'); } }
        if (a1.length) {
          if (wrap) extra = a2.join(',') + '{margin-right:' + col + ';margin-bottom:' + row + '}';
          else if (isCol) extra = a1.join(',') + '{margin-top:' + row + '}';
          else extra = a1.join(',') + '{margin-left:' + col + '}';
        }
      }
      return sel + '{' + body + '}' + extra;
    });
    if (info) info.unresolved = un;
    return css;
  }

  root.__compatCSS = compatCSS;
  if (typeof module !== 'undefined' && module.exports) module.exports = compatCSS;
  if (typeof document === 'undefined' || !document.documentElement || typeof module !== 'undefined') return;

  var sup = root.CSS && root.CSS.supports;
  var modern = sup && root.CSS.supports('width', 'min(1px,2px)') && root.CSS.supports('inset', '0') && root.CSS.supports('aspect-ratio', '1/1');
  if (modern) return;

  var items = [];
  function size() {
    var de = document.documentElement;
    return [root.innerWidth || de.clientWidth || screen.width, root.innerHeight || de.clientHeight || screen.height];
  }
  function apply() {
    var sz = size(), info = {}, k;
    for (k = 0; k < items.length; k++) items[k].el.textContent = compatCSS(items[k].orig, sz[0], sz[1], info);
    root.__compatInfo = { active: true, w: sz[0], h: sz[1], unresolved: info.unresolved || 0 };
  }
  var links = document.querySelectorAll('link[rel="stylesheet"]'), i;
  for (i = 0; i < links.length; i++) {
    var l = links[i], href = l.getAttribute('href');
    if (!href || /^(https?:)?\/\//i.test(href)) continue;
    try {
      var x = new XMLHttpRequest(); x.open('GET', href, false); x.send();
      if (x.status !== 200) continue;
      var st = document.createElement('style'); st.setAttribute('data-compat', href);
      l.parentNode.insertBefore(st, l); l.parentNode.removeChild(l);
      items.push({ el: st, orig: x.responseText });
    } catch (e) { }
  }
  var styles = document.querySelectorAll('style:not([data-compat])');
  for (i = 0; i < styles.length; i++) items.push({ el: styles[i], orig: styles[i].textContent });
  apply();
  var tmr;
  root.addEventListener('resize', function () { clearTimeout(tmr); tmr = setTimeout(apply, 250); });
  root.addEventListener('load', apply);
})(typeof window !== 'undefined' ? window : globalThis);
