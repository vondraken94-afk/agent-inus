/* Home-page live MARKET CAP box for a memecoin (FROGE on World Chain); price shown as a small secondary line.
   Mcap = DexScreener pair marketCap (fallback fdv); GeckoTerminal fallback market_cap_usd (fallback fdv_usd).
   Source: DexScreener best-liquidity pair for the token (polled every 12 s), fallback GeckoTerminal public API.
   Pauses while the tab is hidden or a group is open. Keyless + CORS-enabled, works from a plain-http page. */
(function () {
  var root = document.getElementById("memeTicker");
  if (!root) return;
  var q = function (c) { return root.querySelector(c); };
  var $p = q(".mm-price"), $m = q(".mm-mcap"), $c = q(".mm-chg"), $src = q(".mm-src"), $live = q(".mm-live"), $sym = q(".mm-sym"), $name = q(".mm-name");
  var TOKEN = root.getAttribute("data-token").toLowerCase(), CHAIN = root.getAttribute("data-chain"), GT = root.getAttribute("data-gt-network");
  var POLL_MS = 12000, STALE_MS = 45000;
  var last = null, lastAt = 0, lastShown = null, busy = false, preferred = 0;
  if (window.PixelSprites) PixelSprites.draw(document.getElementById("memeSprite"), "froge");

  function fmt(p) {
    if (window.AgentInusFmt) return window.AgentInusFmt.price(p);
    return "$" + (p >= 0.01 ? p.toFixed(4) : p.toPrecision(4));
  }
  function fmtCap(v) {
    if (!(v > 0)) return "$—";
    var u = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
    for (var i = 0; i < u.length; i++) if (v >= u[i][0]) {
      var n = v / u[i][0], d = u[i][1] === "K" ? 1 : 2;
      if (n >= 999.5 && i > 0) continue;
      return "$" + n.toFixed(d) + u[i][1];
    }
    return "$" + Math.round(v);
  }
  function fetchJSON(url) {
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    return fetch(url, { cache: "no-store", signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); },
            function (e) { clearTimeout(t); throw e; });
  }
  var SOURCES = [
    function dexscreener() {
      return fetchJSON("https://api.dexscreener.com/latest/dex/tokens/" + TOKEN).then(function (d) {
        var best = null;
        (d.pairs || []).forEach(function (x) {
          if (x.chainId !== CHAIN || !x.baseToken || x.baseToken.address.toLowerCase() !== TOKEN || !(+x.priceUsd > 0)) return;
          var l = (x.liquidity && x.liquidity.usd) || 0;
          if (!best || l > best.l) best = { l: l, x: x };
        });
        if (!best) throw new Error("no pair");
        var x = best.x;
        var mc = +x.marketCap > 0 ? +x.marketCap : (+x.fdv > 0 ? +x.fdv : NaN);
        return { price: +x.priceUsd, mcap: mc, mcapField: +x.marketCap > 0 ? "marketCap" : "fdv", chg: x.priceChange ? +x.priceChange.h24 : NaN, sym: x.baseToken.symbol, name: x.baseToken.name, url: x.url, src: "DexScreener" };
      });
    },
    function geckoterminal() {
      return fetchJSON("https://api.geckoterminal.com/api/v2/networks/" + GT + "/tokens/" + TOKEN + "/pools?page=1").then(function (d) {
        var best = null, id = GT + "_" + TOKEN;
        (d.data || []).forEach(function (pl) {
          var a = pl.attributes || {}, r = pl.relationships || {}, isBase = r.base_token && r.base_token.data && r.base_token.data.id === id;
          var isQuote = r.quote_token && r.quote_token.data && r.quote_token.data.id === id;
          if (!isBase && !isQuote) return;
          var price = +(isBase ? a.base_token_price_usd : a.quote_token_price_usd), res = +a.reserve_in_usd || 0;
          if (!(price > 0)) return;
          var mc = +a.market_cap_usd > 0 ? +a.market_cap_usd : (+a.fdv_usd > 0 ? +a.fdv_usd : NaN);
          if (!best || res > best.res) best = { res: res, price: price, mcap: mc, mcapField: +a.market_cap_usd > 0 ? "market_cap_usd" : "fdv_usd", chg: isBase && a.price_change_percentage ? +a.price_change_percentage.h24 : NaN, addr: a.address };
        });
        if (!best) throw new Error("no pool");
        return { price: best.price, mcap: best.mcap, mcapField: best.mcapField, chg: best.chg, src: "GeckoTerminal" };
      });
    }
  ];

  function render(v) {
    var prevShown = lastShown, prevCap = last ? (last.mcap || last.price) : 0, cap = v.mcap > 0 ? v.mcap : NaN;
    last = v; lastAt = Date.now();
    var shown = isFinite(cap) ? fmtCap(cap) : "$—"; lastShown = shown;
    $m.textContent = shown;
    $p.innerHTML = fmt(v.price); // fmtPrice output is our own markup ($0.0<sub>n</sub>digits)
    if (isFinite(v.chg)) {
      $c.textContent = (v.chg >= 0 ? "▲ +" : "▼ ") + v.chg.toFixed(2) + "%";
      $c.className = "tk-chg mm-chg " + (v.chg >= 0 ? "up" : "down");
    } else { $c.textContent = "24h —"; $c.className = "tk-chg mm-chg"; }
    if (v.sym && /^[\w.$-]{1,16}$/.test(v.sym)) $sym.textContent = v.sym.toUpperCase();
    if (v.name && v.name.length < 30) $name.textContent = v.name;
    if (v.url && /^https:\/\/dexscreener\.com\//.test(v.url)) root.href = v.url;
    $src.textContent = "via " + v.src; $src.title = "Refreshes every " + POLL_MS / 1000 + " s";
    root.classList.remove("stale", "dead"); $live.textContent = "LIVE";
    if (prevShown !== null && prevShown !== shown) {
      root.classList.remove("tick-up", "tick-down"); void root.offsetWidth;
      root.classList.add((v.mcap || v.price) > prevCap ? "tick-up" : "tick-down");
    }
    root.dataset.price = v.price; root.dataset.mcap = cap; root.dataset.mcapField = v.mcapField || ""; root.dataset.updated = lastAt;
  }
  function fail() {
    if (!last) { $m.textContent = "$—"; $p.textContent = "—"; $c.textContent = ""; $src.textContent = "price feed unavailable · retrying"; root.classList.add("dead"); $live.textContent = "OFFLINE"; }
    else { root.classList.add("stale"); $live.textContent = "DELAYED";
      $src.textContent = "last update " + new Date(lastAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " · retrying"; }
  }
  function poll(force) {
    if (busy) return;
    if (!force && (document.hidden || root.offsetParent === null)) return; // hidden tab or group view open
    busy = true;
    var order = SOURCES.map(function (_, i) { return (i + preferred) % SOURCES.length; }), k = 0;
    (function next() {
      if (k >= order.length) { busy = false; return fail(); }
      var i = order[k++];
      SOURCES[i]().then(function (v) { busy = false; preferred = i === 1 ? 0 : i; render(v); }, next); // always retry DexScreener first next time
    })();
  }
  poll(true);
  setInterval(poll, POLL_MS);
  document.addEventListener("visibilitychange", function () { if (!document.hidden && Date.now() - lastAt > POLL_MS) poll(); });
  window.addEventListener("hashchange", function () { setTimeout(function () { if (Date.now() - lastAt > POLL_MS) poll(); }, 50); });
  setInterval(function () { if (last && Date.now() - lastAt > STALE_MS && !root.classList.contains("stale")) { root.classList.add("stale"); $live.textContent = "DELAYED"; } }, 5000);
})();
