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
  const internalRoute = action.href.startsWith('/');

  if (internalRoute) {
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
      <span aria-hidden="true">↘</span>
    </a>
  );
}

function SystemsHeroVisual() {
  const paths = [
    'M80 176 C210 78 292 248 430 126 S670 98 820 208',
    'M72 264 C204 338 292 152 430 250 S656 342 842 248',
    'M160 102 C222 186 330 106 394 202 S554 300 660 166',
    'M270 330 C350 248 440 338 506 228 S690 100 780 132',
  ];
  const nodes = [
    [82, 176],
    [160, 102],
    [268, 330],
    [310, 164],
    [430, 126],
    [430, 250],
    [506, 228],
    [660, 166],
    [780, 132],
    [820, 208],
    [842, 248],
  ];

  return (
    <svg
      aria-hidden="true"
      className="aks-systems-hero-visual"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 920 520"
    >
      <defs>
        <linearGradient id="systemsHeroBg" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#07111c" />
          <stop offset="0.48" stopColor="#0b1d2a" />
          <stop offset="1" stopColor="#05070a" />
        </linearGradient>
        <radialGradient
          id="systemsHeroGlow"
          cx="0"
          cy="0"
          gradientTransform="translate(460 235) rotate(90) scale(240 360)"
          r="1"
        >
          <stop stopColor="#2457ff" stopOpacity="0.46" />
          <stop offset="1" stopColor="#2457ff" stopOpacity="0" />
        </radialGradient>
        <pattern height="28" id="systemsHeroGrid" patternUnits="userSpaceOnUse" width="28">
          <path d="M28 0H0V28" fill="none" stroke="#88a4c4" strokeOpacity="0.08" strokeWidth="1" />
        </pattern>
      </defs>
      <rect fill="url(#systemsHeroBg)" height="520" width="920" />
      <rect fill="url(#systemsHeroGrid)" height="520" width="920" />
      <rect fill="url(#systemsHeroGlow)" height="520" width="920" />
      <g opacity="0.54">
        <rect fill="#07101a" height="128" rx="7" stroke="#2f4b68" width="232" x="28" y="352" />
        <rect fill="#07101a" height="98" rx="7" stroke="#2f4b68" width="244" x="648" y="22" />
        <path
          d="M48 446h190M48 423h96M48 399h160M672 92h188M672 68h126M672 48h170"
          stroke="#38a9ff"
          strokeOpacity="0.65"
          strokeWidth="3"
        />
      </g>
      <g className="aks-systems-network-lines" fill="none" strokeLinecap="round">
        {paths.map((path) => (
          <path d={path} key={path} stroke="#4ca8ff" strokeOpacity="0.72" strokeWidth="2" />
        ))}
        <path
          d="M210 388 C320 296 384 448 498 350 S720 318 850 420"
          stroke="#cbff3d"
          strokeOpacity="0.7"
          strokeWidth="2"
        />
      </g>
      <g>
        {nodes.map(([cx, cy], index) => (
          <g
            className={
              index % 3 === 0 ? 'aks-systems-node aks-systems-node--pulse' : 'aks-systems-node'
            }
            key={`${cx}-${cy}`}
          >
            <circle
              cx={cx}
              cy={cy}
              fill={index % 4 === 0 ? '#cbff3d' : '#2457ff'}
              r={index % 3 === 0 ? 8 : 5}
            />
            <circle
              cx={cx}
              cy={cy}
              fill="none"
              r={index % 3 === 0 ? 16 : 11}
              stroke="#9ec7ff"
              strokeOpacity="0.36"
            />
          </g>
        ))}
      </g>
      <g fill="#9ec7ff" fontFamily="monospace" fontSize="11" opacity="0.72">
        <text x="42" y="34">
          OPS/WORKSHOP
        </text>
        <text x="780" y="500">
          SYSTEMIC SCALE
        </text>
      </g>
    </svg>
  );
}

