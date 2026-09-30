/* eslint-disable no-empty, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unused-expressions --
   ported prototype: kept close to protocap-map.html rather than restyled. */
/* global window, document, requestAnimationFrame, cancelAnimationFrame, IntersectionObserver, ResizeObserver, setTimeout, clearTimeout, setInterval, clearInterval */
/**
 * ProtoCap — interactive map, ported from protocap-map.html (kept close to the source
 * so later versions of the prototype can be diffed in). Differences with the source:
 * - exported mount function instead of an auto-boot on [data-protocap-map];
 * - root class .pc-map and SVG ids pc-* (the Sentinel map uses sn-* on the same page);
 * - no inline style attributes (production CSP): styles go through the CSSOM.
 * Client-only: call it from an effect.
 */
'use strict';

/* ---------- traduction : la carte est écrite en français, le dictionnaire la traduit ---------- */
var TR = null;
function tr(s) {
  if (TR === null || s == null) return s;
  var k = String(s);
  return Object.prototype.hasOwnProperty.call(TR, k) ? TR[k] : k;
}
/* Texte composé à l'exécution : correspondance exacte, sinon fragments connus (ceux qui
   commencent ou finissent par une espace ou un séparateur, jamais au milieu d'un mot). */
var FRAGMENTS = null;
function trc(s) {
  if (TR === null || s == null) return s;
  var k = String(s);
  if (Object.prototype.hasOwnProperty.call(TR, k)) return TR[k];
  if (FRAGMENTS === null) {
    FRAGMENTS = Object.keys(TR)
      .filter(function (f) {
        return f.length > 1 && /^[\s·›/+:=−]|[\s·›/+:=−]$/.test(f);
      })
      .sort(function (a, b) {
        return b.length - a.length;
      });
  }
  for (var i = 0; i < FRAGMENTS.length; i++) {
    if (k.indexOf(FRAGMENTS[i]) !== -1) k = k.split(FRAGMENTS[i]).join(TR[FRAGMENTS[i]]);
  }
  return k;
}

var NS = 'http://www.w3.org/2000/svg';
var BP = 900; /* largeur de conteneur sous laquelle on bascule en mise en page compacte */

function el(tag, attrs, parent, txt) {
  var e = document.createElementNS(NS, tag);
  if (attrs)
    for (var k in attrs) {
      /* CSP : jamais d'attribut style, les styles passent par le CSSOM. */
      if (k === 'style') {
        e.style.cssText = attrs[k];
        continue;
      }
      e.setAttribute(k, k === 'aria-label' || k === 'aria-description' ? trc(attrs[k]) : attrs[k]);
      if (k === 'text-anchor') e.style.textAnchor = attrs[k];
    }
  if (parent) parent.appendChild(e);
  if (txt != null) e.textContent = trc(txt);
  return e;
}
function clear(n) {
  while (n.firstChild) n.removeChild(n.firstChild);
}
function up(s) {
  return String(trc(s)).toUpperCase();
}
function rad(d) {
  return (d * Math.PI) / 180;
}

/* ---------------------------------------------------------------
   CONTENU — tout est issu des docs et du code du dépôt
   (README, conception, design, technique, collaboration, production).
   --------------------------------------------------------------- */

var LEVELS = [
  {
    id: 'lv_calm',
    name: 'Calme',
    sw: '#5b6a95',
    kicker: "NIVEAU D'ATTENTION · 0",
    body: "Rien à décider. Traitement neutre, faible contraste : l'élément s'efface pour laisser la place à ce qui compte.",
  },
  {
    id: 'lv_watch',
    name: 'À surveiller',
    sw: '#f5b942',
    kicker: "NIVEAU D'ATTENTION · 1",
    body: 'Attention sans action immédiate. Accent doux, contraste mesuré.',
  },
  {
    id: 'lv_act',
    name: 'À traiter',
    sw: '#4368ff',
    kicker: "NIVEAU D'ATTENTION · 2",
    body: 'Action attendue. Accent affirmé mais sobre, position prioritaire dans la lecture.',
  },
  {
    id: 'lv_crit',
    name: 'Critique',
    sw: '#ff5d62',
    kicker: "NIVEAU D'ATTENTION · 3",
    body: 'Enjeu réel et urgent. Contraste fort par la place et la position, sans saturation extrême ni clignotement.',
  },
];

/* ---------------------------------------------------------------
   MONTAGE
   --------------------------------------------------------------- */
