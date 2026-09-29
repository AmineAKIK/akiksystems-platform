/*
 * Sentinel — interactive map of the Sentinel system (incident cycle, roles,
 * architecture, security, design doctrine and delivery chain).
 *
 * Imperative SVG scene engine, mounted client-side by <SentinelMap />.
 * The content is sourced from the Sentinel repository documentation.
 * No inline style attributes are emitted: the production CSP forbids them.
 */

const NS = 'http://www.w3.org/2000/svg';
const W = 1312;
const H = 640;
const HEAD = 56;
const SIDE = 128;

type Attrs = Record<string, string | number>;

interface Tag {
  t: string;
  k?: 'ok' | 'no';
}

interface ItemData {
  kicker?: string;
  title: string;
  body: string;
  tags?: Tag[];
  test?: string;
}

interface Item extends ItemData {
  id: string;
  els: SVGElement[];
}

interface Scene {
  q: string;
  tab: string;
  label: string;
  signal: [string, string];
  def: string;
  tour: string[];
  build: (g: SVGGElement) => void;
}

interface Orbit {
  rx: number;
  ry: number;
  rot: number;
  nodes: Array<[string, number]>;
  faint?: boolean;
}

interface Mover {
  g: SVGGElement;
  o: Orbit;
  t0: number;
  t: number;
  time: number;
  amp: number;
  w: number;
  ph: number;
  cx: number;
  cy: number;
}

interface Level {
  id: string;
  name: string;
  sw: string;
  kicker: string;
  body: string;
}

function at<T>(list: readonly T[], index: number): T {
  const value = list[index];
  if (value === undefined) throw new Error(`Sentinel map: missing index ${index}`);
  return value;
}

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs?: Attrs | null,
  parent?: Element | null,
  txt?: string | null,
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  if (attrs) {
    for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v === undefined) continue;
      e.setAttribute(k, String(v));
      if (k === 'text-anchor') e.style.setProperty('text-anchor', String(v));
    }
  }
  if (parent) parent.appendChild(e);
  if (txt != null) e.textContent = txt;
  return e;
}

function clear(n: Element) {
  while (n.firstChild) n.removeChild(n.firstChild);
}

function up(s: string) {
  return s.toUpperCase();
}

function rad(d: number) {
  return (d * Math.PI) / 180;
}

/* ---------------------------------------------------------------
   CONTENU — tout est issu des docs et du code du dépôt Sentinel
   (README, conception, design, technique, collaboration, production).
   --------------------------------------------------------------- */

