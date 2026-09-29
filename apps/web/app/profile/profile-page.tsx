import { BrandMark } from '@akiksystems/ui';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Link as RouterLink } from 'react-router';

import type { ProfileIcon, ProfileLink, ProfilePageContent } from './content';

type Glyph =
  | ProfileIcon
  | 'linkedin'
  | 'github'
  | 'mail'
  | 'phone'
  | 'vision'
  | 'bars'
  | 'cross'
  | 'question'
  | 'loop';

const glyphs: Record<Glyph, string> = {
  screen: 'M5 3h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 21h8M12 17v4',
  server:
    'M5 4h14a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM5 14h14a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1zM8 7h.01M8 17h.01',
  database:
    'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  layers: 'M12 2l9 5-9 5-9-5zM3 12l9 5 9-5M3 17l9 5 9-5',
  check: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9',
  package: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  link: 'M9 17H7a5 5 0 0 1 0-10h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8',
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9c-4-1.5-7-4.5-7-9V6l7-3zM9 12l2 2 4-4',
  bolt: 'M13 3L4 14h7l-1 7 9-11h-7z',
  linkedin:
    'M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM8 10v7M8 7v.01M12 17v-7M12 13a3 3 0 0 1 6 0v4',
  github: 'M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14',
  mail: 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 7l9 6 9-6',
  phone:
    'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  vision: 'M3 12a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0M10 12a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0',
  bars: 'M6 20v-6M12 20V8M18 20V4',
  cross: 'M7 7l10 10M17 7L7 17',
  question: 'M9.2 9a3 3 0 0 1 5.8 1c0 2-3 2.6-3 4.5M12 18h.01',
  loop: 'M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5',
};

const lensGlyphs = {
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14',
  management:
    'M9 11a3 3 0 1 0 0-6a3 3 0 1 0 0 6zM3 20a6 6 0 0 1 12 0M17 11a2.5 2.5 0 1 0 0-5M21 20a5 5 0 0 0-4-4.9',
  field:
    'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5a2.5 2.5 0 1 0 0 5z',
  infrastructure: 'M4 14h6v6H4zM14 14h6v6h-6zM9 4h6v6H9z',
} as const;

const phaseGlyphs = [
  'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
  'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM3 9h18M9 21V9',
  'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3M7.2 15h9.6',
  'M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14',
  'M12 3l7 3v6c0 4.5-3 7.5-7 9c-4-1.5-7-4.5-7-9V6l7-3zM9 12l2 2 4-4',
  'M7.5 18H7a4 4 0 0 1-.6-7.96A6 6 0 0 1 17.8 9a3.5 3.5 0 0 1-.3 7H16M12 20v-8M9 15l3-3 3 3',
  'M3 12h4l3-8 4 16 3-8h4',
  'M3 17l6-6 4 4 8-8M15 7h6v6',
] as const;

const caseGlyphs = [
  'M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7',
  'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12 1v4M12 19v4M1 12h4M19 12h4',
  'M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5',
] as const;

function Icon({ path, size = 18 }: { path: string; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className="aks-profile-icon"
      fill="none"
      focusable="false"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
      width={size}
    >
      <path d={path} />
    </svg>
  );
}

function PillLink({ link, size = 'md' }: { link: ProfileLink; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <RouterLink className="aks-profile-pill" data-size={size} prefetch="intent" to={link.href}>
      {link.label}
    </RouterLink>
  );
}

/** WAI-ARIA tabs: one tab in the sequential focus order, arrow keys move between tabs. */
function useTabs(count: number, initial = 0) {
  const baseId = useId();
  const [active, setActive] = useState(initial);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  const select = (index: number) => {
    const next = (index + count) % count;
    setActive(next);
    tabs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') select(active + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') select(active - 1);
    else if (event.key === 'Home') select(0);
    else if (event.key === 'End') select(count - 1);
    else return;
    event.preventDefault();
  };

  const panelId = `${baseId}-panel`;

  return {
    active,
    panelProps: {
      'aria-labelledby': `${baseId}-tab-${active}`,
      id: panelId,
      role: 'tabpanel',
    } as const,
    tabProps: (index: number) =>
      ({
        'aria-controls': panelId,
        'aria-selected': index === active,
        id: `${baseId}-tab-${index}`,
        onClick: () => setActive(index),
        onKeyDown,
        ref: (element: HTMLButtonElement | null) => {
          tabs.current[index] = element;
        },
        role: 'tab',
        tabIndex: index === active ? 0 : -1,
        type: 'button',
      }) as const,
  };
}

