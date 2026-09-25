import { BrandMark, Heading } from '@akiksystems/ui';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import {
  destinationHref,
  globalDestinations,
  type GlobalDestinationId,
} from '../i18n/global-destinations';
import { dictionaryFor, type Locale } from '../i18n/locales';
import {
  homeDescriptionEvent,
  type HomeDescriptionDetail,
  type HomeDescriptionEventDetail,
} from './home-description-events';

interface HomePortalProps {
  locale: Locale;
}

const destinationSummaries: Record<GlobalDestinationId, Record<Locale, string>> = {
  profile: {
    en: 'Founder · Journey · Perspective',
    fr: 'Fondateur · Parcours · Perspective',
  },
  systems: {
    en: 'Products · Projects · Live',
    fr: 'Produits · Projets · En ligne',
  },
  writings: {
    en: 'Articles · Essays · Notes',
    fr: 'Articles · Essais · Notes',
  },
  learning: {
    en: 'Methods · Decisions · Dossiers',
    fr: 'Méthodes · Décisions · Dossiers',
  },
  'work-with-us': {
    en: 'Projects · Partnerships · Contact',
    fr: 'Projets · Partenariats · Contact',
  },
};

function ParisClock({ locale }: { locale: Locale }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const time = now?.toLocaleTimeString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Europe/Paris',
  });
  const date = now?.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });

  const alternateLocale: Locale = locale === 'en' ? 'fr' : 'en';

  return (
    <div className="aks-home-meta">
      <p
        aria-label={locale === 'fr' ? 'Heure à Paris' : 'Time in Paris'}
        className="aks-home-clock"
      >
        <time dateTime={now?.toISOString()}>{time ?? '--:--:--'}</time>
        <span>Paris</span>
        <span aria-hidden="true" className="aks-home-clock-separator" />
        <span>{date ?? '—'}</span>
      </p>
      <Link
        aria-label={locale === 'fr' ? 'Afficher en anglais' : 'View in French'}
        className="aks-home-language"
        hrefLang={alternateLocale}
        lang={alternateLocale}
        prefetch="intent"
        to={`/${alternateLocale}`}
      >
        {alternateLocale.toUpperCase()}
      </Link>
    </div>
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

  const restorePreview = () => {
    const next = pointedPreview.current ?? focusedPreview.current;
    if (next !== null) setPreview(next);
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

  useEffect(() => {
    const receiveDescription = (event: Event) => {
      const { channel, content } = (event as CustomEvent<HomeDescriptionEventDetail>).detail;
      updatePreview(channel, content);
    };

    window.addEventListener(homeDescriptionEvent, receiveDescription);
    return () => window.removeEventListener(homeDescriptionEvent, receiveDescription);
  }, []);

  const destinationPreview = (id: GlobalDestinationId) => {
    const destination = globalDestinations.find((candidate) => candidate.id === id);
    if (destination === undefined) return null;
    return {
      description: destination.description[locale],
      label: destination.label[locale],
    };
  };

  const followDestination = (event: MouseEvent<HTMLAnchorElement>, id: GlobalDestinationId) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    setActiveDestination(id);
    window.setTimeout(() => navigate(destinationHref(id, locale)), 220);
  };

  return (
    <main className="aks-home">
      <ParisClock locale={locale} />

      <section aria-labelledby="aks-home-title" className="aks-home-portal">
        <div className="aks-home-center">
          <BrandMark className="aks-home-brand-mark" />
          <Heading id="aks-home-title" level={1} size="lg">
            AkikSystems
          </Heading>
          <p className="aks-home-scale" data-text="SYSTEMIC SCALE">
            Systemic scale
          </p>
          <div
            aria-live="polite"
            className="aks-home-active-description"
            data-state={previewActive ? 'active' : 'idle'}
          >
            <span>{preview?.label ?? '\u00a0'}</span>
            <p>{preview?.description ?? '\u00a0'}</p>
          </div>
        </div>

        <nav aria-label={dictionary.home.destinationsLabel} className="aks-home-orbit">
          {globalDestinations.map((destination) => (
            <Link
              className={`aks-home-door${activeDestination === destination.id ? ' is-active' : ''}`}
              data-destination={destination.id}
              data-preview-copy={destination.description[locale]}
              key={destination.id}
              onBlur={() => updatePreview('focus', null)}
              onFocus={() => updatePreview('focus', destinationPreview(destination.id))}
              onClick={(event) => followDestination(event, destination.id)}
              onPointerEnter={() => updatePreview('pointer', destinationPreview(destination.id))}
              onPointerLeave={() => updatePreview('pointer', null)}
              prefetch="intent"
              to={destinationHref(destination.id, locale)}
            >
              <span className="aks-home-door-label">{destination.label[locale]}</span>
              <span className="aks-home-door-summary">
                {destinationSummaries[destination.id][locale]}
              </span>
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
