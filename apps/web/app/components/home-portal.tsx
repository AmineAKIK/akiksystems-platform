import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { Link, useNavigate } from 'react-router';

import {
  destinationById,
  destinationHref,
  type GlobalDestinationId,
} from '../i18n/global-destinations';
import { dictionaryFor, type Locale } from '../i18n/locales';
import {
  homeDestinationOrder,
  homeDestinationPresentation,
} from './home-portal-content';
import {
  homeDescriptionEvent,
  type HomeDescriptionDetail,
  type HomeDescriptionEventDetail,
} from './home-description-events';

interface HomePortalProps {
  locale: Locale;
}

const emblemGroups = [
  'frame-and-serpent',
  'eagle',
  'leaf-left-upper',
  'leaf-right-upper',
  'leaf-left-middle',
  'leaf-right-middle',
  'leaf-right-lower',
  'leaf-left-lower',
  'star-center',
  'star-left',
  'star-right',
] as const;

function formatParisContext(now: Date, locale: Locale): string {
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

  return time + ' · PARIS ' + offset + ' · ' + date;
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

  return (
    <div className="aks-home-meta">
      <p
        aria-label={locale === 'fr' ? 'Heure locale à Paris' : 'Local time in Paris'}
        className="aks-home-clock"
      >
        <time dateTime={now?.toISOString()}>
          {now === null
            ? '--:--:-- · PARIS UTC · —'
            : formatParisContext(now, locale)}
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
        lang={alternateLocale}
        prefetch="intent"
        to={'/' + alternateLocale}
      >
        {locale.toUpperCase()}
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
      {emblemGroups.map((group) => (
        <use
          fill="currentColor"
          href={'/brand/AKSYS.svg#' + group}
          key={group}
        />
      ))}
    </svg>
  );
}

export function HomePortal({ locale }: HomePortalProps) {
  const dictionary = dictionaryFor(locale);
  const navigate = useNavigate();
  const [preview, setPreview] = useState<HomeDescriptionDetail | null>(null);
  const [previewActive, setPreviewActive] = useState(false);
  const [activeDestination, setActiveDestination] =
    useState<GlobalDestinationId | null>(null);
  const focusedPreview = useRef<HomeDescriptionDetail | null>(null);
  const pointedPreview = useRef<HomeDescriptionDetail | null>(null);
  const selectedPreview = useRef<HomeDescriptionDetail | null>(null);
  const lastPointerType = useRef<string | null>(null);

  const restorePreview = () => {
    const next =
      pointedPreview.current ??
      focusedPreview.current ??
      selectedPreview.current;
    setPreview(next);
    setPreviewActive(next !== null);
  };

  const updatePreview = (
    channel: HomeDescriptionEventDetail['channel'],
    content: HomeDescriptionDetail | null,
  ) => {
    if (channel === 'pointer') pointedPreview.current = content;
    else focusedPreview.current = content;
    restorePreview();
  };

  const destinationPreview = (id: GlobalDestinationId) => ({
    description: homeDestinationPresentation[id].description[locale],
    label: homeDestinationPresentation[id].label[locale],
  });

  const clearTouchSelection = () => {
    selectedPreview.current = null;
    setActiveDestination(null);
    restorePreview();
  };

  useEffect(() => {
    const receiveDescription = (event: Event) => {
      const { channel, content } = (
        event as CustomEvent<HomeDescriptionEventDetail>
      ).detail;
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
  });

  const followDestination = (
    event: MouseEvent<HTMLAnchorElement>,
    id: GlobalDestinationId,
  ) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const tactile =
      lastPointerType.current === 'touch' ||
      lastPointerType.current === 'pen';

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
    window.setTimeout(
      () => navigate(destinationHref(id, locale)),
      160,
    );
  };

  return (
    <main className="aks-home">
      <ParisContext locale={locale} />

      <section aria-labelledby="aks-home-title" className="aks-home-portal">
        <nav
          aria-label={dictionary.home.destinationsLabel}
          className="aks-home-orbit"
        >
          {homeDestinationOrder.map((id, index) => {
            const destination = destinationById(id);
            const presentation = homeDestinationPresentation[id];

            return (
              <Link
                className={
                  'aks-home-door' +
                  (activeDestination === id ? ' is-active' : '')
                }
                data-destination={id}
                data-home-preview-target="primary"
                data-preview-copy={presentation.description[locale]}
                key={id}
                onBlur={() => updatePreview('focus', null)}
                onFocus={() =>
                  updatePreview('focus', destinationPreview(id))
                }
                onClick={(event) => followDestination(event, id)}
                onKeyDown={() => {
                  lastPointerType.current = null;
                }}
                onPointerDown={(event: PointerEvent<HTMLAnchorElement>) => {
                  lastPointerType.current = event.pointerType;
                }}
                onPointerEnter={(event) => {
                  if (
                    event.pointerType !== 'touch' &&
                    event.pointerType !== 'pen'
                  ) {
                    updatePreview('pointer', destinationPreview(id));
                  }
                }}
                onPointerLeave={(event) => {
                  if (
                    event.pointerType !== 'touch' &&
                    event.pointerType !== 'pen'
                  ) {
                    updatePreview('pointer', null);
                  }
                }}
                prefetch="intent"
                style={{ '--aks-home-order': index } as CSSProperties}
                to={destinationHref(destination.id, locale)}
              >
                <span className="aks-home-door-label">
                  {presentation.label[locale]}
                </span>
                <span className="aks-home-door-summary">
                  {presentation.summary[locale]}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="aks-home-center">
          <HomeEmblem />
          <h1 className="aks-home-wordmark" id="aks-home-title">
            AkikSystems
          </h1>
          <p className="aks-home-scale">Systemic Scale</p>
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
