/* On-chain price/liquidity fallback for World Chain tokens (UMD: browser window.AgentInusOnchain + Node module).
   Why: DexScreener's token endpoints answer HTTP 200 with NO pairs for pools that had no trade in ~24h
   (most launchpad memecoins), and 429 under load. Both used to make held coins vanish.
   How: find the token's Uniswap-V2-style pools (pool hints, else contract holders from Blockscout, plus the token
   itself for pump-style tokens), read token0/token1/getReserves (V2) or slot0 (V3) + quote balanceOf via one JSON-RPC batch.
   liquidity = 2 x min(quote reserve, quote balance) x quote USD price;  price = quote reserve / token reserve x quote price.
   lookup(tokens, opts) -> { results: {addr: {price, liq, mcap, pool, src:"onchain"} | {liq:0, none:true}}, errors: {addr: msg} }
   Only a SUCCESSFUL check yields {none:true}/low liq; any failure lands in errors (= unknown, callers must keep the coin). */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api; else root.AgentInusOnchain = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var RPC = "https://worldchain-mainnet.g.alchemy.com/public";
  var BS = "https://worldchain-mainnet.explorer.alchemy.com/api/v2";
  var QUOTES = {
    "0x2cfc85d8e48f8eab294be644d9e25c3030863003": { sym: "WLD", dec: 18, key: "coingecko:worldcoin-wld" },
    "0x4200000000000000000000000000000000000006": { sym: "WETH", dec: 18, key: "coingecko:ethereum" },
    "0x79a02482a880bce3f13e09da970dc34db4cd24d1": { sym: "USDC", dec: 6, key: "stable" }
  };
  var SEL = { token0: "0x0dfe1681", token1: "0xd21220a7", getReserves: "0x0902f1ac", slot0: "0x3850c7bd", decimals: "0x313ce567", totalSupply: "0x18160ddd", balanceOf: "0x70a08231" };
  function lc(s) { return String(s || "").toLowerCase(); }
  function isAddr(a) { return /^0x[0-9a-f]{40}$/.test(a); }
  function word(hex, i) { return (hex || "").replace(/^0x/, "").slice(i * 64, i * 64 + 64); }
  function addrOf(hex) { var w = word(hex, 0); return w.length === 64 ? "0x" + w.slice(24) : ""; }
  function big(w) { return w && /^[0-9a-f]+$/i.test(w) ? BigInt("0x" + w) : null; }
  function toNum(b, dec) { if (b == null) return NaN; var s = b.toString(); dec = dec || 0; if (dec === 0) return Number(s); s = s.padStart(dec + 1, "0"); return Number(s.slice(0, s.length - dec) + "." + s.slice(s.length - dec, s.length - dec + 12)); }

  function defaultJSON(url, init) {
    return fetch(url, init).then(function (r) { if (!r.ok) throw new Error(new URL(url).host + " HTTP " + r.status); return r.json(); });
  }
  function rpcBatch(calls, fetchJSON) { // calls: [{to,data}] -> [hex|null]
    if (!calls.length) return Promise.resolve([]);
    var out = [], chunks = [];
    for (var i = 0; i < calls.length; i += 40) chunks.push(calls.slice(i, i + 40).map(function (c, j) { return { jsonrpc: "2.0", id: i + j, method: "eth_call", params: [{ to: c.to, data: c.data }, "latest"] }; }));
    return chunks.reduce(function (p, body) {
      return p.then(function () {
        return fetchJSON(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(function (res) {
          if (!Array.isArray(res)) throw new Error("rpc: bad batch reply");
          res.forEach(function (r) { out[r.id] = r && r.result && r.result !== "0x" ? r.result : null; });
        });
      });
    }, Promise.resolve()).then(function () { return out; });
  }
  function quotePrices(opts, fetchJSON) {
    if (opts.quotePx) return Promise.resolve(opts.quotePx);
    if (qpxCache && Date.now() - qpxCache.at < 60000) return Promise.resolve(qpxCache.v);
    var keys = ["coingecko:worldcoin-wld", "coingecko:ethereum"];
    return fetchJSON("https://coins.llama.fi/prices/current/" + keys.join(",")).then(function (d) {
      var o = { stable: 1 }; keys.forEach(function (k) { var c = d && d.coins && d.coins[k]; if (c && c.price > 0) o[k] = c.price; });
      if (o["coingecko:worldcoin-wld"]) qpxCache = { at: Date.now(), v: o };
      return o;
    });
  }
  /* tokens: [{address, pools?:[addr]}]; opts: {fetchJSON(url, init), bsJSON(url) (Blockscout, may be rate-limited queue), quotePx, minLiq} */
  function lookup(tokens, opts) { // pass 1 uses pool hints; tokens whose hints gave no valid pool are re-discovered via holders
    opts = opts || {};
    return lookup1(tokens, opts).then(function (r1) {
      var min = opts.minLiq || 500;
      var redo = tokens.filter(function (t) { var a = lc(t && t.address), x = r1.results[a]; return t && t.pools && t.pools.length && x && (x.none || !(x.liq >= min)); });
      if (!redo.length) return r1;
      return lookup1(redo.map(function (t) { return { address: t.address, pools: null }; }), opts).then(function (r2) {
        Object.keys(r2.results).forEach(function (a) { var x = r2.results[a], y = r1.results[a]; if (!x.none && (!y || y.none || x.liq > y.liq)) r1.results[a] = x; });
        Object.keys(r2.errors).forEach(function (a) { var y = r1.results[a]; if (y && (y.none || !(y.liq >= min))) { delete r1.results[a]; r1.errors[a] = r2.errors[a]; } });   // unsure -> unknown
        return r1;
      });
    });
  }
  var qpxCache = null;
  function lookup1(tokens, opts) {
    var fetchJSON = opts.fetchJSON || defaultJSON, bsJSON = opts.bsJSON || fetchJSON;
    var results = {}, errors = {}, cand = {};
    tokens = tokens.filter(function (t) { return t && isAddr(lc(t.address)); });
    return quotePrices(opts, fetchJSON).then(function (qpx) {
      if (!qpx["coingecko:worldcoin-wld"]) throw new Error("no WLD price");
      // 1) candidate pools
      return tokens.reduce(function (p, t) {
        var a = lc(t.address);
        return p.then(function () {
          var c = { }; c[a] = 1; // pump-style tokens are their own pair
          (t.pools || []).forEach(function (x) { if (isAddr(lc(x))) c[lc(x)] = 1; });
          if (t.pools && t.pools.length) { cand[a] = Object.keys(c); return; }
          return bsJSON(BS + "/tokens/" + a + "/holders").then(function (h) {
            ((h && h.items) || []).slice(0, 12).forEach(function (x) { if (x.address && x.address.is_contract && isAddr(lc(x.address.hash))) c[lc(x.address.hash)] = 1; });
            cand[a] = Object.keys(c);
          }).catch(function (e) { errors[a] = "holders: " + (e && e.message || e); });
        });
      }, Promise.resolve()).then(function () {
        // 2) pool shape: token0, token1, getReserves  (+ token decimals / supply)
        var calls = [], meta = [];
        Object.keys(cand).forEach(function (a) {
          calls.push({ to: a, data: SEL.decimals }, { to: a, data: SEL.totalSupply }); meta.push({ a: a, kind: "tok" });
          cand[a].forEach(function (pool) { calls.push({ to: pool, data: SEL.token0 }, { to: pool, data: SEL.token1 }, { to: pool, data: SEL.getReserves }, { to: pool, data: SEL.slot0 }); meta.push({ a: a, kind: "pool", pool: pool }); });
        });
        return rpcBatch(calls, fetchJSON).then(function (r) {
          var k = 0, tok = {}, pools = [];
          meta.forEach(function (m) {
            if (m.kind === "tok") { tok[m.a] = { dec: Number(big(word(r[k], 0)) || 18n), supply: big(word(r[k + 1], 0)) }; k += 2; return; }
            var t0 = addrOf(r[k]), t1 = addrOf(r[k + 1]), rs = r[k + 2], s0 = r[k + 3]; k += 4;
            if (!t0 || !t1 || (!rs && !s0)) return;
            var q = t0 === m.a ? t1 : t1 === m.a ? t0 : null; if (!q || !QUOTES[q]) return;
            if (rs) pools.push({ a: m.a, pool: m.pool, quote: q, rT: big(word(rs, t0 === m.a ? 0 : 1)), rQ: big(word(rs, t0 === m.a ? 1 : 0)) });
            else pools.push({ a: m.a, pool: m.pool, quote: q, v3: true, tIs0: t0 === m.a, sqrt: big(word(s0, 0)) });   // Uniswap-V3 style
          });
          // 3) real quote balance of each pool (guards against virtual reserves)
          return rpcBatch(pools.map(function (p) { return { to: p.quote, data: SEL.balanceOf + "000000000000000000000000" + p.pool.slice(2) }; }), fetchJSON).then(function (bal) {
            pools.forEach(function (p, i) {
              var Q = QUOTES[p.quote], px = qpx[Q.key]; if (!px) return;
              var t = tok[p.a] || { dec: 18 }, b = toNum(big(word(bal[i], 0)), Q.dec), liq, price;
              if (p.v3) { // sqrtPriceX96 -> raw token1/token0; liquidity ~ 2 x quote held by the pool
                if (!p.sqrt || !(b > 0)) return;
                var sq = Number(p.sqrt) / Math.pow(2, 96), raw = sq * sq; if (!(raw > 0)) return;
                var inQuote = p.tIs0 ? raw * Math.pow(10, t.dec - Q.dec) : (1 / raw) * Math.pow(10, t.dec - Q.dec);
                price = inQuote * px; liq = 2 * b * px;
              } else {
                var rQ = toNum(p.rQ, Q.dec), rT = toNum(p.rT, t.dec);
                if (!(rQ > 0) || !(rT > 0)) return;
                liq = 2 * Math.min(rQ, isFinite(b) ? b : rQ) * px; price = rQ / rT * px;
              }
              if (!isFinite(price) || !(price > 0)) return;
              var cur = results[p.a];
              if (!cur || cur.none || liq > cur.liq) results[p.a] = { price: price, liq: liq, mcap: t.supply != null ? toNum(t.supply, t.dec) * price : null, pool: p.pool, quote: Q.sym, src: "onchain" };
            });
            Object.keys(cand).forEach(function (a) { if (!results[a]) results[a] = { liq: 0, none: true }; });
            return { results: results, errors: errors };
          });
        });
      });
    }).catch(function (e) { // whole lookup failed: everything not yet resolved is unknown
      tokens.forEach(function (t) { var a = lc(t.address); if (!results[a] && !errors[a]) errors[a] = String(e && e.message || e); });
      return { results: results, errors: errors };
    });
  }
  return { lookup: lookup, QUOTES: QUOTES };
});