function StepTab({
  glyph,
  label,
  props,
}: {
  glyph: string;
  label: string;
  props: ReturnType<ReturnType<typeof useTabs>['tabProps']>;
}) {
  return (
    <button className="aks-profile-step-tab" {...props}>
      <span className="aks-profile-step-node">
        <Icon path={glyph} size={20} />
      </span>
      <span className="aks-profile-step-name">{label}</span>
    </button>
  );
}

function IdentitySection({
  identity,
  project,
}: {
  identity: ProfilePageContent['identity'];
  project: ProfilePageContent['project'];
}) {
  const { contacts } = identity;
  const contactLinks: Array<{ glyph: Glyph; label: string; href: string; aria: string | null }> = [
    { glyph: 'linkedin', label: contacts.linkedin.label, href: contacts.linkedin.href, aria: null },
    { glyph: 'github', label: contacts.github.label, href: contacts.github.href, aria: null },
    {
      glyph: 'mail',
      label: contacts.email.label,
      href: contacts.email.href,
      aria: contacts.email.ariaLabel,
    },
    ...(contacts.phone === null
      ? []
      : [
          {
            glyph: 'phone' as const,
            label: contacts.phone.label,
            href: contacts.phone.href,
            aria: contacts.phone.ariaLabel,
          },
        ]),
  ];

  return (
    <section
      aria-labelledby="profile-title"
      className="aks-profile-section aks-profile-intro"
      data-profile-section="identity"
    >
      <div className="aks-profile-wrap aks-profile-intro-grid">
        <div className="aks-profile-identity">
          <p className="aks-profile-eyebrow">{identity.eyebrow}</p>
          <div className="aks-profile-person">
            <img
              alt={identity.photoLabel}
              className="aks-profile-photo"
              height={400}
              src="/profile/mohamed-amine-akik.jpg"
              width={400}
            />
            <h1 id="profile-title">
              {identity.name[0]}
              <br />
              {identity.name[1]}
            </h1>
          </div>
          <div className="aks-profile-role-block">
            <p className="aks-profile-role">
              {identity.role}
              <span> · {identity.roleDetail}</span>
            </p>
            <p className="aks-profile-lede">{identity.intro}</p>
          </div>
          <ul className="aks-profile-contacts">
            {contactLinks.map((contact) => (
              <li key={contact.glyph}>
                <a
                  aria-label={contact.aria ?? undefined}
                  className="aks-profile-contact"
                  href={contact.href}
                  {...(contact.href.startsWith('https:')
                    ? { rel: 'noopener noreferrer', target: '_blank' }
                    : {})}
                >
                  <span className="aks-profile-contact-icon">
                    <Icon path={glyphs[contact.glyph]} />
                  </span>
                  <span>{contact.label}</span>
                </a>
              </li>
            ))}
          </ul>
          <dl className="aks-profile-facts">
            {identity.facts.map((fact) => (
              <div key={fact.label}>
                <dt className="aks-profile-label">{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <article aria-label={project.label} className="aks-profile-project">
          <div className="aks-profile-project-head">
            <p className="aks-profile-live">
              <span aria-hidden="true" className="aks-profile-live-dot" />
              {project.label}
            </p>
            <PillLink link={project.follow} size="sm" />
          </div>
          <div className="aks-profile-project-title">
            <span className="aks-profile-project-logo">
              <BrandMark />
            </span>
            <h2>{project.name}</h2>
          </div>
          <p className="aks-profile-project-summary">{project.summary}</p>
          <div className="aks-profile-project-block">
            <span className="aks-profile-label">{project.roleLabel}</span>
            <span className="aks-profile-project-role">{project.role}</span>
          </div>
          <div className="aks-profile-project-block">
            <span className="aks-profile-label">{project.stackLabel}</span>
            <ul className="aks-profile-project-stack">
              {project.stack.map((item) => (
                <li key={item.name}>
                  <span className="aks-profile-project-stack-icon">
                    <Icon path={glyphs[item.icon]} size={15} />
                  </span>
                  <span className="aks-profile-project-stack-text">
                    <span>{item.name}</span>
                    <span>{item.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="aks-profile-project-updated">{project.updated}</p>
        </article>
      </div>
    </section>
  );
}

function TimelineList({
  label,
  entries,
}: {
  label: string;
  entries: ProfilePageContent['identity']['timeline']['work'];
}) {
  return (
    <div className="aks-profile-timeline-column">
      <h3 className="aks-profile-label">{label}</h3>
      <ol className="aks-profile-timeline">
        {entries.map((entry) => (
          <li key={entry.period + entry.title}>
            <span className="aks-profile-timeline-period">{entry.period}</span>
            <div>
              <p className="aks-profile-timeline-title">{entry.title}</p>
              <p className="aks-profile-timeline-place">{entry.place}</p>
              {entry.detail === undefined ? null : (
                <p className="aks-profile-timeline-detail">{entry.detail}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The dated facts behind the profile: what was done, where, and when. */
function TimelineSection({ content }: { content: ProfilePageContent['identity']['timeline'] }) {
  return (
    <section
      aria-labelledby="profile-timeline-title"
      className="aks-profile-section aks-profile-timeline-section"
      data-profile-section="timeline"
      id="parcours"
    >
      <div className="aks-profile-wrap">
        <p className="aks-profile-eyebrow">{content.eyebrow}</p>
        <h2 id="profile-timeline-title">{content.title}</h2>
        <div className="aks-profile-timeline-grid">
          <TimelineList entries={content.work} label={content.workLabel} />
          <TimelineList entries={content.education} label={content.educationLabel} />
        </div>
      </div>
    </section>
  );
}

function StackSection({ content }: { content: ProfilePageContent['stack'] }) {
  const [selected, setSelected] = useState(0);
  const baseId = useId();

  return (
    <section
      aria-labelledby="profile-stack-title"
      className="aks-profile-section aks-profile-stack"
      data-profile-section="stack"
      id="stack"
    >
      <div className="aks-profile-wrap aks-profile-stack-grid">
        <div className="aks-profile-stack-intro">
          <p className="aks-profile-eyebrow">{content.eyebrow}</p>
          <h2 id="profile-stack-title">
            {content.title[0]} <br className="aks-profile-desktop-break" />
            {content.title[1]}
          </h2>
          <p>{content.intro}</p>
        </div>

        <ol className="aks-profile-rail">
          {content.rows.map((row, index) => {
            const active = index === selected;
            // Every proof is shown, the primary one first.
            const proofs = [
              ...row.proofs.slice(row.primary, row.primary + 1),
              ...row.proofs.filter((_, proofIndex) => proofIndex !== row.primary),
            ];
            const regionId = `${baseId}-proof-${index}`;

            return (
              <li
                className="aks-profile-rail-item"
                data-active={active || undefined}
                key={row.name}
              >
                <button
                  aria-controls={active ? regionId : undefined}
                  aria-expanded={active}
                  className="aks-profile-rail-trigger"
                  onClick={() => setSelected(index)}
                  type="button"
                >
                  <span className="aks-profile-rail-node">
                    <Icon path={glyphs[row.icon]} size={20} />
                  </span>
                  <span className="aks-profile-rail-text">
                    <span className="aks-profile-rail-name">{row.name}</span>
                    <span className="aks-profile-rail-category">{row.category}</span>
                  </span>
                </button>
                {active && proofs.length > 0 ? (
                  <div
                    aria-label={`${content.regionLabel} ${row.name}`}
                    className="aks-profile-rail-proof"
                    id={regionId}
                    role="region"
                  >
                    <span className="aks-profile-rail-count">
                      {proofs.length > 1
                        ? content.provenIn.many.replace('{count}', String(proofs.length))
                        : content.provenIn.one}
                    </span>
                    {proofs.map((proof) => {
                      const system = content.systems[proof.system];
                      return (
                        <div className="aks-profile-proof" key={proof.system}>
                          <span aria-hidden="true" className="aks-profile-proof-initial">
                            {system.name.charAt(0)}
                          </span>
                          <div className="aks-profile-proof-body">
                            <p className="aks-profile-proof-title">
                              <strong>{system.name}</strong>
                              <span>{system.context}</span>
                            </p>
                            <p>{proof.description}</p>
                            <PillLink
                              link={{ label: content.inspect, href: system.href }}
                              size="sm"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// Geometry of the design loop (520 × 560 artboard), shared by the SVG art and the CSS positions.
const loopCenter = { x: 260, y: 250, r: 200 };
const loopConnectors = [
  [260, 124, 260, 150],
  [360, 250, 422, 250],
  [260, 350, 260, 412],
  [98, 250, 160, 250],
] as const;
const loopArrows = [
  [-45, 90],
  [45, 180],
  [135, 270],
  [225, 0],
] as const;

function LensLoop({ content }: { content: ProfilePageContent['principles']['relate'] }) {
  const [selected, setSelected] = useState(2);
  const lens = content.nodes[selected] ?? content.nodes[0];
  const detailRows = [
    { glyph: glyphs.bars, label: content.labels.brings, text: lens.brings },
    { glyph: glyphs.cross, label: content.labels.avoids, text: lens.avoids },
    { glyph: glyphs.question, label: content.labels.asks, text: lens.asks },
  ];

  return (
    <div className="aks-profile-relate-grid">
      <div aria-label={content.groupLabel} className="aks-profile-loop" role="group">
        <svg
          aria-hidden="true"
          className="aks-profile-loop-art"
          focusable="false"
          viewBox="0 0 520 560"
        >
          <circle
            className="aks-profile-loop-ring"
            cx={loopCenter.x}
            cy={loopCenter.y}
            r={loopCenter.r - 0.5}
            vectorEffect="non-scaling-stroke"
          />
          {loopConnectors.map(([x1, y1, x2, y2], index) => (
            <line
              className="aks-profile-loop-connector"
              data-active={index === selected || undefined}
              key={`${x1}-${y1}`}
              vectorEffect="non-scaling-stroke"
              x1={x1}
              x2={x2}
              y1={y1}
              y2={y2}
            />
          ))}
          {loopArrows.map(([angle, rotation]) => {
            const radians = (angle * Math.PI) / 180;
            const x = loopCenter.x + loopCenter.r * Math.cos(radians);
            const y = loopCenter.y + loopCenter.r * Math.sin(radians);

            return (
              <g
                className="aks-profile-loop-arrow"
                key={angle}
                transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotation})`}
              >
                <rect height="8" width="8" x="-4" y="-4" />
                <polyline points="-4,-3.5 3.5,-3.5 3.5,4" vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}
        </svg>
        <div className="aks-profile-loop-core">
          <Icon path={glyphs.vision} size={30} />
          <span className="aks-profile-loop-core-title">
            {content.center.title[0]}
            <br />
            {content.center.title[1]}
          </span>
          <span className="aks-profile-loop-core-caption">
            {content.center.caption[0]}
            <br />
            {content.center.caption[1]}
          </span>
        </div>
        {content.nodes.map((node, index) => (
          <button
            aria-pressed={index === selected}
            className="aks-profile-lens"
            data-lens={node.id}
            key={node.id}
            onClick={() => setSelected(index)}
            type="button"
          >
            <span className="aks-profile-lens-node">
              <Icon path={lensGlyphs[node.id]} size={24} />
            </span>
            <span className="aks-profile-lens-name">{node.name}</span>
          </button>
        ))}
        <p className="aks-profile-loop-caption">{content.loopCaption}</p>
      </div>

      <div
        aria-label={content.detailLabel}
        aria-live="polite"
        className="aks-profile-lens-detail"
        role="region"
      >
        <div className="aks-profile-lens-content" key={lens.id}>
          <div className="aks-profile-lens-head">
            <span className="aks-profile-lens-badge">
              <Icon path={lensGlyphs[lens.id]} size={22} />
            </span>
            <div>
              <h4>{lens.name}</h4>
              <p className="aks-profile-lens-description">{lens.description}</p>
              {lens.figure === null ? null : (
                <p className="aks-profile-lens-figure">
                  <strong>{lens.figure.value}</strong> {lens.figure.label}
                </p>
              )}
              {lens.source === null ? null : (
                <p className="aks-profile-lens-source">{lens.source}</p>
              )}
            </div>
          </div>
          {detailRows.map((row) => (
            <div className="aks-profile-lens-row" key={row.label}>
              <span className="aks-profile-lens-row-icon">
                <Icon path={row.glyph} />
              </span>
              <div>
                <span className="aks-profile-lens-row-label">{row.label}</span>
                <span>{row.text}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrinciplesSection({ content }: { content: ProfilePageContent['principles'] }) {
  return (
    <section
      aria-labelledby="profile-principles-title"
      className="aks-profile-section aks-profile-principles"
      data-profile-section="principles"
      id="principes"
    >
      <div className="aks-profile-wrap">
        <div className="aks-profile-principles-head">
          <p className="aks-profile-eyebrow">{content.eyebrow}</p>
          <h2 id="profile-principles-title">{content.title}</h2>
          <p>{content.body}</p>
        </div>
        <div className="aks-profile-relate">
          <div className="aks-profile-subhead">
            <span className="aks-profile-label">{content.relate.eyebrow}</span>
            <h3>{content.relate.title}</h3>
            <p>{content.relate.body}</p>
          </div>
          <LensLoop content={content.relate} />
          <div className="aks-profile-subhead aks-profile-result">
            <span className="aks-profile-label">{content.result.eyebrow}</span>
            <h3>{content.result.title}</h3>
            <p>{content.result.body}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CapabilitiesSection({ content }: { content: ProfilePageContent['capabilities'] }) {
  const { active, panelProps, tabProps } = useTabs(content.phases.length);
  const phase = content.phases[active] ?? content.phases[0];
  if (phase === undefined) return null;

  return (
    <section
      aria-labelledby="profile-capabilities-title"
      className="aks-profile-section aks-profile-capabilities"
      data-profile-section="capabilities"
      id="methode"
    >
      <div className="aks-profile-wrap">
        <div className="aks-profile-section-head">
          <p className="aks-profile-eyebrow">{content.eyebrow}</p>
          <h2 id="profile-capabilities-title">
            {content.title[0]} <br className="aks-profile-desktop-break" />
            {content.title[1]}
          </h2>
        </div>

        <div className="aks-profile-cycle">
          <div aria-hidden="true" className="aks-profile-cycle-groups">
            {content.groups.map((group, index) => (
              <span
                className="aks-profile-cycle-group"
                data-active={phase.group === index || undefined}
                data-group={index}
                key={group}
              >
                <span>{group}</span>
              </span>
            ))}
          </div>
          <div className="aks-profile-track" data-count={content.phases.length}>
            <div aria-label={content.tablistLabel} className="aks-profile-tablist" role="tablist">
              {content.phases.map((item, index) => (
                <StepTab
                  glyph={phaseGlyphs[index] ?? phaseGlyphs[0]}
                  key={item.name}
                  label={item.name}
                  props={tabProps(index)}
                />
              ))}
            </div>
          </div>
          <div className="aks-profile-panel aks-profile-cycle-panel" {...panelProps}>
            <div className="aks-profile-panel-block">
              <span className="aks-profile-label">{content.groups[phase.group]}</span>
              <h3>{phase.name}</h3>
              <p className="aks-profile-panel-lead">{phase.purpose}</p>
            </div>
            <div className="aks-profile-panel-block">
              <span className="aks-profile-label">{content.labels.does}</span>
              <ul className="aks-profile-dash-list">
                {phase.services.map((service) => (
                  <li key={service}>{service}</li>
                ))}
              </ul>
            </div>
            <div className="aks-profile-panel-block">
              <span className="aks-profile-label">{content.labels.receives}</span>
              <p className="aks-profile-panel-strong">{phase.deliverable}</p>
            </div>
            {phase.proof === undefined ? null : (
              <div className="aks-profile-panel-block aks-profile-panel-proof">
                <span className="aks-profile-label">{content.labels.proof}</span>
                <p>{phase.proof}</p>
              </div>
            )}
          </div>
        </div>

        <p className="aks-profile-cycle-note">
          <Icon path={glyphs.loop} />
          <span>{content.loopNote}</span>
        </p>

        <div className="aks-profile-throughout">
          <p className="aks-profile-throughout-title">{content.throughout.title}</p>
          <dl>
            {content.throughout.items.map((item) => (
              <div key={item.title}>
                <dt>{item.title}</dt>
                <dd>{item.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function ChainDiagram({
  alt,
  chain,
  diagram,
  step,
}: {
  alt: string;
  chain: ProfilePageContent['scale']['chain'];
  diagram: ProfilePageContent['scale']['diagram'];
  step: number;
}) {
  const scopeLabel = [diagram.asked, diagram.whole, null, diagram.observed][step] ?? null;

  return (
    <div aria-label={alt} className="aks-profile-chain" data-step={step} role="img">
      <ol className="aks-profile-chain-steps">
        {chain.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ol>
      <span className="aks-profile-chain-mark" data-mark="scope" />
      <span className="aks-profile-chain-mark aks-profile-chain-text" data-mark="scope-label">
        {scopeLabel}
      </span>
      <span className="aks-profile-chain-mark" data-mark="tick-simple" />
      <span className="aks-profile-chain-mark aks-profile-chain-text" data-mark="simple">
        {diagram.simple}
      </span>
      <span className="aks-profile-chain-mark aks-profile-chain-note" data-mark="conflicts">
        {diagram.conflicts}
      </span>
      <span className="aks-profile-chain-mark" data-mark="tick-ready" />
      <span className="aks-profile-chain-mark aks-profile-chain-text" data-mark="ready">
        {diagram.ready}
      </span>
      <span className="aks-profile-chain-mark aks-profile-chain-note" data-mark="free">
        {diagram.free}
      </span>
      <span className="aks-profile-chain-mark" data-mark="invisible-bracket" />
      <span className="aks-profile-chain-mark aks-profile-chain-text" data-mark="invisible">
        {diagram.invisible}
      </span>
      <span className="aks-profile-chain-mark aks-profile-chain-note" data-mark="usable">
        {diagram.usable}
      </span>
      <span className="aks-profile-chain-mark" data-mark="loop" />
      <span className="aks-profile-chain-mark" data-mark="loop-head" />
      <span className="aks-profile-chain-mark aks-profile-chain-text" data-mark="unexpected">
        {diagram.unexpected}
      </span>
    </div>
  );
}

// Callout anchors on the 1100 × 400 design artboard: legend edge -> symbol on the emblem.
const emblemCallouts = {
  eagle: { side: 'left', y: 72, x2: 555, y2: 131 },
  olive: { side: 'left', y: 192, x2: 449, y2: 164 },
  sea: { side: 'left', y: 312, x2: 493, y2: 266 },
  stars: { side: 'right', y: 72, x2: 551, y2: 81 },
  serpent: { side: 'right', y: 192, x2: 572, y2: 175 },
} as const;

function EmblemFigure({ content }: { content: ProfilePageContent['scale']['emblem'] }) {
  return (
    <div className="aks-profile-emblem">
      <div className="aks-profile-emblem-head">
        <span className="aks-profile-label">{content.eyebrow}</span>
        <h3>{content.title}</h3>
      </div>
      <div className="aks-profile-emblem-figure">
        <BrandMark className="aks-profile-emblem-mark" title={content.alt} />
        <svg
          aria-hidden="true"
          className="aks-profile-emblem-callouts"
          focusable="false"
          viewBox="0 0 1100 400"
        >
          {content.items.map((item) => {
            const callout = emblemCallouts[item.id];
            const x1 = callout.side === 'left' ? 342 : 758;

            return (
              <g key={item.id}>
                <line
                  vectorEffect="non-scaling-stroke"
                  x1={x1}
                  x2={callout.x2}
                  y1={callout.y}
                  y2={callout.y2}
                />
                <circle cx={callout.x2} cy={callout.y2} r="4" vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}
        </svg>
        <ul className="aks-profile-emblem-legend">
          {content.items.map((item) => (
            <li data-part={item.id} data-side={emblemCallouts[item.id].side} key={item.id}>
              <span className="aks-profile-emblem-name">
                <strong>{item.name}</strong>
                <span>{item.key}</span>
              </span>
              <span className="aks-profile-emblem-text">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="aks-profile-quote">{content.quote}</p>
    </div>
  );
}

function ScaleSection({ content }: { content: ProfilePageContent['scale'] }) {
  const { active, panelProps, tabProps } = useTabs(content.steps.length);
  const step = content.steps[active] ?? content.steps[0];

  return (
    <section
      aria-labelledby="profile-scale-title"
      className="aks-profile-section aks-profile-scale"
      data-profile-section="scale"
      id="systemic-scale"
    >
      <div className="aks-profile-wrap">
        <div className="aks-profile-scale-head">
          <p className="aks-profile-eyebrow">{content.eyebrow}</p>
          <h2 id="profile-scale-title">{content.title}</h2>
          <p className="aks-profile-scale-lead">
            {content.lead[0]}
            <br />
            <span>{content.lead[1]}</span>
          </p>
          <p className="aks-profile-scale-body">{content.body}</p>
        </div>

        <div className="aks-profile-method">
          <div className="aks-profile-method-head">
            <span className="aks-profile-label">{content.method.eyebrow}</span>
            <p>{content.method.intro}</p>
          </div>
          <div className="aks-profile-track" data-count={content.steps.length}>
            <div aria-label={content.tablistLabel} className="aks-profile-tablist" role="tablist">
              {content.steps.map((item, index) => (
                <StepTab
                  glyph={caseGlyphs[index] ?? caseGlyphs[0]}
                  key={item.tab}
                  label={item.tab}
                  props={tabProps(index)}
                />
              ))}
            </div>
          </div>
          <div className="aks-profile-panel aks-profile-case" {...panelProps}>
            <div className="aks-profile-panel-block aks-profile-case-lead">
              <span className="aks-profile-label">
                {content.stepLabel} 0{active + 1}
              </span>
              <h3>{step.tab}</h3>
              <p className="aks-profile-panel-lead">{step.lead}</p>
            </div>
            <div className="aks-profile-panel-block aks-profile-case-example">
              <span className="aks-profile-label">{content.labels.example}</span>
              <p>{step.example}</p>
            </div>
            <div className="aks-profile-panel-block aks-profile-case-question">
              <span className="aks-profile-label">{content.labels.question}</span>
              <p className="aks-profile-panel-strong">{step.question}</p>
            </div>
            <div className="aks-profile-case-diagram">
              <ChainDiagram
                alt={step.alt}
                chain={content.chain}
                diagram={content.diagram}
                step={active}
              />
            </div>
          </div>
        </div>

        <EmblemFigure content={content.emblem} />
      </div>
    </section>
  );
}

function ContactSection({ content }: { content: ProfilePageContent['cta'] }) {
  return (
    <section
      aria-labelledby="profile-cta-title"
      className="aks-profile-section aks-profile-cta"
      data-profile-section="cta"
      id="contact"
    >
      <div className="aks-profile-wrap">
        <p className="aks-profile-eyebrow">{content.eyebrow}</p>
        <h2 id="profile-cta-title">
          {content.title[0]} <br className="aks-profile-desktop-break" />
          {content.title[1]}
        </h2>
        <PillLink link={content.action} size="lg" />
      </div>
    </section>
  );
}

export function ProfilePage({
  locale,
  content,
}: {
  locale: 'en' | 'fr';
  content: ProfilePageContent;
}) {
  return (
    <main className="aks-profile-page" data-locale={locale}>
      <IdentitySection identity={content.identity} project={content.project} />
      <TimelineSection content={content.identity.timeline} />
      <StackSection content={content.stack} />
      <PrinciplesSection content={content.principles} />
      <CapabilitiesSection content={content.capabilities} />
      <ScaleSection content={content.scale} />
      <ContactSection content={content.cta} />
    </main>
  );
}
