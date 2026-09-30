/* Agent Inus — small vanilla JS: pixel icons, mobile nav, FAQ accordion, typing terminal */
(function () {
  'use strict';

  /* ---------- pixel icons (10x10 bitmaps -> crisp SVG) ---------- */
  var ICONS = {
    bone:     ['..........','.##....##.','####..####','##########','.########.','.########.','##########','####..####','.##....##.','..........'],
    mountain: ['..........','....#.....','...###....','...####...','..######..','..#######.','.#########','##########','##########','..........'],
    sprout:   ['..........','.##....##.','####..####','.###..###.','...####...','....##....','....##....','....##....','...####...','..######..'],
    sun:      ['....#.....','.#..#..#..','..#####...','.#######..','########..','.#######..','..#####...','.#..#..#..','....#.....','..........'],
    moon:     ['...####...','..####....','.####.....','.###......','.###......','.###......','.####.....','..#####..#','...######.','....####..'],
    bolt:     ['.....###..','....###...','...###....','..######..','.######...','....###...','...###....','..###.....','.##.......','#.........'],
    eye:      ['..........','...####...','.##....##.','#...##...#','#..####..#','#..####..#','#...##...#','.##....##.','...####...','..........'],
    shield:   ['.########.','##########','###....###','###....###','###....###','.###..###.','.###..###.','..######..','...####...','....##....'],
    chart:    ['.........#','........##','.......#.#','#.....#...','##...#....','#.#.#.....','#..#......','#.........','#.........','##########'],
    bell:     ['....##....','...####...','..######..','..######..','..######..','.########.','##########','##########','....##....','...####...'],
    lock:     ['...####...','..##..##..','..#....#..','..#....#..','##########','####..####','####..####','#####.####','##########','##########']
  };
  function svgFor(rows) {
    var rects = '';
    rows.forEach(function (r, y) {
      for (var x = 0; x < r.length; x++) if (r[x] === '#') rects += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    });
    return '<svg viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">' + rects + '</svg>';
  }
  document.querySelectorAll('.px[data-icon]').forEach(function (el) {
    var rows = ICONS[el.getAttribute('data-icon')];
    if (rows) el.innerHTML = svgFor(rows);
  });

  /* ---------- mobile nav ---------- */
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    var icon = item.querySelector('.faq-icon');
    q.addEventListener('click', function () {
      var open = !item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (o) {
        o.classList.remove('open'); o.querySelector('.faq-q').setAttribute('aria-expanded', 'false'); o.querySelector('.faq-icon').textContent = '+';
      });
      if (open) { item.classList.add('open'); q.setAttribute('aria-expanded', 'true'); icon.textContent = '-'; }
    });
  });

  /* ---------- typing terminal (illustrative sample data only) ---------- */
  var body = document.getElementById('termBody');
  if (!body) return;
  var LINES = [
    ['sys',     'pack online. loading sample data (demo mode)'],
    ['hinata',  'new launch: $TOKEN_A matches your filters. liquidity locked, dev wallet small'],
    ['kuro',    '$TOKEN_A risk note: thin order book. suggested size: 0.5% of your stack'],
    ['mochi',   'early gem candidate: $TOKEN_B. holders growing steadily, no mint authority'],
    ['tsuki',   'watchlist wallet W-07 bought $TOKEN_B. first buy from this wallet'],
    ['kuro',    '$TOKEN_B nearing resistance zone R1. plan exits before chasing'],
    ['biscuit', 'digest: "pixel pets" narrative picking up on socials. 3 related tokens'],
    ['tsuki',   'watchlist wallet W-02 moved funds to an exchange. heads up'],
    ['hinata',  'skipped 4 copycat launches (duplicate name + unverified contract)'],
    ['mochi',   '$TOKEN_C failed checks: top holders too concentrated. ignoring'],
    ['kuro',    '$TOKEN_A pulled back to support S1. your stop is still valid'],
    ['biscuit', 'summary ready. 2 alerts worth a closer look'],
  ];
  var NAMES = { sys: 'SYSTEM', hinata: 'HINATA', mochi: 'MOCHI', kuro: 'KURO', tsuki: 'TSUKI', biscuit: 'BISCUIT' };
  var MAX = 11, idx = 0, minute = 0;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function stamp() {
    var m = (minute++ * 3) % 60, h = 9 + Math.floor(minute * 3 / 60);
    return (h < 10 ? '0' : '') + (h % 24) + ':' + (m < 10 ? '0' : '') + m;
  }
  function addLine(done) {
    var l = LINES[idx % LINES.length]; idx++;
    var p = document.createElement('p'); p.className = 'tl';
    p.innerHTML = '<span class="t">[' + stamp() + ']</span> <span class="a a-' + l[0] + '">' + NAMES[l[0]] + '&gt;</span> <span class="m"></span>';
    body.appendChild(p);
    while (body.children.length > MAX) body.removeChild(body.firstChild);
    var msg = p.querySelector('.m');
    if (reduce) { msg.textContent = l[1]; return done(); }
    var cur = document.createElement('span'); cur.className = 'cursor'; p.appendChild(cur);
    var i = 0;
    (function type() {
      msg.textContent = l[1].slice(0, ++i);
      if (i < l[1].length) setTimeout(type, 18 + Math.random() * 22);
      else { cur.remove(); done(); }
    })();
  }
  function loop() { addLine(function () { setTimeout(loop, 900); }); }

  // pre-fill a few lines so the terminal never looks empty, then start typing
  for (var k = 0; k < 8; k++) {
    var l = LINES[idx++];
    var p = document.createElement('p'); p.className = 'tl';
    p.innerHTML = '<span class="t">[' + stamp() + ']</span> <span class="a a-' + l[0] + '">' + NAMES[l[0]] + '&gt;</span> <span class="m"></span>';
    p.querySelector('.m').textContent = l[1];
    body.appendChild(p);
  }
  if ('IntersectionObserver' in window && !reduce) {
    var started = false;
    new IntersectionObserver(function (es, obs) {
      if (!started && es[0].isIntersecting) { started = true; obs.disconnect(); loop(); }
    }).observe(body);
  } else { loop(); }
})();
