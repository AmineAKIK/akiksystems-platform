import { Link as RouterLink } from 'react-router';

import { emblemParts } from './hero-emblem';
import { ProtocapMap } from './protocap-map-view';
import { SentinelMap } from './sentinel-map-view';
import type { SystemsAction, SystemsPageContent, SystemsStation, SystemsStatus } from './content';

const statusLabels: Record<'en' | 'fr', Record<SystemsStatus, string>> = {
  fr: {
    building: 'EN CONSTRUCTION',
    deployed: 'DÉPLOYÉ',
    private: 'PRIVÉ',
    experimental: 'EXPÉRIMENTAL',
    archived: 'ARCHIVÉ',
  },
  en: {
    building: 'BUILDING',
    deployed: 'DEPLOYED',
    private: 'PRIVATE',
    experimental: 'EXPERIMENTAL',
    archived: 'ARCHIVED',
  },
};

const stationMedia: Record<Exclude<SystemsStation['id'], 'protocap'>, string> = {
  alkhawarizmi: '/systems/alkhawarizmi.svg',
  oria: '/systems/oria.svg',
  akiksystems: '/systems/akiksystems.svg',
};

/* Covers drawn at the card's ratio fall back to their portrait artwork on phones. */
const stationPortraits: Partial<Record<SystemsStation['id'], string>> = {
  alkhawarizmi: '/systems/alkhawarizmi-portrait.svg',
  oria: '/systems/oria-portrait.svg',
};

function StatusPill({
  locale,
  status,
  label,
}: {
  locale: 'en' | 'fr';
  status: SystemsStatus;
  label?: string;
}) {
  return (
    <span className="aks-systems-status" data-status={status}>
      <span aria-hidden="true" className="aks-systems-status-dot" />
      {label ?? statusLabels[locale][status]}
    </span>
  );
}

function ActionLink({ action }: { action: SystemsAction }) {
  const className = `aks-systems-button aks-systems-button--${action.kind}`;

  if (action.href.startsWith('/')) {
    return (
      <RouterLink className={className} prefetch="intent" to={action.href}>
        {action.label}
        <span aria-hidden="true">↗</span>
      </RouterLink>
    );
  }

  return (
    <a className={className} href={action.href}>
      {action.label}
      <span aria-hidden="true">↗</span>
    </a>
  );
}

function StationImage({
  station,
  compact = false,
}: {
  station: SystemsStation;
  compact?: boolean;
}) {
  if (station.id === 'protocap') return null;

  const portrait = stationPortraits[station.id];
  if (portrait !== undefined && !compact) {
    return (
      <picture>
        <source media="(max-width: 30rem)" srcSet={portrait} />
        <img
          alt=""
          aria-hidden="true"
          className="aks-systems-station-image"
          decoding="async"
          loading="lazy"
          src={stationMedia[station.id]}
        />
      </picture>
    );
  }

  return (
    <img
      alt=""
      aria-hidden="true"
      className={
        compact
          ? 'aks-systems-station-image aks-systems-station-image--compact'
          : 'aks-systems-station-image'
      }
      decoding="async"
      loading="lazy"
      src={stationMedia[station.id]}
    />
  );
}

