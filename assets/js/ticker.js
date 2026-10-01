/* Home-page live WLD price widget.
   Real-time: Binance public WebSocket (market-data mirror), rendered at most once per second.
   Fallback: REST polling every 12 s, trying Binance (data-api mirror, then api.binance.com) -> DexScreener (World Chain WLD) -> CoinGecko.
   All sources are keyless + CORS-enabled and work from a plain-http page. */
(function () {
  var root = document.getElementById("wldTicker");
  if (!root) return;
  var $p = document.getElementById("wldPrice"), $c = document.getElementById("wldChg"),
      $src = document.getElementById("wldSrc"), $live = document.getElementById("wldLive");
  if (window.PixelSprites) PixelSprites.draw(document.getElementById("wldSprite"), "wld");

  var POLL_MS = 12000, WS_STALE_MS = 15000, RENDER_MIN_MS = 1000;
  var WLD_WC = "0x2cfc85d8e48f8eab294be644d9e25c3030863003";
  var last = null, lastAt = 0, lastRender = 0, pending = null, renderTimer = null, failStreak = 0;
  var ws = null, wsAt = 0, wsRetry = 0, pollTimer = null, preferred = 0;

  function num(v) { var n = +v; return isFinite(n) && n > 0 ? n : null; }
  function fetchJSON(url) {
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    return fetch(url, { cache: "no-store", signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); },
            function (e) { clearTimeout(t); throw e; });
  }
  function binance(host, label) {
    return function () {
      return fetchJSON(host + "/api/v3/ticker/24hr?symbol=WLDUSDT").then(function (d) {
        var p = num(d.lastPrice); if (!p) throw new Error("bad");
        return { price: p, chg: +d.priceChangePercent, src: label };
      });
    };
  }
  var SOURCES = [
    binance("https://data-api.binance.vision", "Binance"),
    binance("https://api.binance.com", "Binance"),
    function () {
      return fetchJSON("https://api.dexscreener.com/latest/dex/tokens/" + WLD_WC).then(function (d) {
        var best = null;
        (d.pairs || []).forEach(function (x) {
          if (x.chainId !== "worldchain" || !x.baseToken || x.baseToken.address.toLowerCase() !== WLD_WC) return;
          var l = (x.liquidity && x.liquidity.usd) || 0;
          if (num(x.priceUsd) && (!best || l > best.l)) best = { l: l, x: x };
        });
        if (!best) throw new Error("no pair");
        return { price: +best.x.priceUsd, chg: best.x.priceChange ? +best.x.priceChange.h24 : NaN, src: "DexScreener" };
      });
    },
    function () {
      return fetchJSON("https://api.coingecko.com/api/v3/simple/price?ids=worldcoin-wld&vs_currencies=usd&include_24hr_change=true").then(function (d) {
        var w = d["worldcoin-wld"], p = w && num(w.usd); if (!p) throw new Error("bad");
        return { price: p, chg: +w.usd_24h_change, src: "CoinGecko" };
      });
    }
  ];

  function fmt(p) { return "$" + p.toFixed(4); }
  function render(q) {
    lastRender = Date.now();
    var prev = last; last = q; lastAt = Date.now(); failStreak = 0;
    $p.textContent = fmt(q.price);
    if (isFinite(q.chg)) {
      $c.textContent = (q.chg >= 0 ? "▲ +" : "▼ ") + q.chg.toFixed(2) + "%";
      $c.className = "tk-chg " + (q.chg >= 0 ? "up" : "down");
    } else { $c.textContent = "24h —"; $c.className = "tk-chg"; }
    $src.textContent = "via " + q.src + (q.ws ? " · stream" : " · " + POLL_MS / 1000 + "s");
    root.classList.remove("stale", "dead");
    $live.textContent = "LIVE";
    var a = prev ? +prev.price.toFixed(4) : null, b = +q.price.toFixed(4);
    if (a !== null && a !== b) {
      root.classList.remove("tick-up", "tick-down"); void root.offsetWidth;
      root.classList.add(b > a ? "tick-up" : "tick-down");
    }
    root.dataset.price = q.price; root.dataset.updated = lastAt;
  }
  function offer(q) { // throttle stream updates
    pending = q;
    var wait = RENDER_MIN_MS - (Date.now() - lastRender);
    if (wait <= 0) { render(pending); pending = null; }
    else if (!renderTimer) renderTimer = setTimeout(function () { renderTimer = null; if (pending) { render(pending); pending = null; } }, wait);
  }

  function poll() {
    if (document.hidden || root.offsetParent === null) return; // not visible: skip (saves rate limits)
    if (ws && Date.now() - wsAt < WS_STALE_MS) return;          // stream is healthy
    var order = SOURCES.map(function (_, i) { return (i + preferred) % SOURCES.length; }), k = 0;
    (function next() {
      if (k >= order.length) return fail();
      var i = order[k++];
      SOURCES[i]().then(function (q) { preferred = i; render(q); }, next);
    })();
  }
  function fail() {
    failStreak++;
    if (!last) { $p.textContent = "$—"; $c.textContent = ""; $src.textContent = "price feed unavailable · retrying"; root.classList.add("dead"); $live.textContent = "OFFLINE"; }
    else { root.classList.add("stale"); $live.textContent = "DELAYED"; $src.textContent = "last update " + new Date(lastAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " · retrying"; }
  }

  function connectWS() {
    if (!window.WebSocket || wsRetry > 5) return;
    try { ws = new WebSocket("wss://data-stream.binance.vision/ws/wldusdt@ticker"); } catch (e) { ws = null; return; }
    ws.onmessage = function (e) {
      try { var d = JSON.parse(e.data), p = num(d.c); if (!p) return;
        wsAt = Date.now(); wsRetry = 0; offer({ price: p, chg: +d.P, src: "Binance", ws: true }); } catch (x) {}
    };
    ws.onclose = function () { ws = null; wsAt = 0; wsRetry++; setTimeout(connectWS, Math.min(60000, 3000 * wsRetry)); };
    ws.onerror = function () { try { ws.close(); } catch (x) {} };
  }

  poll();                                 // immediate first price via REST
  pollTimer = setInterval(poll, POLL_MS); // fallback / keep-alive
  connectWS();
  document.addEventListener("visibilitychange", function () { if (!document.hidden) poll(); });
  window.addEventListener("hashchange", function () { setTimeout(poll, 50); });
  setInterval(function () { // mark stale if nothing for a while
    if (last && Date.now() - lastAt > 45000 && !root.classList.contains("stale")) { root.classList.add("stale"); $live.textContent = "DELAYED"; }
  }, 5000);
})();
