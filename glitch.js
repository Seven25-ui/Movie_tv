/* glitch.js - movie-style screen glitch (RGB split, tearing, static, flicker)
   Mo-gawas automatic 3 segundos human ma-abli ang page, molungtad og 18 segundos (humok-humok mohinay), dayon mawala.
   Gamita:  <script src="glitch.js" defer></script>  sa ubos sa imong index.html
   Options (ibutang sa dili pa i-load ang glitch.js):
     window.GLITCH_DELAY = 3000;       // unsa kadugay una mo-gawas (ms)
     window.GLITCH_DURATION = 18000;   // unsa kadugay mo-play (ms)
     window.GLITCH_ONCE = true;        // mo-play kausa ra matag session (dili matag refresh)
     window.GLITCH_AUTO = false;       // dili auto, ikaw ra mo-tawag: glitch() o glitch(8000)
   Test:  idugang ang ?glitch sa URL  */
(function () {
  if (window.__glitch) return;
  window.__glitch = 1;

  var running = false;
  var qs = new URLSearchParams(location.search);
  var forced = qs.has('glitch');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function play(ms) {
    if (running || !document.body) return;
    running = true;
    ms = ms || window.GLITCH_DURATION || 18000;

    var root = document.documentElement, body = document.body;
    var cv = document.createElement('canvas');
    cv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483000';
    body.appendChild(cv);
    var ctx = cv.getContext('2d'), W = 0, H = 0;

    var NW = 96, NH = 54;
    var nz = document.createElement('canvas'); nz.width = NW; nz.height = NH;
    var nx = nz.getContext('2d'), nd = nx.createImageData(NW, NH);

    function size() {
      W = cv.width = Math.ceil(window.innerWidth / 2);
      H = cv.height = Math.ceil(window.innerHeight / 2);
    }
    size();
    window.addEventListener('resize', size);

    var oldFilter = root.style.filter, oldOX = root.style.overflowX;
    var oldPos = body.style.position, oldLeft = body.style.left;
    var t0 = performance.now(), burstEnd = 0, burst = 0, rollY = 0, lastFlash = 0, raf = 0;
    var colors = ['#ff003c', '#00f0ff', '#ffffff', '#ff00ea', '#39ff14'];

    function frame(now) {
      var el = now - t0;
      if (el >= ms) { cleanup(); return; }
      var k = 1 - el / ms;                       // 1 -> 0 (humok-humok mohinay)
      if (el > ms - 260) { burstEnd = now + 60; burst = 1; k = Math.max(k, .5); } // katapusan nga "TV off" glitch

      if (now > burstEnd && Math.random() < (.015 + .05 * k)) {
        burst = .4 + Math.random() * .6 * (.4 + k);
        burstEnd = now + 60 + Math.random() * 320 * (.4 + k);
      }
      var on = now < burstEnd, I = on ? burst : 0;

      ctx.clearRect(0, 0, W, H);
      var i, y, h;

      // static noise
      var na = I * .45 + .08 * k;
      if (na > .01) {
        for (i = 0; i < nd.data.length; i += 4) {
          var v = Math.random() * 255 | 0;
          nd.data[i] = nd.data[i + 1] = nd.data[i + 2] = v; nd.data[i + 3] = 255;
        }
        nx.putImageData(nd, 0, 0);
        ctx.globalAlpha = na; ctx.imageSmoothingEnabled = false;
        ctx.drawImage(nz, 0, 0, W, H);
      }

      // tearing bars + color blocks
      if (on) {
        var n = 2 + (I * 9 | 0);
        for (i = 0; i < n; i++) {
          y = Math.random() * H; h = 1 + Math.random() * 18 * I;
          ctx.globalAlpha = .25 + .45 * I; ctx.fillStyle = colors[Math.random() * colors.length | 0];
          ctx.fillRect(0, y, W, h);
          if (Math.random() < .5) {
            ctx.globalAlpha = .5 * I; ctx.fillStyle = colors[Math.random() * colors.length | 0];
            ctx.fillRect(Math.random() * W, y, 20 + Math.random() * W * .3, h * 1.5);
          }
        }
        // flicker flash (limitado para dili sobra ka kusog)
        if (Math.random() < .06 && now - lastFlash > 400) {
          lastFlash = now; ctx.globalAlpha = .12 + Math.random() * .16;
          ctx.fillStyle = Math.random() < .5 ? '#fff' : '#000'; ctx.fillRect(0, 0, W, H);
        }
      }

      // rolling VHS bar
      rollY = (rollY + H * .006) % (H + 60);
      var g = ctx.createLinearGradient(0, rollY - 30, 0, rollY + 30);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,' + (.07 + .06 * k) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, rollY - 30, W, 60);

      // scanlines
      ctx.globalAlpha = .1 * (.4 + k); ctx.fillStyle = '#000';
      for (y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);
      ctx.globalAlpha = 1;

      // RGB split sa tibuok page + gamay nga pag-uyog
      if (on) {
        var dx = (2 + 7 * I * Math.random()).toFixed(1);
        root.style.filter = 'drop-shadow(' + dx + 'px 0 rgba(255,0,60,.85)) drop-shadow(-' + dx + 'px 0 rgba(0,240,255,.85)) hue-rotate(' + ((Math.random() - .5) * 50 * I | 0) + 'deg) contrast(' + (1 + .25 * I).toFixed(2) + ')';
        root.style.overflowX = 'hidden';
        body.style.position = 'relative';
        body.style.left = ((Math.random() - .5) * 22 * I).toFixed(1) + 'px';
      } else {
        root.style.filter = oldFilter; body.style.left = oldLeft;
      }
      raf = requestAnimationFrame(frame);
    }

    function cleanup() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', size);
      if (cv.parentNode) cv.parentNode.removeChild(cv);
      root.style.filter = oldFilter; root.style.overflowX = oldOX;
      body.style.position = oldPos; body.style.left = oldLeft;
      running = false;
    }
    raf = requestAnimationFrame(frame);
  }

  window.glitch = play;

  function seen() { try { return sessionStorage.getItem('glitchSeen'); } catch (e) { return null; } }
  function mark() { try { sessionStorage.setItem('glitchSeen', '1'); } catch (e) {} }
  function auto() {
    var delay = window.GLITCH_DELAY != null ? window.GLITCH_DELAY : 3000;
    if (forced) { setTimeout(play, delay); return; }
    if (window.GLITCH_AUTO === false || reduce) return;
    if (window.GLITCH_ONCE && seen()) return;
    mark(); setTimeout(play, delay);
  }
  if (document.body) auto(); else document.addEventListener('DOMContentLoaded', auto);
})();
