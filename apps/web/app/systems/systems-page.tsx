import { Link as RouterLink } from 'react-router';

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

const stationMedia: Record<SystemsStation['id'], string> = {
  cirrus: '/systems/cirrus.webp',
  mosaique: '/systems/mosaique.webp',
  'radar-cli': '/systems/radar-cli.webp',
  sonar: '/systems/sonar.webp',
  detour: '/systems/detour.webp',
};

function StatusPill({ locale, status }: { locale: 'en' | 'fr'; status: SystemsStatus }) {
  return (
    <span className="aks-systems-status" data-status={status}>
      <span aria-hidden="true" className="aks-systems-status-dot" />
      {statusLabels[locale][status]}
    </span>
  );
}

function ActionLink({ action }: { action: SystemsAction }) {
  const className = `aks-systems-button aks-systems-button--${action.kind}`;

  if (action.href.startsWith('/')) {
    return (
      <RouterLink className={className} prefetch="intent" to={action.href} viewTransition>
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
      loading={station.id === 'cirrus' ? 'eager' : 'lazy'}
      src={stationMedia[station.id]}
    />
  );
}

export function OperationRail({ items }: { items: SystemsPageContent['rail'] }) {
  return (
    <nav aria-label="System operation sequence" className="aks-systems-operation-rail">
      <ol>
        {items.map((item) => (
          <li key={item.index}>
            <span>{item.index}</span>
            <strong>{item.label}</strong>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function SystemsHero({
  content,
  rail,
}: {
  content: SystemsPageContent['hero'];
  rail: SystemsPageContent['rail'];
}) {
  return (
    <section
      aria-labelledby="systems-title"
      className="aks-systems-hero"
      data-systems-section="hero"
    >
      <img
        alt=""
        aria-hidden="true"
        className="aks-systems-hero-media"
        decoding="sync"
        fetchPriority="high"
        src="/systems/hero.webp"
      />
      <div aria-hidden="true" className="aks-systems-hero-overlay" />
      <div className="aks-systems-wrap aks-systems-hero-copy">
        <p className="aks-systems-kicker">{content.eyebrow}</p>
        <h1 id="systems-title">
          <span className="aks-systems-hero-title">{content.title}</span>
          <span className="aks-systems-hero-state">{content.state}</span>
        </h1>
        <p className="aks-systems-hero-intro">{content.intro}</p>
      </div>
      <div className="aks-systems-wrap aks-systems-hero-rail">
        <OperationRail items={rail} />
      </div>
    </section>
  );
}

function AtlasConsole({ locale }: { locale: 'en' | 'fr' }) {
  const nav =
    locale === 'fr'
      ? ['VUE', 'FLUX', 'SIGNAUX', 'SORTIES']
      : ['VIEW', 'FLOW', 'SIGNALS', 'OUTPUTS'];

  return (
    <div className="aks-systems-atlas-console">
      <div className="aks-systems-atlas-toolbar">
        <div className="aks-systems-atlas-brand">
          <span aria-hidden="true" className="aks-systems-atlas-icon">
            ✦
          </span>
          <strong>ATLAS / OPS</strong>
        </div>
        <span className="aks-systems-atlas-live">LIVE</span>
      </div>
      <div className="aks-systems-atlas-body">
        <aside aria-hidden="true" className="aks-systems-atlas-nav">
          <span className="is-active">01</span>
          {nav.map((item) => (
            <small key={item}>{item}</small>
          ))}
          <i />
          <i />
          <i />
        </aside>
        <div className="aks-systems-atlas-stage">
          <img alt="" aria-hidden="true" decoding="async" src="/systems/atlas.webp" />
          <div aria-hidden="true" className="aks-systems-atlas-core">
            <span>ATLAS</span>
          </div>
          <span
            aria-hidden="true"
            className="aks-systems-atlas-label aks-systems-atlas-label--inputs"
          >
            INPUTS
          </span>
          <span
            aria-hidden="true"
            className="aks-systems-atlas-label aks-systems-atlas-label--signals"
          >
            SIGNALS
          </span>
          <span
            aria-hidden="true"
            className="aks-systems-atlas-label aks-systems-atlas-label--context"
          >
            CONTEXT
          </span>
          <span
            aria-hidden="true"
            className="aks-systems-atlas-label aks-systems-atlas-label--output"
          >
            OUTPUT
          </span>
          <div className="aks-systems-atlas-signal">
            <span>{locale === 'fr' ? 'signal critique' : 'critical signal'}</span>
            <strong>{locale === 'fr' ? 'variation détectée' : 'variation detected'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AtlasWorkspace({
  locale,
  content,
}: {
  locale: 'en' | 'fr';
  content: SystemsPageContent['atlas'];
}) {
  return (
    <section
      aria-labelledby="atlas-title"
      className="aks-systems-section aks-systems-atlas"
      data-systems-section="atlas"
    >
      <div className="aks-systems-wrap">
        <div className="aks-systems-atlas-heading">
          <div>
            <p className="aks-systems-kicker">{content.eyebrow}</p>
            <h2 id="atlas-title">{content.name}</h2>
          </div>
          <StatusPill locale={locale} status={content.status} />
        </div>
        <AtlasConsole locale={locale} />
        <div className="aks-systems-atlas-footer">
          <div>
            <p>{content.summary}</p>
            <span>{content.note}</span>
          </div>
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
    <article className="aks-systems-station aks-systems-station--feature">
      <figure>
        <div className="aks-systems-station-media">
          <StationImage station={station} />
        </div>
        <figcaption>
          <div>
            <p>{station.note}</p>
            <h3>{station.name}</h3>
          </div>
          <StatusPill locale={locale} status={station.status} />
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
        <article className="aks-systems-station aks-systems-station--pair" key={station.id}>
          <figure>
            <div className="aks-systems-station-media">
              <StationImage station={station} />
            </div>
            <figcaption>
              <div>
                <p>{station.note}</p>
                <h3>{station.name}</h3>
              </div>
              <StatusPill locale={locale} status={station.status} />
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
          <StatusPill locale={locale} status={station.status} />
          <a
            aria-label={`${station.name}: ${station.note}`}
            className="aks-systems-quick-link"
            href="#workbench"
          >
            {locale === 'fr' ? 'Ouvrir' : 'Open'}
            <span aria-hidden="true">↗</span>
          </a>
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
      <div aria-hidden="true" className="aks-systems-manifesto-orbit" />
      <div className="aks-systems-wrap aks-systems-manifesto-inner">
        <p className="aks-systems-kicker">{content.eyebrow}</p>
        <div className="aks-systems-manifesto-grid">
          <h2 id="systems-manifesto-title">
            <span>{content.lines[0]}</span>
            <span>{content.lines[1]}</span>
            <span>{content.lines[2]}</span>
          </h2>
          <p>{content.body}</p>
        </div>
      </div>
    </section>
  );
}

export function Workbench({
  locale,
  content,
}: {
  locale: 'en' | 'fr';
  content: SystemsPageContent['workbench'];
}) {
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
            <h2 id="workbench-title">{content.title}</h2>
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
              <StatusPill locale={locale} status={tool.status} />
              <span aria-hidden="true" className="aks-systems-tool-arrow">
                ↗
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
            <ActionLink action={content.secondary} />
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

  const cirrus = station('cirrus');
  const mosaique = station('mosaique');
  const radar = station('radar-cli');
  const sonar = station('sonar');
  const detour = station('detour');

  return (
    <main className="aks-systems-page" data-locale={locale}>
      <SystemsHero content={content.hero} rail={content.rail} />
      <AtlasWorkspace content={content.atlas} locale={locale} />
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
          <StationFeature locale={locale} station={cirrus} />
          <StationPair locale={locale} stations={[mosaique, radar]} />
          <QuickStationRow locale={locale} stations={[sonar, detour]} />
        </div>
      </section>
      <Manifesto content={content.manifesto} />
      <Workbench content={content.workbench} locale={locale} />
      <PerspectivesCTA content={content.perspectives} />
    </main>
  );
}
