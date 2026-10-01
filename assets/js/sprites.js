/* Pixel sprites: 16x16, defined as LEFT HALVES (8 cols) and mirrored -> symmetric.
   '.' = transparent; other chars map to the sprite's palette. */
(function () {
  var S = {
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
    return s.half.map(function (h) { h = (h + "........").slice(0, 8); return h + h.split("").reverse().join(""); });
  }

  /* Draw sprite into a canvas element (16x16 logical px, CSS scales it with image-rendering: pixelated) */
  function draw(canvas, name) {
    var s = S[name] || S.inu, r = rows(name);
    canvas.width = 16; canvas.height = 16;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 16, 16);
    for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) {
      var ch = r[y][x];
      if (ch === "." || !s.pal[ch]) continue;
      ctx.fillStyle = s.pal[ch];
      ctx.fillRect(x, y, 1, 1);
    }
    return canvas;
  }

  window.PixelSprites = { draw: draw, names: Object.keys(S) };
})();
