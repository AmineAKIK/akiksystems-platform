import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { Link, useNavigate } from 'react-router';

import { destinationHref, type GlobalDestinationId } from '../i18n/global-destinations';
import { dictionaryFor, type Locale } from '../i18n/locales';
import { publicLanguageHref } from '../lib/public-locales';
import { emblemParts } from '../systems/hero-emblem';
import {
  homeDestinationOrder,
  homeDestinationPresentation,
  homeSoonLabel,
} from './home-portal-content';
import { LanguageSwitch } from './language-switch';
import {
  homeDescriptionEvent,
  type HomeDescriptionDetail,
  type HomeDescriptionEventDetail,
} from './home-description-events';

interface HomePortalProps {
  locale: Locale;
}

function formatParisContext(now: Date, locale: Locale) {
  const languageTag = locale === 'fr' ? 'fr-FR' : 'en-GB';
  const time = new Intl.DateTimeFormat(languageTag, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Europe/Paris',
  }).format(now);

  const date = new Intl.DateTimeFormat(languageTag, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  })
    .format(now)
    .replace(',', '')
    .toUpperCase();

  const offset =
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris',
      timeZoneName: 'shortOffset',
    })
      .formatToParts(now)
      .find((part) => part.type === 'timeZoneName')
      ?.value.replace('GMT', 'UTC') ?? 'UTC';

  return {
    context: time + ' · PARIS ' + offset,
    date,
  };
}

function ParisContext({ locale }: { locale: Locale }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const alternateLocale: Locale = locale === 'en' ? 'fr' : 'en';
  const parisContext =
    now === null ? { context: '--:--:-- · PARIS UTC', date: '—' } : formatParisContext(now, locale);

  return (
    <div className="aks-home-meta">
      <p
        aria-label={locale === 'fr' ? 'Heure locale à Paris' : 'Local time in Paris'}
        className="aks-home-clock"
      >
        <time dateTime={now?.toISOString()}>
          <span className="aks-home-clock-context">{parisContext.context}</span>
          <span className="aks-home-clock-date">{parisContext.date}</span>
        </time>
      </p>
      <LanguageSwitch
        locale={locale}
        to={publicLanguageHref(alternateLocale, '/' + alternateLocale)}
      />
    </div>
  );
}

/** The emblem inlined from the vector master: no extra request, no late appearance. */
function HomeEmblem() {
  return (
    <svg
      aria-hidden="true"
      className="aks-home-brand-mark"
      focusable="false"
      viewBox="0 0 2048 2048"
    >
      {emblemParts.map((part) => (
        <path d={part.d} fill="currentColor" fillRule="evenodd" key={part.id} />
      ))}
    </svg>
  );
}

const wordmarkTarget = 'AkikSystems';
const matrixGlyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/{}[]%*+=?';

/** Starts after the fonts and the page settle, so the intro never competes with hydration. */
function whenSettled(start: () => void) {
  let cancelled = false;
  let handle = 0;
  // Safari has no requestIdleCallback: a short timeout stands in for it.
  const hasIdle = typeof window.requestIdleCallback === 'function';
  const run = () => {
    if (!cancelled) start();
  };
  void document.fonts.ready.then(() => {
    if (cancelled) return;
    handle = hasIdle
      ? window.requestIdleCallback(run, { timeout: 400 })
      : window.setTimeout(run, 60);
  });
  return () => {
    cancelled = true;
    if (hasIdle) window.cancelIdleCallback(handle);
    else window.clearTimeout(handle);
  };
}

