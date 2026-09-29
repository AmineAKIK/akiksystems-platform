/* eslint-disable no-empty, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unused-expressions --
   ported prototype: kept close to sentinel-map.html rather than restyled. */
/* global window, document, requestAnimationFrame, cancelAnimationFrame, IntersectionObserver, ResizeObserver, setTimeout, clearTimeout, setInterval, clearInterval */
/**
 * Sentinel — interactive map, ported from sentinel-map.html (kept close to the source
 * so later versions of the prototype can be diffed in). Differences with the source:
 * - exported mount function instead of an auto-boot on [data-sentinel-map];
 * - no inline style attributes (production CSP): styles go through the CSSOM.
 * Client-only: call it from an effect.
 */
'use strict';

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
      e.setAttribute(k, attrs[k]);
      if (k === 'text-anchor') e.style.textAnchor = attrs[k];
    }
  if (parent) parent.appendChild(e);
  if (txt != null) e.textContent = txt;
  return e;
}
function clear(n) {
  while (n.firstChild) n.removeChild(n.firstChild);
}
function up(s) {
  return String(s).toUpperCase();
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
function mount(root, startTab) {
  var reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (root.__pcClean) root.__pcClean();
  var rw = root.getBoundingClientRect().width || window.innerWidth;
  var compact = rw < BP;
  var W = compact ? 360 : 1312,
    H = compact ? 960 : 640,
    HEAD = compact ? 44 : 56,
    SIDE = compact ? 0 : 128;
  var CUR = null;
  root.classList.add('sn-map');
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
        'Carte interactive de Sentinel : cycle des incidents, rôles, architecture, sécurité, design et livraison',
    },
    scroll,
  );

  var defs = el('defs', null, svg);
  defs.innerHTML =
    '<clipPath id="sn-clip"><rect x="0" y="0" width="' +
    W +
    '" height="' +
    H +
    '" rx="10"/></clipPath>' +
    '<clipPath id="sn-clip-canvas"><rect x="' +
    SIDE +
    '" y="' +
    HEAD +
    '" width="' +
    (W - SIDE) +
    '" height="' +
    (H - HEAD) +
    '"/></clipPath>' +
    '<radialGradient id="sn-glow"><stop offset="0" stop-color="#2d55ff" stop-opacity=".16"/><stop offset="1" stop-color="#2d55ff" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="sn-glow-core"><stop offset="0" stop-color="#2d55ff" stop-opacity=".38"/><stop offset="1" stop-color="#2d55ff" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="sn-core" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#4a6dff"/><stop offset="1" stop-color="#1b2fb0"/></radialGradient>' +
    '<marker id="sn-arr" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 1 L9 5 L0 9z" fill="#7f95e0"/></marker>' +
    '<marker id="sn-arr-hot" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 1 L9 5 L0 9z" fill="#c8ff2e"/></marker>';

  var clipG = el('g', { 'clip-path': 'url(#sn-clip)' }, svg);
  el('rect', { x: 0, y: 0, width: W, height: H, class: 'card-bg' }, clipG);

  var canvasClip = el('g', { 'clip-path': 'url(#sn-clip-canvas)' }, clipG);
  var canvas = el('g', { class: 'canvas' }, canvasClip);
  var panelG = el('g', { class: 'panel' }, clipG);
  var chrome = el('g', { class: 'chrome' }, clipG);
  el('rect', { x: 0.5, y: 0.5, width: W - 1, height: H - 1, rx: 10, class: 'card-edge' }, svg);

  /* mesure de texte */
  var meas = el('text', { x: -999, y: -999, class: 'p-body', 'aria-hidden': 'true' }, svg);
  function measure(str, cls) {
    meas.setAttribute('class', cls);
    meas.textContent = str;
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
    var words = String(str).split(' '),
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
    buildT = 0;
  root.classList.toggle('no-anim', !state.anim);

  /* ---------- enregistrement des éléments interactifs ---------- */
  function reg(id, data, els) {
    if (!data) data = Object.assign({ title: id, body: '' }, CUR && CUR[id]);
    data.id = id;
    data.els = els;
    items[id] = data;
    els.forEach(function (e) {
      e.setAttribute('tabindex', '0');
      e.setAttribute('role', 'button');
      e.setAttribute('aria-label', data.title);
      e.addEventListener('pointerenter', function (ev) {
        if (ev.pointerType === 'mouse') {
          state.paused = true;
          select(id);
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
    live.textContent = it.title + '. ' + it.body;
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
      el('text', { x: 28, y: cy0 + 17, class: 'sig-lab' }, sigG, lab);
      el('text', { x: 28, y: cy0 + 33, class: 'sig-val' }, sigG, val);
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
      h = 232,
      y = H - 332;
    el('rect', { x: x, y: y, width: w, height: h, rx: 6, class: 'panel-bg' }, detailG);
    var k = wrap(detailG, up(it.kicker || ''), x + 16, y + 22, w - 32, 12, 'p-kick');
    var ky = (k.lines - 1) * 12;
    var t = wrap(detailG, it.title, x + 16, y + 46 + ky, w - 32, 20, 'p-title');
    var by = y + 46 + ky + (t.lines - 1) * 20 + 24;
    var b = wrap(detailG, it.body, x + 16, by, w - 32, 16, 'p-body');
    var ny = by + (b.lines - 1) * 16;
    if (it.test) {
      wrap(detailG, 'TEST › ' + it.test, x + 16, ny + 20, w - 32, 15, 'p-test');
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
  el('rect', { x: 0, y: 0, width: W, height: HEAD, class: 'head-bg' }, chrome);
  el('line', { x1: 0, y1: HEAD, x2: W, y2: HEAD, class: 'rule' }, chrome);
  if (!compact) {
    el('rect', { x: 0, y: HEAD, width: SIDE, height: H - HEAD, class: 'side-bg' }, chrome);
    el('line', { x1: SIDE, y1: HEAD, x2: SIDE, y2: H, class: 'rule' }, chrome);
  }

  var lgx = compact ? 12 : 17,
    lgy = compact ? 10 : 16;
  el('rect', { x: lgx, y: lgy, width: 24, height: 24, rx: 6, fill: '#2d55ff' }, chrome);
  el(
    'path',
    {
      d:
        'M' +
        (lgx + 12) +
        ' ' +
        (lgy + 4.5) +
        ' L' +
        (lgx + 13.8) +
        ' ' +
        (lgy + 10.2) +
        ' L' +
        (lgx + 19.5) +
        ' ' +
        (lgy + 12) +
        ' L' +
        (lgx + 13.8) +
        ' ' +
        (lgy + 13.8) +
        ' L' +
        (lgx + 12) +
        ' ' +
        (lgy + 19.5) +
        ' L' +
        (lgx + 10.2) +
        ' ' +
        (lgy + 13.8) +
        ' L' +
        (lgx + 4.5) +
        ' ' +
        (lgy + 12) +
        ' L' +
        (lgx + 10.2) +
        ' ' +
        (lgy + 10.2) +
        ' Z',
      fill: '#fff',
    },
    chrome,
  );
  var ttl = el('text', { x: lgx + 35, y: compact ? 26.5 : 32, class: 'h-title' }, chrome);
  el('tspan', null, ttl, 'SENTINEL / INCIDENTS');
  var crumb = el('tspan', { dx: 12, class: 'h-crumb' }, ttl, '');

  var pill = el(
    'g',
    {
      class: compact ? 'btn is-on' : 'pill',
      tabindex: 0,
      role: 'button',
      'aria-pressed': state.anim ? 'true' : 'false',
      'aria-label': 'Activer ou couper les animations',
      style: 'cursor:pointer',
    },
    chrome,
  );
  var pillW = compact ? 164 : 132,
    PX = compact ? 184 : W - 16 - pillW,
    PY = compact ? H - 42 : 13,
    PH = 30;
  el(
    'rect',
    { x: PX, y: PY, width: pillW, height: PH, rx: 15, class: compact ? 'btn-bg' : 'pill-bg' },
    pill,
  );
  if (compact) el('circle', { cx: PX + 16, cy: PY + 15, r: 4, class: 'btn-ico' }, pill);
  var pillTxt = el(
    'text',
    {
      x: compact ? PX + 30 : PX + pillW / 2,
      y: PY + 18.5,
      class: compact ? 'btn-txt' : 'pill-txt',
    },
    pill,
    '',
  );
  function paintPill() {
    pillTxt.textContent = 'ANIMATION · ' + (state.anim ? 'ON' : 'OFF');
    pill.setAttribute('aria-pressed', state.anim ? 'true' : 'false');
    if (compact) pill.classList.toggle('is-on', state.anim);
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
  el(
    'circle',
    { cx: compact ? W - 34 : W - 16 - pillW - 34, cy: compact ? 22 : 28, r: 5, fill: '#7d99ff' },
    chrome,
  );
  el(
    'circle',
    { cx: compact ? W - 14 : W - 16 - pillW - 14, cy: compact ? 22 : 28, r: 5, fill: '#c8ff2e' },
    chrome,
  );

  var tabNum = el('text', { x: 20, y: 86, class: 'tab-num' }, chrome, '01');
  if (compact) tabNum.setAttribute('display', 'none');
  var tabList = el('g', { role: 'tablist', 'aria-label': 'Vues de la carte' }, chrome);
  var tabEls = [];
  var TAB_Y0 = 100,
    TAB_STEP = 38;

  function buildTabs() {
    var cpos = [];
    if (compact) {
      var rowsT = [
        [0, 1, 2, 3],
        [4, 5, 6],
      ];
      rowsT.forEach(function (row, ri) {
        var ws = row.map(function (i) {
          return Math.ceil(measure(up(SCENES[i].tab), 'tab-txt')) + 16;
        });
        var tot = ws.reduce(function (p, q) {
            return p + q;
          }, 0),
          gap = 6;
        var extra = (336 - gap * (row.length - 1) - tot) / row.length,
          x = 12;
        row.forEach(function (i, k) {
          var w = ws[k] + extra;
          cpos[i] = [x, 54 + ri * 32, w];
          x += w + gap;
        });
      });
    }
    SCENES.forEach(function (sc, i) {
      var g = el(
        'g',
        {
          class: 'tab',
          role: 'tab',
          tabindex: i === 0 ? 0 : -1,
          'aria-selected': i === 0 ? 'true' : 'false',
          'aria-label': sc.label,
          style: 'cursor:pointer',
        },
        tabList,
      );
      if (compact) {
        var p = cpos[i];
        el('rect', { x: p[0], y: p[1], width: p[2], height: 26, rx: 4, class: 'tab-bg' }, g);
        el('text', { x: p[0] + p[2] / 2, y: p[1] + 17, class: 'tab-txt' }, g, up(sc.tab));
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

    var appLink = el(
      'a',
      {
        class: 'tab external-tab',
        href: 'https://sentinel.akiksystems.fr',
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': 'Ouvrir l’application Sentinel',
        style: 'cursor:pointer',
      },
      tabList,
    );
    if (compact) {
      el('rect', { x: 12, y: 118, width: 336, height: 26, rx: 4, class: 'tab-bg' }, appLink);
      el('text', { x: 180, y: 135, class: 'tab-txt' }, appLink, 'APPLICATION ↗');
    } else {
      var appY = TAB_Y0 + SCENES.length * TAB_STEP;
      el('rect', { x: 10, y: appY, width: 108, height: 30, rx: 4, class: 'tab-bg' }, appLink);
      el('text', { x: 20, y: appY + 19, class: 'tab-txt' }, appLink, 'APPLICATION ↗');
    }
  }

  var btn = el(
    'g',
    {
      class: 'btn',
      tabindex: 0,
      role: 'button',
      'aria-label': 'Lancer ou arrêter le parcours guidé',
      style: 'cursor:pointer',
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
    el('text', { x: 20, y: BTN_Y - 12, class: 'side-hint' }, chrome, 'SURVOLER · CLIQUER');
  function paintBtn(on) {
    btn.classList.toggle('is-on', on);
    btnTxt.textContent = on ? 'ARRÊTER' : 'PARCOURIR';
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
    if (!sc || !sc.tour || !sc.tour.length) return;
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
      el('ellipse', { cx: cx, cy: cy, rx: 230, ry: 230, fill: 'url(#sn-glow)' }, g);
      return;
    }
    el('ellipse', { cx: cx, cy: cy, rx: 430, ry: 250, fill: 'url(#sn-glow)' }, g);
    [cx - 190, cx + 210].forEach(function (x) {
      el('line', { x1: x, y1: HEAD, x2: x, y2: H, class: 'grid-l' }, g);
    });
    el('line', { x1: SIDE, y1: cy + 176, x2: W, y2: cy + 176, class: 'grid-l' }, g);
    el('text', { x: W - 24, y: HEAD + 22, class: 'hint' }, g, 'INTERACTIF');
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
    if (compact) {
      if (side === 'right') {
        el(
          'text',
          { x: r + 14, y: sub ? -1 : 3, class: 't-name', 'text-anchor': 'start' },
          o,
          up(name),
        );
        if (sub)
          el('text', { x: r + 14, y: 12, class: 't-sub', 'text-anchor': 'start' }, o, up(sub));
        return;
      }
      var cy2 = side === 'top' ? (sub ? [-(r + 27), -(r + 15)] : [-(r + 15)]) : [r + 24, r + 36];
      el('text', { x: 0, y: cy2[0], class: 't-name' }, o, up(name));
      if (sub) el('text', { x: 0, y: cy2[1], class: 't-sub' }, o, up(sub));
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

  /* =================================================================
     SCÈNES
     ================================================================= */
  var SCENES = [];

  /* ---------- 01 · ORBITE ---------- */
  SCENES.push({
    q: 'Que fait Sentinel, et pour qui ?',
    tab: 'Orbite',
    label: "Vue d'ensemble : les espaces de Sentinel autour de la boucle d'apprentissage",
    signal: ['Finalité', 'Maîtrise collective'],
    def: 'sentinel',
    tour: ['c_sig', 'c_res', 'c_doc', 'c_app', 'sentinel'],
    build: function (g) {
      var cx = 730,
        cy = 262;
      decor(g, cx, cy);
      var orbits = [
        { rx: 336, ry: 150, rot: -8, nodes: [['atelier', 2.97]] },
        {
          rx: 300,
          ry: 118,
          rot: 28,
          nodes: [
            ['board', 6.2],
            ['pilotage', 3.32],
          ],
        },
        {
          rx: 250,
          ry: 100,
          rot: -38,
          nodes: [
            ['admin', 1.05],
            ['journal', 4.45],
          ],
        },
        {
          rx: 178,
          ry: 128,
          rot: 72,
          nodes: [
            ['connaissance', 3.75],
            ['outbox', 0.87],
          ],
        },
        { rx: 126, ry: 92, rot: 12, nodes: [], faint: true },
        { rx: 330, ry: 70, rot: 22, nodes: [], faint: true },
      ];
      var lineEls = [];
      orbits.forEach(function (o) {
        var e = el(
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
        lineEls.push(e);
      });

      /* cœur */
      var core = el('g', { class: 'core', transform: 'translate(' + cx + ' ' + cy + ')' }, g);
      el('circle', { r: 104, class: 'core-halo' }, core);
      el('circle', { r: 68, class: 'core-mid' }, core);
      el('circle', { r: 58, class: 'core-disc' }, core);
      el('text', { x: 0, y: 4, class: 'core-txt' }, core, 'SENTINEL');
      el('circle', { r: 74, fill: 'transparent', style: 'cursor:pointer' }, core);
      reg(
        'sentinel',
        {
          kicker: 'Suivi des incidents industriels',
          title: 'Sentinel',
          body: 'Une application full-stack qui suit une anomalie de production de la déclaration à la capitalisation. Elle structure les décisions humaines et leur trace : elle ne pilote pas les machines et ne remplace pas une GMAO.',
          tags: [{ t: 'React 18' }, { t: 'Express' }, { t: 'PostgreSQL 15' }],
        },
        [core],
      );

      /* nœuds mobiles */
      var defs = {
        atelier: [
          'Atelier',
          '/workshop/*',
          'Espace · /workshop/*',
          'Atelier',
          'Déclarer, traiter, arbitrer, piloter et capitaliser. Trois rôles — Opérateur, Maintenance, Responsable — partagent les mêmes écrans ; la policy serveur décide de ce que chacun peut faire.',
          [{ t: 'Opérateur' }, { t: 'Maintenance' }, { t: 'Responsable' }],
        ],
        board: [
          'Board',
          '/board',
          'Espace · /board',
          'Board',
          'Affichage grand écran en lecture seule, lisible de loin, qui ne doit jamais agresser. Il tourne entre alertes, incidents actifs et synthèse par ligne ; aucune action métier, aucune fuite des API Atelier.',
          [{ t: 'Lecture seule' }, { t: 'Code bcrypt' }],
        ],
        admin: [
          'Administration',
          '/admin/*',
          'Espace · /admin/*',
          'Administration',
          'Compte système unique : comptes, lignes et machines, sécurité, notifications, dashboards de qualité et audit consolidé. Les actions sensibles exigent une réauthentification.',
          [{ t: 'Compte unique' }, { t: 'Réauth' }, { t: 'Audit' }],
        ],
        pilotage: [
          'Pilotage',
          'Que révèle la durée ?',
          'Vue · /workshop/pilotage',
          'Pilotage',
          "Volumes créés et clôturés, taux de clôture, ancienneté maximale, tendances journalières (journée métier Europe/Paris) et classements par ligne, machine et type d'anomalie. Accessible aux trois rôles.",
          [{ t: 'KPI' }, { t: 'Tendances' }],
        ],
        journal: [
          'Journal',
          'Trace transverse',
          'Vue · /workshop/journal',
          'Journal',
          "Que s'est-il passé dans l'atelier, tous incidents confondus ? Vue transverse des événements, filtrable, réservée au Responsable. L'Historique, lui, relit un incident précis.",
          [{ t: 'Responsable' }, { t: 'Append-only' }],
        ],
        connaissance: [
          'Connaissance',
          'Mémoire réutilisable',
          'Vue · /workshop/knowledge',
          'Base de connaissance',
          "Ne retient que les incidents clôturés avec une intervention exploitable. Un dispositif d'apprentissage, pas une archive : chaque fiche se conçoit pour être assimilée, pas seulement lue.",
          [{ t: 'Clôturés' }, { t: 'Apprentissage' }],
        ],
        outbox: [
          'Outbox',
          'Notifications',
          'Asynchrone · notification_outbox',
          'Outbox de notifications',
          'Les mails sont déposés dans une outbox avec la transaction métier, puis envoyés par un worker avec retries et backoff. Une panne SMTP ne défait jamais une décision déjà validée.',
          [{ t: 'Durable' }, { t: 'SMTP optionnel' }],
        ],
      };
      movers = [];
      var mk = 0;
      orbits.forEach(function (o, oi) {
        o.nodes.forEach(function (n) {
          var d = defs[n[0]];
          var og = orb(g, 0, 0, 12, null);
          nodeLabels(og, 12, d[0], d[1], 'bottom');
          reg(n[0], { kicker: d[2], title: d[3], body: d[4], tags: d[5] }, [og]);
          movers.push({
            g: og,
            o: o,
            t0: n[1],
            t: n[1],
            time: mk * 3.1,
            amp: 0.09 + 0.018 * mk,
            w: 0.26 + 0.03 * mk,
            ph: mk * 1.7,
            cx: cx,
            cy: cy,
            orbitEl: lineEls[oi],
          });
          mk++;
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

      /* les quatre temps de la boucle */
      function corner(id, x, y, num, text, anchor, data) {
        var c = el('g', { class: 'corner' }, g);
        var w = 150,
          rx = anchor === 'end' ? x - w : x;
        el('rect', { x: rx, y: y - 16, width: w, height: 28, class: 'c-hit' }, c);
        var t = el('text', { x: x, y: y, 'text-anchor': anchor }, c);
        if (anchor === 'end') {
          el('tspan', { class: 't-corner' }, t, up(text) + '  ');
          el('tspan', { class: 't-num' }, t, num);
        } else {
          el('tspan', { class: 't-num' }, t, num + '  ');
          el('tspan', { class: 't-corner' }, t, up(text));
        }
        reg(id, data, [c]);
      }
      corner('c_sig', 172, 262, '01', 'Signaler', 'start', {
        kicker: 'Boucle · 01',
        title: 'Signaler',
        body: "L'opérateur établit la vérité à la source : ligne, machine, robot, tête, état d'anomalie et produit. Signaler doit être rapide, juste, sans friction ni crainte de l'erreur. Une seule anomalie active par emplacement.",
        tags: [{ t: 'Opérateur' }],
      });
      corner('c_res', 1288, 236, '02', 'Résoudre', 'end', {
        kicker: 'Boucle · 02',
        title: 'Résoudre',
        body: "La maintenance prend en charge, met en attente avec un motif, reprend, puis clôture. Le responsable priorise et arbitre les demandes de correction ou d'annulation, dans la même transaction que la décision.",
        tags: [{ t: 'Maintenance' }, { t: 'Responsable' }],
      });
      corner('c_doc', 1288, 470, '03', 'Documenter', 'end', {
        kicker: 'Boucle · 03',
        title: 'Documenter',
        body: "Une clôture exige une note d'intervention. Chaque mutation écrit son acteur, son contexte et des snapshots dans un journal append-only : la trace reste intelligible même après anonymisation d'un compte.",
        tags: [{ t: "Note d'intervention" }, { t: 'Snapshots' }],
      });
      corner('c_app', 172, 470, '04', 'Apprendre', 'start', {
        kicker: 'Boucle · 04',
        title: 'Apprendre',
        body: 'Signaler, résoudre, documenter, apprendre, mieux signaler : la spirale par laquelle le collectif progresse au lieu de répéter. La valeur de Sentinel ne tient pas au temps gagné, mais à la progression durable des personnes.',
        test: 'Cet incident clôturé alimente-t-il une mémoire réutilisable, ou disparaît-il dans un journal ?',
        tags: [{ t: 'Principe P5' }],
      });
    },
  });

  /* ---------- 02 · CYCLE ---------- */
  SCENES.push({
    q: 'Où en est un incident, et que peut-on en faire ?',
    tab: 'Cycle',
    label: "Cycle de vie d'un incident : statuts et transitions autorisées",
    signal: ['Invariant', '1 seul incident actif / emplacement'],
    def: 'n_open',
    tour: [
      'e_create',
      'n_open',
      'e_take',
      'n_taken',
      'e_pend',
      'n_pending',
      'e_resume',
      'e_close',
      'n_closed',
      'e_inval',
      'n_invalid',
    ],
    build: function (g) {
      decor(g, 700, 292);
      var g0 = g;
      g = el('g', { transform: 'translate(0 16)' }, g0);
      var P = {
        canc: [300, 160],
        pend: [560, 160],
        open: [300, 304],
        take: [560, 304],
        clos: [860, 304],
        inv: [1130, 304],
      };

      /* départ */
      el('circle', { cx: 176, cy: 304, r: 6, fill: '#c8ff2e' }, g);
      el('text', { x: 176, y: 328, class: 't-sub' }, g, 'CRÉATION');

      edge(g, 'e_create', 'M184 304 L262 304', 223, 292, 'create', 'middle', {
        kicker: 'Transition · CREATE',
        title: 'Déclarer un incident',
        body: "Les trois rôles peuvent déclarer : ligne, machine, robot, tête, état et produit. Effets : statut OPEN non pris, snapshot du déclarant, événement CREATED. La création n'ajoute aucun suivi.",
        tags: [{ t: 'Opérateur' }, { t: 'Maintenance' }, { t: 'Responsable' }],
      });
      edge(g, 'e_take', 'M336 304 L524 304', 430, 292, 'take', 'middle', {
        kicker: 'Transition · TAKE',
        title: 'Prendre en charge',
        body: 'Réservé à la maintenance, sur un incident OPEN sans arbitrage ouvert. Revendique un incident non pris ou transfère un incident pris par un autre technicien. Un technicien déjà affecté ne peut pas se réaffecter.',
        tags: [{ t: 'Maintenance' }],
      });
      edge(g, 'e_pend', 'M548 276 L548 196', 542, 240, 'set_pending', 'end', {
        kicker: 'Transition · SET_PENDING',
        title: 'Mettre en attente',
        body: "La maintenance suspend un incident pris, sans arbitrage ouvert, avec un motif non vide. L'affectation est conservée ; le motif courant est enregistré dans waiting_reason.",
        tags: [{ t: 'Maintenance' }, { t: 'Motif requis' }],
      });
      edge(g, 'e_resume', 'M572 196 L572 276', 578, 240, 'resume', 'start', {
        kicker: 'Transition · RESUME',
        title: 'Reprendre',
        body: "Retour à OPEN, affectation conservée. Tout technicien de maintenance peut reprendre, afin de ne pas bloquer une équipe en cas d'absence ; un transfert explicite passe ensuite par TAKE.",
        tags: [{ t: 'Maintenance' }],
      });
      edge(g, 'e_close', 'M596 304 L822 304', 710, 292, "close + note d'intervention", 'middle', {
        kicker: 'Transition · CLOSE',
        title: 'Clôturer',
        body: "Sur un incident OPEN pris, sans arbitrage ouvert, avec une note d'intervention obligatoire. Un incident en attente doit d'abord être repris. La date et l'acteur de clôture sont historisés.",
        tags: [{ t: 'Maintenance' }, { t: 'Note requise' }],
      });
      edge(g, 'e_inval', 'M898 304 L1092 304', 995, 292, 'invalidate + motif', 'middle', {
        kicker: 'Transition · INVALIDATE_CLOSED',
        title: 'Invalider une clôture',
        body: "Le responsable invalide une clôture, avec un motif obligatoire. L'incident passe INVALIDATED ; il n'est pas réouvert. Un incident terminal ne redevient jamais actif.",
        tags: [{ t: 'Responsable' }, { t: 'Motif requis' }],
      });
      edge(g, 'e_cancel', 'M300 276 L300 196', 308, 240, 'cancel', 'start', {
        kicker: 'Transition · CANCEL',
        title: 'Annuler un incident non pris',
        body: "Responsable ou maintenance, uniquement si l'incident n'est pas pris et sans arbitrage ouvert. Un opérateur, lui, passe par une demande d'annulation que le responsable arbitre.",
        tags: [{ t: 'Maintenance' }, { t: 'Responsable' }],
      });
      edge(
        g,
        'e_cancel2',
        'M524 160 L338 160',
        431,
        148,
        'cancel · responsable',
        'middle',
        {
          kicker: 'Transition · CANCEL (PENDING)',
          title: 'Annuler un incident en attente',
          body: "Décision de supervision réservée au responsable. L'incident est conservé intégralement dans l'historique, mais exclu des indicateurs opérationnels actifs.",
          tags: [{ t: 'Responsable' }],
        },
        'soft',
      );

      node(g, 'n_open', P.open[0], P.open[1], 24, 'Non pris', 'OPEN', {
        kicker: 'Statut · OPEN non pris',
        title: 'Incident déclaré, à prendre',
        body: 'Statut actif : is_taken, technicien et date de prise sont nuls, et la base interdit toute combinaison incohérente de ces trois champs. Une seule anomalie active peut exister pour un emplacement machine.',
        tags: [{ t: 'Actif' }],
      });
      node(g, 'n_taken', P.take[0], P.take[1], 24, 'Pris', 'OPEN', {
        kicker: 'Statut · OPEN pris',
        title: 'En cours de traitement',
        body: 'Revendiqué par un technicien de maintenance. Côté maintenance, seul le technicien affecté peut le modifier ; le responsable peut toujours éditer les champs descriptifs, et un autre technicien peut le reprendre par TAKE.',
        tags: [{ t: 'Actif' }],
      });
      node(
        g,
        'n_pending',
        P.pend[0],
        P.pend[1],
        24,
        'En attente',
        'PENDING',
        {
          kicker: 'Statut · PENDING',
          title: 'Traitement suspendu',
          body: "Suspendu avec un motif. Un incident PENDING est toujours pris. Seul le responsable peut l'annuler ; pour clôturer, il faut d'abord reprendre.",
          tags: [{ t: 'Actif' }, { t: 'Toujours pris' }],
        },
        { tone: 'amber', side: 'top' },
      );
      node(
        g,
        'n_closed',
        P.clos[0],
        P.clos[1],
        24,
        'Clôturé',
        'CLOSED',
        {
          kicker: 'Statut · CLOSED · terminal',
          title: 'Intervention clôturée',
          body: "Clôturé avec une note d'intervention. Un incident terminal ne redevient jamais actif. C'est ce qui alimente la base de connaissance : la mémoire de l'atelier.",
          tags: [{ t: 'Terminal', k: 'ok' }],
        },
        { tone: 'lime' },
      );
      node(
        g,
        'n_canceled',
        P.canc[0],
        P.canc[1],
        24,
        'Annulé',
        'CANCELED',
        {
          kicker: 'Statut · CANCELED · terminal',
          title: 'Déclaration annulée',
          body: "Conservée dans l'historique, exclue des indicateurs actifs. L'archivage forcé d'une ligne annule aussi ses incidents actifs — motif line_archived — et rend leurs arbitrages caducs, dans la même transaction.",
          tags: [{ t: 'Terminal' }],
        },
        { tone: 'grey', side: 'top' },
      );
      node(
        g,
        'n_invalid',
        P.inv[0],
        P.inv[1],
        24,
        'Invalidé',
        'INVALIDATED',
        {
          kicker: 'Statut · INVALIDATED · terminal',
          title: 'Clôture invalidée',
          body: "Une clôture jugée non recevable par un responsable, avec son motif. Elle reste tracée ; annulations et invalidations n'alimentent ni les KPI actifs ni la base de connaissance.",
          tags: [{ t: 'Terminal' }],
        },
        { tone: 'grey' },
      );

      note(g, 158, 442, 'Arbitrage', 'une demande ouverte bloque les mutations concurrentes');
      note(
        g,
        158,
        460,
        'Autorité',
        "la policy backend décide — le frontend n'en est que le miroir",
      );
    },
  });

  /* ---------- 03 · RÔLES ---------- */
  SCENES.push({
    q: 'Qui peut faire quoi ?',
    tab: 'Rôles',
    label: 'Matrice des permissions par rôle Atelier',
    signal: ['Autorité', 'Policy serveur · canPerform'],
    def: 'role_resp',
    tour: ['role_op', 'role_mnt', 'role_resp', 'r_arb', 'r_take', 'r_create'],
    build: function (g) {
      decor(g, 720, 292);
      var cols = [
        { id: 'role_op', x: 800, name: 'Opérateur', sub: 'signale' },
        { id: 'role_mnt', x: 950, name: 'Maintenance', sub: 'intervient' },
        { id: 'role_resp', x: 1100, name: 'Responsable', sub: 'oriente' },
      ];
      var rows = [
        [
          'r_create',
          'Déclarer un incident',
          [1, 1, 1],
          "Les trois rôles déclarent. Une seule anomalie active peut exister par emplacement machine, et la création n'ajoute aucun suivi automatique.",
        ],
        [
          'r_req_edit',
          'Demander / retirer une correction (sa déclaration)',
          [1, 0, 0],
          "Seul l'opérateur déclarant, sur sa propre déclaration active et sans autre arbitrage ouvert. Seuls les champs demandés sont stockés dans le cas d'arbitrage.",
        ],
        [
          'r_req_cancel',
          'Demander / retirer une annulation (déclaration non prise)',
          [1, 0, 0],
          "Possible tant que la déclaration n'est pas prise, avec un motif. La demande peut être retirée tant qu'elle attend l'arbitrage.",
        ],
        [
          'r_edit_free',
          'Modifier un incident actif non pris',
          [0, 1, 1],
          "Responsable ou maintenance (DIRECT_EDIT). Une mise à jour sans écart réel répond NO_CHANGES : ni écriture, ni événement d'audit trompeur.",
        ],
        [
          'r_edit_taken',
          'Modifier un incident actif pris',
          [0, 2, 1],
          'Le responsable édite les champs descriptifs ; la maintenance seulement si elle est le technicien affecté (EDIT_AFTER_TAKE).',
        ],
        [
          'r_take',
          'Prendre / transférer un incident',
          [0, 1, 0],
          'Prise en charge ou transfert explicite, réservés à la maintenance. Un technicien déjà affecté ne peut pas se réaffecter.',
        ],
        [
          'r_treat',
          'Mettre en attente / reprendre / clôturer',
          [0, 1, 0],
          "Les actions de traitement. Une maintenance remplaçante peut suspendre, reprendre ou clôturer pour ne pas bloquer une équipe en cas d'absence.",
        ],
        [
          'r_cancel',
          'Annuler un incident non pris',
          [0, 1, 1],
          "Responsable ou maintenance, uniquement si l'incident n'est pas pris et sans arbitrage ouvert.",
        ],
        [
          'r_cancel_pend',
          'Annuler un incident en attente',
          [0, 0, 1],
          'Décision de supervision, réservée au responsable.',
        ],
        [
          'r_arb',
          'Arbitrer correction / annulation',
          [0, 0, 1],
          "Approuver ou rejeter. La décision et la transition de l'incident partagent la même transaction ; « Annuler » la modale ne consulte jamais le cas.",
        ],
        [
          'r_prio',
          'Définir priorité / consigne',
          [0, 0, 1],
          'Le responsable priorise et laisse une consigne, lisible à distance sur le Board.',
        ],
        [
          'r_inval',
          'Invalider une clôture',
          [0, 0, 1],
          "Avec un motif obligatoire ; l'incident passe INVALIDATED sans être réouvert.",
        ],
        [
          'r_follow',
          'Suivre / ne plus suivre',
          [0, 0, 1],
          "Suivi strictement volontaire (l'étoile) : ni la création ni une décision d'arbitrage n'ajoutent de suivi.",
        ],
      ];
      var Y0 = 180,
        RH = 22.5;
      var colBg = el(
        'rect',
        {
          class: 'm-col-bg',
          rx: 8,
          y: 66,
          height: Y0 + (rows.length - 1) * RH + 14 - 66,
          width: 108,
        },
        g,
      );
      function showCol(i) {
        if (i == null) {
          colBg.classList.remove('on');
          return;
        }
        colBg.setAttribute('x', cols[i].x - 54);
        colBg.classList.add('on');
      }

      /* en-têtes de rôles */
      var roleData = {
        role_op: {
          kicker: 'Rôle · OPERATOR · signale',
          title: 'Opérateur',
          body: "Établit la vérité à la source. Besoin : signaler vite et juste, sans friction ni crainte de l'erreur. Suit l'avancement de ses propres déclarations et peut demander une correction ou une annulation.",
        },
        role_mnt: {
          kicker: 'Rôle · MAINTENANCE · intervient et documente',
          title: 'Maintenance',
          body: "Résout et nourrit la mémoire. Besoin : comprendre vite pour bien agir, et transmettre ce qu'elle apprend. Prend en charge, met en attente, reprend et clôture avec une note d'intervention.",
        },
        role_resp: {
          kicker: 'Rôle · RESPONSABLE · oriente',
          title: 'Responsable',
          body: 'Arbitre pour le collectif. Besoin : une visibilité complète pour décider au bon moment. Priorise, arbitre, invalide une clôture, et seul accède au Journal transverse.',
        },
      };
      cols.forEach(function (c, i) {
        var count = rows.filter(function (r) {
          return r[2][i] > 0;
        }).length;
        var o = orb(g, c.x, 96, 15, null);
        o.classList.add('role');
        el('text', { x: 0, y: 40, class: 't-name' }, o, up(c.name));
        el('text', { x: 0, y: 53, class: 't-sub' }, o, up(c.sub));
        var d = roleData[c.id];
        d.tags = [{ t: count + ' actions sur 13', k: 'ok' }];
        reg(c.id, d, [o]);
        o.addEventListener('pointerenter', function () {
          showCol(i);
        });
        o.addEventListener('pointerleave', function () {
          showCol(null);
        });
        o.addEventListener('focus', function () {
          showCol(i);
        });
        o.addEventListener('blur', function () {
          showCol(null);
        });
      });

      /* lignes */
      rows.forEach(function (r, ri) {
        var y = Y0 + ri * RH;
        var rg = el('g', { class: 'm-row' }, g);
        el('rect', { x: 152, y: y - 15, width: 1000, height: RH, rx: 4, class: 'm-row-bg' }, rg);
        el('text', { x: 164, y: y + 1, class: 'm-txt' }, rg, r[1]);
        r[2].forEach(function (v, ci) {
          var cx = cols[ci].x;
          if (v === 1) el('circle', { cx: cx, cy: y - 3, r: 5.5, class: 'm-yes' }, rg);
          else if (v === 2) {
            el('circle', { cx: cx, cy: y - 3, r: 6, class: 'm-cond-ring' }, rg);
            el('circle', { cx: cx, cy: y - 3, r: 2.3, class: 'm-cond-dot' }, rg);
          } else el('circle', { cx: cx, cy: y - 3, r: 2, class: 'm-no' }, rg);
        });
        var tags = [];
        r[2].forEach(function (v, ci) {
          if (v > 0) tags.push({ t: cols[ci].name + (v === 2 ? ' · si affecté' : ''), k: 'ok' });
        });
        reg(
          r[0],
          { kicker: 'Action · matrice des permissions', title: r[1], body: r[3], tags: tags },
          [rg],
        );
        rg.addEventListener('pointerenter', function () {
          showCol(null);
        });
      });

      /* légende */
      var ly = Y0 + (rows.length - 1) * RH + 30;
      el('circle', { cx: 800, cy: ly, r: 4.5, class: 'm-yes-l' }, g);
      el('text', { x: 812, y: ly + 3, class: 'm-legend' }, g, 'AUTORISÉ');
      el('circle', { cx: 894, cy: ly, r: 5, class: 'm-cond-ring' }, g);
      el('circle', { cx: 894, cy: ly, r: 2, class: 'm-cond-dot' }, g);
      el('text', { x: 906, y: ly + 3, class: 'm-legend' }, g, 'SI AFFECTÉ');
      el('circle', { cx: 990, cy: ly, r: 2, class: 'm-no' }, g);
      el('text', { x: 1002, y: ly + 3, class: 'm-legend' }, g, 'REFUSÉ');
    },
  });

  /* ---------- 04 · ARCHITECTURE ---------- */
  SCENES.push({
    q: 'Comment Sentinel est-il construit ?',
    tab: 'Architecture',
    label: 'Architecture : navigateur, proxy, frontend, backend, PostgreSQL',
    signal: ['Migrations', '050 · checksums SHA-256'],
    def: 'back',
    tour: [
      'nav',
      'proxy',
      'front',
      'back',
      'l_route',
      'l_ctrl',
      'l_serv',
      'l_repo',
      'db',
      'outbox',
      'smtp',
    ],
    build: function (g) {
      decor(g, 700, 292);
      var N = {
        nav: [212, 300],
        proxy: [400, 300],
        front: [612, 176],
        back: [612, 300],
        db: [860, 300],
        sup: [760, 176],
        ia: [1030, 176],
        out: [760, 424],
        smtp: [1030, 424],
      };
      function ln(id, d, lx, ly, txt, anchor, cls) {
        var e = el('g', { class: 'edge' }, g);
        el('path', { d: d, class: 'edge-line' + (cls ? ' ' + cls : '') }, e);
        if (txt)
          el(
            'text',
            { x: lx, y: ly, class: 't-edge', 'text-anchor': anchor || 'middle' },
            e,
            up(txt),
          );
      }
      ln('a', 'M240 300 L372 300', 306, 288, 'https');
      ln('b', 'M428 300 L584 300', 506, 288, '/api/*');
      ln('c', 'M420 278 C 470 176, 520 176, 584 176', 470, 166, 'autres chemins', 'middle');
      ln('d', 'M640 300 L832 300', 736, 288, 'sql paramétré');
      ln('e', 'M636 284 C 680 250, 700 210, 736 190', 0, 0, '');
      ln('f', 'M636 316 C 680 350, 700 390, 736 410', 0, 0, '');
      ln('g', 'M788 176 L1002 176', 895, 165, 'clé jamais exposée au navigateur');
      ln('h', 'M788 424 L1002 424', 895, 413, 'smtp · retries · backoff');

      node(g, 'nav', N.nav[0], N.nav[1], 22, 'Navigateur', 'SPA React 18', {
        kicker: 'Client · frontend/src',
        title: 'Navigateur',
        body: 'SPA React 18 + TypeScript, Vite 8, React Router en Declarative Mode, pages chargées en lazy. Client fetch typé, annulable, avec timeout ; un chargement périmé ne peut jamais écraser un résultat plus récent. Aucun dangerouslySetInnerHTML ni secret côté client.',
        tags: [{ t: 'React 18' }, { t: 'Vite 8' }, { t: 'Playwright' }],
      });
      node(g, 'proxy', N.proxy[0], N.proxy[1], 22, 'Proxy', 'Caddy · Nginx hôte', {
        kicker: 'Edge · TLS',
        title: 'Reverse proxy',
        body: "Topologie A : Caddy intégré, seul à publier 80/443. Topologie B, celle de l'instance publique : Nginx hôte, services publiés uniquement sur 127.0.0.1. Dans les deux cas /api/* va au backend, le reste au frontend.",
        tags: [{ t: 'TLS' }, { t: '2 topologies' }],
      });
      node(g, 'front', N.front[0], N.front[1], 22, 'Frontend', 'Nginx :8080', {
        kicker: 'Conteneur · non-root',
        title: 'Frontend Nginx',
        body: 'Nginx non-root, système de fichiers en lecture seule, sans capabilities Linux. Assets à cache long, index.html sans cache afin de préserver les déploiements de la SPA.',
        tags: [{ t: 'Non-root' }, { t: 'Read-only' }],
      });
      node(
        g,
        'back',
        N.back[0],
        N.back[1],
        26,
        'Backend',
        'Express :3000',
        {
          kicker: 'Conteneur · Node 24',
          title: 'Backend Express',
          body: "Monolithe modulaire TypeScript, SQL direct sans ORM. Migrations appliquées sous verrou avant d'écouter, worker d'outbox, arrêt idempotent sur SIGTERM. /api/health interroge réellement PostgreSQL et publie le SHA Git déployé.",
          tags: [{ t: 'Zod' }, { t: 'Pino' }, { t: 'Jest' }],
        },
        { tone: 'lime' },
      );
      node(g, 'db', N.db[0], N.db[1], 24, 'PostgreSQL', 'v15 · :5432', {
        kicker: 'Données · réseau interne',
        title: 'PostgreSQL 15',
        body: '50 migrations append-only, checksum SHA-256 vérifié au démarrage : une migration modifiée fait refuser le démarrage. Les contraintes SQL — unicité, checks, triggers — doublent les règles métier critiques et ferment les courses concurrentes.',
        tags: [{ t: '50 migrations' }, { t: 'Jamais publié' }],
      });
      node(g, 'sup', N.sup[0], N.sup[1], 18, 'Support IA', 'proxy borné', {
        kicker: 'Module · support',
        title: 'Support IA',
        body: "Le backend est l'unique intermédiaire avec le fournisseur : entrées validées et bornées, rate limit par identité et IP, timeout, taille et schéma de la réponse contrôlés. La base de connaissance fonctionnelle est chargée depuis un document local.",
        tags: [{ t: 'Zod' }, { t: 'Rate limit' }],
      });
      node(
        g,
        'ia',
        N.ia[0],
        N.ia[1],
        18,
        'DeepSeek',
        'optionnel',
        {
          kicker: 'Externe · optionnel',
          title: 'Fournisseur IA',
          body: "Optionnel. Une absence de clé, un timeout ou une réponse invalide produit une erreur explicite sans bloquer le reste de l'application.",
          tags: [{ t: 'Dégradation douce', k: 'ok' }],
        },
        { tone: 'dim' },
      );
      node(g, 'outbox', N.out[0], N.out[1], 18, 'Worker outbox', 'notifications', {
        kicker: 'Asynchrone · notification_outbox',
        title: 'Outbox durable',
        body: "Les mails sont insérés avec la transaction métier, puis réservés par lots et envoyés avec retries et backoff. Reprise bornée, déduplication de la source, trace des succès, des skips et des abandons : jamais d'envoi au milieu d'une transaction.",
        tags: [{ t: 'Retries' }, { t: 'Backoff' }],
      });
      node(
        g,
        'smtp',
        N.smtp[0],
        N.smtp[1],
        18,
        'SMTP',
        'optionnel',
        {
          kicker: 'Externe · optionnel',
          title: 'SMTP',
          body: "Sans SMTP, l'application reste pleinement fonctionnelle : la dégradation est journalisée au démarrage, elle ne bloque rien.",
          tags: [{ t: 'Dégradation douce', k: 'ok' }],
        },
        { tone: 'dim' },
      );

      /* couches d'un module */
      el(
        'text',
        { x: 158, y: 388, class: 't-sub', 'text-anchor': 'start' },
        g,
        "COUCHES D'UN MODULE BACKEND",
      );
      var layers = [
        [
          'l_route',
          'Route',
          'Méthode, URL, ordre des middlewares : authentification, headers, rate limiting.',
        ],
        [
          'l_ctrl',
          'Controller',
          'Parsing HTTP, validation Zod, code de réponse. Aucune règle métier.',
        ],
        [
          'l_serv',
          'Service · policy',
          "Transaction, invariants, orchestration. La policy actor-aware décide selon le rôle et l'état — c'est la source d'autorité.",
        ],
        [
          'l_repo',
          'Repository',
          'SQL paramétré et mapping des lignes. Les contraintes SQL restent la dernière défense contre les courses concurrentes.',
        ],
      ];
      var lx = 158;
      layers.forEach(function (l, i) {
        var w = i === 2 ? 128 : 92;
        chip(g, l[0], lx, 398, w, l[1], {
          kicker: 'Couche · route → controller → service → repository',
          title: l[1],
          body: l[2],
          tags: [{ t: 'Backend' }],
        });
        if (i < 3)
          el(
            'path',
            { d: 'M' + (lx + w + 3) + ' 410 L' + (lx + w + 12) + ' 410', class: 'edge-line' },
            g,
          );
        lx += w + 16;
      });

      /* groupes de tables */
      el(
        'text',
        { x: 1010, y: 262, class: 't-sub', 'text-anchor': 'start' },
        g,
        'TABLES · 6 GROUPES',
      );
      var groups = [
        [
          't_id',
          'Identités',
          'admin_accounts (admin unique, garanti par une clé singleton), sentinel_users et password_reset_requests. Les badges actifs sont uniques après normalisation.',
        ],
        [
          't_ref',
          'Référentiel',
          "production_lines et production_line_machines : projection normalisée synchronisée par trigger, qui garantit l'unicité globale des identifiants machine.",
        ],
        [
          't_inc',
          'Incidents',
          'workshop_incidents (état courant), workshop_incident_events (journal append-only) et workshop_incident_followers.',
        ],
        [
          't_arb',
          'Arbitrage',
          'workshop_arbitration_cases : machine à états ACTIVE, CONSULTED, APPROVED, REJECTED, WITHDRAWN, SUPERSEDED.',
        ],
        [
          't_aud',
          'Audit',
          "account_audit_events, line_audit_events et admin_system_audit_events, avec snapshots d'identité pour survivre à l'anonymisation.",
        ],
        [
          't_out',
          'Outbox',
          'notification_outbox : payload, statut, tentatives, prochaine tentative et destinataires déjà livrés pour une reprise idempotente.',
        ],
      ];
      groups.forEach(function (t, i) {
        var col = i % 2,
          row = Math.floor(i / 2);
        chip(g, t[0], 1010 + col * 138, 274 + row * 32, 128, t[1], {
          kicker: 'Données · groupe de tables',
          title: t[1],
          body: t[2],
          tags: [{ t: 'PostgreSQL 15' }],
        });
      });
      el('path', { d: 'M886 300 L1000 300', class: 'edge-line plain soft' }, g);
    },
  });

  /* ---------- 05 · SÉCURITÉ ---------- */
  SCENES.push({
    q: "Qui peut entrer où, et qu'est-ce qui le garantit ?",
    tab: 'Sécurité',
    label: 'Sécurité : trois audiences de session cloisonnées et gardes HTTP',
    signal: ['Sessions', '3 audiences · http-only · strict'],
    def: 'tk_workshop',
    tour: [
      'tk_admin',
      'tk_workshop',
      'tk_board',
      'c_jwt',
      'c_cookie',
      'c_csrf',
      'c_reval',
      'c_rate',
    ],
    build: function (g) {
      decor(g, 700, 280);
      var TX = 300,
        RX = 1090,
        YS = [150, 280, 410];
      var allow = {
        tk_admin: ['r_admin'],
        tk_workshop: ['r_workshop', 'r_board'],
        tk_board: ['r_board'],
      };
      var tokIds = ['tk_admin', 'tk_workshop', 'tk_board'];
      var routeIds = ['r_admin', 'r_workshop', 'r_board'];
      var routeNames = {
        r_admin: '/api/admin/*',
        r_workshop: '/api/workshop/*',
        r_board: '/api/board/data',
      };
      var tokNames = { tk_admin: 'JWT admin', tk_workshop: 'JWT atelier', tk_board: 'JWT board' };

      /* liens (dessous) */
      var links = {};
      tokIds.forEach(function (t, ti) {
        links[t] = {};
        routeIds.forEach(function (r, ri) {
          var d =
            'M' +
            (TX + 28) +
            ' ' +
            YS[ti] +
            ' C 560 ' +
            YS[ti] +
            ', 830 ' +
            YS[ri] +
            ', ' +
            (RX - 30) +
            ' ' +
            YS[ri];
          var p = el('path', { d: d, class: 'lnk' }, g);
          var mid = { x: (TX + RX) / 2, y: (YS[ti] + YS[ri]) / 2 };
          var x = el('g', { class: 'xmark' }, g);
          links[t][r] = { p: p, x: x, mid: mid };
        });
      });
      /* croix au milieu des liens refusés */
      tokIds.forEach(function (t) {
        routeIds.forEach(function (r) {
          var L = links[t][r],
            len = 0,
            pt = null;
          try {
            len = L.p.getTotalLength();
            pt = L.p.getPointAtLength(len * 0.62);
          } catch (e) {
            pt = L.mid;
          }
          el('line', { x1: pt.x - 5, y1: pt.y - 5, x2: pt.x + 5, y2: pt.y + 5 }, L.x);
          el('line', { x1: pt.x - 5, y1: pt.y + 5, x2: pt.x + 5, y2: pt.y - 5 }, L.x);
          L.x.setAttribute('class', 'xmark');
        });
      });

      /* portique central */
      var gate = el('g', { class: 'gate', transform: 'translate(700 280)' }, g);
      el('circle', { r: 62, fill: 'url(#sn-glow-core)' }, gate);
      el('circle', { r: 40, class: 'gate-disc' }, gate);
      el('text', { x: 0, y: -2, class: 'gate-txt' }, gate, 'GARDES');
      el('text', { x: 0, y: 11, class: 't-sub' }, gate, 'SERVEUR');
      el('circle', { r: 48, fill: 'transparent', style: 'cursor:pointer' }, gate);
      reg(
        'gate',
        {
          kicker: 'Sécurité applicative',
          title: 'Gardes communes',
          body: "Chaque requête traverse des gardes serveur : le frontend ne fait qu'améliorer l'UX. Au démarrage, assertProductionConfig() refuse tout secret faible, origine non canonique ou hash Board invalide.",
          tags: [{ t: 'Fail-closed', k: 'ok' }],
        },
        [gate],
      );

      /* jetons */
      var tokData = {
        tk_admin: {
          kicker: 'Audience · admin',
          title: 'Session admin',
          body: "Le JWT porte adminId, username et sessionVersion. Il ne donne accès qu'à /api/admin : même origine, mais sessions strictement séparées. Un compte unique, garanti par la base.",
          tags: [
            { t: '/api/admin/*', k: 'ok' },
            { t: '/api/workshop/*', k: 'no' },
            { t: '/api/board/data', k: 'no' },
          ],
        },
        tk_workshop: {
          kicker: 'Audience · workshop',
          title: 'Session atelier',
          body: "Le JWT porte userId, badge, rôle et sessionVersion. Il ouvre /api/workshop et peut aussi lire la projection Board — sans réciprocité. Le badge est numérique, l'identifiant admin ne peut pas l'être : les namespaces sont disjoints.",
          tags: [
            { t: '/api/workshop/*', k: 'ok' },
            { t: '/api/board/data', k: 'ok' },
            { t: '/api/admin/*', k: 'no' },
          ],
        },
        tk_board: {
          kicker: 'Audience · board',
          title: 'Session board',
          body: "Obtenue avec un code local comparé à un hash bcrypt, puis révocable à tout moment par version. Elle ne donne accès qu'à la projection en lecture seule, jamais aux endpoints Atelier.",
          tags: [
            { t: '/api/board/data', k: 'ok' },
            { t: '/api/workshop/*', k: 'no' },
            { t: '/api/admin/*', k: 'no' },
          ],
        },
      };
      var tokOrbs = {},
        routeOrbs = {};
      tokIds.forEach(function (t, i) {
        var o = orb(g, TX, YS[i], 24, null);
        o.querySelector('.orb-dot').setAttribute('r', 4);
        el('text', { x: -40, y: 4, class: 't-name', 'text-anchor': 'end' }, o, up(tokNames[t]));
        reg(t, tokData[t], [o]);
        tokOrbs[t] = o;
      });
      var routeData = {
        r_admin: {
          kicker: 'Espace · /api/admin',
          title: '/api/admin/*',
          body: "Toutes les routes exigent une session admin, y compris les lectures sensibles. Réauthentification sur les actions sensibles : les quatre premiers échecs refusent l'action, le cinquième révoque toutes les sessions admin (SESSION_REVOKED).",
          tags: [{ t: 'Session admin' }, { t: 'Réauth' }],
        },
        r_workshop: {
          kicker: 'Espace · /api/workshop',
          title: '/api/workshop/*',
          body: "Le middleware relit l'utilisateur à chaque requête sensible : existence, activation, rôle, session_version. Suspension ou changement de rôle : effet immédiat, sans attendre l'expiration du JWT.",
          tags: [{ t: 'Session atelier' }, { t: 'Revalidation' }],
        },
        r_board: {
          kicker: 'Espace · /api/board',
          title: '/api/board/data',
          body: "Projection lecture seule, accessible avec un cookie Board ou Atelier. Cache-Control: no-store, y compris sur les erreurs. Le Board ne réutilise jamais les endpoints détaillés de l'Atelier.",
          tags: [{ t: 'Board ou Atelier' }, { t: 'No-store' }],
        },
      };
      routeIds.forEach(function (r, i) {
        var o = orb(g, RX, YS[i], 24, null);
        o.querySelector('.orb-dot').setAttribute('r', 4);
        el('text', { x: 40, y: 4, class: 't-name', 'text-anchor': 'start' }, o, up(routeNames[r]));
        reg(r, routeData[r], [o]);
        routeOrbs[r] = o;
      });

      /* défenses */
      el('text', { x: 396, y: 440, class: 't-sub', 'text-anchor': 'start' }, g, 'DÉFENSES');
      var defs = [
        [
          'c_jwt',
          'JWT cloisonnés',
          132,
          'HS256, issuer sentinel, audience et scope identiques, algorithmes en liste fermée, version de session comparée à la base. Un token Board ne peut pas être accepté comme token Atelier ou Admin.',
        ],
        [
          'c_cookie',
          'Cookies',
          92,
          'HTTP-only, signés, SameSite=Strict, Secure en production. Les guards ne lisent que signedCookies : une valeur altérée est refusée puis effacée.',
        ],
        [
          'c_csrf',
          'Anti-CSRF',
          100,
          'Sur toute écriture, Origin (ou Referer) doit valoir exactement CLIENT_ORIGIN, et un Sec-Fetch-Site inter-sites est refusé — en plus de SameSite=Strict.',
        ],
        [
          'c_reval',
          'Revalidation',
          108,
          "Rotation de mot de passe, changement de rôle ou de badge, désactivation : incrément atomique de session_version, sessions coupées immédiatement plutôt qu'à l'expiration du JWT.",
        ],
        [
          'c_rate',
          'Rate limits',
          100,
          'Limite globale par IP, limite renforcée sur les connexions, le support IA et la réauthentification admin. Compteurs en mémoire de processus : adaptés à une réplique unique ; plusieurs répliques exigeraient un stockage partagé.',
        ],
      ];
      var dx = 396;
      defs.forEach(function (d) {
        chip(g, d[0], dx, 450, d[2], d[1], {
          kicker: 'Défense · couche HTTP',
          title: d[1],
          body: d[3],
          tags: [{ t: 'Backend' }],
        });
        dx += d[2] + 10;
      });

      /* interaction : jeton sélectionné */
      var cur = null;
      function paintToken(t) {
        cur = t;
        routeIds.forEach(function (r) {
          routeOrbs[r].classList.remove('ok', 'no');
        });
        tokIds.forEach(function (tk) {
          routeIds.forEach(function (r) {
            var L = links[tk][r];
            L.p.setAttribute('class', 'lnk');
            L.x.setAttribute('class', 'xmark');
          });
        });
        routeIds.forEach(function (r) {
          var ok = allow[t].indexOf(r) >= 0;
          var L = links[t][r];
          L.p.setAttribute('class', 'lnk ' + (ok ? 'ok' : 'no'));
          if (!ok) L.x.setAttribute('class', 'xmark on');
          routeOrbs[r].classList.add(ok ? 'ok' : 'no');
        });
      }
      sceneState.onSelect = function (id) {
        if (allow[id]) paintToken(id);
      };
      paintToken('tk_workshop');
    },
    onSelect: function (id) {
      if (sceneState.onSelect) sceneState.onSelect(id);
    },
  });

  /* ---------- 06 · DESIGN ---------- */
  SCENES.push({
    q: 'Quelle règle guide chaque écran ?',
    tab: 'Design',
    label: "Doctrine de design : sept principes et quatre niveaux d'attention",
    signal: ['Doctrine', '7 principes · 4 niveaux'],
    def: 'd_core',
    tour: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
    build: function (g) {
      var cx = 700,
        cy = 282,
        RX = 318,
        RY = 148;
      decor(g, cx, cy);
      el('ellipse', { cx: cx, cy: cy, rx: RX, ry: RY, class: 'orbit-line' }, g);
      el('ellipse', { cx: cx, cy: cy, rx: RX * 0.62, ry: RY * 0.62, class: 'orbit-line faint' }, g);

      var core = el('g', { class: 'core', transform: 'translate(' + cx + ' ' + cy + ')' }, g);
      el('circle', { r: 88, class: 'core-halo' }, core);
      el('circle', { r: 58, class: 'core-mid' }, core);
      el('circle', { r: 48, class: 'core-disc' }, core);
      el('text', { x: 0, y: 4, class: 'core-txt' }, core, 'MAÎTRISE');
      el('circle', { r: 62, fill: 'transparent', style: 'cursor:pointer' }, core);
      reg(
        'd_core',
        {
          kicker: 'Finalité · design.md §1',
          title: "La maîtrise plutôt que l'optimisation",
          body: "Sentinel est un outil qui s'efface pour que l'atelier se maîtrise lui-même : une mémoire commune, une vision du réel sans zone d'ombre, une compréhension qui permet d'agir. Chaque principe est une règle de décision qu'on peut opposer à une proposition d'interface.",
          tags: [{ t: 'Calm technology' }, { t: 'Just culture' }],
        },
        [core],
      );

      var P = [
        [
          'p1',
          'P1',
          'Hiérarchie',
          'Hiérarchie sans agression',
          "L'information importante se distingue par le contraste et la position, non par l'intensité : ni saturation maximale, ni clignotement, ni surface rouge. Le stress ne guide pas la décision, il la dégrade.",
          "Cet élément attire l'œil parce qu'il est important, ou parce qu'il crie ?",
        ],
        [
          'p2',
          'P2',
          'Silence',
          'Le silence par défaut',
          "L'état normal d'une interface est le calme : pas de décoration, pas d'animation qui attire l'attention sur l'interface elle-même, pas de champ affiché sans usage. L'attention est une ressource rare.",
          "Si je retire cet élément, l'utilisateur perd-il une information utile à sa décision ?",
        ],
        [
          'p3',
          'P3',
          'Une question',
          'Répondre à une question',
          "Chaque écran existe pour répondre à une question précise, pour un rôle donné. L'information vient à l'utilisateur ; il n'a ni à la chercher ni à reconstituer la situation.",
          'Quelle est la question à laquelle cet écran répond pour ce rôle ?',
        ],
        [
          'p4',
          'P4',
          'Couleur',
          'La couleur comme langage',
          "La couleur encode un niveau d'attention, de façon constante dans toute l'application. Les tokens --attention-* sont la source unique : cartes, board, pilotage et badges les consomment tous.",
          "Ce traitement correspond-il à un niveau d'attention réel et constant ailleurs dans l'application ?",
        ],
        [
          'p5',
          'P5',
          'Apprentissage',
          "De l'incident à l'apprentissage",
          "Sentinel ne se limite pas à tracer : il capitalise. Un incident documenté alimente une mémoire qui fait progresser les personnes. La base de connaissance est un dispositif d'apprentissage, pas une archive.",
          'Cet incident clôturé alimente-t-il une mémoire réutilisable, ou disparaît-il dans un journal ?',
        ],
        [
          'p6',
          'P6',
          'Sans punir',
          'Responsabiliser sans punir',
          "La traçabilité valorise la contribution ; elle n'est pas un instrument de surveillance. Signaler, intervenir, se tromper de bonne foi doit rester sûr — l'erreur honnête se distingue de la faute.",
          "« Qui a fait quoi » donne-t-il envie de contribuer, ou crainte d'être pris en faute ?",
        ],
        [
          'p7',
          'P7',
          'Temps',
          'Le temps comme matière',
          "Ce qui inquiète n'est pas qu'un incident existe, mais qu'il dure. La durée vécue est visible (« depuis 3 h ») et l'ancienneté doit moduler doucement le niveau d'attention, sans rupture brutale. La fonction existe ; son branchement sur les cartes est une évolution prévue.",
          "Le temps écoulé est-il visible et porteur de sens, ou réduit à une date qu'il faut calculer ?",
        ],
      ];
      P.forEach(function (p, i) {
        var a = rad(-90 + i * (360 / 7));
        var x = cx + RX * Math.cos(a),
          y = cy + RY * Math.sin(a);
        var top = Math.sin(a) < -0.5;
        node(
          g,
          p[0],
          x,
          y,
          14,
          p[1] + ' · ' + p[2],
          null,
          {
            kicker: 'Principe ' + p[1] + ' · design.md §3',
            title: p[3],
            body: p[4],
            test: p[5],
            tags: [{ t: p[1] }],
          },
          { side: top ? 'top' : 'bottom' },
        );
      });

      /* niveaux d'attention */
      el('text', { x: 1092, y: 104, class: 'sl-ttl' }, g, "NIVEAUX D'ATTENTION");
      LEVELS.forEach(function (lv, i) {
        var y = 116 + i * 30;
        var lg = el('g', { class: 'lv' }, g);
        el('rect', { x: 1092, y: y, width: 196, height: 24, rx: 5, class: 'lv-box' }, lg);
        el(
          'rect',
          { x: 1102, y: y + 7, width: 10, height: 10, rx: 2.5, fill: lv.sw, class: 'lv-sw' },
          lg,
        );
        el('text', { x: 1124, y: y + 16, class: 'lv-txt' }, lg, up(lv.name));
        reg(
          lv.id,
          {
            kicker: lv.kicker,
            title: lv.name,
            body: lv.body,
            tags: [{ t: '--attention-' + ['calm', 'watch', 'act', 'critical'][i] }],
          },
          [lg],
        );
      });

      /* curseur P7 : ancienneté → niveau (mêmes paliers que ageAttentionLevel : 1, 3, 7 jours) */
      var SX = 160,
        SW = 250,
        SY = 446,
        MAXD = 9;
      function levelFor(d) {
        return d >= 7 ? 3 : d >= 3 ? 2 : d >= 1 ? 1 : 0;
      }
      el('text', { x: SX, y: 404, class: 'sl-ttl' }, g, "P7 · ÂGE D'UN INCIDENT");
      var val = el('text', { x: SX, y: 424, class: 'sl-val' }, g, '');
      var segs = [
        [0, 1],
        [1, 3],
        [3, 7],
        [7, MAXD],
      ];
      segs.forEach(function (s, i) {
        el(
          'rect',
          {
            x: SX + (s[0] / MAXD) * SW,
            y: SY - 2,
            width: ((s[1] - s[0]) / MAXD) * SW - 1,
            height: 4,
            rx: 2,
            fill: LEVELS[i].sw,
            opacity: 0.85,
          },
          g,
        );
      });
      [1, 3, 7].forEach(function (d) {
        el(
          'text',
          { x: SX + (d / MAXD) * SW, y: SY + 24, class: 'sl-txt', 'text-anchor': 'middle' },
          g,
          d + ' J',
        );
      });
      var dayV = 2;
      var handle = el(
        'circle',
        {
          cx: SX + (dayV / MAXD) * SW,
          cy: SY,
          r: 8,
          class: 'sl-handle',
          tabindex: 0,
          role: 'slider',
          'aria-label': "Ancienneté de l'incident en jours",
          'aria-valuemin': 0,
          'aria-valuemax': MAXD,
          'aria-valuenow': dayV,
        },
        g,
      );
      var hit = el(
        'rect',
        { x: SX - 12, y: SY - 16, width: SW + 24, height: 32, class: 'sl-hit' },
        g,
      );
      function setDay(d, quiet) {
        dayV = Math.max(0, Math.min(MAXD, d));
        handle.setAttribute('cx', SX + (dayV / MAXD) * SW);
        handle.setAttribute('aria-valuenow', dayV.toFixed(1));
        var lvI = levelFor(dayV);
        var shown =
          dayV < 1 ? Math.round(dayV * 24) + ' H' : dayV.toFixed(1).replace('.0', '') + ' J';
        val.textContent = 'DEPUIS ' + shown + '  ›  ' + up(LEVELS[lvI].name);
        val.setAttribute('fill', LEVELS[lvI].sw === '#5b6a95' ? '#fff' : LEVELS[lvI].sw);
        if (!quiet) select(LEVELS[lvI].id);
      }
      function svgX(ev) {
        var pt = svg.createSVGPoint();
        pt.x = ev.clientX;
        pt.y = ev.clientY;
        var m = svg.getScreenCTM();
        if (!m) return 0;
        return pt.matrixTransform(m.inverse()).x;
      }
      var drag = false;
      function move(ev) {
        setDay(((svgX(ev) - SX) / SW) * MAXD);
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
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') {
          ev.preventDefault();
          setDay(Math.round((dayV + 0.5) * 2) / 2);
        }
        if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') {
          ev.preventDefault();
          setDay(Math.round((dayV - 0.5) * 2) / 2);
        }
      });
      setDay(dayV, true);
      note(g, SX, 384, 'démo', 'ageAttentionLevel · paliers 1 · 3 · 7 j');
    },
  });

  /* ---------- 07 · LIVRAISON ---------- */
  SCENES.push({
    q: 'Comment une modification arrive-t-elle en production ?',
    tab: 'Livraison',
    label: 'Chaîne de livraison : de la pull request au déploiement par digest',
    signal: ['Garde-fou', '6 checks requis avant fusion'],
    def: 'ci',
    tour: [
      'pr',
      'ci',
      'merge',
      'release',
      'backup',
      'pull',
      'preflight',
      'deploy',
      'health',
      'rollback',
    ],
    build: function (g) {
      decor(g, 700, 292);
      var TY = 170,
        BY = 356;
      var X = [212, 420, 628, 836, 1044];
      var XB = [1044, 836, 628, 420];

      function ln(d, lx, ly, txt, anchor, cls) {
        var e = el('g', { class: 'edge' }, g);
        el('path', { d: d, class: 'edge-line' + (cls ? ' ' + cls : '') }, e);
        if (txt)
          el(
            'text',
            { x: lx, y: ly, class: 't-edge', 'text-anchor': anchor || 'middle' },
            e,
            up(txt),
          );
      }
      ln('M240 ' + TY + ' L370 ' + TY, 305, TY - 12, '');
      ln('M470 ' + TY + ' L600 ' + TY, 535, TY - 12, '6 verts');
      ln('M656 ' + TY + ' L808 ' + TY, 732, TY - 12, 'workflow_dispatch');
      ln('M864 ' + TY + ' L1016 ' + TY, 940, TY - 12, 'digests · notes');
      ln('M1044 ' + (TY + 30) + ' L1044 ' + (BY - 30), 1056, 268, 'runbook · vps', 'start');
      ln('M1016 ' + BY + ' L864 ' + BY, 940, BY - 12, '@sha256');
      ln('M808 ' + BY + ' L656 ' + BY, 732, BY - 12, '');
      ln('M600 ' + BY + ' L448 ' + BY, 524, BY - 12, 'up --no-build');

      node(g, 'pr', X[0], TY, 22, 'Pull request', 'main protégée', {
        kicker: 'Étape 01 · GitHub',
        title: 'Pull request',
        body: 'Un ruleset actif protège main, sans acteur de bypass : pull request obligatoire, conversations résolues, branche à jour, force-push et suppression bloqués. Un commit porte une intention cohérente.',
        tags: [{ t: 'Ruleset' }, { t: 'Sans bypass' }],
      });

      /* CI : six satellites */
      var ci = node(
        g,
        'ci',
        X[1],
        TY,
        20,
        null,
        null,
        {
          kicker: 'Étape 02 · GitHub Actions',
          title: 'Six contrats CI indépendants',
          body: "Tous requis avant fusion — c'est la vraie barrière, pas une signature : le dépôt est mono-mainteneur, donc les approbations humaines sont volontairement fixées à 0. Survole chaque satellite pour voir ce qu'il contrôle.",
          tags: [{ t: 'Timeouts' }, { t: 'contents: read' }],
        },
        { tone: 'lime' },
      );
      el('text', { x: 0, y: 84, class: 't-name' }, ci, '6 CHECKS');
      el('text', { x: 0, y: 97, class: 't-sub' }, ci, 'REQUIS');
      var checks = [
        [
          'c1',
          'Backend / Quality',
          'Format, lint, scripts TypeScript, build, couverture (seuils 80 / 75 / 70 / 85 %), fiabilité transverse et audit npm.',
        ],
        [
          'c2',
          'Frontend / Quality',
          'Format, lint, build, couverture (seuils 85 / 80 / 90 / 90 %) et audit npm.',
        ],
        [
          'c3',
          'Backend / PostgreSQL integration',
          "PostgreSQL 15 réel, migrations complètes, suites d'intégration auth, comptes, lignes et cycle Atelier.",
        ],
        [
          'c4',
          'Browser / Critical journeys',
          "Chromium via Playwright, fixtures dédiées sur une base isolée, parcours mobiles, diagnostics conservés en cas d'échec.",
        ],
        [
          'c5',
          'Containers / Production contract',
          'Validation du Compose, construction des images, utilisateurs non-root, Nginx, Caddy et ShellCheck.',
        ],
        [
          'c6',
          'Ops / Backup and restore drill',
          'Exercice de sauvegarde puis restauration, isolé, contre un PostgreSQL réel.',
        ],
      ];
      checks.forEach(function (c, i) {
        var a = rad(30 + i * 60);
        var sx = X[1] + 48 * Math.cos(a),
          sy = TY + 48 * Math.sin(a);
        var so = orb(g, sx, sy, 6, 'lime');
        so.querySelector('.orb-halo').setAttribute('r', 9);
        so.querySelector('.orb-ring').setAttribute('r', 7.5);
        reg(
          c[0],
          {
            kicker: 'Check requis · ' + (i + 1) + ' / 6',
            title: c[1],
            body: c[2],
            tags: [{ t: 'Requis', k: 'ok' }],
          },
          [so],
        );
      });

      node(g, 'merge', X[2], TY, 22, 'Merge commit', 'main', {
        kicker: 'Étape 03 · fusion',
        title: 'Fusion par merge commit',
        body: "Branche à jour exigée, conversations résolues, six checks verts. Fusion par merge commit uniquement : l'historique linéaire est désactivé volontairement, Sentinel publie après une vraie fusion, pas après un squash ou un rebase.",
        tags: [{ t: 'Merge commit' }],
      });
      node(g, 'release', X[3], TY, 22, 'Release', 'tag immuable', {
        kicker: 'Étape 04 · publication',
        title: 'Release immuable',
        body: 'Le tag v* est immuable et la publication ne se déclenche jamais sur un push de tag : uniquement par workflow_dispatch depuis main, le commit du tag, le checkout et origin/main devant être identiques. Actions tierces épinglées par SHA, images publiées avec leurs digests.',
        tags: [{ t: 'Attestations' }, { t: 'Digests' }],
      });
      node(g, 'backup', X[4], TY, 22, 'Sauvegarde', 'backup.sh', {
        kicker: 'Étape 05 · exploitation',
        title: 'Sauvegarde avant tout',
        body: "Dump gzip atomique avec checksum et rétention, verrou partagé avec la restauration. La restauration valide le dump dans une base temporaire — tables, ledger de migrations comparé aux fichiers du checkout — avant d'échanger les noms de base.",
        tags: [{ t: 'Atomique' }, { t: 'SHA-256' }],
      });
      node(g, 'pull', XB[0], BY, 22, 'Pull par digest', 'registry', {
        kicker: 'Étape 06 · déploiement',
        title: 'Images épinglées par digest',
        body: "Le VPS exécute exactement l'image construite et vérifiée en CI : jamais de reconstruction locale. Le pull est non destructif, aucun conteneur en cours n'est remplacé.",
        tags: [{ t: 'Registry' }, { t: 'Sans build' }],
      });
      node(g, 'preflight', XB[1], BY, 22, 'Préflight', 'avant bascule', {
        kicker: 'Étape 07 · déploiement',
        title: 'Préflight',
        body: "Lit le .env du déploiement sans remplacer aucun service. Côté backend, le démarrage lui-même refuse un secret faible, une origine non canonique, un hash Board invalide ou un BUILD_SHA qui n'est pas un SHA complet.",
        tags: [{ t: 'Fail-closed', k: 'ok' }],
      });
      node(g, 'deploy', XB[2], BY, 22, 'Déploiement', 'sans rebuild', {
        kicker: 'Étape 08 · déploiement',
        title: 'Mise à jour sans arrêt gratuit',
        body: "docker compose up -d --no-build : seuls les conteneurs dont l'image ou la config change sont recréés — jamais de down pour une mise à jour normale. Les migrations s'appliquent sous verrou avant que le backend n'écoute.",
        tags: [{ t: 'Non-root' }, { t: 'Read-only' }],
      });
      node(
        g,
        'health',
        XB[3],
        BY,
        24,
        'Health = SHA',
        '/api/health',
        {
          kicker: 'Étape 09 · preuve',
          title: 'La version égale le commit du tag',
          body: "/api/health interroge réellement PostgreSQL et publie le SHA Git complet embarqué dans l'image. La version doit égaler le commit du tag déployé, et le digest de l'image backend celui de la release : l'alignement du VPS se vérifie en une requête.",
          tags: [{ t: 'Vérifiable', k: 'ok' }],
        },
        { tone: 'lime' },
      );

      /* rollback */
      var rbD =
        'M420 ' + (BY + 74) + ' L420 ' + (BY + 88) + ' L1044 ' + (BY + 88) + ' L1044 ' + (BY + 76);
      edge(
        g,
        'rollback',
        rbD,
        732,
        BY + 78,
        'rollback · digests de la release précédente',
        'middle',
        {
          kicker: 'Procédure · production.md §12',
          title: 'Retour arrière par digest',
          body: "Le rollback ne reconstruit rien : on remet dans le .env le BUILD_SHA et les digests de la release précédente, puis pull, préflight, up, health. Si le schéma n'est pas rétrocompatible, on restaure la sauvegarde prise juste avant le déploiement.",
          tags: [{ t: 'Sans rebuild' }, { t: 'Forward-only' }],
        },
        'soft',
      );
    },
  });

  /* =================================================================
     MISE EN PAGE COMPACTE (mobile / tablette) — mêmes contenus, autre géométrie
     ================================================================= */
  function noteC(g, x, y, key, text) {
    el('text', { x: x, y: y, class: 'note note-k' }, g, up(key));
    return wrap(g, up(text), x, y + 11, 336, 11, 'note');
  }
  function chipAuto(g, id, x, y, text, pad) {
    var w = Math.ceil(measure(up(text), 'chip-txt')) + (pad || 18);
    chip(g, id, x, y, w, text, null);
    return w;
  }

  /* ---------- 01 · ORBITE ---------- */
  SCENES[0].cbuild = function (g) {
    var cx = 180,
      cy = 416;
    decor(g, cx, cy);
    var orbits = [
      { rx: 148, ry: 92, rot: -14, nodes: [['atelier', 2.97]] },
      {
        rx: 150,
        ry: 78,
        rot: 64,
        nodes: [
          ['board', 6.2],
          ['pilotage', 3.32],
        ],
      },
      {
        rx: 118,
        ry: 72,
        rot: -52,
        nodes: [
          ['admin', 1.05],
          ['journal', 4.45],
        ],
      },
      {
        rx: 100,
        ry: 82,
        rot: 100,
        nodes: [
          ['connaissance', 3.75],
          ['outbox', 0.87],
        ],
      },
      { rx: 70, ry: 50, rot: 12, nodes: [], faint: true },
      { rx: 160, ry: 56, rot: 26, nodes: [], faint: true },
    ];
    var names = {
      atelier: 'Atelier',
      board: 'Board',
      admin: 'Administration',
      pilotage: 'Pilotage',
      journal: 'Journal',
      connaissance: 'Connaissance',
      outbox: 'Outbox',
    };
    var lineEls = [];
    orbits.forEach(function (o) {
      lineEls.push(
        el(
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
        ),
      );
    });
    var core = el('g', { class: 'core', transform: 'translate(' + cx + ' ' + cy + ')' }, g);
    el('circle', { r: 62, class: 'core-halo' }, core);
    el('circle', { r: 42, class: 'core-mid' }, core);
    el('circle', { r: 35, class: 'core-disc' }, core);
    el('text', { x: 0, y: 3.5, class: 'core-txt' }, core, 'SENTINEL');
    el('circle', { r: 46, fill: 'transparent', style: 'cursor:pointer' }, core);
    reg('sentinel', null, [core]);
    movers = [];
    var mk = 0;
    orbits.forEach(function (o, oi) {
      o.nodes.forEach(function (n) {
        var og = orb(g, 0, 0, 10, null);
        nodeLabels(og, 10, names[n[0]], null, 'bottom');
        reg(n[0], null, [og]);
        movers.push({
          g: og,
          o: o,
          t0: n[1],
          t: n[1],
          time: mk * 3.1,
          amp: 0.09 + 0.018 * mk,
          w: 0.26 + 0.03 * mk,
          ph: mk * 1.7,
          cx: cx,
          cy: cy,
          orbitEl: lineEls[oi],
        });
        mk++;
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
    function corner(id, x, y, num, text, anchor) {
      var c = el('g', { class: 'corner' }, g);
      var w = 124,
        rx = anchor === 'end' ? x - w : x;
      el('rect', { x: rx, y: y - 16, width: w, height: 26, class: 'c-hit' }, c);
      var t = el('text', { x: x, y: y, 'text-anchor': anchor }, c);
      if (anchor === 'end') {
        el('tspan', { class: 't-corner' }, t, up(text) + '  ');
        el('tspan', { class: 't-num' }, t, num);
      } else {
        el('tspan', { class: 't-num' }, t, num + '  ');
        el('tspan', { class: 't-corner' }, t, up(text));
      }
      reg(id, null, [c]);
    }
    corner('c_sig', 12, 222, '01', 'Signaler', 'start');
    corner('c_res', 348, 222, '02', 'Résoudre', 'end');
    corner('c_doc', 348, 610, '03', 'Documenter', 'end');
    corner('c_app', 12, 610, '04', 'Apprendre', 'start');
  };

  /* ---------- 02 · CYCLE ---------- */
  SCENES[1].cbuild = function (g) {
    decor(g, 180, 400);
    var xL = 84,
      xR = 276,
      y1 = 254,
      y2 = 364,
      y3 = 474,
      r = 20;
    el('circle', { cx: 22, cy: y2, r: 5, fill: '#c8ff2e' }, g);
    el('text', { x: 12, y: y2 + 22, class: 't-sub', 'text-anchor': 'start' }, g, 'CRÉATION');
    edge(g, 'e_create', 'M30 ' + y2 + ' L57 ' + y2, 24, y2 - 12, 'create', 'middle', null);
    edge(g, 'e_take', 'M112 ' + y2 + ' L248 ' + y2, 180, y2 - 12, 'take', 'middle', null);
    edge(
      g,
      'e_pend',
      'M266 ' + (y2 - 28) + ' L266 ' + (y1 + 30),
      258,
      (y1 + y2) / 2 + 3,
      'set_pending',
      'end',
      null,
    );
    edge(
      g,
      'e_resume',
      'M286 ' + (y1 + 30) + ' L286 ' + (y2 - 28),
      294,
      (y1 + y2) / 2 + 3,
      'resume',
      'start',
      null,
    );
    edge(
      g,
      'e_close',
      'M276 ' + (y2 + 28) + ' L276 ' + (y3 - 28),
      268,
      (y2 + y3) / 2 + 3,
      "close + note d'intervention",
      'end',
      null,
    );
    edge(
      g,
      'e_inval',
      'M248 ' + y3 + ' L112 ' + y3,
      180,
      y3 - 12,
      'invalidate + motif',
      'middle',
      null,
    );
    edge(
      g,
      'e_cancel',
      'M84 ' + (y2 - 28) + ' L84 ' + (y1 + 30),
      92,
      (y1 + y2) / 2 + 3,
      'cancel',
      'start',
      null,
    );
    edge(
      g,
      'e_cancel2',
      'M248 ' + y1 + ' L112 ' + y1,
      180,
      y1 - 12,
      'cancel · responsable',
      'middle',
      null,
      'soft',
    );
    node(g, 'n_open', xL, y2, r, 'Non pris', 'OPEN', null, { side: 'bottom' });
    node(g, 'n_taken', xR, y2, r, 'Pris', 'OPEN', null, { side: 'right' });
    node(g, 'n_pending', xR, y1, r, 'En attente', 'PENDING', null, { tone: 'amber', side: 'top' });
    node(g, 'n_closed', xR, y3, r, 'Clôturé', 'CLOSED', null, { tone: 'lime', side: 'bottom' });
    node(g, 'n_canceled', xL, y1, r, 'Annulé', 'CANCELED', null, { tone: 'grey', side: 'top' });
    node(g, 'n_invalid', xL, y3, r, 'Invalidé', 'INVALIDATED', null, {
      tone: 'grey',
      side: 'bottom',
    });
    var n1 = noteC(
      g,
      12,
      560,
      'Arbitrage',
      'une demande ouverte bloque les mutations concurrentes',
    );
    noteC(
      g,
      12,
      560 + 11 + n1.lines * 11 + 8,
      'Autorité',
      "la policy backend décide — le frontend n'en est que le miroir",
    );
  };

  /* ---------- 03 · RÔLES ---------- */
  SCENES[2].cbuild = function (g) {
    decor(g, 180, 400);
    var cols = [
      { id: 'role_op', x: 248, name: 'Opér.', full: 'Opérateur' },
      { id: 'role_mnt', x: 292, name: 'Maint.', full: 'Maintenance' },
      { id: 'role_resp', x: 334, name: 'Resp.', full: 'Responsable' },
    ];
    var rows = [
      ['r_create', 'Déclarer un incident', [1, 1, 1]],
      ['r_req_edit', 'Demander / retirer une correction', [1, 0, 0]],
      ['r_req_cancel', 'Demander / retirer une annulation', [1, 0, 0]],
      ['r_edit_free', 'Modifier un incident actif non pris', [0, 1, 1]],
      ['r_edit_taken', 'Modifier un incident actif pris', [0, 2, 1]],
      ['r_take', 'Prendre / transférer un incident', [0, 1, 0]],
      ['r_treat', 'Mettre en attente / reprendre / clôturer', [0, 1, 0]],
      ['r_cancel', 'Annuler un incident non pris', [0, 1, 1]],
      ['r_cancel_pend', 'Annuler un incident en attente', [0, 0, 1]],
      ['r_arb', 'Arbitrer correction / annulation', [0, 0, 1]],
      ['r_prio', 'Définir priorité / consigne', [0, 0, 1]],
      ['r_inval', 'Invalider une clôture', [0, 0, 1]],
      ['r_follow', 'Suivre / ne plus suivre', [0, 0, 1]],
    ];
    var Y0 = 278,
      RH = 26;
    var colBg = el(
      'rect',
      {
        class: 'm-col-bg',
        rx: 8,
        y: 194,
        height: Y0 + (rows.length - 1) * RH + 14 - 194,
        width: 42,
      },
      g,
    );
    function showCol(i) {
      if (i == null) {
        colBg.classList.remove('on');
        return;
      }
      colBg.setAttribute('x', cols[i].x - 21);
      colBg.classList.add('on');
    }
    cols.forEach(function (c, i) {
      var o = orb(g, c.x, 216, 11, null);
      o.classList.add('role');
      el('text', { x: 0, y: 34, class: 't-name' }, o, up(c.name));
      reg(c.id, null, [o]);
      o.addEventListener('pointerenter', function () {
        showCol(i);
      });
      o.addEventListener('pointerleave', function () {
        showCol(null);
      });
      o.addEventListener('focus', function () {
        showCol(i);
      });
      o.addEventListener('blur', function () {
        showCol(null);
      });
    });
    rows.forEach(function (r, ri) {
      var y = Y0 + ri * RH;
      var rg = el('g', { class: 'm-row' }, g);
      el('rect', { x: 8, y: y - 15, width: 344, height: RH, rx: 4, class: 'm-row-bg' }, rg);
      var tx = wrap(rg, r[1], 16, y - 4, 228, 10.5, 'm-txt');
      if (tx.lines === 1) tx.node.setAttribute('y', y + 1);
      r[2].forEach(function (v, ci) {
        var cx = cols[ci].x,
          cy = y - 2;
        if (v === 1) el('circle', { cx: cx, cy: cy, r: 5.5, class: 'm-yes' }, rg);
        else if (v === 2) {
          el('circle', { cx: cx, cy: cy, r: 6, class: 'm-cond-ring' }, rg);
          el('circle', { cx: cx, cy: cy, r: 2.3, class: 'm-cond-dot' }, rg);
        } else el('circle', { cx: cx, cy: cy, r: 2, class: 'm-no' }, rg);
      });
      reg(r[0], null, [rg]);
      rg.addEventListener('pointerenter', function () {
        showCol(null);
      });
    });
    var ly = Y0 + (rows.length - 1) * RH + 30;
    el('circle', { cx: 18, cy: ly, r: 4.5, class: 'm-yes-l' }, g);
    el('text', { x: 28, y: ly + 3, class: 'm-legend' }, g, 'AUTORISÉ');
    el('circle', { cx: 116, cy: ly, r: 5, class: 'm-cond-ring' }, g);
    el('circle', { cx: 116, cy: ly, r: 2, class: 'm-cond-dot' }, g);
    el('text', { x: 126, y: ly + 3, class: 'm-legend' }, g, 'SI AFFECTÉ');
    el('circle', { cx: 224, cy: ly, r: 2, class: 'm-no' }, g);
    el('text', { x: 234, y: ly + 3, class: 'm-legend' }, g, 'REFUSÉ');
  };

  /* ---------- 04 · ARCHITECTURE ---------- */
  SCENES[3].cbuild = function (g) {
    decor(g, 180, 400);
    function ln(d, lx, ly, txt, anchor, cls) {
      var e = el('g', { class: 'edge' }, g);
      el('path', { d: d, class: 'edge-line' + (cls ? ' ' + cls : '') }, e);
      if (txt)
        el(
          'text',
          { x: lx, y: ly, class: 't-edge', 'text-anchor': anchor || 'middle' },
          e,
          up(txt),
        );
    }
    ln('M75 254 L157 254', 116, 243, 'https');
    ln('M203 254 L285 254', 244, 243, 'autres chemins');
    ln('M180 277 L180 325', 188, 305, '/api/*', 'start');
    ln('M203 352 L284 352', 244, 341, 'sql paramétré');
    ln('M157 352 L78 352', 0, 0, '');
    ln('M52 374 L52 412', 0, 0, '');
    var t1 = el(
      'text',
      { x: 60, y: 388, class: 't-edge', 'text-anchor': 'start' },
      g,
      'CLÉ JAMAIS EXPOSÉE',
    );
    el('text', { x: 60, y: 399, class: 't-edge', 'text-anchor': 'start' }, g, 'AU NAVIGATEUR');
    ln('M198 371 C 236 397, 262 425, 288 436', 0, 0, '');
    ln('M308 458 L308 486', 0, 0, '');
    el('text', { x: 300, y: 470, class: 't-edge', 'text-anchor': 'end' }, g, 'SMTP · RETRIES');
    el('text', { x: 300, y: 481, class: 't-edge', 'text-anchor': 'end' }, g, '· BACKOFF');
    node(g, 'nav', 52, 254, 17, 'Navigateur', null, null, { side: 'top' });
    node(g, 'proxy', 180, 254, 17, 'Proxy', null, null, { side: 'top' });
    node(g, 'front', 308, 254, 17, 'Frontend', null, null, { side: 'top' });
    node(g, 'sup', 52, 352, 15, 'Support IA', null, null, { side: 'top' });
    node(g, 'back', 180, 352, 22, 'Backend', null, null, { tone: 'lime', side: 'bottom' });
    node(g, 'db', 308, 352, 20, 'PostgreSQL', null, null, { side: 'top' });
    node(g, 'ia', 52, 436, 15, 'DeepSeek', null, null, { tone: 'dim', side: 'bottom' });
    node(g, 'outbox', 308, 436, 15, 'Outbox', null, null, { side: 'top' });
    node(g, 'smtp', 308, 510, 15, 'SMTP', null, null, { tone: 'dim', side: 'bottom' });
    /* groupes de tables */
    el('text', { x: 92, y: 478, class: 't-sub', 'text-anchor': 'start' }, g, 'TABLES · 6 GROUPES');
    [
      ['t_id', 'Identités'],
      ['t_ref', 'Référentiel'],
      ['t_inc', 'Incidents'],
      ['t_arb', 'Arbitrage'],
      ['t_aud', 'Audit'],
      ['t_out', 'Outbox'],
    ].forEach(function (t, i) {
      chip(g, t[0], 92 + (i % 2) * 68, 486 + Math.floor(i / 2) * 28, 64, t[1], null);
    });
    /* couches d'un module */
    el(
      'text',
      { x: 12, y: 582, class: 't-sub', 'text-anchor': 'start' },
      g,
      "COUCHES D'UN MODULE BACKEND",
    );
    var L = [
      ['l_route', 'Route'],
      ['l_ctrl', 'Controller'],
      ['l_serv', 'Service · policy'],
      ['l_repo', 'Repository'],
    ];
    var ws = L.map(function (l) {
      return Math.ceil(measure(up(l[1]), 'chip-txt')) + 14;
    });
    var tot = ws.reduce(function (a, b) {
        return a + b;
      }, 0),
      gap = Math.min(12, (336 - tot) / 3),
      lx = 12;
    L.forEach(function (l, i) {
      chip(g, l[0], lx, 590, ws[i], l[1], null);
      if (i < 3 && gap >= 8)
        el(
          'path',
          {
            d: 'M' + (lx + ws[i] + 2) + ' 602 L' + (lx + ws[i] + gap - 2) + ' 602',
            class: 'edge-line',
          },
          g,
        );
      lx += ws[i] + gap;
    });
  };

  /* ---------- 05 · SÉCURITÉ ---------- */
  SCENES[4].cbuild = function (g) {
    decor(g, 180, 380);
    var TX = 62,
      RX = 298,
      YS = [262, 372, 482];
    var allow = {
      tk_admin: ['r_admin'],
      tk_workshop: ['r_workshop', 'r_board'],
      tk_board: ['r_board'],
    };
    var tokIds = ['tk_admin', 'tk_workshop', 'tk_board'],
      routeIds = ['r_admin', 'r_workshop', 'r_board'];
    var routeNames = {
      r_admin: '/api/admin/*',
      r_workshop: '/api/workshop/*',
      r_board: '/api/board/data',
    };
    var tokNames = { tk_admin: 'JWT admin', tk_workshop: 'JWT atelier', tk_board: 'JWT board' };
    var links = {};
    tokIds.forEach(function (t, ti) {
      links[t] = {};
      routeIds.forEach(function (r, ri) {
        var d =
          'M' +
          (TX + 26) +
          ' ' +
          YS[ti] +
          ' C 150 ' +
          YS[ti] +
          ', 210 ' +
          YS[ri] +
          ', ' +
          (RX - 26) +
          ' ' +
          YS[ri];
        var p = el('path', { d: d, class: 'lnk' }, g);
        links[t][r] = { p: p, x: el('g', { class: 'xmark' }, g) };
      });
    });
    tokIds.forEach(function (t) {
      routeIds.forEach(function (r) {
        var L = links[t][r],
          pt = { x: 180, y: 372 };
        try {
          pt = L.p.getPointAtLength(L.p.getTotalLength() * 0.66);
        } catch (e) {}
        el('line', { x1: pt.x - 4.5, y1: pt.y - 4.5, x2: pt.x + 4.5, y2: pt.y + 4.5 }, L.x);
        el('line', { x1: pt.x - 4.5, y1: pt.y + 4.5, x2: pt.x + 4.5, y2: pt.y - 4.5 }, L.x);
      });
    });
    var gate = el('g', { class: 'gate', transform: 'translate(180 372)' }, g);
    el('circle', { r: 46, fill: 'url(#sn-glow-core)' }, gate);
    el('circle', { r: 31, class: 'gate-disc' }, gate);
    el('text', { x: 0, y: -1, class: 'gate-txt' }, gate, 'GARDES');
    el('text', { x: 0, y: 10, class: 't-sub' }, gate, 'SERVEUR');
    el('circle', { r: 38, fill: 'transparent', style: 'cursor:pointer' }, gate);
    reg('gate', null, [gate]);
    var tokOrbs = {},
      routeOrbs = {};
    tokIds.forEach(function (t, i) {
      var o = orb(g, TX, YS[i], 20, null);
      o.querySelector('.orb-dot').setAttribute('r', 3.5);
      el('text', { x: 0, y: -37, class: 't-name' }, o, up(tokNames[t]));
      reg(t, null, [o]);
      tokOrbs[t] = o;
    });
    routeIds.forEach(function (r, i) {
      var o = orb(g, RX, YS[i], 20, null);
      o.querySelector('.orb-dot').setAttribute('r', 3.5);
      el('text', { x: 0, y: -37, class: 't-name' }, o, up(routeNames[r]));
      reg(r, null, [o]);
      routeOrbs[r] = o;
    });
    el('text', { x: 12, y: 548, class: 't-sub', 'text-anchor': 'start' }, g, 'DÉFENSES');
    var rowsD = [
      [
        ['c_jwt', 'JWT cloisonnés'],
        ['c_cookie', 'Cookies'],
        ['c_csrf', 'Anti-CSRF'],
      ],
      [
        ['c_reval', 'Revalidation'],
        ['c_rate', 'Rate limits'],
      ],
    ];
    rowsD.forEach(function (row, ri) {
      var dx = 12;
      row.forEach(function (d) {
        dx += chipAuto(g, d[0], dx, 556 + ri * 30, d[1]) + 8;
      });
    });
    function paintToken(t) {
      routeIds.forEach(function (r) {
        routeOrbs[r].classList.remove('ok', 'no');
      });
      tokIds.forEach(function (tk) {
        routeIds.forEach(function (r) {
          links[tk][r].p.setAttribute('class', 'lnk');
          links[tk][r].x.setAttribute('class', 'xmark');
        });
      });
      routeIds.forEach(function (r) {
        var ok = allow[t].indexOf(r) >= 0,
          L = links[t][r];
        L.p.setAttribute('class', 'lnk ' + (ok ? 'ok' : 'no'));
        if (!ok) L.x.setAttribute('class', 'xmark on');
        routeOrbs[r].classList.add(ok ? 'ok' : 'no');
      });
    }
    sceneState.onSelect = function (id) {
      if (allow[id]) paintToken(id);
    };
    paintToken('tk_workshop');
  };

  /* ---------- 06 · DESIGN ---------- */
  SCENES[5].cbuild = function (g) {
    var cx = 180,
      cy = 328,
      RX = 116,
      RY = 86;
    decor(g, cx, cy);
    el('ellipse', { cx: cx, cy: cy, rx: RX, ry: RY, class: 'orbit-line' }, g);
    el('ellipse', { cx: cx, cy: cy, rx: RX * 0.62, ry: RY * 0.62, class: 'orbit-line faint' }, g);
    var core = el('g', { class: 'core', transform: 'translate(' + cx + ' ' + cy + ')' }, g);
    el('circle', { r: 58, class: 'core-halo' }, core);
    el('circle', { r: 40, class: 'core-mid' }, core);
    el('circle', { r: 33, class: 'core-disc' }, core);
    el('text', { x: 0, y: 3.5, class: 'core-txt' }, core, 'MAÎTRISE');
    el('circle', { r: 44, fill: 'transparent', style: 'cursor:pointer' }, core);
    reg('d_core', null, [core]);
    var P = [
      ['p1', 'P1', 'Hiérarchie'],
      ['p2', 'P2', 'Silence'],
      ['p3', 'P3', 'Une question'],
      ['p4', 'P4', 'Couleur'],
      ['p5', 'P5', 'Apprentissage'],
      ['p6', 'P6', 'Sans punir'],
      ['p7', 'P7', 'Temps'],
    ];
    P.forEach(function (p, i) {
      var a = rad(-90 + i * (360 / 7)),
        x = cx + RX * Math.cos(a),
        y = cy + RY * Math.sin(a);
      node(g, p[0], x, y, 11, p[1] + ' · ' + p[2], null, null, {
        side: Math.sin(a) < -0.5 ? 'top' : 'bottom',
      });
    });
    el('text', { x: 12, y: 470, class: 'sl-ttl' }, g, "NIVEAUX D'ATTENTION");
    LEVELS.forEach(function (lv, i) {
      var lx = 12 + (i % 2) * 172,
        y = 478 + Math.floor(i / 2) * 30;
      var lg = el('g', { class: 'lv' }, g);
      el('rect', { x: lx, y: y, width: 164, height: 24, rx: 5, class: 'lv-box' }, lg);
      el(
        'rect',
        { x: lx + 10, y: y + 7, width: 10, height: 10, rx: 2.5, fill: lv.sw, class: 'lv-sw' },
        lg,
      );
      el('text', { x: lx + 28, y: y + 16, class: 'lv-txt' }, lg, up(lv.name));
      reg(lv.id, null, [lg]);
    });
    var SX = 24,
      SW = 312,
      SY = 594,
      MAXD = 9;
    function levelFor(d) {
      return d >= 7 ? 3 : d >= 3 ? 2 : d >= 1 ? 1 : 0;
    }
    el('text', { x: 12, y: 552, class: 'sl-ttl' }, g, "P7 · ÂGE D'UN INCIDENT");
    var val = el('text', { x: 12, y: 570, class: 'sl-val' }, g, '');
    [
      [0, 1],
      [1, 3],
      [3, 7],
      [7, MAXD],
    ].forEach(function (s, i) {
      el(
        'rect',
        {
          x: SX + (s[0] / MAXD) * SW,
          y: SY - 2,
          width: ((s[1] - s[0]) / MAXD) * SW - 1,
          height: 4,
          rx: 2,
          fill: LEVELS[i].sw,
          opacity: 0.85,
        },
        g,
      );
    });
    [1, 3, 7].forEach(function (d) {
      el(
        'text',
        { x: SX + (d / MAXD) * SW, y: SY + 22, class: 'sl-txt', 'text-anchor': 'middle' },
        g,
        d + ' J',
      );
    });
    var dayV = 2;
    var handle = el(
      'circle',
      {
        cx: SX + (dayV / MAXD) * SW,
        cy: SY,
        r: 9,
        class: 'sl-handle',
        tabindex: 0,
        role: 'slider',
        'aria-label': "Ancienneté de l'incident en jours",
        'aria-valuemin': 0,
        'aria-valuemax': MAXD,
        'aria-valuenow': dayV,
      },
      g,
    );
    var hit = el(
      'rect',
      { x: SX - 14, y: SY - 20, width: SW + 28, height: 40, class: 'sl-hit' },
      g,
    );
    function setDay(d, quiet) {
      dayV = Math.max(0, Math.min(MAXD, d));
      handle.setAttribute('cx', SX + (dayV / MAXD) * SW);
      handle.setAttribute('aria-valuenow', dayV.toFixed(1));
      var lvI = levelFor(dayV);
      var shown =
        dayV < 1 ? Math.round(dayV * 24) + ' H' : dayV.toFixed(1).replace('.0', '') + ' J';
      val.textContent = 'DEPUIS ' + shown + '  ›  ' + up(LEVELS[lvI].name);
      val.setAttribute('fill', LEVELS[lvI].sw === '#5b6a95' ? '#fff' : LEVELS[lvI].sw);
      if (!quiet) select(LEVELS[lvI].id);
    }
    function svgX(ev) {
      var pt = svg.createSVGPoint();
      pt.x = ev.clientX;
      pt.y = ev.clientY;
      var m = svg.getScreenCTM();
      if (!m) return 0;
      return pt.matrixTransform(m.inverse()).x;
    }
    var drag = false;
    function move(ev) {
      setDay(((svgX(ev) - SX) / SW) * MAXD);
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
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        setDay(Math.round((dayV + 0.5) * 2) / 2);
      }
      if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') {
        ev.preventDefault();
        setDay(Math.round((dayV - 0.5) * 2) / 2);
      }
      if (ev.key === 'Home') {
        ev.preventDefault();
        setDay(0);
      }
      if (ev.key === 'End') {
        ev.preventDefault();
        setDay(MAXD);
      }
    });
    setDay(dayV, true);
  };

  /* ---------- 07 · LIVRAISON ---------- */
  SCENES[6].cbuild = function (g) {
    decor(g, 180, 400);
    var y1 = 258,
      y2 = 378,
      y3 = 478;
    function ln(d, lx, ly, txt, anchor, cls) {
      var e = el('g', { class: 'edge' }, g);
      el('path', { d: d, class: 'edge-line' + (cls ? ' ' + cls : '') }, e);
      if (txt)
        el(
          'text',
          { x: lx, y: ly, class: 't-edge', 'text-anchor': anchor || 'middle' },
          e,
          up(txt),
        );
    }
    ln('M74 ' + y1 + ' L154 ' + y1, 0, 0, '');
    ln('M206 ' + y1 + ' L285 ' + y1, 250, y1 - 10, '6 verts');
    ln('M308 ' + (y1 + 26) + ' L308 ' + (y2 - 27), 300, 340, 'workflow_dispatch', 'end');
    ln('M286 ' + y2 + ' L206 ' + y2, 246, y2 - 11, 'digests · notes');
    ln('M158 ' + y2 + ' L78 ' + y2, 118, y2 - 11, 'runbook · vps');
    ln('M52 ' + (y2 + 25) + ' L52 ' + (y3 - 25), 60, (y2 + y3) / 2 + 3, '@sha256', 'start');
    ln('M78 ' + y3 + ' L156 ' + y3, 0, 0, '');
    ln('M204 ' + y3 + ' L282 ' + y3, 243, y3 - 11, 'up --no-build');
    node(g, 'pr', 52, y1, 19, 'Pull request', 'main protégée', null, { side: 'bottom' });
    var ci = node(g, 'ci', 180, y1, 16, null, null, null, { tone: 'lime' });
    el('text', { x: 0, y: 58, class: 't-name' }, ci, '6 CHECKS');
    el('text', { x: 0, y: 70, class: 't-sub' }, ci, 'REQUIS');
    for (var i = 0; i < 6; i++) {
      var a = rad(30 + i * 60),
        so = orb(g, 180 + 40 * Math.cos(a), y1 + 40 * Math.sin(a), 5.5, 'lime');
      so.querySelector('.orb-halo').setAttribute('r', 8);
      so.querySelector('.orb-ring').setAttribute('r', 7);
      reg('c' + (i + 1), null, [so]);
    }
    node(g, 'merge', 308, y1, 19, 'Merge commit', 'main', null, { side: 'top' });
    node(g, 'release', 308, y2, 19, 'Release', 'tag immuable', null, { side: 'bottom' });
    node(g, 'backup', 180, y2, 19, 'Sauvegarde', 'backup.sh', null, { side: 'bottom' });
    node(g, 'pull', 52, y2, 19, 'Pull digest', 'registry', null, { side: 'top' });
    node(g, 'preflight', 52, y3, 19, 'Préflight', 'avant bascule', null, { side: 'bottom' });
    node(g, 'deploy', 180, y3, 19, 'Déploiement', 'sans rebuild', null, { side: 'bottom' });
    node(g, 'health', 308, y3, 21, 'Health = SHA', '/api/health', null, {
      tone: 'lime',
      side: 'bottom',
    });
    edge(
      g,
      'rollback',
      'M334 ' + y3 + ' L346 ' + y3 + ' L346 566 L16 566 L16 ' + y2 + ' L26 ' + y2,
      181,
      556,
      'rollback · digests de la release précédente',
      'middle',
      null,
      'soft',
    );
  };

  /* ---------- moteur de scènes ---------- */
  function go(i, focus) {
    stopTour();
    state.tab = i;
    var sc = SCENES[i];
    curScene = sc;
    sceneState = {};
    canvas.classList.add('is-out');
    clearTimeout(buildT);
    buildT = setTimeout(
      function () {
        clear(canvas);
        items = {};
        movers = [];
        state.sel = null;
        buildScene(sc);
        canvas.classList.remove('is-out');
      },
      state.anim ? 180 : 0,
    );

    tabEls.forEach(function (t, k) {
      t.classList.toggle('is-on', k === i);
      t.setAttribute('aria-selected', k === i ? 'true' : 'false');
      t.setAttribute('tabindex', k === i ? '0' : '-1');
    });
    if (focus) tabEls[i].focus();
    tabNum.textContent = ('0' + (i + 1)).slice(-2);
    if (!compact) crumb.textContent = '/ SENTINEL / CHAÎNE / ' + up(sc.tab);
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
  }
  function buildScene(sc) {
    var g = el('g', null, canvas);
    if (sc.q) {
      if (compact) {
        el('text', { x: 12, y: 174, class: 'q-k' }, g, 'QUESTION');
        wrap(g, sc.q, 12, 194, 336, 19, 'q-t');
      } else {
        el('text', { x: SIDE + 24, y: HEAD + 24, class: 'q-k' }, g, 'QUESTION');
        el('text', { x: SIDE + 24, y: HEAD + 43, class: 'q-t' }, g, sc.q);
      }
    }
    if (compact) {
      if (!sc.data) harvest(sc);
      CUR = sc.data;
      sc.cbuild(g);
    } else sc.build(g);
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
      if (w && w < BP !== compact) mount(root, state.tab);
    });
    ro.observe(root);
  }
  root.__pcClean = function () {
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
export function mountSentinelMap(root) {
  mount(root);
  return function () {
    if (root.__pcClean) root.__pcClean();
    root.__pcClean = undefined;
    clear(root);
    root.classList.remove('sn-map', 'compact', 'no-anim');
  };
}