const LEVELS: Level[] = [
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

/** Mounts the map into `root` and returns a cleanup function. */
export function mountSentinelMap(root: HTMLElement): () => void {
  const reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let destroyed = false;
  root.classList.add('sn-map');
  clear(root);
  const scroll = document.createElement('div');
  scroll.className = 'sn-scroll';
  const live = document.createElement('p');
  live.className = 'sn-sr';
  live.setAttribute('aria-live', 'polite');
  root.append(scroll, live);

  const svg = el(
    'svg',
    {
      viewBox: `0 0 ${W} ${H}`,
      role: 'group',
      'aria-label':
        'Carte interactive de Sentinel : cycle des incidents, rôles, architecture, sécurité, design et livraison',
    },
    scroll,
  );

  const defs = el('defs', null, svg);
  defs.innerHTML =
    `<clipPath id="sn-clip"><rect x="0" y="0" width="${W}" height="${H}" rx="10"/></clipPath>` +
    `<clipPath id="sn-clip-canvas"><rect x="${SIDE}" y="${HEAD}" width="${W - SIDE}" height="${H - HEAD}"/></clipPath>` +
    '<radialGradient id="sn-glow"><stop offset="0" stop-color="#2d55ff" stop-opacity=".16"/><stop offset="1" stop-color="#2d55ff" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="sn-glow-core"><stop offset="0" stop-color="#2d55ff" stop-opacity=".38"/><stop offset="1" stop-color="#2d55ff" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="sn-core" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#4a6dff"/><stop offset="1" stop-color="#1b2fb0"/></radialGradient>' +
    '<marker id="sn-arr" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 1 L9 5 L0 9z" fill="#7f95e0"/></marker>' +
    '<marker id="sn-arr-hot" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 1 L9 5 L0 9z" fill="#c8ff2e"/></marker>';

  const clipG = el('g', { 'clip-path': 'url(#sn-clip)' }, svg);
  el('rect', { x: 0, y: 0, width: W, height: H, class: 'card-bg' }, clipG);

  const canvasClip = el('g', { 'clip-path': 'url(#sn-clip-canvas)' }, clipG);
  const canvas = el('g', { class: 'canvas' }, canvasClip);
  const panelG = el('g', { class: 'panel' }, clipG);
  const chrome = el('g', { class: 'chrome' }, clipG);
  el('rect', { x: 0.5, y: 0.5, width: W - 1, height: H - 1, rx: 10, class: 'card-edge' }, svg);

  /* mesure de texte */
  const meas = el('text', { x: -999, y: -999, class: 'p-body', 'aria-hidden': 'true' }, svg);
  function measure(str: string, cls: string) {
    meas.setAttribute('class', cls);
    meas.textContent = str;
    let w = 0;
    try {
      w = meas.getComputedTextLength();
    } catch {
      w = 0;
    }
    if (!w) w = str.length * 6.2;
    return w;
  }
  function wrap(
    parent: Element,
    str: string,
    x: number,
    y: number,
    maxW: number,
    lh: number,
    cls: string,
  ) {
    const t = el('text', { x, y, class: cls }, parent);
    const words = str.split(' ');
    let line = '';
    let lines = 1;
    let ts = el('tspan', { x, dy: 0 }, t);
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (line && measure(test, cls) > maxW) {
        ts.textContent = line;
        ts = el('tspan', { x, dy: lh }, t);
        line = word;
        lines++;
      } else {
        line = test;
      }
    }
    ts.textContent = line;
    return { node: t, lines };
  }

  /* ---------- état ---------- */
  let items: Record<string, Item> = {};
  const state: {
    tab: number;
    sel: string | null;
    tour: ReturnType<typeof setInterval> | null;
    anim: boolean;
    paused: boolean;
    visible: boolean;
  } = { tab: 0, sel: null, tour: null, anim: !reduceMotion, paused: false, visible: true };
  let movers: Mover[] = [];
  let curScene: Scene | null = null;
  let sceneHooks: { onSelect?: (id: string) => void } = {};
  let buildT: ReturnType<typeof setTimeout> | undefined;
  if (!state.anim) root.classList.add('no-anim');

  /* ---------- enregistrement des éléments interactifs ---------- */
  function reg(id: string, data: ItemData, els: SVGElement[]) {
    const item: Item = { ...data, id, els };
    items[id] = item;
    for (const e of els) {
      e.setAttribute('tabindex', '0');
      e.setAttribute('role', 'button');
      e.setAttribute('aria-label', data.title);
      e.addEventListener('pointerenter', (ev) => {
        if (ev.pointerType === 'mouse') {
          state.paused = true;
          select(id);
        }
      });
      e.addEventListener('pointerleave', (ev) => {
        if (ev.pointerType === 'mouse') state.paused = false;
      });
      e.addEventListener('click', () => select(id));
      e.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          select(id);
        }
      });
    }
  }

  function select(id: string, opt?: { tour?: boolean; force?: boolean }) {
    const it = items[id];
    if (!it) return;
    if (!opt?.tour) stopTour();
    if (state.sel === id && !opt?.force) return;
    const prev = state.sel ? items[state.sel] : undefined;
    if (prev) for (const e of prev.els) e.classList.remove('is-active');
    state.sel = id;
    for (const e of it.els) e.classList.add('is-active');
    renderPanel(it);
    live.textContent = `${it.title}. ${it.body}`;
    sceneHooks.onSelect?.(id);
  }

  /* ---------- panneau de détail + signal ---------- */
  let sigW = 240;
  const sigG = el('g', { class: 'signal' }, panelG);
  const detailG = el('g', { class: 'detail' }, panelG);

  function setSignal(pair: [string, string]) {
    clear(sigG);
    const lab = up(pair[0]);
    const val = up(pair[1]);
    let w = Math.max(measure(lab, 'sig-lab') * 1.25, measure(val, 'sig-val') * 1.18) + 32;
    w = Math.max(190, Math.min(360, w));
    sigW = w;
    const x = W - 24 - w;
    const y = H - 24 - 50;
    el('rect', { x, y, width: w, height: 50, rx: 6, class: 'sig-bg' }, sigG);
    el('text', { x: x + 16, y: y + 21, class: 'sig-lab' }, sigG, lab);
    el('text', { x: x + 16, y: y + 37, class: 'sig-val' }, sigG, val);
  }

  function renderPanel(it: Item) {
    clear(detailG);
    const x = SIDE + 24;
    const w = W - 24 - sigW - 16 - x;
    const h = 126;
    const y = H - 24 - h;
    el('rect', { x, y, width: w, height: h, rx: 6, class: 'panel-bg' }, detailG);
    el('text', { x: x + 20, y: y + 26, class: 'p-kick' }, detailG, up(it.kicker ?? ''));
    el('text', { x: x + 20, y: y + 50, class: 'p-title' }, detailG, it.title);

    /* pastilles à droite */
    if (it.tags && it.tags.length) {
      let tx = x + w - 18;
      for (let i = it.tags.length - 1; i >= 0; i--) {
        const tg = at(it.tags, i);
        const txt = up(tg.t);
        const tw = measure(txt, 'tag-txt') * 1.22 + 20;
        tx -= tw;
        const g = el('g', { class: `tag ${tg.k ?? ''}` }, detailG);
        el('rect', { x: tx, y: y + 14, width: tw, height: 18, rx: 9, class: 'tag-bg' }, g);
        el('text', { x: tx + tw / 2, y: y + 26, class: 'tag-txt' }, g, txt);
        tx -= 6;
      }
    }
    const bodyY = y + 72;
    const maxW = w - 40;
    const b = wrap(detailG, it.body, x + 20, bodyY, maxW, 17, 'p-body');
    if (it.test) {
      const ty = bodyY + (b.lines - 1) * 17 + 21;
      el('text', { x: x + 20, y: ty, class: 'p-test-k' }, detailG, 'TEST ›');
      el('text', { x: x + 64, y: ty + 0.5, class: 'p-test' }, detailG, it.test);
    }
  }

  /* ---------- chrome : en-tête, onglets, bouton parcours ---------- */
  el('rect', { x: 0, y: 0, width: W, height: HEAD, class: 'head-bg' }, chrome);
  el('line', { x1: 0, y1: HEAD, x2: W, y2: HEAD, class: 'rule' }, chrome);
  el('rect', { x: 0, y: HEAD, width: SIDE, height: H - HEAD, class: 'side-bg' }, chrome);
  el('line', { x1: SIDE, y1: HEAD, x2: SIDE, y2: H, class: 'rule' }, chrome);

  el('rect', { x: 17, y: 16, width: 24, height: 24, rx: 6, fill: '#2d55ff' }, chrome);
  el(
    'path',
    {
      d: 'M29 20.5 L30.8 26.2 L36.5 28 L30.8 29.8 L29 35.5 L27.2 29.8 L21.5 28 L27.2 26.2 Z',
      fill: '#fff',
    },
    chrome,
  );
  const ttl = el('text', { x: 52, y: 32, class: 'h-title' }, chrome);
  el('tspan', null, ttl, 'SENTINEL / INCIDENTS');
  const crumb = el('tspan', { dx: 12, class: 'h-crumb' }, ttl, '');

  const pill = el(
    'g',
    {
      class: 'pill sn-ptr',
      tabindex: 0,
      role: 'button',
      'aria-pressed': state.anim ? 'true' : 'false',
      'aria-label': 'Activer ou couper les animations',
    },
    chrome,
  );
  const pillW = 132;
  el(
    'rect',
    { x: W - 16 - pillW, y: 13, width: pillW, height: 30, rx: 15, class: 'pill-bg' },
    pill,
  );
  const pillTxt = el('text', { x: W - 16 - pillW / 2, y: 31.5, class: 'pill-txt' }, pill, '');
  function paintPill() {
    pillTxt.textContent = `ANIMATION · ${state.anim ? 'ON' : 'OFF'}`;
    pill.setAttribute('aria-pressed', state.anim ? 'true' : 'false');
  }
  paintPill();
  function togglePill() {
    state.anim = !state.anim;
    root.classList.toggle('no-anim', !state.anim);
    paintPill();
    if (state.anim) kick();
  }
  pill.addEventListener('click', togglePill);
  pill.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      togglePill();
    }
  });
  el('circle', { cx: W - 16 - pillW - 34, cy: 28, r: 5, fill: '#7d99ff' }, chrome);
  el('circle', { cx: W - 16 - pillW - 14, cy: 28, r: 5, fill: '#c8ff2e' }, chrome);

  const tabNum = el('text', { x: 20, y: 86, class: 'tab-num' }, chrome, '01');
  const tabList = el('g', { role: 'tablist', 'aria-label': 'Vues de la carte' }, chrome);
  const tabEls: SVGGElement[] = [];
  const TAB_Y0 = 100;
  const TAB_STEP = 38;

  function buildTabs() {
    SCENES.forEach((sc, i) => {
      const g = el(
        'g',
        {
          class: 'tab sn-ptr',
          role: 'tab',
          tabindex: i === 0 ? 0 : -1,
          'aria-selected': i === 0 ? 'true' : 'false',
          'aria-label': sc.label,
        },
        tabList,
      );
      el(
        'rect',
        { x: 10, y: TAB_Y0 + i * TAB_STEP, width: 108, height: 30, rx: 4, class: 'tab-bg' },
        g,
      );
      el('text', { x: 20, y: TAB_Y0 + i * TAB_STEP + 19, class: 'tab-txt' }, g, up(sc.tab));
      g.addEventListener('click', () => go(i));
      g.addEventListener('keydown', (e) => {
        const n = SCENES.length;
        const k = e.key;
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

  const btn = el(
    'g',
    {
      class: 'btn sn-ptr',
      tabindex: 0,
      role: 'button',
      'aria-label': 'Lancer ou arrêter le parcours guidé',
    },
    chrome,
  );
  const BTN_Y = H - 24 - 30;
  el('rect', { x: 10, y: BTN_Y, width: 108, height: 30, rx: 15, class: 'btn-bg' }, btn);
  const btnIco = el(
    'path',
    { class: 'btn-ico', d: `M24 ${BTN_Y + 10} L24 ${BTN_Y + 20} L32 ${BTN_Y + 15} Z` },
    btn,
  );
  const btnTxt = el('text', { x: 42, y: BTN_Y + 18.5, class: 'btn-txt' }, btn, 'PARCOURIR');
  el('text', { x: 20, y: BTN_Y - 12, class: 'side-hint' }, chrome, 'SURVOLER · CLIQUER');
  function paintBtn(on: boolean) {
    btn.classList.toggle('is-on', on);
    btnTxt.textContent = on ? 'ARRÊTER' : 'PARCOURIR';
    btnIco.setAttribute(
      'd',
      on
        ? `M25 ${BTN_Y + 10.5} h9 v9 h-9 Z`
        : `M25 ${BTN_Y + 10} L25 ${BTN_Y + 20} L33 ${BTN_Y + 15} Z`,
    );
  }
  function toggleTour() {
    if (state.tour) stopTour();
    else startTour();
  }
  btn.addEventListener('click', toggleTour);
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleTour();
    }
  });

  /* ---------- parcours guidé ---------- */
  function stopTour() {
    if (state.tour) {
      clearInterval(state.tour);
      state.tour = null;
      paintBtn(false);
    }
  }
  function startTour() {
    const sc = curScene;
    if (!sc || !sc.tour.length) return;
    stopTour();
    let i = 0;
    const step = () => {
      if (i >= sc.tour.length) {
        stopTour();
        return;
      }
      select(at(sc.tour, i), { tour: true, force: true });
      i++;
    };
    step();
    state.tour = setInterval(step, 3200);
    paintBtn(true);
  }

  /* ---------- primitives de dessin ---------- */
  function decor(g: SVGGElement, cx: number, cy: number) {
    el('ellipse', { cx, cy, rx: 430, ry: 250, fill: 'url(#sn-glow)' }, g);
    for (const x of [cx - 190, cx + 210]) {
      el('line', { x1: x, y1: HEAD, x2: x, y2: H, class: 'grid-l' }, g);
    }
    el('line', { x1: SIDE, y1: cy + 176, x2: W, y2: cy + 176, class: 'grid-l' }, g);
    el('text', { x: W - 24, y: HEAD + 22, class: 'hint' }, g, 'INTERACTIF');
  }

  function orb(g: SVGGElement, x: number, y: number, r: number, tone?: string | null) {
    const o = el(
      'g',
      { class: `orb${tone ? ` tone-${tone}` : ''}`, transform: `translate(${x} ${y})` },
      g,
    );
    el('circle', { class: 'orb-halo', r: r + 11 }, o);
    el('circle', { class: 'orb-ring', r: r + 5 }, o);
    el('circle', { class: 'orb-core', r }, o);
    el('circle', { class: 'orb-dot', r: Math.max(2.4, r * 0.28) }, o);
    el('circle', { class: 'orb-hit', r: r + 16 }, o);
    return o;
  }
  function nodeLabels(
    o: SVGGElement,
    r: number,
    name: string | null,
    sub: string | null,
    side?: 'top' | 'bottom',
  ) {
    if (!name) return;
    const dy = side === 'top' ? [-(r + 29), -(r + 17)] : [r + 27, r + 40];
    el('text', { x: 0, y: at(dy, 0), class: 't-name' }, o, up(name));
    if (sub) el('text', { x: 0, y: at(dy, 1), class: 't-sub' }, o, up(sub));
  }
  function node(
    g: SVGGElement,
    id: string,
    x: number,
    y: number,
    r: number,
    name: string | null,
    sub: string | null,
    data: ItemData,
    o: { tone?: string; side?: 'top' | 'bottom' } = {},
  ) {
    const orbEl = orb(g, x, y, r, o.tone);
    nodeLabels(orbEl, r, name, sub, o.side);
    reg(id, data, [orbEl]);
    return orbEl;
  }
  function edge(
    g: SVGGElement,
    id: string,
    d: string,
    lx: number,
    ly: number,
    text: string,
    anchor: string,
    data: ItemData,
    cls?: string,
  ) {
    const e = el('g', { class: 'edge' }, g);
    el('path', { d, class: 'edge-hit' }, e);
    el('path', { d, class: `edge-line${cls ? ` ${cls}` : ''}` }, e);
    if (text) el('text', { x: lx, y: ly, class: 't-edge', 'text-anchor': anchor }, e, up(text));
    reg(id, data, [e]);
    return e;
  }
  function line(
    g: SVGGElement,
    d: string,
    lx: number,
    ly: number,
    txt: string,
    anchor = 'middle',
    cls?: string,
  ) {
    const e = el('g', { class: 'edge' }, g);
    el('path', { d, class: `edge-line${cls ? ` ${cls}` : ''}` }, e);
    if (txt) el('text', { x: lx, y: ly, class: 't-edge', 'text-anchor': anchor }, e, up(txt));
  }
  function chip(
    g: SVGGElement,
    id: string,
    x: number,
    y: number,
    w: number,
    text: string,
    data: ItemData,
  ) {
    const c = el('g', { class: 'chip' }, g);
    el('rect', { x, y, width: w, height: 24, rx: 12, class: 'chip-bg' }, c);
    el('text', { x: x + w / 2, y: y + 15.5, class: 'chip-txt' }, c, up(text));
    reg(id, data, [c]);
    return c;
  }
  function note(g: SVGGElement, x: number, y: number, key: string, text: string) {
    const t = el('text', { x, y, class: 'note' }, g);
    el('tspan', { class: 'note-k' }, t, `${up(key)}  `);
    el('tspan', null, t, up(text));
  }

  /* =================================================================
     SCÈNES
     ================================================================= */
  const SCENES: Scene[] = [];

  /* ---------- 01 · ORBITE ---------- */
  SCENES.push({
    q: 'Que fait Sentinel, et pour qui ?',
    tab: 'Orbite',
    label: "Vue d'ensemble : les espaces de Sentinel autour de la boucle d'apprentissage",
    signal: ['Finalité', 'Maîtrise collective'],
    def: 'sentinel',
    tour: ['c_sig', 'c_res', 'c_doc', 'c_app', 'sentinel'],
    build(g) {
      const cx = 730;
      const cy = 262;
      decor(g, cx, cy);
      const orbits: Orbit[] = [
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
      const lineEls = orbits.map((o) =>
        el(
          'ellipse',
          {
            cx,
            cy,
            rx: o.rx,
            ry: o.ry,
            transform: `rotate(${o.rot} ${cx} ${cy})`,
            class: `orbit-line${o.faint ? ' faint' : ''}`,
          },
          g,
        ),
      );

      /* cœur */
      const core = el('g', { class: 'core', transform: `translate(${cx} ${cy})` }, g);
      el('circle', { r: 104, class: 'core-halo' }, core);
      el('circle', { r: 68, class: 'core-mid' }, core);
      el('circle', { r: 58, class: 'core-disc' }, core);
      el('text', { x: 0, y: 4, class: 'core-txt' }, core, 'SENTINEL');
      el('circle', { r: 74, fill: 'transparent', class: 'sn-ptr' }, core);
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
      const nodeDefs: Record<string, [string, string, string, string, string, Tag[]]> = {
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
      let mk = 0;
      orbits.forEach((o, oi) => {
        const orbitEl = at(lineEls, oi);
        for (const [key, t0] of o.nodes) {
          const d = nodeDefs[key];
          if (!d) continue;
          const og = orb(g, 0, 0, 12, null);
          nodeLabels(og, 12, d[0], d[1], 'bottom');
          reg(key, { kicker: d[2], title: d[3], body: d[4], tags: d[5] }, [og]);
          movers.push({
            g: og,
            o,
            t0,
            t: t0,
            time: mk * 3.1,
            amp: 0.09 + 0.018 * mk,
            w: 0.26 + 0.03 * mk,
            ph: mk * 1.7,
            cx,
            cy,
          });
          og.addEventListener('pointerenter', () => orbitEl.classList.add('hot'));
          og.addEventListener('pointerleave', () => orbitEl.classList.remove('hot'));
          mk++;
        }
      });
      placeMovers();

      /* les quatre temps de la boucle */
      function corner(
        id: string,
        x: number,
        y: number,
        num: string,
        text: string,
        anchor: 'start' | 'end',
        data: ItemData,
      ) {
        const c = el('g', { class: 'corner' }, g);
        const w = 150;
        const rx = anchor === 'end' ? x - w : x;
        el('rect', { x: rx, y: y - 16, width: w, height: 28, class: 'c-hit' }, c);
        const t = el('text', { x, y, 'text-anchor': anchor }, c);
        if (anchor === 'end') {
          el('tspan', { class: 't-corner' }, t, `${up(text)}  `);
          el('tspan', { class: 't-num' }, t, num);
        } else {
          el('tspan', { class: 't-num' }, t, `${num}  `);
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
        body: 'La maintenance prend en charge, met en attente avec un motif, reprend, puis clôture. Le responsable priorise et arbitre les demandes de correction ou d’annulation, dans la même transaction que la décision.',
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
    build(g0) {
      decor(g0, 700, 292);
      const g = el('g', { transform: 'translate(0 16)' }, g0);
      const P = {
        canc: [300, 160],
        pend: [560, 160],
        open: [300, 304],
        take: [560, 304],
        clos: [860, 304],
        inv: [1130, 304],
      } as const;

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
    build(g) {
      decor(g, 720, 292);
      const cols = [
        { id: 'role_op', x: 800, name: 'Opérateur', sub: 'signale' },
        { id: 'role_mnt', x: 950, name: 'Maintenance', sub: 'intervient' },
        { id: 'role_resp', x: 1100, name: 'Responsable', sub: 'oriente' },
      ];
      const rows: Array<[string, string, [number, number, number], string]> = [
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
      const Y0 = 180;
      const RH = 22.5;
      const colBg = el(
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
      function showCol(x: number | null) {
        if (x == null) {
          colBg.classList.remove('on');
          return;
        }
        colBg.setAttribute('x', String(x - 54));
        colBg.classList.add('on');
      }

      /* en-têtes de rôles */
      const roleData: Record<string, ItemData> = {
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
      cols.forEach((c, i) => {
        const count = rows.filter((r) => at(r[2], i) > 0).length;
        const o = orb(g, c.x, 96, 15, null);
        o.classList.add('role');
        el('text', { x: 0, y: 40, class: 't-name' }, o, up(c.name));
        el('text', { x: 0, y: 53, class: 't-sub' }, o, up(c.sub));
        const d = roleData[c.id];
        if (!d) return;
        reg(c.id, { ...d, tags: [{ t: `${count} actions sur 13`, k: 'ok' }] }, [o]);
        o.addEventListener('pointerenter', () => showCol(c.x));
        o.addEventListener('pointerleave', () => showCol(null));
        o.addEventListener('focus', () => showCol(c.x));
        o.addEventListener('blur', () => showCol(null));
      });

      /* lignes */
      rows.forEach((r, ri) => {
        const y = Y0 + ri * RH;
        const rg = el('g', { class: 'm-row' }, g);
        el('rect', { x: 152, y: y - 15, width: 1000, height: RH, rx: 4, class: 'm-row-bg' }, rg);
        el('text', { x: 164, y: y + 1, class: 'm-txt' }, rg, r[1]);
        const tags: Tag[] = [];
        r[2].forEach((v, ci) => {
          const col = at(cols, ci);
          const cx = col.x;
          if (v === 1) {
            el('circle', { cx, cy: y - 3, r: 5.5, class: 'm-yes' }, rg);
          } else if (v === 2) {
            el('circle', { cx, cy: y - 3, r: 6, class: 'm-cond-ring' }, rg);
            el('circle', { cx, cy: y - 3, r: 2.3, class: 'm-cond-dot' }, rg);
          } else {
            el('circle', { cx, cy: y - 3, r: 2, class: 'm-no' }, rg);
          }
          if (v > 0) tags.push({ t: col.name + (v === 2 ? ' · si affecté' : ''), k: 'ok' });
        });
        reg(r[0], { kicker: 'Action · matrice des permissions', title: r[1], body: r[3], tags }, [
          rg,
        ]);
        rg.addEventListener('pointerenter', () => showCol(null));
      });

      /* légende */
      const ly = Y0 + (rows.length - 1) * RH + 30;
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
    build(g) {
      decor(g, 700, 292);
      const N = {
        nav: [212, 300],
        proxy: [400, 300],
        front: [612, 176],
        back: [612, 300],
        db: [860, 300],
        sup: [760, 176],
        ia: [1030, 176],
        out: [760, 424],
        smtp: [1030, 424],
      } as const;
      line(g, 'M240 300 L372 300', 306, 288, 'https');
      line(g, 'M428 300 L584 300', 506, 288, '/api/*');
      line(g, 'M420 278 C 470 176, 520 176, 584 176', 470, 166, 'autres chemins');
      line(g, 'M640 300 L832 300', 736, 288, 'sql paramétré');
      line(g, 'M636 284 C 680 250, 700 210, 736 190', 0, 0, '');
      line(g, 'M636 316 C 680 350, 700 390, 736 410', 0, 0, '');
      line(g, 'M788 176 L1002 176', 895, 165, 'clé jamais exposée au navigateur');
      line(g, 'M788 424 L1002 424', 895, 413, 'smtp · retries · backoff');

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
      const layers: Array<[string, string, string]> = [
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
      let lx = 158;
      layers.forEach((l, i) => {
        const w = i === 2 ? 128 : 92;
        chip(g, l[0], lx, 398, w, l[1], {
          kicker: 'Couche · route → controller → service → repository',
          title: l[1],
          body: l[2],
          tags: [{ t: 'Backend' }],
        });
        if (i < 3)
          el('path', { d: `M${lx + w + 3} 410 L${lx + w + 12} 410`, class: 'edge-line' }, g);
        lx += w + 16;
      });

      /* groupes de tables */
      el(
        'text',
        { x: 1010, y: 262, class: 't-sub', 'text-anchor': 'start' },
        g,
        'TABLES · 6 GROUPES',
      );
      const groups: Array<[string, string, string]> = [
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
      groups.forEach((t, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
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
    build(g) {
      decor(g, 700, 280);
      const TX = 300;
      const RX = 1090;
      const YS = [150, 280, 410];
      const allow: Record<string, string[]> = {
        tk_admin: ['r_admin'],
        tk_workshop: ['r_workshop', 'r_board'],
        tk_board: ['r_board'],
      };
      const tokIds = ['tk_admin', 'tk_workshop', 'tk_board'];
      const routeIds = ['r_admin', 'r_workshop', 'r_board'];
      const routeNames: Record<string, string> = {
        r_admin: '/api/admin/*',
        r_workshop: '/api/workshop/*',
        r_board: '/api/board/data',
      };
      const tokNames: Record<string, string> = {
        tk_admin: 'JWT admin',
        tk_workshop: 'JWT atelier',
        tk_board: 'JWT board',
      };

      /* liens (dessous) */
      const links = new Map<string, { p: SVGPathElement; x: SVGGElement }>();
      const link = (t: string, r: string) => {
        const found = links.get(`${t}|${r}`);
        if (!found) throw new Error(`Sentinel map: missing link ${t} → ${r}`);
        return found;
      };
      tokIds.forEach((t, ti) => {
        routeIds.forEach((r, ri) => {
          const yt = at(YS, ti);
          const yr = at(YS, ri);
          const d = `M${TX + 28} ${yt} C 560 ${yt}, 830 ${yr}, ${RX - 30} ${yr}`;
          const p = el('path', { d, class: 'lnk' }, g);
          const x = el('g', { class: 'xmark' }, g);
          /* croix au milieu des liens refusés */
          let pt = { x: (TX + RX) / 2, y: (yt + yr) / 2 };
          try {
            const q = p.getPointAtLength(p.getTotalLength() * 0.62);
            pt = { x: q.x, y: q.y };
          } catch {
            /* garde le milieu géométrique */
          }
          el('line', { x1: pt.x - 5, y1: pt.y - 5, x2: pt.x + 5, y2: pt.y + 5 }, x);
          el('line', { x1: pt.x - 5, y1: pt.y + 5, x2: pt.x + 5, y2: pt.y - 5 }, x);
          links.set(`${t}|${r}`, { p, x });
        });
      });

      /* portique central */
      const gate = el('g', { class: 'gate', transform: 'translate(700 280)' }, g);
      el('circle', { r: 62, fill: 'url(#sn-glow-core)' }, gate);
      el('circle', { r: 40, class: 'gate-disc' }, gate);
      el('text', { x: 0, y: -2, class: 'gate-txt' }, gate, 'GARDES');
      el('text', { x: 0, y: 11, class: 't-sub' }, gate, 'SERVEUR');
      el('circle', { r: 48, fill: 'transparent', class: 'sn-ptr' }, gate);
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
      const tokData: Record<string, ItemData> = {
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
      tokIds.forEach((t, i) => {
        const o = orb(g, TX, at(YS, i), 24, null);
        o.querySelector('.orb-dot')?.setAttribute('r', '4');
        el(
          'text',
          { x: -40, y: 4, class: 't-name', 'text-anchor': 'end' },
          o,
          up(tokNames[t] ?? t),
        );
        const d = tokData[t];
        if (d) reg(t, d, [o]);
      });
      const routeData: Record<string, ItemData> = {
        r_admin: {
          kicker: 'Espace · /api/admin',
          title: '/api/admin/*',
          body: 'Toutes les routes exigent une session admin, y compris les lectures sensibles. Réauthentification sur les actions sensibles : les quatre premiers échecs refusent l’action, le cinquième révoque toutes les sessions admin (SESSION_REVOKED).',
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
      const routeOrbs = new Map<string, SVGGElement>();
      routeIds.forEach((r, i) => {
        const o = orb(g, RX, at(YS, i), 24, null);
        o.querySelector('.orb-dot')?.setAttribute('r', '4');
        el(
          'text',
          { x: 40, y: 4, class: 't-name', 'text-anchor': 'start' },
          o,
          up(routeNames[r] ?? r),
        );
        const d = routeData[r];
        if (d) reg(r, d, [o]);
        routeOrbs.set(r, o);
      });

      /* défenses */
      el('text', { x: 396, y: 440, class: 't-sub', 'text-anchor': 'start' }, g, 'DÉFENSES');
      const defenses: Array<[string, string, number, string]> = [
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
          'Rotation de mot de passe, changement de rôle ou de badge, désactivation : incrément atomique de session_version, sessions coupées immédiatement plutôt qu’à l’expiration du JWT.',
        ],
        [
          'c_rate',
          'Rate limits',
          100,
          'Limite globale par IP, limite renforcée sur les connexions, le support IA et la réauthentification admin. Compteurs en mémoire de processus : adaptés à une réplique unique ; plusieurs répliques exigeraient un stockage partagé.',
        ],
      ];
      let dx = 396;
      for (const d of defenses) {
        chip(g, d[0], dx, 450, d[2], d[1], {
          kicker: 'Défense · couche HTTP',
          title: d[1],
          body: d[3],
          tags: [{ t: 'Backend' }],
        });
        dx += d[2] + 10;
      }

      /* interaction : jeton sélectionné */
      function paintToken(t: string) {
        const allowed = allow[t];
        if (!allowed) return;
        for (const o of routeOrbs.values()) o.classList.remove('ok', 'no');
        for (const tk of tokIds) {
          for (const r of routeIds) {
            const L = link(tk, r);
            L.p.setAttribute('class', 'lnk');
            L.x.setAttribute('class', 'xmark');
          }
        }
        for (const r of routeIds) {
          const ok = allowed.includes(r);
          const L = link(t, r);
          L.p.setAttribute('class', `lnk ${ok ? 'ok' : 'no'}`);
          if (!ok) L.x.setAttribute('class', 'xmark on');
          routeOrbs.get(r)?.classList.add(ok ? 'ok' : 'no');
        }
      }
      sceneHooks.onSelect = (id) => paintToken(id);
      paintToken('tk_workshop');
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
    build(g) {
      const cx = 700;
      const cy = 282;
      const RXd = 318;
      const RYd = 148;
      decor(g, cx, cy);
      el('ellipse', { cx, cy, rx: RXd, ry: RYd, class: 'orbit-line' }, g);
      el('ellipse', { cx, cy, rx: RXd * 0.62, ry: RYd * 0.62, class: 'orbit-line faint' }, g);

      const core = el('g', { class: 'core', transform: `translate(${cx} ${cy})` }, g);
      el('circle', { r: 88, class: 'core-halo' }, core);
      el('circle', { r: 58, class: 'core-mid' }, core);
      el('circle', { r: 48, class: 'core-disc' }, core);
      el('text', { x: 0, y: 4, class: 'core-txt' }, core, 'MAÎTRISE');
      el('circle', { r: 62, fill: 'transparent', class: 'sn-ptr' }, core);
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

      const principles: Array<[string, string, string, string, string, string]> = [
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
          '« Qui a fait quoi » donne-t-il envie de contribuer, ou crainte d’être pris en faute ?',
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
      principles.forEach((p, i) => {
        const a = rad(-90 + i * (360 / 7));
        const x = cx + RXd * Math.cos(a);
        const y = cy + RYd * Math.sin(a);
        const top = Math.sin(a) < -0.5;
        node(
          g,
          p[0],
          x,
          y,
          14,
          `${p[1]} · ${p[2]}`,
          null,
          {
            kicker: `Principe ${p[1]} · design.md §3`,
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
      const tokens = ['calm', 'watch', 'act', 'critical'];
      LEVELS.forEach((lv, i) => {
        const y = 116 + i * 30;
        const lg = el('g', { class: 'lv' }, g);
        el('rect', { x: 1092, y, width: 196, height: 24, rx: 5, class: 'lv-box' }, lg);
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
            tags: [{ t: `--attention-${at(tokens, i)}` }],
          },
          [lg],
        );
      });

      /* curseur P7 : ancienneté → niveau (mêmes paliers que ageAttentionLevel : 1, 3, 7 jours) */
      const SX = 160;
      const SW = 250;
      const SY = 446;
      const MAXD = 9;
      const levelFor = (d: number) => (d >= 7 ? 3 : d >= 3 ? 2 : d >= 1 ? 1 : 0);
      el('text', { x: SX, y: 404, class: 'sl-ttl' }, g, 'P7 · ÂGE D’UN INCIDENT');
      const val = el('text', { x: SX, y: 424, class: 'sl-val' }, g, '');
      const segs: Array<[number, number]> = [
        [0, 1],
        [1, 3],
        [3, 7],
        [7, MAXD],
      ];
      segs.forEach((s, i) => {
        el(
          'rect',
          {
            x: SX + (s[0] / MAXD) * SW,
            y: SY - 2,
            width: ((s[1] - s[0]) / MAXD) * SW - 1,
            height: 4,
            rx: 2,
            fill: at(LEVELS, i).sw,
            opacity: 0.85,
          },
          g,
        );
      });
      for (const d of [1, 3, 7]) {
        el(
          'text',
          { x: SX + (d / MAXD) * SW, y: SY + 24, class: 'sl-txt', 'text-anchor': 'middle' },
          g,
          `${d} J`,
        );
      }
      let dayV = 2;
      const handle = el(
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
      const hit = el(
        'rect',
        { x: SX - 12, y: SY - 16, width: SW + 24, height: 32, class: 'sl-hit' },
        g,
      );
      function setDay(d: number, quiet?: boolean) {
        dayV = Math.max(0, Math.min(MAXD, d));
        handle.setAttribute('cx', String(SX + (dayV / MAXD) * SW));
        handle.setAttribute('aria-valuenow', dayV.toFixed(1));
        const lv = at(LEVELS, levelFor(dayV));
        const shown =
          dayV < 1 ? `${Math.round(dayV * 24)} H` : `${dayV.toFixed(1).replace('.0', '')} J`;
        val.textContent = `DEPUIS ${shown}  ›  ${up(lv.name)}`;
        val.setAttribute('fill', lv.sw === '#5b6a95' ? '#fff' : lv.sw);
        if (!quiet) select(lv.id);
      }
      function svgX(ev: PointerEvent) {
        const m = svg.getScreenCTM();
        if (!m) return 0;
        return new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse()).x;
      }
      let drag = false;
      const move = (ev: PointerEvent) => setDay(((svgX(ev) - SX) / SW) * MAXD);
      const dragTargets: SVGElement[] = [hit, handle];
      for (const t of dragTargets) {
        t.addEventListener('pointerdown', (ev) => {
          drag = true;
          try {
            t.setPointerCapture(ev.pointerId);
          } catch {
            /* capture indisponible */
          }
          move(ev);
        });
        t.addEventListener('pointermove', (ev) => {
          if (drag) move(ev);
        });
        t.addEventListener('pointerup', () => {
          drag = false;
        });
        t.addEventListener('pointercancel', () => {
          drag = false;
        });
      }
      handle.addEventListener('keydown', (ev) => {
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
    build(g) {
      decor(g, 700, 292);
      const TY = 170;
      const BY = 356;
      const X = [212, 420, 628, 836, 1044] as const;
      const XB = [1044, 836, 628, 420] as const;

      line(g, `M240 ${TY} L370 ${TY}`, 305, TY - 12, '');
      line(g, `M470 ${TY} L600 ${TY}`, 535, TY - 12, '6 verts');
      line(g, `M656 ${TY} L808 ${TY}`, 732, TY - 12, 'workflow_dispatch');
      line(g, `M864 ${TY} L1016 ${TY}`, 940, TY - 12, 'digests · notes');
      line(g, `M1044 ${TY + 30} L1044 ${BY - 30}`, 1056, 268, 'runbook · vps', 'start');
      line(g, `M1016 ${BY} L864 ${BY}`, 940, BY - 12, '@sha256');
      line(g, `M808 ${BY} L656 ${BY}`, 732, BY - 12, '');
      line(g, `M600 ${BY} L448 ${BY}`, 524, BY - 12, 'up --no-build');

      node(g, 'pr', X[0], TY, 22, 'Pull request', 'main protégée', {
        kicker: 'Étape 01 · GitHub',
        title: 'Pull request',
        body: 'Un ruleset actif protège main, sans acteur de bypass : pull request obligatoire, conversations résolues, branche à jour, force-push et suppression bloqués. Un commit porte une intention cohérente.',
        tags: [{ t: 'Ruleset' }, { t: 'Sans bypass' }],
      });

      /* CI : six satellites */
      const ci = node(
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
      const checks: Array<[string, string, string]> = [
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
      checks.forEach((c, i) => {
        const a = rad(30 + i * 60);
        const so = orb(g, X[1] + 48 * Math.cos(a), TY + 48 * Math.sin(a), 6, 'lime');
        so.querySelector('.orb-halo')?.setAttribute('r', '9');
        so.querySelector('.orb-ring')?.setAttribute('r', '7.5');
        reg(
          c[0],
          {
            kicker: `Check requis · ${i + 1} / 6`,
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
      const rbD = `M420 ${BY + 74} L420 ${BY + 88} L1044 ${BY + 88} L1044 ${BY + 76}`;
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

  /* ---------- moteur de scènes ---------- */
  function go(i: number, focus?: boolean) {
    stopTour();
    state.tab = i;
    const sc = at(SCENES, i);
    curScene = sc;
    sceneHooks = {};
    canvas.classList.add('is-out');
    clearTimeout(buildT);
    buildT = setTimeout(
      () => {
        if (destroyed) return;
        clear(canvas);
        items = {};
        movers = [];
        state.sel = null;
        buildScene(sc);
        canvas.classList.remove('is-out');
      },
      state.anim ? 180 : 0,
    );

    tabEls.forEach((t, k) => {
      t.classList.toggle('is-on', k === i);
      t.setAttribute('aria-selected', k === i ? 'true' : 'false');
      t.setAttribute('tabindex', k === i ? '0' : '-1');
    });
    if (focus) at(tabEls, i).focus();
    tabNum.textContent = String(i + 1).padStart(2, '0');
    crumb.textContent = `/ SENTINEL / CHAÎNE / ${up(sc.tab)}`;
    paintBtn(false);
  }
  function buildScene(sc: Scene) {
    const g = el('g', null, canvas);
    el('text', { x: SIDE + 24, y: HEAD + 24, class: 'q-k' }, g, 'QUESTION');
    el('text', { x: SIDE + 24, y: HEAD + 43, class: 'q-t' }, g, sc.q);
    sc.build(g);
    setSignal(sc.signal);
    select(sc.def, { force: true, tour: true });
    kick();
  }

  /* ---------- animation des orbites ---------- */
  function orbitPos(m: Mover): [number, number] {
    const o = m.o;
    const a = rad(o.rot);
    const x = o.rx * Math.cos(m.t);
    const y = o.ry * Math.sin(m.t);
    return [m.cx + x * Math.cos(a) - y * Math.sin(a), m.cy + x * Math.sin(a) + y * Math.cos(a)];
  }
  function placeMovers() {
    for (const m of movers) {
      const [px, py] = orbitPos(m);
      m.g.setAttribute('transform', `translate(${px.toFixed(2)} ${py.toFixed(2)})`);
    }
  }
  let raf = 0;
  let last = 0;
  function frame(ts: number) {
    raf = 0;
    if (destroyed || !movers.length || !state.anim || !state.visible) return;
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    if (!state.paused) {
      for (const m of movers) {
        m.time += dt;
        m.t = m.t0 + m.amp * Math.sin(m.time * m.w + m.ph);
      }
      placeMovers();
    }
    raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (destroyed || raf || !movers.length || !state.anim || !state.visible) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  let observer: IntersectionObserver | null = null;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        state.visible = entries.some((entry) => entry.isIntersecting);
        if (state.visible) kick();
      },
      { threshold: 0.05 },
    );
    observer.observe(root);
  }

  /* ---------- démarrage ---------- */
  buildTabs();
  go(0);
  void document.fonts?.ready.then(() => {
    const it = state.sel ? items[state.sel] : undefined;
    if (!destroyed && it) renderPanel(it);
  });

  return () => {
    destroyed = true;
    if (state.tour) clearInterval(state.tour);
    clearTimeout(buildT);
    if (raf) cancelAnimationFrame(raf);
    observer?.disconnect();
    clear(root);
    root.classList.remove('sn-map', 'no-anim');
  };
}
