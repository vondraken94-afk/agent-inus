/* Agent Inus - Wallet Tracker. Static, client-side only. */
(function () {
  "use strict";

  /* ---------------- Chains (free public Blockscout explorers, CORS enabled, no key) ---------------- */
  var CHAINS = {
    worldchain: {
      name: "World Chain", short: "WORLD", chainId: 480,
      api: "https://worldchain-mainnet.explorer.alchemy.com/api/v2",
      explorer: "https://worldscan.org", dex: "worldchain", llama: "wc",
      nativeKey: "coingecko:ethereum",
      quotes: {
        "0x2cfc85d8e48f8eab294be644d9e25c3030863003": { sym: "WLD", key: "wc:0x2cfc85d8e48f8eab294be644d9e25c3030863003" },
        "0x4200000000000000000000000000000000000006": { sym: "WETH", key: "coingecko:ethereum" },
        "0x79a02482a880bce3f13e09da970dc34db4cd24d1": { sym: "USDC.e", key: "stable" }
      }
    },
    ethereum: {
      name: "Ethereum", short: "ETH", chainId: 1, api: "https://eth.blockscout.com/api/v2", explorer: "https://etherscan.io",
      dex: "ethereum", llama: "ethereum", nativeKey: "coingecko:ethereum",
      quotes: {
        "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": { sym: "WETH", key: "coingecko:ethereum" },
        "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { sym: "USDC", key: "stable" },
        "0xdac17f958d2ee523a2206206994597c13d831ec7": { sym: "USDT", key: "stable" }
      }
    },
    base: {
      name: "Base", short: "BASE", chainId: 8453, api: "https://base.blockscout.com/api/v2", explorer: "https://basescan.org",
      dex: "base", llama: "base", nativeKey: "coingecko:ethereum",
      quotes: {
        "0x4200000000000000000000000000000000000006": { sym: "WETH", key: "coingecko:ethereum" },
        "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": { sym: "USDC", key: "stable" }
      }
    },
    arbitrum: {
      name: "Arbitrum", short: "ARB", chainId: 42161, api: "https://arbitrum.blockscout.com/api/v2", explorer: "https://arbiscan.io",
      dex: "arbitrum", llama: "arbitrum", nativeKey: "coingecko:ethereum",
      quotes: {
        "0x82af49447d8a07e3bd95bd0d56f35241523fbab1": { sym: "WETH", key: "coingecko:ethereum" },
        "0xaf88d065e77c8cc2239327c5edb3a432268e5831": { sym: "USDC", key: "stable" }
      }
    },
    optimism: {
      name: "Optimism", short: "OP", chainId: 10, api: "https://optimism.blockscout.com/api/v2", explorer: "https://optimistic.etherscan.io",
      dex: "optimism", llama: "optimism", nativeKey: "coingecko:ethereum",
      quotes: {
        "0x4200000000000000000000000000000000000006": { sym: "WETH", key: "coingecko:ethereum" },
        "0x0b2c639c533813f4aa9d7837caf62653d097ff85": { sym: "USDC", key: "stable" }
      }
    }
  };
  var VIA_LABEL = { swap: "swap", relay: "Relay x-chain", eth: "ETH", tswap: "token swap", group: "from group" };
  var STABLE_SYMS = { USDC: 1, "USDC.E": 1, USDT: 1, DAI: 1, USDBC: 1, USDT0: 1 };
  var MIN_VALUE_USD = 1;          // hide holdings below $1
  var MIN_LIQ_USD = 500;          // hide tokens whose best DEX pool has < $500 liquidity
  var MAX_TRANSFER_PAGES = 8;     // 50 transfers per page -> 400 most recent transfers per wallet/chain
  var CACHE_VER = "v2";
  var SEG_COLORS = ["#ffd23f", "#3ef0ff", "#ff5d8f", "#7cff6b", "#b388ff", "#ff9f43", "#4d9bff", "#f7f7f7"];
  var OTHER_COLOR = "#5b5f7a";

  /* ---------------- Storage (localStorage may be blocked in sandboxed iframes) ---------------- */
  var store = (function () {
    var ls = null, mem = {};
    try { ls = window.localStorage; ls.setItem("__ai_t", "1"); ls.removeItem("__ai_t"); } catch (e) { ls = null; }
    return {
      get: function (k) { try { var v = ls ? ls.getItem(k) : mem[k]; return v ? JSON.parse(v) : null; } catch (e) { return null; } },
      set: function (k, v) { var s = JSON.stringify(v); mem[k] = s; try { if (ls) ls.setItem(k, s); } catch (e) { /* quota */ } },
      del: function (k) { delete mem[k]; try { if (ls) ls.removeItem(k); } catch (e) {} }
    };
  })();
  var sess = (function () {
    var ss = null, mem = {};
    try { ss = window.sessionStorage; ss.setItem("__ai_t", "1"); ss.removeItem("__ai_t"); } catch (e) { ss = null; }
    return {
      get: function (k) { try { return ss ? ss.getItem(k) : (mem[k] || null); } catch (e) { return mem[k] || null; } },
      set: function (k, v) { mem[k] = v; try { if (ss) ss.setItem(k, v); } catch (e) {} }
    };
  })();

  /* ---------------- Locked groups: PBKDF2-SHA256 + AES-256-GCM (WebCrypto). Only ciphertext is in groups.js ---------------- */
  function b64d(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function b64e(buf) { var u = new Uint8Array(buf), s = ""; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  /* Crypto backend: WebCrypto when available (HTTPS / localhost), otherwise the vendored pure-JS
     @noble/hashes (PBKDF2-SHA256) + @noble/ciphers (AES-256-GCM) in vendor/noble-crypto.min.js (plain-HTTP pages). Keys are raw bytes. */
  function subtleOK() { return !!(window.crypto && window.crypto.subtle && window.crypto.subtle.importKey); }
  function hasCrypto() { return !!window.TextEncoder && (subtleOK() || !!window.NobleCrypto); }
  function randBytes(n) {
    var u = new Uint8Array(n);
    if (window.crypto && window.crypto.getRandomValues) return window.crypto.getRandomValues(u);
    for (var i = 0; i < n; i++) u[i] = Math.floor(Math.random() * 256);
    return u;
  }
  function deriveKey(pw, enc) { // -> Promise<Uint8Array(32)>
    var pwb = new TextEncoder().encode(pw), salt = b64d(enc.salt);
    if (subtleOK()) {
      return crypto.subtle.importKey("raw", pwb, "PBKDF2", false, ["deriveBits"]).then(function (k) {
        return crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt, iterations: enc.iter, hash: "SHA-256" }, k, 256);
      }).then(function (b) { return new Uint8Array(b); });
    }
    return window.NobleCrypto.pbkdf2Sha256(pwb, salt, enc.iter, 32);
  }
  function aesDecrypt(key, iv, ct) {
    if (subtleOK()) return crypto.subtle.importKey("raw", key, { name: "AES-GCM" }, false, ["decrypt"]).then(function (k) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, k, ct); }).then(function (b) { return new Uint8Array(b); });
    return new Promise(function (res) { res(window.NobleCrypto.gcmDecrypt(key, iv, ct)); }); // throws on wrong key (auth tag)
  }
  function aesEncrypt(key, iv, data) {
    if (subtleOK()) return crypto.subtle.importKey("raw", key, { name: "AES-GCM" }, false, ["encrypt"]).then(function (k) { return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, k, data); }).then(function (b) { return new Uint8Array(b); });
    return new Promise(function (res) { res(window.NobleCrypto.gcmEncrypt(key, iv, data)); });
  }
  function decJSON(key, iv, ct) { return aesDecrypt(key, b64d(iv), b64d(ct)).then(function (b) { return JSON.parse(new TextDecoder().decode(b)); }); }
  function encJSON(key, obj) {
    var iv = randBytes(12);
    return aesEncrypt(key, iv, new TextEncoder().encode(JSON.stringify(obj))).then(function (ct) { return { iv: b64e(iv), ct: b64e(ct) }; });
  }
  function encCacheKey(g) { return "ai_genc_" + CACHE_VER + "_" + g.id; }
  function applyUnlock(g, key) {
    return decJSON(key, g.enc.iv, g.enc.ct).then(function (p) {
      g.wallets = p.wallets || []; g._key = key; g._unlocked = true;
      sess.set("ai_unlock_" + g.id, g.enc.salt + "|" + b64e(key));
      var e = store.get(encCacheKey(g));
      if (!e || e.salt !== g.enc.salt) return;
      return decJSON(key, e.iv, e.ct).then(function (d) { g._cache = d; }).catch(function () {});
    });
  }
  function unlockWithPassword(g, pw) { return deriveKey(pw, g.enc).then(function (k) { return applyUnlock(g, k); }); }
  function restoreUnlock(g) { // session memory: the derived key (never the password) is kept in sessionStorage
    var v = sess.get("ai_unlock_" + g.id);
    if (!v || !hasCrypto()) return Promise.resolve(false);
    var parts = v.split("|");
    if (parts[0] !== g.enc.salt) return Promise.resolve(false);
    return applyUnlock(g, b64d(parts[1])).then(function () { return true; }, function () { return false; });
  }
  function cacheGet(g) { return g.locked ? (g._cache || null) : store.get("ai_group_" + CACHE_VER + "_" + g.id); }
  function cacheSet(g, data) {
    if (!g.locked) return store.set("ai_group_" + CACHE_VER + "_" + g.id, data);
    g._cache = data;
    if (g._key) encJSON(g._key, data).then(function (e) { store.set(encCacheKey(g), { salt: g.enc.salt, iv: e.iv, ct: e.ct }); }).catch(function () {});
  }

  /* ---------------- Rate-limited request queue (per host) ---------------- */
  var hosts = {};
  var HOST_GAP = { "worldchain-mainnet.explorer.alchemy.com": 120, "api.dexscreener.com": 300, "coins.llama.fi": 250, "api.relay.link": 1200 };
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function getJSON(url) {
    var host = new URL(url).host;
    var h = hosts[host] || (hosts[host] = { chain: Promise.resolve(), gap: HOST_GAP[host] || 200 });
    var job = h.chain.then(function () { return doFetch(url, 0); });
    h.chain = job.catch(function () {}).then(function () { return sleep(h.gap); });
    return job;
  }
  function doFetch(url, attempt) {
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var to = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) {
      clearTimeout(to);
      if (r.status === 429 || r.status >= 500) throw { retry: true, msg: "HTTP " + r.status };
      if (!r.ok) throw { retry: false, msg: "HTTP " + r.status };
      return r.json();
    }).catch(function (e) {
      clearTimeout(to);
      var retry = e && e.retry !== undefined ? e.retry : true;
      if (retry && attempt < 3) return sleep(800 * Math.pow(2, attempt)).then(function () { return doFetch(url, attempt + 1); });
      throw new Error((e && (e.msg || e.message)) || "network error");
    });
  }

  /* ---------------- Helpers ---------------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lc(a) { return String(a || "").toLowerCase(); }
  function units(raw, dec) {
    raw = String(raw || "0"); dec = parseInt(dec, 10) || 0;
    if (dec === 0) return Number(raw);
    var neg = raw[0] === "-"; if (neg) raw = raw.slice(1);
    raw = raw.padStart(dec + 1, "0");
    var v = Number(raw.slice(0, raw.length - dec) + "." + raw.slice(raw.length - dec));
    return neg ? -v : v;
  }
  function shortAddr(a) { return a.slice(0, 6) + "…" + a.slice(-4); }
  function fmtUsd(v) {
    if (v == null || !isFinite(v)) return "—";
    var a = Math.abs(v), s = v < 0 ? "-" : "";
    if (a >= 1e6) return s + "$" + (a / 1e6).toFixed(2) + "M";
    if (a >= 1e4) return s + "$" + Math.round(a).toLocaleString("en-US");
    if (a >= 1) return s + "$" + a.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return s + "$" + a.toFixed(2);
  }
  /* Price with subscript-zero notation for tiny memecoin prices: $0.0₅1835 */
  function fmtPrice(p) {
    if (p == null || !isFinite(p) || p <= 0) return "—";
    if (p >= 1000) return "$" + p.toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (p >= 1) return "$" + p.toFixed(p >= 100 ? 2 : 3);
    if (p >= 0.001) return "$" + p.toFixed(5).replace(/0+$/, "").replace(/\.$/, "");
    var str = p.toFixed(20), m = str.match(/^0\.(0+)(\d{4})/);
    if (!m) return "$" + p.toExponential(3);
    return "$0.0<sub>" + m[1].length + "</sub>" + m[2].replace(/0+$/, "");
  }
  function fmtAmt(v) {
    if (v == null || !isFinite(v)) return "—";
    var a = Math.abs(v);
    if (a >= 1e9) return (v / 1e9).toFixed(2) + "B";
    if (a >= 1e6) return (v / 1e6).toFixed(2) + "M";
    if (a >= 1e4) return Math.round(v).toLocaleString("en-US");
    if (a >= 1) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
    return v.toPrecision(3);
  }
  function fmtPct(v) { return v == null || !isFinite(v) ? "—" : (v >= 10 ? v.toFixed(1) : v.toFixed(2)) + "%"; }
  function pnlHtml(usd, pct) {
    if (usd == null || !isFinite(usd)) return '<span class="muted">—</span>';
    var cls = usd >= 0 ? "up" : "down";
    return '<span class="' + cls + '">' + (usd >= 0 ? "+" : "") + fmtUsd(usd) +
      (pct != null && isFinite(pct) ? ' <small>(' + (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%)</small>" : "") + "</span>";
  }
  function ago(ts) {
    var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 60) return s + "s ago"; if (s < 3600) return Math.round(s / 60) + "m ago";
    if (s < 86400) return Math.round(s / 3600) + "h ago"; return Math.round(s / 86400) + "d ago";
  }
  function timeStr(ts) { var d = new Date(ts); return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  function chunk(a, n) { var o = []; for (var i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; }
  function safeImg(u) { return /^https:\/\/[^\s"'<>]+$/.test(u || "") ? u : ""; }

  /* ---------------- Fetchers ---------------- */
  function fetchWalletChain(addr, chainId, onPage) {
    var C = CHAINS[chainId], base = C.api + "/addresses/" + addr;
    var out = { chain: chainId, native: 0, balances: [], transfers: [], truncated: false };
    return getJSON(base).then(function (a) {
      out.native = units(a.coin_balance || "0", 18);
      return getJSON(base + "/token-balances");
    }).then(function (bals) {
      (bals || []).forEach(function (b) {
        var t = b.token || {};
        if (t.type !== "ERC-20") return;
        out.balances.push({
          token: lc(t.address_hash || t.address), symbol: t.symbol || "?", name: t.name || "", decimals: t.decimals,
          amount: units(b.value, t.decimals), bsRate: t.exchange_rate ? Number(t.exchange_rate) : null, icon: t.icon_url || ""
        });
      });
      var page = 0;
      function next(params) {
        var url = base + "/token-transfers?type=ERC-20" + (params ? "&" + Object.keys(params).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); }).join("&") : "");
        return getJSON(url).then(function (d) {
          (d.items || []).forEach(function (x) {
            var t = x.token || {}, from = lc(x.from && x.from.hash), to = lc(x.to && x.to.hash), me = lc(addr);
            if (from !== me && to !== me) return;
            out.transfers.push({
              tx: x.transaction_hash || x.tx_hash, ts: Math.floor(Date.parse(x.timestamp) / 1000),
              token: lc(t.address_hash || t.address), symbol: t.symbol || "?",
              amount: units(x.total && x.total.value, (x.total && x.total.decimals) || t.decimals),
              dir: to === me ? "in" : "out", counterparty: to === me ? from : to
            });
          });
          page++; if (onPage) onPage(page);
          if (d.next_page_params && page < MAX_TRANSFER_PAGES) return next(d.next_page_params);
          if (d.next_page_params) out.truncated = true;
        });
      }
      return next(null);
    }).then(function () { return out; });
  }

  function fetchDexPrices(chainId, tokens) {
    var C = CHAINS[chainId], res = {};
    return chunk(tokens, 30).reduce(function (p, part) {
      return p.then(function () {
        return getJSON("https://api.dexscreener.com/tokens/v1/" + C.dex + "/" + part.join(",")).then(function (pairs) {
          (pairs || []).forEach(function (pr) {
            var a = lc(pr.baseToken && pr.baseToken.address);
            if (part.indexOf(a) < 0) return;
            var liq = (pr.liquidity && pr.liquidity.usd) || 0, px = Number(pr.priceUsd);
            if (!px) return;
            if (!res[a] || liq > res[a].liq) res[a] = { price: px, liq: liq, url: pr.url, icon: pr.info && pr.info.imageUrl, ch24: pr.priceChange && pr.priceChange.h24 };
          });
        }).catch(function () { res._failed = true; /* fall back to cached prices */ });
      });
    }, Promise.resolve()).then(function () { return res; });
  }

  function fetchLlamaCurrent(keys) {
    if (!keys.length) return Promise.resolve({});
    return getJSON("https://coins.llama.fi/prices/current/" + keys.join(",")).then(function (d) {
      var o = {}; Object.keys((d && d.coins) || {}).forEach(function (k) { o[lc(k)] = d.coins[k].price; }); return o;
    }).catch(function () { return {}; });
  }

  /* historical quote prices, cached forever (immutable) */
  var histCache = store.get("ai_hist_" + CACHE_VER) || {};
  function fetchHistorical(reqs) { // reqs: [{key, ts}]
    var need = {};
    reqs.forEach(function (r) { if (r.key === "stable") return; var ck = r.key + "@" + r.ts; if (histCache[ck] == null) (need[r.key] = need[r.key] || {})[r.ts] = 1; });
    var jobs = [];
    Object.keys(need).forEach(function (k) {
      chunk(Object.keys(need[k]).map(Number), 60).forEach(function (tsl) { jobs.push({ key: k, ts: tsl }); });
    });
    return jobs.reduce(function (p, j) {
      return p.then(function () {
        var q = {}; q[j.key] = j.ts;
        return getJSON("https://coins.llama.fi/batchHistorical?coins=" + encodeURIComponent(JSON.stringify(q)) + "&searchWidth=3600").then(function (d) {
          var c = d && d.coins && (d.coins[j.key] || d.coins[lc(j.key)]);
          var pts = (c && c.prices) || [];
          j.ts.forEach(function (t) { // nearest returned point
            var best = null, bd = Infinity;
            pts.forEach(function (pt) { var dd = Math.abs(pt.timestamp - t); if (dd < bd) { bd = dd; best = pt.price; } });
            if (best != null && bd <= 7200) histCache[j.key + "@" + t] = best;
          });
        }).catch(function () {});
      });
    }, Promise.resolve()).then(function () { store.set("ai_hist_" + CACHE_VER, histCache); });
  }
  function histPrice(key, ts) { return key === "stable" ? 1 : histCache[key + "@" + ts]; }

  /* ---------------- Cost basis from swap history ----------------
     Each incoming (non-quote) token in a tx is classified:
       swap   : wallet SENT a quote token (WLD/WETH/USDC) in the same tx -> cost = quote x historical USD price
       relay  : tx is a Relay.link fill (cross-chain or solver-filled buy) -> cost = USD the wallet paid on the origin chain (Relay API)
       eth    : wallet (or a solver on its behalf) paid native ETH in the tx -> cost = (tx value - ETH refunded to wallet) x ETH price
       tswap  : wallet sent another (non-quote) token -> cost = amount sent x that token's avg entry
       group  : transfer from another wallet of the same group -> inherits the sender's avg entry
       other  : plain transfer / airdrop -> no cost, shown as "received (transfer)" */
  function extractBuys(chainId, transfers, groupSet, relay) {
    var C = CHAINS[chainId], byTx = {};
    transfers.forEach(function (t) { (byTx[t.tx] = byTx[t.tx] || []).push(t); });
    var out = { buys: [], unresolved: [], tswaps: [], groupIns: [] };
    Object.keys(byTx).forEach(function (h) {
      var list = byTx[h], ins = {}, insFrom = {}, quoteOut = {}, tokOut = {}, ts = list[0].ts;
      list.forEach(function (t) {
        var q = C.quotes[t.token] || (STABLE_SYMS[String(t.symbol).toUpperCase()] ? { sym: t.symbol, key: "stable" } : null);
        if (t.dir === "out") {
          if (groupSet[t.counterparty]) return;
          if (q) quoteOut[q.key] = (quoteOut[q.key] || 0) + t.amount; else tokOut[t.token] = (tokOut[t.token] || 0) + t.amount;
        } else if (!q) {
          ins[t.token] = (ins[t.token] || 0) + t.amount; insFrom[t.token] = t.counterparty;
        }
      });
      var tk = Object.keys(ins).filter(function (k) { return !tokOut[k]; }), qk = Object.keys(quoteOut), ok = Object.keys(tokOut);
      if (tk.length !== 1) return;
      var tok = tk[0], amt = ins[tok], rl = relay && relay[lc(h)];
      if (qk.length) out.buys.push({ tx: h, ts: ts, token: tok, amount: amt, quotes: quoteOut, via: "swap" });
      else if (rl && rl.usd > 0) out.buys.push({ tx: h, ts: ts, token: tok, amount: amt, usd: rl.usd, via: "relay", note: rl.note });
      else if (ok.length === 1) out.tswaps.push({ tx: h, ts: ts, token: tok, amount: amt, payToken: ok[0], payAmount: tokOut[ok[0]] });
      else if (groupSet[insFrom[tok]]) out.groupIns.push({ tx: h, ts: ts, token: tok, amount: amt, from: insFrom[tok] });
      else out.unresolved.push({ tx: h, ts: ts, token: tok, amount: amt, from: insFrom[tok] });
    });
    return out;
  }

  /* Relay.link public requests API (CORS *, no key) -> map destination tx hash -> USD paid on origin chain */
  function fetchRelay(addr, chainIds, oldestTs, persist) {
    var ck = "ai_relay_" + CACHE_VER + "_" + lc(addr) + "_" + chainIds.join("-");
    var cached = (persist !== false && store.get(ck)) || { map: {}, ids: {} }, map = cached.map, ids = cached.ids, pages = 0;
    function next(cont) {
      var url = "https://api.relay.link/requests/v2?user=" + addr + "&limit=50" + (cont ? "&continuation=" + encodeURIComponent(cont) : "");
      return getJSON(url).then(function (d) {
        var seenOld = false;
        (d.requests || []).forEach(function (r) {
          if (ids[r.id] && r.status === "success") seenOld = true;
          if (r.status !== "success" || lc(r.recipient) !== lc(addr)) return;
          ids[r.id] = 1;
          var m = (r.data && r.data.metadata) || {}, ci = m.currencyIn || {}, co = m.currencyOut || {};
          var outChain = co.currency && co.currency.chainId;
          if (chainIds.indexOf(outChain) < 0) return;
          ((r.data && r.data.outTxs) || []).forEach(function (t) {
            if (t.hash && t.chainId === outChain) map[lc(t.hash)] = { usd: Number(ci.amountUsd) || 0, note: (ci.amountFormatted ? Number(ci.amountFormatted).toPrecision(4) + " " : "") + ((ci.currency && ci.currency.symbol) || "") + " on chain " + ((ci.currency && ci.currency.chainId) || "?") };
          });
        });
        pages++;
        var reqs = d.requests || [], last = reqs.length ? Date.parse(reqs[reqs.length - 1].createdAt) / 1000 : 0;
        var pastOldest = oldestTs && last && last < oldestTs - 3600;
        if (d.continuation && pages < 8 && !seenOld && !pastOldest) return next(d.continuation);
      });
    }
    return next(null).then(function () { if (persist !== false) store.set(ck, { map: map, ids: ids }); return map; },
      function () { return Object.keys(map).length ? map : null; });
  }

  /* On-chain fallback for buys with no token payment: native ETH paid in the tx (by the wallet or a solver for it) */
  function resolveNative(chainId, addr, items) {
    var C = CHAINS[chainId], res = [], lim = items.slice(0, 15);
    return lim.reduce(function (p, u) {
      return p.then(function () {
        return getJSON(C.api + "/transactions/" + u.tx).then(function (tx) {
          var val = units(tx.value || "0", 18);
          if (!(val > 0)) return;
          return getJSON(C.api + "/transactions/" + u.tx + "/internal-transactions").then(function (it) {
            var refund = 0;
            ((it && it.items) || []).forEach(function (x) { if (lc(x.to && x.to.hash) === lc(addr)) refund += units(x.value || "0", 18); });
            var paid = val - refund;
            if (paid > 0) { var q = {}; q[C.nativeKey] = paid; res.push({ tx: u.tx, ts: u.ts, token: u.token, amount: u.amount, quotes: q, via: "eth" }); u.resolved = true; }
          });
        }).catch(function () {});
      });
    }, Promise.resolve()).then(function () { return res; });
  }

  /* ---------------- Group refresh pipeline ---------------- */
  function normWallets(g) {
    return g.wallets.map(function (w) { return typeof w === "string" ? { address: w, label: "" } : { address: w.address, label: w.label || "" }; });
  }

  function refreshGroup(g, ui) {
    var wallets = normWallets(g), chains = (g.chains && g.chains.length ? g.chains : ["worldchain"]).filter(function (c) { return CHAINS[c]; });
    var groupSet = {}; wallets.forEach(function (w) { groupSet[lc(w.address)] = 1; });
    var prev = cacheGet(g);
    var raw = {}; // addr -> {chains:{}, error}
    var total = wallets.length * chains.length, done = 0;

    var seq = Promise.resolve();
    wallets.forEach(function (w) {
      raw[lc(w.address)] = { chains: {}, errors: [] };
      chains.forEach(function (c) {
        seq = seq.then(function () {
          ui.progress("Loading wallet " + (done + 1) + "/" + total + " · " + shortAddr(w.address));
          return fetchWalletChain(w.address, c, function (p) { if (p > 1) ui.progress("Loading wallet " + (done + 1) + "/" + total + " · history page " + p); })
            .then(function (r) { raw[lc(w.address)].chains[c] = r; })
            .catch(function (e) { raw[lc(w.address)].errors.push(CHAINS[c].short + ": " + e.message); })
            .then(function () { done++; });
        });
      });
    });

    var prices = {}, nativePx = {};
    var chainIds = chains.map(function (c) { return CHAINS[c].chainId; });
    return seq.then(function () {
      ui.progress("Fetching prices…");
      var p = Promise.resolve();
      chains.forEach(function (c) {
        var toks = {};
        Object.keys(raw).forEach(function (a) { var r = raw[a].chains[c]; if (r) r.balances.forEach(function (b) { if (b.amount > 0) toks[b.token] = 1; }); });
        p = p.then(function () { return fetchDexPrices(c, Object.keys(toks)); }).then(function (res) { prices[c] = res; });
      });
      return p;
    }).then(function () {
      var keys = {};
      chains.forEach(function (c) { keys[CHAINS[c].nativeKey] = 1; Object.keys(CHAINS[c].quotes).forEach(function (q) { var k = CHAINS[c].quotes[q].key; if (k !== "stable") keys[k] = 1; }); });
      return fetchLlamaCurrent(Object.keys(keys)).then(function (r) { nativePx = r; });
    }).then(function () {
      ui.progress("Estimating entry prices…");
      var p = Promise.resolve();
      Object.keys(raw).forEach(function (a) {
        Object.keys(raw[a].chains).forEach(function (c) {
          var r = raw[a].chains[c], x = extractBuys(c, r.transfers, groupSet, null);
          r.buys = x.buys; r.tswaps = x.tswaps; r.groupIns = x.groupIns; r.unresolved = x.unresolved;
          if (!x.unresolved.length) return;
          // unpaid incoming tokens: ask Relay (cross-chain / solver fills), then fall back to native-ETH detection on-chain
          p = p.then(function () {
            ui.progress("Checking cross-chain (Relay) buys · " + shortAddr(a));
            var oldest = Math.min.apply(null, x.unresolved.map(function (u) { return u.ts; }));
            return fetchRelay(a, chainIds, oldest, !g.locked).then(function (m) {
              raw[a].relay = m;
              var left = [];
              x.unresolved.forEach(function (u) {
                var rl = m && m[lc(u.tx)];
                if (rl && rl.usd > 0) { r.buys.push({ tx: u.tx, ts: u.ts, token: u.token, amount: u.amount, usd: rl.usd, via: "relay" }); u.resolved = true; }
                else left.push(u);
              });
              return resolveNative(c, a, left).then(function (nb) { r.buys = r.buys.concat(nb); });
            });
          });
        });
      });
      return p.then(function () {
        var reqs = [];
        Object.keys(raw).forEach(function (a) { Object.keys(raw[a].chains).forEach(function (c) {
          raw[a].chains[c].buys.forEach(function (b) { if (b.quotes) Object.keys(b.quotes).forEach(function (k) { reqs.push({ key: k, ts: b.ts }); }); });
        }); });
        return fetchHistorical(reqs);
      });
    }).then(function () {
      var result = compute(g, wallets, chains, raw, prices, nativePx, prev);
      cacheSet(g, result);
      return result;
    });
  }

  function compute(g, wallets, chains, raw, prices, nativePx, prev) {
    // phase 1: direct buys -> basis[wallet][chain][token]
    var BASIS = {};
    wallets.forEach(function (w) {
      var R = raw[lc(w.address)]; BASIS[lc(w.address)] = {};
      Object.keys(R.chains).forEach(function (c) {
        var basis = BASIS[lc(w.address)][c] = {};
        (R.chains[c].buys || []).forEach(function (b) {
          var usd = 0, ok = true;
          if (b.usd != null) usd = b.usd;
          else Object.keys(b.quotes).forEach(function (k) { var hp = histPrice(k, b.ts); if (hp == null) ok = false; else usd += b.quotes[k] * hp; });
          var x = basis[b.token] || (basis[b.token] = { cost: 0, amt: 0, n: 0, missing: 0, via: {} });
          if (ok) { x.cost += usd; x.amt += b.amount; x.n++; x.via[b.via] = 1; } else x.missing++;
        });
      });
    });
    // phase 2: token->token swaps (cost = paid token x its avg) and transfers from group wallets (inherit sender avg)
    function avgOf(a, c, t) { var b = BASIS[a] && BASIS[a][c] && BASIS[a][c][t]; return b && b.amt > 0 ? b.cost / b.amt : null; }
    var extra = [];
    wallets.forEach(function (w) {
      var a = lc(w.address), R = raw[a];
      Object.keys(R.chains).forEach(function (c) {
        (R.chains[c].tswaps || []).forEach(function (s) { var av = avgOf(a, c, s.payToken); if (av != null) extra.push([a, c, s.token, s.payAmount * av, s.amount, "tswap"]); });
        (R.chains[c].groupIns || []).forEach(function (s) { var av = avgOf(s.from, c, s.token); if (av != null) extra.push([a, c, s.token, s.amount * av, s.amount, "group"]); });
      });
    });
    extra.forEach(function (e) {
      var bc = BASIS[e[0]][e[1]], x = bc[e[2]] || (bc[e[2]] = { cost: 0, amt: 0, n: 0, missing: 0, via: {} });
      x.cost += e[3]; x.amt += e[4]; x.n++; x.via[e[5]] = 1;
    });
    var prevWallets = {}, prevPx = {}, priceFail = chains.some(function (c) { return prices[c] && prices[c]._failed; }), usedStale = 0;
    if (prev && prev.wallets) prev.wallets.forEach(function (w) { prevWallets[lc(w.address)] = w; });
    if (prev && prev.coins) prev.coins.forEach(function (c) { prevPx[c.chain + ":" + c.token] = c; });
    var outWallets = [];
    wallets.forEach(function (w) {
      var R = raw[lc(w.address)], hold = [], stale = false;
      var errs = R.errors.slice();
      if (!Object.keys(R.chains).length && prevWallets[lc(w.address)]) { // total failure: keep last good data
        var pw = prevWallets[lc(w.address)];
        outWallets.push({ address: w.address, label: w.label, holdings: pw.holdings, total: pw.total, errors: errs, stale: true, staleTs: pw.ts || prev.ts, truncated: pw.truncated, chains: pw.chains });
        return;
      }
      var truncated = false, active = [];
      Object.keys(R.chains).forEach(function (c) {
        var r = R.chains[c], C = CHAINS[c];
        if (r.truncated) truncated = true;
        if (r.balances.length || r.transfers.length || r.native > 0) active.push(c);
        // cost basis per token
        var basis = (BASIS[lc(w.address)] || {})[c] || {}, acqOther = {};
        (r.unresolved || []).forEach(function (u) { if (!u.resolved) acqOther[u.token] = 1; });
        // native coin
        var npx = nativePx[lc(C.nativeKey)];
        if (r.native > 0 && npx && r.native * npx >= MIN_VALUE_USD) {
          hold.push({ chain: c, token: "native", symbol: "ETH", name: "Ether (gas)", amount: r.native, price: npx, value: r.native * npx, liq: null, icon: "", url: "" });
        }
        r.balances.forEach(function (b) {
          var dp = prices[c] && prices[c][b.token];
          var price = null, liq = null, src = "";
          if (dp && dp.liq >= MIN_LIQ_USD) { price = dp.price; liq = dp.liq; src = "dex"; }
          else if (!dp && priceFail && prevPx[c + ":" + b.token]) { var pp = prevPx[c + ":" + b.token]; price = pp.price; src = "cached"; usedStale++; dp = { price: pp.price, liq: MIN_LIQ_USD, icon: pp.icon, url: pp.url }; }
          else if (b.bsRate && (!dp)) { price = b.bsRate; src = "explorer"; }
          if (!price) return;
          var value = b.amount * price;
          if (value < MIN_VALUE_USD) return;
          var bs = basis[b.token], avg = bs && bs.amt > 0 ? bs.cost / bs.amt : null;
          hold.push({
            chain: c, token: b.token, symbol: b.symbol, name: b.name, amount: b.amount, price: price, value: value, liq: liq, src: src,
            icon: safeImg((dp && dp.icon) || b.icon), url: dp && dp.url ? dp.url : "", ch24: dp ? dp.ch24 : null,
            boughtAmt: bs ? bs.amt : 0, cost: bs ? bs.cost : 0, buys: bs ? bs.n : 0, avg: avg, via: bs ? Object.keys(bs.via || {}) : [], acq: avg == null && acqOther[b.token] ? "transfer" : "",
            pnl: avg != null ? (price - avg) * b.amount : null, pnlPct: avg ? (price / avg - 1) * 100 : null
          });
        });
      });
      hold.sort(function (a, b) { return b.value - a.value; });
      var tot = hold.reduce(function (s, h) { return s + h.value; }, 0);
      hold.forEach(function (h) { h.pct = tot ? h.value / tot * 100 : 0; });
      outWallets.push({ address: w.address, label: w.label, holdings: hold, total: tot, errors: errs, stale: stale, truncated: truncated, chains: active, ts: Date.now() });
    });

    // group aggregate
    var agg = {}, gt = 0;
    outWallets.forEach(function (w) {
      gt += w.total;
      w.holdings.forEach(function (h) {
        var k = h.chain + ":" + h.token;
        var a = agg[k] || (agg[k] = { chain: h.chain, token: h.token, symbol: h.symbol, name: h.name, icon: h.icon, url: h.url, price: h.price, amount: 0, value: 0, cost: 0, boughtAmt: 0, pnl: 0, pnlKnown: false, costHeld: 0, holders: 0, ch24: h.ch24 });
        a.amount += h.amount; a.value += h.value; a.holders++;
        if (h.acq) a.acq = h.acq;
        if (h.avg != null) { a.cost += h.cost; a.boughtAmt += h.boughtAmt; a.pnl += h.pnl; a.pnlKnown = true; a.costHeld += h.avg * h.amount; }
      });
    });
    var coins = Object.keys(agg).map(function (k) { var a = agg[k]; a.pct = gt ? a.value / gt * 100 : 0; a.avg = a.boughtAmt > 0 ? a.cost / a.boughtAmt : null; a.pnlPct = a.pnlKnown && a.costHeld ? a.pnl / a.costHeld * 100 : null; if (!a.pnlKnown) a.pnl = null; return a; });
    coins.sort(function (a, b) { return b.value - a.value; });
    outWallets.forEach(function (w) { w.groupPct = gt ? w.total / gt * 100 : 0; });
    var pnlSum = 0, costHeldSum = 0;
    coins.forEach(function (c) { if (c.pnl != null) { pnlSum += c.pnl; costHeldSum += c.costHeld; } });
    var res = { ts: Date.now(), total: gt, coins: coins, wallets: outWallets, pnl: costHeldSum ? pnlSum : null, pnlPct: costHeldSum ? pnlSum / costHeldSum * 100 : null, chains: chains };
    if (priceFail) res.warn = usedStale ? "DexScreener is rate-limiting right now: " + usedStale + " coin prices are from the last successful update." : "DexScreener did not answer: coins without an explorer price are missing. Press UPDATE again in a minute.";
    return res;
  }

  /* ---------------- Rendering ---------------- */
  function colorFor(i) { return i < SEG_COLORS.length ? SEG_COLORS[i] : OTHER_COLOR; }

  function drawDonut(canvas, segs) { // pixel donut, 40x40 logical px
    var N = 40, ctx = canvas.getContext("2d"); canvas.width = N; canvas.height = N;
    ctx.clearRect(0, 0, N, N);
    var cx = N / 2, cy = N / 2, ro = 19.5, ri = 11.5, total = segs.reduce(function (s, x) { return s + x.v; }, 0);
    if (!total) { segs = [{ v: 1, c: "#2a2d45" }]; total = 1; }
    var bounds = [], acc = 0; segs.forEach(function (s) { acc += s.v / total; bounds.push(acc); });
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.sqrt(dx * dx + dy * dy);
      if (r > ro || r < ri) continue;
      var ang = (Math.atan2(dx, -dy) / (2 * Math.PI) + 1) % 1, idx = 0;
      while (idx < bounds.length - 1 && ang > bounds[idx]) idx++;
      ctx.fillStyle = (r > ro - 1.2 || r < ri + 1.2) ? "#0b0b16" : segs[idx].c;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  function coinCell(h) {
    var ic = h.icon ? '<img class="tk-ic" src="' + esc(h.icon) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : '<span class="tk-ic tk-ph">' + esc(String(h.symbol).slice(0, 1)) + "</span>";
    var sym = '<b>' + esc(h.symbol) + "</b>";
    if (h.url && /^https:\/\/dexscreener\.com\//.test(h.url)) sym = '<a href="' + esc(h.url) + '" target="_blank" rel="noopener" title="Chart on DexScreener">' + sym + "</a>";
    return '<div class="coin">' + ic + '<div><div class="sym">' + sym + '</div><div class="nm">' + esc(h.name).slice(0, 28) + "</div></div></div>";
  }

  function avgCell(h) {
    if (h.avg == null && h.acq === "transfer") return '<span class="muted" title="Received by plain transfer from a wallet outside the group (no purchase found)">received<br>(transfer)</span>';
    if (h.avg == null) return '<span class="muted" title="No swap buys found for this coin (received by transfer, or bought before the scanned history)">n/a</span>';
    return fmtPrice(h.avg);
  }

  function renderCard(g, el, data) {
    var body = el.querySelector(".card-body");
    if (!data) { body.innerHTML = '<div class="empty">No data yet. Press <b>UPDATE</b> to load live wallet data.</div>'; return; }
    var top = data.coins.slice(0, SEG_COLORS.length), rest = data.coins.slice(SEG_COLORS.length);
    var restV = rest.reduce(function (s, c) { return s + c.value; }, 0);
    var segs = top.map(function (c, i) { return { v: c.value, c: colorFor(i) }; });
    if (restV > 0) segs.push({ v: restV, c: OTHER_COLOR });
    var walletsOk = data.wallets.filter(function (w) { return !w.errors.length; }).length;

    var legend = top.map(function (c, i) {
      return '<li><i style="background:' + colorFor(i) + '"></i><span class="lg-sym">' + esc(c.symbol) + '</span><span class="lg-pct">' + fmtPct(c.pct) + '</span><span class="lg-val">' + fmtUsd(c.value) + "</span></li>";
    }).join("") + (restV > 0 ? '<li><i style="background:' + OTHER_COLOR + '"></i><span class="lg-sym">Other (' + rest.length + ')</span><span class="lg-pct">' + fmtPct(restV / data.total * 100) + '</span><span class="lg-val">' + fmtUsd(restV) + "</span></li>" : "");

    var stats =
      '<div class="stats">' +
      stat("Total value", fmtUsd(data.total)) +
      stat("Coins held", String(data.coins.length)) +
      stat("Wallets", walletsOk + "/" + data.wallets.length + " OK") +
      stat("Est. unrealized PnL*", data.pnl == null ? "—" : pnlHtml(data.pnl, data.pnlPct)) +
      "</div>";

    var rows = data.coins.map(function (c, i) {
      return "<tr><td class='rk'><i class='dot' style='background:" + colorFor(i) + "'></i>" + (i + 1) + "</td><td class='c-coin'>" + coinCell(c) + "</td>" +
        "<td class='num'>" + fmtPrice(c.price) + "</td><td class='num'>" + fmtAmt(c.amount) + "</td><td class='num strong'>" + fmtUsd(c.value) + "</td>" +
        "<td class='num'><div class='pbar'><span style='width:" + Math.min(100, c.pct).toFixed(1) + "%;background:" + colorFor(i) + "'></span></div>" + fmtPct(c.pct) + "</td>" +
        "<td class='num'>" + avgCell(c) + "</td><td class='num'>" + pnlHtml(c.pnl, c.pnlPct) + "</td><td class='num'>" + c.holders + "</td></tr>";
    }).join("");
    var coinTable =
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Coin</th><th class="num">Price</th><th class="num">Amount</th><th class="num">Value</th><th class="num">% of group</th><th class="num">Avg entry*</th><th class="num">PnL*</th><th class="num">Wallets</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="9" class="muted">No priced holdings above $1.</td></tr>') + "</tbody></table></div>";

    var colorIdx = {}; data.coins.forEach(function (c, i) { colorIdx[c.chain + ":" + c.token] = colorFor(i); });
    var walletsHtml = data.wallets.map(function (w, wi) {
      var chainOf = (w.chains && w.chains[0]) || data.chains[0], C = CHAINS[chainOf] || CHAINS.worldchain;
      var bar = w.holdings.map(function (h) { return '<span style="width:' + h.pct.toFixed(2) + "%;background:" + (colorIdx[h.chain + ":" + h.token] || OTHER_COLOR) + '" title="' + esc(h.symbol) + " " + fmtPct(h.pct) + '"></span>'; }).join("");
      var status = w.errors.length ? '<span class="tag err" title="' + esc(w.errors.join(" | ")) + '">ERROR' + (w.stale ? " · cached" : "") + "</span>" : '<span class="tag ok">OK</span>';
      var chainTags = (w.chains || []).map(function (c) { return '<span class="tag ch">' + esc(CHAINS[c] ? CHAINS[c].short : c) + "</span>"; }).join("");
      var hrows = w.holdings.map(function (h) {
        return "<tr><td class='c-coin'>" + coinCell(h) + "</td><td class='num'>" + fmtAmt(h.amount) + "</td><td class='num'>" + fmtPrice(h.price) + "</td><td class='num strong'>" + fmtUsd(h.value) + "</td><td class='num'>" + fmtPct(h.pct) + "</td><td class='num'>" + avgCell(h) +
          (h.buys ? "<div class='sub'>" + h.buys + " buy" + (h.buys > 1 ? "s" : "") + " · " + fmtUsd(h.cost) + (h.via && h.via.length && (h.via.length > 1 || h.via[0] !== "swap") ? " · " + h.via.map(function (v) { return VIA_LABEL[v] || v; }).join("+") : "") + "</div>" : "") + "</td><td class='num'>" + pnlHtml(h.pnl, h.pnlPct) + "</td></tr>";
      }).join("");
      var errLine = w.errors.length ? '<div class="werr">⚠ ' + esc(w.errors.join(" | ")) + (w.stale ? " — showing cached data from " + timeStr(w.staleTs) : "") + "</div>" : "";
      return '<details class="wallet"' + (wi === 0 ? "" : "") + '><summary>' +
        '<span class="w-addr"><span class="mono">' + esc(w.label ? w.label + " · " : "") + shortAddr(w.address) + "</span>" +
        '<button class="icon-btn copy" data-copy="' + esc(w.address) + '" title="Copy address">COPY</button>' +
        '<a class="icon-btn" href="' + C.explorer + "/address/" + esc(w.address) + '" target="_blank" rel="noopener" title="Open in explorer">SCAN ↗</a></span>' +
        '<span class="w-meta">' + chainTags + status + "</span>" +
        '<span class="w-bar">' + (bar || '<span style="width:100%;background:#2a2d45"></span>') + "</span>" +
        '<span class="w-val"><b>' + fmtUsd(w.total) + '</b><small>' + fmtPct(w.groupPct) + " of group</small></span>" +
        '<span class="chev">▸</span></summary>' + errLine +
        '<div class="tbl-wrap"><table class="tbl small"><thead><tr><th>Coin</th><th class="num">Amount</th><th class="num">Price</th><th class="num">Value</th><th class="num">% wallet</th><th class="num">Avg entry*</th><th class="num">PnL*</th></tr></thead><tbody>' +
        (hrows || '<tr><td colspan="7" class="muted">No priced holdings above $1.</td></tr>') + "</tbody></table></div>" +
        (w.truncated ? '<div class="note">History truncated to the latest ' + (MAX_TRANSFER_PAGES * 50) + " transfers; older buys not included in avg entry.</div>" : "") +
        "</details>";
    }).join("");

    body.innerHTML =
      (data.warn ? '<div class="warn">⚠ ' + esc(data.warn) + "</div>" : "") +
      stats +
      '<div class="alloc"><div class="donut-box"><canvas class="donut" width="40" height="40"></canvas><div class="donut-center"><small>TOTAL</small><b>' + fmtUsd(data.total) + '</b></div></div>' +
      '<div class="legend-box"><h4 class="lbl">Holdings % of group</h4><ul class="legend">' + (legend || "<li class='muted'>No holdings</li>") + "</ul></div></div>" +
      '<h4 class="lbl sec">Coins</h4>' + coinTable +
      '<h4 class="lbl sec">Wallets <small>(tap a wallet to see its holdings)</small></h4><div class="wallets">' + walletsHtml + "</div>" +
      '<p class="foot">* <b>Avg entry</b> and <b>PnL</b> are estimates: weighted average cost of on-chain swap buys (WLD/WETH/USDC paid × historical USD price at the swap time, via DefiLlama). Coins received by transfer, airdrops and sells are not counted as buys; PnL = (current price − avg entry) × amount held. Tokens without a DEX price, with &lt;$' + MIN_LIQ_USD + " liquidity, or worth &lt;$1 are hidden as dust/spam." +
      " Buys paid on another chain via Relay use the USD paid on the origin chain (Relay API); swaps paid in native ETH use the ETH spent; coins sent between wallets of the group inherit the sender's entry.</p>";
    drawDonut(body.querySelector(".donut"), segs);
    // label every cell with its column header (used by the stacked mobile layout)
    Array.prototype.forEach.call(body.querySelectorAll("table.tbl"), function (t) {
      var heads = Array.prototype.map.call(t.querySelectorAll("thead th"), function (th) { return th.textContent; });
      Array.prototype.forEach.call(t.querySelectorAll("tbody tr"), function (tr) {
        Array.prototype.forEach.call(tr.children, function (td, i) {
          if (!heads[i] || td.hasAttribute("colspan")) return;
          td.setAttribute("data-l", heads[i]);
          if (/avg entry|pnl/i.test(heads[i])) td.className += " wide";
          if (!/c-coin/.test(td.className)) td.innerHTML = '<span class="v">' + td.innerHTML + "</span>";
        });
      });
    });
  }
  function stat(k, v) { return '<div class="stat"><div class="lbl">' + k + '</div><div class="val">' + v + "</div></div>"; }

  /* ---------------- Card / UI wiring ---------------- */
  function buildCard(g) {
    var el = document.createElement("section");
    el.className = "card";
    el.id = "group-" + g.id;
    var chains = (g.chains || ["worldchain"]).map(function (c) { return '<span class="tag ch">' + esc(CHAINS[c] ? CHAINS[c].name : c) + "</span>"; }).join("");
    el.innerHTML =
      '<header class="card-head">' +
      '<div class="mascot"><canvas class="sprite" width="16" height="16" aria-hidden="true"></canvas></div>' +
      '<div class="title"><h2>' + esc(g.name) + '</h2><div class="sub-head">' + chains + '<span class="tag">' + (g.walletCount || g.wallets.length) + ' wallets</span>' + (g.locked ? '<span class="tag lockt">UNLOCKED</span>' : "") + '</div></div>' +
      '<div class="actions"><button class="btn update" type="button">↻ UPDATE</button><div class="updated" aria-live="polite">—</div></div>' +
      "</header>" +
      '<div class="progress" hidden><span class="bar"></span><span class="ptxt"></span></div>' +
      '<div class="card-body"></div>';
    window.PixelSprites.draw(el.querySelector(".sprite"), g.sprite || "inu");
    var btn = el.querySelector(".update"), upd = el.querySelector(".updated"), prog = el.querySelector(".progress"), ptxt = el.querySelector(".ptxt");
    var cached = cacheGet(g), busy = false, lastTs = cached ? cached.ts : null;
    renderCard(g, el, cached);
    function tick() { upd.innerHTML = lastTs ? "Last updated <b>" + timeStr(lastTs) + "</b> · " + ago(lastTs) : "Not loaded yet"; }
    tick(); setInterval(tick, 15000);
    var ui = { progress: function (t) { ptxt.textContent = t; } };
    function run() {
      if (busy) return; busy = true;
      btn.disabled = true; btn.textContent = "LOADING…"; el.classList.add("loading"); prog.hidden = false; ui.progress("Starting…");
      refreshGroup(g, ui).then(function (data) {
        lastTs = data.ts; renderCard(g, el, data); try { el.dispatchEvent(new CustomEvent("groupdata", { detail: data })); } catch (e) {}
      }).catch(function (e) {
        upd.innerHTML = '<span class="down">Update failed: ' + esc(e.message || e) + "</span>";
      }).then(function () {
        busy = false; btn.disabled = false; btn.textContent = "↻ UPDATE"; el.classList.remove("loading"); prog.hidden = true; tick();
      });
    }
    btn.addEventListener("click", run);
    el._run = run; el._stale = !cached || Date.now() - cached.ts > 10 * 60 * 1000;
    return el;
  }

  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).catch(fallback);
    return Promise.resolve(fallback());
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand("copy"); } catch (e) {} document.body.removeChild(ta);
      if (!ok) window.prompt("Copy address:", t);
    }
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".copy");
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    copyText(b.getAttribute("data-copy")).then(function () { b.textContent = "COPIED"; b.classList.add("done"); setTimeout(function () { b.textContent = "COPY"; b.classList.remove("done"); }, 1400); });
  });

  /* ---------------- Lock prompt ---------------- */
  function buildLockCard(g, onOk) {
    var el = document.createElement("section");
    el.className = "card lockcard"; el.id = "lock-" + g.id;
    el.innerHTML =
      '<div class="lock-in">' +
      '<div class="lock-art"><canvas class="sprite" width="16" height="16" aria-hidden="true"></canvas><canvas class="lock-ic" width="16" height="16" aria-hidden="true"></canvas></div>' +
      "<h2>" + esc(g.name) + "</h2>" +
      '<p class="lbl">Private group · enter the password to view it</p>' +
      '<form class="lock-form" autocomplete="off"><input class="lock-pw" type="password" inputmode="text" autocomplete="current-password" placeholder="PASSWORD" aria-label="Password" required>' +
      '<button class="btn" type="submit">UNLOCK</button></form>' +
      '<div class="lock-err" role="alert" aria-live="assertive"></div>' +
      '<p class="lock-note">The wallet list is encrypted (AES-256-GCM, key derived from the password). Nothing is shown until it is unlocked.</p>' +
      "</div>";
    window.PixelSprites.draw(el.querySelector(".sprite"), g.sprite || "inu");
    window.PixelSprites.draw(el.querySelector(".lock-ic"), "lock");
    var form = el.querySelector("form"), inp = el.querySelector("input"), err = el.querySelector(".lock-err"), btn = el.querySelector("button");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!hasCrypto()) { err.textContent = "Unlock module failed to load. Reload the page."; return; }
      var pw = inp.value; if (!pw) return;
      btn.disabled = true; btn.textContent = "UNLOCKING…"; inp.disabled = true; err.textContent = "";
      unlockWithPassword(g, pw).then(function () { inp.value = ""; onOk(); }, function () {
        err.textContent = "✖ WRONG PASSWORD"; el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); inp.select();
      }).then(function () { btn.disabled = false; inp.disabled = false; btn.textContent = "UNLOCK"; });
    });
    el._focus = function () { setTimeout(function () { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 30); };
    return el;
  }

  /* ---------------- Home: tiles grid + hash routing (#<group-id>) ---------------- */
  function init() {
    var groups = window.TRACKER_GROUPS || [];
    var tilesEl = document.getElementById("tiles"), viewEl = document.getElementById("groupView"), slot = document.getElementById("groupSlot");
    var home = document.getElementById("homeView"), cards = {}, locks = {};
    document.getElementById("groupCount").textContent = groups.length + (groups.length === 1 ? " group" : " groups");
    // never keep plaintext caches of locked groups (older versions stored them unencrypted)
    groups.forEach(function (g) { if (g.locked) ["v1", "v2"].forEach(function (v) { store.del("ai_group_" + v + "_" + g.id); }); });

    function tileStats(t, g, data) {
      var el = t.querySelector(".tile-val");
      if (g.locked && !g._unlocked) { el.innerHTML = '<b class="locked-txt">LOCKED</b><small>Password required</small>'; return; }
      el.innerHTML = data ? "<b>" + fmtUsd(data.total) + "</b><small>" + data.coins.length + " coins · " + timeStr(data.ts) + "</small>" : "<small>Tap to load</small>";
    }
    function tileOf(g) { return tilesEl.querySelector('.tile[data-id="' + g.id + '"]'); }
    groups.forEach(function (g) {
      var a = document.createElement("a"), n = g.walletCount || (g.wallets || []).length;
      a.className = "tile" + (g.locked ? " is-locked" : ""); a.href = "#" + encodeURIComponent(g.id); a.setAttribute("data-id", g.id);
      a.innerHTML = '<span class="tile-art"><canvas width="16" height="16" aria-hidden="true"></canvas>' + (g.locked ? '<canvas class="tile-lock" width="16" height="16" title="Password protected"></canvas>' : "") + "</span>" +
        '<span class="tile-name">' + esc(g.name) + "</span>" +
        '<span class="tile-meta"><span class="tag">' + n + (n === 1 ? " wallet" : " wallets") + "</span>" +
        (g.chains || ["worldchain"]).map(function (c) { return '<span class="tag ch">' + esc(CHAINS[c] ? CHAINS[c].short : c) + "</span>"; }).join("") + "</span>" +
        '<span class="tile-val"></span><span class="tile-go">' + (g.locked ? "UNLOCK ▸" : "OPEN ▸") + "</span>";
      window.PixelSprites.draw(a.querySelector("canvas"), g.sprite || "inu");
      if (g.locked) window.PixelSprites.draw(a.querySelector(".tile-lock"), "lock");
      tileStats(a, g, cacheGet(g));
      tilesEl.appendChild(a);
    });

    function show() {
      var id = decodeURIComponent((location.hash || "").replace(/^#\/?/, ""));
      var g = groups.filter(function (x) { return x.id === id; })[0];
      Array.prototype.forEach.call(slot.children, function (c) { c.hidden = true; });
      document.body.classList.toggle("in-group", !!g);
      if (!g) { home.hidden = false; viewEl.hidden = true; document.title = "Agent Inus · Wallet Tracker"; return; }
      home.hidden = true; viewEl.hidden = false; document.title = g.name + " · Agent Inus Wallet Tracker";
      window.scrollTo(0, 0);
      if (g.locked && !g._unlocked) {
        var lk = locks[g.id];
        if (!lk) {
          lk = locks[g.id] = buildLockCard(g, function () {
            lk.remove(); delete locks[g.id];
            var t = tileOf(g); if (t) { t.classList.add("unlocked"); t.querySelector(".tile-go").textContent = "OPEN ▸"; tileStats(t, g, cacheGet(g)); }
            show();
          });
          slot.appendChild(lk);
        }
        lk.hidden = false; lk._focus();
        return;
      }
      var c = cards[g.id];
      if (!c) { // build lazily: data is fetched only when a group is opened
        c = cards[g.id] = buildCard(g); slot.appendChild(c);
        c.addEventListener("groupdata", function (e) { var t = tileOf(g); if (t) tileStats(t, g, e.detail); });
        if (c._stale) c._run();
      }
      c.hidden = false;
    }
    document.getElementById("backBtn").addEventListener("click", function (e) {
      e.preventDefault();
      if (history.length > 1 && window._aiNav) history.back();
      else location.hash = "";
    });
    window.addEventListener("hashchange", function () { window._aiNav = true; show(); });
    // restore session unlocks (no password re-entry within the same browser session), then route
    Promise.all(groups.filter(function (g) { return g.locked && g.enc; }).map(function (g) {
      return restoreUnlock(g).then(function (ok) { if (ok) { var t = tileOf(g); if (t) { t.classList.add("unlocked"); t.querySelector(".tile-go").textContent = "OPEN ▸"; tileStats(t, g, cacheGet(g)); } } });
    })).then(show, show);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
