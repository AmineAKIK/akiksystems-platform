import type { SystemsStation } from '../../content/systems.types';
import { SystemsActionLink, SystemsMediaPicture, SystemsStatusBadge } from './systems-ui';

export function StationFeature({ station }: { station: SystemsStation }) {
  return (
    <article
      className="aks-station-feature"
      data-placeholder-content={station.placeholder || undefined}
      data-systems-reveal
      id={station.id}
    >
      <SystemsMediaPicture className="aks-station-feature-media" media={station.media} />
      <div className="aks-station-feature-copy">
        <div className="aks-station-heading-row">
          <h3>{station.name}</h3>
          <SystemsStatusBadge label={station.statusLabel} status={station.status} />
        </div>
        <p>{station.function}</p>
        <SystemsActionLink action={station.action} />
      </div>
    </article>
  );
}
