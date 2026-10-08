/* Pixel sprites: 16x16, defined as LEFT HALVES (8 cols) and mirrored -> symmetric.
   '.' = transparent; other chars map to the sprite's palette. */
(function () {
  var S = {
    /* Gold coin (home OTHERS box): full 16 rows - rim, embossed inner ring, highlight top-left, shade bottom-right */
    coin: {
      pal: { k: "#5a3a06", o: "#e0a91a", y: "#ffd23f", s: "#fff1a8", w: "#ffffff", d: "#b37d0e", e: "#b37d0e" },
      full: [
        "......kkkk......",
        "....kkooookk....",
        "...kooyyyyook...",
        "..kowwyyyyyyok..",
        ".kowyddddddyyok.",
        ".kowdyyyyyydyok.",
        "koyydyyssyydyyok",
        "koyydyyssyydyyok",
        "koyydyyssyydyyok",
        "koyydyyssyydyyok",
        ".koydyyyyyydeek.",
        ".koyyddddddyeok.",
        "..koyyyyyyeeek..",
        "...kooyyyyeok...",
        "....kkooookk....",
        "......kkkk......"
      ]
    },
    /* FROGE (0x37CE…76D4, World Chain): pixelated from the coin's real DexScreener logo - green frog, big yellow eyes */
    froge: {
      pal: { k: "#26341a", g: "#6f8f55", d: "#4f6c3b", l: "#93ad78", y: "#dde8a6", e: "#14140f", w: "#ffffff" },
      full: [
        "..kkk...........",
        ".kwyyk..kkkk....",
        ".kyeek.kwyyyk...",
        "kgkyykkkyyeeyk..",
        "kggkkgggkyeeykk.",
        "kgggggggkkkkkggk",
        "kkgggggggggggggk",
        "kgdggggggggggggk",
        "kgggggggggggggdk",
        ".kkgggggggggggdk",
        "..kkkkkkkkgggddk",
        "..kgllllllkkggdk",
        "..kgldddlllkggdk",
        "..kgglllddllkgdk",
        "..kggllllllllgdk",
        "..kgggllllllggdk"
      ]
    },
    /* Worldcoin (WLD) logo: full 16 rows (not mirrored) - black coin, white ring, bar across to the right edge */
    wld: {
      pal: { s: "#d9dbe8", k: "#0a0a0f", w: "#ffffff" },
      full: [
        "......ssss......",
        "....sskkkkss....",
        "..sskkkkkkkkss..",
        "..skkwwwwwwkks..",
        ".skkwwwwwwwwkks.",
        ".skwwwkkkkwwwks.",
        "skkwwkkkkkkwwkks",
        "skkwwkwwwwwwwwks",
        "skkwwkwwwwwwwwks",
        "skkwwkkkkkkwwkks",
        ".skwwwkkkkwwwks.",
        ".skkwwwwwwwwkks.",
        "..skkwwwwwwkks..",
        "..sskkkkkkkkss..",
        "....sskkkkss....",
        "......ssss......"
      ]
    },
    /* Blob (GIGAC): amorphous magenta slime mass, lopsided eyes, slack mouth with one tooth, drool ("baba") dripping
       from the left mouth corner. full 16 rows (asymmetric). `drip` = animated overlay frames [x, y, palChar] drawn
       on top of `full`; `seq` = frame order, `ms` = frame time (see animate() below). */
    blob: {
      pal: { k: "#3b0a2c", p: "#e8459e", l: "#ff9fd2", d: "#a8286d", w: "#ffffff", e: "#1a0612", m: "#2a0418", t: "#ff6f8f", s: "#aef4ff", a: "#ffffff" },
      full: [
        "......kkk.......",
        "....kkllpk..kk..",
        "...kllppppkkldk.",
        "..klpppppppppdk.",
        ".klppwwwpppwwpdk",
        ".kpppwwepppwepdk",
        ".kpppwwwpppppppk",
        "kppppppppppppddk",
        "kppmmmmmmwmppddk",
        "kdpmttttttmmpddk",
        "kdpkmmmmmmkpdddk",
        "kddpkkkkkkpppdk.",
        ".kddppppppddddk.",
        "..kkdddddddkdk..",
        "....kkkkkkk.kk..",
        "................"
      ],
      drip: [
        [[4, 10, "s"], [4, 11, "s"]],
        [[4, 10, "s"], [4, 11, "s"], [4, 12, "s"], [4, 13, "a"], [5, 13, "s"]],
        [[4, 10, "s"], [4, 11, "s"], [4, 12, "s"], [4, 13, "s"], [4, 14, "a"], [5, 14, "s"], [3, 15, "s"], [4, 15, "s"], [5, 15, "s"]],
        [[4, 10, "s"], [4, 11, "a"], [4, 15, "s"], [5, 15, "s"]]
      ],
      seq: [0, 0, 1, 2, 3, 0],
      still: 1,
      ms: 260
    },
    lock: {
      pal: { k: "#14141c", s: "#c9cddd", y: "#ffd23f", d: "#b38f12" },
      half: [
        "........",
        "....kkkk",
        "...kssss",
        "...kssk.",
        "...ksk..",
        "...ksk..",
        "...ksk..",
        "..kkkkkk",
        "..kyyyyy",
        "..kyyyyy",
        "..kyyyyk",
        "..kyyyyk",
        "..kyyyyy",
        "..kddddd",
        "..kkkkkk",
        "........"
      ]
    },
    /* Horse: brown, dark mane forelock, tan muzzle */
    horse: {
      pal: { k: "#2a1608", b: "#a5652f", d: "#7a4520", m: "#3b2414", c: "#e2b383", n: "#3b2414", w: "#ffffff", e: "#140a04", p: "#ff9db4" },
      half: [
        "..k.....",
        ".kbk....",
        ".kdbk..m",
        ".kdbkmmm",
        "..kkmmmm",
        "...kbmmm",
        "..kbbbmb",
        ".kwebbbb",
        ".keebbbb",
        "..kbbbbb",
        "...kbbbb",
        "...kbbbb",
        "..kccccc",
        ".kcnnccc",
        "..kccccc",
        "...kkkkk"
      ]
    },
    /* Capybara: round brown head, small ears, calm eyes, big dark nose */
    capybara: {
      pal: { k: "#2a1a0e", b: "#9c6b43", d: "#6f4a2c", l: "#b9875a", n: "#2a1a0e", e: "#1a120a", w: "#ffffff", p: "#e8a08a" },
      half: [
        "........",
        "..kk....",
        ".kdlkkkk",
        ".kbbbbbb",
        "kbbbbbbb",
        "kbbdbbbb",
        "kbbebbbb",
        "kbbbbbbb",
        "kbbbbbbb",
        "kdbbllll",
        "kdbllnnn",
        "kdblllnn",
        "kdblllll",
        ".kdbllkk",
        ".kddllll",
        "..kkkkkk"
      ]
    },
    hedgehog: {
      pal: { k: "#1e1208", d: "#7a4a24", b: "#a8703a", c: "#ffe2b8", w: "#ffffff", p: "#ff9db4" },
      half: [
        "..k..k..",
        ".kdk.kdk",
        "kddkkddd",
        ".kdddddd",
        "kddbddbd",
        ".kddbddd",
        "kdddcccc",
        ".kdccccc",
        "kddcwkcc",
        ".kdckkcc",
        "kddpcccc",
        ".kdccccc",
        "..kdccck",
        "...kccck",
        "....kkkk",
        "........"
      ]
    },
    octopus: {
      pal: { k: "#1a0a24", p: "#a35ad8", l: "#d39bff", w: "#ffffff", c: "#ff8fc0" },
      half: [
        "........",
        ".....kkk",
        "...kkppp",
        "..kppppp",
        ".kpplppp",
        ".kplpppp",
        "kpppkkpp",
        "kpppkwpp",
        "kppppppp",
        "kppcpppk",
        ".kpppppp",
        ".kpppppp",
        "kpkpkpkp",
        "kpkpkpkp",
        "k..k..k.",
        "........"
      ]
    },
    panda: {
      pal: { k: "#14141c", w: "#f6f6fb", g: "#c9cddd", p: "#ff9db4", e: "#ffffff", n: "#2a2a38" },
      half: [
        ".kk.....",
        "kkkk....",
        "kkkkkkkk",
        "kkkwwwww",
        ".kwwwwww",
        "kwwwwwww",
        "kwkkkwww",
        "kwkkekww",
        "kwkkkkww",
        "kwwkkwww",
        "kppwwwwk",
        "kwwwwkww",
        ".kgwwwkk",
        "..kkkkkk",
        ".kkkwwww",
        ".kkkkkkk"
      ]
    },
    /* Shenron: green eastern dragon - antler horns, red/orange eyes, pale whiskers, light jaw */
    shenron: {
      pal: { k: "#0b2410", g: "#3fae4a", d: "#25793a", l: "#cfe88f", r: "#e8402a", o: "#ffb020", h: "#d8bf86", w: "#ffffff", n: "#0b2410", s: "#f2e6a0" },
      half: [
        "h..h....",
        "hh.h....",
        ".hhh....",
        "..hk.kkk",
        "..kgdgdg",
        ".kggggdg",
        "kdkkgggg",
        "kgorkggg",
        "kdrrkggg",
        "kggggggg",
        ".kgkllll",
        "skllnlll",
        "s.klllll",
        "s.kwkkkk",
        "s..kllll",
        ".s..kkkk"
      ]
    },
    dragon: {
      pal: { k: "#2a0a0a", r: "#d8322f", d: "#8f1d1d", y: "#ffd23f", c: "#ffe2a8", w: "#ffffff", b: "#1a0505" },
      half: [
        "y.......",
        "yk......",
        ".yk.....",
        ".kyk.kkk",
        "..krrrrr",
        ".krrrdrr",
        "krrrrrrr",
        "kryybrrr",
        "krywbrrr",
        "krrrrrrr",
        "kdrrrccc",
        ".kdrcccc",
        ".kdrcbcc",
        "..kdcccc",
        "..kdkwkw",
        "...kkkkk"
      ]
    },
    inu: {
      pal: { k: "#2b1608", o: "#f08a24", d: "#c4621a", c: "#fff1d6", p: "#ff8fa3", b: "#1a0d05", w: "#ffffff", r: "#e8435a" },
      half: [
        "........",
        ".kk.....",
        ".kok....",
        ".kpok...",
        ".kppokkk",
        "kooooooo",
        "kooooooo",
        "kowbbooo",
        "kobbbooo",
        "kocccccc",
        "kcccccbb",
        ".kccccbc",
        "..kcccrr",
        "...kkkkk",
        "..kodccc",
        "..kkkkkk"
      ]
    },
    cat: {
      pal: { k: "#16161f", g: "#8f93a8", d: "#62667a", c: "#e9ebf5", p: "#ff9db4", b: "#0d0d14", w: "#ffffff", y: "#9be564" },
      half: [
        ".k......",
        ".kk.....",
        ".kpk....",
        ".kppk...",
        ".kgggkkk",
        "kgdgdggg",
        "kggggggg",
        "kgwyyggg",
        "kgyybggg",
        "kggggggg",
        "kgccccpp",
        "kgcccbcc",
        ".kcccccc",
        "..kkkkkk",
        "..kgdccc",
        "..kkkkkk"
      ]
    },
    frog: {
      pal: { k: "#0e2410", g: "#56c24a", d: "#2f8a35", l: "#b8f08a", w: "#ffffff", b: "#0a0a0a", r: "#e8435a" },
      half: [
        "........",
        "........",
        "..kkk...",
        ".kwwwk..",
        ".kwbbk..",
        ".kwbbkkk",
        "kggkkggg",
        "kggggggg",
        "kgdggggg",
        "kggggggg",
        "kgkggggg",
        ".kgkkkkk",
        "..kgrrrr",
        "..kkkkkk",
        ".kgdllll",
        ".kkkkkkk"
      ]
    },
    goblin: {
      pal: { k: "#1b1206", g: "#8ccf3a", d: "#5a9524", y: "#ffd23f", b: "#160e02", w: "#fffbe6", m: "#6b2f1a" },
      half: [
        "........",
        "....kkkk",
        "...kmmmm",
        "k.kmmmmm",
        "kkkggggg",
        "kggkgggg",
        ".kgggggg",
        "..kyybgg",
        "..kyybgg",
        "..kggggd",
        "..kgkkkk",
        "..kgkwkw",
        "...kgkkk",
        "...kkggg",
        "..kmmmmm",
        "..kkkkkk"
      ]
    },
    robot: {
      pal: { k: "#0b1220", s: "#9fb4d0", d: "#6a7f9e", c: "#3ef0ff", r: "#ff4d6d", w: "#ffffff" },
      half: [
        ".......k",
        ".......r",
        ".......k",
        "..kkkkkk",
        "..kssssss".slice(0, 8),
        "..ksdddd",
        "..ksdccd",
        "..ksdccd",
        "..ksdddd",
        "..ksssss",
        "..ksskkk",
        "..kkkkkk",
        "...kssss",
        ".kkkdsds",
        ".ksksdsd",
        ".kkkkkkk"
      ]
    },
    ghost: {
      pal: { k: "#1c1430", g: "#e6e1ff", d: "#b7aef0", b: "#1c1430", p: "#ff9db4" },
      half: [
        "........",
        "...kkkkk",
        "..kggggg",
        ".kgggggg",
        ".kgggggg",
        "kggbbggg",
        "kggbbggg",
        "kgpggggg",
        "kggggggg",
        "kgggggbb",
        "kggggggg",
        "kdgggggg",
        "kdgggggg",
        "kdddgggd",
        "kkdkkddk",
        ".k..kk.."
      ]
    }
  };

  function rows(name) {
    var s = S[name] || S.inu;
    if (s.full) return s.full;
    return s.half.map(function (h) { h = (h + "........").slice(0, 8); return h + h.split("").reverse().join(""); });
  }

  /* Draw sprite into a canvas element (16x16 logical px, CSS scales it with image-rendering: pixelated).
     Sprites with `drip` overlay frames are registered for animation (one shared timer for all canvases). */
  function paint(canvas, name, frame) {
    var s = S[name] || S.inu, r = rows(name);
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 16, 16);
    for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) {
      var ch = r[y][x];
      if (ch === "." || !s.pal[ch]) continue;
      ctx.fillStyle = s.pal[ch];
      ctx.fillRect(x, y, 1, 1);
    }
    var ov = s.drip && s.drip[frame];
    if (ov) for (var i = 0; i < ov.length; i++) { ctx.fillStyle = s.pal[ov[i][2]]; ctx.fillRect(ov[i][0], ov[i][1], 1, 1); }
  }

  var anim = [], timer = null, tick = 0;
  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  function animate() {
    tick++;
    anim = anim.filter(function (a) { return a.c.isConnected && a.c.__px === a.n; });   // drop removed/re-drawn canvases
    anim.forEach(function (a) { var s = S[a.n]; paint(a.c, a.n, s.seq[tick % s.seq.length]); });
    if (!anim.length) { clearInterval(timer); timer = null; }
  }

  function draw(canvas, name) {
    var s = S[name] || S.inu;
    canvas.width = 16; canvas.height = 16;
    canvas.__px = name;
    if (!s.drip) { paint(canvas, name, -1); return canvas; }
    if (reduced) { paint(canvas, name, s.still || 0); return canvas; }
    paint(canvas, name, s.seq[tick % s.seq.length]);
    if (!anim.some(function (a) { return a.c === canvas; })) anim.push({ c: canvas, n: name });
    if (!timer) timer = setInterval(animate, s.ms || 250);
    return canvas;
  }

  window.PixelSprites = { draw: draw, names: Object.keys(S) };
})();
