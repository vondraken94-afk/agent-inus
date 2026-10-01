/* Live "people watching" counter - real presence, never estimated.
   Backend: public MQTT broker over WebSockets (EMQX, fallback HiveMQ); ws:// on http pages, wss:// on https.
   Each tab: random id -> publishes non-retained heartbeats to NS/presence/<id> every 10 s, a "hi" on join
   (others answer immediately), and "bye" on leave (+ broker Last Will if the tab dies). Count = distinct ids
   heard in the last 25 s (local receive time, so no clock skew) + this tab. */
(function () {
  var box = document.getElementById("viewers");
  if (!box) return;
  var $n = document.getElementById("viewersNum");
  var NS = "agentinus-xyz-q9v4m2k7h1/v1/presence/";
  var HB_MS = 10000, TTL_MS = 25000;
  var https = location.protocol === "https:";
  var BROKERS = https
    ? ["wss://broker.emqx.io:8084/mqtt", "wss://broker.hivemq.com:8884/mqtt"]
    : ["ws://broker.emqx.io:8083/mqtt", "ws://broker.hivemq.com:8000/mqtt"];
  var id = (function () { var a = new Uint8Array(9); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256; });
    return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); })();
  var me = NS + id, peers = {}, client = null, live = false, bi = 0, fails = 0, hbTimer = null, lastReply = 0, retryTimer = null;

  function show() {
    if (!live) { $n.textContent = "—"; box.classList.add("off"); box.title = "Viewer count unavailable right now"; return; }
    var now = Date.now(), n = 1;
    for (var k in peers) { if (now - peers[k] < TTL_MS) n++; else delete peers[k]; }
    $n.textContent = n; box.classList.remove("off");
    box.title = n === 1 ? "You're the only one here right now" : n + " people are viewing agentinus.xyz right now";
    box.dataset.count = n;
  }
  function send(t) { if (client && client.connected) { try { client.publish(me, t, { qos: 0, retain: false }); } catch (e) {} } }

  function connect() {
    if (!window.mqtt) return;
    var url = BROKERS[bi % BROKERS.length], c;
    try {
      c = mqtt.connect(url, {
        clientId: "ai_" + id + "_" + (Date.now() % 1e6), clean: true, keepalive: 30,
        connectTimeout: 7000, reconnectPeriod: 0, protocolVersion: 4,
        will: { topic: me, payload: "bye", qos: 0, retain: false }
      });
    } catch (e) { return retry(); }
    client = c;
    c.on("connect", function () {
      fails = 0;
      c.subscribe(NS + "+", { qos: 0 }, function (err) {
        if (err) { try { c.end(true); } catch (x) {} return; }
        live = true; peers = {}; send("hi"); show();
        clearInterval(hbTimer); hbTimer = setInterval(function () { send("hb"); show(); }, HB_MS);
      });
    });
    c.on("message", function (topic, buf) {
      var pid = topic.slice(NS.length); if (!pid || pid === id || pid.length > 40) return;
      var t = String(buf).slice(0, 8);
      if (t === "bye") delete peers[pid];
      else if (t === "hi" || t === "hb") {
        peers[pid] = Date.now();
        if (t === "hi" && Date.now() - lastReply > 2000) { lastReply = Date.now(); setTimeout(function () { send("hb"); }, 200 + Math.random() * 800); }
      }
      show();
    });
    c.on("error", function () { /* handled on close */ });
    c.on("close", function () {
      if (client !== c) return;
      live = false; clearInterval(hbTimer); show();
      try { c.end(true); } catch (x) {}
      client = null; retry();
    });
  }
  function retry() {
    clearTimeout(retryTimer); fails++; bi++;                 // try the other broker next
    var wait = fails <= BROKERS.length ? 1500 : Math.min(120000, 15000 * (fails - BROKERS.length));
    retryTimer = setTimeout(function () { if (fails > BROKERS.length * 2) bi = 0; connect(); }, wait);
  }
  function bye() { send("bye"); }
  window.addEventListener("pagehide", bye);
  window.addEventListener("beforeunload", bye);

  show();
  function load() { // lazy-load the vendored client after the page is ready
    var s = document.createElement("script");
    s.src = box.getAttribute("data-mqtt-src"); s.async = true;
    s.onload = connect; s.onerror = function () { live = false; show(); };
    document.head.appendChild(s);
  }
  if (document.readyState === "complete") load(); else window.addEventListener("load", load);
})();
