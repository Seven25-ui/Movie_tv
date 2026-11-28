/* glitch.js (CINEMATIC LIGHTNING STORM)
   Mo-gawas automatic 3 segundos human ma-abli ang page, molungtad og 18 segundos, dayon mawala.
   Naay: bagyo nga panganod, ulan, kidlat nga mo-"tubo" paubos (naay sanga), flash sa panganod,
   gamay nga pag-uyog sa screen, ug dalogdog (thunder) nga tunog.
   Gamita:  <script src="glitch.js" defer></script>  sa ubos sa imong index.html
   Options (ibutang sa dili pa i-load ang glitch.js):
     window.GLITCH_DELAY = 3000;       // unsa kadugay una mo-gawas (ms)
     window.GLITCH_DURATION = 18000;   // unsa kadugay mo-play (ms)
     window.GLITCH_ONCE = true;        // mo-play kausa ra matag session (dili matag refresh)
     window.GLITCH_AUTO = false;       // dili auto, ikaw ra mo-tawag: glitch() o glitch(8000)
     window.GLITCH_SOUND = false;      // tangtang ang dalogdog nga tunog
     window.GLITCH_RAIN = false;       // tangtang ang ulan
     window.GLITCH_IGNORE_REDUCED_MOTION = true; // mo-play bisan naka-"reduce motion" ang device
   Test:  idugang ang ?glitch sa URL  (ang tunog mo-work lang kung na-click/tap na ang page kausa) */
