// sonido-uno.js - Sonidos del UNO (TV y celular). Audios en /sonidos/uno/
// Uso:  Sonidos.play('carta_tirar');  Sonidos.ambiente(true);
// Los navegadores/Android WebView exigen un toque del usuario antes de dar audio:
// llamá a Sonidos.desbloquear() en el primer toque o click.
(function (global) {
  const RUTA = '/sonidos/uno/';
  const NOMBRES = [
    'click','seleccionar','unirse','salir','foto','cuenta','cuenta_final',
    'carta_tirar','carta_robar','repartir','mezclar',
    'bloqueo','reversa','mas2','mas4','comodin',
    'tu_turno','error','uno','penalidad','ultima_carta','ganar','perder','aplauso',
    'ambiente_fuego','ambiente_noche'
  ];
  // Qué suena en cada carta especial del UNO
  const POR_CARTA = { skip: 'bloqueo', reverse: 'reversa', draw2: 'mas2', wild4: 'mas4', wild: 'comodin' };

  let ctx = null, buffers = {}, cargado = false;
  let volSfx = 0.9, volAmb = 0.35, mudo = false;
  let gSfx, gAmb, ambientes = {};

  async function iniciar() {
    if (ctx) return;
    const AC = global.AudioContext || global.webkitAudioContext;
    ctx = new AC();
    gSfx = ctx.createGain(); gSfx.gain.value = volSfx; gSfx.connect(ctx.destination);
    gAmb = ctx.createGain(); gAmb.gain.value = volAmb; gAmb.connect(ctx.destination);
    await Promise.all(NOMBRES.map(async (n) => {
      try {
        const r = await fetch(RUTA + n + '.ogg');
        buffers[n] = await ctx.decodeAudioData(await r.arrayBuffer());
      } catch (e) { console.warn('Sonido no cargado:', n, e); }
    }));
    cargado = true;
  }

  const S = {
    // llamar en el primer toque/click
    async desbloquear() { await iniciar(); if (ctx.state === 'suspended') await ctx.resume(); },

    play(nombre, opts) {
      if (mudo || !ctx || !buffers[nombre]) return;
      const o = opts || {};
      const src = ctx.createBufferSource();
      src.buffer = buffers[nombre];
      if (o.velocidad) src.playbackRate.value = o.velocidad;
      const g = ctx.createGain(); g.gain.value = o.volumen == null ? 1 : o.volumen;
      src.connect(g); g.connect(gSfx);
      src.start(ctx.currentTime + (o.retraso || 0));
      return src;
    },

    // carta jugada: suena el tiro y, si es especial, el efecto de la carta
    cartaJugada(tipo) {
      S.play('carta_tirar');
      const esp = POR_CARTA[tipo];
      if (esp) S.play(esp, { retraso: 0.15 });
    },

    // reparto inicial: mezclar y repartir seguido
    inicioPartida() { S.play('mezclar'); S.play('repartir', { retraso: 0.9 }); },

    // ambiente: true/false. Se puede elegir 'fuego', 'noche' o ambos (por defecto ambos).
    ambiente(on, cuales) {
      if (!ctx) return;
      const lista = cuales || ['fuego', 'noche'];
      lista.forEach((c) => {
        const n = 'ambiente_' + c;
        if (on && !ambientes[n] && buffers[n]) {
          const src = ctx.createBufferSource();
          src.buffer = buffers[n]; src.loop = true;
          src.connect(gAmb); src.start();
          ambientes[n] = src;
        } else if (!on && ambientes[n]) {
          try { ambientes[n].stop(); } catch (e) {}
          delete ambientes[n];
        }
      });
    },

    mudo(v) { mudo = !!v; if (gAmb) gAmb.gain.value = mudo ? 0 : volAmb; },
    volumenEfectos(v) { volSfx = v; if (gSfx) gSfx.gain.value = v; },
    volumenAmbiente(v) { volAmb = v; if (gAmb && !mudo) gAmb.gain.value = v; },
    listo() { return cargado; },
    nombres: NOMBRES.slice()
  };
  global.Sonidos = S;
})(typeof window !== 'undefined' ? window : this);
