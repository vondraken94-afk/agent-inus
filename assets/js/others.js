/* Home "OTHERS" box + modal: every other memecoin held across all groups, with LIVE market data only.
   Never shows holders: no group names, wallets, amounts or values.
   Token list = assets/data/others.json (built offline by tools/build-others.js, incl. locked groups; contains only token
   contracts) + tokens found at runtime in the PUBLIC groups' wallets (Blockscout token-balances), merged and de-duped. */
(function () {
  var box = document.getElementById("othersBox"), modal = document.getElementById("othersModal");
  if (!box || !modal) return;
  var BS = "https://worldchain-mainnet.explorer.alchemy.com/api/v2";
  var REFRESH_MS = 20000, MIN_LIQ_USD = 500, MIN_HELD_USD = 1, RT_SCAN_TTL = 10 * 60 * 1000;
  var EXCLUDE = { "0x2cfc85d8e48f8eab294be644d9e25c3030863003": 1, "0x4200000000000000000000000000000000000006": 1,
                  "0x79a02482a880bce3f13e09da970dc34db4cd24d1": 1, "0x37cef2ea9dd8b364e8e60405d55887a1d5ae76d4": 1 };
  var STABLE = { USDC: 1, "USDC.E": 1, USDT: 1, USDT0: 1, DAI: 1, USDBC: 1, USDS: 1, FDUSD: 1, PYUSD: 1, SUSD: 1, LUSD: 1, USDE: 1 };
  var $body = document.getElementById("otBody"), $ago = document.getElementById("otAgo"), $live = document.getElementById("otLive"),
      $count = document.getElementById("otCount"), $sort = document.getElementById("otSort");
  var tokens = {};        // addr -> {address, symbol, name, icon, rt: bool}
  var rtHeld = {};        // addr -> summed amount in public wallets (memory only; used for the dust filter, never shown)
  var market = {};        // addr -> market data
  var sortK = "mcap", sortDir = -1, timer = null, agoTimer = null, lastAt = 0, opening = null, lastFocus = null, rtScanAt = 0, loadedBase = false;
  var logoCache = {};     // addr -> canvas

  if (window.PixelSprites) { PixelSprites.draw(document.getElementById("othersSprite"), "coin"); PixelSprites.draw(document.getElementById("othersSprite2"), "coin"); }

  function lc(s) { return String(s || "").toLowerCase(); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function getJSON(url) {
    var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);
    return fetch(url, { signal: ctl ? ctl.signal : undefined }).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); },
      function (e) { clearTimeout(t); throw e; });
  }
  function okToken(a, sym) { return /^0x[0-9a-f]{40}$/.test(a) && !EXCLUDE[a] && !STABLE[String(sym || "").toUpperCase()]; }
  function addToken(t, rt) {
    var a = lc(t.address); if (!okToken(a, t.symbol)) return false;
    if (tokens[a]) return false;
    tokens[a] = { address: a, symbol: t.symbol || "?", name: t.name || "", icon: /^https:\/\//.test(t.icon || "") ? t.icon : "", rt: !!rt };
    return true;
  }

  /* ---- token list ---- */
  function loadBase() {
    if (loadedBase) return Promise.resolve();
    return getJSON("assets/data/others.json?t=" + Date.now()).then(function (d) {
      (d.tokens || []).forEach(function (t) { addToken(t, false); }); loadedBase = true;
    }).catch(function () { /* runtime scan still works */ });
  }
  function scanPublic() { // public groups only; locked groups are covered by others.json
    if (Date.now() - rtScanAt < RT_SCAN_TTL) return Promise.resolve(false);
    rtScanAt = Date.now();
    var wallets = [];
    (window.TRACKER_GROUPS || []).forEach(function (g) {
      if (g.locked || !g.wallets || (g.chains && g.chains.indexOf("worldchain") < 0)) return;
      g.wallets.forEach(function (w) { var a = lc(typeof w === "string" ? w : w && w.address); if (/^0x[0-9a-f]{40}$/.test(a) && wallets.indexOf(a) < 0) wallets.push(a); });
    });
    var held = {}, added = false;
    return wallets.reduce(function (p, w) {
      return p.then(function () {
        return getJSON(BS + "/addresses/" + w + "/token-balances").then(function (bals) {
          (bals || []).forEach(function (b) {
            var t = b.token || {}; if (t.type !== "ERC-20") return;
            var a = lc(t.address_hash || t.address), amt = Number(b.value || 0) / Math.pow(10, Number(t.decimals || 18));
            if (!(amt > 0) || !okToken(a, t.symbol)) return;
            held[a] = (held[a] || 0) + amt;
            if (addToken({ address: a, symbol: t.symbol, name: t.name, icon: t.icon_url }, true)) added = true;
          });
        }).catch(function () { }).then(function () { return sleep(150); });
      });
    }, Promise.resolve()).then(function () { rtHeld = held; return added; });
  }

  /* ---- market data ---- */
  function fetchMarket() {
    var addrs = Object.keys(tokens), parts = [], ok = 0, next = {};
    for (var i = 0; i < addrs.length; i += 30) parts.push(addrs.slice(i, i + 30));
    return parts.reduce(function (p, part) {
      return p.then(function () {
        return getJSON("https://api.dexscreener.com/tokens/v1/worldchain/" + part.join(",")).then(function (pairs) {
          ok++;
          (pairs || []).forEach(function (x) {
            var a = lc(x.baseToken && x.baseToken.address); if (part.indexOf(a) < 0 || !(+x.priceUsd > 0)) return;
            var liq = (x.liquidity && x.liquidity.usd) || 0;
            if (next[a] && next[a].liq >= liq) return;
            var pc = x.priceChange || {};
            next[a] = { price: +x.priceUsd, liq: liq, mcap: +x.marketCap > 0 ? +x.marketCap : (+x.fdv > 0 ? +x.fdv : NaN),
              vol: x.volume ? +x.volume.h24 : NaN, m5: +pc.m5, h1: +pc.h1, h6: +pc.h6, h24: +pc.h24,
              url: /^https:\/\/dexscreener\.com\//.test(x.url || "") ? x.url : "", sym: x.baseToken.symbol, name: x.baseToken.name,
              icon: x.info && /^https:\/\//.test(x.info.imageUrl || "") ? x.info.imageUrl : "" };
          });
        }).catch(function () { });
      });
    }, Promise.resolve()).then(function () {
      if (!parts.length) return true;
      if (!ok) return false;
      Object.keys(next).forEach(function (a) { market[a] = next[a]; });
      return true;
    });
  }

  /* ---- render ---- */
  function fmtP(p) { return window.AgentInusFmt ? window.AgentInusFmt.price(p) : "$" + (+p).toPrecision(4); }
  function cmp(v) {
    if (!(v > 0)) return "—";
    var u = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
    for (var i = 0; i < u.length; i++) if (v >= u[i][0]) return "$" + (v / u[i][0]).toFixed(v / u[i][0] >= 100 ? 0 : (u[i][1] === "K" ? 1 : 2)) + u[i][1];
    return "$" + Math.round(v);
  }
  function pct(v) { return isFinite(v) ? '<span class="' + (v > 0 ? "up" : v < 0 ? "down" : "") + '">' + (v > 0 ? "+" : "") + v.toFixed(2) + "%</span>" : '<span class="muted">—</span>'; }
  function logo(a, t, m) {
    if (logoCache[a]) return logoCache[a];
    var url = (m && m.icon) || t.icon, el;
    if (!url) { el = document.createElement("span"); el.className = "tk-ph"; el.style.cssText = "display:inline-grid;place-items:center;font:10px var(--f-pixel);color:var(--yel)"; el.textContent = String(t.symbol || "?").slice(0, 1).toUpperCase(); return (logoCache[a] = el); }
    el = document.createElement("canvas"); el.width = 16; el.height = 16; el.setAttribute("aria-hidden", "true");
    var img = new Image(); img.referrerPolicy = "no-referrer";
    img.onload = function () { var c = el.getContext("2d"); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high"; c.drawImage(img, 0, 0, 16, 16); };
    img.onerror = function () { var c = el.getContext("2d"); c.fillStyle = "#272757"; c.fillRect(0, 0, 16, 16); };
    img.src = url.replace(/width=\d+/, "width=64").replace(/height=\d+/, "height=64");
    return (logoCache[a] = el);
  }
  function visibleRows() {
    return Object.keys(tokens).map(function (a) { return { a: a, t: tokens[a], m: market[a] }; }).filter(function (r) {
      if (!r.m || r.m.liq < MIN_LIQ_USD) return false;                          // no pool / thin pool = spam
      if (r.t.rt && !(r.m.price * (rtHeld[r.a] || 0) >= MIN_HELD_USD)) return false; // runtime-found dust
      return true;
    });
  }
  function render() {
    var rows = visibleRows();
    rows.forEach(function (r) { r.sym = String(r.m.sym || r.t.symbol); r.symK = r.sym.toLowerCase(); r.price = r.m.price; r.mcap = r.m.mcap; r.liq = r.m.liq; r.vol = r.m.vol; r.m5 = r.m.m5; r.h1 = r.m.h1; r.h6 = r.m.h6; r.h24 = r.m.h24; });
    rows.sort(function (x, y) {
      if (sortK === "sym") return sortDir * (x.symK < y.symK ? -1 : x.symK > y.symK ? 1 : 0);
      var a = x[sortK], b = y[sortK], fa = isFinite(a), fb = isFinite(b);
      if (!fa || !fb) return fa === fb ? (y.mcap || 0) - (x.mcap || 0) : (fa ? -1 : 1);   // missing values always last
      return sortDir * (a - b) || (y.mcap || 0) - (x.mcap || 0);
    });
    var frag = document.createDocumentFragment();
    rows.forEach(function (r) {
      var tr = document.createElement("tr"); tr.tabIndex = 0; if (r.m.url) tr.dataset.url = r.m.url;
      tr.innerHTML = '<td class="c-coin"><div class="ot-coin"><span class="ot-lg"></span><span><a href="' + esc(r.m.url || "#") + '" target="_blank" rel="noopener noreferrer"><b>' + esc(r.sym) + '</b></a><span class="sub">' + esc(r.m.name || r.t.name) + "</span></span></div></td>" +
        '<td class="num" data-l="Price"><span>' + fmtP(r.price) + '</span></td><td class="num strong" data-l="MCap">' + cmp(r.mcap) + '</td><td class="num" data-l="Liquidity">' + cmp(r.liq) + '</td><td class="num" data-l="Vol 24h">' + cmp(r.vol) + "</td>" +
        '<td class="num" data-l="5m">' + pct(r.m5) + '</td><td class="num" data-l="1h">' + pct(r.h1) + '</td><td class="num" data-l="6h">' + pct(r.h6) + '</td><td class="num" data-l="24h">' + pct(r.h24) + "</td>";
      tr.querySelector(".ot-lg").replaceWith(logo(r.a, r.t, r.m));
      frag.appendChild(tr);
    });
    $body.innerHTML = "";
    if (!rows.length) $body.innerHTML = '<tr><td colspan="9" class="ot-msg">' + (lastAt ? "No coins to show right now." : "Loading coins…") + "</td></tr>";
    else $body.appendChild(frag);
    $count.textContent = rows.length + " coin" + (rows.length === 1 ? "" : "s");
    modal.querySelectorAll("th[data-k]").forEach(function (th) {
      if (th.dataset.k === sortK) th.setAttribute("aria-sort", sortDir < 0 ? "descending" : "ascending"); else th.removeAttribute("aria-sort");
    });
    modal.dataset.rows = rows.length;
    if ($sort) $sort.value = sortK + ":" + (sortDir < 0 ? "desc" : "asc");
  }
  function ago() {
    if (!lastAt) return;
    var s = Math.max(0, Math.round((Date.now() - lastAt) / 1000));
    $ago.textContent = "updated " + (s < 60 ? s + "s" : Math.floor(s / 60) + "m") + " ago";
    if (Date.now() - lastAt > REFRESH_MS * 3) { modal.classList.add("stale"); $live.textContent = "DELAYED"; }
  }
  function refresh() {
    return fetchMarket().then(function (ok) {
      if (ok) { lastAt = Date.now(); modal.classList.remove("stale"); $live.textContent = "LIVE"; modal.dataset.updated = lastAt; }
      else if (!lastAt) { $ago.textContent = "DexScreener unavailable · retrying"; $live.textContent = "OFFLINE"; modal.classList.add("stale"); }
      else { modal.classList.add("stale"); $live.textContent = "DELAYED"; }
      render(); ago();
    });
  }

  /* ---- open / close ---- */
  function isOpen() { return !modal.hidden; }
  function open() {
    if (isOpen()) return;
    lastFocus = document.activeElement;
    modal.hidden = false; document.body.classList.add("modal-open");
    modal.querySelector(".modal-x").focus();
    render();
    opening = loadBase().then(function () { return refresh(); }).then(function () {
      return scanPublic().then(function (added) { if (added && isOpen()) return refresh(); });
    });
    clearInterval(timer); timer = setInterval(function () { if (!document.hidden) refresh(); }, REFRESH_MS);
    clearInterval(agoTimer); agoTimer = setInterval(ago, 1000);
  }
  function close() {
    if (!isOpen()) return;
    modal.hidden = true; document.body.classList.remove("modal-open");
    clearInterval(timer); clearInterval(agoTimer); timer = agoTimer = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  box.addEventListener("click", open);
  if ($sort) $sort.addEventListener("change", function () { var v = $sort.value.split(":"); sortK = v[0]; sortDir = v[1] === "asc" ? 1 : -1; render(); });
  modal.addEventListener("click", function (e) {
    if (e.target.closest("[data-close]")) return close();
    var th = e.target.closest("th[data-k]");
    if (th) { var k = th.dataset.k; if (k === sortK) sortDir = -sortDir; else { sortK = k; sortDir = k === "sym" ? 1 : -1; } return render(); }
    var tr = e.target.closest("tbody tr[data-url]");
    if (tr && !e.target.closest("a")) window.open(tr.dataset.url, "_blank", "noopener,noreferrer");
  });
  document.addEventListener("keydown", function (e) {
    if (!isOpen()) return;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "Enter" && e.target.matches && e.target.matches("tbody tr[data-url]")) window.open(e.target.dataset.url, "_blank", "noopener,noreferrer");
    if (e.key === "Tab") { // keep focus inside the window
      var f = [].slice.call(modal.querySelectorAll('button, select, a[href], [tabindex="0"]')).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  window.addEventListener("hashchange", close);
  document.addEventListener("visibilitychange", function () { if (!document.hidden && isOpen() && Date.now() - lastAt > REFRESH_MS) refresh(); });
})();