export function OperationRail({
  items,
  label,
}: {
  items: SystemsPageContent['rail'];
  label: string;
}) {
  return (
    <nav aria-label={label} className="aks-systems-operation-rail">
      <ol>
        {items.map((item) => (
          <li key={item.index}>
            <span className="aks-systems-rail-step">
              <span>{item.index}</span>
              <strong>{item.label}</strong>
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

const heroStars = new Set<string>(['star-center', 'star-left', 'star-right']);

/**
 * The AkikSystems emblem drawn as a construction plan: crisp 1px outlines (inlined so the
 * stroke stays 1px at any size) over its geometric guides, with the stars in lime.
 */
function SystemsHeroArt() {
  return (
    <svg
      aria-hidden="true"
      className="aks-systems-hero-art"
      focusable="false"
      viewBox="0 0 1000 1000"
    >
      <g className="aks-systems-hero-guides">
        <circle cx="500" cy="500" r="370" />
        <circle className="aks-systems-hero-guide--dashed" cx="500" cy="500" r="430" />
        <circle className="aks-systems-hero-guide--dashed" cx="500" cy="500" r="248" />
        <path className="aks-systems-hero-guide--dashed" d="M40 500H960M500 40V960" />
        <path className="aks-systems-hero-guide--dashed" d="M175 175L825 825M825 175L175 825" />
        <path d="M130 900H870M130 890V910M870 890V910" />
      </g>
      <g className="aks-systems-hero-notes">
        <text textAnchor="middle" x="500" y="928">
          Ø 740 · AKIKSYSTEMS
        </text>
        <text x="880" y="196">
          45°
        </text>
      </g>
      <g transform="translate(500 500) scale(0.4) translate(-1024 -1024)">
        {emblemParts.map((part) => (
          <path
            className={heroStars.has(part.id) ? 'aks-systems-hero-star' : 'aks-systems-hero-line'}
            d={part.d}
            fillRule="evenodd"
            key={part.id}
          />
        ))}
      </g>
    </svg>
  );
}

export function SystemsHero({
  content,
  rail,
  railLabel,
}: {
  content: SystemsPageContent['hero'];
  rail: SystemsPageContent['rail'];
  railLabel: string;
}) {
  return (
    <section
      aria-labelledby="systems-title"
      className="aks-systems-hero"
      data-systems-section="hero"
    >
      <SystemsHeroArt />
      <div aria-hidden="true" className="aks-systems-hero-overlay" />
      <div className="aks-systems-wrap aks-systems-hero-copy">
        <p className="aks-systems-kicker">{content.eyebrow}</p>
        <h1 id="systems-title">
          <span className="aks-systems-hero-title">{content.title[0]}</span>{' '}
          <span className="aks-systems-hero-title">{content.title[1]}</span>{' '}
          <span className="aks-systems-hero-state">{content.state}</span>
        </h1>
        <p className="aks-systems-hero-intro">
          <span>{content.intro[0]}</span> <span>{content.intro[1]}</span>
        </p>
      </div>
      <div className="aks-systems-wrap aks-systems-hero-rail">
        <OperationRail items={rail} label={railLabel} />
      </div>
    </section>
  );
}

export function SentinelWorkspace({
  locale,
  content,
}: {
  locale: 'en' | 'fr';
  content: SystemsPageContent['sentinel'];
}) {
  return (
    <section
      aria-labelledby="sentinel-title"
      className="aks-systems-section aks-systems-sentinel"
      data-systems-section="sentinel"
      id="sentinel"
    >
      <div className="aks-systems-wrap">
        <div className="aks-systems-sentinel-heading">
          <div>
            <p className="aks-systems-kicker">{content.eyebrow}</p>
            <h2 id="sentinel-title">{content.name}</h2>
          </div>
          <div className="aks-systems-sentinel-meta">
            <StatusPill locale={locale} status={content.status} label={content.statusLabel} />
          </div>
        </div>
        <SentinelMap label={content.mapLabel} />
        <div className="aks-systems-sentinel-footer">
          <div className="aks-systems-sentinel-summary">
            <p>{content.summary}</p>
            <span>{content.note}</span>
          </div>
          <ul className="aks-systems-sentinel-bullets">
            {content.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="aks-systems-actions">
            {content.actions.map((action) => (
              <ActionLink action={action} key={action.label} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StationFeature({ locale, station }: { locale: 'en' | 'fr'; station: SystemsStation }) {
  return (
    <article className="aks-systems-station aks-systems-station--feature" id={station.id}>
      <figure>
        <ProtocapMap label={station.mapLabel ?? station.name} />
        <figcaption>
          <div>
            <p>{station.note}</p>
            <h3>{station.name}</h3>
          </div>
          <div className="aks-systems-feature-actions">
            <StatusPill locale={locale} status={station.status} label={station.statusLabel} />
            {station.href === undefined ? null : (
              <a
                className="aks-systems-button aks-systems-button--secondary"
                href={station.href}
                rel="noopener"
                target="_blank"
              >
                {locale === 'fr' ? 'Ouvrir l’application' : 'Open the app'}
                <span className="aks-visually-hidden">
                  {locale === 'fr' ? ' (nouvel onglet)' : ' (opens in a new tab)'}
                </span>
                <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        </figcaption>
      </figure>
      <p className="aks-systems-station-function">{station.function}</p>
    </article>
  );
}

function StationPair({ locale, stations }: { locale: 'en' | 'fr'; stations: SystemsStation[] }) {
  return (
    <div className="aks-systems-station-pair">
      {stations.map((station) => (
        <article
          className="aks-systems-station aks-systems-station--pair"
          data-station={station.id}
          key={station.id}
        >
          <figure>
            <div className="aks-systems-station-media">
              <StationImage station={station} />
              <p className="aks-systems-media-label">{station.note}</p>
            </div>
            <figcaption>
              <h3>
                {station.href === undefined ? (
                  station.name
                ) : (
                  <a
                    className="aks-systems-station-link"
                    href={station.href}
                    hrefLang="fr"
                    rel="noopener"
                    target="_blank"
                  >
                    {station.name}
                    <span className="aks-visually-hidden">
                      {locale === 'fr'
                        ? ' (nouvel onglet)'
                        : ' (opens in a new tab, site in French)'}
                    </span>
                    <span aria-hidden="true" className="aks-systems-station-arrow">
                      ↗
                    </span>
                  </a>
                )}
              </h3>
              <StatusPill locale={locale} status={station.status} label={station.statusLabel} />
            </figcaption>
          </figure>
          <p className="aks-systems-station-function">{station.function}</p>
        </article>
      ))}
    </div>
  );
}

function QuickStationRow({
  locale,
  stations,
}: {
  locale: 'en' | 'fr';
  stations: SystemsStation[];
}) {
  return (
    <div className="aks-systems-quick-list">
      {stations.map((station) => (
        <article className="aks-systems-quick" key={station.id}>
          <div className="aks-systems-quick-media">
            <StationImage compact station={station} />
          </div>
          <h3>{station.name}</h3>
          <p>{station.function}</p>
          <StatusPill locale={locale} status={station.status} label={station.statusLabel} />
        </article>
      ))}
    </div>
  );
}

export function Manifesto({ content }: { content: SystemsPageContent['manifesto'] }) {
  return (
    <section
      aria-labelledby="systems-manifesto-title"
      className="aks-systems-manifesto"
      data-systems-section="manifesto"
    >
      <div className="aks-systems-wrap aks-systems-manifesto-inner">
        <div className="aks-systems-manifesto-meta">
          <p className="aks-systems-kicker">{content.eyebrow}</p>
          <span>{content.signature}</span>
        </div>
        <div className="aks-systems-manifesto-grid">
          <h2 id="systems-manifesto-title">
            <span>{content.lines[0]}</span> <span>{content.lines[1]}</span>{' '}
            <span>{content.lines[2]}</span>
          </h2>
          <p>{content.body}</p>
        </div>
      </div>
    </section>
  );
}

export function Workbench({ content }: { content: SystemsPageContent['workbench'] }) {
  return (
    <section
      aria-labelledby="workbench-title"
      className="aks-systems-workbench"
      data-systems-section="workbench"
      id="workbench"
    >
      <div className="aks-systems-wrap">
        <div className="aks-systems-workbench-heading">
          <div>
            <p className="aks-systems-kicker">{content.eyebrow}</p>
            <div className="aks-systems-workbench-title">
              <span aria-hidden="true" className="aks-systems-workbench-mark">
                ✳
              </span>
              <h2 id="workbench-title">{content.title}</h2>
            </div>
          </div>
          <p>{content.intro}</p>
        </div>
        <ol className="aks-systems-tools">
          {content.tools.map((tool, index) => (
            <li key={tool.name}>
              <span className="aks-systems-tool-index">{String(index + 1).padStart(2, '0')}</span>
              <strong>{tool.name}</strong>
              <span className="aks-systems-tool-function">{tool.function}</span>
              <span className="aks-systems-tool-env">{tool.environment}</span>
              <span className="aks-systems-tool-action">
                <i aria-hidden="true" /> {tool.action}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function PerspectivesCTA({ content }: { content: SystemsPageContent['perspectives'] }) {
  return (
    <section
      aria-labelledby="perspectives-title"
      className="aks-systems-perspectives"
      data-systems-section="perspectives"
      id="perspectives"
    >
      <div className="aks-systems-wrap aks-systems-perspectives-inner">
        <p className="aks-systems-kicker">{content.eyebrow}</p>
        <h2 id="perspectives-title">{content.title}</h2>
        <div className="aks-systems-perspectives-bottom">
          <p>{content.body}</p>
          <div className="aks-systems-actions">
            <ActionLink action={content.primary} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function SystemsPage({
  locale,
  content,
}: {
  locale: 'en' | 'fr';
  content: SystemsPageContent;
}) {
  const station = (id: SystemsStation['id']) => {
    const match = content.stations.find((candidate) => candidate.id === id);
    if (match === undefined) throw new Error(`Missing Systems station: ${id}`);
    return match;
  };

  const protocap = station('protocap');
  const alkhawarizmi = station('alkhawarizmi');
  const oria = station('oria');
  const akiksystems = station('akiksystems');

  return (
    <main className="aks-systems-page" data-locale={locale}>
      <SystemsHero content={content.hero} rail={content.rail} railLabel={content.railLabel} />
      <SentinelWorkspace content={content.sentinel} locale={locale} />
      <section
        aria-labelledby="operation-title"
        className="aks-systems-section aks-systems-operation"
        data-systems-section="operation"
        id="operation"
      >
        <div className="aks-systems-wrap">
          <div className="aks-systems-operation-heading">
            <div>
              <p className="aks-systems-kicker">{content.operation.eyebrow}</p>
              <h2 id="operation-title">{content.operation.title}</h2>
            </div>
            <p>{content.operation.intro}</p>
          </div>
          <StationFeature locale={locale} station={protocap} />
          <StationPair locale={locale} stations={[alkhawarizmi, oria]} />
          <QuickStationRow locale={locale} stations={[akiksystems]} />
        </div>
      </section>
      <Manifesto content={content.manifesto} />
      <Workbench content={content.workbench} />
      <PerspectivesCTA content={content.perspectives} />
    </main>
  );
}