function mount(root, startTab, restoreSelection) {
  var reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (root.__pcClean) root.__pcClean();
  var rw = root.getBoundingClientRect().width || window.innerWidth;
  var compact = rw < BP;
  function sceneHeight() {
    var expanded = root.closest('[data-fullscreen-active="true"]');
    return !compact && expanded
      ? Math.max(630, Math.round((root.clientHeight * 1312) / root.clientWidth))
      : 630;
  }
  var W = compact ? 360 : 1312,
    H = compact ? 908 : sceneHeight(),
    HEAD = 0,
    SIDE = compact ? 0 : 128;
  var CUR = null;
  root.classList.add('pc-map');
  root.classList.toggle('compact', compact);
  root.innerHTML = '<div class="sn-scroll"></div><p class="sn-sr" aria-live="polite"></p>';
  var scroll = root.firstChild,
    live = root.lastChild;

  var svg = el(
    'svg',
    {
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'group',
      'aria-label':
        'Carte interactive de ProtoCap : surfaces, Céline, frontières de confiance, stockage, packing, logistique, péremption et qualité',
    },
    scroll,
  );

  var defs = el('defs', null, svg);
  defs.innerHTML =
    '<clipPath id="pc-clip"><rect x="0" y="0" width="' +
    W +
    '" height="' +
    H +
    '" rx="10"/></clipPath>' +
    '<clipPath id="pc-clip-canvas"><rect x="' +
    SIDE +
    '" y="' +
    HEAD +
    '" width="' +
    (W - SIDE) +
    '" height="' +
    (H - HEAD) +
    '"/></clipPath>' +
    '<radialGradient id="pc-glow"><stop offset="0" stop-color="#2d55ff" stop-opacity=".16"/><stop offset="1" stop-color="#2d55ff" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="pc-glow-core"><stop offset="0" stop-color="#2d55ff" stop-opacity=".38"/><stop offset="1" stop-color="#2d55ff" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="pc-core" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#4a6dff"/><stop offset="1" stop-color="#1b2fb0"/></radialGradient>' +
    '<marker id="pc-arr" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 1 L9 5 L0 9z" fill="#7f95e0"/></marker>' +
    '<marker id="pc-arr-hot" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 1 L9 5 L0 9z" fill="#c8ff2e"/></marker>';

  var clipG = el('g', { 'clip-path': 'url(#pc-clip)' }, svg);

  var canvasClip = el('g', { 'clip-path': 'url(#pc-clip-canvas)' }, clipG);
  var canvas = el('g', { class: 'canvas' }, canvasClip);
  var panelG = el('g', { class: 'panel' }, clipG);
  var chrome = el('g', { class: 'chrome' }, clipG);

  /* mesure de texte */
  var meas = el('text', { x: -999, y: -999, class: 'p-body', 'aria-hidden': 'true' }, svg);
  function measure(str, cls) {
    meas.setAttribute('class', cls);
    meas.textContent = trc(str);
    var w = 0;
    try {
      w = meas.getComputedTextLength();
    } catch (e) {
      w = 0;
    }
    if (!w) w = str.length * 6.2;
    return w;
  }
  function wrap(parent, str, x, y, maxW, lh, cls) {
    var t = el('text', { x: x, y: y, class: cls }, parent);
    var words = String(trc(str)).split(' '),
      line = '',
      lines = 1,
      first = true;
    var ts = el('tspan', { x: x, dy: 0 }, t);
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (line && measure(test, cls) > maxW) {
        ts.textContent = line;
        ts = el('tspan', { x: x, dy: lh }, t);
        line = words[i];
        lines++;
      } else {
        line = test;
      }
    }
    ts.textContent = line;
    return { node: t, lines: lines };
  }

  /* ---------- état ---------- */
  var items = {},
    state = {
      tab: 0,
      sel: null,
      tour: null,
      anim: root.__pcAnim === undefined ? !reduceMotion : root.__pcAnim,
      paused: false,
      visible: true,
    };
  var movers = [],
    curScene = null,
    sceneState = {},
    buildT = 0,
    building = false;
  root.classList.toggle('no-anim', !state.anim);

  /* ---------- enregistrement des éléments interactifs ---------- */
  function reg(id, data, els, opt) {
    if (!data) data = Object.assign({ title: id, body: '' }, CUR && CUR[id]);
    data.id = id;
    data.els = els;
    items[id] = data;
    els.forEach(function (e) {
      e.setAttribute('tabindex', '0');
      e.setAttribute('role', 'button');
      e.setAttribute('aria-label', tr(data.title));
      e.addEventListener('pointerenter', function (ev) {
        if (ev.pointerType === 'mouse') {
          state.paused = true;
          if (!(opt && opt.noHover)) select(id);
        }
      });
      e.addEventListener('pointerleave', function (ev) {
        if (ev.pointerType === 'mouse') state.paused = false;
      });
      e.addEventListener('click', function () {
        select(id);
      });
      e.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          select(id);
        }
      });
    });
  }

  function select(id, opt) {
    if (!items[id]) return;
    if (!(opt && opt.tour)) stopTour();
    if (state.sel === id && !(opt && opt.force)) return;
    if (state.sel && items[state.sel])
      items[state.sel].els.forEach(function (e) {
        e.classList.remove('is-active');
      });
    state.sel = id;
    var it = items[id];
    it.els.forEach(function (e) {
      e.classList.add('is-active');
    });
    renderPanel(it);
    live.textContent = tr(it.title) + '. ' + tr(it.body);
    if (curScene && curScene.onSelect) curScene.onSelect(id, it);
  }

  /* ---------- panneau de détail + signal ---------- */
  var sigW = 240;
  var sigG = el('g', { class: 'signal' }, panelG);
  var detailG = el('g', { class: 'detail' }, panelG);

  function setSignal(pair) {
    clear(sigG);
    var lab = up(pair[0]),
      val = up(pair[1]);
    var w = Math.max(measure(lab, 'sig-lab') * 1.25, measure(val, 'sig-val') * 1.18) + 32;
    w = Math.max(190, Math.min(360, w));
    if (compact) {
      var cy0 = H - 92;
      el('rect', { x: 12, y: cy0, width: 336, height: 42, rx: 6, class: 'sig-bg' }, sigG);
      el('text', { x: 16, y: cy0 + 17, class: 'sig-lab' }, sigG, lab);
      el('text', { x: 16, y: cy0 + 33, class: 'sig-val' }, sigG, val);
      return;
    }
    sigW = w;
    var x = W - 24 - w,
      y = H - 24 - 50;
    el('rect', { x: x, y: y, width: w, height: 50, rx: 6, class: 'sig-bg' }, sigG);
    el('text', { x: x + 16, y: y + 21, class: 'sig-lab' }, sigG, lab);
    el('text', { x: x + 16, y: y + 37, class: 'sig-val' }, sigG, val);
  }

  function renderPanel(it) {
    clear(detailG);
    if (compact) {
      renderPanelC(it);
      return;
    }
    var x = SIDE + 24,
      w = W - 24 - sigW - 16 - x,
      h = 126,
      y = H - 24 - h;
    el('rect', { x: x, y: y, width: w, height: h, rx: 6, class: 'panel-bg' }, detailG);
    el('text', { x: x + 20, y: y + 26, class: 'p-kick' }, detailG, up(it.kicker || ''));
    el('text', { x: x + 20, y: y + 50, class: 'p-title' }, detailG, it.title);

    /* pastilles à droite */
    if (it.tags && it.tags.length) {
      var tx = x + w - 18;
      for (var i = it.tags.length - 1; i >= 0; i--) {
        var tg = it.tags[i],
          txt = up(tg.t),
          tw = measure(txt, 'tag-txt') * 1.22 + 20;
        tx -= tw;
        var g = el('g', { class: 'tag ' + (tg.k || '') }, detailG);
        el('rect', { x: tx, y: y + 14, width: tw, height: 18, rx: 9, class: 'tag-bg' }, g);
        el('text', { x: tx + tw / 2, y: y + 26, class: 'tag-txt' }, g, txt);
        tx -= 6;
      }
    }
    var bodyY = y + 72,
      maxW = w - 40;
    var b = wrap(detailG, it.body, x + 20, bodyY, maxW, 17, 'p-body');
    if (it.test) {
      var ty = bodyY + (b.lines - 1) * 17 + 21;
      el('text', { x: x + 20, y: ty, class: 'p-test-k' }, detailG, 'TEST ›');
      var t = el('text', { x: x + 64, y: ty + 0.5, class: 'p-test' }, detailG, it.test);
    }
  }

  function renderPanelC(it) {
    var x = 12,
      w = 336,
      h = 224,
      y = H - 324;
    el('rect', { x: x, y: y, width: w, height: h, rx: 6, class: 'panel-bg' }, detailG);
    var k = wrap(detailG, up(it.kicker || ''), x + 16, y + 22, w - 32, 12, 'p-kick');
    var ky = (k.lines - 1) * 12;
    var t = wrap(detailG, it.title, x + 16, y + 46 + ky, w - 32, 20, 'p-title');
    var by = y + 46 + ky + (t.lines - 1) * 20 + 24;
    var b = wrap(detailG, it.body, x + 16, by, w - 32, 16, 'p-body');
    var ny = by + (b.lines - 1) * 16;
    if (it.test) {
      var q = wrap(detailG, 'TEST › ' + tr(it.test), x + 16, ny + 20, w - 32, 15, 'p-test');
    }
    if (it.tags && it.tags.length) {
      var tx = x + 16,
        ty = y + h - 28;
      it.tags.forEach(function (tg) {
        var txt = up(tg.t),
          tw = measure(txt, 'tag-txt') * 1.2 + 18;
        if (tx + tw > x + w - 12) return;
        var g = el('g', { class: 'tag ' + (tg.k || '') }, detailG);
        el('rect', { x: tx, y: ty, width: tw, height: 18, rx: 9, class: 'tag-bg' }, g);
        el('text', { x: tx + tw / 2, y: ty + 12, class: 'tag-txt' }, g, txt);
        tx += tw + 6;
      });
    }
  }

  /* ---------- chrome : en-tête, onglets, bouton parcours ---------- */
  // The scene heading and its status reserve this column for the fullscreen control.
  el(
    'foreignObject',
    {
      x: W - 56,
      y: compact ? 76 : 4,
      width: 44,
      height: 44,
      'data-map-fullscreen-slot': '',
    },
    chrome,
  );
  if (!compact) {
    el('rect', { x: 0, y: HEAD, width: SIDE, height: H - HEAD, class: 'side-bg' }, chrome);
    el('line', { x1: SIDE, y1: HEAD, x2: SIDE, y2: H, class: 'rule' }, chrome);
  }
  var tabNum = el('text', { x: 20, y: 34, class: 'tab-num' }, chrome, '01');
  if (compact) tabNum.setAttribute('display', 'none');
  var tabList = el('g', { role: 'tablist', 'aria-label': 'Vues de la carte' }, chrome);
  var tabEls = [];
  var TAB_Y0 = 52,
    TAB_STEP = 38;

  function buildTabs() {
    SCENES.forEach(function (sc, i) {
      var g = el(
        'g',
        {
          class: 'tab pc-ptr',
          role: 'tab',
          tabindex: i === 0 ? 0 : -1,
          'aria-selected': i === 0 ? 'true' : 'false',
          'aria-label': sc.label,
        },
        tabList,
      );
      if (compact) {
        var tx = 12 + (i % 4) * 84,
          ty = 10 + Math.floor(i / 4) * 32;
        el('rect', { x: tx, y: ty, width: 80, height: 26, rx: 4, class: 'tab-bg' }, g);
        el('text', { x: tx + 40, y: ty + 17, class: 'tab-txt' }, g, up(sc.tab));
      } else {
        el(
          'rect',
          { x: 10, y: TAB_Y0 + i * TAB_STEP, width: 108, height: 30, rx: 4, class: 'tab-bg' },
          g,
        );
        el('text', { x: 20, y: TAB_Y0 + i * TAB_STEP + 19, class: 'tab-txt' }, g, up(sc.tab));
      }
      g.addEventListener('click', function () {
        go(i);
      });
      g.addEventListener('keydown', function (e) {
        var n = SCENES.length,
          k = e.key;
        if (k === 'Enter' || k === ' ') {
          e.preventDefault();
          go(i);
        } else if (k === 'ArrowDown' || k === 'ArrowRight') {
          e.preventDefault();
          go((i + 1) % n, true);
        } else if (k === 'ArrowUp' || k === 'ArrowLeft') {
          e.preventDefault();
          go((i + n - 1) % n, true);
        }
      });
      tabEls.push(g);
    });
  }

  var btn = el(
    'g',
    {
      class: 'btn pc-ptr',
      tabindex: 0,
      role: 'button',
      'aria-label': 'Lancer ou arrêter le parcours guidé',
    },
    chrome,
  );
  var BTN_Y = compact ? H - 42 : H - 24 - 30;
  var BX = compact ? 12 : 10,
    BW = compact ? 164 : 108;
  el('rect', { x: BX, y: BTN_Y, width: BW, height: 30, rx: 15, class: 'btn-bg' }, btn);
  var btnIco = el('path', { class: 'btn-ico', d: '' }, btn);
  var btnTxt = el('text', { x: BX + 32, y: BTN_Y + 18.5, class: 'btn-txt' }, btn, 'PARCOURIR');
  if (!compact)
    el('text', { x: SIDE / 2, y: BTN_Y - 12, class: 'side-hint' }, chrome, 'SURVOLER · CLIQUER');
  function paintBtn(on) {
    btn.classList.toggle('is-on', on);
    btnTxt.textContent = trc(on ? 'ARRÊTER' : 'PARCOURIR');
    var ix = BX + 15;
    btnIco.setAttribute(
      'd',
      on
        ? 'M' + (ix + 1) + ' ' + (BTN_Y + 10.5) + ' h9 v9 h-9 Z'
        : 'M' +
            (ix + 1) +
            ' ' +
            (BTN_Y + 10) +
            ' L' +
            (ix + 1) +
            ' ' +
            (BTN_Y + 20) +
            ' L' +
            (ix + 9) +
            ' ' +
            (BTN_Y + 15) +
            ' Z',
    );
  }
  paintBtn(false);
  btn.addEventListener('click', function () {
    state.tour ? stopTour() : startTour();
  });
  btn.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      state.tour ? stopTour() : startTour();
    }
  });

  /* ---------- bascule d'animation ---------- */
  var pill = el(
    'g',
    {
      class: 'btn is-on pc-ptr',
      tabindex: 0,
      role: 'button',
      'aria-pressed': state.anim ? 'true' : 'false',
      'aria-label': 'Activer ou couper les animations',
    },
    chrome,
  );
  var PX = compact ? 184 : 10,
    PW = compact ? 164 : 108,
    PILL_Y = compact ? BTN_Y : BTN_Y - 58;
  el('rect', { x: PX, y: PILL_Y, width: PW, height: 30, rx: 15, class: 'btn-bg' }, pill);
  el('circle', { cx: PX + 16, cy: PILL_Y + 15, r: 4, class: 'btn-ico' }, pill);
  var pillTxt = el('text', { x: PX + 30, y: PILL_Y + 18.5, class: 'btn-txt' }, pill, '');
  function paintPill() {
    pillTxt.textContent = trc((compact ? 'ANIMATION · ' : 'ANIM · ') + (state.anim ? 'ON' : 'OFF'));
    pill.setAttribute('aria-pressed', state.anim ? 'true' : 'false');
    pill.classList.toggle('is-on', state.anim);
  }
  paintPill();
  function togglePill() {
    state.anim = !state.anim;
    root.__pcAnim = state.anim;
    root.classList.toggle('no-anim', !state.anim);
    paintPill();
    if (state.anim) kick();
  }
  pill.addEventListener('click', togglePill);
  pill.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      togglePill();
    }
  });

  /* ---------- parcours guidé ---------- */
  function stopTour() {
    if (state.tour) {
      clearInterval(state.tour.timer);
      state.tour = null;
      paintBtn(false);
    }
  }
  function startTour() {
    var sc = curScene;
    if (building || !sc || !sc.tour || !sc.tour.length) return;
    stopTour();
    var i = 0;
    function step() {
      if (i >= sc.tour.length) {
        stopTour();
        return;
      }
      select(sc.tour[i], { tour: true, force: true });
      i++;
    }
    step();
    state.tour = { timer: setInterval(step, 3200) };
    paintBtn(true);
  }

  /* ---------- primitives de dessin ---------- */
  function decor(g, cx, cy) {
    if (compact) {
      el('ellipse', { cx: cx, cy: cy, rx: 230, ry: 210, fill: 'url(#pc-glow)' }, g);
      return;
    }
    el('ellipse', { cx: cx, cy: cy, rx: 430, ry: 250, fill: 'url(#pc-glow)' }, g);
    [cx - 190, cx + 210].forEach(function (x) {
      el('line', { x1: x, y1: HEAD, x2: x, y2: H, class: 'grid-l' }, g);
    });
    el('line', { x1: SIDE, y1: cy + 176, x2: W, y2: cy + 176, class: 'grid-l' }, g);
    el('text', { x: W - 72, y: HEAD + 30, class: 'hint' }, g, 'INTERACTIF');
  }

  function orb(g, x, y, r, tone) {
    var o = el(
      'g',
      { class: 'orb' + (tone ? ' tone-' + tone : ''), transform: 'translate(' + x + ' ' + y + ')' },
      g,
    );
    el('circle', { class: 'orb-halo', r: r + 11 }, o);
    el('circle', { class: 'orb-ring', r: r + 5 }, o);
    el('circle', { class: 'orb-core', r: r }, o);
    el('circle', { class: 'orb-dot', r: Math.max(2.4, r * 0.28) }, o);
    el('circle', { class: 'orb-hit', r: r + 16 }, o);
    return o;
  }
  function nodeLabels(o, r, name, sub, side) {
    if (!name) return;
    if (side === 'right') {
      el('text', { x: r + 14, y: -1, class: 't-name', 'text-anchor': 'start' }, o, up(name));
      if (sub) el('text', { x: r + 14, y: 12, class: 't-sub', 'text-anchor': 'start' }, o, up(sub));
      return;
    }
    var dy = side === 'top' ? [-(r + 29), -(r + 17)] : [r + 27, r + 40];
    el('text', { x: 0, y: dy[0], class: 't-name' }, o, up(name));
    if (sub) el('text', { x: 0, y: dy[1], class: 't-sub' }, o, up(sub));
  }
  function node(g, id, x, y, r, name, sub, data, o) {
    o = o || {};
    var orbEl = orb(g, x, y, r, o.tone);
    nodeLabels(orbEl, r, name, sub, o.side);
    reg(id, data, [orbEl]);
    return orbEl;
  }
  function edge(g, id, d, lx, ly, text, anchor, data, cls) {
    var e = el('g', { class: 'edge' }, g);
    el('path', { d: d, class: 'edge-hit' }, e);
    el('path', { d: d, class: 'edge-line' + (cls ? ' ' + cls : '') }, e);
    if (text)
      el('text', { x: lx, y: ly, class: 't-edge', 'text-anchor': anchor || 'middle' }, e, up(text));
    reg(id, data, [e]);
    return e;
  }
  function chip(g, id, x, y, w, text, data) {
    var c = el('g', { class: 'chip' }, g);
    el('rect', { x: x, y: y, width: w, height: 24, rx: 12, class: 'chip-bg' }, c);
    el('text', { x: x + w / 2, y: y + 15.5, class: 'chip-txt' }, c, up(text));
    reg(id, data, [c]);
    return c;
  }
  function note(g, x, y, key, text) {
    var t = el('text', { x: x, y: y, class: 'note' }, g);
    el('tspan', { class: 'note-k' }, t, up(key) + '  ');
    el('tspan', null, t, up(text));
  }

  var timers = [];
  function later(fn, ms) {
    var id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }
  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function svgX(ev) {
    var pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    var m = svg.getScreenCTM();
    if (!m) return 0;
    return pt.matrixTransform(m.inverse()).x;
  }
  function slider(g, x, y, w, min, max, step, val, onInput, label, opts) {
    opts = opts || {};
    if (opts.track !== false) el('line', { x1: x, y1: y, x2: x + w, y2: y, class: 'sl-track' }, g);
    var fill =
      opts.fill === false ? null : el('line', { x1: x, y1: y, x2: x, y2: y, class: 'sl-fill' }, g);
    var handle = el(
      'circle',
      {
        cx: x,
        cy: y,
        r: 8,
        class: 'sl-handle',
        tabindex: 0,
        role: 'slider',
        'aria-label': label,
        'aria-valuemin': min,
        'aria-valuemax': max,
      },
      g,
    );
    var hit = el('rect', { x: x - 12, y: y - 16, width: w + 24, height: 32, class: 'sl-hit' }, g);
    var cur = val,
      drag = false;
    function snap(v) {
      v = Math.max(min, Math.min(max, v));
      return Math.round((v - min) / step) * step + min;
    }
    function set(v, quiet) {
      cur = snap(v);
      var px = x + ((cur - min) / (max - min)) * w;
      handle.setAttribute('cx', px);
      if (fill) fill.setAttribute('x2', px);
      handle.setAttribute('aria-valuenow', cur);
      if (!quiet) onInput(cur);
    }
    function move(ev) {
      set(min + ((svgX(ev) - x) / w) * (max - min));
    }
    [hit, handle].forEach(function (t) {
      t.addEventListener('pointerdown', function (ev) {
        drag = true;
        try {
          t.setPointerCapture(ev.pointerId);
        } catch (e) {}
        move(ev);
      });
      t.addEventListener('pointermove', function (ev) {
        if (drag) move(ev);
      });
      t.addEventListener('pointerup', function () {
        drag = false;
      });
      t.addEventListener('pointercancel', function () {
        drag = false;
      });
    });
    handle.addEventListener('keydown', function (ev) {
      var k = ev.key,
        big = Math.max(step, (max - min) / 20);
      if (k === 'ArrowRight' || k === 'ArrowUp') {
        ev.preventDefault();
        set(cur + step);
      } else if (k === 'ArrowLeft' || k === 'ArrowDown') {
        ev.preventDefault();
        set(cur - step);
      } else if (k === 'PageUp') {
        ev.preventDefault();
        set(cur + big);
      } else if (k === 'PageDown') {
        ev.preventDefault();
        set(cur - big);
      } else if (k === 'Home') {
        ev.preventDefault();
        set(min);
      } else if (k === 'End') {
        ev.preventDefault();
        set(max);
      }
    });
    set(val, true);
    return {
      set: set,
      get: function () {
        return cur;
      },
    };
  }
  function button(g, x, y, w, text, fn, label) {
    var c = el('g', { class: 'chip', tabindex: 0, role: 'button', 'aria-label': label || text }, g);
    el('rect', { x: x, y: y, width: w, height: 24, rx: 12, class: 'chip-bg' }, c);
    el('text', { x: x + w / 2, y: y + 15.5, class: 'chip-txt' }, c, up(text));
    c.addEventListener('click', fn);
    c.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fn();
      }
    });
    return c;
  }

  /* =================================================================
     SCÈNES
     ================================================================= */
  var SCENES = [];
  /* ---------- 01 · SURFACES ---------- */
  SCENES.push({
    q: "Qu'est-ce qui est réel, simulé ou local ?",
    tab: 'Surfaces',
    label: "Vue d'ensemble : les huit surfaces de ProtoCap classées par statut",
    signal: ['Transparence', 'Réel · local · fictif · statique'],
    def: 'protocap',
    tour: ['k_srv', 'k_loc', 'k_mock', 'k_stat', 'protocap'],
    build: function (g) {
      var cx = 720,
        cy = 240;
      decor(g, cx, cy);
      var orbits = [
        { rx: 340, ry: 140, rot: -6 },
        { rx: 300, ry: 112, rot: 24 },
        { rx: 250, ry: 100, rot: -34 },
        { rx: 180, ry: 126, rot: 70 },
        { rx: 130, ry: 96, rot: 8, faint: true },
      ];
      var lineEls = orbits.map(function (o) {
        return el(
          'ellipse',
          {
            cx: cx,
            cy: cy,
            rx: o.rx,
            ry: o.ry,
            transform: 'rotate(' + o.rot + ' ' + cx + ' ' + cy + ')',
            class: 'orbit-line' + (o.faint ? ' faint' : ''),
          },
          g,
        );
      });

      var core = el('g', { class: 'core', transform: 'translate(' + cx + ' ' + cy + ')' }, g);
      el('circle', { r: 104, class: 'core-halo' }, core);
      el('circle', { r: 68, class: 'core-mid' }, core);
      el('circle', { r: 58, class: 'core-disc' }, core);
      el('text', { x: 0, y: 4, class: 'core-txt' }, core, 'PROTOCAP');
      el('circle', { r: 74, fill: 'transparent', class: 'pc-ptr' }, core);
      reg(
        'protocap',
        {
          kicker: "Démonstrateur d'ingénierie",
          title: 'ProtoCap',
          body: "Huit surfaces qui déclarent honnêtement leur statut : ce qui passe par un serveur, ce qui reste dans le navigateur, ce qui est fictif. Le dépôt documente ce que chaque démonstration prouve — et ce qu'elle ne prétend pas prouver.",
          tags: [{ t: 'React 18' }, { t: 'Vite PWA' }, { t: 'Express 5' }],
        },
        [core],
      );

      var defs = {
        shiftguide: [
          'ShiftGuide',
          'Serveur protégé',
          'srv',
          'lime',
          'Surface · serveur protégé',
          'ShiftGuide',
          "Guide de procédures de poste dont le contenu est protégé : le code est vérifié côté serveur, qui émet une session ; sans elle, la configuration protégée n'est jamais livrée. Une variante de démonstration isolée existe, sur données fictives.",
          [{ t: 'Serveur', k: 'ok' }, { t: 'Session' }, { t: 'Démo isolée' }],
        ],
        celine: [
          'Céline',
          'Serveur protégé',
          'srv',
          'lime',
          'Surface · serveur protégé',
          'Céline',
          "Assistante IA du poste, médiée par le serveur : la clé du fournisseur et le prompt restent côté serveur, et un moteur de domaine résout d'abord les cas routiniers sans appel externe. Pas d'IA hors ligne, aucun pilotage d'équipement.",
          [{ t: 'Serveur', k: 'ok' }, { t: 'DeepSeek' }],
        ],
        expiry: [
          'Expiry Check',
          'Local',
          'loc',
          null,
          'Surface · local au navigateur',
          'Expiry Check',
          'Workflow interactif de validité et de statut, avec historique local. Il ne prétend ni base qualité partagée, ni dossier de lot électronique validé, ni synchronisation entre appareils.',
          [{ t: 'Navigateur' }, { t: 'Temporal' }],
        ],
        logistics: [
          'Logistics Call',
          'Local',
          'loc',
          null,
          'Surface · local au navigateur',
          'Logistics Call',
          "Cycle de vie d'une demande, priorisation, temps écoulé et transitions de statut — dans le navigateur. Aucun envoi vers un autre poste, ni websocket, ni temps réel.",
          [{ t: 'Navigateur' }, { t: 'Machine à états' }],
        ],
        packing: [
          'Packing',
          'Local',
          'loc',
          null,
          'Surface · local au navigateur',
          'Packing Calculator',
          "Calculs de conditionnement déterministes et suivi manuel des expéditions par palette. Pas d'ERP ni de données maîtres, pas d'état partagé, pas d'exécution automatique d'ordre de fabrication.",
          [{ t: 'Navigateur' }, { t: 'Entiers sûrs' }],
        ],
        linepulse: [
          'LinePulse',
          'Fictif',
          'mock',
          'amber',
          'Surface · données fictives',
          'LinePulse',
          "Visualisation opérationnelle par rôle, alimentée par une fixture du dépôt (linePulseMock.json). Ce n'est ni de la télémétrie ni du temps réel : c'est de l'UX d'aide à la décision.",
          [{ t: 'Fixture' }, { t: 'Données fictives' }],
        ],
        kb: [
          'Knowledge Base',
          'Statique',
          'stat',
          'grey',
          'Surface · statique',
          'Knowledge Base',
          "Modèle de recherche et de navigation pour des références opérationnelles. Non connecté à une GED d'entreprise.",
          [{ t: 'Statique' }],
        ],
        pilot: [
          'Pilot proposal',
          'Statique',
          'stat',
          'grey',
          'Surface · statique',
          'Proposition de pilote',
          "Proposition structurée d'un pilote contrôlé, avec ses garde-fous. Ce n'est ni une approbation, ni un déploiement, ni des gains mesurés : les bénéfices annoncés sont des hypothèses.",
          [{ t: 'Statique' }, { t: 'Hypothèses' }],
        ],
      };
      var place = [
        ['celine', 0, 5.76],
        ['expiry', 0, 2.53],
        ['shiftguide', 1, 6.2],
        ['kb', 1, 2.88],
        ['logistics', 2, 4.19],
        ['pilot', 2, 2.01],
        ['linepulse', 3, 4.19],
        ['packing', 3, 5.06],
      ];
      movers = [];
      place.forEach(function (p, mk) {
        var d = defs[p[0]];
        var og = orb(g, 0, 0, 12, d[3]);
        nodeLabels(og, 12, d[0], d[1], 'bottom');
        reg(p[0], { kicker: d[4], title: d[5], body: d[6], tags: d[7] }, [og]);
        movers.push({
          g: og,
          cls: d[2],
          o: orbits[p[1]],
          t0: p[2],
          t: p[2],
          time: mk * 3.1,
          amp: 0.09 + 0.018 * mk,
          w: 0.26 + 0.03 * mk,
          ph: mk * 1.7,
          cx: cx,
          cy: cy,
          orbitEl: lineEls[p[1]],
        });
      });
      placeMovers();
      movers.forEach(function (m) {
        m.g.addEventListener('pointerenter', function () {
          m.orbitEl.classList.add('hot');
        });
        m.g.addEventListener('pointerleave', function () {
          m.orbitEl.classList.remove('hot');
        });
      });

      /* légende filtrante */
      var CL = { k_srv: 'srv', k_loc: 'loc', k_mock: 'mock', k_stat: 'stat' };
      var leg = [
        [
          'k_srv',
          'Serveur protégé',
          172,
          178,
          '#c8ff2e',
          'Statut · serveur protégé',
          'Ce qui exige un serveur',
          "ShiftGuide et Céline dépendent du serveur : déverrouillage, validation de session, clé de fournisseur et prompt protégés. C'est aussi ce qui exige de la connectivité — ProtoCap ne se présente donc pas comme entièrement hors ligne.",
        ],
        [
          'k_loc',
          'Local au navigateur',
          360,
          190,
          '#4368ff',
          'Statut · local au navigateur',
          'Ce qui ne quitte pas le navigateur',
          "Expiry Check, Logistics Call et Packing utilisent le stockage du navigateur : c'est autonome, mais cela ne crée aucune source de vérité partagée entre utilisateurs ou appareils.",
        ],
        [
          'k_mock',
          'Données fictives',
          560,
          170,
          '#f5b942',
          'Statut · données fictives',
          'Ce qui est simulé, et dit comme tel',
          "Les données publiques de démonstration sont volontairement fictives. Les gains ou KPI cités dans les documents sont des hypothèses de conception ou des critères d'évaluation, sauf mention explicite de mesure.",
        ],
        [
          'k_stat',
          'Statique',
          740,
          112,
          '#7f8aa6',
          'Statut · statique',
          'Ce qui est contenu, pas système',
          "La base de connaissance et la proposition de pilote décrivent un modèle ou une démarche : elles ne se branchent sur aucun système d'entreprise.",
        ],
      ];
      leg.forEach(function (l) {
        var c = chip(g, l[0], l[2], 440, l[3], l[1], {
          kicker: l[5],
          title: l[6],
          body: l[7],
          tags: [{ t: l[1] }],
        });
        el('circle', { cx: l[2] + 15, cy: 452, r: 3.5, fill: l[4], 'pointer-events': 'none' }, c);
      });
      sceneState.filt = function (id) {
        var cls = CL[id];
        movers.forEach(function (m) {
          m.g.classList.toggle('is-dim', !!cls && m.cls !== cls);
        });
      };
    },
    onSelect: function (id) {
      if (sceneState.filt) sceneState.filt(id);
    },
  });

  /* ---------- 02 · CÉLINE ---------- */
  SCENES.push({
    q: 'Qui écrit la réponse : le modèle ou le serveur ?',
    tab: 'Céline',
    label: 'Céline : moteur de domaine, garde de coûts et autorité du serveur',
    signal: ['Autorité', 'Le modèle choisit, le serveur écrit'],
    def: 'n_auth',
    tour: [
      'n_op',
      'n_api',
      'sc_routine',
      'n_dom',
      'sc_ambig',
      'n_guard',
      'n_llm',
      'n_norm',
      'n_fb',
      'n_auth',
    ],
    build: function (g) {
      decor(g, 720, 250);
      var dom = [],
        llm = [];
      function tag(arr, e) {
        arr.push(e);
        return e;
      }

      /* liens (dessous) */
      tag(
        dom,
        edge(g, 'e_dom', 'M394 238 Q470 165 574 162', 480, 172, 'routine', 'middle', {
          kicker: 'Chemin 1 · déterministe',
          title: 'Routine : le moteur de domaine',
          body: "Le moteur tente d'abord de résoudre l'interaction sans modèle. S'il y parvient, aucun appel fournisseur n'a lieu.",
          tags: [{ t: '0 appel IA', k: 'ok' }],
        }),
      );
      tag(
        llm,
        edge(g, 'e_llm', 'M394 262 Q470 335 574 338', 480, 330, 'ambigu', 'middle', {
          kicker: 'Chemin 2 · sémantique',
          title: 'Ambigu : vers le fournisseur',
          body: 'Seule une interaction sémantique non résolue continue vers la garde de coûts, puis vers le fournisseur.',
          tags: [{ t: 'Repli' }],
        }),
      );
      edge(g, 'e_in', 'M224 250 L356 250', 290, 238, 'message', 'middle', {
        kicker: 'Entrée',
        title: "Un message d'opérateur",
        body: "Le message part vers /api/celine/chat. Vers le chemin fournisseur, il est borné à 2 000 caractères et l'historique à quatre tours.",
        tags: [{ t: '≤ 2 000 car.' }],
      });
      tag(
        dom,
        edge(
          g,
          'e_dom_auth',
          'M626 160 Q1040 130 1098 236',
          800,
          144,
          'réponse déterministe',
          'middle',
          {
            kicker: 'Sortie',
            title: 'Réponse du moteur de domaine',
            body: "Une réponse résolue localement traverse directement jusqu'à la composition finale.",
            tags: [{ t: 'Sans fournisseur' }],
          },
          'soft',
        ),
      );
      tag(
        llm,
        edge(g, 'e_guard_llm', 'M624 340 L786 340', 705, 328, 'autorisé ?', 'middle', {
          kicker: 'Contrôle',
          title: 'Admission par la garde',
          body: "Une requête bloquée par la garde n'atteint jamais DeepSeek : elle ressort en échec local (rate_limited ou budget_exceeded).",
          tags: [{ t: 'Fail-closed', k: 'ok' }],
        }),
      );
      tag(
        llm,
        edge(g, 'e_llm_norm', 'M834 340 L976 340', 905, 328, 'décision', 'middle', {
          kicker: 'Fournisseur → serveur',
          title: 'Une décision structurée',
          body: "Le modèle ne fournit qu'une décision ; il n'écrit pas la réponse finale destinée à l'opérateur.",
          tags: [{ t: '160 jetons max' }],
        }),
      );
      tag(
        llm,
        edge(
          g,
          'e_norm_auth',
          'M1022 334 Q1090 334 1104 268',
          1100,
          318,
          'valide',
          'start',
          {
            kicker: 'Serveur',
            title: 'Décision validée',
            body: 'Une décision valide est acceptée puis convertie en réponse par le serveur.',
            tags: [{ t: 'Validée', k: 'ok' }],
          },
          'soft',
        ),
      );
      tag(
        llm,
        edge(
          g,
          'e_norm_fb',
          'M1000 362 L1000 398',
          1012,
          384,
          'invalide',
          'start',
          {
            kicker: 'Rejet',
            title: 'Décision invalide',
            body: "Une décision invalide n'est jamais appliquée telle quelle : le modèle ne peut pas écrire directement à l'opérateur.",
            tags: [{ t: 'Rejetée', k: 'no' }],
          },
          'soft',
        ),
      );

      function lbl(o, side, name, sub) {
        nodeLabels(o, side, name, sub, 'bottom');
      }
      node(g, 'n_op', 200, 250, 20, 'Opérateur', 'Question', {
        kicker: 'Étape 01',
        title: "L'opérateur pose une question",
        body: 'Une question en langage naturel sur sa procédure de poste, depuis ShiftGuide. La conversation exige une session valide : sans elle, la route répond 401.',
        tags: [{ t: 'Session requise' }],
      });
      node(g, 'n_api', 380, 250, 20, 'Serveur', 'Session · limites', {
        kicker: 'Étape 02 · Express',
        title: "Le serveur vérifie d'abord",
        body: 'Il authentifie la session ShiftGuide et applique les limites de requêtes — 60 par minute et par IP, 30 par session — avant tout autre travail.',
        tags: [{ t: '401 sans session' }, { t: '429 au-delà' }],
      });
      var nDom = node(
        g,
        'n_dom',
        600,
        160,
        22,
        'Moteur de domaine',
        '0 appel IA',
        {
          kicker: 'Étape 03a · déterministe',
          title: 'Le moteur de domaine',
          body: "Il tente de résoudre l'interaction de façon déterministe. S'il la traite, DeepSeek n'est pas appelé et les budgets fournisseur restent intacts : l'IA n'est pas le chemin par défaut.",
          tags: [{ t: 'Déterministe', k: 'ok' }],
        },
        { tone: 'lime' },
      );
      var nGuard = node(g, 'n_guard', 600, 340, 22, 'Garde de coûts', '8 appels / min', {
        kicker: 'Étape 03b · garde',
        title: 'Une garde avant le réseau',
        body: "Avant tout travail réseau : taille du prompt et de l'historique, débit d'appels (8 par minute) et jetons déjà consommés (seuil de 100 000 par heure). Volontairement locale au processus : adaptée à une réplique unique.",
        tags: [{ t: 'Process-local' }, { t: '100 k jetons / h' }],
      });
      var nLlm = node(g, 'n_llm', 810, 340, 22, 'DeepSeek', 'Classification', {
        kicker: 'Étape 04 · fournisseur',
        title: 'Une frontière de repli',
        body: "Le fournisseur est une frontière de classification linguistique de repli, pas un chemin d'exécution. Historique limité à quatre tours, complétion plafonnée à 160 jetons par défaut.",
        tags: [{ t: '160 jetons' }, { t: '4 tours' }],
      });
      var nNorm = node(
        g,
        'n_norm',
        1000,
        340,
        22,
        'Normalisation',
        'Décision validée',
        {
          kicker: 'Étape 05 · serveur',
          title: 'Normaliser et valider',
          body: "La sortie du fournisseur est normalisée et validée. Seule une décision recevable passe à l'étape d'autorité ; le reste est rejeté.",
          tags: [{ t: 'Validation' }],
        },
        { side: 'top' },
      );
      var nFb = node(
        g,
        'n_fb',
        1000,
        420,
        14,
        'Repli sûr',
        'Décision invalide',
        {
          kicker: "Sortie d'erreur",
          title: "Rejet d'une décision invalide",
          body: "Une décision invalide n'est jamais appliquée : l'opérateur ne reçoit pas de texte libre écrit par le modèle.",
          tags: [{ t: 'Jamais appliquée', k: 'no' }],
        },
        { tone: 'red' },
      );

      /* autorité */
      var au = orb(g, 1120, 250, 22, 'lime');
      el('text', { x: 44, y: -1, class: 't-name', 'text-anchor': 'start' }, au, 'AUTORITÉ');
      el('text', { x: 44, y: 13, class: 't-sub', 'text-anchor': 'start' }, au, 'LE SERVEUR ÉCRIT');
      reg(
        'n_auth',
        {
          kicker: 'Étape 06 · autorité',
          title: 'Le modèle choisit, le serveur écrit',
          body: "Quel que soit le chemin, la réponse remise à l'opérateur est composée par le serveur. Le modèle ne renvoie qu'une décision structurée : il ne peut ni inventer une procédure, ni contourner la validation.",
          tags: [{ t: 'Serveur', k: 'ok' }],
        },
        [au],
      );
      chip(g, 'ch_shape', 1030, 112, 250, '{ message, checklist, followUp }', {
        kicker: 'Forme de la réponse',
        title: 'Une réponse structurée',
        body: "Le résultat final porte un message, une checklist et une suite proposée : trois champs que le serveur compose et que l'interface affiche.",
        tags: [{ t: 'message' }, { t: 'checklist' }, { t: 'followUp' }],
      });

      /* scénarios */
      note(g, 160, 336, 'scénario', '');
      var routeEls = [nDom].concat(dom),
        llmEls = [nGuard, nLlm, nNorm, nFb].concat(llm);
      chip(g, 'sc_routine', 160, 346, 128, 'Routine', {
        kicker: 'Scénario · routine',
        title: 'Résolu sans modèle',
        body: "Une interaction routinière est résolue par le moteur de domaine : aucun appel fournisseur, budgets intacts. C'est le chemin visé pour l'essentiel des échanges.",
        tags: [{ t: '0 appel IA', k: 'ok' }],
      });
      chip(g, 'sc_ambig', 160, 378, 128, 'Ambigu', {
        kicker: 'Scénario · ambigu',
        title: 'Le modèle est consulté',
        body: 'Une interaction sémantique non résolue passe par la garde de coûts, puis le fournisseur ; la décision est validée et le serveur écrit toujours la réponse.',
        tags: [
          { t: 'Garde', k: 'ok' },
          { t: 'Validation', k: 'ok' },
        ],
      });
      function focus(which) {
        function set(list, dim) {
          list.forEach(function (e) {
            e.classList.toggle('is-dim', dim);
          });
        }
        set(routeEls, which === 'ambig');
        set(llmEls, which === 'routine');
      }
      sceneState.focus = focus;
    },
    onSelect: function (id) {
      if (!sceneState.focus) return;
      if (id === 'sc_routine') sceneState.focus('routine');
      else if (id === 'sc_ambig') sceneState.focus('ambig');
      else if (id === 'n_auth' || id === 'n_op') sceneState.focus(null);
    },
  });

  /* ---------- 03 · FRONTIÈRES ---------- */
  SCENES.push({
    q: 'Quel identifiant ouvre quelle porte ?',
    tab: 'Frontières',
    label:
      'Frontières de confiance : identifiants, processus protégé et processus de démonstration',
    signal: ['Isolement', 'Un jeton ne vaut que pour son processus'],
    def: 'cr_code',
    tour: ['cr_none', 'cr_code', 'cr_ptok', 'cr_dtok', 'b_secret', 'b_ia', 'b_token'],
    build: function (g) {
      decor(g, 700, 260);
      var TX = 300,
        CY = [140, 225, 310, 395];
      var DXS = { P: 780, D: 1110 },
        DYS = [150, 250, 350];
      var crIds = ['cr_none', 'cr_code', 'cr_ptok', 'cr_dtok'];
      var doors = [
        ['dP_unlock', 'P', 0, 'Unlock'],
        ['dP_chat', 'P', 1, 'Céline chat'],
        ['dP_demo', 'P', 2, 'Session démo'],
        ['dD_unlock', 'D', 0, 'Unlock'],
        ['dD_chat', 'D', 1, 'Céline chat'],
        ['dD_demo', 'D', 2, 'Session démo'],
      ];
      /* résultats : [unlock P, chat P, démo P, unlock D, chat D, démo D] */
      var OUT = {
        cr_none: [401, 401, 404, 404, 401, 200],
        cr_code: [200, 401, 404, 404, 401, 200],
        cr_ptok: [401, 200, 404, 404, 401, 200],
        cr_dtok: [401, 401, 404, 404, 200, 200],
      };
      var NAMES = {
        cr_none: 'Aucun identifiant',
        cr_code: 'Code ShiftGuide',
        cr_ptok: 'Jeton protégé',
        cr_dtok: 'Jeton démo',
      };

      /* zones */
      [
        ['P', 'PROCESSUS PROTÉGÉ', 680],
        ['D', 'PROCESSUS DÉMO', 1010],
      ].forEach(function (z) {
        el(
          'rect',
          {
            x: z[2],
            y: 92,
            width: 200,
            height: 322,
            rx: 10,
            fill: 'rgba(45,85,255,.035)',
            stroke: 'rgba(125,155,255,.26)',
            'stroke-dasharray': '5 6',
          },
          g,
        );
        el('text', { x: z[2] + 100, y: 113, class: 't-sub', 'text-anchor': 'middle' }, g, z[1]);
      });

      /* liens */
      var links = {};
      crIds.forEach(function (c, ci) {
        links[c] = [];
        doors.forEach(function (d, di) {
          var dx = DXS[d[1]] - 30,
            dy = DYS[d[2]];
          var p = el(
            'path',
            {
              d:
                'M' +
                (TX + 28) +
                ' ' +
                CY[ci] +
                ' C ' +
                (TX + 250) +
                ' ' +
                CY[ci] +
                ', ' +
                (dx - 250) +
                ' ' +
                dy +
                ', ' +
                dx +
                ' ' +
                dy,
              class: 'lnk',
            },
            g,
          );
          var x = el('g', { class: 'xmark' }, g);
          var pt = { x: (TX + dx) / 2, y: (CY[ci] + dy) / 2 };
          try {
            pt = p.getPointAtLength(p.getTotalLength() * 0.86);
          } catch (e) {}
          el('line', { x1: pt.x - 5, y1: pt.y - 5, x2: pt.x + 5, y2: pt.y + 5 }, x);
          el('line', { x1: pt.x - 5, y1: pt.y + 5, x2: pt.x + 5, y2: pt.y - 5 }, x);
          links[c].push({ p: p, x: x });
        });
      });

      var crData = {
        cr_none: {
          kicker: 'Identifiant · aucun',
          title: 'Aucun identifiant',
          body: "Un visiteur anonyme. Il ne peut franchir que la porte publique : créer une session sur l'origine de démonstration. Tout le reste répond 401 ou 404.",
          tags: [
            { t: 'Démo · session', k: 'ok' },
            { t: 'Le reste', k: 'no' },
          ],
        },
        cr_code: {
          kicker: 'Identifiant · code',
          title: 'Le code ShiftGuide',
          body: "Comparé côté serveur, limité à 10 tentatives par 10 minutes et par IP. Il n'ouvre que l'unlock du processus protégé — l'origine de démonstration ne l'expose pas (404).",
          tags: [{ t: 'Unlock protégé', k: 'ok' }, { t: '10 essais / 10 min' }],
        },
        cr_ptok: {
          kicker: 'Identifiant · session protégée',
          title: 'Le jeton protégé',
          body: "Émis par le processus protégé après un unlock réussi, et connu de sa mémoire seulement. Il ouvre le chat Céline protégé — et rien d'autre.",
          tags: [{ t: 'Chat protégé', k: 'ok' }, { t: 'Process-local' }],
        },
        cr_dtok: {
          kicker: 'Identifiant · session démo',
          title: 'Le jeton démo',
          body: 'Émis par la démo publique, valable 30 minutes, propre à son origine. Le processus protégé ne le connaît pas et le refuse (401).',
          tags: [{ t: 'Chat démo', k: 'ok' }, { t: '30 min' }],
        },
      };
      var crOrbs = {};
      crIds.forEach(function (c, i) {
        var o = orb(g, TX, CY[i], 24, null);
        o.querySelector('.orb-dot').setAttribute('r', 4);
        el('text', { x: -40, y: 4, class: 't-name', 'text-anchor': 'end' }, o, up(NAMES[c]));
        reg(c, crData[c], [o]);
        crOrbs[c] = o;
      });
      el('text', { x: 172, y: 98, class: 'sl-ttl' }, g, 'PRÉSENTER UN IDENTIFIANT ›');

      var doorData = {
        dP_unlock: {
          kicker: 'Processus protégé · POST /api/shiftguide/unlock',
          title: 'Unlock',
          body: 'Échange un code correct contre une session protégée ; sinon 401, puis 429 au-delà de 10 tentatives par 10 minutes et par IP.',
          tags: [{ t: 'Code requis' }],
        },
        dP_chat: {
          kicker: 'Processus protégé · POST /api/celine/chat',
          title: 'Céline chat',
          body: 'Exige une session valide de CE processus (sinon 401), puis applique 60 requêtes par minute et par IP, 30 par session.',
          tags: [{ t: 'Session protégée' }],
        },
        dP_demo: {
          kicker: 'Processus protégé · POST /api/public-demo/session',
          title: 'Session démo',
          body: "Répond 404 : le processus protégé n'expose pas la démonstration publique, il ne fait que publier l'adresse de l'origine isolée.",
          tags: [{ t: '404', k: 'no' }],
        },
        dD_unlock: {
          kicker: 'Processus démo · POST /api/shiftguide/unlock',
          title: 'Unlock',
          body: "Répond 404 : l'origine de démonstration n'expose pas la route de déverrouillage protégée.",
          tags: [{ t: '404', k: 'no' }],
        },
        dD_chat: {
          kicker: 'Processus démo · POST /api/celine/chat',
          title: 'Céline chat (scénarisé)',
          body: "Exige un jeton démo. Le fournisseur est scénarisé : aucun appel IA externe, et les limites de chat existantes s'appliquent.",
          tags: [{ t: 'Jeton démo' }, { t: 'Scripté' }],
        },
        dD_demo: {
          kicker: 'Processus démo · POST /api/public-demo/session',
          title: 'Session démo',
          body: 'Crée une session synthétique sans secret : 30 minutes, 12 créations par 10 minutes et par IP, 100 sessions actives au plus (503 au-delà).',
          tags: [{ t: 'Sans secret', k: 'ok' }, { t: '12 / 10 min / IP' }],
        },
      };
      var doorSubs = [];
      doors.forEach(function (d) {
        var o = orb(g, DXS[d[1]], DYS[d[2]], 22, null);
        o.classList.add('door');
        o.querySelector('.orb-dot').setAttribute('r', 4);
        nodeLabels(o, 22, d[3], '—', 'bottom');
        reg(d[0], doorData[d[0]], [o]);
        doorSubs.push({ orb: o, sub: o.querySelectorAll('text')[1] });
      });

      [
        [
          'b_secret',
          'Sans secret',
          172,
          150,
          'Propriété · démo',
          'Aucun secret dans la démo',
          "L'origine de démonstration n'expose pas la route de déverrouillage, n'accède pas à la configuration protégée et fonctionne avec des fixtures synthétiques du dépôt.",
          [{ t: 'Fixtures' }],
        ],
        [
          'b_ia',
          'Sans IA externe',
          332,
          170,
          'Propriété · démo',
          'Réponses scénarisées',
          "Le fournisseur de la démo est un script : l'écran garde visibles les mentions « données fictives » et « réponses scénarisées — aucun appel IA externe » tant que la session est active.",
          [{ t: 'Scripté' }],
        ],
        [
          'b_token',
          'Jeton non transférable',
          522,
          210,
          'Propriété · isolement',
          'Un jeton, un processus',
          "Un jeton de démo est propre à son processus et à son origine : le service protégé ne l'accepte pas. La création de sessions est bornée — 12 par 10 minutes et par IP, 100 actives, 30 minutes.",
          [{ t: 'Borné' }],
        ],
      ].forEach(function (c) {
        chip(g, c[0], c[2], 440, c[3], c[1], { kicker: c[4], title: c[5], body: c[6], tags: c[7] });
      });

      var LABEL = {
        200: ['200 · OK', 'out-ok'],
        401: ['401 · REFUSÉ', 'out-no'],
        404: ['404 · ABSENT', 'out-no'],
      };
      function paint(c) {
        crIds.forEach(function (k) {
          crOrbs[k].classList.remove('ok');
        });
        crOrbs[c].classList.add('ok');
        links[c].forEach(function (L, i) {
          var code = OUT[c][i];
          L.p.setAttribute('class', 'lnk ' + (code === 200 ? 'ok' : 'no'));
          L.x.setAttribute('class', 'xmark' + (code === 200 ? '' : ' on'));
        });
        crIds.forEach(function (k) {
          if (k === c) return;
          links[k].forEach(function (L) {
            L.p.setAttribute('class', 'lnk');
            L.x.setAttribute('class', 'xmark');
          });
        });
        doorSubs.forEach(function (d, i) {
          var code = OUT[c][i],
            L = LABEL[code];
          d.sub.textContent = trc(L[0]);
          d.sub.setAttribute('class', 't-sub ' + L[1]);
          d.orb.classList.toggle('ok', code === 200);
          d.orb.classList.toggle('no', code !== 200);
        });
      }
      sceneState.paint = paint;
      paint('cr_code');
    },
    onSelect: function (id) {
      if (sceneState.paint && /^cr_/.test(id)) sceneState.paint(id);
    },
  });

  /* ---------- 04 · STOCKAGE ---------- */
  SCENES.push({
    q: "Que se passe-t-il quand le stockage ou un second onglet s'en mêle ?",
    tab: 'Stockage',
    label:
      'Résilience du stockage navigateur : fail-closed, dégradation en mémoire et verrou multi-onglets',
    signal: ['Principe', 'Fermer sur le secret, dégrader sur le reste'],
    def: 'a_res',
    tour: ['a_write', 'a_read', 'a_res', 'st_ko', 'b_mirror', 'b_res', 'st_ok', 'lk_off', 'lk_on'],
    build: function (g) {
      decor(g, 720, 250);
      el('line', { x1: 656, y1: 92, x2: 656, y2: 436, class: 'grid-l' }, g);
      var YA = 200,
        YB = 352,
        XS = [240, 400, 560];
      function flow(x1, x2, y) {
        el(
          'path',
          { d: 'M' + (x1 + 22) + ' ' + y + ' L' + (x2 - 22) + ' ' + y, class: 'edge-line' },
          g,
        );
      }
      el('text', { x: 172, y: YA - 50, class: 'sl-ttl' }, g, 'SESSION · SESSIONSTORAGE');
      el('text', { x: 172, y: YB - 50, class: 'sl-ttl' }, g, 'PROGRESSION · LOCALSTORAGE');
      flow(XS[0], XS[1], YA);
      flow(XS[1], XS[2], YA);
      flow(XS[0], XS[1], YB);
      flow(XS[1], XS[2], YB);

      var aW = node(g, 'a_write', XS[0], YA, 16, 'Écriture', 'Enregistrement complet', {
        kicker: 'Session · étape 1',
        title: 'Un enregistrement logique unique',
        body: "Le jeton, la charge utile protégée, l'expiration, la révision de configuration et la révision d'autorité de Céline vivent dans sessionStorage et forment un seul enregistrement : ils s'écrivent ensemble.",
        tags: [{ t: 'sessionStorage' }],
      });
      var aR = node(g, 'a_read', XS[1], YA, 16, 'Relecture', 'Vérification', {
        kicker: 'Session · étape 2',
        title: "On relit ce qu'on vient d'écrire",
        body: "L'unlock relit l'enregistrement pour le vérifier. Une lecture qui lève une exception vaut identifiants absents : jamais une valeur présumée.",
        tags: [{ t: 'Relecture' }],
      });
      var aX = node(g, 'a_res', XS[2], YA, 16, 'Session ouverte', 'Fail-closed', {
        kicker: 'Session · résultat',
        title: 'Fermer sur le secret',
        body: "Sans sessionStorage, ProtoCap ne retombe pas sur la mémoire du processus : aucun jeton n'est conservé dans un repli applicatif. Toute opération qui échoue annule les écritures partielles — pas d'interface à moitié déverrouillée.",
        tags: [{ t: 'Fail-closed', k: 'ok' }, { t: 'Rollback' }],
      });
      var bW = node(g, 'b_write', XS[0], YB, 16, 'Écriture', 'État non sensible', {
        kicker: 'Progression · étape 1',
        title: 'Un état qui ne demande pas le secret',
        body: "La progression de procédure, l'historique de Céline et la préférence du cockpit passent par la frontière de stockage résiliente : un autre niveau de confiance, donc une autre politique d'échec.",
        tags: [{ t: 'localStorage' }],
      });
      var bM = node(g, 'b_mirror', XS[1], YB, 16, 'Miroir mémoire', 'Bascule si refus', {
        kicker: 'Progression · étape 2',
        title: 'Un miroir en mémoire',
        body: "L'adaptateur reflète chaque valeur lue ou écrite. Si le navigateur rejette une lecture, une écriture, une suppression ou une énumération (bloqué, indisponible, quota), il bascule sur ce miroir pour la durée de la page.",
        tags: [{ t: 'Page seulement' }],
      });
      var bX = node(g, 'b_res', XS[2], YB, 16, 'Persisté', 'localStorage', {
        kicker: 'Progression · résultat',
        title: 'Dégrader sans mentir',
        body: "Continuité plutôt que plantage pour un état non sensible — mais sans prétendre à la durabilité : ShiftGuide affiche un avertissement, les changements peuvent être perdus au rechargement. Le repli n'est pas synchronisé entre onglets.",
        tags: [{ t: 'Avertissement', k: 'ok' }],
      });

      function setRes(o, name, sub, cls) {
        var t = o.querySelectorAll('text');
        t[0].textContent = trc(up(name));
        t[1].textContent = trc(up(sub));
        t[0].setAttribute('class', 't-name ' + cls);
      }
      var storeOk = true;
      function paintStore(ok) {
        storeOk = ok;
        [aW, aR, aX, bW, bM, bX].forEach(function (o) {
          o.classList.remove('ok', 'no', 'is-dim');
          o.classList.remove('tone-amber');
        });
        if (ok) {
          setRes(aX, 'Session ouverte', 'Enregistrement vérifié', 'out-ok');
          setRes(bX, 'Persisté', 'localStorage', 'out-ok');
          aX.classList.add('ok');
          bX.classList.add('ok');
        } else {
          aW.classList.add('no');
          aR.classList.add('is-dim');
          aX.classList.add('no');
          setRes(aX, 'Verrouillé', 'Rollback · aucun jeton gardé', 'out-no');
          bW.classList.add('no');
          bM.classList.add('ok');
          bX.classList.add('tone-amber');
          setRes(bX, 'Mémoire seule', 'Avertissement affiché', 'out-warn');
        }
      }
      chip(g, 'st_ok', 172, 84, 170, 'Stockage disponible', {
        kicker: 'Scénario · stockage OK',
        title: 'Le navigateur répond',
        body: 'Session complète vérifiée, progression persistée : le comportement normal.',
        tags: [{ t: 'Nominal', k: 'ok' }],
      });
      chip(g, 'st_ko', 352, 84, 160, 'Stockage bloqué', {
        kicker: 'Scénario · stockage refusé',
        title: "Le navigateur refuse d'écrire",
        body: "La session se ferme et se réinitialise ; la progression, elle, continue en mémoire avec un avertissement. Deux niveaux de confiance, deux politiques d'échec assumées.",
        tags: [{ t: 'Session : fermée', k: 'no' }, { t: 'Progression : dégradée' }],
      });

      /* course entre deux onglets */
      var raceG = el('g', null, g);
      chip(g, 'lk_off', 700, 84, 150, 'Sans verrou', {
        kicker: 'Scénario · deux onglets, sans verrou',
        title: 'Lire, modifier, écrire : la course',
        body: 'Écrire une clé est atomique, mais une mise à jour de progression est lire → modifier → écrire. Deux onglets lisent le même instantané, et le dernier à écrire efface silencieusement le travail du premier.',
        tags: [{ t: 'Mise à jour perdue', k: 'no' }],
      });
      chip(g, 'lk_on', 860, 84, 190, 'Avec Web Locks', {
        kicker: 'Scénario · deux onglets, avec verrou',
        title: 'Un verrou exclusif par origine',
        body: "Toute la transaction — lire le document frais, appliquer l'intention, écrire, notifier — s'exécute sous un verrou Web Locks. Sans Web Locks : file FIFO dans la page et avertissement. Local à l'origine : aucune synchronisation entre appareils.",
        tags: [{ t: 'Sérialisé', k: 'ok' }, { t: 'Révision liée' }],
      });
      var rmode = null;
      function race(mode) {
        if (rmode === mode) return;
        rmode = mode;
        clear(raceG);
        var rows =
          mode === 'off'
            ? [
                [0, 'Lit {}', '{ }'],
                [1, 'Lit {}', '{ }'],
                [0, 'Écrit {X}', '{ X }'],
                [1, 'Écrit {Y}', '{ Y }', 'bad'],
              ]
            : [
                [0, 'Prend le verrou', '{ }'],
                [0, 'Lit {} · écrit {X}', '{ X }'],
                [1, 'Attend le verrou…', '{ X }', 'wait'],
                [1, 'Lit {X} · écrit {X,Y}', '{ X, Y }', 'good'],
              ];
        el('text', { x: 775, y: 132, class: 't-name', 'text-anchor': 'middle' }, raceG, 'ONGLET A');
        el('text', { x: 990, y: 132, class: 't-name', 'text-anchor': 'middle' }, raceG, 'ONGLET B');
        el(
          'text',
          { x: 1104, y: 132, class: 't-name', 'text-anchor': 'start' },
          raceG,
          'PROGRESSION',
        );
        rows.forEach(function (r, i) {
          var y = 152 + i * 54;
          var grp = el('g', { class: 'ev' + (r[3] ? ' ' + r[3] : ''), style: 'opacity:0' }, raceG);
          el('line', { x1: 685, y1: y + 17, x2: 1280, y2: y + 17, class: 'grid-l' }, grp);
          var cxr = r[0] ? 990 : 775;
          el('rect', { x: cxr - 92, y: y, width: 184, height: 34, rx: 6, class: 'ev-bg' }, grp);
          el('text', { x: cxr, y: y + 21, class: 'chip-txt' }, grp, up(r[1]));
          el('text', { x: 1104, y: y + 22, class: 'ev-state' }, grp, r[2]);
          later(
            function () {
              grp.style.opacity = 1;
            },
            state.anim ? 380 * i + 60 : 0,
          );
        });
        var v = el('g', { style: 'opacity:0', class: 'ev' }, raceG);
        if (mode === 'off') {
          el('text', { x: 685, y: 400, class: 'pc-big out-no' }, v, 'LA MISE À JOUR X EST PERDUE');
          el(
            'text',
            { x: 685, y: 420, class: 'sl-txt' },
            v,
            "LE DERNIER ÉCRIVAIN ÉCRASE : B AVAIT LU {} AVANT QUE A N'ÉCRIVE",
          );
        } else {
          el('text', { x: 685, y: 400, class: 'pc-big out-ok' }, v, 'X ET Y SONT CONSERVÉES');
          el(
            'text',
            { x: 685, y: 420, class: 'sl-txt' },
            v,
            'B ATTEND, PUIS LIT UN DOCUMENT FRAIS : LIRE → ÉCRIRE EST SÉRIALISÉ',
          );
        }
        later(
          function () {
            v.style.opacity = 1;
          },
          state.anim ? 380 * 4 + 120 : 0,
        );
      }
      sceneState.act = function (id) {
        if (id === 'st_ok') paintStore(true);
        else if (id === 'st_ko') paintStore(false);
        else if (id === 'lk_off') race('off');
        else if (id === 'lk_on') race('on');
      };
      paintStore(true);
      race('off');
    },
    onSelect: function (id) {
      if (sceneState.act) sceneState.act(id);
    },
  });

  /* ---------- 05 · PACKING ---------- */
  SCENES.push({
    q: 'Combien préparer, et où en est-on ?',
    tab: 'Packing',
    label: "Packing : politiques d'arrondi et cockpit de déclarations, calcul réel",
    signal: ['Calcul', 'Entiers sûrs · dépassement refusé'],
    def: 'pol_ct',
    tour: ['pol_no', 'pol_ct', 'pol_pl', 'pk_cockpit'],
    build: function (g) {
      decor(g, 740, 250);
      var P = { qty: 2500, upc: 24, cpp: 20, cad: 60 };
      var plan = null,
        policy = 'round-carton',
        declared = 0,
        log = [],
        msg = { t: '', k: '' };
      var POLID = { 'no-overrun': 'pol_no', 'round-carton': 'pol_ct', 'round-pallet': 'pol_pl' };
      function fmt(n) {
        return Math.round(n).toLocaleString(TR === null ? 'fr-FR' : 'en-US');
      }

      function compute() {
        var upp = P.upc * P.cpp,
          pal = Math.floor(P.qty / upp),
          rest = P.qty % upp;
        var ctn = Math.floor(rest / P.upc),
          un = rest % P.upc;
        var exact = {
          pol: 'no-overrun',
          label: 'Sans dépassement',
          pal: pal,
          ctn: ctn,
          un: un,
          total: P.qty,
          variance: 0,
        };
        var cc = un > 0 ? ctn + 1 : ctn,
          rct = pal * upp + cc * P.upc;
        var rc = {
          pol: 'round-carton',
          label: 'Carton complet',
          pal: pal,
          ctn: cc,
          un: 0,
          total: rct,
          variance: rct - P.qty,
        };
        var pc = rest > 0 ? pal + 1 : pal,
          rp = pc * upp;
        var rpo = {
          pol: 'round-pallet',
          label: 'Palette complète',
          pal: pc,
          ctn: 0,
          un: 0,
          total: rp,
          variance: rp - P.qty,
        };
        return { opts: [exact, rc, rpo], rec: rc.variance === 0 ? exact : rc, upp: upp };
      }
      var C = compute();
      function pickPlan() {
        plan = C.opts.filter(function (o) {
          return o.pol === policy;
        })[0];
      }
      pickPlan();

      /* --- curseurs --- */
      var SX = 172,
        SW = 250;
      var sliders = [
        [
          'qty',
          'QUANTITÉ À PRÉPARER',
          100,
          10000,
          10,
          function (v) {
            return fmt(v) + ' U';
          },
        ],
        [
          'upc',
          'UNITÉS PAR CARTON',
          4,
          48,
          1,
          function (v) {
            return v + ' U';
          },
        ],
        [
          'cpp',
          'CARTONS PAR PALETTE',
          4,
          40,
          1,
          function (v) {
            return v + ' CTN';
          },
        ],
        [
          'cad',
          'CADENCE',
          10,
          300,
          10,
          function (v) {
            return v + ' U / MIN';
          },
        ],
      ];
      sliders.forEach(function (s, i) {
        var y0 = 112 + i * 70;
        el('text', { x: SX, y: y0, class: 'sl-ttl' }, g, s[1]);
        var val = el('text', { x: SX + SW, y: y0, class: 'sl-val', 'text-anchor': 'end' }, g, '');
        var sl = slider(
          g,
          SX,
          y0 + 24,
          SW,
          s[2],
          s[3],
          s[4],
          P[s[0]],
          function (v) {
            P[s[0]] = v;
            val.textContent = trc(s[5](v));
            if (s[0] === 'cad') {
              paintCock();
              return;
            }
            C = compute();
            pickPlan();
            declared = 0;
            log = [];
            msg = { t: '', k: '' };
            drawCards();
            paintCock();
          },
          s[1],
        );
        val.textContent = trc(s[5](P[s[0]]));
        el('text', { x: SX, y: y0 + 46, class: 'sl-txt' }, g, fmt(s[2]));
        el('text', { x: SX + SW, y: y0 + 46, class: 'sl-txt', 'text-anchor': 'end' }, g, fmt(s[3]));
      });
      note(g, SX, 424, 'démo', 'logique de packing.ts · même arithmétique');

      function choose(p) {
        if (p === policy) return;
        policy = p;
        pickPlan();
        declared = 0;
        log = [];
        msg = { t: '', k: '' };
        drawCards();
        paintCock();
      }
      sceneState.choose = function (id) {
        for (var k in POLID) if (POLID[k] === id) choose(k);
      };

      /* --- cartes de politique --- */
      var cardsG = el('g', null, g);
      var POLDATA = {
        'no-overrun': {
          kicker: 'Politique · sans dépassement',
          title: 'Sans dépassement',
          body: "Exactement la quantité demandée : palettes complètes, cartons complets, puis unités isolées. Aucun article de trop — au prix d'un carton entamé.",
          tags: [{ t: 'Écart 0' }],
        },
        'round-carton': {
          kicker: 'Politique · carton complet',
          title: 'Carton complet',
          body: "Arrondit le reste au carton supérieur : plus de carton entamé, avec un léger écart positif. C'est la recommandation par défaut, sauf si l'écart est nul — alors la politique exacte suffit.",
          tags: [{ t: 'Recommandée', k: 'ok' }],
        },
        'round-pallet': {
          kicker: 'Politique · palette complète',
          title: 'Palette complète',
          body: "Arrondit à la palette entière : simple à expédier, mais l'écart peut être important. Utile seulement quand la palette est l'unité de décision.",
          tags: [{ t: 'Écart maximal' }],
        },
      };
      function drawCards() {
        clear(cardsG);
        note(cardsG, 480, 96, 'politique', 'cliquer pour choisir le plan');
        C.opts.forEach(function (o, i) {
          var x = 480,
            y = 108 + i * 102,
            w = 396,
            h = 90;
          var cg = el('g', { class: 'card2' + (o.pol === policy ? ' sel' : '') }, cardsG);
          el('rect', { x: x, y: y, width: w, height: h, rx: 8, class: 'card2-bg' }, cg);
          el(
            'text',
            { x: x + 18, y: y + 26, class: 't-name', 'text-anchor': 'start' },
            cg,
            up(o.label),
          );
          if (o === C.rec) {
            el(
              'rect',
              {
                x: x + w - 112,
                y: y + 12,
                width: 96,
                height: 18,
                rx: 9,
                class: 'tag-bg',
                stroke: 'rgba(200,255,46,.7)',
              },
              cg,
            );
            el(
              'text',
              { x: x + w - 64, y: y + 24.5, class: 'tag-txt', fill: '#c8ff2e' },
              cg,
              'RECOMMANDÉ',
            );
          }
          var big = o.pal + ' PAL · ' + o.ctn + ' CTN' + (o.un ? ' · ' + o.un + ' U' : '');
          el('text', { x: x + 18, y: y + 58, class: 'pc-big' }, cg, big);
          el(
            'text',
            { x: x + 18, y: y + 77, class: 'sl-txt' },
            cg,
            '= ' +
              fmt(o.total) +
              ' U PRÉPARÉES  ·  ÉCART ' +
              (o.variance ? '+' + fmt(o.variance) : '0'),
          );
          reg(POLID[o.pol], POLDATA[o.pol], [cg], { noHover: true });
          cg.addEventListener('click', function () {
            choose(o.pol);
          });
        });
        if (state.sel && items[state.sel])
          items[state.sel].els.forEach(function (e) {
            e.classList.add('is-active');
          });
      }

      /* --- cockpit --- */
      var CX = 920,
        CW = 360;
      var cockG = el('g', { class: 'card2' }, g);
      el(
        'rect',
        { x: CX - 12, y: 92, width: CW + 24, height: 336, rx: 8, class: 'card2-bg' },
        cockG,
      );
      reg(
        'pk_cockpit',
        {
          kicker: 'Démonstration · cockpit de déclarations',
          title: 'Une déclaration à la fois, jamais au-delà du plan',
          body: "Chaque déclaration (palette, carton, unité) s'ajoute à l'historique ; celle qui dépasserait le plan est refusée, la dernière peut être annulée. Toute l'arithmétique reste en entiers sûrs, et le temps restant est un plafond entier.",
          tags: [{ t: 'Événements' }, { t: 'Number.isSafeInteger' }],
        },
        [cockG],
        { noHover: false },
      );
      el('text', { x: CX, y: 116, class: 'sl-ttl' }, g, 'COCKPIT · DÉCLARATIONS');
      var planT = el('text', { x: CX, y: 142, class: 'pc-mid' }, g, '');
      var loadT = el('text', { x: CX, y: 162, class: 'sl-txt' }, g, '');
      el('rect', { x: CX, y: 176, width: CW, height: 8, rx: 4, fill: 'rgba(140,165,220,.16)' }, g);
      var bar = el('rect', { x: CX, y: 176, width: 0, height: 8, rx: 4, fill: '#2d55ff' }, g);
      var progT = el('text', { x: CX, y: 208, class: 'sl-val' }, g, '');
      var durT = el('text', { x: CX, y: 228, class: 'sl-txt' }, g, '');
      var msgT = el('text', { x: CX, y: 336, class: 'pc-msg' }, g, '');
      el('text', { x: CX, y: 362, class: 'sl-ttl' }, g, 'HISTORIQUE');
      var logT = [0, 1, 2].map(function (i) {
        return el('text', { x: CX, y: 381 + i * 15, class: 'sl-txt' }, g, '');
      });

      function declare(add, name) {
        var target = plan.total;
        if (declared + add > target) {
          msg = {
            t: 'Refusé · dépasserait le plan de ' + fmt(declared + add - target) + ' u',
            k: 'out-no',
          };
        } else {
          declared += add;
          log.push({ n: name, a: add });
          msg = { t: 'Déclaré · +' + fmt(add) + ' u', k: 'out-ok' };
        }
        paintCock();
      }
      function undo() {
        var l = log.pop();
        if (l) {
          declared -= l.a;
          msg = { t: 'Annulé · −' + fmt(l.a) + ' u', k: '' };
        } else msg = { t: 'Rien à annuler', k: '' };
        paintCock();
      }
      function reset() {
        declared = 0;
        log = [];
        msg = { t: 'Suivi remis à zéro', k: '' };
        paintCock();
      }
      button(
        g,
        CX,
        244,
        112,
        '+1 palette',
        function () {
          declare(C.upp, '+1 palette');
        },
        'Déclarer une palette',
      );
      button(
        g,
        CX + 122,
        244,
        104,
        '+1 carton',
        function () {
          declare(P.upc, '+1 carton');
        },
        'Déclarer un carton',
      );
      button(
        g,
        CX + 236,
        244,
        100,
        '+1 unité',
        function () {
          declare(1, '+1 unité');
        },
        'Déclarer une unité',
      );
      button(g, CX, 282, 104, 'Annuler', undo, 'Annuler la dernière déclaration');
      button(g, CX + 114, 282, 150, 'Remise à zéro', reset, 'Remettre le suivi à zéro');

      function paintCock() {
        var t = plan.total,
          rem = t - declared;
        planT.textContent = trc('PLAN · ' + fmt(t) + ' U · ' + up(plan.label));
        var full = plan.pal + Math.floor(plan.ctn / P.cpp),
          pc = plan.ctn % P.cpp,
          remU = pc * P.upc + plan.un;
        loadT.textContent =
          full +
          tr(full > 1 ? ' PALETTES PLEINES' : ' PALETTE PLEINE') +
          (remU > 0 ? tr('  +  1 PARTIELLE') : '');
        bar.setAttribute('width', ((CW * declared) / t).toFixed(1));
        progT.textContent = trc(
          fmt(declared) + ' / ' + fmt(t) + ' U   ·   RESTE ' + fmt(rem) + ' U',
        );
        durT.textContent = trc(
          rem > 0
            ? '≈ ' + fmt(Math.ceil(rem / P.cad)) + ' MIN RESTANTES À ' + P.cad + ' U / MIN'
            : 'PLAN ATTEINT · RIEN À DÉCLARER',
        );
        msgT.textContent = trc(msg.t);
        msgT.setAttribute('class', 'pc-msg ' + msg.k);
        logT.forEach(function (x, i) {
          var l = log[log.length - 1 - i];
          x.textContent = trc(
            l ? log.length - i + ' ·  ' + up(l.n) + '  ·  +' + fmt(l.a) + ' U' : '',
          );
        });
      }
      drawCards();
      paintCock();
    },
    onSelect: function (id) {
      if (sceneState.choose) sceneState.choose(id);
    },
  });

  /* ---------- 06 · LOGISTIQUE ---------- */
  SCENES.push({
    q: "Qu'a le droit de devenir une demande ?",
    tab: 'Logistique',
    label: "Logistics Call : machine à états d'une demande et transitions autorisées",
    signal: ['Invariant', 'Un statut terminal ne se rouvre pas'],
    def: 'st_waiting',
    tour: ['st_waiting', 'st_seen', 'st_inProgress', 'st_pickedUp', 'st_cancelled', 'lg_store'],
    build: function (g) {
      decor(g, 700, 255);
      var R = 38;
      var ST = {
        waiting: { x: 250, y: 255, name: 'En attente', lab: ['EN', 'ATTENTE'], tone: null },
        seen: { x: 510, y: 255, name: 'Vu', lab: ['VU'], tone: null },
        inProgress: { x: 770, y: 255, name: 'En cours', lab: ['EN COURS'], tone: null },
        pickedUp: { x: 1090, y: 165, name: 'Récupéré', lab: ['RÉCUPÉRÉ'], tone: 'lime' },
        cancelled: { x: 1090, y: 345, name: 'Annulé', lab: ['ANNULÉ'], tone: 'red' },
      };
      var ALLOWED = {
        waiting: ['seen', 'inProgress', 'pickedUp', 'cancelled'],
        seen: ['inProgress', 'pickedUp', 'cancelled'],
        inProgress: ['pickedUp', 'cancelled'],
        pickedUp: [],
        cancelled: [],
      };
      var TERMINAL = { pickedUp: true, cancelled: true };
      var ARCS = [
        ['waiting', 'seen', 'M290 255 L468 255'],
        ['seen', 'inProgress', 'M550 255 L728 255'],
        ['waiting', 'inProgress', 'M262 221 C 350 120, 660 120, 751 222'],
        ['seen', 'pickedUp', 'M517 218 C 620 80, 930 60, 1053 158'],
        ['waiting', 'pickedUp', 'M246 217 C 290 50, 900 20, 1059 143'],
        ['inProgress', 'pickedUp', 'M806 240 Q940 190 1054 178'],
        ['inProgress', 'cancelled', 'M803 274 Q930 330 1054 332'],
        ['seen', 'cancelled', 'M520 292 C 640 400, 940 410, 1053 352'],
        ['waiting', 'cancelled', 'M260 291 C 330 450, 950 450, 1059 367'],
      ];
      var arcEls = ARCS.map(function (a) {
        return el('path', { d: a[2], class: 'lnk fsm' }, g);
      });

      var INFO = {
        waiting: [
          'Statut initial',
          'En attente',
          'Une demande naît en attente. Elle peut passer à Vu, En cours, Récupéré ou Annulé : quatre issues, dont deux terminales.',
          [{ t: 'Initial' }, { t: '4 issues' }],
        ],
        seen: [
          'Statut intermédiaire',
          'Vu',
          'La demande a été vue mais pas encore prise en charge. Elle peut passer à En cours, Récupéré ou Annulé — jamais revenir à En attente.',
          [{ t: '3 issues' }],
        ],
        inProgress: [
          'Statut intermédiaire',
          'En cours',
          'La prise en charge a commencé. Seules deux sorties restent possibles : Récupéré ou Annulé. Un statut ne recule pas.',
          [{ t: '2 issues' }],
        ],
        pickedUp: [
          'Statut terminal',
          'Récupéré',
          "Fin heureuse du cycle. Le statut est terminal : plus aucune transition n'est acceptée, et l'heure de fin (completedAt) est écrite.",
          [{ t: 'Terminal', k: 'ok' }, { t: 'completedAt' }],
        ],
        cancelled: [
          'Statut terminal',
          'Annulé',
          'Fin par annulation. Terminal lui aussi : une demande annulée ne se rouvre pas, et son heure de fin est écrite.',
          [{ t: 'Terminal', k: 'no' }, { t: 'completedAt' }],
        ],
      };
      var cur = 'waiting',
        orbs = {};
      Object.keys(ST).forEach(function (k) {
        var s = ST[k],
          o = orb(g, s.x, s.y, R, s.tone);
        o.querySelector('.orb-dot').remove();
        s.lab.forEach(function (t, i) {
          el('text', { x: 0, y: s.lab.length === 1 ? 4 : -2 + i * 13, class: 't-name' }, o, t);
        });
        reg(
          'st_' + k,
          { kicker: INFO[k][0], title: INFO[k][1], body: INFO[k][2], tags: INFO[k][3] },
          [o],
        );
        o.addEventListener('click', function () {
          tryMove(k);
        });
        orbs[k] = o;
      });
      var stT = el('text', { x: 172, y: 430, class: 'sl-val' }, g, '');
      var msgT = el('text', { x: 172, y: 454, class: 'pc-msg' }, g, '');
      el(
        'text',
        { x: 1280, y: 454, class: 'sl-txt', 'text-anchor': 'end' },
        g,
        'CLIQUER UN STATUT POUR TENTER LA TRANSITION',
      );

      function paint() {
        Object.keys(orbs).forEach(function (k) {
          orbs[k].classList.toggle('cur', k === cur);
        });
        ARCS.forEach(function (a, i) {
          var ok = a[0] === cur && ALLOWED[cur].indexOf(a[1]) >= 0;
          arcEls[i].setAttribute('class', 'lnk fsm' + (ok ? ' ok' : ''));
        });
        stT.textContent = trc('ÉTAT ACTUEL  ›  ' + up(ST[cur].name));
      }
      function flash(k) {
        orbs[k].classList.remove('shake');
        void orbs[k].getBoundingClientRect();
        orbs[k].classList.add('shake');
        later(function () {
          orbs[k].classList.remove('shake');
        }, 600);
      }
      function tryMove(to) {
        if (to === cur) return;
        if (ALLOWED[cur].indexOf(to) >= 0) {
          var from = cur;
          cur = to;
          msgT.textContent = trc(
            'Transition autorisée · ' +
              ST[from].name +
              ' → ' +
              ST[to].name +
              (TERMINAL[to] ? ' · completedAt écrit' : ''),
          );
          msgT.setAttribute('class', 'pc-msg out-ok');
        } else {
          msgT.textContent = trc(
            TERMINAL[cur]
              ? 'Refusé · ' + ST[cur].name + ' est terminal : aucune sortie possible'
              : 'Refusé · un statut ne recule jamais (' + ST[cur].name + ' → ' + ST[to].name + ')',
          );
          msgT.setAttribute('class', 'pc-msg out-no');
          flash(to);
        }
        paint();
      }
      button(
        g,
        1000,
        84,
        130,
        'Réinitialiser',
        function () {
          cur = 'waiting';
          msgT.textContent = trc('');
          paint();
        },
        'Remettre la demande en attente',
      );
      chip(g, 'lg_store', 1140, 84, 140, 'Persistance', {
        kicker: 'Stockage · lineops.logistics.requests.v9',
        title: "Une écriture est relue avant d'être crue",
        body: "La demande vit dans le navigateur. Chaque écriture est vérifiée par relecture, et l'état de la persistance (prête, mémoire, migration en attente, récupération, lecture seule, dégradée, échec d'écriture) est exposé plutôt que masqué. Aucun envoi vers un autre poste.",
        tags: [{ t: 'Navigateur' }, { t: 'Verify-after-write' }],
      });
      paint();
    },
  });

  /* ---------- 07 · PÉREMPTION ---------- */
  SCENES.push({
    q: 'Cette validité est-elle fiable ?',
    tab: 'Péremption',
    label: "Expiry Check : dates locales, changements d'heure et statuts de péremption",
    signal: ['Dates', 'Calendrier local · jamais N × 24 h'],
    def: 'sc_overlap',
    tour: [
      'sc_normal',
      'sc_gap',
      'sc_overlap',
      'sc_days',
      'sc_bad',
      'z_exp',
      'z_warn',
      'z_ok',
      'z_unk',
    ],
    build: function (g) {
      decor(g, 720, 260);
      var SC = {
        sc_normal: {
          input: '14/10/2026 08:00',
          res: ['Heure valide · décalage +02:00', 'out-ok'],
          out: '2026-10-14T06:00:00.000Z',
        },
        sc_gap: {
          input: '29/03/2026 02:30',
          res: ["Refusée · cette heure n'existe pas", 'out-no'],
          out: "— rien n'est enregistré",
        },
        sc_overlap: {
          input: '25/10/2026 02:30',
          res: ['Ambiguë · cette heure existe deux fois', 'out-warn'],
          out: '— à choisir ci-dessous',
        },
        sc_days: {
          input: '24/10/2026 12:00  ·  validité : 1 jour',
          res: ['Jour calendaire local · calendar-days-v1', 'out-ok'],
          out: '2026-10-25T11:00:00.000Z',
        },
        sc_bad: {
          input: '2026-13-40T99:00',
          res: ['Illisible → « Date à vérifier »', 'out-warn'],
          out: '— statut unknown · jamais présumé valide',
        },
      };
      var CH = [
        [
          'sc_normal',
          'Heure normale',
          172,
          148,
          'Scénario · saisie ordinaire',
          'Un instant, un fuseau nommé',
          "Une heure locale valide est convertie en instant UTC par Temporal, à partir d'un fuseau nommé du navigateur — jamais avec un décalage codé en dur. L'exemple utilise Europe/Paris.",
          [{ t: 'Temporal' }, { t: 'Fuseau nommé' }],
        ],
        [
          'sc_gap',
          'Heure inexistante',
          330,
          170,
          "Scénario · changement d'heure de printemps",
          "Le trou du changement d'heure",
          "Le 29 mars 2026, 02:00 devient 03:00 : 02:30 n'existe pas. La saisie est refusée avec un message clair (« corrigez la saisie ») au lieu d'être décalée en silence.",
          [{ t: 'Gap', k: 'no' }],
        ],
        [
          'sc_overlap',
          'Heure en double',
          510,
          160,
          "Scénario · changement d'heure d'automne",
          "L'heure qui existe deux fois",
          "Le 25 octobre 2026, 02:30 se produit deux fois. ProtoCap n'en choisit aucune : l'utilisateur précise explicitement son décalage UTC, le premier ou le second.",
          [{ t: 'Overlap' }, { t: 'Choix explicite', k: 'ok' }],
        ],
        [
          'sc_days',
          '+1 jour',
          680,
          100,
          'Scénario · validité en jours',
          "Un jour n'est pas 24 heures",
          "La validité compte des jours du calendrier dans le fuseau de la déclaration, pas N × 24 heures. Le 25 octobre 2026 dure 25 heures : ajouter 24 h décalerait l'expiration d'une heure.",
          [{ t: 'calendar-days-v1', k: 'ok' }],
        ],
        [
          'sc_bad',
          'Donnée incohérente',
          790,
          170,
          'Scénario · donnée illisible',
          "Le doute n'est jamais « valide »",
          'Les instants stockés exigent un décalage explicite et un vrai calendrier ISO ; Date.parse est jugé trop permissif. Une donnée incohérente donne « Date à vérifier », jamais un statut rassurant.',
          [{ t: 'unknown', k: 'no' }],
        ],
      ];
      CH.forEach(function (c) {
        chip(g, c[0], c[2], 88, c[3], c[1], { kicker: c[4], title: c[5], body: c[6], tags: c[7] });
      });

      var cardG = el('g', null, g),
        pick = null;
      el(
        'rect',
        {
          x: 172,
          y: 134,
          width: 780,
          height: 294,
          rx: 8,
          class: 'card2-bg',
          fill: 'rgba(20,40,110,.10)',
        },
        g,
      );
      var body = el('g', null, g);
      function render(id) {
        var s = SC[id];
        if (!s) return;
        clear(body);
        el('text', { x: 194, y: 164, class: 'sl-ttl' }, body, 'SAISIE LOCALE');
        el('text', { x: 194, y: 192, class: 'pc-big' }, body, s.input);
        el('text', { x: 194, y: 228, class: 'sl-ttl' }, body, 'RÉSOLUTION');
        el('text', { x: 194, y: 254, class: 'pc-mid ' + s.res[1] }, body, up(s.res[0]));
        el('text', { x: 194, y: 290, class: 'sl-ttl' }, body, 'INSTANT STOCKÉ (UTC)');
        var outT = el('text', { x: 194, y: 316, class: 'pc-mid' }, body, s.out);
        if (id === 'sc_overlap') {
          var cs = [
              ['Le premier · +02:00', '2026-10-25T00:30:00.000Z', 194],
              ['Le second · +01:00', '2026-10-25T01:30:00.000Z', 404],
            ],
            btns = [];
          cs.forEach(function (c) {
            var b = button(
              body,
              c[2],
              336,
              196,
              c[0],
              function () {
                outT.textContent = trc(c[1]);
                outT.setAttribute('class', 'pc-mid out-ok');
                btns.forEach(function (x) {
                  x.classList.toggle('is-active', x === b);
                });
              },
              'Choisir : ' + tr(c[0]),
            );
            btns.push(b);
          });
        }
        if (id === 'sc_days') {
          [
            ['N × 24 H', 240, 'rgba(255,93,98,.7)', "25/10 11:00 local · faux d'une heure"],
            ['CALENDRIER LOCAL', 250, '#c8ff2e', '25/10 12:00 local · 25 h écoulées'],
          ].forEach(function (b, i) {
            var y = 346 + i * 32;
            el('text', { x: 194, y: y - 6, class: 'sl-txt' }, body, b[0]);
            el(
              'rect',
              { x: 194, y: y, width: b[1], height: 8, rx: 4, fill: b[2], opacity: 0.85 },
              body,
            );
            el('text', { x: 194 + b[1] + 14, y: y + 8, class: 'sl-txt' }, body, up(b[3]));
          });
        }
      }

      /* jauge de péremption */
      var GX = 1000,
        GW = 270,
        MIN = -24,
        MAX = 120;
      el('text', { x: GX, y: 156, class: 'sl-ttl' }, g, 'STATUT DE PÉREMPTION');
      var gVal = el('text', { x: GX, y: 182, class: 'sl-val' }, g, '');
      var gLine = el('text', { x: GX, y: 202, class: 'sl-txt' }, g, '');
      function gx(h) {
        return GX + ((h - MIN) / (MAX - MIN)) * GW;
      }
      [
        [MIN, 0, '#ff5d62'],
        [0, 48, '#f5b942'],
        [48, MAX, '#4368ff'],
      ].forEach(function (z) {
        el(
          'rect',
          {
            x: gx(z[0]),
            y: 236,
            width: gx(z[1]) - gx(z[0]) - 1,
            height: 4,
            rx: 2,
            fill: z[2],
            opacity: 0.85,
          },
          g,
        );
      });
      [
        [0, '0'],
        [48, '48 H'],
      ].forEach(function (t) {
        el('text', { x: gx(t[0]), y: 262, class: 'sl-txt', 'text-anchor': 'middle' }, g, t[1]);
      });
      var Z = [
        [
          'z_exp',
          'Expiré',
          '≤ 0 H › nonConform',
          '#ff5d62',
          'Statut · expired',
          "Le temps restant est nul ou négatif : l'élément est expiré, la ligne passe en non conforme.",
        ],
        [
          'z_warn',
          'Bientôt expiré',
          '≤ 48 H › watch',
          '#f5b942',
          'Statut · warning',
          "Moins de 48 heures restantes : l'élément est à surveiller, la ligne passe en statut watch.",
        ],
        [
          'z_ok',
          'OK',
          '> 48 H › conform',
          '#4368ff',
          'Statut · ok',
          "Plus de 48 heures de validité : l'élément est conforme.",
        ],
        [
          'z_unk',
          'Date à vérifier',
          'incohérent › unknown',
          '#8b97b3',
          'Statut · unknown',
          'Donnée incohérente, fuseau invalide ou règle de validité inconnue : le statut est inconnu — jamais présumé valide.',
        ],
      ];
      Z.forEach(function (z, i) {
        var y = 292 + i * 34,
          lg = el('g', { class: 'lv' }, g);
        el('rect', { x: GX - 8, y: y, width: GW + 18, height: 28, rx: 5, class: 'lv-box' }, lg);
        el(
          'rect',
          { x: GX + 2, y: y + 9, width: 10, height: 10, rx: 2.5, fill: z[3], class: 'lv-sw' },
          lg,
        );
        var t = el('text', { x: GX + 22, y: y + 18, class: 'lv-txt' }, lg);
        el('tspan', null, t, up(z[1]) + '   ');
        el('tspan', { class: 'lv-dim' }, t, up(z[2]));
        reg(z[0], { kicker: z[4], title: z[1], body: z[5], tags: [{ t: z[2] }] }, [lg]);
      });
      var sl = slider(
        g,
        GX,
        238,
        GW,
        MIN,
        MAX,
        1,
        30,
        function (h) {
          var lab = tr(h <= 0 ? 'EXPIRÉ' : h <= 48 ? 'BIENTÔT EXPIRÉ' : 'OK');
          var line = h <= 0 ? 'nonConform' : h <= 48 ? 'watch' : 'conform';
          gVal.textContent = trc('RESTE ' + h + ' H  ›  ' + lab);
          gLine.textContent = trc('STATUT DE LA LIGNE  ›  ' + up(line));
          gVal.setAttribute('fill', h <= 0 ? '#ff9da0' : h <= 48 ? '#f5b942' : '#fff');
        },
        'Heures de validité restantes',
        { track: false, fill: false },
      );
      sl.set(30);
      sceneState.render = render;
      render('sc_overlap');
    },
    onSelect: function (id) {
      if (sceneState.render) sceneState.render(id);
    },
  });

  /* ---------- 08 · QUALITÉ ---------- */
  SCENES.push({
    q: 'Comment sait-on que ça tient ?',
    tab: 'Qualité',
    label: 'Qualité : porte locale, porte CI et preuve de production',
    signal: ['Preuve', 'CI ≠ déploiement · SHA vérifié'],
    def: 'c2',
    tour: [
      'l1',
      'l2',
      'l3',
      'l4',
      'l5',
      'c1',
      'c2',
      'c3',
      'c4',
      'c5',
      'c6',
      'p1',
      'p2',
      'p3',
      'p4',
      'p5',
    ],
    build: function (g) {
      decor(g, 720, 250);
      var LANES = [
        {
          y: 132,
          title: '01 · LOCAL  ›  NPM RUN CHECK',
          xs: [290, 470, 650, 830, 1010],
          nodes: [
            [
              'l1',
              'Syntaxe',
              'Serveur · shared',
              'Étape locale · 1 / 5',
              'Vérification de syntaxe',
              'Contrôle de syntaxe JavaScript du serveur, du code partagé et des scripts qualité : la première barrière, la plus rapide.',
              [{ t: 'npm run check' }],
            ],
            [
              'l2',
              'Tests Node',
              'Dossier tests/',
              'Étape locale · 2 / 5',
              'La suite de tests Node',
              'La suite de tests du serveur et des contrats partagés, exécutée par le runner Node natif.',
              [{ t: 'node:test' }],
            ],
            [
              'l3',
              'Vitest',
              'Seuils 60/50/50/60',
              'Étape locale · 3 / 5',
              'Couverture avec seuils bloquants',
              'Suite Vitest ciblée sur le risque, avec seuils V8 bloquants : 60 % instructions, 50 % branches, 50 % fonctions, 60 % lignes. Le dénominateur reste volontairement stable, et les modules critiques ont des objectifs par fichier (90 / 85 %).',
              [{ t: 'V8', k: 'ok' }, { t: 'Seuils' }],
            ],
            [
              'l4',
              'ESLint',
              'Async typé',
              'Étape locale · 4 / 5',
              'Lint, règles asynchrones typées',
              'ESLint, y compris les règles asynchrones sensibles aux types pour le TypeScript applicatif.',
              [{ t: 'Type-aware' }],
            ],
            [
              'l5',
              'Build',
              'tsc + Vite',
              'Étape locale · 5 / 5',
              'Build de production',
              "Le build TypeScript et Vite de production : la boucle de retour normale d'un développeur.",
              [{ t: 'tsc' }, { t: 'Vite' }],
            ],
          ],
        },
        {
          y: 262,
          title: '02 · CI  ›  CHECK:CI + WORKFLOWS',
          xs: [290, 440, 590, 740, 890, 1040],
          nodes: [
            [
              'c1',
              'Couverture',
              'Globale · serveur',
              'Étape CI · 1 / 6',
              'Rapports honnêtes',
              "check:ci ajoute la couverture frontend globale (descriptive, sans seuil) et la couverture serveur : rendre visible ce qui n'est pas mesuré plutôt que de gonfler un pourcentage.",
              [{ t: 'Descriptif' }],
            ],
            [
              'c2',
              'Mutation smoke',
              '3 mutations',
              'Étape CI · 2 / 6',
              'Prouver que les tests détectent',
              'Trois mutations temporaires — transition Logistics inversée, jour calendaire en trop sur Expiry, vérification post-écriture ignorée — et les tests ciblés doivent échouer. Un mutant qui survit fait échouer check:ci.',
              [{ t: '3 mutants', k: 'ok' }, { t: 'Restaurés' }],
            ],
            [
              'c3',
              'Docker',
              'Smoke runtime',
              'Étape CI · 3 / 6',
              'Démarrer, pas seulement construire',
              "Une image qui se construit ne prouve pas qu'elle démarre : le smoke runtime Docker est un contrôle de workflow à part.",
              [{ t: 'Runtime' }],
            ],
            [
              'c4',
              'E2E',
              'Chromium · WebKit',
              'Étape CI · 4 / 6',
              'Navigateurs, sans retry complaisant',
              "Serveurs de test synthétiques et hermétiques : aucun appel DeepSeek, aucun secret. Un retry capture une trace, mais failOnFlakyTests fait échouer un test qui ne passe qu'au second essai.",
              [{ t: 'failOnFlakyTests', k: 'ok' }],
            ],
            [
              'c5',
              'Accessibilité',
              'axe · WCAG A/AA',
              'Étape CI · 5 / 6',
              'Détecter, sans prétendre certifier',
              "La porte axe bloque les constats WCAG A/AA d'impact critique ou sérieux. C'est un détecteur de régressions, pas une déclaration de conformité.",
              [{ t: 'axe' }],
            ],
            [
              'c6',
              'CodeQL',
              'Analyse statique',
              'Étape CI · 6 / 6',
              'Analyse de sécurité',
              "L'analyse CodeQL accompagne le Quality Gate comme preuve requise sur le commit fusionné.",
              [{ t: 'CodeQL' }],
            ],
          ],
        },
        {
          y: 392,
          title: '03 · PRODUCTION  ›  APRÈS FUSION SUR MAIN',
          xs: [330, 520, 710, 900, 1090],
          nodes: [
            [
              'p1',
              'Merge sur main',
              'Gate vert',
              'Production · 1 / 5',
              'Jamais depuis un main cassé',
              'Le Quality Gate doit être vert avant la fusion, et le SHA de fusion est noté : on ne poursuit pas une release depuis un main cassé.',
              [{ t: 'Gate vert' }],
            ],
            [
              'p2',
              'Déploiement',
              'Railway',
              'Production · 2 / 5',
              'Le bon commit, en SUCCESS',
              "Railway doit créer un déploiement pour ce SHA exact et atteindre le statut SUCCESS avant que l'on revendique quoi que ce soit.",
              [{ t: 'SUCCESS' }],
            ],
            [
              'p3',
              'Prêt',
              '/api/ready · 200',
              'Production · 3 / 5',
              'La santé du runtime',
              "Le healthcheck de production est /api/ready : il doit répondre 200. Cela prouve que le runtime est prêt — pas que c'est la bonne version.",
              [{ t: 'HTTP 200' }],
            ],
            [
              'p4',
              'Même SHA',
              'Commit = déployé',
              'Production · 4 / 5',
              'La preuve qui compte',
              'La preuve de clôture est invalide si Railway sert un commit plus ancien, même avec /api/ready sain : la santé prouve la disponibilité, la correspondance du commit prouve que le code validé est celui qui tourne.',
              [{ t: 'SHA vérifié', k: 'ok' }],
            ],
            [
              'p5',
              'Live smoke',
              'Chaque jour 06:17 UTC',
              'Production · 5 / 5',
              'Une sonde qui ne consomme rien',
              "Sonde externe en GET seulement, sans secret : elle ne touche ni l'unlock, ni la création de session démo, ni le chat — donc aucun essai de code, aucune session et aucun jeton d'IA consommés. Elle vérifie aussi la frontière entre origine protégée et origine démo.",
              [{ t: 'Lecture seule', k: 'ok' }, { t: 'Sans secret' }],
            ],
          ],
        },
      ];
      LANES.forEach(function (L, li) {
        el('text', { x: 172, y: L.y - 50, class: 'sl-ttl' }, g, L.title);
        for (var i = 0; i < L.xs.length - 1; i++) {
          el(
            'path',
            {
              d: 'M' + (L.xs[i] + 24) + ' ' + L.y + ' L' + (L.xs[i + 1] - 24) + ' ' + L.y,
              class: 'edge-line',
            },
            g,
          );
        }
        L.nodes.forEach(function (n, i) {
          var key = n[0] === 'c2' || n[0] === 'p4' || n[0] === 'l3' ? 'lime' : null;
          node(
            g,
            n[0],
            L.xs[i],
            L.y,
            15,
            n[1],
            n[2],
            { kicker: n[3], title: n[4], body: n[5], tags: n[6] },
            { tone: key },
          );
        });
      });
      note(
        g,
        172,
        462,
        'principe',
        'un CI vert ne prouve pas un déploiement : seul le SHA servi le prouve',
      );
    },
  });

  /* =================================================================
     MISE EN PAGE COMPACTE (conteneur < 900 px) : viewBox 360 × 940,
     onglets en grille, scènes empilées verticalement, panneau sous le schéma.
     Les textes viennent des mêmes données que la version large.
     ================================================================= */

  /* ---------- 01 · SURFACES ---------- */
  SCENES[0].cbuild = function (g) {
    var cx = 180,
      cy = 300;
    decor(g, cx, cy);
    var orbits = [
      { rx: 150, ry: 120, rot: -10 },
      { rx: 135, ry: 96, rot: 28 },
      { rx: 112, ry: 84, rot: -42 },
      { rx: 84, ry: 104, rot: 72 },
    ];
    var lineEls = orbits.map(function (o) {
      return el(
        'ellipse',
        {
          cx: cx,
          cy: cy,
          rx: o.rx,
          ry: o.ry,
          transform: 'rotate(' + o.rot + ' ' + cx + ' ' + cy + ')',
          class: 'orbit-line',
        },
        g,
      );
    });
    var core = el('g', { class: 'core', transform: 'translate(' + cx + ' ' + cy + ')' }, g);
    el('circle', { r: 78, class: 'core-halo' }, core);
    el('circle', { r: 52, class: 'core-mid' }, core);
    el('circle', { r: 44, class: 'core-disc' }, core);
    el('text', { x: 0, y: 4, class: 'core-txt' }, core, 'PROTOCAP');
    el('circle', { r: 56, fill: 'transparent', class: 'pc-ptr' }, core);
    reg('protocap', null, [core]);
    var N = [
      ['packing', 'Packing', 'Local', 'loc', null, 0, 1.19],
      ['celine', 'Céline', 'Serveur protégé', 'srv', 'lime', 0, 5.45],
      ['shiftguide', 'ShiftGuide', 'Serveur protégé', 'srv', 'lime', 1, 3.98],
      ['expiry', 'Expiry Check', 'Local', 'loc', null, 1, 2.23],
      ['linepulse', 'LinePulse', 'Fictif', 'mock', 'amber', 2, 1.12],
      ['logistics', 'Logistics Call', 'Local', 'loc', null, 2, 4.33],
      ['pilot', 'Pilot proposal', 'Statique', 'stat', 'grey', 3, 0.49],
      ['kb', 'Knowledge Base', 'Statique', 'stat', 'grey', 3, 4.68],
    ];
    movers = [];
    N.forEach(function (n, mk) {
      var og = orb(g, 0, 0, 11, n[4]);
      nodeLabels(og, 11, n[1], null, 'bottom');
      reg(n[0], null, [og]);
      movers.push({
        g: og,
        cls: n[3],
        o: orbits[n[5]],
        t0: n[6],
        t: n[6],
        time: mk * 3.1,
        amp: 0.08 + 0.015 * mk,
        w: 0.26 + 0.03 * mk,
        ph: mk * 1.7,
        cx: cx,
        cy: cy,
        orbitEl: lineEls[n[5]],
      });
    });
    placeMovers();
    movers.forEach(function (m) {
      m.g.addEventListener('pointerenter', function () {
        m.orbitEl.classList.add('hot');
      });
      m.g.addEventListener('pointerleave', function () {
        m.orbitEl.classList.remove('hot');
      });
    });
    var CL = { k_srv: 'srv', k_loc: 'loc', k_mock: 'mock', k_stat: 'stat' };
    [
      ['k_srv', 'Serveur protégé', 12, 164, '#c8ff2e', 462],
      ['k_loc', 'Local navigateur', 184, 164, '#4368ff', 462],
      ['k_mock', 'Données fictives', 12, 164, '#f5b942', 494],
      ['k_stat', 'Statique', 184, 164, '#7f8aa6', 494],
    ].forEach(function (l) {
      var c = chip(g, l[0], l[2], l[5], l[3], l[1]);
      el(
        'circle',
        { cx: l[2] + 15, cy: l[5] + 12, r: 3.5, fill: l[4], 'pointer-events': 'none' },
        c,
      );
    });
    sceneState.filt = function (id) {
      var cls = CL[id];
      movers.forEach(function (m) {
        m.g.classList.toggle('is-dim', !!cls && m.cls !== cls);
      });
    };
  };

  /* ---------- 02 · CÉLINE ---------- */
  SCENES[1].cbuild = function (g) {
    decor(g, 180, 340);
    var dom = [],
      llm = [];
    function tag(a, e) {
      a.push(e);
      return e;
    }
    edge(g, 'e_in', 'M72 205 L118 205', 0, 0, '', 'middle', null);
    tag(dom, edge(g, 'e_dom', 'M162 205 L256 205', 209, 195, 'routine', 'middle', null));
    tag(llm, edge(g, 'e_llm', 'M140 227 L140 281', 132, 258, 'ambigu', 'end', null));
    tag(
      dom,
      edge(g, 'e_dom_auth', 'M280 227 L280 321', 272, 278, 'déterministe', 'end', null, 'soft'),
    );
    tag(llm, edge(g, 'e_guard_llm', 'M140 327 L140 371', 132, 352, 'autorisé ?', 'end', null));
    tag(llm, edge(g, 'e_llm_norm', 'M140 417 L140 461', 132, 442, 'décision', 'end', null));
    tag(
      llm,
      edge(
        g,
        'e_norm_auth',
        'M162 485 C 220 485, 200 345, 256 345',
        232,
        470,
        'valide',
        'middle',
        null,
        'soft',
      ),
    );
    tag(llm, edge(g, 'e_norm_fb', 'M118 485 L64 485', 91, 473, 'invalide', 'middle', null, 'soft'));
    node(g, 'n_op', 50, 205, 20, 'Opérateur', 'Question', null, { side: 'bottom' });
    node(g, 'n_api', 140, 205, 20, 'Serveur', 'Session · limites', null, { side: 'top' });
    var nDom = node(g, 'n_dom', 280, 205, 20, 'Moteur de domaine', '0 appel IA', null, {
      tone: 'lime',
      side: 'top',
    });
    var nGuard = node(g, 'n_guard', 140, 305, 20, 'Garde de coûts', '8 appels / min', null, {
      side: 'right',
    });
    var nLlm = node(g, 'n_llm', 140, 395, 20, 'DeepSeek', 'Intention', null, { side: 'right' });
    var nNorm = node(g, 'n_norm', 140, 485, 20, 'Normalisation', 'Décision validée', null, {
      side: 'bottom',
    });
    var nFb = node(g, 'n_fb', 50, 485, 12, 'Repli sûr', 'Invalide', null, {
      tone: 'red',
      side: 'bottom',
    });
    var au = orb(g, 280, 345, 20, 'lime');
    el('text', { x: 0, y: 47, class: 't-name' }, au, 'AUTORITÉ');
    el('text', { x: 0, y: 60, class: 't-sub' }, au, 'SERVEUR ÉCRIT');
    reg('n_auth', null, [au]);
    chip(g, 'ch_shape', 12, 548, 336, '{ message, checklist, followUp }');
    note(g, 250, 430, 'scénario', '');
    chip(g, 'sc_routine', 250, 438, 98, 'Routine');
    chip(g, 'sc_ambig', 250, 468, 98, 'Ambigu');
    var routeEls = [nDom].concat(dom),
      llmEls = [nGuard, nLlm, nNorm, nFb].concat(llm);
    sceneState.focus = function (which) {
      function set(list, dim) {
        list.forEach(function (e) {
          e.classList.toggle('is-dim', dim);
        });
      }
      set(routeEls, which === 'ambig');
      set(llmEls, which === 'routine');
    };
  };

  /* ---------- 03 · FRONTIÈRES ---------- */
  SCENES[2].cbuild = function (g) {
    decor(g, 180, 380);
    var CXS = [54, 138, 222, 306],
      CYY = 218;
    var crIds = ['cr_none', 'cr_code', 'cr_ptok', 'cr_dtok'];
    var CRL = {
      cr_none: ['AUCUN', 'IDENTIFIANT'],
      cr_code: ['CODE', 'SHIFTGUIDE'],
      cr_ptok: ['JETON', 'PROTÉGÉ'],
      cr_dtok: ['JETON', 'DÉMO'],
    };
    var doors = [
      ['dP_unlock', 44, 0, 'Unlock'],
      ['dP_chat', 44, 1, 'Céline chat'],
      ['dP_demo', 44, 2, 'Session démo'],
      ['dD_unlock', 220, 0, 'Unlock'],
      ['dD_chat', 220, 1, 'Céline chat'],
      ['dD_demo', 220, 2, 'Session démo'],
    ];
    var DY = [326, 396, 466];
    var OUT = {
      cr_none: [401, 401, 404, 404, 401, 200],
      cr_code: [200, 401, 404, 404, 401, 200],
      cr_ptok: [401, 200, 404, 404, 401, 200],
      cr_dtok: [401, 401, 404, 404, 200, 200],
    };
    [
      ['PROCESSUS PROTÉGÉ', 12],
      ['PROCESSUS DÉMO', 188],
    ].forEach(function (z) {
      el(
        'rect',
        {
          x: z[1],
          y: 262,
          width: 160,
          height: 240,
          rx: 10,
          fill: 'rgba(45,85,255,.035)',
          stroke: 'rgba(125,155,255,.26)',
          'stroke-dasharray': '5 6',
        },
        g,
      );
      el('text', { x: z[1] + 80, y: 281, class: 't-sub', 'text-anchor': 'middle' }, g, z[0]);
    });
    var links = {};
    crIds.forEach(function (c, ci) {
      links[c] = [];
      doors.forEach(function (d) {
        var dx = d[1] - 18,
          dy = DY[d[2]];
        var p = el(
          'path',
          {
            d:
              'M' +
              CXS[ci] +
              ' ' +
              (CYY + 20) +
              ' C ' +
              CXS[ci] +
              ' ' +
              (CYY + 80) +
              ', ' +
              (dx - 70) +
              ' ' +
              dy +
              ', ' +
              dx +
              ' ' +
              dy,
            class: 'lnk',
          },
          g,
        );
        var x = el('g', { class: 'xmark' }, g);
        var pt = { x: dx - 10, y: dy };
        try {
          pt = p.getPointAtLength(p.getTotalLength() * 0.9);
        } catch (e) {}
        el('line', { x1: pt.x - 4, y1: pt.y - 4, x2: pt.x + 4, y2: pt.y + 4 }, x);
        el('line', { x1: pt.x - 4, y1: pt.y + 4, x2: pt.x + 4, y2: pt.y - 4 }, x);
        links[c].push({ p: p, x: x });
      });
    });
    el('text', { x: 12, y: 152, class: 'sl-ttl' }, g, 'PRÉSENTER UN IDENTIFIANT ›');
    var crOrbs = {};
    crIds.forEach(function (c, i) {
      var o = orb(g, CXS[i], CYY, 18, null);
      o.querySelector('.orb-dot').setAttribute('r', 3.5);
      el('text', { x: 0, y: -42, class: 't-name' }, o, CRL[c][0]);
      el('text', { x: 0, y: -30, class: 't-name' }, o, CRL[c][1]);
      reg(c, null, [o]);
      crOrbs[c] = o;
    });
    var doorSubs = [];
    doors.forEach(function (d) {
      var o = orb(g, d[1], DY[d[2]], 15, null);
      o.classList.add('door');
      o.querySelector('.orb-dot').setAttribute('r', 3.5);
      el('text', { x: 24, y: -2, class: 't-name', 'text-anchor': 'start' }, o, up(d[3]));
      var sub = el('text', { x: 24, y: 11, class: 't-sub', 'text-anchor': 'start' }, o, '—');
      reg(d[0], null, [o]);
      doorSubs.push({ orb: o, sub: sub });
    });
    chip(g, 'b_secret', 12, 516, 104, 'Sans secret');
    chip(g, 'b_ia', 122, 516, 126, 'Sans IA externe');
    chip(g, 'b_token', 12, 546, 190, 'Jeton non transférable');
    var LABEL = {
      200: ['200 · OK', 'out-ok'],
      401: ['401 · REFUSÉ', 'out-no'],
      404: ['404 · ABSENT', 'out-no'],
    };
    sceneState.paint = function (c) {
      crIds.forEach(function (k) {
        crOrbs[k].classList.toggle('ok', k === c);
      });
      crIds.forEach(function (k) {
        links[k].forEach(function (L, i) {
          if (k === c) {
            var code = OUT[c][i];
            L.p.setAttribute('class', 'lnk ' + (code === 200 ? 'ok' : 'no'));
            L.x.setAttribute('class', 'xmark' + (code === 200 ? '' : ' on'));
          } else {
            L.p.setAttribute('class', 'lnk');
            L.x.setAttribute('class', 'xmark');
          }
        });
      });
      doorSubs.forEach(function (d, i) {
        var code = OUT[c][i],
          L = LABEL[code];
        d.sub.textContent = trc(L[0]);
        d.sub.setAttribute('class', 't-sub ' + L[1]);
        d.orb.classList.toggle('ok', code === 200);
        d.orb.classList.toggle('no', code !== 200);
      });
    };
    sceneState.paint('cr_code');
  };

  /* ---------- 04 · STOCKAGE ---------- */
  SCENES[3].cbuild = function (g) {
    decor(g, 180, 340);
    var YA = 226,
      YB = 334,
      XS = [60, 180, 300];
    function flow(x1, x2, y) {
      el(
        'path',
        { d: 'M' + (x1 + 20) + ' ' + y + ' L' + (x2 - 20) + ' ' + y, class: 'edge-line' },
        g,
      );
    }
    el('text', { x: 12, y: 194, class: 'sl-ttl' }, g, 'SESSION · SESSIONSTORAGE');
    el('text', { x: 12, y: 300, class: 'sl-ttl' }, g, 'PROGRESSION · LOCALSTORAGE');
    flow(XS[0], XS[1], YA);
    flow(XS[1], XS[2], YA);
    flow(XS[0], XS[1], YB);
    flow(XS[1], XS[2], YB);
    var aW = node(g, 'a_write', XS[0], YA, 14, 'Écriture', 'Complet', null);
    var aR = node(g, 'a_read', XS[1], YA, 14, 'Relecture', 'Vérifiée', null);
    var aX = node(g, 'a_res', XS[2], YA, 14, 'Session ouverte', 'Vérifiée', null);
    var bW = node(g, 'b_write', XS[0], YB, 14, 'Écriture', 'Non sensible', null);
    var bM = node(g, 'b_mirror', XS[1], YB, 14, 'Miroir mémoire', 'Si refus', null);
    var bX = node(g, 'b_res', XS[2], YB, 14, 'Persisté', 'localStorage', null);
    function setRes(o, name, sub, cls) {
      var t = o.querySelectorAll('text');
      t[0].textContent = trc(up(name));
      t[1].textContent = trc(up(sub));
      t[0].setAttribute('class', 't-name ' + cls);
    }
    function paintStore(ok) {
      [aW, aR, aX, bW, bM, bX].forEach(function (o) {
        o.classList.remove('ok', 'no', 'is-dim', 'tone-amber');
      });
      if (ok) {
        setRes(aX, 'Session ouverte', 'Vérifiée', 'out-ok');
        setRes(bX, 'Persisté', 'localStorage', 'out-ok');
        aX.classList.add('ok');
        bX.classList.add('ok');
      } else {
        aW.classList.add('no');
        aR.classList.add('is-dim');
        aX.classList.add('no');
        setRes(aX, 'Verrouillé', 'Rollback', 'out-no');
        bW.classList.add('no');
        bM.classList.add('ok');
        bX.classList.add('tone-amber');
        setRes(bX, 'Mémoire seule', 'Avertissement', 'out-warn');
      }
    }
    chip(g, 'st_ok', 12, 150, 160, 'Stockage OK');
    chip(g, 'st_ko', 180, 150, 168, 'Stockage bloqué');
    chip(g, 'lk_off', 12, 392, 120, 'Sans verrou');
    chip(g, 'lk_on', 140, 392, 150, 'Avec Web Locks');
    var raceG = el('g', null, g),
      rmode = null;
    function race(mode) {
      if (rmode === mode) return;
      rmode = mode;
      clear(raceG);
      var rows =
        mode === 'off'
          ? [
              ['A', 'Lit {}', '{ }'],
              ['B', 'Lit {}', '{ }'],
              ['A', 'Écrit {X}', '{ X }'],
              ['B', 'Écrit {Y}', '{ Y }', 'bad'],
            ]
          : [
              ['A', 'Prend le verrou', '{ }'],
              ['A', 'Lit {} · écrit {X}', '{ X }'],
              ['B', 'Attend le verrou…', '{ X }', 'wait'],
              ['B', 'Lit {X} · écrit {X,Y}', '{ X, Y }', 'good'],
            ];
      rows.forEach(function (r, i) {
        var y = 426 + i * 27;
        var grp = el('g', { class: 'ev' + (r[3] ? ' ' + r[3] : ''), style: 'opacity:0' }, raceG);
        el('rect', { x: 12, y: y, width: 336, height: 24, rx: 6, class: 'ev-bg' }, grp);
        el('text', { x: 24, y: y + 16, class: 'ev-state', fill: '#8aa5ff' }, grp, r[0]);
        el('text', { x: 44, y: y + 16, class: 'chip-txt', 'text-anchor': 'start' }, grp, up(r[1]));
        el('text', { x: 336, y: y + 16, class: 'ev-state', 'text-anchor': 'end' }, grp, r[2]);
        later(
          function () {
            grp.style.opacity = 1;
          },
          state.anim ? 380 * i + 60 : 0,
        );
      });
      var v = el('g', { style: 'opacity:0', class: 'ev' }, raceG);
      if (mode === 'off') {
        el('text', { x: 12, y: 560, class: 'pc-big out-no' }, v, 'LA MISE À JOUR X EST PERDUE');
        el('text', { x: 12, y: 574, class: 'sl-txt' }, v, "B AVAIT LU {} AVANT QUE A N'ÉCRIVE");
      } else {
        el('text', { x: 12, y: 560, class: 'pc-big out-ok' }, v, 'X ET Y CONSERVÉES');
        el('text', { x: 12, y: 574, class: 'sl-txt' }, v, 'B ATTEND, PUIS LIT UN DOCUMENT FRAIS');
      }
      later(
        function () {
          v.style.opacity = 1;
        },
        state.anim ? 380 * 4 + 120 : 0,
      );
    }
    sceneState.act = function (id) {
      if (id === 'st_ok') paintStore(true);
      else if (id === 'st_ko') paintStore(false);
      else if (id === 'lk_off') race('off');
      else if (id === 'lk_on') race('on');
    };
    paintStore(true);
    race('off');
  };

  /* ---------- 05 · PACKING ---------- */
  SCENES[4].cbuild = function (g) {
    decor(g, 180, 340);
    var P = { qty: 2500, upc: 24, cpp: 20, cad: 60 };
    var policy = 'round-carton',
      plan = null,
      declared = 0,
      log = [],
      msg = { t: '', k: '' };
    var POLID = { 'no-overrun': 'pol_no', 'round-carton': 'pol_ct', 'round-pallet': 'pol_pl' };
    function fmt(n) {
      return Math.round(n).toLocaleString(TR === null ? 'fr-FR' : 'en-US');
    }
    function compute() {
      var upp = P.upc * P.cpp,
        pal = Math.floor(P.qty / upp),
        rest = P.qty % upp,
        ctn = Math.floor(rest / P.upc),
        un = rest % P.upc;
      var exact = {
        pol: 'no-overrun',
        label: 'Sans dépassement',
        pal: pal,
        ctn: ctn,
        un: un,
        total: P.qty,
        variance: 0,
      };
      var cc = un > 0 ? ctn + 1 : ctn,
        rct = pal * upp + cc * P.upc;
      var rc = {
        pol: 'round-carton',
        label: 'Carton complet',
        pal: pal,
        ctn: cc,
        un: 0,
        total: rct,
        variance: rct - P.qty,
      };
      var pc = rest > 0 ? pal + 1 : pal,
        rp = pc * upp;
      var rpo = {
        pol: 'round-pallet',
        label: 'Palette complète',
        pal: pc,
        ctn: 0,
        un: 0,
        total: rp,
        variance: rp - P.qty,
      };
      return { opts: [exact, rc, rpo], rec: rc.variance === 0 ? exact : rc, upp: upp };
    }
    var C = compute();
    function pickPlan() {
      plan = C.opts.filter(function (o) {
        return o.pol === policy;
      })[0];
    }
    pickPlan();
    var SL = [
      [
        'qty',
        'QUANTITÉ',
        100,
        10000,
        10,
        function (v) {
          return fmt(v) + ' U';
        },
        12,
        150,
      ],
      [
        'upc',
        'U. / CARTON',
        4,
        48,
        1,
        function (v) {
          return v + ' U';
        },
        188,
        150,
      ],
      [
        'cpp',
        'CTN / PALETTE',
        4,
        40,
        1,
        function (v) {
          return v + ' CTN';
        },
        12,
        206,
      ],
      [
        'cad',
        'CADENCE',
        10,
        300,
        10,
        function (v) {
          return v + ' U/MIN';
        },
        188,
        206,
      ],
    ];
    SL.forEach(function (s) {
      var x0 = s[6],
        y0 = s[7];
      el('text', { x: x0, y: y0, class: 'sl-ttl' }, g, s[1]);
      var val = el(
        'text',
        { x: x0 + 148, y: y0, class: 'sl-val', 'text-anchor': 'end' },
        g,
        s[5](P[s[0]]),
      );
      slider(
        g,
        x0 + 8,
        y0 + 22,
        132,
        s[2],
        s[3],
        s[4],
        P[s[0]],
        function (v) {
          P[s[0]] = v;
          val.textContent = trc(s[5](v));
          if (s[0] === 'cad') {
            paintCock();
            return;
          }
          C = compute();
          pickPlan();
          declared = 0;
          log = [];
          msg = { t: '', k: '' };
          drawCards();
          paintCock();
        },
        s[1],
      );
      el('text', { x: x0, y: y0 + 42, class: 'sl-txt' }, g, fmt(s[2]));
      el('text', { x: x0 + 148, y: y0 + 42, class: 'sl-txt', 'text-anchor': 'end' }, g, fmt(s[3]));
    });
    function choose(p) {
      if (p === policy) return;
      policy = p;
      pickPlan();
      declared = 0;
      log = [];
      msg = { t: '', k: '' };
      drawCards();
      paintCock();
    }
    sceneState.choose = function (id) {
      for (var k in POLID) if (POLID[k] === id) choose(k);
    };
    var cardsG = el('g', null, g);
    function drawCards() {
      clear(cardsG);
      C.opts.forEach(function (o, i) {
        var x = 12,
          y = 262 + i * 50,
          w = 336,
          h = 44;
        var cg = el('g', { class: 'card2' + (o.pol === policy ? ' sel' : '') }, cardsG);
        el('rect', { x: x, y: y, width: w, height: h, rx: 8, class: 'card2-bg' }, cg);
        el(
          'text',
          { x: x + 14, y: y + 17, class: 't-name', 'text-anchor': 'start' },
          cg,
          up(o.label),
        );
        if (o === C.rec) {
          el(
            'rect',
            {
              x: x + w - 100,
              y: y + 6,
              width: 88,
              height: 16,
              rx: 8,
              class: 'tag-bg',
              stroke: 'rgba(200,255,46,.7)',
            },
            cg,
          );
          el(
            'text',
            { x: x + w - 56, y: y + 17, class: 'tag-txt', fill: '#c8ff2e' },
            cg,
            'RECOMMANDÉ',
          );
        }
        el(
          'text',
          { x: x + 14, y: y + 37, class: 'pc-big' },
          cg,
          o.pal + ' PAL · ' + o.ctn + ' CTN' + (o.un ? ' · ' + o.un + ' U' : ''),
        );
        el(
          'text',
          { x: x + w - 14, y: y + 37, class: 'sl-txt', 'text-anchor': 'end' },
          cg,
          fmt(o.total) + ' U · ' + (o.variance ? '+' + fmt(o.variance) : tr('ÉCART 0')),
        );
        reg(POLID[o.pol], null, [cg], { noHover: true });
        cg.addEventListener('click', function () {
          choose(o.pol);
        });
      });
      if (state.sel && items[state.sel])
        items[state.sel].els.forEach(function (e) {
          e.classList.add('is-active');
        });
    }
    var cockG = el('g', { class: 'card2' }, g);
    el('rect', { x: 6, y: 414, width: 348, height: 162, rx: 8, class: 'card2-bg' }, cockG);
    reg('pk_cockpit', null, [cockG]);
    el('text', { x: 16, y: 432, class: 'sl-ttl' }, g, 'COCKPIT · DÉCLARATIONS');
    var planT = el('text', { x: 16, y: 450, class: 'pc-mid' }, g, '');
    el('rect', { x: 16, y: 458, width: 328, height: 6, rx: 3, fill: 'rgba(140,165,220,.16)' }, g);
    var bar = el('rect', { x: 16, y: 458, width: 0, height: 6, rx: 3, fill: '#2d55ff' }, g);
    var progT = el('text', { x: 16, y: 481, class: 'sl-val' }, g, '');
    var durT = el('text', { x: 16, y: 496, class: 'sl-txt' }, g, '');
    var msgT = el('text', { x: 16, y: 568, class: 'pc-msg' }, g, '');
    function declare(add, name) {
      if (declared + add > plan.total)
        msg = {
          t: 'Refusé · dépasserait le plan de ' + fmt(declared + add - plan.total) + ' u',
          k: 'out-no',
        };
      else {
        declared += add;
        log.push({ n: name, a: add });
        msg = { t: 'Déclaré · +' + fmt(add) + ' u', k: 'out-ok' };
      }
      paintCock();
    }
    button(
      g,
      16,
      504,
      104,
      '+1 palette',
      function () {
        declare(C.upp, '+1 palette');
      },
      'Déclarer une palette',
    );
    button(
      g,
      126,
      504,
      104,
      '+1 carton',
      function () {
        declare(P.upc, '+1 carton');
      },
      'Déclarer un carton',
    );
    button(
      g,
      236,
      504,
      108,
      '+1 unité',
      function () {
        declare(1, '+1 unité');
      },
      'Déclarer une unité',
    );
    button(
      g,
      16,
      534,
      96,
      'Annuler',
      function () {
        var l = log.pop();
        if (l) {
          declared -= l.a;
          msg = { t: 'Annulé · −' + fmt(l.a) + ' u', k: '' };
        } else msg = { t: 'Rien à annuler', k: '' };
        paintCock();
      },
      'Annuler la dernière déclaration',
    );
    button(
      g,
      118,
      534,
      130,
      'Remise à zéro',
      function () {
        declared = 0;
        log = [];
        msg = { t: 'Suivi remis à zéro', k: '' };
        paintCock();
      },
      'Remettre le suivi à zéro',
    );
    function paintCock() {
      var t = plan.total,
        rem = t - declared;
      planT.textContent = trc('PLAN · ' + fmt(t) + ' U · ' + up(plan.label));
      bar.setAttribute('width', ((328 * declared) / t).toFixed(1));
      progT.textContent = trc(fmt(declared) + ' / ' + fmt(t) + ' U  ·  RESTE ' + fmt(rem) + ' U');
      durT.textContent = trc(
        rem > 0
          ? '≈ ' + fmt(Math.ceil(rem / P.cad)) + ' MIN RESTANTES À ' + P.cad + ' U / MIN'
          : 'PLAN ATTEINT',
      );
      msgT.textContent = trc(msg.t);
      msgT.setAttribute('class', 'pc-msg ' + msg.k);
    }
    drawCards();
    paintCock();
  };

  /* ---------- 06 · LOGISTIQUE ---------- */
  SCENES[5].cbuild = function (g) {
    decor(g, 180, 320);
    var R = 30;
    var ST = {
      waiting: { x: 60, y: 236, name: 'En attente', lab: ['EN', 'ATTENTE'], tone: null },
      seen: { x: 180, y: 236, name: 'Vu', lab: ['VU'], tone: null },
      inProgress: { x: 300, y: 236, name: 'En cours', lab: ['EN COURS'], tone: null },
      pickedUp: { x: 96, y: 404, name: 'Récupéré', lab: ['RÉCUPÉRÉ'], tone: 'lime' },
      cancelled: { x: 264, y: 404, name: 'Annulé', lab: ['ANNULÉ'], tone: 'red' },
    };
    var ALLOWED = {
      waiting: ['seen', 'inProgress', 'pickedUp', 'cancelled'],
      seen: ['inProgress', 'pickedUp', 'cancelled'],
      inProgress: ['pickedUp', 'cancelled'],
      pickedUp: [],
      cancelled: [],
    };
    var TERMINAL = { pickedUp: true, cancelled: true };
    function down(from, to, sx, off) {
      var t = ST[to],
        tx = t.x + off,
        ty = t.y - Math.sqrt(R * R - off * off) - 2;
      return (
        'M' +
        sx +
        ' ' +
        (ST[from].y + R) +
        ' C ' +
        sx +
        ' ' +
        (ST[from].y + 84) +
        ', ' +
        tx +
        ' ' +
        (ty - 56) +
        ', ' +
        tx +
        ' ' +
        ty
      );
    }
    var ARCS = [
      ['waiting', 'seen', 'M92 236 L148 236'],
      ['seen', 'inProgress', 'M212 236 L268 236'],
      ['waiting', 'inProgress', 'M62 206 C 100 146, 260 146, 298 206'],
      ['waiting', 'pickedUp', down('waiting', 'pickedUp', 52, -22)],
      ['waiting', 'cancelled', down('waiting', 'cancelled', 70, -22)],
      ['seen', 'pickedUp', down('seen', 'pickedUp', 168, 0)],
      ['seen', 'cancelled', down('seen', 'cancelled', 192, 0)],
      ['inProgress', 'pickedUp', down('inProgress', 'pickedUp', 288, 22)],
      ['inProgress', 'cancelled', down('inProgress', 'cancelled', 312, 22)],
    ];
    var arcEls = ARCS.map(function (a) {
      return el('path', { d: a[2], class: 'lnk fsm' }, g);
    });
    var cur = 'waiting',
      orbs = {};
    Object.keys(ST).forEach(function (k) {
      var s = ST[k],
        o = orb(g, s.x, s.y, R, s.tone);
      o.querySelector('.orb-dot').remove();
      s.lab.forEach(function (t, i) {
        el('text', { x: 0, y: s.lab.length === 1 ? 4 : -2 + i * 12, class: 't-name' }, o, t);
      });
      reg('st_' + k, null, [o]);
      o.addEventListener('click', function () {
        tryMove(k);
      });
      orbs[k] = o;
    });
    var stT = el('text', { x: 12, y: 470, class: 'sl-val' }, g, '');
    var msgT = el('text', { x: 12, y: 492, class: 'pc-msg' }, g, '');
    el(
      'text',
      { x: 12, y: 566, class: 'sl-txt' },
      g,
      'CLIQUER UN STATUT POUR TENTER LA TRANSITION',
    );
    function paint() {
      Object.keys(orbs).forEach(function (k) {
        orbs[k].classList.toggle('cur', k === cur);
      });
      ARCS.forEach(function (a, i) {
        arcEls[i].setAttribute(
          'class',
          'lnk fsm' + (a[0] === cur && ALLOWED[cur].indexOf(a[1]) >= 0 ? ' ok' : ''),
        );
      });
      stT.textContent = trc('ÉTAT ACTUEL  ›  ' + up(ST[cur].name));
    }
    function flash(k) {
      orbs[k].classList.remove('shake');
      void orbs[k].getBoundingClientRect();
      orbs[k].classList.add('shake');
      later(function () {
        orbs[k].classList.remove('shake');
      }, 600);
    }
    function tryMove(to) {
      if (to === cur) return;
      if (ALLOWED[cur].indexOf(to) >= 0) {
        var from = cur;
        cur = to;
        msgT.textContent = trc(
          'Autorisée · ' +
            ST[from].name +
            ' → ' +
            ST[to].name +
            (TERMINAL[to] ? ' · completedAt écrit' : ''),
        );
        msgT.setAttribute('class', 'pc-msg out-ok');
      } else {
        msgT.textContent = trc(
          TERMINAL[cur]
            ? 'Refusé · ' + ST[cur].name + ' est terminal'
            : 'Refusé · un statut ne recule jamais',
        );
        msgT.setAttribute('class', 'pc-msg out-no');
        flash(to);
      }
      paint();
    }
    button(
      g,
      12,
      514,
      150,
      'Réinitialiser',
      function () {
        cur = 'waiting';
        msgT.textContent = trc('');
        paint();
      },
      'Remettre la demande en attente',
    );
    chip(g, 'lg_store', 170, 514, 140, 'Persistance');
    paint();
  };

  /* ---------- 07 · PÉREMPTION ---------- */
  SCENES[6].cbuild = function (g) {
    decor(g, 180, 340);
    var SC = {
      sc_normal: {
        input: '14/10/2026 08:00',
        res: ['Heure valide · décalage +02:00', 'out-ok'],
        out: '2026-10-14T06:00:00.000Z',
      },
      sc_gap: {
        input: '29/03/2026 02:30',
        res: ["Refusée · cette heure n'existe pas", 'out-no'],
        out: "— rien n'est enregistré",
      },
      sc_overlap: {
        input: '25/10/2026 02:30',
        res: ['Ambiguë · existe deux fois', 'out-warn'],
        out: '— à choisir ci-dessous',
      },
      sc_days: {
        input: '24/10/2026 12:00 · 1 jour',
        res: ['Jour calendaire · calendar-days-v1', 'out-ok'],
        out: '2026-10-25T11:00:00.000Z',
      },
      sc_bad: {
        input: '2026-13-40T99:00',
        res: ['Illisible → « Date à vérifier »', 'out-warn'],
        out: '— unknown · jamais présumé valide',
      },
    };
    [
      ['sc_normal', 'Normale', 12, 76],
      ['sc_gap', 'Inexistante', 94, 100],
      ['sc_overlap', 'En double', 200, 90],
      ['sc_days', '+1 jour', 12, 72],
      ['sc_bad', 'Incohérente', 90, 100],
    ].forEach(function (c, i) {
      chip(g, c[0], c[2], i < 3 ? 150 : 180, c[3], c[1]);
    });
    el(
      'rect',
      {
        x: 12,
        y: 214,
        width: 336,
        height: 204,
        rx: 8,
        class: 'card2-bg',
        fill: 'rgba(20,40,110,.10)',
      },
      g,
    );
    var body = el('g', null, g);
    function render(id) {
      var s = SC[id];
      if (!s) return;
      clear(body);
      el('text', { x: 28, y: 238, class: 'sl-ttl' }, body, 'SAISIE LOCALE');
      el('text', { x: 28, y: 260, class: 'pc-big' }, body, s.input);
      el('text', { x: 28, y: 290, class: 'sl-ttl' }, body, 'RÉSOLUTION');
      el('text', { x: 28, y: 309, class: 'pc-mid ' + s.res[1] }, body, up(s.res[0]));
      el('text', { x: 28, y: 336, class: 'sl-ttl' }, body, 'INSTANT STOCKÉ (UTC)');
      var outT = el('text', { x: 28, y: 355, class: 'pc-mid' }, body, s.out);
      if (id === 'sc_overlap') {
        var cs = [
            ['Le premier · +02:00', '2026-10-25T00:30:00.000Z', 28],
            ['Le second · +01:00', '2026-10-25T01:30:00.000Z', 188],
          ],
          btns = [];
        cs.forEach(function (c) {
          var b = button(
            body,
            c[2],
            372,
            148,
            c[0],
            function () {
              outT.textContent = trc(c[1]);
              outT.setAttribute('class', 'pc-mid out-ok');
              btns.forEach(function (x) {
                x.classList.toggle('is-active', x === b);
              });
            },
            'Choisir : ' + tr(c[0]),
          );
          btns.push(b);
        });
      }
      if (id === 'sc_days') {
        [
          ["N × 24 H › 25/10 11:00 · FAUX D'1 H", 200, 'rgba(255,93,98,.7)'],
          ['CALENDRIER › 25/10 12:00 · 25 H ÉCOULÉES', 208, '#c8ff2e'],
        ].forEach(function (b, i) {
          var y = 378 + i * 22;
          el('text', { x: 28, y: y, class: 'sl-txt' }, body, b[0]);
          el(
            'rect',
            { x: 28, y: y + 5, width: b[1], height: 6, rx: 3, fill: b[2], opacity: 0.85 },
            body,
          );
        });
      }
    }
    var GX = 12,
      GW = 336,
      MIN = -24,
      MAX = 120;
    el('text', { x: GX, y: 440, class: 'sl-ttl' }, g, 'STATUT DE PÉREMPTION');
    var gVal = el('text', { x: GX, y: 458, class: 'sl-val' }, g, '');
    function gx(h) {
      return GX + ((h - MIN) / (MAX - MIN)) * GW;
    }
    [
      [MIN, 0, '#ff5d62'],
      [0, 48, '#f5b942'],
      [48, MAX, '#4368ff'],
    ].forEach(function (z) {
      el(
        'rect',
        {
          x: gx(z[0]),
          y: 478,
          width: gx(z[1]) - gx(z[0]) - 1,
          height: 4,
          rx: 2,
          fill: z[2],
          opacity: 0.85,
        },
        g,
      );
    });
    [
      [0, '0'],
      [48, '48 H'],
    ].forEach(function (t) {
      el('text', { x: gx(t[0]), y: 500, class: 'sl-txt', 'text-anchor': 'middle' }, g, t[1]);
    });
    [
      ['z_exp', 'Expiré', '#ff5d62', 12, 512],
      ['z_warn', 'Bientôt expiré', '#f5b942', 184, 512],
      ['z_ok', 'OK', '#4368ff', 12, 540],
      ['z_unk', 'Date à vérifier', '#8b97b3', 184, 540],
    ].forEach(function (z) {
      var lg = el('g', { class: 'lv' }, g);
      el('rect', { x: z[3], y: z[4], width: 164, height: 24, rx: 5, class: 'lv-box' }, lg);
      el(
        'rect',
        { x: z[3] + 8, y: z[4] + 7, width: 10, height: 10, rx: 2.5, fill: z[2], class: 'lv-sw' },
        lg,
      );
      el('text', { x: z[3] + 26, y: z[4] + 16, class: 'lv-txt' }, lg, up(z[1]));
      reg(z[0], null, [lg]);
    });
    var sl = slider(
      g,
      GX,
      480,
      GW,
      MIN,
      MAX,
      1,
      30,
      function (h) {
        var lab = tr(h <= 0 ? 'EXPIRÉ' : h <= 48 ? 'BIENTÔT EXPIRÉ' : 'OK'),
          line = h <= 0 ? 'nonConform' : h <= 48 ? 'watch' : 'conform';
        gVal.textContent = trc('RESTE ' + h + ' H  ›  ' + lab + '  ·  ' + up(line));
        gVal.setAttribute('fill', h <= 0 ? '#ff9da0' : h <= 48 ? '#f5b942' : '#fff');
      },
      'Heures de validité restantes',
      { track: false, fill: false },
    );
    sl.set(30);
    sceneState.render = render;
    render('sc_overlap');
  };

  /* ---------- 08 · QUALITÉ ---------- */
  SCENES[7].cbuild = function (g) {
    decor(g, 180, 340);
    var LANES = [
      {
        y: 212,
        title: '01 · LOCAL  ›  NPM RUN CHECK',
        xs: [44, 112, 180, 248, 316],
        n: [
          ['l1', 'Syntaxe'],
          ['l2', 'Tests'],
          ['l3', 'Vitest'],
          ['l4', 'ESLint'],
          ['l5', 'Build'],
        ],
      },
      {
        y: 340,
        title: '02 · CI  ›  CHECK:CI + WORKFLOWS',
        xs: [34, 92, 150, 208, 266, 324],
        n: [
          ['c1', 'Couv.'],
          ['c2', 'Mutants'],
          ['c3', 'Docker'],
          ['c4', 'E2E'],
          ['c5', 'axe'],
          ['c6', 'CodeQL'],
        ],
      },
      {
        y: 468,
        title: '03 · PRODUCTION  ›  APRÈS FUSION',
        xs: [44, 112, 180, 248, 316],
        n: [
          ['p1', 'Merge'],
          ['p2', 'Deploy'],
          ['p3', 'Ready'],
          ['p4', 'SHA'],
          ['p5', 'Smoke'],
        ],
      },
    ];
    LANES.forEach(function (L) {
      el('text', { x: 12, y: L.y - 40, class: 'sl-ttl' }, g, L.title);
      for (var i = 0; i < L.xs.length - 1; i++)
        el(
          'path',
          {
            d: 'M' + (L.xs[i] + 19) + ' ' + L.y + ' L' + (L.xs[i + 1] - 19) + ' ' + L.y,
            class: 'edge-line',
          },
          g,
        );
      L.n.forEach(function (n, i) {
        node(g, n[0], L.xs[i], L.y, 12, n[1], null, null, {
          tone: n[0] === 'c2' || n[0] === 'p4' || n[0] === 'l3' ? 'lime' : null,
        });
      });
    });
    el('text', { x: 12, y: 536, class: 'note' }, g).innerHTML = tr(
      '<tspan class="note-k">PRINCIPE  </tspan><tspan>UN CI VERT NE PROUVE PAS</tspan>',
    );
    el('text', { x: 12, y: 550, class: 'note' }, g, 'UN DÉPLOIEMENT : SEUL LE SHA SERVI LE PROUVE');
  };

  /* ---------- moteur de scènes ---------- */
  function go(i, focus) {
    stopTour();
    clearTimers();
    state.tab = i;
    var sc = SCENES[i];
    curScene = sc;
    sceneState = {};
    canvas.classList.add('is-out');
    clearTimeout(buildT);
    building = true;
    buildT = setTimeout(
      function () {
        clear(canvas);
        items = {};
        movers = [];
        state.sel = null;
        buildScene(sc);
        if (restoreSelection && items[restoreSelection]) select(restoreSelection, { force: true });
        restoreSelection = null;
        canvas.classList.remove('is-out');
        building = false;
      },
      state.anim ? 180 : 0,
    );

    tabEls.forEach(function (t, k) {
      t.classList.toggle('is-on', k === i);
      t.setAttribute('aria-selected', k === i ? 'true' : 'false');
      t.setAttribute('tabindex', k === i ? '0' : '-1');
    });
    if (focus) tabEls[i].focus();
    tabNum.textContent = trc(('0' + (i + 1)).slice(-2));
    paintBtn(false);
  }
  /* Récupère les textes (titres, corps, pastilles) des éléments de la version large,
     pour que la mise en page compacte affiche exactement les mêmes contenus. */
  function harvest(sc) {
    var sItems = items,
      sMov = movers,
      sSS = sceneState,
      sCur = CUR;
    items = {};
    movers = [];
    sceneState = {};
    CUR = null;
    try {
      sc.build(el('g', null, null));
    } catch (e) {}
    sc.data = items;
    items = sItems;
    movers = sMov;
    sceneState = sSS;
    CUR = sCur;
    clearTimers();
  }
  function buildScene(sc) {
    var g = el('g', null, canvas);
    if (sc.q) {
      if (compact) {
        el('text', { x: 12, y: 92, class: 'q-k' }, g, 'QUESTION');
        wrap(g, sc.q, 12, 112, 276, 19, 'q-t');
      } else {
        el('text', { x: SIDE + 24, y: HEAD + 32, class: 'q-k' }, g, 'QUESTION');
        el('text', { x: SIDE + 24, y: HEAD + 51, class: 'q-t' }, g, sc.q);
      }
    }
    if (compact) {
      if (!sc.data) harvest(sc);
      CUR = sc.data;
      sc.cbuild(g);
    } else {
      // Keep the drawing centred between its question and the bottom detail panel.
      var stage = el('g', { transform: 'translate(0 ' + (H - 630) / 2 + ')' }, g);
      sc.build(stage);
    }
    setSignal(sc.signal);
    select(sc.def, { force: true, tour: true });
    kick();
  }

  /* ---------- animation des orbites ---------- */
  function orbitPos(m) {
    var o = m.o,
      a = rad(o.rot),
      x = o.rx * Math.cos(m.t),
      y = o.ry * Math.sin(m.t);
    return [m.cx + x * Math.cos(a) - y * Math.sin(a), m.cy + x * Math.sin(a) + y * Math.cos(a)];
  }
  function placeMovers() {
    movers.forEach(function (m) {
      var p = orbitPos(m);
      m.g.setAttribute('transform', 'translate(' + p[0].toFixed(2) + ' ' + p[1].toFixed(2) + ')');
    });
  }
  var raf = 0,
    last = 0,
    io = null;
  function frame(ts) {
    raf = 0;
    if (!movers.length || !state.anim || !state.visible) return;
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    if (!state.paused) {
      movers.forEach(function (m) {
        m.time += dt;
        m.t = m.t0 + m.amp * Math.sin(m.time * m.w + m.ph);
      });
      placeMovers();
    }
    raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (raf || !movers.length || !state.anim || !state.visible) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(
      function (es) {
        state.visible = es[0].isIntersecting;
        if (state.visible) kick();
      },
      { threshold: 0.05 },
    );
    io.observe(root);
  }
  var ro = null;
  if ('ResizeObserver' in window) {
    ro = new ResizeObserver(function () {
      var w = root.getBoundingClientRect().width;
      if (w && (w < BP !== compact || (!compact && sceneHeight() !== H))) {
        mount(root, state.tab, state.sel);
      }
    });
    ro.observe(root);
  }
  root.__pcClean = function () {
    clearTimers();
    stopTour();
    clearTimeout(buildT);
    if (raf) cancelAnimationFrame(raf);
    if (io) io.disconnect();
    if (ro) ro.disconnect();
  };

  /* ---------- démarrage ---------- */
  buildTabs();
  go(startTab || 0);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      if (state.sel && items[state.sel]) renderPanel(items[state.sel]);
    });
  }
}

/**
 * Mounts the map into `root` and returns the cleanup function.
 * @param {HTMLElement} root
 * @returns {() => void}
 */
export function mountProtocapMap(root, dictionary) {
  TR = dictionary || null;
  FRAGMENTS = null;
  mount(root);
  return function () {
    if (root.__pcClean) root.__pcClean();
    root.__pcClean = undefined;
    clear(root);
    root.classList.remove('pc-map', 'compact', 'no-anim');
  };
}
