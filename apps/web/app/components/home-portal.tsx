import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { brandEmblemGroups } from '@akiksystems/ui';
import { Link, useNavigate } from 'react-router';

import {
  destinationById,
  destinationHref,
  type GlobalDestinationId,
} from '../i18n/global-destinations';
import { dictionaryFor, type Locale } from '../i18n/locales';
import { publicLanguageHref } from '../lib/public-locales';
import { homeDestinationOrder, homeDestinationPresentation } from './home-portal-content';
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
  const localeName = locale === 'fr' ? 'Français' : 'English';
  const alternateName = alternateLocale === 'fr' ? 'français' : 'English';
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
      <Link
        aria-label={
          locale === 'fr'
            ? localeName + ' actif. Afficher en ' + alternateName + '.'
            : localeName + ' active. View in ' + alternateName + '.'
        }
        className="aks-home-language"
        hrefLang={alternateLocale}
        prefetch="intent"
        to={publicLanguageHref(alternateLocale, '/' + alternateLocale)}
      >
        <span aria-hidden="true" className="aks-home-language-display">
          <span className="aks-home-language-current" lang={locale}>
            {locale.toUpperCase()}
          </span>
          <span className="aks-home-language-separator">/</span>
          <span className="aks-home-language-target" lang={alternateLocale}>
            {alternateLocale.toUpperCase()}
          </span>
        </span>
      </Link>
    </div>
  );
}

function HomeEmblem() {
  return (
    <svg
      aria-hidden="true"
      className="aks-home-brand-mark"
      focusable="false"
      viewBox="0 0 2048 2048"
    >
      {brandEmblemGroups.map((group) => (
        <use fill="currentColor" href={'/brand/AKSYS.svg#' + group} key={group} />
      ))}
    </svg>
  );
}

const wordmarkTarget = 'AkikSystems';
const matrixGlyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/{}[]%*+=?';
const initialWordmarkScramble = '\u00a0'.repeat(wordmarkTarget.length);

function MatrixWordmark() {
  const [display, setDisplay] = useState(initialWordmarkScramble);
  const [animationStarted, setAnimationStarted] = useState(false);
  const activationFrame = useRef(0);
  const matrixFrame = useRef(0);
  const matrixStarted = useRef(false);

  useEffect(() => {
    activationFrame.current = window.requestAnimationFrame(() => {
      setAnimationStarted(true);
    });

    return () => {
      window.cancelAnimationFrame(activationFrame.current);
      window.cancelAnimationFrame(matrixFrame.current);
    };
  }, []);

  const startMatrixAnimation = () => {
    if (matrixStarted.current) return;
    matrixStarted.current = true;

    const startedAt = performance.now();
    let lastMutationAt = startedAt - 50;

    const animate = (now: number) => {
      const elapsed = now - startedAt;
      const animationDuration = 980;
      const characterDuration = 525;
      const characterDelay = (animationDuration - characterDuration) / (wordmarkTarget.length - 1);
      const complete = elapsed >= animationDuration;

      if (now - lastMutationAt >= 34 || complete) {
        const next = Array.from(wordmarkTarget, (character, index) => {
          const characterElapsed = elapsed - index * characterDelay;

          if (characterElapsed < 0) return '\u00a0';
          if (characterElapsed >= characterDuration) return character;
          return matrixGlyphs[Math.floor(Math.random() * matrixGlyphs.length)];
        }).join('');

        setDisplay(next);
        lastMutationAt = now;
      }

      if (!complete) {
        matrixFrame.current = window.requestAnimationFrame(animate);
      }
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
              <span className="aks-home-wordmark-glyph">{display[index]}</span>
            </span>
          ))}
        </span>
      </h1>
      <p
        aria-label="Systemic Scale"
        className="aks-home-scale"
        data-animation={animationStarted ? 'running' : 'idle'}
        onAnimationStart={startMatrixAnimation}
      >
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
    (id: GlobalDestinationId) => ({
      description: homeDestinationPresentation[id].description[locale],
      label: homeDestinationPresentation[id].label[locale],
    }),
    [locale],
  );

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
      navigate(destinationHref(id, locale));
    }, 160);
  };

  return (
    <main className="aks-home">
      <ParisContext locale={locale} />

      <section aria-labelledby="aks-home-title" className="aks-home-portal">
        <nav aria-label={dictionary.home.destinationsLabel} className="aks-home-orbit">
          {homeDestinationOrder.map((id, index) => {
            const destination = destinationById(id);
            const presentation = homeDestinationPresentation[id];

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
                to={destinationHref(destination.id, locale)}
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