function AtlasVisual({ locale }: { locale: 'en' | 'fr' }) {
  return (
    <div aria-hidden="true" className="aks-systems-atlas-screen">
      <div className="aks-systems-atlas-toolbar">
        <span className="aks-systems-atlas-mark">◉</span>
        <span>ATLAS / OPS</span>
        <span className="aks-systems-atlas-live">LIVE</span>
      </div>
      <svg className="aks-systems-atlas-map" viewBox="0 0 900 480">
        <defs>
          <pattern height="30" id="atlasGrid" patternUnits="userSpaceOnUse" width="30">
            <path d="M30 0H0V30" fill="none" stroke="#1f2d42" strokeWidth="1" />
          </pattern>
          <radialGradient
            id="atlasCore"
            cx="0"
            cy="0"
            gradientTransform="translate(450 240) rotate(90) scale(82)"
            r="1"
          >
            <stop stopColor="#2457ff" stopOpacity="0.95" />
            <stop offset="1" stopColor="#2457ff" stopOpacity="0.15" />
          </radialGradient>
        </defs>
        <rect fill="#090e17" height="480" width="900" />
        <rect fill="url(#atlasGrid)" height="480" opacity="0.6" width="900" />
        <g fill="none" stroke="#31518c" strokeOpacity="0.7" strokeWidth="1.5">
          <ellipse
            className="aks-systems-orbit"
            cx="450"
            cy="240"
            rx="270"
            ry="104"
            transform="rotate(-18 450 240)"
          />
          <ellipse
            className="aks-systems-orbit aks-systems-orbit--delayed"
            cx="450"
            cy="240"
            rx="188"
            ry="166"
            transform="rotate(32 450 240)"
          />
          <ellipse cx="450" cy="240" rx="310" ry="58" transform="rotate(28 450 240)" />
          <path d="M186 170L450 240L724 148" />
          <path d="M260 364L450 240L692 360" />
        </g>
        <circle cx="450" cy="240" fill="url(#atlasCore)" r="76" stroke="#5d84ff" />
        <circle cx="450" cy="240" fill="#2457ff" r="42" />
        <g fill="#edf1f5" fontFamily="monospace" fontSize="13">
          <text x="423" y="245">
            ATLAS
          </text>
          <text x="148" y="168">
            INPUTS
          </text>
          <text x="710" y="146">
            SIGNALS
          </text>
          <text x="226" y="382">
            CONTEXT
          </text>
          <text x="690" y="380">
            OUTPUT
          </text>
        </g>
        <path d="M520 250 C620 270 694 280 790 226" fill="none" stroke="#cbff3d" strokeWidth="2" />
        <circle cx="790" cy="226" fill="#cbff3d" r="5" />
      </svg>
      <div className="aks-systems-atlas-note">
        <span>{locale === 'fr' ? 'signal critique' : 'critical signal'}</span>
        <strong>{locale === 'fr' ? 'variation détectée' : 'variation detected'}</strong>
      </div>
    </div>
  );
}

function FlowVisual() {
  return (
    <svg aria-hidden="true" className="aks-systems-station-svg" viewBox="0 0 760 420">
      <rect fill="#0b111a" height="420" width="760" />
      <g stroke="#32465f" strokeWidth="1">
        {Array.from({ length: 9 }, (_, index) => (
          <line key={index} x1="0" x2="760" y1={220 + index * 22} y2={220 + index * 22} />
        ))}
      </g>
      <g fill="none" stroke="#3c8bd9" strokeWidth="2">
        <path d="M110 114h90v-46h92v92h92v-60h92v84h112" />
        <path d="M150 188h112v-44h98v84h112v-42h128" stroke="#cbff3d" strokeOpacity="0.65" />
      </g>
      {[110, 200, 292, 384, 476, 588].map((x, index) => (
        <g key={x} transform={`translate(${x} ${index % 2 === 0 ? 102 : 176})`}>
          <rect fill="#0d1926" height="56" rx="6" stroke="#4ca8ff" width="38" x="-19" y="-28" />
          <path d="M-10 -10h20M-10 0h20M-10 10h20" stroke="#4ca8ff" />
        </g>
      ))}
      <g fill="#2457ff">
        <rect height="10" width="280" x="0" y="246" />
        <rect height="10" opacity="0.75" width="402" x="0" y="278" />
        <rect height="10" opacity="0.5" width="224" x="0" y="310" />
        <rect height="10" opacity="0.7" width="500" x="0" y="342" />
      </g>
    </svg>
  );
}

