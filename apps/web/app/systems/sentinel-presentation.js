/* global window, document */
/* ---------------------------------------------------------------
   DIAPORAMA DE SOUTENANCE — the "Presentation" tab of the Sentinel map.
   The deck is a standalone document (public/systems/sentinel-defense-slides.html) framed in a
   sandbox without allow-same-origin: the two sides only talk by messages, and the deck's own
   "embed bridge" script answers them (see that file).
   --------------------------------------------------------------- */

var DECK_URL = '/systems/sentinel-defense-slides.html';

var CHEVRON_PREV =
  '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var CHEVRON_NEXT =
  '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * @param {{ compact: boolean, t: (fr: string) => string }} options `t` translates the French source strings.
 * @returns {{ element: HTMLElement, destroy: () => void }}
 */
export function createPresentation(options) {
  var compact = options.compact,
    t = options.t;

  var element = document.createElement('div');
  element.className = 'sn-presentation-viewport';

  var stage = document.createElement('div');
  stage.className = 'sn-presentation-stage';
  element.appendChild(stage);

  /* A phone is too narrow for a 16:9 slide: the stylesheet turns the frame a quarter so the slide
     fills the tall map, and the deck is told which way it is turned (it owns touch-action). */
  var deck = document.createElement('iframe');
  deck.setAttribute('src', DECK_URL + '?embed=' + (compact ? 'rotated' : 'landscape'));
  deck.setAttribute('title', t('Diaporama de soutenance Sentinel'));
  deck.setAttribute('loading', 'lazy');
  deck.setAttribute('referrerpolicy', 'no-referrer');
  deck.setAttribute('sandbox', 'allow-scripts');
  stage.appendChild(deck);

  function send(action) {
    if (deck.contentWindow)
      deck.contentWindow.postMessage({ type: 'sentinel-deck', action: action }, '*');
  }

  /* Swiping and the keyboard work, but the deck ignores clicks that land on text: plain controls
     stay available, in the sidebar on wide screens and under the slide on phones. */
  var bar = document.createElement('div');
  bar.className = 'sn-presentation-bar';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', t('Commandes du diaporama'));

  var prev = document.createElement('button');
  prev.type = 'button';
  prev.innerHTML = CHEVRON_PREV;
  prev.setAttribute('aria-label', t('Diapositive précédente'));
  prev.disabled = true;
  prev.addEventListener('click', function () {
    send('prev');
  });

  var next = document.createElement('button');
  next.type = 'button';
  next.innerHTML = CHEVRON_NEXT;
  next.setAttribute('aria-label', t('Diapositive suivante'));
  next.addEventListener('click', function () {
    send('next');
  });

  /* "7 / 27": the page in white, the total dimmed */
  var count = document.createElement('p');
  count.className = 'sn-presentation-count';
  count.setAttribute('role', 'status');
  var current = document.createElement('span');
  current.textContent = '–';
  var total = document.createElement('span');
  count.appendChild(current);
  count.appendChild(total);

  bar.appendChild(prev);
  bar.appendChild(count);
  bar.appendChild(next);
  element.appendChild(bar);

  function onMessage(event) {
    var data = event.data;
    if (event.source !== deck.contentWindow || !data || data.type !== 'sentinel-deck:state') return;
    current.textContent = String(data.index);
    total.textContent = ' / ' + data.total;
    prev.disabled = data.index <= 1;
    next.disabled = data.index >= data.total;
  }
  window.addEventListener('message', onMessage);

  return {
    element: element,
    destroy: function () {
      window.removeEventListener('message', onMessage);
    },
  };
}
