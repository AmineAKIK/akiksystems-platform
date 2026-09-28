import type { SystemsWorkbenchContent } from '../../content/systems.types';
import { SystemsActionLink } from './systems-ui';

export function Workbench({ content }: { content: SystemsWorkbenchContent }) {
  return (
    <section
      className="aks-systems-workbench aks-systems-section"
      data-systems-reveal
      id="workbench"
    >
      <div className="aks-systems-section-heading">
        <h2>{content.title}</h2>
        <p>{content.intro}</p>
      </div>

      <div className="aks-workbench-table" role="table" aria-label={content.title}>
        <div className="aks-workbench-head" role="row">
          <span role="columnheader">{content.columns.name}</span>
          <span role="columnheader">{content.columns.function}</span>
          <span role="columnheader">{content.columns.environment}</span>
          <span role="columnheader">{content.columns.access}</span>
        </div>
        {content.tools.map((tool) => (
          <div
            className="aks-workbench-row"
            data-placeholder-content={tool.placeholder || undefined}
            id={tool.name.toLowerCase()}
            key={tool.name}
            role="row"
          >
            <strong role="cell">{tool.name}</strong>
            <span role="cell">{tool.function}</span>
            <span className="aks-workbench-environment" role="cell">
              {tool.environment}
            </span>
            <span role="cell">
              <SystemsActionLink action={tool.action} />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
