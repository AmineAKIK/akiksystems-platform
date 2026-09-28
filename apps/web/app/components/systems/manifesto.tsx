import type { SystemsManifestoContent } from '../../content/systems.types';

export function Manifesto({ content }: { content: SystemsManifestoContent }) {
  return (
    <section className="aks-systems-manifesto" data-systems-reveal>
      <div className="aks-systems-manifesto-inner">
        <p className="aks-systems-kicker">{content.eyebrow}</p>
        <h2>
          <span>{content.lines[0]}</span>
          <span>{content.lines[1]}</span>
          <strong>{content.lines[2]}</strong>
        </h2>
        <div className="aks-systems-manifesto-footer">
          <p>{content.body}</p>
          <span>{content.signature}</span>
        </div>
      </div>
    </section>
  );
}