function MatrixWordmark() {
  const [animationStarted, setAnimationStarted] = useState(false);
  const glyphs = useRef<Array<HTMLSpanElement | null>>([]);
  const matrixFrame = useRef(0);
  const matrixStarted = useRef(false);

  useEffect(() => {
    const stop = whenSettled(() => setAnimationStarted(true));
    return () => {
      stop();
      window.cancelAnimationFrame(matrixFrame.current);
    };
  }, []);

  // The scramble writes the glyphs straight into the DOM, once per frame: no React render.
  const startMatrixAnimation = () => {
    if (matrixStarted.current) return;
    matrixStarted.current = true;

    const startedAt = performance.now();
    const animationDuration = 980;
    const characterDuration = 525;
    const characterDelay = (animationDuration - characterDuration) / (wordmarkTarget.length - 1);

    const animate = (now: number) => {
      const elapsed = now - startedAt;
      const complete = elapsed >= animationDuration;

      Array.from(wordmarkTarget).forEach((character, index) => {
        const glyph = glyphs.current[index];
        if (!glyph) return;
        const characterElapsed = elapsed - index * characterDelay;
        const next =
          characterElapsed < 0
            ? '\u00a0'
            : characterElapsed >= characterDuration || complete
              ? character
              : (matrixGlyphs[Math.floor(Math.random() * matrixGlyphs.length)] ?? character);
        if (glyph.textContent !== next) glyph.textContent = next;
      });

      if (!complete) matrixFrame.current = window.requestAnimationFrame(animate);
    };

    matrixFrame.current = window.requestAnimationFrame(animate);
  };

  return (
    <>
      <h1 className="aks-home-wordmark" id="aks-home-title">
        <span className="aks-home-wordmark-target">{wordmarkTarget}</span>
        <span aria-hidden="true" className="aks-home-wordmark-matrix">
          {Array.from(wordmarkTarget).map((character, index) => (
            <span className="aks-home-wordmark-slot" key={index}>
              <span className="aks-home-wordmark-slot-measure">{character}</span>
              <span
                className="aks-home-wordmark-glyph"
                ref={(node) => {
                  glyphs.current[index] = node;
                }}
              >
                {'\u00a0'}
              </span>
            </span>
          ))}
        </span>
      </h1>
      <p
        className="aks-home-scale"
        data-animation={animationStarted ? 'running' : 'idle'}
        lang="en"
        onAnimationStart={startMatrixAnimation}
      >
        <span className="aks-visually-hidden">Systemic Scale</span>
        {Array.from('Systemic Scale').map((character, index) => (
          <span
            aria-hidden="true"
            className="aks-home-scale-letter"
            data-scale-index={index}
            key={index}
          >
            {character === ' ' ? '\u00a0' : character}
          </span>
        ))}
      </p>
    </>
  );
}