function MosaicVisual() {
  return (
    <div aria-hidden="true" className="aks-systems-mosaic">
      {Array.from({ length: 12 }, (_, index) => (
        <div
          className="aks-systems-mosaic-tile"
          data-accent={index % 5 === 0 || undefined}
          key={index}
        >
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function RadarVisual() {
  return (
    <div aria-hidden="true" className="aks-systems-radar">
      <div className="aks-systems-radar-copy">
        <span>RADAR CLI / SESSION</span>
        <strong>&gt; inspect --relation atlas</strong>
        <code>signal: nominal</code>
        <code>edges: 08</code>
        <code>attention: 02</code>
      </div>
      <svg viewBox="0 0 440 240">
        <g fill="none" stroke="#2f4b68">
          <circle cx="220" cy="120" r="82" />
          <circle cx="220" cy="120" r="52" />
          <circle cx="220" cy="120" r="20" />
          <path d="M220 28v184M128 120h184" />
        </g>
        <path d="M220 120L312 80" stroke="#cbff3d" strokeWidth="2" />
        <circle cx="312" cy="80" fill="#cbff3d" r="7" />
        <circle cx="188" cy="158" fill="#2457ff" r="6" />
        <circle cx="260" cy="176" fill="#2457ff" r="5" />
      </svg>
    </div>
  );
}

function SonarVisual() {
  return (
    <svg aria-hidden="true" className="aks-systems-quick-thumb" viewBox="0 0 180 92">
      <rect fill="#071016" height="92" width="180" />
      {[18, 31, 44].map((r) => (
        <circle cx="86" cy="46" fill="none" key={r} r={r} stroke="#5ed5ff" strokeOpacity="0.75" />
      ))}
      <path d="M20 46h132" stroke="#2457ff" />
      <circle cx="120" cy="46" fill="#cbff3d" r="5" />
    </svg>
  );
}

function DetourVisual() {
  return (
    <svg aria-hidden="true" className="aks-systems-quick-thumb" viewBox="0 0 180 92">
      <rect fill="#12161b" height="92" width="180" />
      <path
        d="M12 72L46 38 70 54 102 24 132 44 168 14"
        fill="none"
        stroke="#2457ff"
        strokeLinejoin="round"
        strokeWidth="8"
      />
      <path
        d="M12 28L42 52 72 34 110 64 144 38 168 60"
        fill="none"
        stroke="#cbff3d"
        strokeLinejoin="round"
        strokeOpacity="0.72"
        strokeWidth="5"
      />
    </svg>
  );
}

function StationMedia({ station }: { station: SystemsStation }) {
  switch (station.visual) {
    case 'flow':
      return <FlowVisual />;
    case 'mosaic':
      return <MosaicVisual />;
    case 'radar':
      return <RadarVisual />;
    case 'sonar':
      return <SonarVisual />;
    case 'detour':
      return <DetourVisual />;
  }
}

export function SystemsHero({ content }: { content: SystemsPageContent['hero'] }) {
  return (
    <section
      aria-labelledby="systems-title"
      className="aks-systems-hero"
      data-systems-section="hero"
    >
      <SystemsHeroVisual />
      <div className="aks-systems-hero-shade" />
      <div className="aks-systems-wrap aks-systems-hero-inner">
        <p className="aks-systems-kicker">{content.eyebrow}</p>
        <h1 id="systems-title">
          {content.title}
          <span>{content.state}</span>
        </h1>
        <p className="aks-systems-hero-intro">{content.intro}</p>
      </div>
    </section>
  );
}

export function OperationRail({ items }: { items: SystemsPageContent['rail'] }) {
  return (
    <nav aria-label="System operation sequence" className="aks-systems-operation-rail">
      <div className="aks-systems-wrap">
        <ol>
          {items.map((item) => (
            <li key={item.index}>
              <span>{item.index}</span>
              <strong>{item.label}</strong>
            </li>
          ))}
        </ol>
      </div>
    </nav>
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
        <div className="aks-systems-section-heading aks-systems-section-heading--split">
          <div>
            <p className="aks-systems-kicker">{content.eyebrow}</p>
            <h2 id="atlas-title">{content.name}</h2>
          </div>
          <StatusPill locale={locale} status={content.status} />
        </div>
        <AtlasVisual locale={locale} />
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

export function StationFeature({
  locale,
  station,
}: {
  locale: 'en' | 'fr';
  station: SystemsStation;
}) {
  return (
    <article className="aks-systems-station aks-systems-station--feature">
      <figure>
        <StationMedia station={station} />
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

export function StationPair({
  locale,
  stations,
}: {
  locale: 'en' | 'fr';
  stations: SystemsStation[];
}) {
  return (
    <div className="aks-systems-station-pair">
      {stations.map((station) => (
        <article className="aks-systems-station aks-systems-station--pair" key={station.id}>
          <figure>
            <StationMedia station={station} />
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

export function QuickStationRow({
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
          <StationMedia station={station} />
          <h3>{station.name}</h3>
          <p>{station.function}</p>
          <StatusPill locale={locale} status={station.status} />
          <a
            aria-label={`${station.name}: ${station.note}`}
            className="aks-systems-quick-link"
            href="#workbench"
          >
            {locale === 'fr' ? 'Ouvrir' : 'Open'} <span aria-hidden="true">↗</span>
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
        <div className="aks-systems-section-heading aks-systems-section-heading--split">
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
              <span>{tool.function}</span>
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
      <SystemsHero content={content.hero} />
      <OperationRail items={content.rail} />
      <AtlasWorkspace content={content.atlas} locale={locale} />
      <section
        aria-labelledby="operation-title"
        className="aks-systems-section aks-systems-operation"
        data-systems-section="operation"
        id="operation"
      >
        <div className="aks-systems-wrap">
          <div className="aks-systems-section-heading aks-systems-section-heading--split">
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
