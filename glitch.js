/* glitch.js (REALISTIC LIGHTNING STORM v3)
   Mo-gawas automatic 3 segundos human ma-abli ang page, molungtad og 18 segundos, dayon mawala.
   Realistic nga storm: fractal nga kidlat nga naay step-leader (mo-ulan paubos), 2-5 ka balik-igo (strobe),
   sanga-sanga, bloom/glow, flash sa tibuok screen, panganod nga mo-hayag gikan sa sulod, sheet/cloud
   lightning, ulan, gamay nga pag-uyog, ug dalogdog nga naay delay depende sa gilay-on.
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
        for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = last * 3.5; }
        noiseBuf = b;
        document.addEventListener('pointerdown', function () { if (ac && ac.state === 'suspended') ac.resume(); }, { once: true });
      }
      return ac.state === 'running';
    } catch (e) { return false; }
  }
  function thunder(power, rumbleOnly) {
    if (!audioReady()) return;
    try {
      var t = ac.currentTime + .02;
      var src = ac.createBufferSource(); src.buffer = noiseBuf;
      var lp = ac.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(300 + 600 * power, t);
      lp.frequency.exponentialRampToValueAtTime(60, t + 3.2);
      var g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(.95 * power, t + (rumbleOnly ? .35 : .07));
      g.gain.setTargetAtTime(0.0001, t + .3, rumbleOnly ? 1.1 : .8);
      src.connect(lp); lp.connect(g); g.connect(ac.destination);
      src.start(t, Math.random() * .5); src.stop(t + 4);
      if (power > .65 && !rumbleOnly) { // "crack" sa duol nga igo
        var s2 = ac.createBufferSource(); s2.buffer = noiseBuf;
        var hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
        var g2 = ac.createGain();
        g2.gain.setValueAtTime(.4 * power, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + .22);
        s2.connect(hp); hp.connect(g2); g2.connect(ac.destination);
        s2.start(t, 1); s2.stop(t + .3);
      }
    } catch (e) {}
  }

  /* ---------- geometry sa kidlat ---------- */
  // midpoint displacement -> natural nga zigzag
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
      pts = out; disp *= .6;
    }
    return pts;
  }

  function addBranches(list, main, H, dist, down, prob) {
    for (var i = 6; i < main.length - 6; i++) {
      if (Math.random() >= prob) continue;
      var p = main[i];
      var ang = down ? Math.PI / 2 + (Math.random() < .5 ? -1 : 1) * rnd(.25, 1.15) : rnd(0, Math.PI * 2);
      var L = H * rnd(.07, .3) * (down ? (1 - dist * .5) : .45);
      var bp = jag(p[0], p[1], p[0] + Math.cos(ang) * L, p[1] + Math.sin(ang) * L, L * .22, 5);
      list.push({ pts: bp, w: .5, f0: i / main.length, rate: 3 });
      if (Math.random() < .4 && bp.length > 12) {
        var q = bp[(bp.length * rnd(.3, .7)) | 0], a2 = ang + rnd(-.9, .9), L2 = L * .5;
        list.push({ pts: jag(q[0], q[1], q[0] + Math.cos(a2) * L2, q[1] + Math.sin(a2) * L2, L2 * .22, 4), w: .3, f0: Math.min(.95, i / main.length + .05), rate: 3 });
      }
    }
  }

  function makeStrike(W, H, now, k, big) {
    var cloudOnly = !big && Math.random() < .28;
    var dist = big ? .06 : Math.random();
    var power = clamp((1 - dist * .55) * rnd(.7, 1) * (.5 + .5 * k), .25, 1);
    var s = { born: now, dist: dist, power: power, cloudOnly: cloudOnly, branches: [], thunderDone: false };
    var x0 = rnd(W * .1, W * .9), main;
    if (cloudOnly) {
      var cy0 = rnd(H * .04, H * .2), x1c = x0 + rnd(-W * .45, W * .45), cy1 = cy0 + rnd(-H * .04, H * .1);
      main = jag(x0, cy0, x1c, cy1, W * .05, 7);
      s.branches.push({ pts: main, w: 1, f0: 0, rate: 1 });
      addBranches(s.branches, main, H, dist, false, .05);
      s.x = (x0 + x1c) / 2; s.y = cy0; s.end = null;
    } else {
      var x1 = x0 + rnd(-W * .18, W * .18), y1 = H * (.5 + .45 * (1 - dist)) * rnd(.9, 1);
      main = jag(x0, -10, x1, y1, H * .12, 8);
      s.branches.push({ pts: main, w: 1, f0: 0, rate: 1 });
      addBranches(s.branches, main, H, dist, true, .05);
      s.x = x0; s.y = H * .08; s.end = [x1, y1];
    }
    // timing: step-leader dayon balik-igo (strobe)
    s.leader = rnd(150, 260);
    var n = big ? 5 : 2 + ((Math.random() * 3) | 0), t = 0;
    s.strokes = [{ t: 0, a: 1 }];
    for (var i = 1; i < n; i++) { t += rnd(45, 130); s.strokes.push({ t: t, a: rnd(.4, .9) }); }
    s.life = s.leader + t + 1900;
    s.fscale = power * (cloudOnly ? .55 : 1) * (.4 + .6 * (1 - dist));
    s.thunderAt = now + s.leader + dist * 2400 + rnd(100, 500);
    s.thunderPow = power * (1 - dist * .6) * (cloudOnly ? .5 : 1);
    return s;
  }

  function updateStrike(s, now) {
    var age = now - s.born; s.age = age;
    if (age < s.leader) {
      s.grow = Math.min(1, Math.floor(age / s.leader * 16) / 16 + Math.random() * .04);
      s.vis = .2 * (.55 + .45 * Math.random()); s.a2 = -1; s.F = .03 * s.fscale;
      return;
    }
    s.grow = 1;
    var a2 = age - s.leader; s.a2 = a2;
    var P = 0;
    for (var i = 0; i < s.strokes.length; i++) {
      var st = s.strokes[i];
      if (a2 >= st.t) P += st.a * Math.exp(-(a2 - st.t) / 38);
    }
    var cont = .28 * Math.exp(-a2 / 420);
    s.P = P;
    s.vis = clamp(P + cont, 0, 1.2);
    s.F = (P * .9 + cont * .35) * s.fscale;
  }

  /* ---------- panganod (periodic fBm noise, seamless) ---------- */
  function makeClouds() {
    var w = 512, h = 160, c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d'), im = x.createImageData(w, h), d = im.data, oct = [], o, i, j;
    for (o = 0; o < 5; o++) {
      var cx = 3 << o, cy = 2 << o, g = [];
      for (j = 0; j <= cy; j++) { var row = []; for (i = 0; i < cx; i++) row.push(Math.random()); g.push(row); }
      oct.push({ cx: cx, cy: cy, g: g });
    }
    function sm(t) { return t * t * (3 - 2 * t); }
    for (var py = 0; py < h; py++) {
      for (var px = 0; px < w; px++) {
        var v = 0, amp = .5, tot = 0;
        for (o = 0; o < 5; o++) {
          var O = oct[o], fx = px / w * O.cx, fy = py / h * O.cy;
          var ix = Math.floor(fx), iy = Math.floor(fy), tx = sm(fx - ix), ty = sm(fy - iy);
          var a = O.g[iy][ix % O.cx], b = O.g[iy][(ix + 1) % O.cx], cc = O.g[iy + 1][ix % O.cx], dd = O.g[iy + 1][(ix + 1) % O.cx];
          var top = a + (b - a) * tx, bot = cc + (dd - cc) * tx;
          v += amp * (top + (bot - top) * ty); tot += amp; amp *= .5;
        }
        v /= tot;
        var al = clamp((v - .38) / .32, 0, 1); al = al * al * (3 - 2 * al);
        al *= 1 - py / h;
        var p = (py * w + px) * 4;
        d[p] = 50; d[p + 1] = 58; d[p + 2] = 86; d[p + 3] = al * 235;
      }
    }
    x.putImageData(im, 0, 0);
    return c;
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

    function mk() { return document.createElement('canvas'); }
    var bc = mk(), bx = bc.getContext('2d');          // crisp nga bolt
    var s1 = mk(), s1x = s1.getContext('2d');          // bloom duol
    var s2 = mk(), s2x = s2.getContext('2d');          // bloom lapad
    var lit = mk(), lx = lit.getContext('2d');         // panganod nga naay kahayag
    function size() {
      W = cv.width = window.innerWidth; H = cv.height = window.innerHeight;
      bc.width = W; bc.height = H;
      s1.width = Math.ceil(W / 4); s1.height = Math.ceil(H / 4);
      s2.width = Math.ceil(W / 14); s2.height = Math.ceil(H / 14);
      lit.width = Math.ceil(W / 2); lit.height = Math.ceil(H / 2);
    }
    size();
    window.addEventListener('resize', size);

    var cloudTex = makeClouds(), cloudOff = 0;
    function drawCloud(c, sc, alpha) {
      var cw = W * 1.5 * sc, ch = H * .55 * sc, off = (cloudOff * sc) % cw;
      c.globalAlpha = alpha;
      c.drawImage(cloudTex, -off, -ch * .08, cw, ch);
      c.drawImage(cloudTex, cw - off, -ch * .08, cw, ch);
    }

    var drops = [], rain = window.GLITCH_RAIN !== false, i;
    for (i = 0; i < 170; i++) drops.push({ x: Math.random() * 1.2 * window.innerWidth, y: Math.random() * window.innerHeight, l: rnd(12, 30), v: rnd(16, 28) });

    var strikes = [], nextStrike = performance.now() + 500, bigDone = false;
    var oldPos = body.style.position, oldLeft = body.style.left;
    var t0 = performance.now(), raf = 0;

    function path(pts, n) {
      bx.beginPath(); bx.moveTo(pts[0][0], pts[0][1]);
      for (var j = 1; j < n; j++) bx.lineTo(pts[j][0], pts[j][1]);
      bx.stroke();
    }
    function bloom(sx, sxc, alpha, times) {
      sxc.globalCompositeOperation = 'source-over'; sxc.globalAlpha = 1;
      sxc.clearRect(0, 0, sx.width, sx.height);
      sxc.imageSmoothingEnabled = true;
      sxc.drawImage(bc, 0, 0, sx.width, sx.height);
      sxc.globalCompositeOperation = 'source-atop';
      sxc.fillStyle = 'rgb(105,135,255)'; sxc.fillRect(0, 0, sx.width, sx.height);
      sxc.globalCompositeOperation = 'source-over';
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.globalAlpha = alpha;
      for (var t = 0; t < times; t++) ctx.drawImage(sx, 0, 0, W, H);
    }
    function litClouds(s, a) {
      var lw = lit.width, lh = lit.height;
      lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, lw, lh);
      drawCloud(lx, .5, 1);
      lx.globalCompositeOperation = 'source-in'; lx.globalAlpha = 1; lx.fillStyle = 'rgb(215,226,255)'; lx.fillRect(0, 0, lw, lh);
      lx.globalCompositeOperation = 'destination-in';
      var r = Math.max(lw, lh) * (s.cloudOnly ? .55 : .8), gx = s.x * .5, gy = s.y * .5;
      var g = lx.createRadialGradient(gx, gy, 0, gx, gy, r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      lx.fillStyle = g; lx.fillRect(0, 0, lw, lh);
      lx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = clamp(a, 0, 1); ctx.drawImage(lit, 0, 0, W, H);
    }

    function addStrike(now, k, big) {
      strikes.push(makeStrike(W, H, now, k, big));
    }

    function frame(now) {
      var el = now - t0;
      if (el >= ms && !strikes.length) { cleanup(); return; }
      var k = Math.max(0, 1 - el / ms);
      var storm = clamp(Math.min(el / 1500, (ms - el) / 3000), 0, 1);

      if (el < ms - 1500 && now > nextStrike) {
        var big = !bigDone && el > ms * .3;
        if (big) bigDone = true;
        addStrike(now, k, big);
        if (Math.random() < .25) setTimeout(function () { if (running) addStrike(performance.now(), k, false); }, rnd(150, 450));
        nextStrike = now + rnd(800, 2800) * (1.7 - k * .9);
      }

      var F = 0, shake = 0, s;
      for (i = 0; i < strikes.length; i++) {
        s = strikes[i]; updateStrike(s, now);
        F += s.F;
        if (!s.cloudOnly && s.power > .65 && s.dist < .35 && s.a2 >= 0 && s.a2 < 150) shake = Math.max(shake, s.power);
        if (!s.thunderDone && now >= s.thunderAt) { s.thunderDone = true; thunder(s.thunderPow * (.5 + .5 * storm), s.cloudOnly); }
      }
      F = clamp(F, 0, 1.3);

      /* --- layer 1: kangitngit + panganod + ulan --- */
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(3,5,15,' + (.34 * storm * (1 - clamp(F, 0, 1) * .85)) + ')';
      ctx.fillRect(0, 0, W, H);
      cloudOff = (cloudOff + .3) % (W * 1.5);
      drawCloud(ctx, 1, .85 * storm);

      if (rain && storm > .02) {
        ctx.globalAlpha = (.26 + .25 * clamp(F, 0, 1)) * storm; ctx.strokeStyle = '#b6c8ff'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (i = 0; i < drops.length; i++) {
          var d = drops[i];
          ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * .22, d.y + d.l);
          d.y += d.v; d.x -= d.v * .22;
          if (d.y > H) { d.y = -d.l; d.x = Math.random() * (W + 200); }
        }
        ctx.stroke();
      }

      /* --- layer 2: hayag nga kidlat (additive) --- */
      ctx.globalCompositeOperation = 'lighter';
      var any = false;
      bx.clearRect(0, 0, W, H);
      bx.lineJoin = 'round'; bx.lineCap = 'round';

      for (i = 0; i < strikes.length; i++) {
        s = strikes[i];
        // flash sa tibuok screen (whiteout/strobe)
        if (s.F > .01) {
          ctx.globalAlpha = clamp(.26 * s.F, 0, 1); ctx.fillStyle = 'rgb(205,220,255)'; ctx.fillRect(0, 0, W, H);
          var rad = Math.max(W, H) * (s.cloudOnly ? .6 : .95);
          var gg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rad);
          gg.addColorStop(0, 'rgba(235,242,255,' + clamp(.55 * s.F, 0, 1) + ')');
          gg.addColorStop(.5, 'rgba(130,160,255,' + clamp(.18 * s.F, 0, 1) + ')');
          gg.addColorStop(1, 'rgba(90,120,255,0)');
          ctx.globalAlpha = 1; ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);
          litClouds(s, s.F * 1.3);
          ctx.globalCompositeOperation = 'lighter';
        }
        if (s.vis < .02) continue;
        any = true;
        for (var b = 0; b < s.branches.length; b++) {
          var br = s.branches[b];
          var local = br.f0 === 0 ? s.grow : clamp((s.grow - br.f0) * br.rate, 0, 1);
          var n = Math.floor(br.pts.length * local);
          if (n < 2) continue;
          var bf = br.w === 1 ? 1 : (s.a2 < 0 ? .6 : .7 * Math.exp(-s.a2 / 220) + .05);
          var al = clamp(s.vis * bf, 0, 1);
          if (al < .02) continue;
          var w = Math.max(.6, (.8 + (1 - s.dist) * 1.8) * br.w * (s.cloudOnly ? .8 : 1));
          bx.strokeStyle = 'rgba(180,200,255,' + (al * .35) + ')'; bx.lineWidth = w * 3.2; path(br.pts, n);
          bx.strokeStyle = 'rgba(245,248,255,' + al + ')'; bx.lineWidth = w; path(br.pts, n);
        }
        // glow sa tumoy kung asa mo-igo
        if (s.end && s.grow >= 1 && s.P > .02) {
          var ig = ctx.createRadialGradient(s.end[0], s.end[1], 0, s.end[0], s.end[1], 110 * s.power);
          ig.addColorStop(0, 'rgba(255,255,255,' + clamp(.7 * s.P * (1 - s.dist * .6), 0, 1) + ')'); ig.addColorStop(1, 'rgba(120,150,255,0)');
          ctx.globalAlpha = 1; ctx.fillStyle = ig; ctx.fillRect(s.end[0] - 130, s.end[1] - 130, 260, 260);
        }
      }

      if (any) {
        bloom(s2, s2x, 1, 2);        // lapad nga glow
        bloom(s1, s1x, 1, 1);        // duol nga glow
        ctx.globalAlpha = 1; ctx.drawImage(bc, 0, 0);   // tin-aw nga puti nga kidlat
      }

      for (i = strikes.length - 1; i >= 0; i--) if (strikes[i].age > strikes[i].life) strikes.splice(i, 1);

      if (shake > 0) {
        body.style.position = 'relative';
        body.style.left = ((Math.random() - .5) * 9 * shake).toFixed(1) + 'px';
      } else body.style.left = oldLeft;

      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
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
