// Busy ant: a 300x60 pixel-art ant that does a different activity on each page load.
// Usage: <canvas id="ant" width="300" height="60"></canvas> then <script src="ant.js"></script>

(() => {
  // =========================================================
  //  STYLE RULES (shared by every scene)
  //  - 300x60 box, one art pixel = 2x2 screen pixels (150x30 grid)
  //  - two colors only: the portfolio ink and paper palette tokens
  //  - lines are 1 art pixel wide; objects are either solid ink
  //    or 1px ink outlines; details are cut out with PAPER pixels
  //  - speech marks (! ? z notes) come from one 5x5 pixel font (GLYPH)
  //  - ground line on row G; every ant uses the same rig + poses
  // =========================================================
  const palette = getComputedStyle(document.documentElement);
  const S = 2, G = 30, INK = palette.getPropertyValue('--ink').trim(), PAPER = palette.getPropertyValue('--paper').trim();

  const cv = document.getElementById('ant');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  cv.width = 300 * dpr; cv.height = 60 * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  let T = 0;
  const parts = [], floats = [];
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------- primitives ----------
  const px = (x, y, w = 1, h = 1, c = INK) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x) * S, Math.round(y) * S, w * S, h * S); };
  const wp = (x, y, c = INK) => px(x, y, 1, 1, c);
  function bres(x0, y0, x1, y1, plot) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, err = dx + dy;
    for (;;) { plot(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }
  const wline = (x0, y0, x1, y1) => bres(x0, y0, x1, y1, (x, y) => wp(x, y));
  function sprite(rows, x, y, plot) {      // '#' ink, 'o' paper, '.' transparent
    rows.forEach((r, j) => [...r].forEach((ch, i) => {
      if (ch === '#') plot(x + i, y + j, INK); else if (ch === 'o') plot(x + i, y + j, PAPER);
    }));
  }
  function fillEll(cx, cy, rx, ry, plot = wp, c = INK) {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++)
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) plot(cx + x, cy + y, c);
  }
  // 5x5 pixel font: every character in every scene comes from here, so text is the same size and pure ink
  const GLYPH = {
    '!': ['..#..', '..#..', '..#..', '.....', '..#..'],
    '?': ['.###.', '....#', '..##.', '.....', '..#..'],
    'z': ['.....', '####.', '..#..', '.#...', '####.'],
    'Z': ['#####', '...#.', '..#..', '.#...', '#####'],
    'h': ['#....', '#....', '###..', '#..#.', '#..#.'],
    'a': ['.....', '.###.', '#..#.', '#..#.', '.####'],
    'p': ['.....', '###..', '#..#.', '###..', '#....'],
    'e': ['.....', '.##..', '####.', '#....', '.###.'],
    'w': ['.....', '#...#', '#...#', '#.#.#', '.#.#.'],
    '♪': ['..##.', '..#.#', '..#..', '###..', '##...'],
    '♫': ['.####', '.#..#', '.#..#', '##.##', '##.##'],
  };
  function text(str, cx, cy, gap = 1) {   // centered on (cx, cy) in art pixels
    const chars = [...str], w = chars.length * (5 + gap) - gap;
    const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - 2);
    chars.forEach((ch, i) => { const g = GLYPH[ch]; if (g) sprite(g, x0 + i * (5 + gap), y0, wp); });
  }

  // ---------- sprites ----------
  const CAN = ['..##.....', '.#..#...#', '######.#.', '#######..', '######...', '######...'];
  const CAN_POUR = ['..##.....', '.#..#....', '######...', '######...', '#######..', '######.#.', '........#'];
  const BOOK = ['#.....#', '##...##', '.##.##.', '..###..'];
  const BOOK_FLIP = ['#..#..#', '##.#.##', '.##.##.', '..###..'];
  const UMBRELLA = ['...#######...', '.###########.', '#############', '#.#.#.#.#.#.#'];
  const CONE = ['..#..', '.###.', '.ooo.', '#####', '#####', '#####'];
  const cupRows = level => {
    const r = [];
    for (let i = 0; i < 3; i++) r.push('#' + (i >= 3 - level ? '##' : 'oo') + '#' + (i ? '#' : '.'));
    r.push('####.');
    return r;
  };
  // flower stages (pixel sprites, sitting on a dirt mound): seed -> sprout -> bud -> open tulip
  const FLOWER = [
    [],
    ['#...#', '.#.#.', '..#..', '..#..'],
    ['..#..', '.###.', '.###.', '..#..', '..#.#', '#.##.', '.##..', '..#..'],
    ['#.#.#', '#####', '#####', '.###.', '..#..', '..#.#', '#.##.', '.##..', '..#..'],
  ];
  const MOUND = '.###.';

  // ---------- effects ----------
  function puff(x, y, n = 6, spd = 18) { for (let i = 0; i < n; i++) parts.push({ x, y, vx: rnd(-spd, spd), vy: -rnd(0, spd), g: 80, life: .5, stop: G }); }
  function sparkle(x, y) { for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2; parts.push({ x, y, vx: Math.cos(t) * 18, vy: Math.sin(t) * 18, g: 0, life: .35, stop: 99 }); } }
  const say = (a, ch, life = .9) => floats.push({ x: a.x + 9 * a.dir, y: G - 24 - a.hop, ch, life, vx: 0, vy: -2 });
  const note = a => floats.push({ x: a.x + rnd(6, 14) * a.dir, y: G - 20, ch: Math.random() < .5 ? '♪' : '♫', life: 1.3, vx: 3 * a.dir, vy: -6 });
  const zz = a => floats.push({ x: a.x + 6 * a.dir, y: G - 20, ch: Math.random() < .5 ? 'z' : 'Z', life: 1.6, vx: 4 * a.dir, vy: -5 });
  const steam = (plot, x, y) => { for (let i = 0; i < 3; i++) if ((Math.floor(T * 6) + i) % 3) plot(x + Math.round(Math.sin(T * 5 + i * 1.4)), y - i * 2); };

  // ---------- the ant rig ----------
  const POSES = {
    pour: () => [[5, -22], [3, -20]],
    press: () => [[6, -14], [1, -8]],
    reach: () => [[6, -4], [1, -8]],
    sip: () => [[4, -17], [1, -8]],
    toss: () => [[6, -18], [1, -8]],
    stretch: () => [[4, -24], [-1, -24]],
    nap: () => [[8, -11], [7, -11]],
    think: () => [[5, -15], [1, -8]],
    wipe: () => [[4, -19], [1, -8]],
    type: () => [[8, -11 + (Math.sin(T * 28) > 0 ? -1 : 0)], [7, -11 + (Math.sin(T * 28 + 2) > 0 ? -1 : 0)]],
    dance: () => Math.sin(T * 9) > 0 ? [[4, -22], [0, -7]] : [[4, -7], [-1, -22]],
    read: () => [[6, -15], [5, -15]],
    umbrella: () => [[3, -21], [1, -8]],
    balance: () => { const w = Math.round(Math.sin(T * 5)); return [[5, -14 + w], [-4, -14 - w]]; },
    strum: a => { const s = Math.sin(T * (a.data.fast ? 26 : 16)) > 0 ? 1 : 0; return [[3, -9 + s], [10, -13]]; },
    rest: () => [[3, -9], [10, -13]],
    waveSit: () => [[5 + (Math.sin(T * 12) > 0 ? 1 : 0), -22], [10, -13]],
    liftLow: () => [[4, -3], [4, -3]],
    liftChest: a => { const w = a.wobble ? Math.round(Math.sin(T * 18)) : 0; return [[4, -12 + w], [4, -12 + w]]; },
    liftUp: a => { const w = a.wobble ? Math.round(Math.sin(T * 18)) : 0; return [[4, -24 + w], [4, -24 + w]]; },
    paint: a => a.data.paintHand || [[6, -14], [1, -8]],
    shape: a => a.data.shapeHands || [[9, -12], [9, -15]],
    shelf: () => [[6, -15], [4, -15]],
  };

  const barShape = (plot, x, y) => {
    for (let i = -8; i <= 8; i++) plot(x + i, y, INK);
    for (const s of [-8, 7]) for (let j = -2; j <= 2; j++) { plot(x + s, y + j, INK); plot(x + s + 1, y + j, INK); }
  };

  // pottery: a pot is a list of half-widths, bottom row first
  const LUMP = [3, 4, 4, 3, 2];
  const POTS = [[2, 3, 4, 4, 3, 2, 1, 1, 2], [3, 4, 5, 5], [3, 3, 3, 3, 3, 3], [3, 4, 4, 3, 2, 2, 2], [2, 2, 3, 3, 3, 3, 2, 2, 3]];
  const samp = (arr, t) => { const f = t * (arr.length - 1), i = Math.floor(f), j = Math.min(i + 1, arr.length - 1); return arr[i] + (arr[j] - arr[i]) * (f - i); };
  function potRows(target, k) {
    const n = Math.round(LUMP.length + (target.length - LUMP.length) * k), r = [];
    for (let i = 0; i < n; i++) { const t = n > 1 ? i / (n - 1) : 0; r.push(Math.round(samp(LUMP, t) * (1 - k) + samp(target, t) * k)); }
    return r;
  }
  function drawPot(plot, cx, by, rows, spin, band) {
    const ph = Math.floor(T * 10), bandRow = Math.floor(rows.length / 2);
    rows.forEach((hw, i) => { for (let x = -hw; x <= hw; x++) {
      let c = INK;
      if (spin && x > -hw && x < hw && (x + ph) % 4 === 0) c = PAPER;
      if (band && i === bandRow && x > -hw && x < hw) c = PAPER;
      plot(cx + x, by - i, c);
    } });
  }

  const HOLD = {
    can: (L, fh, bh, B, a) => L.spr(a.pose === 'pour' ? CAN_POUR : CAN, fh[0] - 2, fh[1] + B),
    cup: (L, fh, bh, B) => { L.spr(cupRows(2), fh[0], fh[1] - 1 + B); steam(L.ap, fh[0] + 1, fh[1] - 3 + B); },
    book: (L, fh, bh, B, a) => L.spr(a.data.flip ? BOOK_FLIP : BOOK, fh[0] - 1, fh[1] - 3 + B),
    umbrella: (L, fh, bh, B) => { L.line(fh[0], fh[1] + B, fh[0], -26 + B); L.spr(UMBRELLA, fh[0] - 6, -29 + B); },
    bar: (L, fh, bh, B) => barShape(L.ap, fh[0], fh[1] + B),
    brush: (L, fh, bh, B) => { L.line(fh[0], fh[1] + B, fh[0] + 3, fh[1] - 2 + B); L.ap(fh[0] + 4, fh[1] - 3 + B); },
    pot: (L, fh, bh, B, a) => drawPot(L.ap, fh[0] + 3, fh[1] + 2 + B, a.data.pot, false, true),
    guitar: L => { L.ell(3, -9, 3, 2); L.ell(3, -9, 2, 1, PAPER); L.ap(3, -9); L.line(6, -10, 12, -14); L.ap(12, -15); L.ap(13, -15); },
  };

  function makeAnt(o) {
    return Object.assign({ x: 0, dir: 1, pose: 'idle', hold: null, under: null, walk: false, walkT: 0, hop: 0, eyes: 1, droop: 0,
      blink: rnd(2, 4), sit: false, stance: false, tap: false, wobble: 0, data: {}, seq: [], step: 0, st: 0, fx: 0, dur: 0,
      begun: false, loopFrom: 0 }, o);
  }

  function hands(a) {
    const p = POSES[a.pose]; if (p) return p(a);
    const s = a.walk ? Math.round(Math.sin(a.walkT * 12) * 2) : 0;
    if (a.hold) return [[5, -11], [1 - s, -7]];
    if (a.walk) return [[1 + s, -7], [1 - s, -7]];
    return [[2, -7], [0, -7]];
  }
  const handWorld = (a, i = 0) => { const h = hands(a)[i]; return { x: a.x + h[0] * a.dir, y: G - a.hop + h[1] }; };

  function drawAnt(a) {
    const d = a.dir, ox = Math.round(a.x), oy = G - Math.round(a.hop);
    const ap = (lx, ly, c = INK) => px(ox + lx * d, oy + ly, 1, 1, c);
    const line = (x0, y0, x1, y1) => bres(x0, y0, x1, y1, (x, y) => ap(x, y));
    const ell = (cx, cy, rx, ry, c = INK) => fillEll(cx, cy, rx, ry, ap, c);
    const spr = (rows, x, y) => sprite(rows, x, y, ap);
    const L = { ap, line, ell, spr };
    let B = 0;

    // legs
    if (a.sit) {
      const tp = a.tap && Math.sin(T * 8) > 0 ? -1 : 0;
      line(0, -8, 2, -8); line(2, -8, 2, -1); ap(3, -1);
      line(1, -8, 4, -8); line(4, -8, 4, -1 + tp); ap(5, -1 + tp);
    } else {
      let f1 = -1, f2 = 1;
      if (a.stance) { f1 = -3; f2 = 3; }
      else if (a.walk) { const p = a.walkT * 12; f1 = Math.round(Math.sin(p) * 2); f2 = -f1; B = Math.cos(p * 2) > 0 ? -1 : 0; }
      line(0, -8 + B, f1, -1); ap(f1 + 1, -1);
      line(1, -8 + B, 1 + f2, -1); ap(f2 + 2, -1);
    }
    // body
    ell(-4, -11 + B, 4, 3);
    ap(-1, -10 + B); ap(-1, -11 + B);
    for (let y = -13; y <= -9; y++) { ap(0, y + B); ap(1, y + B); }
    const H = B + a.droop;
    ap(1, -14 + H); ap(2, -14 + H);
    ell(2, -17 + H, 3, 3);
    if (a.eyes && a.blink > .12) ap(4, -18 + H, PAPER);
    ap(5, -15 + H);
    const wig = Math.round(Math.sin(T * 4 + a.x * .1));
    line(1, -20 + H, 0, -23 + H); line(0, -23 + H, 1, -25 + H + wig);
    line(3, -20 + H, 5, -23 + H); line(5, -23 + H, 7, -24 + H - wig);
    // arms + props
    if (a.under) a.under(L, null, null, B, a);
    const [fh, bh] = hands(a);
    line(0, -12 + B, bh[0], bh[1] + B);
    line(1, -12 + B, fh[0], fh[1] + B);
    if (a.hold) a.hold(L, fh, bh, B, a);
  }

  // ---------- script runner ----------
  const W = (x, o = {}) => ({ walk: x, ...o });
  const D = (dur, o = {}) => ({ dur, ...o });
  function runAnt(a, dt) {
    const s = a.seq[a.step]; if (!s) return;
    if (!a.begun) { a.begun = true; a.st = 0; a.fx = 0; a.dur = typeof s.dur === 'function' ? s.dur(a) : s.dur; s.start && s.start(a); }
    a.st += dt;
    let done = false;
    if (s.walk !== undefined) {
      const sp = s.speed || 22, dx = s.walk - a.x;
      if (Math.abs(dx) < .3) { a.x = s.walk; done = true; }
      else {
        a.dir = s.face || Math.sign(dx); a.walk = !s.glide; a.walkT += dt * sp / 22;
        a.x += Math.sign(dx) * Math.min(Math.abs(dx), sp * dt);
        s.tick && s.tick(0, dt, a);
      }
    } else {
      s.tick && s.tick(a.dur ? Math.min(a.st / a.dur, 1) : 1, dt, a);
      if (a.st >= a.dur) done = true;
    }
    if (done) { a.walk = false; s.end && s.end(a); a.step++; if (a.step >= a.seq.length) a.step = a.loopFrom; a.begun = false; }
  }

  // ---------- shared props ----------
  function drawFlower(f) { sprite([MOUND], f.x - 2, G - 1, wp); const r = FLOWER[f.s]; sprite(r, f.x - 2, G - 1 - r.length, wp); }
  function drawStool(x) { px(x - 7, G - 7, 9, 1); px(x - 6, G - 6, 1, 6); px(x, G - 6, 1, 6); }
  function drawPlant(x) {
    sprite(['#####', '.###.', '.###.'], x - 2, G - 3, wp);
    sprite(FLOWER[3], x - 2, G - 3 - FLOWER[3].length, wp);
  }
  function drawCloud(x) { fillEll(x, 4, 5, 3); fillEll(x + 7, 3, 6, 3); fillEll(x + 14, 4, 5, 3); px(x - 4, 6, 23, 1); }

  // =========================================================
  //  SCENES  — each returns { ants, update?, back?, front?, ground? }
  //  scene width is 150 art pixels
  // =========================================================
  const SCENES = {

    garden() {
      const fl = [26, 40, 54].map(x => ({ x, s: 0 }));
      const can = { x: 68, held: false };
      let wilting = false, wt = 0;
      const a = makeAnt({ x: 100, dir: -1 });
      const pour = i => D(2.4, {
        start(a) { a.dir = 1; a.pose = 'pour'; },
        tick(k, dt, a) {
          a.fx += dt;
          if (a.fx > .07) { a.fx = 0; parts.push({ x: a.x + 11 + rnd(-.5, .5), y: G - 16, vx: 0, vy: 8, g: 60, life: 2, stop: G - 1 }); }
          const ns = Math.min(3, Math.floor(k * 3.6));
          if (ns > fl[i].s) { fl[i].s = ns; if (ns === 3) sparkle(fl[i].x, G - 9); }
        },
        end(a) { a.pose = 'idle'; }
      });
      a.seq = [
        W(78),
        D(.5, { start(a) { a.dir = -1; a.pose = 'reach'; }, end(a) { can.held = true; a.hold = HOLD.can; a.pose = 'idle'; } }),
        ...fl.flatMap((f, i) => [W(f.x - 11), pour(i)]),
        W(64),
        D(.5, { start(a) { a.dir = 1; a.pose = 'reach'; }, end(a) { a.hold = null; can.held = false; can.x = a.x + 4; a.pose = 'idle'; } }),
        W(88),
        D(2.6, { start(a) { a.dir = -1; a.pose = 'dance'; },
          tick(k, dt, a) { a.hop = Math.abs(Math.sin(k * Math.PI * 5)) * 3; a.fx += dt; if (a.fx > .45) { a.fx = 0; note(a); } },
          end(a) { a.hop = 0; a.pose = 'idle'; } }),
        D(1.2, { start() { wilting = true; } }),
        D(1.6),
      ];
      return {
        ants: [a],
        update(dt) { if (wilting) { wt += dt; if (wt > .6) { wt = 0; fl.forEach(f => f.s = Math.max(0, f.s - 1)); if (fl.every(f => !f.s)) wilting = false; } } },
        back() { fl.forEach(drawFlower); if (!can.held) sprite(CAN, can.x, G - 6, wp); }
      };
    },

    coffee() {
      const m = { x: 70, cup: null, brew: false }, binX = 86;
      let toss = null;
      const a = makeAnt({ x: 10, dir: 1 });
      a.seq = [
        W(38),
        D(1.3, { start(a) { a.pose = 'stretch'; }, end(a) { a.pose = 'idle'; } }),
        W(m.x - 6),
        D(.6, { start(a) { a.dir = 1; a.pose = 'press'; }, end(a) { a.pose = 'idle'; m.cup = { fill: 0 }; } }),
        D(2.4, { start() { m.brew = true; },
          tick(k, dt, a) { m.cup.fill = k; a.fx += dt; if (a.fx > .12) { a.fx = 0; parts.push({ x: m.x + 3.5 + Math.random(), y: G - 8, vx: 0, vy: 10, g: 60, life: 2, stop: G - 4 }); } },
          end() { m.brew = false; } }),
        D(.5, { start(a) { a.pose = 'reach'; }, end(a) { m.cup = null; a.hold = HOLD.cup; a.pose = 'idle'; } }),
        D(1.2, { start(a) { a.pose = 'sip'; }, end(a) { a.pose = 'idle'; } }),
        D(.7),
        D(1.2, { start(a) { a.pose = 'sip'; }, end(a) { a.pose = 'idle'; } }),
        D(.8, { start(a) { say(a, '!'); }, tick(k, dt, a) { a.hop = Math.abs(Math.sin(k * Math.PI * 2)) * 3; }, end(a) { a.hop = 0; } }),
        D(.8, { start(a) { a.pose = 'toss'; a.hold = null; toss = { x0: a.x + 6, y0: G - 19, x1: binX + 1, y1: G - 7, k: 0 }; },
          tick(k) { toss.k = k; }, end(a) { toss = null; a.pose = 'idle'; } }),
        D(1),
      ];
      return {
        ants: [a],
        back() {
          const x = m.x;
          px(x, G - 16, 12, 6);
          wp(x + 2, G - 14, PAPER); wp(x + 4, G - 14, PAPER);
          px(x + 7, G - 15, 3, 1, m.brew && Math.floor(T * 4) % 2 ? INK : PAPER);
          px(x + 8, G - 10, 4, 10); px(x + 3, G - 10, 2, 2); px(x, G - 1, 8, 1);
          if (m.cup) { sprite(cupRows(Math.round(m.cup.fill * 2)), x + 2, G - 5, wp); if (m.cup.fill > .5) steam(wp, x + 3, G - 7); }
          const b = binX;
          px(b, G - 6, 6, 1); px(b, G - 5, 1, 5); px(b + 5, G - 5, 1, 5); px(b, G - 1, 6, 1); px(b + 2, G - 4, 1, 2); px(b + 3, G - 4, 1, 2);
          drawPlant(112);
        },
        front() {
          if (!toss) return;
          const k = toss.k, x = toss.x0 + (toss.x1 - toss.x0) * k, y = toss.y0 + (toss.y1 - toss.y0) * k - Math.sin(k * Math.PI) * 9;
          sprite(cupRows(0), Math.round(x), Math.round(y), wp);
        }
      };
    },

    laptop() {
      const dx = 52, scr = { lines: [], acc: 0 };
      const newLine = () => { const indent = Math.floor(Math.random() * 4); return { indent, len: 2 + Math.floor(Math.random() * (9 - indent)), typed: 0 }; };
      const a = makeAnt({ x: 12, dir: 1 });
      const typing = dur => D(dur, {
        start(a) { a.dir = 1; a.pose = 'type'; if (!scr.lines.length) scr.lines = [newLine()]; },
        tick(k, dt) {
          scr.acc += dt * 14;
          while (scr.acc >= 1) { scr.acc--; const l = scr.lines[scr.lines.length - 1];
            if (l.typed < l.len) l.typed++; else { scr.lines.push(newLine()); if (scr.lines.length > 6) scr.lines.shift(); } }
        }
      });
      a.seq = [
        W(dx - 1),
        typing(5),
        D(1.4, { start(a) { a.pose = 'think'; say(a, '?', 1.2); } }),
        D(.4, { start(a) { say(a, '!'); } }),
        typing(4),
        D(1.3, { start(a) { a.pose = 'stretch'; } }),
        D(3.4, { start(a) { a.pose = 'nap'; a.eyes = 0; a.droop = 1; },
          tick(k, dt, a) { a.fx += dt; if (a.fx > .8) { a.fx = 0; zz(a); } }, end(a) { a.eyes = 1; a.droop = 0; } }),
        D(.7, { start(a) { a.pose = 'idle'; say(a, '!'); scr.lines = []; } }),
      ];
      a.loopFrom = 1;
      return {
        ants: [a],
        back() {
          px(dx, G - 9, 38, 1); px(dx + 2, G - 8, 1, 8); px(dx + 35, G - 8, 1, 8);
          px(dx + 6, G - 10, 11, 1);
          const sx = dx + 16, sy = G - 20;
          px(sx, sy, 14, 1); px(sx, sy + 9, 14, 1); px(sx, sy, 1, 10); px(sx + 13, sy, 1, 10);
          const show = scr.lines.slice(-3);
          show.forEach((l, i) => {
            px(sx + 2 + l.indent, sy + 2 + i * 2, l.typed, 1);
            if (i === show.length - 1 && a.pose === 'type' && Math.floor(T * 3) % 2) wp(sx + 2 + l.indent + l.typed, sy + 2 + i * 2);
          });
          sprite(cupRows(2), dx + 31, G - 13, wp); steam(wp, dx + 32, G - 15);
        }
      };
    },

    reading() {
      const sx = 68;
      const a = makeAnt({ x: 20, dir: 1 });
      const flip = D(.5, { start(a) { a.data.flip = 1; }, end(a) { a.data.flip = 0; } });
      a.seq = [
        W(sx),
        D(.3, { start(a) { a.sit = true; a.hold = HOLD.book; a.pose = 'read'; } }),
        D(3), flip, D(2.5),
        D(1.2, { start(a) { say(a, 'ha', 1.2); }, tick(k, dt, a) { a.hop = Math.floor(k * 10) % 2; }, end(a) { a.hop = 0; } }),
        flip, D(3),
        D(2.6, { start(a) { a.eyes = 0; a.droop = 1; }, tick(k, dt, a) { a.fx += dt; if (a.fx > .8) { a.fx = 0; zz(a); } }, end(a) { a.eyes = 1; a.droop = 0; } }),
        D(.6, { start(a) { say(a, '!'); } }),
        flip,
      ];
      a.loopFrom = 2;
      return {
        ants: [a],
        back() {
          drawStool(sx);
          const x = 92;   // floor lamp
          px(x - 3, G - 1, 7, 1); px(x, G - 24, 1, 23);
          px(x - 2, G - 27, 5, 1); px(x - 3, G - 26, 7, 1); px(x - 4, G - 25, 9, 1);
          for (let i = 1; i <= 4; i++) { wp(x - 4 - i, G - 24 + i * 2); wp(x + 4 + i, G - 24 + i * 2); }
          const b = 44;   // book stack
          px(b, G - 2, 10, 2); px(b + 8, G - 2, 1, 2, PAPER);
          px(b + 1, G - 4, 8, 2); px(b + 2, G - 4, 1, 2, PAPER);
          px(b, G - 6, 9, 2); px(b + 7, G - 6, 1, 2, PAPER);
        }
      };
    },

    rain() {
      const pud = 80;
      let rt = 0;
      const cloudX = () => Math.round(64 + Math.sin(T * .25) * 10);
      const a = makeAnt({ x: -15, dir: 1, pose: 'umbrella', hold: HOLD.umbrella });
      a.seq = [
        D(0, { start(a) { a.x = -15; a.dir = 1; } }),
        W(pud - 12, { speed: 18 }),
        D(.6),
        D(.8, { tick(k, dt, a) { a.x = pud - 12 + 12 * k; a.hop = Math.sin(k * Math.PI) * 6; },
          end(a) { a.hop = 0; for (let i = 0; i < 12; i++) parts.push({ x: pud + rnd(-4, 4), y: G - 1, vx: rnd(-25, 25), vy: -rnd(25, 50), g: 150, life: 1, stop: G }); } }),
        D(.7, { start(a) { say(a, '!'); } }),
        W(170, { speed: 18 }),
        D(1),
      ];
      return {
        ants: [a],
        update(dt) {
          rt += dt;
          const cx = cloudX();
          while (rt > .03) { rt -= .03; parts.push({ x: rnd(cx - 4, cx + 18), y: 8, vx: 0, vy: 70, g: 0, life: 2, h: 2, stop: G - 1, splash: 1 }); }
          const h = handWorld(a), top = G - 29 - a.hop;
          for (const p of parts) if (p.h === 2 && p.x >= h.x - 7 && p.x <= h.x + 7 && p.y >= top - 1 && p.y <= top + 3) {
            p.life = 0;
            if (Math.random() < .15) parts.push({ x: h.x + (Math.random() < .5 ? -7 : 7), y: top + 4, vx: 0, vy: 10, g: 60, life: 2, stop: G - 1 });
          }
        },
        back() {
          drawCloud(cloudX());
          for (let x = pud - 7; x <= pud + 8; x++) if ((x + Math.floor(T * 6)) % 3 === 0) wp(x, G - 1);
        }
      };
    },

    skate() {
      const cone = 75;
      const a = makeAnt({ x: -20, dir: 1, pose: 'balance', hop: 3, stance: true });
      const roll = x => W(x, { speed: 45, glide: true,
        tick(k, dt, a) { a.fx += dt; if (a.fx > .08) { a.fx = 0; parts.push({ x: a.x - 9 * a.dir, y: G - 6 - Math.floor(rnd(0, 14)), vx: 0, vy: 0, g: 0, life: .2, w: 3, stop: 99 }); } } });
      const ollie = dir => D(.65, { tick(k, dt, a) { a.x += 45 * dt * dir; a.hop = 3 + Math.sin(k * Math.PI) * 8; }, end(a) { a.hop = 3; puff(a.x, G - 1, 4, 10); } });
      a.seq = [
        D(0, { start(a) { a.x = -20; a.dir = 1; } }), roll(cone - 14), ollie(1), roll(175), D(.8),
        D(0, { start(a) { a.x = 170; a.dir = -1; } }), roll(cone + 14), ollie(-1), roll(-25), D(.8),
      ];
      return {
        ants: [a],
        back() { sprite(CONE, cone - 2, G - 6, wp); },
        front() {
          const x = Math.round(a.x), yd = G - Math.round(a.hop);
          px(x - 5, yd, 11, 1); wp(x - 6, yd - 1); wp(x + 5, yd - 1);
          px(x - 4, yd + 1, 2, 2); px(x + 2, yd + 1, 2, 2);
        }
      };
    },

    guitar() {
      const sx = 64;
      const a = makeAnt({ x: sx, dir: 1, sit: true, pose: 'strum', under: HOLD.guitar, tap: true });
      a.seq = [
        D(4, { start(a) { a.pose = 'strum'; a.tap = true; a.data.fast = 0; }, tick(k, dt, a) { a.fx += dt; if (a.fx > .6) { a.fx = 0; note(a); } } }),
        D(1, { start(a) { a.pose = 'rest'; a.tap = false; } }),
        D(3, { start(a) { a.pose = 'strum'; a.tap = true; a.data.fast = 1; }, tick(k, dt, a) { a.fx += dt; if (a.fx > .35) { a.fx = 0; note(a); } } }),
        D(1.4, { start(a) { a.pose = 'waveSit'; a.tap = false; say(a, '!'); } }),
      ];
      return {
        ants: [a],
        back() {
          drawStool(sx);
          const x = 84;   // open guitar case
          px(x, G - 3, 14, 1); px(x, G - 2, 1, 2); px(x + 13, G - 2, 1, 2); px(x, G - 1, 14, 1);
          wline(x, G - 4, x + 2, G - 9); wline(x + 2, G - 9, x + 15, G - 9); wline(x + 15, G - 9, x + 13, G - 4);
          wp(x + 4, G - 2); wp(x + 8, G - 2); wp(x + 10, G - 2);
        }
      };
    },

    gym() {
      const a = makeAnt({ x: 70, dir: 1 });
      const bar = { held: false, x: 74, y: G - 3, vy: 0, falling: false };
      a.seq = [
        D(1, { start(a) { a.pose = 'idle'; } }),
        D(.5, { start(a) { a.pose = 'liftLow'; }, end(a) { bar.held = true; a.hold = HOLD.bar; a.eyes = 0; } }),
        D(.4, { start(a) { a.pose = 'liftChest'; } }),
        D(.7, { start(a) { a.wobble = 1; }, end(a) { a.wobble = 0; } }),
        D(.4, { start(a) { a.pose = 'liftUp'; } }),
        D(1.8, { start(a) { a.wobble = 1; a.eyes = 1; },
          tick(k, dt, a) { a.fx += dt; if (a.fx > .3) { a.fx = 0; parts.push({ x: a.x + 2 * a.dir, y: G - 19, vx: rnd(-15, 15), vy: -15, g: 80, life: 1, stop: G }); } },
          end(a) { a.wobble = 0; } }),
        D(.6, { start(a) { const h = handWorld(a); bar.held = false; a.hold = null; bar.x = h.x; bar.y = h.y; bar.vy = 0; bar.falling = true; a.pose = 'stretch'; } }),
        D(1.6, { start(a) { a.pose = 'wipe'; say(a, 'phew', 1.2); }, end(a) { a.pose = 'idle'; } }),
      ];
      return {
        ants: [a],
        update(dt) {
          if (!bar.falling) return;
          bar.vy += 150 * dt; bar.y += bar.vy * dt;
          if (bar.y >= G - 3) { bar.y = G - 3; bar.falling = false; puff(bar.x - 8, G - 1, 4, 12); puff(bar.x + 8, G - 1, 4, 12); }
        },
        back() {
          const x = 100;   // water bottle
          px(x, G - 8, 2, 1); px(x - 1, G - 7, 4, 1); px(x - 1, G - 6, 1, 5); px(x + 2, G - 6, 1, 5); px(x - 1, G - 1, 4, 1); px(x, G - 3, 2, 2);
        },
        front() { if (!bar.held) barShape(wp, Math.round(bar.x), Math.round(bar.y)); }
      };
    },

    painting() {
      const ex = 78, ey = G - 21;
      const PICS = [
        ['........##..', '.......####.', '........##..', '............', '....#.......', '...###...#..', '..#####.###.', '.##########.', '############'],
        ['.....##.....', '....####....', '...######...', '..########..', '...#....#...', '...#.##.#...', '...#.##.#...', '...######...', '############'],
        ['....#.#.#...', '....#####...', '....#####...', '.....###....', '......#.....', '......#.#...', '....#.##....', '.....##.....', '......#.....'],
      ];
      let order = [], shown = 0;
      const build = pic => { const o = []; pic.forEach((row, r) => { const cols = [...Array(row.length).keys()]; if (r % 2) cols.reverse();
        cols.forEach(c => { if (row[c] === '#') o.push([ex + 1 + c, ey + r]); }); }); return o; };
      const aim = (a, i, jit = 0) => { const p = order[Math.max(0, Math.min(i, order.length - 1))]; a.data.paintHand = [[p[0] - 4 - a.x, p[1] + 3 - G + jit], [1, -8]]; };
      const a = makeAnt({ x: 30, dir: 1, hold: HOLD.brush });
      a.seq = [
        W(70),
        D(0, { start(a) { order = build(PICS[Math.floor(Math.random() * PICS.length)]); shown = 0; a.pose = 'paint'; } }),
        D(() => order.length / 9, { tick(k, dt, a) { shown = Math.floor(k * order.length); aim(a, shown, Math.sin(T * 30) > 0 ? 1 : 0); }, end() { shown = order.length; } }),
        D(.3, { start(a) { a.pose = 'idle'; } }),
        W(52, { speed: 12, face: 1 }),
        D(1.6, { start(a) { say(a, '!'); }, tick(k, dt, a) { a.hop = Math.abs(Math.sin(k * Math.PI * 3)) * 3; }, end(a) { a.hop = 0; } }),
        W(70, { speed: 12, face: 1 }),
        D(.9, { start(a) { a.pose = 'paint'; }, tick(k, dt, a) { shown = Math.floor((1 - k) * order.length); aim(a, shown); }, end(a) { shown = 0; a.pose = 'idle'; } }),
        D(.4),
      ];
      a.loopFrom = 1;
      return {
        ants: [a],
        back() {
          wline(ex + 6, ey + 9, ex + 2, G - 1); wline(ex + 7, ey + 9, ex + 11, G - 1);
          px(ex + 6, ey - 3, 2, 2); px(ex - 1, ey + 10, 16, 1);
          px(ex, ey - 1, 14, 1); px(ex, ey + 9, 14, 1); px(ex, ey - 1, 1, 11); px(ex + 13, ey - 1, 1, 11);
          order.slice(0, shown).forEach(([x, y]) => wp(x, y));
          const p = 98;   // paint can
          px(p, G - 4, 5, 1); px(p, G - 3, 1, 3); px(p + 4, G - 3, 1, 3); px(p, G - 1, 5, 1); px(p + 1, G - 3, 3, 2); wp(p + 4, G - 5);
        }
      };
    },

    pottery() {
      const sx = 46, cx = 60;                       // stool and wheel centre
      const slots = [100, 112, 124];                // shelf spots
      const shelf = [];
      let wheel = null, spin = false;               // wheel: { target, k }
      const a = makeAnt({ x: sx, dir: 1, sit: true, pose: 'shape' });
      a.seq = [
        D(.6, { start(a) { a.dir = 1; a.sit = true; a.pose = 'shape'; a.hold = null;
          wheel = { target: POTS[Math.floor(Math.random() * POTS.length)], k: 0 }; spin = true; } }),
        D(6, { tick(k, dt, a) {
          wheel.k = k;
          const rows = potRows(wheel.target, k), n = rows.length, wob = Math.sin(T * 6) > 0 ? 1 : 0;
          const mid = Math.floor(n / 3), top = n - 1;
          a.data.shapeHands = [[cx - rows[mid] - 1 - a.x, -10 - mid + wob], [cx - rows[top] - 1 - a.x, -10 - top]];
          a.fx += dt; if (a.fx > .25) { a.fx = 0; parts.push({ x: cx + rnd(-4, 4), y: G - 10, vx: rnd(-20, 20), vy: -rnd(5, 15), g: 80, life: .4, stop: G }); }
        } }),
        D(.6, { start(a) { spin = false; a.pose = 'idle'; say(a, '!'); } }),
        D(.3, { start(a) { a.sit = false; } }),
        W(cx - 7),
        D(.5, { start(a) { a.pose = 'reach'; a.data.pot = potRows(wheel.target, 1); },
          end(a) { wheel = null; a.hold = HOLD.pot; a.pose = 'idle'; } }),
        { get walk() { return slots[shelf.length >= slots.length ? 0 : shelf.length] - 9; } },   // walk to the next free shelf spot
        D(.5, { start(a) { a.pose = 'shelf'; },
          end(a) { if (shelf.length >= slots.length) shelf.length = 0; shelf.push(a.data.pot); a.hold = null; a.pose = 'idle'; } }),
        D(1, { tick(k, dt, a) { a.hop = Math.abs(Math.sin(k * Math.PI * 2)) * 2; }, end(a) { a.hop = 0; } }),
        W(sx),
      ];
      return {
        ants: [a],
        back() {
          drawStool(sx);
          px(cx - 6, G - 9, 13, 1);                                   // wheel head
          if (spin) wp(cx - 6 + Math.floor(T * 20) % 13, G - 9, PAPER);
          wp(cx, G - 8); wp(cx, G - 7);                               // spindle
          px(cx - 7, G - 6, 15, 1); px(cx - 7, G - 5, 1, 5); px(cx + 7, G - 5, 1, 5);   // wheel body (outline)
          wp(cx + 4, G - 4); wp(cx + 4, G - 3, INK);                  // pedal knob
          px(slots[0] - 7, G - 13, 38, 1); px(slots[0] - 5, G - 12, 1, 3); px(slots[2] + 5, G - 12, 1, 3);  // shelf
          shelf.forEach((rows, i) => drawPot(wp, slots[i], G - 14, rows, false, true));
        },
        front() { if (wheel) drawPot(wp, cx, G - 10, potRows(wheel.target, wheel.k), spin, !spin); }
      };
    },
  };

  // ---------- scene selection: a shuffled bag, so reloads cycle through everything ----------
  const NAMES = Object.keys(SCENES);
  function pickScene() {
    let bag = [], last = null;
    try { bag = JSON.parse(localStorage.getItem('antBag') || '[]'); last = localStorage.getItem('antLast'); } catch (e) {}
    bag = Array.isArray(bag) ? bag.filter(n => NAMES.includes(n)) : [];
    if (!bag.length) bag = NAMES.filter(n => n !== last);
    const n = bag.splice(Math.floor(Math.random() * bag.length), 1)[0];
    try { localStorage.setItem('antBag', JSON.stringify(bag)); localStorage.setItem('antLast', n); } catch (e) {}
    return n;
  }

  let scene;
  function startScene(name) { parts.length = 0; floats.length = 0; scene = SCENES[name](); scene.name = name; }

  function update(dt) {
    T += dt;
    scene.update && scene.update(dt);
    for (const a of scene.ants) { a.blink -= dt; if (a.blink < 0) a.blink = rnd(2, 5); runAnt(a, dt); }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += (p.g || 0) * dt; p.x += (p.vx || 0) * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.y >= p.stop || p.life <= 0 || p.x > 160) {
        if (p.splash && p.y >= p.stop && Math.random() < .3) for (const s of [-1, 1]) parts.push({ x: p.x, y: G - 1, vx: s * 10, vy: -12, g: 120, life: .3, stop: G });
        parts.splice(i, 1);
      }
    }
    for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.life <= 0) floats.splice(i, 1); }
  }

  function render() {
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, 300, 60);
    // REMOVE THESE:
    // const [g0, g1] = scene.ground || [0, 150];
    // px(g0, G, g1 - g0, 1);
    scene.back && scene.back();
    scene.ants.forEach(drawAnt);
    scene.front && scene.front();
    parts.forEach(p => px(p.x, p.y, p.w || 1, p.h || 1));
    floats.forEach(f => { if (f.life < .3 && Math.floor(f.life * 20) % 2) return; text(f.ch, f.x, f.y); });
  }

  // expose for the preview picker / testing
  window.AntScenes = { names: NAMES, start: startScene, _update: update, _render: render, get current() { return scene.name; } };

  startScene(pickScene());
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!document.hidden && !reducedMotion.matches) update(dt);
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