(function () {
  if (window.__glitch) return;
  window.__glitch = 1;

  var running = false;
  var qs = new URLSearchParams(location.search);
  var forced = qs.has('glitch') || qs.has('lightning');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------- tunog: dalogdog ---------- */
  var ac = null, noiseBuf = null;
  function audioReady() {
    if (window.GLITCH_SOUND === false) return false;
    try {
      if (!ac) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ac = new AC();
        var len = ac.sampleRate * 4, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0), last = 0;
        for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } // brown noise
        noiseBuf = b;
        document.addEventListener('pointerdown', function () { if (ac && ac.state === 'suspended') ac.resume(); }, { once: true });
      }
      return ac.state === 'running';
    } catch (e) { return false; }
  }
  function thunder(delay, power) {
    if (!audioReady()) return;
    try {
      var t = ac.currentTime + delay;
      var src = ac.createBufferSource(); src.buffer = noiseBuf;
      var lp = ac.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(500 + 500 * power, t);
      lp.frequency.exponentialRampToValueAtTime(70, t + 3);
      var g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(.9 * power, t + .06);
      g.gain.setTargetAtTime(0.0001, t + .25, 0.85);
      src.connect(lp); lp.connect(g); g.connect(ac.destination);
      src.start(t, Math.random() * 0.5); src.stop(t + 4);
      if (power > .6) { // "crack" sa duol nga kidlat
        var s2 = ac.createBufferSource(); s2.buffer = noiseBuf;
        var hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500;
        var g2 = ac.createGain();
        g2.gain.setValueAtTime(.35 * power, t - .02); g2.gain.exponentialRampToValueAtTime(0.0001, t + .25);
        s2.connect(hp); hp.connect(g2); g2.connect(ac.destination);
        s2.start(t - .02, 1); s2.stop(t + .3);
      }
    } catch (e) {}
  }

  /* ---------- kidlat nga geometry ---------- */
  // midpoint displacement: natural nga zigzag
  function jag(x0, y0, x1, y1, disp, iters) {
    var pts = [[x0, y0], [x1, y1]];
    for (var n = 0; n < iters; n++) {
      var out = [pts[0]];
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i];
        var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.sqrt(dx * dx + dy * dy) || 1;
        var off = rnd(-disp, disp);
        out.push([(a[0] + b[0]) / 2 - dy / L * off, (a[1] + b[1]) / 2 + dx / L * off], b);
      }
      pts = out; disp *= .55;
    }
    return pts;
  }

  function makeStrike(W, H, power, now) {
    var x0 = rnd(W * .08, W * .92), y0 = -10;
    var x1 = x0 + rnd(-W * .18, W * .18), y1 = H * rnd(.6, .98);
    var main = jag(x0, y0, x1, y1, H * .09, 7);
    var branches = [{ pts: main, w: 1, f0: 0, rate: 1 }];
    for (var i = 8; i < main.length - 8; i++) {
      if (Math.random() < .035) {
        var p = main[i], ang = Math.PI / 2 + rnd(-1.1, 1.1), L = H * rnd(.1, .32);
        var bp = jag(p[0], p[1], p[0] + Math.cos(ang) * L, p[1] + Math.sin(ang) * L, L * .22, 5);
        branches.push({ pts: bp, w: .42, f0: i / main.length, rate: 3 });
        if (Math.random() < .4 && bp.length > 12) { // sanga sa sanga
          var q = bp[(bp.length * rnd(.3, .7)) | 0], a2 = ang + rnd(-.9, .9), L2 = L * .5;
          branches.push({ pts: jag(q[0], q[1], q[0] + Math.cos(a2) * L2, q[1] + Math.sin(a2) * L2, L2 * .22, 4), w: .22, f0: i / main.length + .06, rate: 3 });
        }
      }
    }
    return { born: now, power: power, x: x0, y: H * .1, end: [x1, y1], branches: branches, sheet: false, thunderAt: 0 };
  }

  /* ---------- main ---------- */
  function play(ms) {
    if (running || !document.body) return;
    running = true;
    ms = ms || window.GLITCH_DURATION || 18000;

    var body = document.body;
    var cv = document.createElement('canvas');
    cv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483000';
    body.appendChild(cv);
    var ctx = cv.getContext('2d'), W = 0, H = 0;
    function size() { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; }
    size();
    window.addEventListener('resize', size);

    // panganod (gi-prerender kausa)
    var CW = 1200, CH = 320, cloud = document.createElement('canvas'); cloud.width = CW; cloud.height = CH;
    var cx = cloud.getContext('2d');
    for (var i = 0; i < 170; i++) {
      var bx = Math.random() * CW, by = Math.pow(Math.random(), 1.6) * CH * .8, br = rnd(50, 150);
      var gr = cx.createRadialGradient(bx, by, 0, bx, by, br);
      gr.addColorStop(0, 'rgba(110,125,170,' + rnd(.12, .3) + ')'); gr.addColorStop(1, 'rgba(110,125,170,0)');
      cx.fillStyle = gr;
      [-CW, 0, CW].forEach(function (o) { cx.save(); cx.translate(o, 0); cx.fillRect(bx - br, by - br, br * 2, br * 2); cx.restore(); });
    }
    var cloudOff = 0;

    // ulan
    var drops = [], rain = window.GLITCH_RAIN !== false;
    for (i = 0; i < 170; i++) drops.push({ x: Math.random() * 1.2 * window.innerWidth, y: Math.random() * window.innerHeight, l: rnd(12, 30), v: rnd(16, 28) });

    var strikes = [], nextStrike = performance.now() + 500, bigDone = false;
    var oldPos = body.style.position, oldLeft = body.style.left;
    var t0 = performance.now(), raf = 0;

    function addStrike(now, k, forceBig) {
      var sheet = !forceBig && Math.random() < .3;
      var power = forceBig ? 1 : clamp(rnd(.45, 1) * (.45 + .6 * k), .3, 1);
      var s;
      if (sheet) { s = { born: now, power: power * .55, x: rnd(0, W), y: H * .08, end: null, branches: [], sheet: true }; }
      else s = makeStrike(W, H, power, now);
      s.thunderAt = now + rnd(250, 1800) * (1.4 - power * .7);
      s.thunderDone = false;
      strikes.push(s);
    }

    function intensity(s, now) {
      var age = now - s.born, base;
      if (age < 130) base = age / 130;
      else base = Math.exp(-(age - 130) / 520);
      if (age > 130 && age < 520) base *= (.55 + .45 * Math.random());            // flicker
      if (age > 230 && age < 330) base += .55 * (1 - Math.abs(age - 280) / 50);   // return stroke
      return clamp(base, 0, 1.4) * s.power;
    }

    function strokePath(pts, n) {
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (var j = 1; j < n; j++) ctx.lineTo(pts[j][0], pts[j][1]);
      ctx.stroke();
    }

    function frame(now) {
      var el = now - t0;
      if (el >= ms && !strikes.length) { cleanup(); return; }
      var k = Math.max(0, 1 - el / ms);
      var storm = clamp(Math.min(el / 1500, (ms - el) / 3000), 0, 1);

      // iskedyul sa sunod nga kidlat
      if (el < ms - 1500 && now > nextStrike) {
        var big = !bigDone && el > ms * .3;
        if (big) bigDone = true;
        addStrike(now, k, big);
        if (Math.random() < .25) setTimeout(function () { if (running) addStrike(performance.now(), k, false); }, rnd(120, 350));
        nextStrike = now + rnd(800, 2900) * (1.7 - k * .9);
      }

      // total flash
      var F = 0, shake = 0, i, s;
      for (i = 0; i < strikes.length; i++) {
        s = strikes[i];
        s.I = intensity(s, now);
        F += s.I;
        if (!s.sheet && now - s.born < 220) shake = Math.max(shake, s.power);
        if (!s.thunderDone && now >= s.thunderAt) { s.thunderDone = true; thunder(0, s.power * (.5 + .5 * storm)); }
      }
      F = clamp(F, 0, 1.2);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);

      // kangitngit sa bagyo (mo-hayag kung naay flash)
      ctx.fillStyle = 'rgba(4,7,20,' + (.38 * storm * (1 - clamp(F, 0, 1) * .8)) + ')';
      ctx.fillRect(0, 0, W, H);

      // panganod
      var sc = Math.max(1.2, W / CW * 1.3), cw = CW * sc, ch = CH * sc;
      cloudOff = (cloudOff + .35) % cw;
      ctx.globalAlpha = .6 * storm;
      ctx.drawImage(cloud, -cloudOff, -ch * .12, cw, ch);
      ctx.drawImage(cloud, cw - cloudOff, -ch * .12, cw, ch);

      // ulan
      if (rain && storm > .02) {
        ctx.globalAlpha = .28 * storm; ctx.strokeStyle = '#b6c8ff'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (i = 0; i < drops.length; i++) {
          var d = drops[i];
          ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * .22, d.y + d.l);
          d.y += d.v; d.x -= d.v * .22;
          if (d.y > H) { d.y = -d.l; d.x = Math.random() * (W + 200); }
        }
        ctx.stroke();
      }

      // ---- hayag nga layer (additive) ----
      ctx.globalCompositeOperation = 'lighter';

      // mo-hayag ang panganod kung naay flash
      if (F > .02) {
        ctx.globalAlpha = clamp(F * 1.1, 0, 1);
        ctx.drawImage(cloud, -cloudOff, -ch * .12, cw, ch);
        ctx.drawImage(cloud, cw - cloudOff, -ch * .12, cw, ch);
      }

      for (i = 0; i < strikes.length; i++) {
        s = strikes[i];
        var I = s.I; if (I <= .01) continue;
        // glow sa langit gikan sa punto sa kidlat
        var rad = Math.max(W, H) * (s.sheet ? .8 : 1.1);
        var gg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rad);
        gg.addColorStop(0, 'rgba(225,235,255,' + clamp(.55 * I, 0, 1) + ')');
        gg.addColorStop(.45, 'rgba(130,160,255,' + clamp(.2 * I, 0, 1) + ')');
        gg.addColorStop(1, 'rgba(90,120,255,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);
        if (s.sheet) continue;

        var age = now - s.born, grow = clamp(age / 130, 0, 1), a = clamp(I, 0, 1);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        for (var b = 0; b < s.branches.length; b++) {
          var br = s.branches[b];
          var local = br.f0 === 0 ? grow : clamp((grow - br.f0) * br.rate, 0, 1);
          var n = Math.floor(br.pts.length * local);
          if (n < 2) continue;
          var w = (1.6 + 2.2 * s.power) * br.w;
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(80,110,255,' + (.10 * a) + ')'; ctx.lineWidth = w * 9; ctx.globalAlpha = 1; strokePath(br.pts, n);
          ctx.strokeStyle = 'rgba(130,160,255,' + (.22 * a) + ')'; ctx.lineWidth = w * 4.5; strokePath(br.pts, n);
          ctx.strokeStyle = 'rgba(205,220,255,' + (.6 * a) + ')'; ctx.lineWidth = w * 2; strokePath(br.pts, n);
          if (b === 0) { ctx.shadowBlur = 22; ctx.shadowColor = '#8fb0ff'; }
          ctx.strokeStyle = 'rgba(255,255,255,' + a + ')'; ctx.lineWidth = Math.max(1, w * .8); strokePath(br.pts, n);
          ctx.shadowBlur = 0;
        }
        // impact glow sa tumoy
        if (grow >= 1 && s.end) {
          var ig = ctx.createRadialGradient(s.end[0], s.end[1], 0, s.end[0], s.end[1], 140 * s.power);
          ig.addColorStop(0, 'rgba(255,255,255,' + (.85 * a) + ')'); ig.addColorStop(1, 'rgba(120,150,255,0)');
          ctx.fillStyle = ig; ctx.fillRect(s.end[0] - 160, s.end[1] - 160, 320, 320);
        }
      }

      // limpyo sa daan nga strikes
      for (i = strikes.length - 1; i >= 0; i--) if (now - strikes[i].born > 2200 && strikes[i].I < .01) strikes.splice(i, 1);

      // pag-uyog sa screen kung duol ang igo
      if (shake > .6) {
        body.style.position = 'relative';
        body.style.left = ((Math.random() - .5) * 9 * shake).toFixed(1) + 'px';
      } else body.style.left = oldLeft;

      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      raf = requestAnimationFrame(frame);
    }

    function cleanup() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', size);
      if (cv.parentNode) cv.parentNode.removeChild(cv);
      body.style.position = oldPos; body.style.left = oldLeft;
      running = false;
    }
    raf = requestAnimationFrame(frame);
  }

  window.glitch = play;
  window.lightning = play;

  function seen() { try { return sessionStorage.getItem('glitchSeen'); } catch (e) { return null; } }
  function mark() { try { sessionStorage.setItem('glitchSeen', '1'); } catch (e) {} }
  function auto() {
    var delay = window.GLITCH_DELAY != null ? window.GLITCH_DELAY : 3000;
    if (forced) { setTimeout(play, delay); return; }
    if (window.GLITCH_AUTO === false || (reduce && !window.GLITCH_IGNORE_REDUCED_MOTION)) return;
    if (window.GLITCH_ONCE && seen()) return;
    mark(); setTimeout(play, delay);
  }
  if (document.body) auto(); else document.addEventListener('DOMContentLoaded', auto);
})();
