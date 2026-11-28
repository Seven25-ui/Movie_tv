/* glitch.js (LIGHTNING VERSION) - kidlat/lightning storm effect
   Mo-gawas automatic 3 segundos human ma-abli ang page, molungtad og 18 segundos (humok-humok mohinay ang kusog), dayon mawala.
   Parehas ra ang pag-gamit sa daan: <script src="glitch.js" defer></script>
   Options (ibutang sa dili pa i-load ang glitch.js):
     window.GLITCH_DELAY = 3000;       // unsa kadugay una mo-gawas (ms)
     window.GLITCH_DURATION = 18000;   // unsa kadugay mo-play (ms)
     window.GLITCH_ONCE = true;        // mo-play kausa ra matag session (dili matag refresh)
     window.GLITCH_AUTO = false;       // dili auto, ikaw ra mo-tawag: glitch() o glitch(8000)
     window.GLITCH_IGNORE_REDUCED_MOTION = true; // mo-play bisan naka-"reduce motion" ang device
   Test:  idugang ang ?glitch sa URL  */
(function () {
  if (window.__glitch) return;
  window.__glitch = 1;

  var running = false;
  var qs = new URLSearchParams(location.search);
  var forced = qs.has('glitch') || qs.has('lightning');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function play(ms) {
    if (running || !document.body) return;
    running = true;
    ms = ms || window.GLITCH_DURATION || 18000;

    var cv = document.createElement('canvas');
    cv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483000';
    document.body.appendChild(cv);
    var ctx = cv.getContext('2d'), W = 0, H = 0;

    function size() { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; }
    size();
    window.addEventListener('resize', size);

    var bolts = [], flash = 0, nextStrike = 0, raf = 0, t0 = performance.now();

    // isa ka kidlat nga zigzag, naay sanga
    function makeBolt(x, y, ang, len, width, depth) {
      var pts = [[x, y]], step = 14 + Math.random() * 14, d = 0;
      while (d < len) {
        ang += (Math.random() - .5) * .9;
        ang += (Math.PI / 2 - ang) * .12;               // pugos paubos
        x += Math.cos(ang) * step; y += Math.sin(ang) * step; d += step;
        pts.push([x, y]);
        if (depth < 2 && Math.random() < .09) {
          var side = ang + (Math.random() < .5 ? -1 : 1) * (.5 + Math.random() * .6);
          bolts.push(makeBolt(x, y, side, len * (.25 + Math.random() * .3), width * .55, depth + 1));
        }
        if (x < -50 || x > W + 50 || y > H + 50) break;
      }
      return { pts: pts, w: width, life: 1, decay: .035 + Math.random() * .03, delay: 0 };
    }

    function strike(k) {
      var x = Math.random() * W, len = H * (.55 + Math.random() * .5);
      var main = makeBolt(x, -10, Math.PI / 2 + (Math.random() - .5) * .5, len, 2.2 + Math.random() * 1.6, 0);
      bolts.push(main);
      flash = Math.max(flash, .35 + .5 * k + Math.random() * .2);
      // double-flash: mo-balik og flash dayon
      if (Math.random() < .6) setTimeout(function () { if (running) flash = Math.max(flash, .3 + Math.random() * .3); }, 90 + Math.random() * 110);
    }

    function drawBolt(b) {
      var a = Math.max(0, b.life);
      // flicker: kusog-hinay ang kidlat
      a *= .65 + .35 * Math.random();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      var layers = [
        [b.w * 7, 'rgba(90,120,255,' + (.10 * a) + ')'],
        [b.w * 3.5, 'rgba(140,170,255,' + (.28 * a) + ')'],
        [b.w * 1.4, 'rgba(210,225,255,' + (.8 * a) + ')'],
        [Math.max(1, b.w * .6), 'rgba(255,255,255,' + a + ')']
      ];
      for (var l = 0; l < layers.length; l++) {
        ctx.lineWidth = layers[l][0]; ctx.strokeStyle = layers[l][1];
        ctx.beginPath(); ctx.moveTo(b.pts[0][0], b.pts[0][1]);
        for (var i = 1; i < b.pts.length; i++) ctx.lineTo(b.pts[i][0], b.pts[i][1]);
        ctx.stroke();
      }
    }

    function frame(now) {
      var el = now - t0;
      if (el >= ms && !bolts.length && flash < .02) { cleanup(); return; }
      var k = Math.max(0, 1 - el / ms);               // 1 -> 0 (humok-humok mohinay)

      if (el < ms && now > nextStrike) {
        strike(k);
        nextStrike = now + (350 + Math.random() * 1900) * (1.8 - k);
      }

      ctx.clearRect(0, 0, W, H);

      // dag-om nga panganod / bagyo nga kangitngit
      var dark = Math.min(1, k * 1.2) * .22 + flash * 0;
      if (el < ms) { ctx.fillStyle = 'rgba(5,8,25,' + dark + ')'; ctx.fillRect(0, 0, W, H); }

      // flash sa tibuok screen
      if (flash > .01) {
        var g = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, Math.max(W, H));
        g.addColorStop(0, 'rgba(235,242,255,' + (flash * .85) + ')');
        g.addColorStop(1, 'rgba(120,150,255,' + (flash * .35) + ')');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        flash *= .87;
      }

      for (var i = bolts.length - 1; i >= 0; i--) {
        var b = bolts[i];
        drawBolt(b);
        b.life -= b.decay;
        if (b.life <= 0) bolts.splice(i, 1);
      }
      raf = requestAnimationFrame(frame);
    }

    function cleanup() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', size);
      if (cv.parentNode) cv.parentNode.removeChild(cv);
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