export function HomePortal({ locale }: HomePortalProps) {
  const dictionary = dictionaryFor(locale);
  const navigate = useNavigate();
  const [preview, setPreview] = useState<HomeDescriptionDetail | null>(null);
  const [previewActive, setPreviewActive] = useState(false);
  const [activeDestination, setActiveDestination] = useState<GlobalDestinationId | null>(null);
  const focusedPreview = useRef<HomeDescriptionDetail | null>(null);
  const pointedPreview = useRef<HomeDescriptionDetail | null>(null);
  const selectedPreview = useRef<HomeDescriptionDetail | null>(null);
  const lastPointerType = useRef<string | null>(null);
  const navigationTimer = useRef<number | null>(null);

  const restorePreview = useCallback(() => {
    const next = pointedPreview.current ?? focusedPreview.current ?? selectedPreview.current;
    setPreview(next);
    setPreviewActive(next !== null);
  }, []);

  const updatePreview = useCallback(
    (channel: HomeDescriptionEventDetail['channel'], content: HomeDescriptionDetail | null) => {
      if (channel === 'pointer') pointedPreview.current = content;
      else focusedPreview.current = content;
      restorePreview();
    },
    [restorePreview],
  );

  const destinationPreview = useCallback(
    (id: GlobalDestinationId) => {
      const presentation = homeDestinationPresentation[id];
      return {
        description: presentation.description[locale],
        label: presentation.soon
          ? presentation.label[locale] + ' · ' + homeSoonLabel[locale]
          : presentation.label[locale],
      };
    },
    [locale],
  );

  const destinationTarget = (id: GlobalDestinationId) =>
    homeDestinationPresentation[id].href?.[locale] ?? destinationHref(id, locale);

  const clearTouchSelection = useCallback(() => {
    selectedPreview.current = null;
    setActiveDestination(null);
    restorePreview();
  }, [restorePreview]);

  useEffect(() => {
    const receiveDescription = (event: Event) => {
      const { channel, content } = (event as CustomEvent<HomeDescriptionEventDetail>).detail;
      updatePreview(channel, content);
    };

    const clearSelectionOutsidePrimary = (event: globalThis.PointerEvent) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('[data-home-preview-target="primary"]') !== null
      ) {
        return;
      }
      clearTouchSelection();
    };

    window.addEventListener(homeDescriptionEvent, receiveDescription);
    document.addEventListener('pointerdown', clearSelectionOutsidePrimary);

    return () => {
      window.removeEventListener(homeDescriptionEvent, receiveDescription);
      document.removeEventListener('pointerdown', clearSelectionOutsidePrimary);
    };
  }, [clearTouchSelection, updatePreview]);

  useEffect(
    () => () => {
      if (navigationTimer.current !== null) {
        window.clearTimeout(navigationTimer.current);
      }
    },
    [],
  );

  const followDestination = (event: MouseEvent<HTMLAnchorElement>, id: GlobalDestinationId) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const tactile = lastPointerType.current === 'touch' || lastPointerType.current === 'pen';

    if (tactile && activeDestination !== id) {
      event.preventDefault();
      const content = destinationPreview(id);
      selectedPreview.current = content;
      setActiveDestination(id);
      setPreview(content);
      setPreviewActive(true);
      return;
    }

    event.preventDefault();
    setActiveDestination(id);
    if (navigationTimer.current !== null) {
      window.clearTimeout(navigationTimer.current);
    }
    navigationTimer.current = window.setTimeout(() => {
      navigationTimer.current = null;
      navigate(destinationTarget(id));
    }, 160);
  };

  return (
    <main className="aks-home">
      <ParisContext locale={locale} />

      <section aria-labelledby="aks-home-title" className="aks-home-portal">
        <nav aria-label={dictionary.home.destinationsLabel} className="aks-home-orbit">
          {homeDestinationOrder.map((id, index) => {
            const presentation = homeDestinationPresentation[id];

            if (presentation.soon) {
              // Not open yet: described on hover and tap, but never a dead-end link.
              return (
                <span
                  className={'aks-home-door' + (activeDestination === id ? ' is-active' : '')}
                  data-destination={id}
                  data-home-order={index}
                  data-home-preview-target="primary"
                  data-state="soon"
                  key={id}
                  onPointerDown={(event: PointerEvent<HTMLSpanElement>) => {
                    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
                    const content = destinationPreview(id);
                    selectedPreview.current = content;
                    setActiveDestination(id);
                    setPreview(content);
                    setPreviewActive(true);
                  }}
                  onPointerEnter={(event) => {
                    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
                      updatePreview('pointer', destinationPreview(id));
                    }
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
                      updatePreview('pointer', null);
                    }
                  }}
                >
                  <span className="aks-home-door-label">{presentation.label[locale]}</span>
                  <span className="aks-home-door-summary">{presentation.summary[locale]}</span>
                  <span className="aks-home-door-status">{homeSoonLabel[locale]}</span>
                </span>
              );
            }

            return (
              <Link
                className={'aks-home-door' + (activeDestination === id ? ' is-active' : '')}
                data-destination={id}
                data-home-preview-target="primary"
                data-preview-copy={presentation.description[locale]}
                key={id}
                onBlur={() => updatePreview('focus', null)}
                onFocus={() => updatePreview('focus', destinationPreview(id))}
                onClick={(event) => followDestination(event, id)}
                onKeyDown={() => {
                  lastPointerType.current = null;
                }}
                onPointerDown={(event: PointerEvent<HTMLAnchorElement>) => {
                  lastPointerType.current = event.pointerType;
                }}
                onPointerEnter={(event) => {
                  if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
                    updatePreview('pointer', destinationPreview(id));
                  }
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
                    updatePreview('pointer', null);
                  }
                }}
                data-home-order={index}
                prefetch="intent"
                to={destinationTarget(id)}
              >
                <span className="aks-home-door-label">{presentation.label[locale]}</span>
                <span className="aks-home-door-summary">{presentation.summary[locale]}</span>
              </Link>
            );
          })}
        </nav>

        <span aria-hidden="true" className="aks-home-nav-separator" />

        <div className="aks-home-center">
          <HomeEmblem />
          <MatrixWordmark />
        </div>

        <div
          aria-atomic="true"
          aria-live="polite"
          className="aks-home-active-description"
          data-state={previewActive ? 'active' : 'idle'}
        >
          <span>{preview?.label ?? '\u00a0'}</span>
          <p>{preview?.description ?? '\u00a0'}</p>
        </div>
      </section>
    </main>
  );
}
