import type { SystemsAtlasContent } from '../../content/systems.types';
import { SystemsActionLink, SystemsStatusBadge } from './systems-ui';

function AtlasMap({ label }: { label: string }) {
  return (
    <svg aria-label={label} className="aks-atlas-map" role="img" viewBox="0 0 920 520">
      <defs>
        <pattern height="32" id="atlas-grid" patternUnits="userSpaceOnUse" width="32">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeOpacity="0.08" />
        </pattern>
      </defs>
      <rect fill="url(#atlas-grid)" height="520" width="920" />
      <g className="aks-atlas-orbits" fill="none">
        <ellipse cx="474" cy="252" rx="168" ry="84" transform="rotate(-14 474 252)" />
        <ellipse cx="474" cy="252" rx="220" ry="112" transform="rotate(24 474 252)" />
        <ellipse cx="474" cy="252" rx="274" ry="148" transform="rotate(-30 474 252)" />
        <path d="M188 156C326 194 548 106 758 160" />
        <path className="aks-atlas-signal-line" d="M506 178C620 214 678 244 790 314" />
      </g>
      <g className="aks-atlas-node" transform="translate(180 140)">
        <circle r="8" />
        <circle opacity="0.3" r="23" />
        <text x="18" y="4">
          CAPTER
        </text>
      </g>
      <g className="aks-atlas-node aks-atlas-node-active" transform="translate(450 260)">
        <circle r="54" />
        <circle opacity="0.2" r="90" />
        <text textAnchor="middle" y="5">
          QUALIFIER
        </text>
      </g>
      <g className="aks-atlas-node" transform="translate(650 130)">
        <circle r="8" />
        <circle opacity="0.3" r="23" />
        <text x="18" y="4">
          DÉCIDER
        </text>
      </g>
      <g className="aks-atlas-node" transform="translate(724 332)">
        <circle r="8" />
        <circle opacity="0.3" r="23" />
        <text x="18" y="4">
          ACTIVER
        </text>
      </g>
    </svg>
  );
}

export function AtlasWorkspace({ content }: { content: SystemsAtlasContent }) {
  return (
    <section
      className="aks-systems-atlas aks-systems-section"
      data-placeholder-content={content.placeholder || undefined}
      data-systems-reveal
      id="atlas"
    >
      <div className="aks-systems-section-heading aks-systems-atlas-heading">
        <div>
          <p className="aks-systems-kicker">{content.eyebrow}</p>
          <h2>{content.name}</h2>
        </div>
        <div className="aks-systems-atlas-state">
          <SystemsStatusBadge label={content.statusLabel} status={content.status} />
          <p>{content.updated}</p>
        </div>
      </div>

      <div className="aks-atlas-shell">
        <div className="aks-atlas-toolbar">
          <div className="aks-atlas-wordmark">
            <span aria-hidden="true" className="aks-atlas-logo">
              ◎
            </span>
            <strong>ATLAS / OPS</strong>
            <span>{content.toolbarSubtitle}</span>
          </div>
          <div className="aks-atlas-toolbar-actions" aria-hidden="true">
            <span className="aks-atlas-swatch aks-atlas-swatch-blue" />
            <span className="aks-atlas-swatch aks-atlas-swatch-lime" />
            <span className="aks-atlas-share">{content.shareLabel}</span>
          </div>
        </div>

        <div className="aks-atlas-workspace">
          <nav aria-label="ATLAS / OPS" className="aks-atlas-views">
            <p>{content.views.label}</p>
            {content.views.items.map((view, index) => (
              <span data-active={index === content.views.active ? 'true' : undefined} key={view}>
                {view}
              </span>
            ))}
          </nav>
          <div className="aks-atlas-canvas">
            <AtlasMap label={content.mapLabel} />
            <aside className="aks-atlas-journal">
              <span>{content.journal.label}</span>
              <p>{content.journal.body}</p>
              <strong>{content.journal.action}</strong>
            </aside>
          </div>
        </div>
      </div>

      <div className="aks-atlas-summary">
        <p className="aks-atlas-summary-lead">{content.summary}</p>
        <ul>
          {content.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <div className="aks-systems-actions">
          {content.actions.map((action) => (
            <SystemsActionLink action={action} key={action.label} />
          ))}
        </div>
      </div>
    </section>
  );
}
